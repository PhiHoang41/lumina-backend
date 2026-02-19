const mongoose = require("mongoose");

const productVariantSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: [true, "Sản phẩm là bắt buộc"],
    },
    size: {
      type: String,
      required: [true, "Kích cỡ là bắt buộc"],
      trim: true,
    },
    color: {
      name: {
        type: String,
        required: [true, "Tên màu là bắt buộc"],
        trim: true,
      },
      hex: {
        type: String,
        required: false,
        trim: true,
        default: "transparent",
      },
    },
    price: {
      type: Number,
      required: [true, "Giá là bắt buộc"],
      min: [0, "Giá không được âm"],
    },
    stock: {
      type: Number,
      required: [true, "Tồn kho là bắt buộc"],
      min: [0, "Tồn kho không được âm"],
      default: 0,
    },
    images: [
      {
        type: String,
        trim: true,
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

productVariantSchema.index({ product: 1, size: 1, color: 1 });

const ProductVariant = mongoose.model("ProductVariant", productVariantSchema);

module.exports = ProductVariant;
