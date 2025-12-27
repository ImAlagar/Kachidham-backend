import { productService } from '../services/index.js';
import { asyncHandler } from '../utils/helpers.js';
import logger from '../utils/logger.js';

// Get all products
export const getAllProducts = asyncHandler(async (req, res) => {
  const { 
    page = 1, 
    limit = 10, 
    categoryId, 
    subcategoryId, 
    status,
    search,
    minPrice,
    maxPrice,
    includeVariants 
  } = req.query;
  
  const result = await productService.getAllProducts({
    page: parseInt(page),
    limit: parseInt(limit),
    categoryId,
    subcategoryId,
    status,
    search,
    minPrice: minPrice ? parseFloat(minPrice) : undefined,
    maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
    includeVariants: includeVariants === 'true'
  });
  
  res.status(200).json({
    success: true,
    data: result
  });
});

// Get product by ID
export const getProductById = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { includeVariants } = req.query;
  
  if (!productId) {
    return res.status(400).json({
      success: false,
      message: 'Product ID is required'
    });
  }

  const product = await productService.getProductById(
    productId, 
    includeVariants === 'true'
  );
  
  if (!product) {
    return res.status(404).json({
      success: false,
      message: 'Product not found'
    });
  }
  
  res.status(200).json({
    success: true,
    data: product
  });
});

// Get product by product code
export const getProductByCode = asyncHandler(async (req, res) => {
  const { productCode } = req.params;
  const { includeVariants } = req.query;
  
  const product = await productService.getProductByCode(
    productCode, 
    includeVariants === 'true'
  );
  
  res.status(200).json({
    success: true,
    data: product
  });
});

export const createProduct = asyncHandler(async (req, res) => {
  const productData = req.body;
  const files = req.files || [];
  
  // Extract variantColors from body if present
  const variantColors = productData.variantColors;
  if (variantColors) {
    // Remove variantColors from productData to avoid validation issues
    delete productData.variantColors;
  }

  try {
    const product = await productService.createProduct(productData, files, variantColors);
    
    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: product
    });
  } catch (error) {
    console.error('Error in createProduct controller:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// Update product (Admin only)
export const updateProduct = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const updateData = req.body;
  const files = req.files || [];
  

  
  // Extract variantColors from body if present
  const variantColors = updateData.variantColors;
  if (variantColors) {
    delete updateData.variantColors;
  }

  // Parse JSON fields
  try {
    if (updateData.productDetails && typeof updateData.productDetails === 'string') {
      updateData.productDetails = JSON.parse(updateData.productDetails);
    }
    
    // ✅ FIX: Parse variants if it's a string
    if (updateData.variants && typeof updateData.variants === 'string') {
      updateData.variants = JSON.parse(updateData.variants);
    }
  } catch (error) {
    logger.error('JSON parsing error:', error);
    return res.status(400).json({
      success: false,
      message: 'Invalid JSON format in productDetails or variants field'
    });
  }
  

  try {
    const updatedProduct = await productService.updateProduct(
      productId, 
      updateData, 
      files,
      variantColors // ✅ PASS variantColors to service
    );
    
    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      data: updatedProduct
    });
  } catch (error) {
    logger.error('Error updating product:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// Delete product (Admin only)
export const deleteProduct = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  
  await productService.deleteProduct(productId);
  
  res.status(200).json({
    success: true,
    message: 'Product deleted successfully'
  });
});

// Add product details (Admin only)
export const addProductDetails = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { details } = req.body;
  
  if (!details || !Array.isArray(details)) {
    return res.status(400).json({
      success: false,
      message: 'Details array is required'
    });
  }
  
  const productDetails = await productService.addProductDetails(productId, details);
  
  res.status(200).json({
    success: true,
    message: 'Product details added successfully',
    data: productDetails
  });
});

// Update product detail (Admin only)
export const updateProductDetail = asyncHandler(async (req, res) => {
  const { productId, detailId } = req.params;
  const updateData = req.body;
  
  const updatedDetail = await productService.updateProductDetail(
    productId,
    detailId, 
    updateData
  );
  
  res.status(200).json({
    success: true,
    message: 'Product detail updated successfully',
    data: updatedDetail
  });
});

