const User = require("../models/users");

const AuthController = {
  register: async (req, res) => {
    try {
      const { fullName, email, phone, avatar, password, address } = req.body;

      if (!fullName || !email || !password) {
        return res.status(400).json({
          success: false,
          message: "Họ tên, email và mật khẩu là bắt buộc",
        });
      }

      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "Email đã tồn tại trong hệ thống",
        });
      }

      const userCount = await User.countDocuments();
      const role = userCount === 0 ? "ADMIN" : "USER";

      const newUser = await User.create({
        fullName,
        email,
        phone,
        avatar,
        password,
        address,
        role,
      });

      return res.status(201).json({
        success: true,
        message: "Đăng ký thành công",
        data: newUser,
      });
    } catch (error) {
      if (error.name === "ValidationError") {
        const errors = Object.values(error.errors).map((err) => err.message);
        return res.status(400).json({
          success: false,
          message: errors[0],
        });
      }

      return res.status(500).json({
        success: false,
        message: "Có lỗi xảy ra khi đăng ký",
      });
    }
  },
};

module.exports = AuthController;
