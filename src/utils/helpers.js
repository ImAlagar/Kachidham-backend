export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export const generateOrderNumber = () => {
  const timestamp = Date.now().toString();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `ORD-${timestamp}-${random}`;
};

export const calculateDiscountedPrice = (price, discountType, discountValue, maxDiscount = null) => {
  let discount = 0;
  
  if (discountType === 'PERCENTAGE') {
    discount = (price * discountValue) / 100;
    if (maxDiscount && discount > maxDiscount) {
      discount = maxDiscount;
    }
  } else {
    discount = discountValue;
  }
  
  return Math.max(0, price - discount);
};

export const paginate = (page = 1, limit = 10) => {
  const skip = (page - 1) * limit;
  return { skip, take: limit };
};

export const response = (success, message, data = null) => ({
  success,
  message,
  data
});

export const calculateAverageRating = (ratings) => {
  if (!ratings || ratings.length === 0) return 0;
  const sum = ratings.reduce((acc, rating) => acc + rating.rating, 0);
  return (sum / ratings.length).toFixed(1);
};


export const generateTrackingNumber = () => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 5);
  return `TRK${timestamp}${random}`.toUpperCase();
};

export const formatTrackingResponse = (order) => {
  const currentStatus = order.trackingHistory[0]?.status || 'order_placed';
  
  return {
    orderId: order.id,
    orderNumber: order.orderNumber,
    trackingNumber: order.trackingNumber,
    currentStatus,
    carrier: order.carrier,
    trackingUrl: order.trackingUrl,
    estimatedDelivery: order.estimatedDelivery,
    customer: {
      name: order.name,
      email: order.email
    },
    shippingAddress: {
      address: order.address,
      city: order.city,
      state: order.state,
      pincode: order.pincode
    },
    items: order.orderItems.map(item => ({
      product: item.product.name,
      quantity: item.quantity,
      price: item.price,
      image: item.product.images[0]
    })),
    timeline: order.trackingHistory.map(event => ({
      status: event.status,
      description: event.description,
      location: event.location,
      timestamp: event.createdAt
    })),
    orderSummary: {
      subtotal: order.subtotal,
      shippingCost: order.shippingCost,
      discount: order.discount,
      totalAmount: order.totalAmount
    }
  };
};