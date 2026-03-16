const crypto = require("crypto");

const Order = require("../models/orders");
const Cart = require("../models/carts");
const Product = require("../models/products");
const ProductVariant = require("../models/productVariants");
const Coupon = require("../models/coupons");
const sortObject = require("../utils/sortObject");

const createVNPayPaymentUrl = async ({ req, orderId, amount, orderInfo }) => {
  try {
    const ipAddr =
      req.headers["x-forwarded-for"] ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      req.connection.socket.remoteAddress ||
      "127.0.0.1";

    const tmnCode = process.env.VNPAY_TMN_CODE;
    const secretKey = process.env.VNPAY_SECRET_KEY;
    let vnpUrl = process.env.VNPAY_VNP_URL;
    const returnUrl = process.env.VNPAY_RETURN_URL;

    const date = new Date();
    const createDate = formatDate(date);
    const expiredDate = formatDate(new Date(date.getTime() + 15 * 60 * 1000));

    let vnp_Params = {};

    vnp_Params["vnp_Version"] = "2.1.0";
    vnp_Params["vnp_Command"] = "pay";
    vnp_Params["vnp_TmnCode"] = tmnCode;
    vnp_Params["vnp_Locale"] = "vn";
    vnp_Params["vnp_CurrCode"] = "VND";
    vnp_Params["vnp_TxnRef"] = orderId;
    vnp_Params["vnp_OrderInfo"] = orderInfo;
    vnp_Params["vnp_OrderType"] = "other";
    vnp_Params["vnp_Amount"] = amount * 100;
    vnp_Params["vnp_ReturnUrl"] = returnUrl;
    vnp_Params["vnp_IpAddr"] = ipAddr;
    vnp_Params["vnp_CreateDate"] = createDate;
    vnp_Params["vnp_ExpireDate"] = expiredDate;

    vnp_Params = sortObject(vnp_Params);

    const querystring = require("qs");
    const signData = querystring.stringify(vnp_Params, { encode: false });
    const hmac = crypto.createHmac("sha512", secretKey);
    const signed = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");
    vnp_Params["vnp_SecureHash"] = signed;

    vnpUrl += "?" + querystring.stringify(vnp_Params, { encode: false });

    return vnpUrl;
  } catch (error) {
    console.error("Create VNPay URL error:", error);
    return null;
  }
};

const formatDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${year}${month}${day}${hours}${minutes}${seconds}`;
};

const createOrder = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { paymentMethod, couponCode, fullName, phone, email, address, note } = req.body;

    if (!fullName || !phone || !email || !address) {
      return res.status(400).json({
        success: false,
        message: "Thiếu thông tin bắt buộc",
      });
    }

    if (!paymentMethod || !["COD", "VNPAY"].includes(paymentMethod)) {
      return res.status(400).json({
        success: false,
        message: "Phương thức thanh toán không hợp lệ",
      });
    }

    const cart = await Cart.findOne({ user: userId }).populate([
      { path: "items.product", select: "name" },
      { path: "items.variant", select: "size color price stock" },
    ]);

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Giỏ hàng trống",
      });
    }

    const productsOrder = [];
    let subtotal = 0;

    for (const item of cart.items) {
      const product = await Product.findById(item.product);
      if (!product) {
        return res.status(400).json({
          success: false,
          message: "Sản phẩm không tồn tại",
        });
      }

      const variant = await ProductVariant.findById(item.variant);
      if (!variant) {
        return res.status(400).json({
          success: false,
          message: "Biến thể không tồn tại",
        });
      }

      if (variant.stock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Không đủ hàng. Chỉ còn ${variant.stock} sản phẩm`,
        });
      }

      const variantName = variant.color ? `${variant.color.name} / ${variant.size}` : variant.size;

      productsOrder.push({
        product: item.product,
        productName: product.name,
        variant: item.variant,
        variantName: variantName,
        quantity: item.quantity,
        price: item.price,
      });

      subtotal += item.price * item.quantity;

      variant.stock -= item.quantity;
      await variant.save();

      product.totalStock -= item.quantity;
      await product.save();
    }

    let coupon = null;
    let discountAmount = 0;

    if (couponCode) {
      coupon = await Coupon.findOne({ code: couponCode.toUpperCase() });

      if (!coupon) {
        return res.status(400).json({
          success: false,
          message: "Mã giảm giá không hợp lệ",
        });
      }

      if (coupon.status !== "ACTIVE") {
        return res.status(400).json({
          success: false,
          message: "Mã giảm giá không còn hiệu lực",
        });
      }

      const now = new Date();
      if (now < coupon.validFrom || now > coupon.validTo) {
        return res.status(400).json({
          success: false,
          message: "Mã giảm giá đã hết hạn",
        });
      }

      if (subtotal < coupon.minOrderAmount) {
        return res.status(400).json({
          success: false,
          message: `Đơn hàng phải có giá trị tối thiểu ${coupon.minOrderAmount} VND`,
        });
      }

      if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
        return res.status(400).json({
          success: false,
          message: "Mã giảm giá đã hết lượt sử dụng",
        });
      }

      const hasUserUsedCoupon = coupon.usedBy.some(
        (id) => id.toString() === userId
      );
      if (hasUserUsedCoupon && !coupon.allowMultipleUsePerUser) {
        return res.status(400).json({
          success: false,
          message: "Bạn đã sử dụng mã giảm giá này rồi",
        });
      }

      if (coupon.type === "PERCENTAGE") {
        discountAmount = (subtotal * coupon.value) / 100;
        if (coupon.maxDiscountAmount && discountAmount > coupon.maxDiscountAmount) {
          discountAmount = coupon.maxDiscountAmount;
        }
      } else {
        discountAmount = coupon.value;
      }

      coupon.usedCount += 1;
      // Thêm userId vào danh sách đã sử dụng
      if (!coupon.usedBy.includes(userId)) {
        coupon.usedBy.push(userId);
      }
      await coupon.save();
    }

    const totalPrice = Math.max(0, subtotal - discountAmount);

    const order = new Order({
      customerName: fullName,
      customerEmail: email,
      customerPhone: phone,
      address,
      note: note || null,
      orderBy: userId,
      products: productsOrder,
      coupon: coupon ? coupon._id : null,
      discountAmount,
      subtotal,
      totalPrice,
      paymentMethod,
      paymentStatus: "UNPAID",
      status: "PENDING",
    });

    await order.save();
    await Cart.deleteOne({ user: userId });

    if (paymentMethod === "VNPAY") {
      const orderId = `LUMINA_${order._id}`;
      const paymentUrl = await createVNPayPaymentUrl({
        req,
        orderId,
        amount: totalPrice,
        orderInfo: `Thanh toán đơn hàng ${orderId}`,
      });

      if (!paymentUrl) {
        return res.status(500).json({
          success: false,
          message: "Lỗi tạo URL thanh toán VNPay",
        });
      }

      order.vnpTxnRef = orderId;
      await order.save();

      return res.status(201).json({
        success: true,
        message: "Tạo đơn hàng thành công",
        order: {
          _id: order._id,
          vnpTxnRef: order.vnpTxnRef,
        },
        paymentUrl,
      });
    }

    return res.status(201).json({
      success: true,
      message: "Tạo đơn hàng thành công",
      order: {
        _id: order._id,
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        customerPhone: order.customerPhone,
        address: order.address,
        note: order.note,
        products: order.products,
        subtotal: order.subtotal,
        discountAmount: order.discountAmount,
        totalPrice: order.totalPrice,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        status: order.status,
        createdAt: order.createdAt,
      },
    });
  } catch (error) {
    console.error("Create order error:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi server",
    });
  }
};

const getAllOrders = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      paymentStatus,
      search,
      sort = "createdAt:desc",
    } = req.query;

    const filter = {};

    if (status) {
      filter.status = status;
    }

    if (paymentStatus) {
      filter.paymentStatus = paymentStatus;
    }

    if (search) {
      filter.$or = [
        { customerName: { $regex: search, $options: "i" } },
        { customerEmail: { $regex: search, $options: "i" } },
        { customerPhone: { $regex: search, $options: "i" } },
        { orderCode: { $regex: search, $options: "i" } },
      ];
    }

    const [sortField, sortOrder] = sort.split(":");
    const sortObj = {};
    sortObj[sortField] = sortOrder === "asc" ? 1 : -1;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate("coupon", "code discountType value")
        .populate("orderBy", "name email")
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum),
      Order.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: orders,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error("Get all orders error:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi server",
    });
  }
};

const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await Order.findById(id)
      .populate("coupon")
      .populate("orderBy", "name email phone");

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Đơn hàng không tồn tại",
      });
    }

    return res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error) {
    console.error("Get order by ID error:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi server",
    });
  }
};

const confirmPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentStatus, status, vnpTransactionId } = req.body;
    const userId = req.user.userId;

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Đơn hàng không tồn tại",
      });
    }

    if (order.orderBy.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền cập nhật đơn hàng này",
      });
    }

    if (order.status !== "PENDING") {
      return res.status(400).json({
        success: false,
        message: "Chỉ có thể xác nhận thanh toán khi đơn hàng đang chờ xác nhận",
      });
    }

    if (paymentStatus === "PAID" && status === "CONFIRMED") {
      order.paymentStatus = "PAID";
      order.status = "CONFIRMED";
      if (vnpTransactionId) {
        order.vnpTransactionId = vnpTransactionId;
      }
    } else if (paymentStatus === "UNPAID" && status === "CANCELLED") {
      order.paymentStatus = "UNPAID";
      order.status = "CANCELLED";

      for (const item of order.products) {
        const variant = await ProductVariant.findById(item.variant);
        if (variant) {
          variant.stock += item.quantity;
          await variant.save();
        }

        const product = await Product.findById(item.product);
        if (product) {
          product.totalStock += item.quantity;
          await product.save();
        }
      }

      if (order.coupon) {
        const coupon = await Coupon.findById(order.coupon);
        if (coupon) {
          coupon.usedCount = Math.max(0, coupon.usedCount - 1);
          coupon.usedBy = coupon.usedBy.filter(
            (id) => id.toString() !== order.orderBy.toString()
          );
          await coupon.save();
        }
      }
    } else {
      return res.status(400).json({
        success: false,
        message: "Dữ liệu không hợp lệ",
      });
    }

    await order.save();

    return res.status(200).json({
      success: true,
      message: "Xác nhận thanh toán thành công",
      order,
    });
  } catch (error) {
    console.error("Confirm payment error:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi server",
    });
  }
};

const cancelOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Đơn hàng không tồn tại",
      });
    }

    if (order.orderBy.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền cập nhật đơn hàng này",
      });
    }

    if (!["PENDING", "CONFIRMED"].includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: "Chỉ có thể hủy đơn hàng đang chờ xác nhận hoặc đã xác nhận",
      });
    }

    order.status = "CANCELLED";
    order.paymentStatus = "UNPAID";

    for (const item of order.products) {
      const variant = await ProductVariant.findById(item.variant);
      if (variant) {
        variant.stock += item.quantity;
        await variant.save();
      }

      const product = await Product.findById(item.product);
      if (product) {
        product.totalStock += item.quantity;
        await product.save();
      }
    }

    if (order.coupon) {
      const coupon = await Coupon.findById(order.coupon);
      if (coupon) {
        coupon.usedCount = Math.max(0, coupon.usedCount - 1);
        coupon.usedBy = coupon.usedBy.filter(
          (id) => id.toString() !== order.orderBy.toString()
        );
        await coupon.save();
      }
    }

    await order.save();

    return res.status(200).json({
      success: true,
      message: "Hủy đơn hàng thành công",
      order,
    });
  } catch (error) {
    console.error("Cancel order error:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi server",
    });
  }
};

const updateOrderAdminStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Đơn hàng không tồn tại",
      });
    }

    const validStatuses = ["PENDING", "CONFIRMED", "SHIPPING", "DELIVERED", "CANCELLED"];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Trạng thái không hợp lệ",
      });
    }

    if (status) {
      if (status === "DELIVERED") {
        order.paymentStatus = "PAID";
      }

      if (status === "CANCELLED") {
        if (!["PENDING", "CONFIRMED"].includes(order.status)) {
          return res.status(400).json({
            success: false,
            message: "Không thể hủy đơn hàng đang giao hoặc đã giao",
          });
        }

        for (const item of order.products) {
          const variant = await ProductVariant.findById(item.variant);
          if (variant) {
            variant.stock += item.quantity;
            await variant.save();
          }

          const product = await Product.findById(item.product);
          if (product) {
            product.totalStock += item.quantity;
            await product.save();
          }
        }

        if (order.coupon) {
          const coupon = await Coupon.findById(order.coupon);
          if (coupon) {
            coupon.usedCount = Math.max(0, coupon.usedCount - 1);
            coupon.usedBy = coupon.usedBy.filter(
              (id) => id.toString() !== order.orderBy.toString()
            );
            await coupon.save();
          }
        }
      }

      order.status = status;
    }

    await order.save();

    return res.status(200).json({
      success: true,
      message: "Cập nhật trạng thái thành công",
      order,
    });
  } catch (error) {
    console.error("Update order admin status error:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi server",
    });
  }
};

const getMyOrders = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { page = 1, limit = 10, status, sort = "createdAt:desc" } = req.query;

    const filter = { orderBy: userId };

    if (status) {
      filter.status = status;
    }

    const [sortField, sortOrder] = sort.split(":");
    const sortObj = {};
    sortObj[sortField] = sortOrder === "asc" ? 1 : -1;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate("coupon", "code")
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum),
      Order.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: orders,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error("Get my orders error:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi server",
    });
  }
};

const getMyOrderById = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const order = await Order.findOne({ _id: id, orderBy: userId })
      .populate("coupon")
      .populate("orderBy", "name email phone")
      .populate({
        path: "products.product",
        select: "name images",
      })
      .populate({
        path: "products.variant",
        select: "size color images",
      });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Đơn hàng không tồn tại",
      });
    }

    return res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error) {
    console.error("Get my order by ID error:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi server",
    });
  }
};

module.exports = {
  createOrder,
  getAllOrders,
  getMyOrders,
  getMyOrderById,
  getOrderById,
  confirmPayment,
  cancelOrder,
  updateOrderAdminStatus,
};
