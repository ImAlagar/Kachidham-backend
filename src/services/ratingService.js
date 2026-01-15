import prisma from "../config/database.js";
import logger from "../utils/logger.js";
import s3UploadService from "./s3UploadService.js";

class RatingService {

async getAllRatings({ page, limit, isApproved, productId, userId }) {
  const skip = (page - 1) * limit;

  const where = {};

  if (isApproved !== undefined) {
    where.isApproved = isApproved === "true";
  }

  if (productId) {
    where.productId = productId;
  }

  if (userId) {
    where.userId = userId;
  }

  const [ratings, total] = await Promise.all([
    prisma.rating.findMany({
      where,
      skip,
      take: limit,
      include: {
        images: { // ADD THIS
          orderBy: {
            order: "asc",
          },
        },
        product: {
          select: {
            id: true,
            name: true,
            productCode: true,
            normalPrice: true,
            offerPrice: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    }),
    prisma.rating.count({ where }),
  ]);

  return {
    ratings,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
}
  // Get rating by ID
  async getRatingById(ratingId) {
    const rating = await prisma.rating.findUnique({
      where: { id: ratingId },
      include: {
        images: {
          orderBy: {
            order: "asc",
          },
        },
        product: {
          select: {
            id: true,
            name: true,
            productCode: true,
            normalPrice: true,
            offerPrice: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!rating) {
      throw new Error("Rating not found");
    }

    return rating;
  }

  async createRating(ratingData, userId, files = []) {
    const { productId, rating, title, review } = ratingData;
    // Validate required fields
    if (!productId || !rating) {
      throw new Error("Product ID and rating are required");
    }

    // Validate rating range
    if (rating < 1 || rating > 5) {
      throw new Error("Rating must be between 1 and 5");
    }

    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, name: true },
    });

    if (!product) {
      throw new Error("Product not found");
    }

    // Check if user has already rated this product
    const existingRating = await prisma.rating.findFirst({
      where: {
        productId,
        userId,
      },
    });

    if (existingRating) {
      throw new Error("You have already rated this product");
    }

    // Get user details for the rating
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });

    if (!user) {
      throw new Error("User not found");
    }

    // Validate number of files
    if (files && files.length > 5) {
      throw new Error("Maximum 5 images allowed per review");
    }

    // Use transaction to ensure both rating and images are created
    const newRating = await prisma.$transaction(async (tx) => {
      // Create rating first
      const ratingRecord = await tx.rating.create({
        data: {
          productId,
          userId,
          userName: user.name,
          userEmail: user.email,
          rating: parseInt(rating),
          title: title || null,
          review: review || null,
          isApproved: false,
        },
      });


      // Upload and create rating images if provided
      let ratingImages = [];
      if (files && files.length > 0) {
        
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          
          try {
            // Test if file buffer exists
            if (!file.buffer) {
              console.error(`DEBUG - File ${i + 1} has no buffer!`);
              continue;
            }

            const uploadResult = await this.uploadReviewImage(
              file.buffer,
              productId,
              userId,
              i + 1
            );


            // Create rating image record
            const ratingImage = await tx.ratingImage.create({
              data: {
                ratingId: ratingRecord.id,
                imageUrl: uploadResult.url,
                imagePublicId: uploadResult.key,
                order: i,
              },
            });

            ratingImages.push(ratingImage);
          } catch (uploadError) {
            console.error(`DEBUG - Failed to upload image ${i + 1}:`, uploadError.message);
            logger.error(`Failed to upload image ${i + 1}:`, uploadError);
            // Continue with other images if one fails
          }
        }
      } else {
        console.error('DEBUG - No files to process');
      }

      // Fetch the complete rating with images
      const completeRating = await tx.rating.findUnique({
        where: { id: ratingRecord.id },
        include: {
          images: {
            orderBy: {
              order: "asc",
            },
          },
          product: {
            select: {
              id: true,
              name: true,
              productCode: true,
            },
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      return completeRating;
    });

    logger.info(
      `Rating created: ${newRating.id} for product: ${productId} with ${newRating.images.length} images`
    );
    return newRating;
  }

  // Upload review image to S3 - SINGLE METHOD VERSION
  async uploadReviewImage(buffer, productId, userId, imageNumber = 1) {
    try {
      const timestamp = Date.now();
      const fileName = `reviews/product-${productId}/user-${userId}/${timestamp}-${imageNumber}.jpg`;

      return await s3UploadService.uploadImage(
        buffer, 
        '', 
        fileName,
        'image/jpeg'
      );
    } catch (error) {
      logger.error("Review image upload failed", {
        productId,
        userId,
        imageNumber,
        error: error.message,
      });
      throw new Error(`Review image upload failed: ${error.message}`);
    }
  }

  async updateRating(ratingId, updateData, userId, files = null) {
    const rating = await prisma.rating.findUnique({
      where: { id: ratingId },
      include: {
        images: true,
      },
    });

    if (!rating) {
      throw new Error("Rating not found");
    }

    // Check if user owns this rating or is admin
    if (rating.userId !== userId) {
      throw new Error("You can only update your own ratings");
    }

    const { rating: newRatingValue, title, review } = updateData;

    // Validate rating range if provided
    if (newRatingValue && (newRatingValue < 1 || newRatingValue > 5)) {
      throw new Error("Rating must be between 1 and 5");
    }

    return await prisma.$transaction(async (tx) => {
      // Update rating
      const updatedRating = await tx.rating.update({
        where: { id: ratingId },
        data: {
          ...(newRatingValue && { rating: parseInt(newRatingValue) }),
          ...(title !== undefined && { title }),
          ...(review !== undefined && { review }),
          updatedAt: new Date(),
        },
      });

      // Handle new images if provided
      if (files && files.length > 0) {
        // Validate number of files
        if (rating.images.length + files.length > 5) {
          throw new Error("Maximum 5 images allowed per review");
        }

        // Delete existing images from S3
        for (const image of rating.images) {
          try {
            await s3UploadService.deleteImage(image.imagePublicId);
          } catch (error) {
            logger.error("Failed to delete old image:", error);
          }
        }

        // Delete existing image records
        await tx.ratingImage.deleteMany({
          where: { ratingId },
        });

        // Upload and create new images
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          try {
            const uploadResult = await this.uploadReviewImage(
              file.buffer,
              rating.productId,
              rating.userId,
              i + 1
            );

            await tx.ratingImage.create({
              data: {
                ratingId: ratingId,
                imageUrl: uploadResult.url,
                imagePublicId: uploadResult.key,
                order: i,
              },
            });
          } catch (uploadError) {
            logger.error(`Failed to upload image ${i + 1}:`, uploadError);
          }
        }
      }

      // Fetch the complete updated rating
      const completeRating = await tx.rating.findUnique({
        where: { id: ratingId },
        include: {
          images: {
            orderBy: {
              order: "asc",
            },
          },
          product: {
            select: {
              id: true,
              name: true,
              productCode: true,
            },
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      return completeRating;
    });
  }

  // Delete rating with image cleanup
  async deleteRating(ratingId, userId, userRole) {
    const rating = await prisma.rating.findUnique({
      where: { id: ratingId },
      include: {
        images: true,
      },
    });

    if (!rating) {
      throw new Error("Rating not found");
    }

    // Check if user owns this rating or is admin
    if (rating.userId !== userId && userRole !== "ADMIN") {
      throw new Error("You can only delete your own ratings");
    }

    // Delete all images from S3
    for (const image of rating.images) {
      try {
        await s3UploadService.deleteImage(image.imagePublicId);
      } catch (error) {
        logger.error("Failed to delete review image:", error);
      }
    }

    // Delete rating (cascade will delete rating images)
    await prisma.rating.delete({
      where: { id: ratingId },
    });

    logger.info(`Rating deleted: ${ratingId}`);
  }

  // Toggle rating approval status (Admin only)
  async toggleRatingApproval(ratingId, isApproved) {
    const rating = await prisma.rating.findUnique({
      where: { id: ratingId },
    });

    if (!rating) {
      throw new Error("Rating not found");
    }

    const approvalStatus = isApproved === true || isApproved === "true";

    const updatedRating = await prisma.rating.update({
      where: { id: ratingId },
      data: {
        isApproved: approvalStatus,
        updatedAt: new Date(),
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            productCode: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    logger.info(
      `Rating approval updated: ${ratingId} -> ${
        approvalStatus ? "approved" : "unapproved"
      }`
    );
    return updatedRating;
  }

  // Get rating statistics (Admin only)
  async getRatingStats() {
    const [
      totalRatings,
      approvedRatings,
      pendingRatings,
      averageRating,
      ratingsByProduct,
      ratingsByUser,
      ratingsWithImages,
    ] = await Promise.all([
      prisma.rating.count(),
      prisma.rating.count({ where: { isApproved: true } }),
      prisma.rating.count({ where: { isApproved: false } }),
      prisma.rating.aggregate({
        _avg: {
          rating: true,
        },
        where: { isApproved: true },
      }),
      prisma.rating.groupBy({
        by: ["productId"],
        _count: {
          id: true,
        },
        _avg: {
          rating: true,
        },
        where: { isApproved: true },
      }),
      prisma.rating.groupBy({
        by: ["userId"],
        _count: {
          id: true,
        },
        where: { isApproved: true },
      }),
      prisma.rating.count({
        where: {
          isApproved: true,
          images: {
            some: {}, // Has at least one image
          },
        },
      }),
    ]);

    return {
      totalRatings,
      approvedRatings,
      pendingRatings,
      averageRating: averageRating._avg.rating || 0,
      ratingsByProduct,
      ratingsByUser,
      ratingsWithImages,
      percentageWithImages:
        totalRatings > 0 ? (ratingsWithImages / totalRatings) * 100 : 0,
    };
  }

  // Get product ratings (Public) - Include review images
  async getProductRatings(productId, { page, limit, onlyApproved = true }) {
    const skip = (page - 1) * limit;

    const where = {
      productId,
    };

    if (onlyApproved) {
      where.isApproved = true;
    }

    const [ratings, total, average] = await Promise.all([
      prisma.rating.findMany({
        where,
        skip,
        take: limit,
        include: {
          images: {
            orderBy: {
              order: "asc",
            },
          },
          user: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      }),
      prisma.rating.count({ where }),
      prisma.rating.aggregate({
        _avg: {
          rating: true,
        },
        where,
      }),
    ]);

    // Calculate rating distribution
    const ratingDistribution = await prisma.rating.groupBy({
      by: ["rating"],
      _count: {
        id: true,
      },
      where,
    });

    return {
      ratings,
      averageRating: average._avg.rating || 0,
      totalRatings: total,
      ratingDistribution,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  // Get user's ratings with images
  async getUserRatings(userId, { page, limit, isApproved }) {
    const skip = (page - 1) * limit;

    const where = { userId };

    if (isApproved !== undefined) {
      where.isApproved = isApproved === "true";
    }

    const [ratings, total] = await Promise.all([
      prisma.rating.findMany({
        where,
        skip,
        take: limit,
        include: {
          images: {
            orderBy: {
              order: "asc",
            },
          },
          product: {
            select: {
              id: true,
              name: true,
              productCode: true,
              normalPrice: true,
              offerPrice: true,
              images: {
                take: 1,
                select: {
                  imageUrl: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      }),
      prisma.rating.count({ where }),
    ]);

    return {
      ratings,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  // Mark rating as helpful
  async markHelpful(ratingId, userId) {
    const rating = await prisma.rating.findUnique({
      where: { id: ratingId },
    });

    if (!rating) {
      throw new Error("Rating not found");
    }

    // Check if user has already marked this rating as helpful
    const existingHelpful = await prisma.helpfulRating.findFirst({
      where: {
        ratingId,
        userId,
      },
    });

    if (existingHelpful) {
      throw new Error("You have already marked this rating as helpful");
    }

    // Create helpful entry
    await prisma.helpfulRating.create({
      data: {
        ratingId,
        userId,
      },
    });

    // Update helpful count on the rating
    const updatedRating = await prisma.rating.update({
      where: { id: ratingId },
      data: {
        helpfulCount: {
          increment: 1,
        },
        updatedAt: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    logger.info(`Rating marked as helpful: ${ratingId} by user: ${userId}`);
    return updatedRating;
  }

  // Bulk update rating approval status (Admin only)
  async bulkUpdateRatingApproval(ratingIds, isApproved) {
    const approvalStatus = isApproved === true || isApproved === "true";

    const result = await prisma.rating.updateMany({
      where: {
        id: {
          in: ratingIds,
        },
      },
      data: {
        isApproved: approvalStatus,
        updatedAt: new Date(),
      },
    });

    logger.info(
      `Bulk rating approval update: ${ratingIds.length} ratings -> ${
        approvalStatus ? "approved" : "unapproved"
      }`
    );
    return result;
  }

  // Delete review image only (keep the rating) - OLD VERSION
  async deleteReviewImage(ratingId, userId) {
    const rating = await prisma.rating.findUnique({
      where: { id: ratingId },
    });

    if (!rating) {
      throw new Error("Rating not found");
    }

    // Check if user owns this rating or is admin
    if (rating.userId !== userId) {
      throw new Error("You can only modify your own ratings");
    }

    // Delete review image from S3 if exists
    if (rating.reviewImagePublicId) {
      try {
        await s3UploadService.deleteImage(rating.reviewImagePublicId);
      } catch (error) {
        logger.error("Failed to delete review image:", error);
        throw new Error("Failed to delete review image");
      }
    }

    // Update rating to remove image references
    const updatedRating = await prisma.rating.update({
      where: { id: ratingId },
      data: {
        reviewImage: null,
        reviewImagePublicId: null,
        updatedAt: new Date(),
      },
    });

    logger.info(`Review image deleted for rating: ${ratingId}`);
    return updatedRating;
  }

  async deleteRatingImage(imageId, userId) {
    const image = await prisma.ratingImage.findUnique({
      where: { id: imageId },
      include: {
        rating: true,
      },
    });

    if (!image) {
      throw new Error("Image not found");
    }

    // Check if user owns this rating or is admin
    if (image.rating.userId !== userId) {
      throw new Error("You can only modify your own rating images");
    }

    // Delete image from S3
    try {
      await s3UploadService.deleteImage(image.imagePublicId);
    } catch (error) {
      logger.error("Failed to delete image from S3:", error);
      throw new Error("Failed to delete image");
    }

    // Delete image record
    await prisma.ratingImage.delete({
      where: { id: imageId },
    });

    logger.info(`Rating image deleted: ${imageId}`);
  }
}

export default new RatingService();