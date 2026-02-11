const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, "Mã giảm giá là bắt buộc"],
      unique: true,
      uppercase: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    type: {
      type: String,
      enum: ["PERCENTAGE", "FIXED_AMOUNT"],
      required: [true, "Loại giảm giá là bắt buộc"],
    },
    value: {
      type: Number,
      required: [true, "Giá trị giảm giá là bắt buộc"],
      min: [0, "Giá trị giảm giá phải lớn hơn hoặc bằng 0"],
    },
    minOrderAmount: {
      type: Number,
      default: 0,
      min: [0, "Giá trị đơn hàng tối thiểu phải lớn hơn hoặc bằng 0"],
    },
    maxDiscountAmount: {
      type: Number,
      min: [0, "Số tiền giảm tối đa phải lớn hơn hoặc bằng 0"],
    },
    usageLimit: {
      type: Number,
      min: [0, "Giới hạn sử dụng phải lớn hơn hoặc bằng 0"],
    },
    usedCount: {
      type: Number,
      default: 0,
      min: [0, "Số lần đã sử dụng phải lớn hơn hoặc bằng 0"],
    },
    validFrom: {
      type: Date,
      required: [true, "Ngày bắt đầu hiệu lực là bắt buộc"],
    },
    validTo: {
      type: Date,
      required: [true, "Ngày kết thúc hiệu lực là bắt buộc"],
    },
    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE", "EXPIRED"],
      default: "ACTIVE",
    },
  },
  {
    timestamps: true,
  },
);

const Coupon = mongoose.model("Coupon", couponSchema);

module.exports = Coupon;
