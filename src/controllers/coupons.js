const Coupon = require("../models/coupons");

const CouponController = {
  getAllCoupons: async (req, res) => {
    try {
      const { page = 1, limit = 10, status, type, search } = req.query;

      const query = {};

      if (status) {
        query.status = status;
      }

      if (type) {
        query.type = type;
      }

      if (search) {
        query.$or = [
          { code: { $regex: search, $options: "i" } },
          { description: { $regex: search, $options: "i" } },
        ];
      }

      const skip = (page - 1) * limit;

      const coupons = await Coupon.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      const total = await Coupon.countDocuments(query);

      return res.status(200).json({
        success: true,
        message: "Lấy danh sách mã giảm giá thành công",
        data: {
          coupons,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            totalPages: Math.ceil(total / limit),
          },
        },
      });
    } catch (error) {
      console.error("Lỗi lấy danh sách mã giảm giá:", error);
      return res.status(500).json({
        success: false,
        message: "Có lỗi xảy ra khi lấy danh sách mã giảm giá",
      });
    }
  },

  getCouponById: async (req, res) => {
    try {
      const { id } = req.params;

      const coupon = await Coupon.findById(id);

      if (!coupon) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy mã giảm giá",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Lấy chi tiết mã giảm giá thành công",
        data: coupon,
      });
    } catch (error) {
      console.error("Lỗi lấy chi tiết mã giảm giá:", error);
      return res.status(500).json({
        success: false,
        message: "Có lỗi xảy ra khi lấy chi tiết mã giảm giá",
      });
    }
  },

  createCoupon: async (req, res) => {
    try {
      const {
        code,
        description,
        type,
        value,
        minOrderAmount = 0,
        maxDiscountAmount,
        usageLimit,
        validFrom,
        validTo,
        status = "ACTIVE",
      } = req.body;

      if (!code || !type || !value || !validFrom || !validTo) {
        return res.status(400).json({
          success: false,
          message: "Vui lòng điền đầy đủ thông tin bắt buộc",
        });
      }

      if (value <= 0) {
        return res.status(400).json({
          success: false,
          message: "Giá trị giảm giá phải lớn hơn 0",
        });
      }

      if (type === "PERCENTAGE" && (value <= 0 || value > 100)) {
        return res.status(400).json({
          success: false,
          message: "Giá trị giảm theo phần trăm phải từ 1 đến 100",
        });
      }

      if (new Date(validFrom) >= new Date(validTo)) {
        return res.status(400).json({
          success: false,
          message: "Ngày kết thúc phải sau ngày bắt đầu",
        });
      }

      const existingCoupon = await Coupon.findOne({
        code: code.toUpperCase(),
      });

      if (existingCoupon) {
        return res.status(400).json({
          success: false,
          message: "Mã giảm giá đã tồn tại",
        });
      }

      const newCoupon = await Coupon.create({
        code: code.toUpperCase(),
        description,
        type,
        value,
        minOrderAmount,
        maxDiscountAmount,
        usageLimit,
        validFrom,
        validTo,
        status,
      });

      return res.status(201).json({
        success: true,
        message: "Tạo mã giảm giá thành công",
        data: newCoupon,
      });
    } catch (error) {
      console.error("Lỗi tạo mã giảm giá:", error);
      return res.status(500).json({
        success: false,
        message: "Có lỗi xảy ra khi tạo mã giảm giá",
      });
    }
  },

  updateCoupon: async (req, res) => {
    try {
      const { id } = req.params;
      const {
        code,
        description,
        type,
        value,
        minOrderAmount,
        maxDiscountAmount,
        usageLimit,
        usedCount,
        validFrom,
        validTo,
        status,
      } = req.body;

      const coupon = await Coupon.findById(id);

      if (!coupon) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy mã giảm giá",
        });
      }

      if (code && code.toUpperCase() !== coupon.code) {
        const existingCoupon = await Coupon.findOne({
          code: code.toUpperCase(),
          _id: { $ne: id },
        });

        if (existingCoupon) {
          return res.status(400).json({
            success: false,
            message: "Mã giảm giá đã tồn tại",
          });
        }
      }

      if (type === "PERCENTAGE" && value && (value <= 0 || value > 100)) {
        return res.status(400).json({
          success: false,
          message: "Giá trị giảm theo phần trăm phải từ 1 đến 100",
        });
      }

      if (validFrom && validTo && new Date(validFrom) >= new Date(validTo)) {
        return res.status(400).json({
          success: false,
          message: "Ngày kết thúc phải sau ngày bắt đầu",
        });
      }

      const updatedCoupon = await Coupon.findByIdAndUpdate(
        id,
        {
          code: code ? code.toUpperCase() : coupon.code,
          description,
          type,
          value,
          minOrderAmount,
          maxDiscountAmount,
          usageLimit,
          usedCount,
          validFrom,
          validTo,
          status,
        },
        { new: true },
      );

      return res.status(200).json({
        success: true,
        message: "Cập nhật mã giảm giá thành công",
        data: updatedCoupon,
      });
    } catch (error) {
      console.error("Lỗi cập nhật mã giảm giá:", error);
      return res.status(500).json({
        success: false,
        message: "Có lỗi xảy ra khi cập nhật mã giảm giá",
      });
    }
  },

  deleteCoupon: async (req, res) => {
    try {
      const { id } = req.params;

      const coupon = await Coupon.findById(id);

      if (!coupon) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy mã giảm giá",
        });
      }

      await Coupon.findByIdAndDelete(id);

      return res.status(200).json({
        success: true,
        message: "Xóa mã giảm giá thành công",
      });
    } catch (error) {
      console.error("Lỗi xóa mã giảm giá:", error);
      return res.status(500).json({
        success: false,
        message: "Có lỗi xảy ra khi xóa mã giảm giá",
      });
    }
  },

  updateCouponStatus: async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!status || !["ACTIVE", "INACTIVE", "EXPIRED"].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Trạng thái không hợp lệ",
        });
      }

      const coupon = await Coupon.findById(id);

      if (!coupon) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy mã giảm giá",
        });
      }

      const updatedCoupon = await Coupon.findByIdAndUpdate(
        id,
        { status },
        { new: true },
      );

      return res.status(200).json({
        success: true,
        message: "Cập nhật trạng thái mã giảm giá thành công",
        data: updatedCoupon,
      });
    } catch (error) {
      console.error("Lỗi cập nhật trạng thái mã giảm giá:", error);
      return res.status(500).json({
        success: false,
        message: "Có lỗi xảy ra khi cập nhật trạng thái mã giảm giá",
      });
    }
  },
};

module.exports = CouponController;
