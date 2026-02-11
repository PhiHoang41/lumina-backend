const express = require("express");
const router = express.Router();
const CategoryController = require("../controllers/categories");
const authMiddleware = require("../middlewares/auth");
const adminMiddleware = require("../middlewares/admin");

router.get("/", CategoryController.getAllCategories);
router.get("/slug/:slug", CategoryController.getCategoryBySlug);
router.get("/:id", CategoryController.getCategoryById);
router.post(
  "/",
  authMiddleware,
  adminMiddleware,
  CategoryController.createCategory,
);
router.put(
  "/:id",
  authMiddleware,
  adminMiddleware,
  CategoryController.updateCategory,
);
router.delete(
  "/:id",
  authMiddleware,
  adminMiddleware,
  CategoryController.deleteCategory,
);

module.exports = router;
