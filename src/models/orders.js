const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: [true, "Sản phẩm là bắt buộc"],
  },
  productName: {
    type: String,
    required: [true, "Tên sản phẩm là bắt buộc"],
  },
  variant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ProductVariant",
  },
  variantName: {
    type: String,
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

const orderSchema = new mongoose.Schema(
  {
    customerName: {
      type: String,
      required: [true, "Tên khách hàng là bắt buộc"],
      trim: true,
    },
    customerEmail: {
      type: String,
      required: [true, "Email khách hàng là bắt buộc"],
      trim: true,
      lowercase: true,
    },
    customerPhone: {
      type: String,
      required: [true, "Số điện thoại là bắt buộc"],
      trim: true,
    },
    address: {
      type: String,
      required: [true, "Địa chỉ là bắt buộc"],
      trim: true,
    },
    note: {
      type: String,
      default: null,
    },

    orderBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Người đặt là bắt buộc"],
    },

    products: [orderItemSchema],

    coupon: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Coupon",
      default: null,
    },
    discountAmount: {
      type: Number,
      default: 0,
      min: [0, "Giảm giá không được âm"],
    },

    subtotal: {
      type: Number,
      required: [true, "Tổng tiền trước giảm là bắt buộc"],
      min: [0, "Tổng tiền không được âm"],
    },
    totalPrice: {
      type: Number,
      required: [true, "Tổng tiền sau giảm là bắt buộc"],
      min: [0, "Tổng tiền không được âm"],
    },

    paymentMethod: {
      type: String,
      enum: ["CASH", "VNPAY"],
      required: [true, "Phương thức thanh toán là bắt buộc"],
    },
    paymentStatus: {
      type: String,
      enum: ["UNPAID", "PAID", "REFUNDED"],
      default: "UNPAID",
    },
    status: {
      type: String,
      enum: ["PENDING", "CONFIRMED", "SHIPPING", "DELIVERED", "CANCELLED"],
      default: "PENDING",
    },

    vnpTransactionId: {
      type: String,
      default: null,
    },
    vnpTxnRef: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

orderSchema.index({ orderBy: 1, createdAt: -1 });
orderSchema.index({ status: 1 });
orderSchema.index({ paymentStatus: 1 });

const Order = mongoose.model("Order", orderSchema);

module.exports = Order;
