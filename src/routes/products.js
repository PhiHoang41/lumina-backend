const express = require("express");
const router = express.Router();
const ProductController = require("../controllers/products");
const authMiddleware = require("../middlewares/auth");
const adminMiddleware = require("../middlewares/admin");

// ==================== PRODUCTS ====================
router.get("/", ProductController.getAllProducts);
router.get("/:id", ProductController.getProductById);
router.post(
  "/",
  authMiddleware,
  adminMiddleware,
  ProductController.createProduct,
);
router.put(
  "/:id",
  authMiddleware,
  adminMiddleware,
  ProductController.updateProduct,
);
router.delete(
  "/:id",
  authMiddleware,
  adminMiddleware,
  ProductController.deleteProduct,
);
router.patch(
  "/:id/activate",
  authMiddleware,
  adminMiddleware,
  ProductController.toggleActivateProduct,
);

// ==================== VARIANTS ====================
router.get("/:productId/variants", ProductController.getProductVariants);
router.post(
  "/:productId/variants",
  authMiddleware,
  adminMiddleware,
  ProductController.createVariant,
);
router.put(
  "/:productId/variants/:variantId",
  authMiddleware,
  adminMiddleware,
  ProductController.updateVariant,
);
router.delete(
  "/:productId/variants/:variantId",
  authMiddleware,
  adminMiddleware,
  ProductController.deleteVariant,
);
router.patch(
  "/:productId/variants/:variantId/stock",
  authMiddleware,
  adminMiddleware,
  ProductController.updateVariantStock,
);

module.exports = router;
