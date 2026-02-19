const Product = require("../models/products");
const ProductVariant = require("../models/productVariants");
const Category = require("../models/categories");
const slugify = require("slugify");
const mongoose = require("mongoose");

const updateProductTotalStock = async (productId) => {
  const variants = await ProductVariant.find({
    product: productId,
    isActive: true,
  });
  const totalStock = variants.reduce((sum, variant) => sum + variant.stock, 0);
  await Product.findByIdAndUpdate(productId, { totalStock });
};

const ProductController = {
  createProduct: async (req, res) => {
    try {
      const { name, description, category, images, variants, isActive } =
        req.body;

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
            images: variantData.images || [],
            isActive: variantData.isActive,
          });
          product.variants.push(variant._id);
        }

        await product.save();
        await updateProductTotalStock(product._id);

        product.variants = await ProductVariant.find({
          product: product._id,
        });
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
        sortBy = "createdAt",
        sortOrder = "desc",
        size,
        color,
        inStock,
        minPrice,
        maxPrice,
      } = req.query;

      const filter = {};

      if (search) {
        filter.name = { $regex: search, $options: "i" };
      }

      if (category) {
        filter.category = category;
      }

      if (isActive) {
        filter.isActive = isActive === "true";
      }

      if (inStock) {
        filter.totalStock = inStock === "true" ? { $gt: 0 } : { $eq: 0 };
      }

      const sort = {};
      sort[sortBy] = sortOrder === "desc" ? -1 : 1;

      const parsedPage = parseInt(page);
      const parsedLimit = parseInt(limit);
      const skip = (parsedPage - 1) * parsedLimit;

      if (size || color || minPrice || maxPrice) {
        const variantConditions = [
          {
            $eq: ["$$variant.isActive", true],
          },
        ];

        if (size) {
          variantConditions.push({ $eq: ["$$variant.size", size] });
        }

        if (color) {
          variantConditions.push({ $eq: ["$$variant.color.name", color] });
        }

        if (minPrice) {
          variantConditions.push({
            $gte: ["$$variant.price", parseFloat(minPrice)],
          });
        }

        if (maxPrice) {
          variantConditions.push({
            $lte: ["$$variant.price", parseFloat(maxPrice)],
          });
        }

        const baseFilter = { ...filter };
        if (baseFilter.category) {
          baseFilter.category = new mongoose.Types.ObjectId(
            baseFilter.category,
          );
        }

        const pipeline = [
          {
            $match: baseFilter,
          },
          {
            $lookup: {
              from: "categories",
              localField: "category",
              foreignField: "_id",
              as: "category",
            },
          },
          {
            $unwind: {
              path: "$category",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: "productvariants",
              localField: "_id",
              foreignField: "product",
              as: "variants",
            },
          },
          {
            $addFields: {
              variants: {
                $filter: {
                  input: "$variants",
                  as: "variant",
                  cond: { $and: variantConditions },
                },
              },
            },
          },
          {
            $match: {
              "variants.0": { $exists: true },
            },
          },
        ];

        const countPipeline = [...pipeline, { $count: "total" }];
        const countResult = await Product.aggregate(countPipeline);
        const total = countResult.length > 0 ? countResult[0].total : 0;

        pipeline.push(
          { $sort: sort },
          { $skip: skip },
          { $limit: parsedLimit },
        );

        const products = await Product.aggregate(pipeline);

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
      } else {
        const total = await Product.countDocuments(filter);
        const products = await Product.find(filter)
          .populate("category", "name slug")
          .populate("variants")
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
      }
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

      const product = await Product.findById(id).populate(
        "category",
        "name slug",
      );

      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy sản phẩm",
        });
      }

      product.variants = await ProductVariant.find({ product: id });

      let relatedProducts = [];
      if (product.category) {
        relatedProducts = await Product.find({
          _id: { $ne: product._id },
          category: product.category,
          isActive: true,
        })
          .populate("category", "name slug")
          .limit(6);

        for (const relatedProduct of relatedProducts) {
          relatedProduct.variants = await ProductVariant.find({
            product: relatedProduct._id,
          });
        }
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
      const { name, description, category, images, variants, isActive } =
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

      let newVariantIds = [];

      if (variants && variants.length > 0) {
        const existingVariants = await ProductVariant.find({
          product: id,
        });

        for (const variantData of variants) {
          if (variantData._id) {
            const existingVariant = existingVariants.find(
              (v) => v._id.toString() === variantData._id,
            );

            if (existingVariant) {
              existingVariant.size = variantData.size;
              existingVariant.color = variantData.color;
              existingVariant.price = variantData.price;
              existingVariant.stock = variantData.stock;
              existingVariant.images = variantData.images || [];
              existingVariant.isActive =
                variantData.isActive !== undefined
                  ? variantData.isActive
                  : true;
              await existingVariant.save();
              newVariantIds.push(existingVariant._id);
            } else {
              return res.status(400).json({
                success: false,
                message: `Variant với ID ${variantData._id} không tồn tại`,
              });
            }
          } else {
            const newVariant = await ProductVariant.create({
              product: id,
              size: variantData.size,
              color: variantData.color,
              price: variantData.price,
              stock: variantData.stock || 0,
              images: variantData.images || [],
              isActive:
                variantData.isActive !== undefined
                  ? variantData.isActive
                  : true,
            });
            newVariantIds.push(newVariant._id);
          }
        }

        const variantIdsToDelete = existingVariants
          .filter(
            (existingVariant) =>
              !variants.some(
                (v) => v._id && v._id === existingVariant._id.toString(),
              ),
          )
          .map((v) => v._id);

        if (variantIdsToDelete.length > 0) {
          await ProductVariant.deleteMany({
            _id: { $in: variantIdsToDelete },
          });
        }

        updatedProduct.variants = newVariantIds;
        await updatedProduct.save();
        await updateProductTotalStock(id);
      }

      const finalProduct = await Product.findById(id).populate(
        "category",
        "name slug",
      );

      finalProduct.variants = await ProductVariant.find({ product: id });

      return res.status(200).json({
        success: true,
        message: "Cập nhật sản phẩm thành công",
        data: finalProduct,
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
      const { size, color, price, stock, images, isActive } = req.body;

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

      const variant = await ProductVariant.create({
        product: productId,
        size,
        color,
        price,
        stock: stock || 0,
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
      const { size, color, price, stock, images, isActive } = req.body;

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

      const updateData = {
        size,
        color,
        price,
        stock,
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
