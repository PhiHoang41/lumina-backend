const express = require("express");
const CouponController = require("../controllers/coupons");
const authMiddleware = require("../middlewares/auth");
const adminMiddleware = require("../middlewares/admin");

const router = express.Router();

router.get(
  "/",
  authMiddleware,
  adminMiddleware,
  CouponController.getAllCoupons,
);

router.get(
  "/:id",
  authMiddleware,
  adminMiddleware,
  CouponController.getCouponById,
);

router.post(
  "/",
  authMiddleware,
  adminMiddleware,
  CouponController.createCoupon,
);

router.put(
  "/:id",
  authMiddleware,
  adminMiddleware,
  CouponController.updateCoupon,
);

router.delete(
  "/:id",
  authMiddleware,
  adminMiddleware,
  CouponController.deleteCoupon,
);

router.patch(
  "/:id/status",
  authMiddleware,
  adminMiddleware,
  CouponController.updateCouponStatus,
);

module.exports = router;
