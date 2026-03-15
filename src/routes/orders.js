const express = require("express");
const router = express.Router();
const orderController = require("../controllers/orders");
const authMiddleware = require("../middlewares/auth");

router.post("/", authMiddleware, orderController.createOrder);
router.put("/:id/status", authMiddleware, orderController.updateOrderStatus);

module.exports = router;
