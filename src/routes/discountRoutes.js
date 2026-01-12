// routes/discountRoutes.js
import express from "express";
import {
  createDiscount,
  getAllDiscounts,
  getDiscountById,
  updateDiscount,
  deleteDiscount,
  toggleDiscountActivation,
  applyDiscount,
  getDiscountStats,
  validateDiscount,
  getProductDiscounts,
  getActiveDiscounts,
  calculateCartDiscounts,
  getAvailableDiscounts,
  calculateProductDiscount
} from "../controllers/discountController.js";
import { auth, authorize } from "../middleware/auth.js";
import { validateDiscountQuery, validateDiscountStatus, validateDiscountUpdate } from "../middleware/validation.js";

const router = express.Router();

// Public routes
router.get("/validate/:code", validateDiscount);
router.get("/product/:productId/discounts", getProductDiscounts);
router.post("/calculate-cart", calculateCartDiscounts);
router.post("/available", getAvailableDiscounts);
router.get("/product/:productId/calculate", calculateProductDiscount);

// User routes (authenticated)
router.post("/apply/:orderId/:discountId", auth, applyDiscount);
router.get("/active", auth, getActiveDiscounts);
router.post("/user/calculate-cart", auth, calculateCartDiscounts);
router.post("/user/available", auth, getAvailableDiscounts);

// Admin routes
router.post(
  "/",
  auth,
  authorize("ADMIN"),
  createDiscount
);

router.get(
  "/",
  auth,
  authorize("ADMIN"),
  validateDiscountQuery,
  getAllDiscounts
);

router.get("/stats", auth, authorize("ADMIN"), getDiscountStats);

router.get("/:discountId", auth, authorize("ADMIN"), getDiscountById);

router.put(
  "/:discountId",
  auth,
  authorize("ADMIN"),
  validateDiscountUpdate,
  updateDiscount
);

router.delete("/:discountId", auth, authorize("ADMIN"), deleteDiscount);

router.patch(
  "/:discountId/toggle",
  auth,
  authorize("ADMIN"),
  validateDiscountStatus,
  toggleDiscountActivation
);

export default router;