// Update ALL product details for a product (Admin only)
export const updateProductDetails = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { productDetails } = req.body;
  
  const updatedProduct = await productService.updateProductDetails(
    productId, 
    productDetails
  );
  
  res.status(200).json({
    success: true,
    message: 'All product details updated successfully',
    data: updatedProduct
  });
});

// Remove product detail (Admin only)
export const removeProductDetail = asyncHandler(async (req, res) => {
  const { productId, detailId } = req.params;
  
  await productService.deleteProductDetail(productId, detailId);
  
  res.status(200).json({
    success: true,
    message: 'Product detail removed successfully'
  });
});

// Toggle product status (Admin only)
export const toggleProductStatus = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { status } = req.body;
  
  if (!status) {
    return res.status(400).json({
      success: false,
      message: 'Status is required'
    });
  }
  
  const updatedProduct = await productService.toggleProductStatus(
    productId, 
    status
  );
  
  res.status(200).json({
    success: true,
    message: `Product ${status.toLowerCase()} successfully`,
    data: updatedProduct
  });
});

// Add product images (Admin only)
export const addProductImages = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const files = req.files || [];
  
  if (files.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'At least one image is required'
    });
  }
  
  const updatedProduct = await productService.addProductImages(productId, files);
  
  res.status(200).json({
    success: true,
    message: 'Product images added successfully',
    data: updatedProduct
  });
});

// Remove product image (Admin only)
export const removeProductImage = asyncHandler(async (req, res) => {
  const { productId, imageId } = req.params;
  
  const updatedProduct = await productService.removeProductImage(productId, imageId);
  
  res.status(200).json({
    success: true,
    message: 'Product image removed successfully',
    data: updatedProduct
  });
});

// Set primary product image (Admin only)
export const setPrimaryProductImage = asyncHandler(async (req, res) => {
  const { productId, imageId } = req.params;
  
  const updatedProduct = await productService.setPrimaryProductImage(
    productId, 
    imageId
  );
  
  res.status(200).json({
    success: true,
    message: 'Primary product image set successfully',
    data: updatedProduct
  });
});

// Add product variant (Admin only)
// In your productController.js - update the addProductVariant handler
export const addProductVariant = asyncHandler(async (req, res) => {
    const { productId } = req.params;
    
    // Parse FormData fields
    const color = req.body.color;
    const sizes = JSON.parse(req.body.sizes || '[]');
    const files = req.files || [];

    if (!color || !Array.isArray(sizes) || sizes.length === 0) {
        return res.status(400).json({
            success: false,
            message: 'Color and valid sizes array are required'
        });
    }

    const variantData = {
        color,
        sizes
    };

    const updatedProduct = await productService.addProductVariant(
        productId, 
        variantData, 
        files
    );

    res.status(201).json({
        success: true,
        message: 'Product variants added successfully',
        data: updatedProduct
    });
});

// Update product variant (Admin only)
export const updateProductVariant = asyncHandler(async (req, res) => {
  const { productId, variantId } = req.params;
  const variantData = req.body;
  const files = req.files || [];
  
  const updatedProduct = await productService.updateProductVariant(
    productId,
    variantId, 
    variantData, 
    files
  );
  
  res.status(200).json({
    success: true,
    message: 'Product variant updated successfully',
    data: updatedProduct
  });
});

// Remove product variant (Admin only)
export const removeProductVariant = asyncHandler(async (req, res) => {
  const { productId, variantId } = req.params;
  
  const updatedProduct = await productService.removeProductVariant(
    productId, 
    variantId
  );
  
  res.status(200).json({
    success: true,
    message: 'Product variant removed successfully',
    data: updatedProduct
  });
});

// Add variant images (Admin only)
export const addVariantImages = asyncHandler(async (req, res) => {
  const { productId, variantId } = req.params;
  const files = req.files || [];
  
  if (files.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'At least one image is required'
    });
  }
  
  const updatedProduct = await productService.addVariantImages(
    productId,
    variantId, 
    files
  );
  
  res.status(200).json({
    success: true,
    message: 'Variant images added successfully',
    data: updatedProduct
  });
});

