const User = require("../models/users");
const adminMiddleware = require("../middlewares/admin");

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

  getAllUsers: async (req, res) => {
    try {
      const { page = 1, limit = 10, search = "", role = "" } = req.query;

      const query = {};

      if (search) {
        query.$or = [
          { fullName: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
          { phone: { $regex: search, $options: "i" } },
        ];
      }

      if (role) {
        query.role = role;
      }

      const total = await User.countDocuments(query);
      const users = await User.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

      return res.status(200).json({
        success: true,
        message: "Lấy danh sách user thành công",
        data: {
          users,
          pagination: {
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(total / limit),
          },
        },
      });
    } catch (error) {
      console.error("Lỗi lấy danh sách user:", error);
      return res.status(500).json({
        success: false,
        message: "Có lỗi xảy ra khi lấy danh sách user",
      });
    }
  },

  getUserById: async (req, res) => {
    try {
      const { id } = req.params;

      const user = await User.findById(id);

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
