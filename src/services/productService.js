import prisma from '../config/database.js';
import logger from '../utils/logger.js';
import s3UploadService from './s3UploadService.js';

class ProductService {
    
    async getAllProducts({ 
        page = 1, 
        limit = 10, 
        categoryId, 
        subcategoryId, 
        status,
        search,
        minPrice,
        maxPrice,
        includeVariants = true
    }) {
        const skip = (page - 1) * limit;
        
        const where = {};
        
        if (categoryId) {
            where.categoryId = categoryId;
        }
        
        if (subcategoryId) {
            where.subcategoryId = subcategoryId;
        }
        
        // FIX: Convert status to uppercase to match Prisma enum
        if (status) {
            where.status = status.toUpperCase(); // Convert "inactive" to "INACTIVE"
        }
        
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
                { productCode: { contains: search, mode: 'insensitive' } }
            ];
        }
        
        if (minPrice !== undefined || maxPrice !== undefined) {
            where.OR = [
                {
                    normalPrice: {
                        ...(minPrice !== undefined && { gte: parseFloat(minPrice) }),
                        ...(maxPrice !== undefined && { lte: parseFloat(maxPrice) })
                    }
                },
                {
                    offerPrice: {
                        ...(minPrice !== undefined && { gte: parseFloat(minPrice) }),
                        ...(maxPrice !== undefined && { lte: parseFloat(maxPrice) })
                    }
                }
            ];
        }
        
        // Rest of your code remains the same...
        const include = {
            category: {
                select: {
                    id: true,
                    name: true,
                    image: true
                }
            },
            subcategory: {
                select: {
                    id: true,
                    name: true,
                    image: true
                }
            },
            productDetails: true,
            ratings: {
                where: {
                    isApproved: true
                },
                select: {
                    rating: true,
                    review: true
                }
            },
            variants: {
                include: {
                    variantImages: {
                        orderBy: {
                            isPrimary: 'desc'
                        }
                    }
                }
            }
        };
        
        const [products, total] = await Promise.all([
            prisma.product.findMany({
                where,
                skip,
                take: limit,
                include,
                orderBy: {
                    createdAt: 'desc'
                }
            }),
            prisma.product.count({ where })
        ]);
        
        // Calculate average ratings
        const productsWithAvgRating = products.map(product => {
            const ratings = product.ratings;
            const avgRating = ratings.length > 0 
                ? ratings.reduce((sum, rating) => sum + rating.rating, 0) / ratings.length 
                : 0;
            
            return {
                ...product,
                avgRating: Math.round(avgRating * 10) / 10,
                totalRatings: ratings.length
            };
        });
        
        return {
            products: productsWithAvgRating,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        };
    }


    // services/productService.js
    async calculateQuantityPrice(productId, quantity) {
        try {
            
            if (!productId || quantity < 1) {
                throw new Error('Valid product ID and quantity are required');
            }

            // First, check if product exists with basic query
            const product = await prisma.product.findUnique({
                where: { 
                    id: productId 
                },
                select: {
                    id: true,
                    name: true,
                    normalPrice: true,
                    offerPrice: true,
                    subcategoryId: true
                }
            });


            if (!product) {
                throw new Error('Product not found');
            }

            // Get the effective price (offer price first, then normal price)
            const normalPrice = product.offerPrice || product.normalPrice;
            
            // If no subcategory, return regular pricing
            if (!product.subcategoryId) {
                return {
                    originalPrice: normalPrice * quantity,
                    quantity: quantity,
                    applicableDiscount: null,
                    finalPrice: normalPrice * quantity,
                    totalSavings: 0,
                    message: 'No quantity pricing available for this product'
                };
            }

            // Get quantity prices for the subcategory
            const quantityPrices = await prisma.subcategoryQuantityPrice.findMany({
                where: { 
                    subcategoryId: product.subcategoryId,
                    isActive: true,
                    quantity: { lte: quantity } // Only offers where required quantity <= requested quantity
                },
                orderBy: { 
                    quantity: 'desc' // Get highest applicable quantity first
                }
            });


            let bestTotal = normalPrice * quantity;
            let appliedDiscount = null;

            // Find the best applicable discount
            for (const priceRule of quantityPrices) {
                if (quantity >= priceRule.quantity) {
                    let discountAmount = 0;
                    let finalPriceForRule = 0;

                    if (priceRule.priceType === 'PERCENTAGE') {
                        // Calculate percentage discount
                        discountAmount = (priceRule.value / 100) * normalPrice * quantity;
                        finalPriceForRule = (normalPrice * quantity) - discountAmount;
                    } else {
                        // Fixed amount - this is total price for the quantity
                        finalPriceForRule = priceRule.value;
                        discountAmount = (normalPrice * quantity) - finalPriceForRule;
                    }

                    // If this rule gives a better price, use it
                    if (finalPriceForRule < bestTotal) {
                        bestTotal = finalPriceForRule;
                        appliedDiscount = {
                            quantity: priceRule.quantity,
                            priceType: priceRule.priceType,
                            value: priceRule.value,
                            discountAmount: discountAmount
                        };
                    }
                }
            }

            const totalSavings = appliedDiscount ? appliedDiscount.discountAmount : 0;
            
            let message = 'No quantity discount available';
            if (appliedDiscount) {
                if (appliedDiscount.priceType === 'PERCENTAGE') {
                    message = `${appliedDiscount.value}% discount applied for buying ${appliedDiscount.quantity} or more items`;
                } else {
                    message = `Special price ₹${appliedDiscount.value} for buying ${appliedDiscount.quantity} items`;
                }
            }

            return {
                originalPrice: normalPrice * quantity,
                quantity: quantity,
                applicableDiscount: appliedDiscount,
                finalPrice: bestTotal,
                totalSavings: totalSavings,
                pricePerItem: bestTotal / quantity,
                message: message
            };

        } catch (error) {
            console.error('Error in calculateQuantityPrice:', error);
            throw new Error(`Failed to calculate quantity price: ${error.message}`);
        }
    }

    async getProductsWithQuantityOffers(subcategoryId, limit = 10) {
        const subcategory = await prisma.subcategory.findUnique({
        where: { id: subcategoryId },
        include: {
            quantityPrices: {
            where: { isActive: true },
            orderBy: { quantity: 'asc' }
            }
        }
        });

        if (!subcategory) {
        throw new Error('Subcategory not found');
        }

        // Get all active products in this subcategory
        const products = await prisma.product.findMany({
        where: {
            subcategoryId,
            status: 'ACTIVE'
        },
        include: {
            category: {
            select: {
                id: true,
                name: true,
                image: true
            }
            },
            subcategory: {
            select: {
                id: true,
                name: true,
                image: true
            }
            },
            variants: {
            include: {
                variantImages: {
                where: { isPrimary: true },
                take: 1
                }
            }
            },
            ratings: {
            where: {
                isApproved: true
            },
            select: {
                rating: true
            }
            }
        },
        take: limit
        });

        // Add quantity pricing info to each product
        const productsWithOffers = products.map(product => {
        const ratings = product.ratings;
        const avgRating = ratings.length > 0 
            ? ratings.reduce((sum, rating) => sum + rating.rating, 0) / ratings.length 
            : 0;

        return {
            ...product,
            avgRating: Math.round(avgRating * 10) / 10,
            totalRatings: ratings.length,
            quantityOffers: subcategory.quantityPrices,
            hasQuantityPricing: subcategory.quantityPrices.length > 0
        };
        });

        return {
        subcategory: {
            id: subcategory.id,
            name: subcategory.name,
            quantityOffers: subcategory.quantityPrices
        },
        products: productsWithOffers
        };
    }

    // Get product by ID - IMPROVED
    async getProductById(productId, includeVariants = true) {
        // Validate input
        if (!productId || typeof productId !== 'string') {
        throw new Error('Valid product ID is required');
        }

        const include = {
        category: {
            select: {
            id: true,
            name: true,
            image: true
            }
        },
        subcategory: {
            include: { // CHANGED: Include quantityPrices
            quantityPrices: {
                where: { isActive: true },
                orderBy: { quantity: 'asc' }
            }
            }
        },
        productDetails: true,
        ratings: {
            where: {
            isApproved: true
            },
            include: {
            user: {
                select: {
                id: true,
                name: true,
                avatar: true
                }
            }
            },
            orderBy: {
            createdAt: 'desc'
            }
        },
        variants: {
            include: {
            variantImages: {
                orderBy: {
                isPrimary: 'desc'
                }
            }
            }
        }
        };
        
        const product = await prisma.product.findUnique({
        where: { id: productId },
        include
        });
        
        if (!product) {
        logger.warn(`Product not found with ID: ${productId}`);
        return null;
        }
        
        // Calculate average rating
        const ratings = product.ratings;
        const avgRating = ratings.length > 0 
        ? ratings.reduce((sum, rating) => sum + rating.rating, 0) / ratings.length 
        : 0;
        
        return {
        ...product,
        avgRating: Math.round(avgRating * 10) / 10,
        totalRatings: ratings.length,
        hasQuantityPricing: product.subcategory?.quantityPrices?.length > 0
        };
    }

    // Get product by product code - IMPROVED
    async getProductByCode(productCode, includeVariants = true) {
        const include = {
        category: {
            select: {
            id: true,
            name: true,
            image: true
            }
        },
        subcategory: {
            include: { // CHANGED: Include quantityPrices
            quantityPrices: {
                where: { isActive: true },
                orderBy: { quantity: 'asc' }
            }
            }
        },
        productDetails: true,
        ratings: {
            where: {
            isApproved: true
            },
            include: {
            user: {
                select: {
                id: true,
                name: true,
                avatar: true
                }
            }
            }
        },
        variants: {
            include: {
            variantImages: {
                orderBy: {
                isPrimary: 'desc'
                }
            }
            }
        }
        };
        
        const product = await prisma.product.findUnique({
        where: { productCode },
        include
        });
        
        if (!product) {
        throw new Error('Product not found');
        }
        
        // Calculate average rating
        const ratings = product.ratings;
        const avgRating = ratings.length > 0 
        ? ratings.reduce((sum, rating) => sum + rating.rating, 0) / ratings.length 
        : 0;
        
        return {
        ...product,
        avgRating: Math.round(avgRating * 10) / 10,
        totalRatings: ratings.length,
        hasQuantityPricing: product.subcategory?.quantityPrices?.length > 0
        };
    }

    async getSubcategoriesWithQuantityPricing() {
        return await prisma.subcategory.findMany({
        where: {
            quantityPrices: {
            some: {
                isActive: true
            }
            }
        },
        include: {
            category: {
            select: {
                id: true,
                name: true
            }
            },
            quantityPrices: {
            where: { isActive: true },
            orderBy: { quantity: 'asc' }
            },
            _count: {
            select: {
                products: {
                where: { status: 'ACTIVE' }
                }
            }
            }
        }
        });
    }
    
    async calculateCartPrices(cartItems) {
        try {
            // Ensure we have an array
            const itemsArray = Array.isArray(cartItems) ? cartItems : [];
            
            const calculatedItems = await Promise.all(
                itemsArray.map(async (item) => {
                    // Normalize the item
                    const normalizedItem = {
                        productId: item?.productId || '',
                        quantity: parseInt(item?.quantity) || 1,
                        variantId: item?.variantId || null,
                        originalItem: item // Keep original for reference
                    };

                    // Skip if no productId
                    if (!normalizedItem.productId) {
                        return {
                            ...normalizedItem,
                            priceCalculation: {
                                totalPrice: 0,
                                effectiveUnitPrice: 0,
                                savings: 0,
                                hasQuantityPricing: false,
                                error: 'Missing productId'
                            },
                            finalPrice: 0,
                            error: 'Missing productId'
                        };
                    }

                    try {
                        const priceCalculation = await this.calculateQuantityPrice(
                            normalizedItem.productId,
                            normalizedItem.quantity
                        );
                        
                        return {
                            ...normalizedItem,
                            priceCalculation,
                            finalPrice: priceCalculation.totalPrice,
                            success: true
                        };
                    } catch (error) {
                        logger.error(`Price calculation failed for ${normalizedItem.productId}:`, error);
                        
                        // Fallback to direct product lookup
                        try {
                            const product = await prisma.product.findFirst({
                                where: {
                                    OR: [
                                        { id: normalizedItem.productId },
                                        { productCode: normalizedItem.productId }
                                    ],
                                    status: 'ACTIVE'
                                },
                                select: {
                                    id: true,
                                    name: true,
                                    normalPrice: true,
                                    offerPrice: true,
                                    productCode: true,
                                    status: true
                                }
                            });

                            if (!product) {
                                throw new Error(`Active product not found: ${normalizedItem.productId}`);
                            }

                            const unitPrice = product.offerPrice || product.normalPrice || 0;
                            const totalPrice = unitPrice * normalizedItem.quantity;
                            
                            return {
                                ...normalizedItem,
                                productDetails: product,
                                priceCalculation: {
                                    totalPrice,
                                    effectiveUnitPrice: unitPrice,
                                    savings: 0,
                                    hasQuantityPricing: false,
                                    error: `Fallback: ${error.message}`
                                },
                                finalPrice: totalPrice,
                                success: false,
                                warning: 'Used fallback pricing'
                            };
                        } catch (dbError) {
                            return {
                                ...normalizedItem,
                                priceCalculation: {
                                    totalPrice: 0,
                                    effectiveUnitPrice: 0,
                                    savings: 0,
                                    hasQuantityPricing: false,
                                    error: dbError.message
                                },
                                finalPrice: 0,
                                success: false,
                                error: dbError.message
                            };
                        }
                    }
                })
            );

            // Calculate totals
            const successfulItems = calculatedItems.filter(item => item.success);
            const failedItems = calculatedItems.filter(item => !item.success);
            
            const subtotal = calculatedItems.reduce((sum, item) => sum + (item.finalPrice || 0), 0);
            const totalSavings = calculatedItems.reduce((sum, item) => sum + (item.priceCalculation?.savings || 0), 0);

            return {
                items: calculatedItems,
                successfulItems,
                failedItems,
                subtotal,
                totalSavings,
                total: subtotal,
                hasQuantityDiscounts: totalSavings > 0,
                success: failedItems.length === 0,
                warnings: failedItems.length > 0 ? 
                    `${failedItems.length} items had pricing issues` : 
                    null
            };
            
        } catch (error) {
            logger.error('Critical error in calculateCartPrices:', error);
            throw error;
        }
    }
        

    async createProduct(productData, variantImages = [], variantColors = []) {
        const {
            name,
            productCode,
            description,
            normalPrice,
            offerPrice,
            wholesalePrice,
            categoryId,
            subcategoryId,
            productDetails = [],
            variants = []
        } = productData;

        // ✅ FIX: Product code is now optional
        if (productCode && productCode.trim() !== '') {
            const existingProduct = await prisma.product.findUnique({
                where: { productCode }
            });
            
            if (existingProduct) {
                throw new Error('Product code already exists');
            }
        } else {
            productData.productCode = `PROD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        }
        
        // ✅ Category validation
        if (categoryId && categoryId.trim() !== '') {
            const category = await prisma.category.findUnique({
                where: { id: categoryId }
            });
            
            if (!category) {
                throw new Error('Category not found');
            }
            
            if (subcategoryId && subcategoryId.trim() !== '') {
                const subcategory = await prisma.subcategory.findUnique({
                    where: { id: subcategoryId }
                });
                
                if (!subcategory) {
                    throw new Error('Subcategory not found');
                }
            }
        }
        
        // Prepare product details
        const productDetailsData = productDetails.map(detail => ({
            title: detail.title,
            description: detail.description
        }));

        // Group images by color
        const variantImagesByColor = this.groupVariantImagesByColor(variantImages, variants, variantColors);

        // Create individual variants for EACH color-size combination
        const flattenedVariants = [];

        for (const variantGroup of variants) {
            const { color, sizes = [], variantCodes = [] } = variantGroup; // ✅ Get variantCodes at color level

            // ✅ Validate and sanitize variant codes (AT COLOR LEVEL)
            const sanitizedVariantCodes = Array.isArray(variantCodes) 
                ? variantCodes.filter(code => code && code.trim() !== '').map(code => code.trim())
                : [];

            // ✅ Check for duplicate variant codes (AT COLOR LEVEL)
            if (sanitizedVariantCodes.length > 0) {
                const existingCodes = await prisma.productVariant.findMany({
                    where: {
                        OR: sanitizedVariantCodes.map(code => ({
                            variantCodes: {
                                has: code
                            }
                        }))
                    },
                    select: { variantCodes: true }
                });
                
                if (existingCodes.length > 0) {
                    const duplicateCodes = existingCodes.flatMap(v => v.variantCodes)
                        .filter(code => sanitizedVariantCodes.includes(code));
                    if (duplicateCodes.length > 0) {
                        throw new Error(`Variant codes already exist: ${duplicateCodes.join(', ')}`);
                    }
                }
            }

            // Get images for this color
            const colorImages = variantImagesByColor[color] || [];

            let variantImagesData = [];
            
            // Upload variant images if provided
            if (colorImages.length > 0) {
                try {
                    const uploadResults = await s3UploadService.uploadMultipleImages(
                        colorImages,
                        `products/${productData.productCode}/variants/${color}`
                    );
                    
                    variantImagesData = uploadResults.map((result, index) => ({
                        imageUrl: result.url,
                        imagePublicId: result.key,
                        isPrimary: index === 0,
                        color: color
                    }));
                    
                } catch (uploadError) {
                    logger.error('Failed to upload variant images:', uploadError);
                    throw new Error('Failed to upload variant images');
                }
            }

            // Create individual variant for EACH size
            for (const sizeObj of sizes) {
                const { size, stock = 0, sku: sizeSku } = sizeObj; // ❌ NO variantCodes here

                // Validate size is provided
                if (!size || size.trim() === '') {
                    continue;
                }

                // Create SKU with category code or generic code
                let sku = sizeSku;
                if (!sku || sku.trim() === '') {
                    if (categoryId) {
                        const category = await prisma.category.findUnique({
                            where: { id: categoryId },
                            select: { name: true }
                        });
                        const categoryCode = category ? category.name.substring(0, 3).toUpperCase() : 'GEN';
                        sku = `${productData.productCode}-${categoryCode}-${color}-${size}`;
                    } else {
                        sku = `${productData.productCode}-GEN-${color}-${size}`;
                    }
                }

                // Check if SKU already exists
                if (sku && sku.trim() !== '') {
                    const existingVariant = await prisma.productVariant.findUnique({
                        where: { sku }
                    });
                    
                    if (existingVariant) {
                        throw new Error(`SKU already exists: ${sku}`);
                    }
                }

                // Create individual variant with BOTH color and size
                flattenedVariants.push({
                    color,
                    size: size.trim(),
                    stock: parseInt(stock) || 0,
                    sku: sku || null,
                    variantCodes: sanitizedVariantCodes, // ✅ Add variantCodes at variant level (shared by all sizes of same color)
                    variantImages: {
                        create: variantImagesData
                    }
                });
            }
        }

        // Validate we have variants
        if (flattenedVariants.length === 0) {
            throw new Error('No valid variants with sizes');
        }

        // Create product data
        const productDataToCreate = {
            name,
            productCode: productData.productCode,
            description: description || null,
            normalPrice: parseFloat(normalPrice),
            offerPrice: offerPrice ? parseFloat(offerPrice) : null,
            wholesalePrice: wholesalePrice ? parseFloat(wholesalePrice) : null,
            categoryId: categoryId && categoryId.trim() !== '' ? categoryId : null,
            subcategoryId: subcategoryId && subcategoryId.trim() !== '' ? subcategoryId : null,
            productDetails: {
                create: productDetailsData
            },
            variants: {
                create: flattenedVariants
            }
        };

        // Create product with all variants
        const product = await prisma.product.create({
            data: productDataToCreate,
            include: {
                category: {
                    select: {
                        id: true,
                        name: true
                    }
                },
                subcategory: {
                    select: {
                        id: true,
                        name: true
                    }
                },
                productDetails: true,
                variants: {
                    include: {
                        variantImages: true
                    }
                }
            }
        });

        // ✅ Log variant codes if added
        if (variants.length > 0) {
            variants.forEach((variantGroup, index) => {
                const { color, variantCodes = [] } = variantGroup;
                if (variantCodes.length > 0) {
                    logger.info(`Color "${color}" has ${variantCodes.length} variant codes: ${variantCodes.join(', ')}`);
                }
            });
        }

        logger.info(`Product created: ${product.id} with ${flattenedVariants.length} variants`);
        product.variants.forEach(variant => {
        logger.info(`    SKU: ${variant.sku || 'Not set'}`);
        });
        return product;
    }

    groupVariantImagesByColor(variantImages, variants, variantColors) {
        const imagesByColor = {};

        // Get unique colors from variants
        const uniqueColors = [...new Set(variants.map(v => v.color))];

        // If we have variantColors array from FormData, use that for grouping
        if (variantColors && variantColors.length === variantImages.length) {
            variantImages.forEach((image, index) => {
                const color = variantColors[index];
                if (color) {
                    if (!imagesByColor[color]) {
                        imagesByColor[color] = [];
                    }
                    imagesByColor[color].push(image);
                }
            });
        } else {
            // Fallback to fieldname parsing
            variantImages.forEach((image) => {
                const fieldName = image.fieldname || '';
                let assignedColor = null;

                // Extract color from fieldname like "variantImages[Red]"
                const colorMatch = fieldName.match(/variantImages\[([^\]]+)\]/);
                if (colorMatch && colorMatch[1]) {
                    assignedColor = colorMatch[1];
                }

                // Check if fieldname contains any of the color names
                if (!assignedColor) {
                    for (const color of uniqueColors) {
                        if (fieldName.toLowerCase().includes(color.toLowerCase())) {
                            assignedColor = color;
                            break;
                        }
                    }
                }

                if (assignedColor) {
                    if (!imagesByColor[assignedColor]) {
                        imagesByColor[assignedColor] = [];
                    }
                    imagesByColor[assignedColor].push(image);
                } else if (uniqueColors.length > 0) {
                    // Assign to first color as fallback
                    const fallbackColor = uniqueColors[0];
                    if (!imagesByColor[fallbackColor]) {
                        imagesByColor[fallbackColor] = [];
                    }
                    imagesByColor[fallbackColor].push(image);
                }
            });
        }

        return imagesByColor;
    }


    async updateProduct(productId, updateData, files = [], variantColors = []) {
        
        const product = await prisma.product.findUnique({
            where: { id: productId },
            include: {
                productDetails: true,
                variants: {
                    include: {
                        variantImages: true
                    }
                }
            }
        });
        
        if (!product) {
            throw new Error('Product not found');
        }
        
        const {
            name,
            description,
            normalPrice,
            offerPrice,
            wholesalePrice,
            categoryId,
            subcategoryId,
            productDetails,
            status,
            variants
        } = updateData;
        
        // ✅ FIX: Ensure variants is always an array
        const variantsData = Array.isArray(variants) ? variants : [];
        
        // ✅ FIX: Category is optional - only validate if provided
        if (categoryId !== undefined && categoryId !== null && categoryId !== '') {
            if (categoryId !== product.categoryId) {
                const category = await prisma.category.findUnique({
                    where: { id: categoryId }
                });
                if (!category) {
                    throw new Error('Category not found');
                }
            }
            
            // ✅ FIX: Only validate subcategory if both are provided
            if (subcategoryId !== undefined && subcategoryId !== null && subcategoryId !== '') {
                const subcategory = await prisma.subcategory.findUnique({
                    where: { id: subcategoryId }
                });
                if (!subcategory) {
                    throw new Error('Subcategory not found');
                }
            }
        } else {
            // ✅ FIX: If category is being cleared (set to null/empty), allow it
        }
        
        // ✅ FIX: Group images using variantColors
        let variantImagesByColor = {};
        if (variantsData.length > 0 && files.length > 0) {
            variantImagesByColor = this.groupVariantImagesByColor(files, variantsData, variantColors);
        }
        
        // Update product data
        const updatePayload = {
            name: name || product.name,
            description: description !== undefined ? description : product.description,
            normalPrice: normalPrice ? parseFloat(normalPrice) : product.normalPrice,
            offerPrice: offerPrice !== undefined ? parseFloat(offerPrice) : product.offerPrice,
            wholesalePrice: wholesalePrice !== undefined ? parseFloat(wholesalePrice) : product.wholesalePrice,
            // ✅ FIX: Handle categoryId - set to null if empty/undefined
            categoryId: categoryId !== undefined ? (categoryId || null) : product.categoryId,
            // ✅ FIX: Handle subcategoryId - set to null if empty/undefined
            subcategoryId: subcategoryId !== undefined ? (subcategoryId || null) : product.subcategoryId,
            status: status || product.status,
            updatedAt: new Date()
        };
        
        // Handle product details update if provided
        if (productDetails && Array.isArray(productDetails)) {
            // Delete existing product details
            await prisma.productDetail.deleteMany({
                where: { productId }
            });
            
            // Create new product details
            updatePayload.productDetails = {
                create: productDetails.map(detail => ({
                    title: detail.title,
                    description: detail.description
                }))
            };
        }
        
        // ✅ FIX: Handle variants update ONLY if variants data is provided
        if (variantsData.length > 0) {
            
            // Get existing variant images grouped by color for preservation
            const existingImagesByColor = {};
            product.variants.forEach(variant => {
                if (!existingImagesByColor[variant.color]) {
                    existingImagesByColor[variant.color] = [];
                }
                if (variant.variantImages && variant.variantImages.length > 0) {
                    existingImagesByColor[variant.color].push(...variant.variantImages);
                }
            });
            
            // Delete existing variants and their images
            await prisma.productVariantImage.deleteMany({
                where: {
                    variant: {
                        productId: productId
                    }
                }
            });
            
            await prisma.productVariant.deleteMany({
                where: { productId }
            });
            
            const flattenedVariants = [];
            
            for (const variantGroup of variantsData) {
                // ✅ FIX: Get variantCodes at COLOR level
                const { color, sizes = [], variantCodes = [] } = variantGroup;
                const colorImages = variantImagesByColor[color] || [];
                const existingColorImages = existingImagesByColor[color] || [];
                
                let variantImagesData = [];
                
                // ✅ FIX: Preserve existing images if no new images uploaded
                if (colorImages.length > 0) {
                    // Upload new variant images if provided
                    try {
                        const uploadResults = await s3UploadService.uploadMultipleImages(
                            colorImages,
                            `products/${product.productCode}/variants/${color}`
                        );
                        
                        variantImagesData = uploadResults.map((result, index) => ({
                            imageUrl: result.url,
                            imagePublicId: result.key,
                            isPrimary: index === 0,
                            color: color
                        }));
                        
                    } catch (uploadError) {
                        logger.error('Failed to upload variant images during update:', uploadError);
                        throw new Error('Failed to upload variant images');
                    }
                } else if (existingColorImages.length > 0) {
                    // ✅ FIX: Preserve existing images when no new images are uploaded
                    variantImagesData = existingColorImages.map((image, index) => ({
                        imageUrl: image.imageUrl,
                        imagePublicId: image.imagePublicId,
                        isPrimary: image.isPrimary,
                        color: color
                    }));
                } else {
                    console.error(`⚠️ No images found for color "${color}"`);
                }
                
                // ✅ FIX: Sanitize variant codes at COLOR level
                const sanitizedVariantCodes = Array.isArray(variantCodes) 
                    ? variantCodes.filter(code => code && code.trim() !== '').map(code => code.trim())
                    : [];
                
                // ✅ FIX: Check for duplicate variant codes (excluding current product's variants)
                if (sanitizedVariantCodes.length > 0) {
                    const existingCodes = await prisma.productVariant.findMany({
                        where: {
                            AND: [
                                {
                                    productId: { not: productId }
                                },
                                {
                                    OR: sanitizedVariantCodes.map(code => ({
                                        variantCodes: {
                                            has: code
                                        }
                                    }))
                                }
                            ]
                        },
                        select: { variantCodes: true }
                    });
                    
                    if (existingCodes.length > 0) {
                        const duplicateCodes = existingCodes.flatMap(v => v.variantCodes)
                            .filter(code => sanitizedVariantCodes.includes(code));
                        if (duplicateCodes.length > 0) {
                            throw new Error(`Variant codes already exist: ${duplicateCodes.join(', ')}`);
                        }
                    }
                }
                
                // Create individual variants for each size
                for (const sizeObj of sizes) {
                    // ✅ FIX: Remove variantCodes from sizeObj - use color level variantCodes
                    const { size, stock = 0, sku: sizeSku } = sizeObj;
                    
                    if (!size || size.trim() === '') {
                        console.warn(`Skipping invalid size for "${color}": ${size}`);
                        continue;
                    }
                    
                    // ✅ FIX: Generate SKU based on current category (or generic)
                    let sku = sizeSku;
                    if (!sku || sku.trim() === '') {
                        const currentCategoryId = updatePayload.categoryId || product.categoryId;
                        if (currentCategoryId) {
                            const category = await prisma.category.findUnique({
                                where: { id: currentCategoryId },
                                select: { name: true }
                            });
                            const categoryCode = category ? category.name.substring(0, 3).toUpperCase() : 'GEN';
                            sku = `${product.productCode}-${categoryCode}-${color}-${size}`;
                        } else {
                            sku = `${product.productCode}-GEN-${color}-${size}`;
                        }
                    }
                    
                    // ✅ FIX: Check SKU uniqueness (excluding current product's variants)
                    if (sku && sku.trim() !== '') {
                        const existingVariant = await prisma.productVariant.findFirst({
                            where: { 
                                sku,
                                productId: { not: productId }
                            }
                        });
                        
                        if (existingVariant) {
                            throw new Error(`SKU already exists: ${sku}`);
                        }
                    }
                    
                    // ✅ FIX: All sizes of same color get the same variantCodes
                    flattenedVariants.push({
                        color,
                        size: size.trim(),
                        stock: parseInt(stock) || 0,
                        sku: sku || null,
                        variantCodes: sanitizedVariantCodes, // ✅ Use COLOR level variantCodes for all sizes
                        variantImages: {
                            create: variantImagesData
                        }
                    });
                }
            }
            
            // Add variants to update payload
            updatePayload.variants = {
                create: flattenedVariants
            };
        } else {
            console.error('No variants data provided, keeping existing variants');
        }
        
        const updatedProduct = await prisma.product.update({
            where: { id: productId },
            data: updatePayload,
            include: {
                category: {
                    select: {
                        id: true,
                        name: true
                    }
                },
                subcategory: {
                    select: {
                        id: true,
                        name: true
                    }
                },
                productDetails: true,
                variants: {
                    include: {
                        variantImages: {
                            orderBy: {
                                isPrimary: 'desc'
                            }
                        }
                    }
                }
            }
        });
        
        logger.info(`Product updated: ${productId}`);
        return updatedProduct;
    }
    
    // Delete product - UPDATED: Remove product image deletion
    async deleteProduct(productId) {
        const product = await prisma.product.findUnique({
            where: { id: productId },
            include: {
                // REMOVED: images include
                variants: {
                    include: {
                        variantImages: true
                    }
                },
                orderItems: true
            }
        });
        
        if (!product) {
            throw new Error('Product not found');
        }
        
        // Check if product has orders
        if (product.orderItems.length > 0) {
            throw new Error('Cannot delete product with existing orders');
        }
        
        // Delete variant images from S3
        for (const variant of product.variants) {
            for (const variantImage of variant.variantImages) {
                if (variantImage.imagePublicId) {
                    try {
                        await s3UploadService.deleteImage(variantImage.imagePublicId);
                    } catch (error) {
                        logger.error('Failed to delete variant image from S3:', error);
                    }
                }
            }
        }
        
        await prisma.product.delete({
            where: { id: productId }
        });
        
        logger.info(`Product deleted: ${productId}`);
    }
  
  
    // Add product variant - UPDATED: Only variant images
    async addProductVariant(productId, variantData, files = []) {
        const product = await prisma.product.findUnique({
            where: { id: productId }
        });
        
        if (!product) {
            throw new Error('Product not found');
        }
        
        const { color, sizes } = variantData;
        
        if (!color || !sizes || !Array.isArray(sizes)) {
            throw new Error('Color and sizes array are required');
        }
        
        // Upload variant images if provided
        let variantImages = [];
        if (files.length > 0) {
            try {
                const uploadResults = await s3UploadService.uploadMultipleImages(
                    files,
                    `products/${product.productCode}/variants/${color}`
                );
                variantImages = uploadResults.map((result, index) => ({
                    imageUrl: result.url,
                    imagePublicId: result.key,
                    isPrimary: index === 0,
                    color: color
                }));
            } catch (uploadError) {
                logger.error('Failed to upload variant images:', uploadError);
                throw new Error('Failed to upload variant images');
            }
        }
        
        // Create a variant for each size
        const createdVariants = [];
        
        for (const sizeData of sizes) {
            const { size, stock = 0, sku } = sizeData;
            
            if (!size || size === 'undefined') {
                console.warn('Skipping variant with invalid size:', sizeData);
                continue;
            }
            
            // Check if variant with same color and size already exists
            const existingVariant = await prisma.productVariant.findFirst({
                where: {
                    productId,
                    color,
                    size
                }
            });
            
            if (existingVariant) {
                throw new Error(`Variant with color ${color} and size ${size} already exists`);
            }
            
            // Check if SKU already exists
            if (sku) {
                const existingSku = await prisma.productVariant.findFirst({
                    where: {
                        sku,
                        productId: { not: productId }
                    }
                });
                
                if (existingSku) {
                    throw new Error(`SKU ${sku} already exists`);
                }
            }
            
            const generatedSku = sku || `${product.productCode}-${color}-${size}`;
            
            const variant = await prisma.productVariant.create({
                data: {
                    productId,
                    color,
                    size,
                    stock: parseInt(stock),
                    sku: generatedSku,
                    variantImages: {
                        create: variantImages.map((img, index) => ({
                            ...img,
                            // Only set first image as primary for the first variant
                            isPrimary: createdVariants.length === 0 && index === 0
                        }))
                    }
                },
                include: {
                    variantImages: {
                        orderBy: {
                            isPrimary: 'desc'
                        }
                    }
                }
            });
            
            createdVariants.push(variant);
        }
        
        const updatedProduct = await prisma.product.findUnique({
            where: { id: productId },
            include: {
                variants: {
                    include: {
                        variantImages: {
                            orderBy: {
                                isPrimary: 'desc'
                            }
                        }
                    }
                }
            }
        });
        
        logger.info(`Added ${createdVariants.length} variants for product ${productId}, color: ${color}`);
        return updatedProduct;
    }
  
    // Update product variant - UPDATED: Only variant images
    async updateProductVariant(productId, variantId, variantData, files = []) {
        const variant = await prisma.productVariant.findUnique({
            where: { id: variantId },
            include: {
                variantImages: true
            }
        });
        
        if (!variant || variant.productId !== productId) {
            throw new Error('Product variant not found');
        }
        
        const { color, size, stock, sku } = variantData;
        
        // Determine the values to be used for update
        const updatedColor = color !== undefined ? color : variant.color;
        const updatedSize = size !== undefined ? size : variant.size;
        
        // Check if variant with same color and size already exists (excluding current variant)
        // Only check if EITHER color OR size is being changed
        if (updatedColor !== variant.color || updatedSize !== variant.size) {
            const existingVariant = await prisma.productVariant.findFirst({
                where: {
                    productId,
                    color: updatedColor,
                    size: updatedSize,
                    id: { not: variantId }
                }
            });
            
            if (existingVariant) {
                throw new Error('Variant with same color and size already exists');
            }
        }
        
        // Check if SKU already exists (excluding current variant)
        if (sku && sku !== variant.sku) {
            const existingSku = await prisma.productVariant.findFirst({
                where: {
                    sku,
                    id: { not: variantId }
                }
            });
            
            if (existingSku) {
                throw new Error('SKU already exists');
            }
        }
        
        // Upload new variant images if provided
        let newVariantImages = [];
        if (files.length > 0) {
            try {
                const uploadResults = await s3UploadService.uploadMultipleImages(
                    files,
                    `products/${productId}/variants/${updatedColor}`
                );
                newVariantImages = uploadResults.map(result => ({
                    imageUrl: result.url,
                    imagePublicId: result.key,
                    isPrimary: false,
                    color: updatedColor
                }));
            } catch (uploadError) {
                logger.error('Failed to upload variant images:', uploadError);
                throw new Error('Failed to upload variant images');
            }
        }
        
        const updatedVariant = await prisma.productVariant.update({
            where: { id: variantId },
            data: {
                color: updatedColor,
                size: updatedSize,
                stock: stock !== undefined ? parseInt(stock) : variant.stock,
                sku: sku || variant.sku,
                updatedAt: new Date(),
                ...(newVariantImages.length > 0 && {
                    variantImages: {
                        create: newVariantImages
                    }
                })
            },
            include: {
                variantImages: {
                    orderBy: {
                        isPrimary: 'desc'
                    }
                }
            }
        });
        
        const updatedProduct = await prisma.product.findUnique({
            where: { id: productId },
            include: {
                variants: {
                    include: {
                        variantImages: {
                            orderBy: {
                                isPrimary: 'desc'
                            }
                        }
                    }
                }
            }
        });
        
        logger.info(`Product variant updated: ${productId}, variantId: ${variantId}`);
        return updatedProduct;
    }
  
    async updateVariantCodes(productId, color, variantCodes) {
    // Find all variants of this color in the product
    const variants = await prisma.productVariant.findMany({
        where: {
            productId: productId,
            color: color
        }
    });
    
    if (variants.length === 0) {
        throw new Error(`No variants found for color ${color} in product ${productId}`);
    }
    
    // Sanitize variant codes
    const sanitizedVariantCodes = Array.isArray(variantCodes) 
        ? variantCodes.filter(code => code && code.trim() !== '').map(code => code.trim())
        : [];
    
    // Check for duplicate variant codes in OTHER products
    if (sanitizedVariantCodes.length > 0) {
        const existingCodes = await prisma.productVariant.findMany({
            where: {
                AND: [
                    {
                        productId: { not: productId } // Exclude current product
                    },
                    {
                        OR: sanitizedVariantCodes.map(code => ({
                            variantCodes: {
                                has: code
                            }
                        }))
                    }
                ]
            },
            select: { variantCodes: true, productId: true }
        });
        
        if (existingCodes.length > 0) {
            const duplicateCodes = existingCodes.flatMap(v => v.variantCodes)
                .filter(code => sanitizedVariantCodes.includes(code));
            if (duplicateCodes.length > 0) {
                throw new Error(`Variant codes already exist in other products: ${duplicateCodes.join(', ')}`);
            }
        }
    }
    
    // Update ALL variants of this color
    const updatedVariants = await prisma.productVariant.updateMany({
        where: {
            productId: productId,
            color: color
        },
        data: {
            variantCodes: sanitizedVariantCodes,
            updatedAt: new Date()
        }
    });
    
    logger.info(`Updated variant codes for color "${color}" in product ${productId}: ${sanitizedVariantCodes.join(', ')}`);
    
    // Return updated variants
    const result = await prisma.productVariant.findMany({
        where: {
            productId: productId,
            color: color
        },
        include: {
            variantImages: {
                orderBy: {
                    isPrimary: 'desc'
                }
            }
        }
    });
    
    return {
        success: true,
        message: `Updated variant codes for ${updatedVariants.count} variants`,
        color: color,
        variantCodes: sanitizedVariantCodes,
        variants: result
    };
}

async updateVariantWithCodes(productId, variantId, updates) {
    const { stock, variantCodes, color } = updates;
    
    let result = {};
    
    // Update stock if provided
    if (stock !== undefined) {
        result.stockUpdate = await this.updateVariantStock(productId, variantId, stock);
    }
    
    // Update variant codes if provided
    if (variantCodes !== undefined && color) {
        result.codesUpdate = await this.updateVariantCodes(productId, color, variantCodes);
    }
    
    return result;
}
    // Remove product variant
    async removeProductVariant(productId, variantId) {
        const variant = await prisma.productVariant.findUnique({
            where: { id: variantId },
            include: {
                variantImages: true,
                orderItems: true
            }
        });
        
        if (!variant || variant.productId !== productId) {
            throw new Error('Product variant not found');
        }
        
        // Check if variant has orders
        if (variant.orderItems.length > 0) {
            throw new Error('Cannot delete variant with existing orders');
        }
        
        // Delete variant images from S3
        for (const variantImage of variant.variantImages) {
            if (variantImage.imagePublicId) {
                try {
                    await s3UploadService.deleteImage(variantImage.imagePublicId);
                } catch (error) {
                    logger.error('Failed to delete variant image from S3:', error);
                }
            }
        }
        
        await prisma.productVariant.delete({
            where: { id: variantId }
        });
        
        const updatedProduct = await prisma.product.findUnique({
            where: { id: productId },
            include: {
                variants: {
                    include: {
                        variantImages: {
                            orderBy: {
                                isPrimary: 'desc'
                            }
                        }
                    }
                }
            }
        });
        
        logger.info(`Product variant removed: ${productId}, variantId: ${variantId}`);
        return updatedProduct;
    }
  
    // Add variant images
    async addVariantImages(productId, variantId, files) {
        const variant = await prisma.productVariant.findUnique({
            where: { id: variantId }
        });
        
        if (!variant || variant.productId !== productId) {
            throw new Error('Product variant not found');
        }
        
        let newVariantImages = [];
        if (files.length > 0) {
            try {
                const uploadResults = await s3UploadService.uploadMultipleImages(
                    files,
                    `products/${productId}/variants/${variant.color}`
                );
                newVariantImages = uploadResults.map(result => ({
                    imageUrl: result.url,
                    imagePublicId: result.key,
                    isPrimary: false,
                    color: variant.color
                }));
            } catch (uploadError) {
                logger.error('Failed to upload variant images:', uploadError);
                throw new Error('Failed to upload variant images');
            }
        }
        
        const updatedVariant = await prisma.productVariant.update({
            where: { id: variantId },
            data: {
                variantImages: {
                    create: newVariantImages
                },
                updatedAt: new Date()
            },
            include: {
                variantImages: {
                    orderBy: {
                        isPrimary: 'desc'
                    }
                }
            }
        });
        
        logger.info(`Variant images added: ${variantId}, count: ${newVariantImages.length}`);
        return updatedVariant;
    }
  
    // Remove variant image
    async removeVariantImage(productId, variantId, imageId) {
        const variant = await prisma.productVariant.findUnique({
            where: { id: variantId },
            include: {
                variantImages: true
            }
        });
        
        if (!variant || variant.productId !== productId) {
            throw new Error('Product variant not found');
        }
        
        const variantImage = variant.variantImages.find(img => img.id === imageId);
        if (!variantImage) {
            throw new Error('Variant image not found');
        }
        
        // Delete image from S3
        if (variantImage.imagePublicId) {
            try {
                await s3UploadService.deleteImage(variantImage.imagePublicId);
            } catch (error) {
                logger.error('Failed to delete variant image from S3:', error);
                throw new Error('Failed to remove variant image');
            }
        }
        
        // If this was the primary image, set another image as primary
        let setNewPrimary = false;
        if (variantImage.isPrimary && variant.variantImages.length > 1) {
            setNewPrimary = true;
        }
        
        // Delete the image
        await prisma.productVariantImage.delete({
            where: { id: imageId }
        });
        
        // Set new primary image if needed
        if (setNewPrimary) {
            const remainingImages = await prisma.productVariantImage.findMany({
                where: { variantId },
                orderBy: { createdAt: 'asc' }
            });
            
            if (remainingImages.length > 0) {
                await prisma.productVariantImage.update({
                    where: { id: remainingImages[0].id },
                    data: { isPrimary: true }
                });
            }
        }
        
        const updatedVariant = await prisma.productVariant.findUnique({
            where: { id: variantId },
            include: {
                variantImages: {
                    orderBy: {
                        isPrimary: 'desc'
                    }
                }
            }
        });
        
        logger.info(`Variant image removed: ${variantId}, imageId: ${imageId}`);
        return updatedVariant;
    }
  
    // Set primary variant image
    async setPrimaryVariantImage(productId, variantId, imageId) {
        const variant = await prisma.productVariant.findUnique({
            where: { id: variantId },
            include: {
                variantImages: true
            }
        });
        
        if (!variant || variant.productId !== productId) {
            throw new Error('Product variant not found');
        }
        
        const variantImage = variant.variantImages.find(img => img.id === imageId);
        if (!variantImage) {
            throw new Error('Variant image not found');
        }
        
        // Reset all variant images to non-primary
        await prisma.productVariantImage.updateMany({
            where: { variantId },
            data: { isPrimary: false }
        });
        
        // Set the selected image as primary
        await prisma.productVariantImage.update({
            where: { id: imageId },
            data: { isPrimary: true }
        });
        
        const updatedVariant = await prisma.productVariant.findUnique({
            where: { id: variantId },
            include: {
                variantImages: {
                    orderBy: {
                        isPrimary: 'desc'
                    }
                }
            }
        });
        
        logger.info(`Primary variant image set: ${variantId}, imageId: ${imageId}`);
        return updatedVariant;
    }
  
    // Update variant stock
    async updateVariantStock(productId, variantId, stock) {
        const variant = await prisma.productVariant.findUnique({
            where: { id: variantId }
        });
        
        if (!variant || variant.productId !== productId) {
            throw new Error('Product variant not found');
        }
        
        const updatedVariant = await prisma.productVariant.update({
            where: { id: variantId },
            data: {
                stock: parseInt(stock),
                updatedAt: new Date()
            }
        });
        
        logger.info(`Variant stock updated: ${variantId}, stock: ${stock}`);
        return updatedVariant;
    }
  
    // Get product statistics
    async getProductStats() {
        const [
            totalProducts,
            activeProducts,
            outOfStockProducts,
            productsWithVariants,
            totalVariants,
            lowStockVariants,
            categoriesWithProducts,
            averagePrice
        ] = await Promise.all([
            prisma.product.count(),
            prisma.product.count({ where: { status: 'ACTIVE' } }),
            prisma.product.count({ where: { status: 'OUT_OF_STOCK' } }),
            prisma.product.count({
                where: {
                    variants: {
                        some: {}
                    }
                }
            }),
            prisma.productVariant.count(),
            prisma.productVariant.count({ where: { stock: { lt: 10 } } }),
            prisma.category.count({
                where: {
                    products: {
                        some: {
                            status: 'ACTIVE'
                        }
                    }
                }
            }),
            prisma.product.aggregate({
                where: { status: 'ACTIVE' },
                _avg: {
                    normalPrice: true
                }
            })
        ]);
        
        return {
            totalProducts,
            activeProducts,
            inactiveProducts: totalProducts - activeProducts - outOfStockProducts,
            outOfStockProducts,
            productsWithVariants,
            totalVariants,
            lowStockVariants,
            categoriesWithProducts,
            averagePrice: averagePrice._avg.normalPrice || 0
        };
    }
  
    // Search products - UPDATED: Remove product image references
    async searchProducts({
        query,
        categoryId,
        subcategoryId,
        minPrice,
        maxPrice,
        colors,
        sizes,
        page = 1,
        limit = 12
    }) {
        const skip = (page - 1) * limit;
        
        const where = {
            status: 'ACTIVE'
        };
        
        if (query) {
            where.OR = [
                { name: { contains: query, mode: 'insensitive' } },
                { description: { contains: query, mode: 'insensitive' } },
                { productCode: { contains: query, mode: 'insensitive' } }
            ];
        }
        
        if (categoryId) {
            where.categoryId = categoryId;
        }
        
        if (subcategoryId) {
            where.subcategoryId = subcategoryId;
        }
        
        if (minPrice !== undefined || maxPrice !== undefined) {
            where.OR = [
                {
                    normalPrice: {
                        ...(minPrice !== undefined && { gte: parseFloat(minPrice) }),
                        ...(maxPrice !== undefined && { lte: parseFloat(maxPrice) })
                    }
                },
                {
                    offerPrice: {
                        ...(minPrice !== undefined && { gte: parseFloat(minPrice) }),
                        ...(maxPrice !== undefined && { lte: parseFloat(maxPrice) })
                    }
                }
            ];
        }
        
        // Filter by variants (color and size)
        if (colors.length > 0 || sizes.length > 0) {
            where.variants = {
                some: {
                    ...(colors.length > 0 && { color: { in: colors } }),
                    ...(sizes.length > 0 && { size: { in: sizes } })
                }
            };
        }
        
        const [products, total] = await Promise.all([
            prisma.product.findMany({
                where,
                skip,
                take: limit,
                include: {
                    category: {
                        select: {
                            id: true,
                            name: true
                        }
                    },
                    subcategory: {
                        select: {
                            id: true,
                            name: true
                        }
                    },
                    // REMOVED: images include
                    variants: {
                        include: {
                            variantImages: {
                                where: { isPrimary: true },
                                take: 1
                            }
                        }
                    },
                    ratings: {
                        where: {
                            isApproved: true
                        },
                        select: {
                            rating: true
                        }
                    }
                },
                orderBy: {
                    createdAt: 'desc'
                }
            }),
            prisma.product.count({ where })
        ]);
        
        // Calculate average ratings and get available colors and sizes
        const productsWithDetails = products.map(product => {
            const ratings = product.ratings;
            const avgRating = ratings.length > 0 
                ? ratings.reduce((sum, rating) => sum + rating.rating, 0) / ratings.length 
                : 0;
            
            // Get unique colors and sizes from variants
            const availableColors = [...new Set(product.variants.map(v => v.color))];
            const availableSizes = [...new Set(product.variants.map(v => v.size))];
            const totalStock = product.variants.reduce((sum, v) => sum + v.stock, 0);
            
            return {
                ...product,
                avgRating: Math.round(avgRating * 10) / 10,
                totalRatings: ratings.length,
                availableColors,
                availableSizes,
                totalStock
            };
        });
        
        // Get available filters
        const availableColors = await prisma.productVariant.findMany({
            where: {
                product: {
                    status: 'ACTIVE',
                    ...(categoryId && { categoryId }),
                    ...(subcategoryId && { subcategoryId })
                }
            },
            distinct: ['color'],
            select: {
                color: true
            }
        });
        
        const availableSizes = await prisma.productVariant.findMany({
            where: {
                product: {
                    status: 'ACTIVE',
                    ...(categoryId && { categoryId }),
                    ...(subcategoryId && { subcategoryId })
                }
            },
            distinct: ['size'],
            select: {
                size: true
            }
        });
        
        return {
            products: productsWithDetails,
            filters: {
                colors: availableColors.map(c => c.color),
                sizes: availableSizes.map(s => s.size)
            },
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        };
    }

    // Get best seller products
    async getBestSellerProducts(limit = 8) {
        const where = {
            status: 'ACTIVE',
            isBestSeller: true
        };

        const include = {
            category: {
                select: {
                    id: true,
                    name: true,
                    image: true
                }
            },
            subcategory: {
                select: {
                    id: true,
                    name: true,
                    image: true
                }
            },
            productDetails: true,
            ratings: {
                where: {
                    isApproved: true
                },
                select: {
                    rating: true,
                    review: true
                }
            },
            variants: {
                include: {
                    variantImages: {
                        orderBy: {
                            isPrimary: 'desc'
                        }
                    }
                }
            }
        };
        // First get all best seller products
        const products = await prisma.product.findMany({
            where,
            include,
            orderBy: [
                {
                    isBestSeller: 'desc'
                },
                {
                    createdAt: 'desc'
                }
            ]
        });

        // Calculate sales count and average ratings
        const productsWithSalesAndRatings = products.map(product => {
            const totalSales = product.variants.reduce((sum, variant) => {
                return sum + variant.orderItems.reduce((itemSum, item) => itemSum + item.quantity, 0);
            }, 0);

            const ratings = product.ratings;
            const avgRating = ratings.length > 0 
                ? ratings.reduce((sum, rating) => sum + rating.rating, 0) / ratings.length 
                : 0;

            return {
                ...product,
                totalSales,
                avgRating: Math.round(avgRating * 10) / 10,
                totalRatings: ratings.length
            };
        });

        // Sort by total sales and take the limit
        return productsWithSalesAndRatings
            .sort((a, b) => b.totalSales - a.totalSales)
            .slice(0, limit);
    }


    // Get new arrivals
    async getNewArrivals(limit = 8) {
        const products = await prisma.product.findMany({
            where: {
                status: 'ACTIVE'
            },
            include: {
                category: {
                    select: {
                        id: true,
                        name: true
                    }
                },
                variants: {
                    include: {
                        variantImages: {
                            where: { isPrimary: true },
                            take: 1
                        }
                    }
                },
                ratings: {
                    where: {
                        isApproved: true
                    },
                    select: {
                        rating: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: limit
        });

        // Calculate average ratings
        const productsWithRatings = products.map(product => {
            const ratings = product.ratings;
            const avgRating = ratings.length > 0 
                ? ratings.reduce((sum, rating) => sum + rating.rating, 0) / ratings.length 
                : 0;

            return {
                ...product,
                avgRating: Math.round(avgRating * 10) / 10,
                totalRatings: ratings.length
            };
        });

        return productsWithRatings;
    }

    // Get related products
    async getRelatedProducts({ category, exclude, limit = 10 }) {
        try {
            logger.info(`Fetching related products - Category: ${category}, Exclude: ${exclude}, Limit: ${limit}`);
            
            // Validate inputs
            if (!category || !exclude) {
                throw new Error('Category and exclude parameters are required');
            }

            const where = {
                category: {
                    name: {
                        equals: category,
                        mode: 'insensitive'
                    }
                },
                id: {
                    not: exclude
                },
                status: 'ACTIVE' // Only show active products
            };

            const include = {
                category: {
                    select: {
                        id: true,
                        name: true,
                        image: true
                    }
                },
                subcategory: {
                    select: {
                        id: true,
                        name: true,
                        image: true
                    }
                },
                productDetails: true,
                ratings: {
                    where: {
                        isApproved: true
                    },
                    select: {
                        rating: true
                    }
                },
                variants: {
                    where: {
                        stock: {
                            gt: 0 // Only include variants with stock
                        }
                    },
                    include: {
                        variantImages: {
                            orderBy: {
                                isPrimary: 'desc'
                            }
                        }
                    }
                }
            };

            const relatedProducts = await prisma.product.findMany({
                where,
                take: parseInt(limit),
                include,
                orderBy: {
                    createdAt: 'desc' // Show newest first
                }
            });

            logger.info(`Found ${relatedProducts.length} related products`);

            // Calculate average ratings and format response
            const formattedProducts = relatedProducts.map(product => {
                const ratings = product.ratings;
                const avgRating = ratings.length > 0 
                    ? ratings.reduce((sum, rating) => sum + rating.rating, 0) / ratings.length 
                    : 0;

                return {
                    ...product,
                    avgRating: Math.round(avgRating * 10) / 10,
                    totalRatings: ratings.length
                };
            });

            return formattedProducts;
            
        } catch (error) {
            logger.error('Error in getRelatedProducts:', error);
            throw error;
        }
    } 

    // Add this method to your ProductService class
    async toggleProductStatus(productId, status) {
    const product = await prisma.product.findUnique({
        where: { id: productId }
    });
    
    if (!product) {
        throw new Error('Product not found');
    }
    
    // Validate status
    const validStatuses = ['ACTIVE', 'INACTIVE', 'OUT_OF_STOCK', 'DISCONTINUED'];
    if (!validStatuses.includes(status)) {
        throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }
    
    const updatedProduct = await prisma.product.update({
        where: { id: productId },
        data: {
        status: status,
        updatedAt: new Date()
        },
        include: {
        category: {
            select: {
            id: true,
            name: true
            }
        },
        subcategory: {
            select: {
            id: true,
            name: true
            }
        },
        variants: {
            include: {
            variantImages: {
                orderBy: {
                isPrimary: 'desc'
                }
            }
            }
        }
        }
    });
    
    logger.info(`Product status updated: ${productId}, status: ${status}`);
    return updatedProduct;
    }

    // Toggle best seller status
    async toggleBestSeller(productId, isBestSeller) {
    const product = await prisma.product.findUnique({
        where: { id: productId }
    });
    
    if (!product) {
        throw new Error('Product not found');
    }
    
    const updatedProduct = await prisma.product.update({
        where: { id: productId },
        data: {
        isBestSeller: Boolean(isBestSeller),
        updatedAt: new Date()
        },
        include: {
        category: {
            select: {
            id: true,
            name: true
            }
        },
        subcategory: {
            select: {
            id: true,
            name: true
            }
        },
        variants: {
            include: {
            variantImages: {
                orderBy: {
                isPrimary: 'desc'
                }
            }
            }
        }
        }
    });
    
    logger.info(`Product best seller status updated: ${productId}, isBestSeller: ${isBestSeller}`);
    return updatedProduct;
    }

    // Toggle new arrival status
    async toggleNewArrival(productId, isNewArrival) {
    const product = await prisma.product.findUnique({
        where: { id: productId }
    });
    
    if (!product) {
        throw new Error('Product not found');
    }
    
    const updatedProduct = await prisma.product.update({
        where: { id: productId },
        data: {
        isNewArrival: Boolean(isNewArrival),
        updatedAt: new Date()
        },
        include: {
        category: {
            select: {
            id: true,
            name: true
            }
        },
        subcategory: {
            select: {
            id: true,
            name: true
            }
        },
        variants: {
            include: {
            variantImages: {
                orderBy: {
                isPrimary: 'desc'
                }
            }
            }
        }
        }
    });
    
    logger.info(`Product new arrival status updated: ${productId}, isNewArrival: ${isNewArrival}`);
    return updatedProduct;
    }

    // Toggle featured status
    async toggleFeatured(productId, featured) {
    const product = await prisma.product.findUnique({
        where: { id: productId }
    });
    
    if (!product) {
        throw new Error('Product not found');
    }
    
    const updatedProduct = await prisma.product.update({
        where: { id: productId },
        data: {
        featured: Boolean(featured),
        updatedAt: new Date()
        },
        include: {
        category: {
            select: {
            id: true,
            name: true
            }
        },
        subcategory: {
            select: {
            id: true,
            name: true
            }
        },
        variants: {
            include: {
            variantImages: {
                orderBy: {
                isPrimary: 'desc'
                }
            }
            }
        }
        }
    });
    
    logger.info(`Product featured status updated: ${productId}, featured: ${featured}`);
    return updatedProduct;
    }

    // Get best seller products (UPDATED: Using the flag)
    async getBestSellerProducts(limit = 8, includeVariants = true) {
        const where = {
            status: 'ACTIVE',
            isBestSeller: true
        };

        const include = {
            category: {
                select: {
                    id: true,
                    name: true,
                    image: true
                }
            },
            subcategory: {
                select: {
                    id: true,
                    name: true,
                    image: true
                }
            },
            productDetails: true,
            ratings: {
                where: {
                    isApproved: true
                },
                select: {
                    rating: true,
                    review: true
                }
            }
        };

        // Only include variants if requested
        if (includeVariants) {
            include.variants = {
                include: {
                    variantImages: {
                        orderBy: {
                            isPrimary: 'desc'
                        }
                    },
                    orderItems: {
                        select: {
                            quantity: true
                        }
                    }
                }
            };
        }

        // First get all best seller products
        const products = await prisma.product.findMany({
            where,
            include,
            orderBy: [
                {
                    isBestSeller: 'desc'
                },
                {
                    createdAt: 'desc'
                }
            ]
        });

        // Calculate sales count and average ratings
        const productsWithSalesAndRatings = products.map(product => {
            let totalSales = 0;
            
            // Only calculate sales if variants are included
            if (includeVariants && product.variants) {
                totalSales = product.variants.reduce((sum, variant) => {
                    return sum + (variant.orderItems?.reduce((itemSum, item) => itemSum + item.quantity, 0) || 0);
                }, 0);
            }

            const ratings = product.ratings;
            const avgRating = ratings.length > 0 
                ? ratings.reduce((sum, rating) => sum + rating.rating, 0) / ratings.length 
                : 0;

            return {
                ...product,
                totalSales,
                avgRating: Math.round(avgRating * 10) / 10,
                totalRatings: ratings.length
            };
        });

        // Sort by total sales and take the limit
        return productsWithSalesAndRatings
            .sort((a, b) => b.totalSales - a.totalSales)
            .slice(0, limit);
    }

    // Get new arrivals (UPDATED: Using the flag)
    async getNewArrivals(limit = 8) {
            const products = await prisma.product.findMany({
                where: {
                    status: 'ACTIVE',
                    isNewArrival: true
                },
                include: {
                    category: {
                        select: {
                            id: true,
                            name: true,
                            image: true
                        }
                    },
                    subcategory: {
                        select: {
                            id: true,
                            name: true,
                            image: true
                        }
                    },
                    variants: {
                        include: {
                            variantImages: {
                                orderBy: {
                                    isPrimary: 'desc'
                                }
                            }
                        }
                    },
                    ratings: {
                        where: {
                            isApproved: true
                        },
                        select: {
                            rating: true
                        }
                    }
                },
                orderBy: {
                    createdAt: 'desc'
                },
                take: limit
            });

            // Calculate average ratings
            const productsWithRatings = products.map(product => {
                const ratings = product.ratings;
                const avgRating = ratings.length > 0 
                    ? ratings.reduce((sum, rating) => sum + rating.rating, 0) / ratings.length 
                    : 0;

                return {
                    ...product,
                    avgRating: Math.round(avgRating * 10) / 10,
                    totalRatings: ratings.length
                };
            });

            return productsWithRatings;
    }


    // Get featured products
    async getFeaturedProducts(limit = 8) {
        const products = await prisma.product.findMany({
            where: {
                status: 'ACTIVE',
                featured: true
            },
            include: {
                category: {
                    select: {
                        id: true,
                        name: true,
                        image: true
                    }
                },
                subcategory: {
                    select: {
                        id: true,
                        name: true,
                        image: true
                    }
                },
                variants: {
                    include: {
                        variantImages: {
                            orderBy: {
                                isPrimary: 'desc'
                            }
                        }
                    }
                },
                ratings: {
                    where: {
                        isApproved: true
                    },
                    select: {
                        rating: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: limit
        });

        // Calculate average ratings
        const productsWithRatings = products.map(product => {
            const ratings = product.ratings;
            const avgRating = ratings.length > 0 
                ? ratings.reduce((sum, rating) => sum + rating.rating, 0) / ratings.length 
                : 0;

            return {
                ...product,
                avgRating: Math.round(avgRating * 10) / 10,
                totalRatings: ratings.length
            };
        });

        return productsWithRatings;
    }

    // Auto-mark products as new arrivals (products created in last 30 days)
    async autoMarkNewArrivals() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Mark products created in last 30 days as new arrivals
    await prisma.product.updateMany({
        where: {
        createdAt: {
            gte: thirtyDaysAgo
        },
        status: 'ACTIVE'
        },
        data: {
        isNewArrival: true
        }
    });

    // Unmark products older than 30 days
    await prisma.product.updateMany({
        where: {
        createdAt: {
            lt: thirtyDaysAgo
        }
        },
        data: {
        isNewArrival: false
        }
    });

    logger.info('Auto-marked new arrivals based on creation date');
    }

    // Auto-update best sellers based on sales
    async autoUpdateBestSellers() {
    // Get products with highest sales in last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const bestSellingProducts = await prisma.product.findMany({
        where: {
        status: 'ACTIVE',
        orderItems: {
            some: {
            order: {
                createdAt: {
                gte: thirtyDaysAgo
                },
                paymentStatus: 'PAID'
            }
            }
        }
        },
        include: {
        orderItems: {
            where: {
            order: {
                createdAt: {
                gte: thirtyDaysAgo
                },
                paymentStatus: 'PAID'
            }
            },
            select: {
            quantity: true
            }
        }
        }
    });

    // Calculate total sales for each product
    const productsWithSales = bestSellingProducts.map(product => ({
        ...product,
        totalSales: product.orderItems.reduce((sum, item) => sum + item.quantity, 0)
    }));

    // Sort by sales and take top 20
    const topProducts = productsWithSales
        .sort((a, b) => b.totalSales - a.totalSales)
        .slice(0, 20);

    // Reset all best sellers
    await prisma.product.updateMany({
        where: {
        isBestSeller: true
        },
        data: {
        isBestSeller: false
        }
    });

    // Mark top products as best sellers
    if (topProducts.length > 0) {
        await prisma.product.updateMany({
        where: {
            id: {
            in: topProducts.map(p => p.id)
            }
        },
        data: {
            isBestSeller: true
        }
        });
    }

    logger.info(`Auto-updated best sellers: ${topProducts.length} products marked as best sellers`);
    }

    // Add this method to your ProductService class
    async addProductDetails(productId, productDetails) {
    const product = await prisma.product.findUnique({
        where: { id: productId },
        include: { productDetails: true }
    });
    
    if (!product) {
        throw new Error('Product not found');
    }
    
    // Validate productDetails array
    if (!Array.isArray(productDetails) || productDetails.length === 0) {
        throw new Error('Product details must be a non-empty array');
    }
    
    // Prepare product details data
    const productDetailsData = productDetails.map(detail => ({
        title: detail.title,
        description: detail.description,
        productId: productId
    }));
    
    // Create product details
    const createdDetails = await prisma.productDetail.createMany({
        data: productDetailsData
    });
    
    // Fetch the updated product with all details
    const updatedProduct = await prisma.product.findUnique({
        where: { id: productId },
        include: {
        category: {
            select: {
            id: true,
            name: true
            }
        },
        subcategory: {
            select: {
            id: true,
            name: true
            }
        },
        productDetails: true,
        variants: {
            include: {
            variantImages: {
                orderBy: {
                isPrimary: 'desc'
                }
            }
            }
        }
        }
    });
    
    logger.info(`Product details added: ${productId}, count: ${createdDetails.count}`);
    return updatedProduct;
    }

    // Update product details
    async updateProductDetail(productId, detailId, updateData) {
    const productDetail = await prisma.productDetail.findFirst({
        where: {
        id: detailId,
        productId: productId
        }
    });
    
    if (!productDetail) {
        throw new Error('Product detail not found');
    }
    
    // Validate update data
    if (!updateData.title && !updateData.description) {
        throw new Error('At least title or description must be provided');
    }
    
    const updatedDetail = await prisma.productDetail.update({
        where: { id: detailId },
        data: {
        title: updateData.title ? updateData.title.trim() : undefined,
        description: updateData.description ? updateData.description.trim() : undefined,
        updatedAt: new Date()
        }
    });
    
    logger.info(`Product detail updated: ${detailId} for product: ${productId}`);
    return updatedDetail;
    }

    // Get product details
    async getProductDetails(productId) {
    const product = await prisma.product.findUnique({
        where: { id: productId },
        include: {
        productDetails: {
            orderBy: {
            createdAt: 'asc'
            }
        }
        }
    });
    
    if (!product) {
        throw new Error('Product not found');
    }
    
    return product.productDetails;
    }

    // Delete product detail
    async deleteProductDetail(productId, detailId) {
    const productDetail = await prisma.productDetail.findFirst({
        where: {
        id: detailId,
        productId: productId
        }
    });
    
    if (!productDetail) {
        throw new Error('Product detail not found');
    }
    
    await prisma.productDetail.delete({
        where: { id: detailId }
    });
    
    logger.info(`Product detail deleted: ${detailId} from product: ${productId}`);
    
    // Return updated product details
    return this.getProductDetails(productId);
    }

}

export default new ProductService();