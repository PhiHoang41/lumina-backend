const User = require("../models/users");

const UserController = {
  getMe: async (req, res) => {
    try {
      const { userId } = req.user;

      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy người dùng",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Lấy thông tin user thành công",
        data: user.toJSON(),
      });
    } catch (error) {
      console.error("Lỗi lấy thông tin user:", error);
      return res.status(500).json({
        success: false,
        message: "Có lỗi xảy ra khi lấy thông tin user",
      });
    }
  },
};

module.exports = UserController;
