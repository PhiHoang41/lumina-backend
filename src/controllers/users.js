const User = require("../models/users");

const UserController = {
  createUser: async (req, res) => {
    try {
      const { fullName, email, password, phone, address, role, avatar } =
        req.body;

      // Validate required fields
      if (!fullName || !email || !password) {
        return res.status(400).json({
          success: false,
          message: "FullName, email and password are required",
        });
      }

      // Check if email already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "Email already exists",
        });
      }

      const newUser = new User({
        fullName,
        email,
        password,
        phone,
        address,
        role: role || "USER",
        avatar,
      });

      await newUser.save();

      return res.status(201).json({
        success: true,
        message: "User created successfully",
        data: newUser.toJSON(),
      });
    } catch (error) {
      if (error.name === "ValidationError") {
        const errors = Object.values(error.errors).map((err) => err.message);
        return res.status(400).json({
          success: false,
          message: errors[0],
        });
      }
      console.error("Lỗi tạo user:", error);
      return res.status(500).json({
        success: false,
        message: "Có lỗi xảy ra khi tạo user",
      });
    }
  },

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

  updateMyProfile: async (req, res) => {
    try {
      const { userId } = req.user;
      const { fullName, phone, avatar, address } = req.body;

      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy người dùng",
        });
      }

      user.fullName = fullName;
      user.phone = phone;
      user.avatar = avatar;
      user.address = address;

      await user.save();

      return res.status(200).json({
        success: true,
        message: "Cập nhật profile thành công",
        data: user.toJSON(),
      });
    } catch (error) {
      if (error.name === "ValidationError") {
        const errors = Object.values(error.errors).map((err) => err.message);
        return res.status(400).json({
          success: false,
          message: errors[0],
        });
      }
      console.error("Lỗi cập nhật profile:", error);
      return res.status(500).json({
        success: false,
        message: "Có lỗi xảy ra khi cập nhật profile",
      });
    }
  },

  changeMyPassword: async (req, res) => {
    try {
      const { userId } = req.user;
      const { currentPassword, newPassword } = req.body;

      // Validate required fields
      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          message: "Current password and new password are required",
        });
      }

      // Validate new password length
      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          message: "New password must be at least 6 characters",
        });
      }

      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // Verify current password
      const isMatch = await user.comparePassword(currentPassword);
      if (!isMatch) {
        return res.status(400).json({
          success: false,
          message: "Current password is incorrect",
        });
      }

      user.password = newPassword;
      await user.save();

      return res.status(200).json({
        success: true,
        message: "Password changed successfully",
      });
    } catch (error) {
      console.error("Error changing password:", error);
      return res.status(500).json({
        success: false,
        message: "An error occurred while changing password",
      });
    }
  },

  getAllUsers: async (req, res) => {
    try {
      const { page = 1, limit = 10, search = "", role = "" } = req.query;

      const query = {};

      if (req.query.showDeleted !== "true") {
        query.deletedAt = { $in: [null, undefined] };
      }

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

  updateUser: async (req, res) => {
    try {
      const { id } = req.params;
      const { fullName, phone, avatar, address, role } = req.body;

      const user = await User.findById(id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy người dùng",
        });
      }

      if (fullName) user.fullName = fullName;
      if (phone) user.phone = phone;
      if (avatar !== undefined) user.avatar = avatar;
      if (address !== undefined) user.address = address;
      if (role && ["USER", "ADMIN"].includes(role)) user.role = role;

      await user.save();

      return res.status(200).json({
        success: true,
        message: "Cập nhật user thành công",
        data: user.toJSON(),
      });
    } catch (error) {
      if (error.name === "ValidationError") {
        const errors = Object.values(error.errors).map((err) => err.message);
        return res.status(400).json({
          success: false,
          message: errors[0],
        });
      }
      console.error("Lỗi cập nhật user:", error);
      return res.status(500).json({
        success: false,
        message: "Có lỗi xảy ra khi cập nhật user",
      });
    }
  },

  deleteUser: async (req, res) => {
    try {
      const { id } = req.params;

      const user = await User.findById(id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy người dùng",
        });
      }

      await User.findByIdAndDelete(id);

      return res.status(200).json({
        success: true,
        message: "Xóa user thành công",
      });
    } catch (error) {
      console.error("Lỗi xóa user:", error);
      return res.status(500).json({
        success: false,
        message: "Có lỗi xảy ra khi xóa user",
      });
    }
  },

  restoreUser: async (req, res) => {
    try {
      const { id } = req.params;

      const user = await User.findById(id);

      if (!user || !user.deletedAt) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy người dùng đã xóa",
        });
      }

      await User.findByIdAndUpdate(id, { deletedAt: null });

      return res.status(200).json({
        success: true,
        message: "Khôi phục người dùng thành công",
      });
    } catch (error) {
      console.error("Lỗi khôi phục người dùng:", error);
      return res.status(500).json({
        success: false,
        message: "Có lỗi xảy ra khi khôi phục người dùng",
      });
    }
  },

  softDeleteUser: async (req, res) => {
    try {
      const { id } = req.params;

      const user = await User.findById(id);

      if (!user || user.deletedAt) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy người dùng",
        });
      }

      await User.findByIdAndUpdate(id, { deletedAt: new Date() });

      return res.status(200).json({
        success: true,
        message: "Xóa mềm người dùng thành công",
      });
    } catch (error) {
      console.error("Lỗi xóa mềm người dùng:", error);
      return res.status(500).json({
        success: false,
        message: "Có lỗi xảy ra khi xóa mềm người dùng",
      });
    }
  },

  changePassword: async (req, res) => {
    try {
      const { id } = req.params;
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          message: "Current password and new password are required",
        });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          message: "New password must be at least 6 characters",
        });
      }

      const user = await User.findById(id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      const isMatch = await user.comparePassword(currentPassword);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: "Current password is incorrect",
        });
      }

      user.password = newPassword;
      await user.save();

      return res.status(200).json({
        success: true,
        message: "Password changed successfully",
      });
    } catch (error) {
      console.error("Error changing password:", error);
      return res.status(500).json({
        success: false,
        message: "An error occurred while changing password",
      });
    }
  },

  adminChangePassword: async (req, res) => {
    try {
      const { id } = req.params;
      const { newPassword } = req.body;

      if (!newPassword) {
        return res.status(400).json({
          success: false,
          message: "New password is required",
        });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          message: "New password must be at least 6 characters",
        });
      }

      const user = await User.findById(id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      user.password = newPassword;
      await user.save();

      return res.status(200).json({
        success: true,
        message: "Password changed successfully",
      });
    } catch (error) {
      console.error("Error changing password:", error);
      return res.status(500).json({
        success: false,
        message: "An error occurred while changing password",
      });
    }
  },

  changeRole: async (req, res) => {
    try {
      const { id } = req.params;
      const { role } = req.body;

      if (!role || !["USER", "ADMIN"].includes(role)) {
        return res.status(400).json({
          success: false,
          message: "Invalid role",
        });
      }

      const user = await User.findById(id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      user.role = role;
      await user.save();

      return res.status(200).json({
        success: true,
        message: "Role updated successfully",
        data: user.toJSON(),
      });
    } catch (error) {
      console.error("Error updating role:", error);
      return res.status(500).json({
        success: false,
        message: "An error occurred while updating role",
      });
    }
  },
};

module.exports = UserController;