// Remove variant image (Admin only)
export const removeVariantImage = asyncHandler(async (req, res) => {
  const { productId, variantId, imageId } = req.params;
  
  const updatedProduct = await productService.removeVariantImage(
    productId,
    variantId, 
    imageId
  );
  
  res.status(200).json({
    success: true,
    message: 'Variant image removed successfully',
    data: updatedProduct
  });
});

// Set primary variant image (Admin only)
export const setPrimaryVariantImage = asyncHandler(async (req, res) => {
  const { productId, variantId, imageId } = req.params;
  
  const updatedProduct = await productService.setPrimaryVariantImage(
    productId,
    variantId, 
    imageId
  );
  
  res.status(200).json({
    success: true,
    message: 'Primary variant image set successfully',
    data: updatedProduct
  });
});

// Update variant stock (Admin only)
export const updateVariantStock = asyncHandler(async (req, res) => {
  const { productId, variantId } = req.params;
  const { stock } = req.body;
  
  if (stock === undefined || stock === null) {
    return res.status(400).json({
      success: false,
      message: 'Stock is required'
    });
  }
  
  const updatedVariant = await productService.updateVariantStock(
    productId,
    variantId, 
    parseInt(stock)
  );
  
  res.status(200).json({
    success: true,
    message: 'Variant stock updated successfully',
    data: updatedVariant
  });
});

// Get product statistics (Admin only)
export const getProductStats = asyncHandler(async (req, res) => {
  const stats = await productService.getProductStats();
  
  res.status(200).json({
    success: true,
    data: stats
  });
});

// Search products
export const searchProducts = asyncHandler(async (req, res) => {
  const { 
    query, 
    categoryId, 
    subcategoryId,
    minPrice,
    maxPrice,
    colors,
    sizes,
    page = 1,
    limit = 12
  } = req.query;
  
  const result = await productService.searchProducts({
    query,
    categoryId,
    subcategoryId,
    minPrice: minPrice ? parseFloat(minPrice) : undefined,
    maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
    colors: colors ? colors.split(',') : [],
    sizes: sizes ? sizes.split(',') : [],
    page: parseInt(page),
    limit: parseInt(limit)
  });
  
  res.status(200).json({
    success: true,
    data: result
  });
});


// Toggle best seller status (Admin only)
export const toggleBestSeller = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { isBestSeller } = req.body;
  
  if (isBestSeller === undefined) {
    return res.status(400).json({
      success: false,
      message: 'isBestSeller field is required'
    });
  }
  
  const updatedProduct = await productService.toggleBestSeller(
    productId, 
    isBestSeller
  );
  
  res.status(200).json({
    success: true,
    message: `Product ${isBestSeller ? 'marked as' : 'removed from'} best seller`,
    data: updatedProduct
  });
});

// Toggle new arrival status (Admin only)
export const toggleNewArrival = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { isNewArrival } = req.body;
  
  if (isNewArrival === undefined) {
    return res.status(400).json({
      success: false,
      message: 'isNewArrival field is required'
    });
  }
  
  const updatedProduct = await productService.toggleNewArrival(
    productId, 
    isNewArrival
  );
  
  res.status(200).json({
    success: true,
    message: `Product ${isNewArrival ? 'marked as' : 'removed from'} new arrival`,
    data: updatedProduct
  });
});

// Toggle featured status (Admin only)
export const toggleFeatured = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { featured } = req.body;
  
  if (featured === undefined) {
    return res.status(400).json({
      success: false,
      message: 'featured field is required'
    });
  }
  
  const updatedProduct = await productService.toggleFeatured(
    productId, 
    featured
  );
  
  res.status(200).json({
    success: true,
    message: `Product ${featured ? 'marked as' : 'removed from'} featured`,
    data: updatedProduct
  });
});

