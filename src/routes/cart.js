const express = require("express");
const cartController = require("../controllers/cart");
const authMiddleware = require("../middlewares/auth");

const router = express.Router();

router.get("/", authMiddleware, cartController.getCart);
router.post("/add", authMiddleware, cartController.addToCart);
router.delete("/remove", authMiddleware, cartController.removeFromCart);

module.exports = router;
