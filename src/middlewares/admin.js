const adminMiddleware = (req, res, next) => {
  if (req.user.role !== "ADMIN") {
    return res.status(403).json({
      success: false,
      message: "Bạn không có quyền thực hiện hành động này",
    });
  }

  next();
};

module.exports = adminMiddleware;