// Get related products
export const getRelatedProducts = asyncHandler(async (req, res) => {
    const { category, exclude, limit = 10 } = req.query;
    
    logger.info(`Related products request - Category: ${category}, Exclude: ${exclude}, Limit: ${limit}`);

    // Validate required parameters
    if (!category) {
        return res.status(400).json({
            success: false,
            message: 'Category parameter is required'
        });
    }

    if (!exclude) {
        return res.status(400).json({
            success: false,
            message: 'Exclude parameter (product ID) is required'
        });
    }

    try {
        const relatedProducts = await productService.getRelatedProducts({
            category,
            exclude,
            limit: parseInt(limit)
        });

        res.status(200).json({
            success: true,
            data: relatedProducts,
            count: relatedProducts.length
        });
        
    } catch (error) {
        logger.error('Error in getRelatedProducts controller:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching related products',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Get best seller products
  export const getBestSellers = asyncHandler(async (req, res) => {
    const { 
      limit = 8,
      includeVariants = 'true' // ← Add this parameter with default value
    } = req.query;
    
    const products = await productService.getBestSellerProducts(
      parseInt(limit),
      includeVariants === 'true' // ← Pass it to service
    );
    
    res.status(200).json({
      success: true,
      data: products
    });
  });

  // Get new arrivals
  export const getNewArrivals = asyncHandler(async (req, res) => {
      const { limit = 8 } = req.query;
      
      const products = await productService.getNewArrivals(parseInt(limit));
      
      res.status(200).json({
          success: true,
          data: products
      });
  });

  // Get featured products
  export const getFeaturedProducts = asyncHandler(async (req, res) => {
      const { limit = 8 } = req.query;
      
      const products = await productService.getFeaturedProducts(parseInt(limit));
      
      res.status(200).json({
          success: true,
          data: products
      });
  });

  // Auto update merchandising flags (Admin only - can be called via cron job)
  export const autoUpdateMerchandising = asyncHandler(async (req, res) => {
    await productService.autoMarkNewArrivals();
    await productService.autoUpdateBestSellers();
    
    res.status(200).json({
      success: true,
      message: 'Merchandising flags updated automatically'
    });
  });


// Calculate price for specific quantity
export const calculateQuantityPrice = asyncHandler(async (req, res) => {
    try {
        const { productId } = req.params;
        const { quantity } = req.body;


        // Validate input
        if (!productId || !productId.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Product ID is required'
            });
        }

        if (!quantity || quantity < 1) {
            return res.status(400).json({
                success: false,
                message: 'Valid quantity (minimum 1) is required'
            });
        }

        const numericQuantity = parseInt(quantity);
        if (isNaN(numericQuantity)) {
            return res.status(400).json({
                success: false,
                message: 'Quantity must be a valid number'
            });
        }

        // Calculate the price
        const priceCalculation = await productService.calculateQuantityPrice(
            productId.trim(), // Trim any whitespace
            numericQuantity
        );

        res.status(200).json({
            success: true,
            data: priceCalculation
        });

    } catch (error) {
        console.error('Error in calculateQuantityPrice controller:', error);
        
        if (error.message.includes('Product not found')) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        if (error.message.includes('Valid product ID')) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        res.status(500).json({
            success: false,
            message: 'Failed to calculate quantity price',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

  // Get products with quantity offers in a subcategory
  export const getProductsWithQuantityOffers = asyncHandler(async (req, res) => {
    const { subcategoryId } = req.params;
    const { limit = 10 } = req.query;

    const products = await productService.getProductsWithQuantityOffers(
      subcategoryId,
      parseInt(limit)
    );

    res.status(200).json({
      success: true,
      data: products
    });
  });

  // Calculate prices for cart items
  export const calculateCartPrices = asyncHandler(async (req, res) => {
    const { items } = req.body;

    if (!items || !Array.isArray(items)) {
      return res.status(400).json({
        success: false,
        message: 'Items array is required'
      });
    }

    const cartCalculation = await productService.calculateCartPrices(items);

    res.status(200).json({
      success: true,
      data: cartCalculation
    });
  });

  // Get all subcategories with quantity pricing
  export const getAllSubcategoriesWithPricing = asyncHandler(async (req, res) => {
    const subcategories = await productService.getSubcategoriesWithQuantityPricing();

    res.status(200).json({
      success: true,
      data: subcategories
    });
  });