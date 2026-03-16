const express = require("express");
const router = express.Router();
const orderController = require("../controllers/orders");
const authMiddleware = require("../middlewares/auth");
const adminMiddleware = require("../middlewares/admin");

router.get("/", authMiddleware, adminMiddleware, orderController.getAllOrders);

router.get("/my-orders", authMiddleware, orderController.getMyOrders);

router.post("/", authMiddleware, orderController.createOrder);

router.get("/:id", authMiddleware, adminMiddleware, orderController.getOrderById);

router.post("/:id/confirm-payment", authMiddleware, orderController.confirmPayment);
router.put("/:id/cancel", authMiddleware, orderController.cancelOrder);

router.put("/:id/admin-status", authMiddleware, adminMiddleware, orderController.updateOrderAdminStatus);

module.exports = router;
