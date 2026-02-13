const Product = require("../models/products");
const ProductVariant = require("../models/productVariants");
const Category = require("../models/categories");
const slugify = require("slugify");

const updateProductTotalStock = async (productId) => {
  const variants = await ProductVariant.find({
    product: productId,
    isActive: true,
  });
  const totalStock = variants.reduce((sum, variant) => sum + variant.stock, 0);
  await Product.findByIdAndUpdate(productId, { totalStock });
};

const ProductController = {
  // ==================== PRODUCTS ====================

  createProduct: async (req, res) => {
    try {
      const {
        name,
        description,
        category,
        basePrice,
        images,
        variants,
        isActive,
      } = req.body;

      const existingProduct = await Product.findOne({ name });
      if (existingProduct) {
        return res.status(400).json({
          success: false,
          message: "Tên sản phẩm đã tồn tại",
        });
      }

      const slug = slugify(name, {
        lower: true,
        strict: true,
        locale: "vi",
      });

      const categoryExists = await Category.findById(category);
      if (!categoryExists) {
        return res.status(404).json({
          success: false,
          message: "Danh mục không tồn tại",
        });
      }

      const product = await Product.create({
        name,
        slug,
        description,
        category,
        basePrice,
        images: images || [],
        variants: [],
        isActive,
        totalStock: 0,
      });

      if (variants && variants.length > 0) {
        for (const variantData of variants) {
          const variant = await ProductVariant.create({
            product: product._id,
            size: variantData.size,
            color: variantData.color,
            price: variantData.price,
            stock: variantData.stock || 0,
            sku: variantData.sku,
            images: variantData.images || [],
            isActive: variantData.isActive,
          });
          product.variants.push(variant._id);
        }

        await updateProductTotalStock(product._id);
      }

      return res.status(201).json({
        success: true,
        message: "Tạo sản phẩm thành công",
        data: product,
      });
    } catch (error) {
      console.error("Lỗi tạo sản phẩm:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Lỗi khi tạo sản phẩm",
      });
    }
  },

  getAllProducts: async (req, res) => {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        category,
        isActive,
        minPrice,
        maxPrice,
        sortBy = "createdAt",
        sortOrder = "desc",
      } = req.query;

      const filter = {};

      if (search) {
        filter.$text = { $search: search };
      }

      if (category) {
        filter.category = category;
      }

      if (isActive) {
        filter.isActive = isActive === "true";
      }

      if (minPrice || maxPrice) {
        filter.basePrice = {};
        if (minPrice) {
          filter.basePrice.$gte = parseFloat(minPrice);
        }
        if (maxPrice) {
          filter.basePrice.$lte = parseFloat(maxPrice);
        }
      }

      const sort = {};
      sort[sortBy] = sortOrder === "desc" ? -1 : 1;

      const parsedPage = parseInt(page);
      const parsedLimit = parseInt(limit);
      const skip = (parsedPage - 1) * parsedLimit;

      const total = await Product.countDocuments(filter);
      const products = await Product.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(parsedLimit);

      return res.status(200).json({
        success: true,
        message: "Lấy danh sách sản phẩm thành công",
        data: products,
        pagination: {
          total,
          page: parsedPage,
          limit: parsedLimit,
          totalPages: Math.ceil(total / parsedLimit),
        },
      });
    } catch (error) {
      console.error("Lỗi lấy danh sách sản phẩm:", error);
      return res.status(500).json({
        success: false,
        message: "Lỗi khi lấy danh sách",
      });
    }
  },

  getProductById: async (req, res) => {
    try {
      const { id } = req.params;

      const product = await Product.findById(id)
        .populate("category", "name slug")
        .populate("variants");

      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy sản phẩm",
        });
      }

      let relatedProducts = [];
      if (product.category) {
        relatedProducts = await Product.find({
          _id: { $ne: product._id },
          category: product.category,
          isActive: true,
        })
          .populate("category", "name slug")
          .populate("variants")
          .limit(6);
      }

      return res.status(200).json({
        success: true,
        message: "Lấy sản phẩm thành công",
        data: product,
        relatedProducts,
      });
    } catch (error) {
      console.error("Lỗi lấy sản phẩm:", error);
      return res.status(500).json({
        success: false,
        message: "Lỗi khi lấy sản phẩm",
      });
    }
  },

  updateProduct: async (req, res) => {
    try {
      const { id } = req.params;
      const { name, description, category, basePrice, images, isActive } =
        req.body;

      const product = await Product.findById(id);

      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy sản phẩm",
        });
      }

      if (name && name !== product.name) {
        const existingProduct = await Product.findOne({ name });
        if (existingProduct) {
          return res.status(400).json({
            success: false,
            message: "Tên sản phẩm đã tồn tại",
          });
        }
      }

      if (category) {
        const categoryExists = await Category.findById(category);
        if (!categoryExists) {
          return res.status(404).json({
            success: false,
            message: "Danh mục không tồn tại",
          });
        }
      }

      const updateData = {
        description,
        category,
        basePrice,
        images,
        isActive,
      };

      if (name) {
        updateData.name = name;
        updateData.slug = slugify(name, {
          lower: true,
          strict: true,
          locale: "vi",
        });
      }

      const updatedProduct = await Product.findByIdAndUpdate(id, updateData, {
        new: true,
      });

      return res.status(200).json({
        success: true,
        message: "Cập nhật sản phẩm thành công",
        data: updatedProduct,
      });
    } catch (error) {
      console.error("Lỗi cập nhật sản phẩm:", error);
      return res.status(500).json({
        success: false,
        message: "Lỗi khi cập nhật sản phẩm",
      });
    }
  },

  deleteProduct: async (req, res) => {
    try {
      const { id } = req.params;

      const product = await Product.findById(id);

      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy sản phẩm",
        });
      }

      await ProductVariant.deleteMany({ product: id });

      await Product.findByIdAndDelete(id);

      return res.status(200).json({
        success: true,
        message: "Xóa sản phẩm thành công",
      });
    } catch (error) {
      console.error("Lỗi xóa sản phẩm:", error);
      return res.status(500).json({
        success: false,
        message: "Lỗi khi xóa sản phẩm",
      });
    }
  },

  toggleActivateProduct: async (req, res) => {
    try {
      const { id } = req.params;

      const product = await Product.findById(id);

      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy sản phẩm",
        });
      }

      product.isActive = !product.isActive;
      await product.save();

      return res.status(200).json({
        success: true,
        message: product.isActive
          ? "Kích hoạt sản phẩm thành công"
          : "Tắt sản phẩm thành công",
        data: product,
      });
    } catch (error) {
      console.error("Lỗi kích hoạt/tắt sản phẩm:", error);
      return res.status(500).json({
        success: false,
        message: "Lỗi khi thay đổi trạng thái",
      });
    }
  },

  // ==================== VARIANTS ====================

  createVariant: async (req, res) => {
    try {
      const { productId } = req.params;
      const { size, color, price, stock, sku, images, isActive } = req.body;

      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy sản phẩm",
        });
      }

      const existingVariant = await ProductVariant.findOne({
        product: productId,
        size,
        "color.name": color.name,
      });
      if (existingVariant) {
        return res.status(400).json({
          success: false,
          message: "Biến thể với kích cỡ và màu này đã tồn tại",
        });
      }

      if (sku) {
        const existingSKU = await ProductVariant.findOne({ sku });
        if (existingSKU) {
          return res.status(400).json({
            success: false,
            message: "SKU đã tồn tại",
          });
        }
      }

      const variant = await ProductVariant.create({
        product: productId,
        size,
        color,
        price,
        stock: stock || 0,
        sku,
        images: images || [],
        isActive,
      });

      product.variants.push(variant._id);

      await updateProductTotalStock(productId);

      return res.status(201).json({
        success: true,
        message: "Tạo biến thể thành công",
        data: variant,
      });
    } catch (error) {
      console.error("Lỗi tạo biến thể:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Lỗi khi tạo biến thể",
      });
    }
  },

  getProductVariants: async (req, res) => {
    try {
      const { productId } = req.params;

      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy sản phẩm",
        });
      }

      const variants = await ProductVariant.find({ product: productId }).sort({
        size: 1,
        "color.name": 1,
      });

      return res.status(200).json({
        success: true,
        message: "Lấy danh sách biến thể thành công",
        data: variants,
      });
    } catch (error) {
      console.error("Lỗi lấy danh sách biến thể:", error);
      return res.status(500).json({
        success: false,
        message: "Lỗi khi lấy danh sách biến thể",
      });
    }
  },

  updateVariant: async (req, res) => {
    try {
      const { productId, variantId } = req.params;
      const { size, color, price, stock, sku, images, isActive } = req.body;

      const variant = await ProductVariant.findById(variantId);

      if (!variant) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy biến thể",
        });
      }

      if (variant.product.toString() !== productId) {
        return res.status(400).json({
          success: false,
          message: "Biến thể không thuộc sản phẩm này",
        });
      }

      if (
        (size && size !== variant.size) ||
        (color && color.name !== variant.color.name)
      ) {
        const existingVariant = await ProductVariant.findOne({
          product: productId,
          size: size || variant.size,
          "color.name": color ? color.name : variant.color.name,
          _id: { $ne: variantId },
        });
        if (existingVariant) {
          return res.status(400).json({
            success: false,
            message: "Biến thể với kích cỡ và màu này đã tồn tại",
          });
        }
      }

      if (sku && sku !== variant.sku) {
        const existingSKU = await ProductVariant.findOne({
          sku,
          _id: { $ne: variantId },
        });
        if (existingSKU) {
          return res.status(400).json({
            success: false,
            message: "SKU đã tồn tại",
          });
        }
      }

      const updateData = {
        size,
        color,
        price,
        stock,
        sku,
        images,
        isActive,
      };

      Object.keys(updateData).forEach((key) => {
        if (updateData[key] === undefined) {
          delete updateData[key];
        }
      });

      Object.assign(variant, updateData);

      await variant.save();

      await updateProductTotalStock(productId);

      return res.status(200).json({
        success: true,
        message: "Cập nhật biến thể thành công",
        data: variant,
      });
    } catch (error) {
      console.error("Lỗi cập nhật biến thể:", error);
      return res.status(500).json({
        success: false,
        message: "Lỗi khi cập nhật biến thể",
      });
    }
  },

  deleteVariant: async (req, res) => {
    try {
      const { productId, variantId } = req.params;

      const variant = await ProductVariant.findById(variantId);

      if (!variant) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy biến thể",
        });
      }

      if (variant.product.toString() !== productId) {
        return res.status(400).json({
          success: false,
          message: "Biến thể không thuộc sản phẩm này",
        });
      }

      await ProductVariant.findByIdAndDelete(variantId);

      const product = await Product.findById(productId);
      product.variants = product.variants.filter(
        (v) => v.toString() !== variantId,
      );
      await product.save();

      await updateProductTotalStock(productId);

      return res.status(200).json({
        success: true,
        message: "Xóa biến thể thành công",
      });
    } catch (error) {
      console.error("Lỗi xóa biến thể:", error);
      return res.status(500).json({
        success: false,
        message: "Lỗi khi xóa biến thể",
      });
    }
  },

  updateVariantStock: async (req, res) => {
    try {
      const { productId, variantId } = req.params;
      const { stock } = req.body;

      const variant = await ProductVariant.findById(variantId);

      if (!variant) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy biến thể",
        });
      }

      if (variant.product.toString() !== productId) {
        return res.status(400).json({
          success: false,
          message: "Biến thể không thuộc sản phẩm này",
        });
      }

      if (stock < 0) {
        return res.status(400).json({
          success: false,
          message: "Tồn kho không được âm",
        });
      }

      variant.stock = stock;
      await variant.save();

      await updateProductTotalStock(productId);

      return res.status(200).json({
        success: true,
        message: "Cập nhật tồn kho thành công",
        data: variant,
      });
    } catch (error) {
      console.error("Lỗi cập nhật tồn kho:", error);
      return res.status(500).json({
        success: false,
        message: "Lỗi khi cập nhật tồn kho",
      });
    }
  },
};

module.exports = ProductController;
