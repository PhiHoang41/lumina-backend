const Category = require("../models/categories");
const slugify = require("slugify");

const CategoryController = {
  createCategory: async (req, res) => {
    try {
      const { name, image, isActive } = req.body;

      const existingCategory = await Category.findOne({ name });
      if (existingCategory) {
        return res.status(400).json({
          success: false,
          message: "Tên danh mục đã tồn tại",
        });
      }

      const slug = slugify(name, {
        lower: true,
        strict: true,
        locale: "vi",
      });

      const category = await Category.create({
        name,
        slug,
        image,
        isActive: isActive !== undefined ? isActive : true,
      });

      return res.status(201).json({
        success: true,
        message: "Tạo danh mục thành công",
        data: category,
      });
    } catch (error) {
      console.error("Lỗi tạo danh mục:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Có lỗi xảy ra khi tạo danh mục",
      });
    }
  },

  getAllCategories: async (req, res) => {
    try {
      const { isActive, page = 1, limit = 10 } = req.query;

      const filter =
        isActive !== undefined ? { isActive: isActive === "true" } : {};

      const parsedPage = parseInt(page);
      const parsedLimit = parseInt(limit);
      const skip = (parsedPage - 1) * parsedLimit;

      const total = await Category.countDocuments(filter);
      const categories = await Category.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parsedLimit);

      return res.status(200).json({
        success: true,
        message: "Lấy danh sách danh mục thành công",
        data: categories,
        pagination: {
          total,
          page: parsedPage,
          limit: parsedLimit,
          totalPages: Math.ceil(total / parsedLimit),
        },
      });
    } catch (error) {
      console.error("Lỗi lấy danh sách danh mục:", error);
      return res.status(500).json({
        success: false,
        message: "Có lỗi xảy ra khi lấy danh sách danh mục",
      });
    }
  },

  getCategoryById: async (req, res) => {
    try {
      const { id } = req.params;

      const category = await Category.findById(id);

      if (!category) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy danh mục",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Lấy danh mục thành công",
        data: category,
      });
    } catch (error) {
      console.error("Lỗi lấy danh mục:", error);
      return res.status(500).json({
        success: false,
        message: "Có lỗi xảy ra khi lấy danh mục",
      });
    }
  },

  getCategoryBySlug: async (req, res) => {
    try {
      const { slug } = req.params;

      const category = await Category.findOne({ slug });

      if (!category) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy danh mục",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Lấy danh mục thành công",
        data: category,
      });
    } catch (error) {
      console.error("Lỗi lấy danh mục:", error);
      return res.status(500).json({
        success: false,
        message: "Có lỗi xảy ra khi lấy danh mục",
      });
    }
  },

  updateCategory: async (req, res) => {
    try {
      const { id } = req.params;
      const { name, image, isActive } = req.body;

      const category = await Category.findById(id);

      if (!category) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy danh mục",
        });
      }

      const updateData = {};

      if (name && name !== category.name) {
        const existingCategory = await Category.findOne({
          name,
          _id: { $ne: id },
        });
        if (existingCategory) {
          return res.status(400).json({
            success: false,
            message: "Tên danh mục đã tồn tại",
          });
        }
        updateData.name = name;
        updateData.slug = slugify(name, {
          lower: true,
          strict: true,
          locale: "vi",
        });
      }

      updateData.image = image;
      updateData.isActive = isActive;

      const updatedCategory = await Category.findByIdAndUpdate(id, updateData, {
        returnDocument: "after",
      });

      return res.status(200).json({
        success: true,
        message: "Cập nhật danh mục thành công",
        data: updatedCategory,
      });
    } catch (error) {
      console.error("Lỗi cập nhật danh mục:", error);
      return res.status(500).json({
        success: false,
        message: "Có lỗi xảy ra khi cập nhật danh mục",
      });
    }
  },

  deleteCategory: async (req, res) => {
    try {
      const { id } = req.params;

      const category = await Category.findById(id);

      if (!category) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy danh mục",
        });
      }

      await Category.findByIdAndDelete(id);

      return res.status(200).json({
        success: true,
        message: "Xóa danh mục thành công",
      });
    } catch (error) {
      console.error("Lỗi xóa danh mục:", error);
      return res.status(500).json({
        success: false,
        message: "Có lỗi xảy ra khi xóa danh mục",
      });
    }
  },
};

module.exports = CategoryController;
