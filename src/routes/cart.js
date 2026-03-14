const express = require("express");
const cartController = require("../controllers/cart");
const authMiddleware = require("../middlewares/auth");

const router = express.Router();

router.get("/", authMiddleware, cartController.getCart);
router.get("/count", authMiddleware, cartController.getCartCount);
router.post("/add", authMiddleware, cartController.addToCart);
router.put("/update", authMiddleware, cartController.updateCartItem);
router.delete("/remove", authMiddleware, cartController.removeFromCart);

module.exports = router;
