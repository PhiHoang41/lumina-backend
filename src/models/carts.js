const mongoose = require("mongoose");

const cartItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: [true, "Sản phẩm là bắt buộc"],
  },
  variant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ProductVariant",
    required: [true, "Biến thể sản phẩm là bắt buộc"],
  },
  quantity: {
    type: Number,
    required: [true, "Số lượng là bắt buộc"],
    min: [1, "Số lượng phải lớn hơn 0"],
  },
  price: {
    type: Number,
    required: [true, "Giá là bắt buộc"],
    min: [0, "Giá không được âm"],
  },
});

const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Người dùng là bắt buộc"],
      unique: true,
    },
    items: [cartItemSchema],
    totalItems: {
      type: Number,
      default: 0,
      min: [0, "Tổng số sản phẩm không được âm"],
    },
  },
  {
    timestamps: true,
  }
);

cartSchema.virtual("totalPrice").get(function () {
  return this.items.reduce((total, item) => {
    return total + item.price * item.quantity;
  }, 0);
});

cartSchema.set("toJSON", { virtuals: true });
cartSchema.set("toObject", { virtuals: true });

cartSchema.index({ user: 1 });

const Cart = mongoose.model("Cart", cartSchema);

module.exports = Cart;
