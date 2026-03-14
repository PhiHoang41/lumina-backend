const Cart = require("../models/carts");
const Product = require("../models/products");
const ProductVariant = require("../models/productVariants");

const addToCart = async (req, res) => {
  try {
    const { productId, variantId, quantity } = req.body;
    const userId = req.user.userId;

    if (!productId || !variantId || !quantity) {
      return res.status(400).json({
        success: false,
        message: "Thiếu thông tin bắt buộc: productId, variantId, quantity",
      });
    }

    if (quantity < 1) {
      return res.status(400).json({
        success: false,
        message: "Số lượng phải lớn hơn 0",
      });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(400).json({
        success: false,
        message: "Sản phẩm không tồn tại",
      });
    }

    const variant = await ProductVariant.findOne({
      _id: variantId,
      product: productId,
      isActive: true,
    });

    if (!variant) {
      return res.status(400).json({
        success: false,
        message: "Biến thể sản phẩm không tồn tại",
      });
    }

    let existingCart = await Cart.findOne({ user: userId });
    let currentQuantityInCart = 0;

    if (existingCart) {
      const existingItem = existingCart.items.find(
        (item) =>
          item.product.toString() === productId &&
          item.variant.toString() === variantId
      );
      if (existingItem) {
        currentQuantityInCart = existingItem.quantity;
      }
    }

    const totalQuantityRequested = currentQuantityInCart + quantity;

    if (variant.stock < totalQuantityRequested) {
      return res.status(400).json({
        success: false,
        message: `Không đủ hàng trong kho. Hiện chỉ còn ${variant.stock} sản phẩm`,
      });
    }

    let cart = await Cart.findOne({ user: userId });

    if (!cart) {
      cart = new Cart({
        user: userId,
        items: [],
        totalItems: 0,
      });
    }

    const existingItemIndex = cart.items.findIndex(
      (item) =>
        item.product.toString() === productId &&
        item.variant.toString() === variantId
    );

    if (existingItemIndex > -1) {
      cart.items[existingItemIndex].quantity += quantity;
      cart.items[existingItemIndex].price = variant.price;
    } else {
      cart.items.push({
        product: productId,
        variant: variantId,
        quantity: quantity,
        price: variant.price,
      });
    }

    cart.totalItems = cart.items.reduce((total, item) => total + item.quantity, 0);

    await cart.save();

    await cart.populate([
      { path: "items.product", select: "name images" },
      { path: "items.variant", select: "size color price" },
    ]);

    return res.status(200).json({
      success: true,
      message: "Đã thêm vào giỏ hàng",
      cart: {
        _id: cart._id,
        user: cart.user,
        items: cart.items,
        totalItems: cart.totalItems,
        totalPrice: cart.totalPrice,
      },
    });
  } catch (error) {
    console.error("Add to cart error:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi server",
    });
  }
};

const getCart = async (req, res) => {
  try {
    const userId = req.user.userId;

    const cart = await Cart.findOne({ user: userId }).populate([
      { path: "items.product", select: "name images" },
      { path: "items.variant", select: "size color price stock" },
    ]);

    if (!cart || cart.items.length === 0) {
      return res.status(200).json({
        success: true,
        message: "Giỏ hàng trống",
        cart: {
          _id: null,
          user: userId,
          items: [],
          totalItems: 0,
          totalPrice: 0,
        },
      });
    }

    return res.status(200).json({
      success: true,
      message: "Lấy giỏ hàng thành công",
      cart: {
        _id: cart._id,
        user: cart.user,
        items: cart.items,
        totalItems: cart.totalItems,
        totalPrice: cart.totalPrice,
      },
    });
  } catch (error) {
    console.error("Get cart error:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi server",
    });
  }
};

const removeFromCart = async (req, res) => {
  try {
    const { productId, variantId } = req.body;
    const userId = req.user.userId;

    if (!productId || !variantId) {
      return res.status(400).json({
        success: false,
        message: "Thiếu thông tin bắt buộc: productId, variantId",
      });
    }

    const cart = await Cart.findOne({ user: userId });

    if (!cart) {
      return res.status(400).json({
        success: false,
        message: "Giỏ hàng trống",
      });
    }

    const itemIndex = cart.items.findIndex(
      (item) =>
        item.product.toString() === productId &&
        item.variant.toString() === variantId
    );

    if (itemIndex === -1) {
      return res.status(400).json({
        success: false,
        message: "Sản phẩm không có trong giỏ hàng",
      });
    }

    cart.items.splice(itemIndex, 1);
    cart.totalItems = cart.items.reduce((total, item) => total + item.quantity, 0);

    await cart.save();

    await cart.populate([
      { path: "items.product", select: "name images" },
      { path: "items.variant", select: "size color price" },
    ]);

    return res.status(200).json({
      success: true,
      message: "Đã xóa sản phẩm khỏi giỏ hàng",
      cart: {
        _id: cart._id,
        user: cart.user,
        items: cart.items,
        totalItems: cart.totalItems,
        totalPrice: cart.totalPrice,
      },
    });
  } catch (error) {
    console.error("Remove from cart error:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi server",
    });
  }
};

const updateCartItem = async (req, res) => {
  try {
    const { productId, variantId, quantity } = req.body;
    const userId = req.user.userId;

    if (!productId || !variantId || quantity === undefined) {
      return res.status(400).json({
        success: false,
        message: "Thiếu thông tin bắt buộc: productId, variantId, quantity",
      });
    }

    if (quantity < 1) {
      return res.status(400).json({
        success: false,
        message: "Số lượng phải lớn hơn 0",
      });
    }

    const variant = await ProductVariant.findOne({
      _id: variantId,
      product: productId,
      isActive: true,
    });

    if (!variant) {
      return res.status(400).json({
        success: false,
        message: "Biến thể sản phẩm không tồn tại",
      });
    }

    if (variant.stock < quantity) {
      return res.status(400).json({
        success: false,
        message: `Không đủ hàng trong kho. Hiện chỉ còn ${variant.stock} sản phẩm`,
      });
    }

    const cart = await Cart.findOne({ user: userId });

    if (!cart) {
      return res.status(400).json({
        success: false,
        message: "Giỏ hàng trống",
      });
    }

    const itemIndex = cart.items.findIndex(
      (item) =>
        item.product.toString() === productId &&
        item.variant.toString() === variantId
    );

    if (itemIndex === -1) {
      return res.status(400).json({
        success: false,
        message: "Sản phẩm không có trong giỏ hàng",
      });
    }

    cart.items[itemIndex].quantity = quantity;
    cart.items[itemIndex].price = variant.price;
    cart.totalItems = cart.items.reduce((total, item) => total + item.quantity, 0);

    await cart.save();

    await cart.populate([
      { path: "items.product", select: "name images" },
      { path: "items.variant", select: "size color price" },
    ]);

    return res.status(200).json({
      success: true,
      message: "Đã cập nhật số lượng",
      cart: {
        _id: cart._id,
        user: cart.user,
        items: cart.items,
        totalItems: cart.totalItems,
        totalPrice: cart.totalPrice,
      },
    });
  } catch (error) {
    console.error("Update cart item error:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi server",
    });
  }
};

module.exports = {
  addToCart,
  getCart,
  removeFromCart,
  updateCartItem,
};
