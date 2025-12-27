// services/subcategoryService.js
import prisma from "../config/database.js";
import s3UploadService from "./s3UploadService.js";
import logger from "../utils/logger.js";

class SubcategoryService {
  // Get all subcategories with pagination and filtering
  async getAllSubcategories({ page = 1, limit = 10, categoryId, isActive }) {
    const skip = (page - 1) * limit;

    const where = {};

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const [subcategories, total] = await Promise.all([
      prisma.subcategory.findMany({
        where,
        skip,
        take: limit,
        include: {
          category: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
          products: {
            where: { status: "ACTIVE" },
            select: {
              id: true,
              name: true,
              productCode: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      }),
      prisma.subcategory.count({ where }),
    ]);

    return {
      subcategories,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
    };
  }

  // Get subcategory by ID
  async getSubcategoryById(subcategoryId) {
    const subcategory = await prisma.subcategory.findUnique({
      where: { id: subcategoryId },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        products: {
          where: { status: "ACTIVE" },
          include: {
            images: {
              take: 1,
              where: { isPrimary: true },
            },
            variants: {
              take: 1,
            },
          },
        },
      },
    });

    if (!subcategory) {
      throw new Error("Subcategory not found");
    }

    return subcategory;
  }

  // Create subcategory
  async createSubcategory(subcategoryData, file = null) {
    let {
      name,
      description = null,
      categoryId = null,
      isActive = true,
    } = subcategoryData;

    // 🔥 NORMALIZE
    if (
      categoryId === "" ||
      categoryId === "null" ||
      categoryId === "undefined"
    ) {
      categoryId = null;
    }

    // ✅ Check category ONLY if categoryId is valid
    if (categoryId !== null) {
      const category = await prisma.category.findUnique({
        where: { id: categoryId },
      });

      if (!category) {
        throw new Error("Category not found");
      }
    }

    // ✅ Duplicate check
    const existingSubcategory = await prisma.subcategory.findFirst({
      where: {
        name,
        categoryId,
      },
    });

    if (existingSubcategory) {
      throw new Error("Subcategory name already exists");
    }

    let imageUrl = null;
    let imagePublicId = null;

    if (file) {
      const uploadResult = await s3UploadService.uploadImage(
        file.buffer,
        "subcategories"
      );
      imageUrl = uploadResult.url;
      imagePublicId = uploadResult.key;
    }

    return prisma.subcategory.create({
      data: {
        name,
        description,
        image: imageUrl,
        imagePublicId,
        isActive,
        categoryId,
      },
      include: {
        category: { select: { id: true, name: true } },
      },
    });
  }

  // Update subcategory
  async updateSubcategory(subcategoryId, updateData, file = null) {
    const subcategory = await prisma.subcategory.findUnique({
      where: { id: subcategoryId },
    });

    if (!subcategory) {
      throw new Error("Subcategory not found");
    }

    const { name, description, categoryId, isActive } = updateData;

    const isActiveBoolean =
      isActive === undefined
        ? subcategory.isActive
        : isActive === "true" || isActive === true;

    // ✅ If categoryId is provided (including null)
    if (categoryId !== undefined) {
      if (categoryId !== null) {
        const category = await prisma.category.findUnique({
          where: { id: categoryId },
        });

        if (!category) {
          throw new Error("Category not found");
        }
      }
    }

    // ✅ Duplicate check
    if (name && name !== subcategory.name) {
      const existingSubcategory = await prisma.subcategory.findFirst({
        where: {
          name,
          categoryId:
            categoryId !== undefined ? categoryId : subcategory.categoryId,
          id: { not: subcategoryId },
        },
      });

      if (existingSubcategory) {
        throw new Error("Subcategory name already exists");
      }
    }

    let imageUrl = subcategory.image;
    let imagePublicId = subcategory.imagePublicId;

    if (file) {
      if (subcategory.imagePublicId) {
        try {
          await s3UploadService.deleteImage(subcategory.imagePublicId);
        } catch {}
      }

      const uploadResult = await s3UploadService.uploadImage(
        file.buffer,
        "subcategories"
      );

      imageUrl = uploadResult.url;
      imagePublicId = uploadResult.key;
    }

    const updatedSubcategory = await prisma.subcategory.update({
      where: { id: subcategoryId },
      data: {
        name,
        description,
        image: imageUrl,
        imagePublicId,
        categoryId:
          categoryId !== undefined ? categoryId : subcategory.categoryId,
        isActive: isActiveBoolean,
        updatedAt: new Date(),
      },
      include: {
        category: {
          select: { id: true, name: true },
        },
      },
    });

    return updatedSubcategory;
  }

  // Delete subcategory
  async deleteSubcategory(subcategoryId) {
    const subcategory = await prisma.subcategory.findUnique({
      where: { id: subcategoryId },
      include: {
        products: true,
      },
    });

    if (!subcategory) {
      throw new Error("Subcategory not found");
    }

    // Check if subcategory has products
    if (subcategory.products.length > 0) {
      throw new Error("Cannot delete subcategory with existing products");
    }

    // Delete subcategory image from S3 if exists
    if (subcategory.imagePublicId) {
      try {
        await s3UploadService.deleteImage(subcategory.imagePublicId);
      } catch (error) {
        logger.error("Failed to delete subcategory image from S3:", error);
        // Continue with subcategory deletion
      }
    }

    await prisma.subcategory.delete({
      where: { id: subcategoryId },
    });

    logger.info(`Subcategory deleted: ${subcategoryId}`);
  }

  // Toggle subcategory status
  async toggleSubcategoryStatus(subcategoryId, isActive) {
    const subcategory = await prisma.subcategory.findUnique({
      where: { id: subcategoryId },
    });

    if (!subcategory) {
      throw new Error("Subcategory not found");
    }

    const activeStatus = isActive === true || isActive === "true";

    const updatedSubcategory = await prisma.subcategory.update({
      where: { id: subcategoryId },
      data: {
        isActive: activeStatus,
        updatedAt: new Date(),
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    logger.info(
      `Subcategory status updated: ${subcategoryId} -> ${
        activeStatus ? "active" : "inactive"
      }`
    );
    return updatedSubcategory;
  }
}

export default new SubcategoryService();
