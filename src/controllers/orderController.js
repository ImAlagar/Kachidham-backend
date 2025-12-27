import orderService from '../services/orderService.js';
import phonepeService from '../services/phonepeService.js';
import razorpayService from '../services/razorpayService.js';
import { asyncHandler } from '../utils/helpers.js';
import logger from '../utils/logger.js';


// Calculate order totals with quantity pricing
export const calculateOrderTotals = asyncHandler(async (req, res) => {
  const { orderItems, couponCode } = req.body;
  
  if (!orderItems || !Array.isArray(orderItems) || orderItems.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Order items are required'
    });
  }
  
  const totals = await orderService.calculateOrderTotals(orderItems, couponCode);
  
  res.status(200).json({
    success: true,
    data: totals
  });
});


// Initiate Razorpay payment with quantity pricing
export const initiatePayment = asyncHandler(async (req, res) => {
  const { orderData } = req.body;
  orderData.userId = req.user.id;

  const result = await orderService.initiateRazorpayPayment(orderData);
  
  res.status(200).json({
    success: true,
    message: 'Payment initiated successfully',
    data: {
      ...result,
      quantitySavings: result.tempOrderData.totals.quantitySavings,
      hasQuantityDiscounts: result.tempOrderData.totals.hasQuantityDiscounts
    }
  });
});


export const verifyPaymentAndCreateOrder = asyncHandler(async (req, res) => {
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    orderData
  } = req.body;

  const paymentData = {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    orderData: {
      ...orderData,
      userId: req.user.id
    }
  };

  const order = await orderService.verifyAndCreateOrder(paymentData);
  
  res.status(201).json({
    success: true,
    message: 'Order created successfully',
    data: order // The order now includes quantitySavings and hasQuantityDiscounts directly
  });
});

// Create COD order with quantity pricing
export const createCODOrder = asyncHandler(async (req, res) => {
  const { orderData } = req.body;
  orderData.userId = req.user.id;

  const order = await orderService.createCODOrder(orderData);
  
  res.status(201).json({
    success: true,
    message: 'COD order created successfully',
    data: order // The order now includes quantitySavings and hasQuantityDiscounts directly
  });
});

// Get order with quantity discount details
export const getOrderById = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  
  const order = await orderService.getOrderById(orderId);
  
  // Parse quantity discount details from notes
  const notes = JSON.parse(order.notes || '{}');
  
  res.status(200).json({
    success: true,
    data: {
      ...order,
      quantitySavings: notes.quantitySavings || 0,
      hasQuantityDiscounts: notes.hasQuantityDiscounts || false,
      quantityDiscountBreakdown: notes.quantityDiscountBreakdown || []
    }
  });
});

// Get order by order number with quantity discount details
export const getOrderByOrderNumber = asyncHandler(async (req, res) => {
  const { orderNumber } = req.params;
  
  const order = await orderService.getOrderByOrderNumber(orderNumber);
  
  // Parse quantity discount details from notes
  const notes = JSON.parse(order.notes || '{}');
  
  res.status(200).json({
    success: true,
    data: {
      ...order,
      quantitySavings: notes.quantitySavings || 0,
      hasQuantityDiscounts: notes.hasQuantityDiscounts || false,
      quantityDiscountBreakdown: notes.quantityDiscountBreakdown || []
    }
  });
});

// Get user orders with quantity discount details
export const getUserOrders = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status } = req.query;
  const userId = req.user.id;
  
  const result = await orderService.getUserOrders(userId, {
    page: parseInt(page),
    limit: parseInt(limit),
    status
  });
  
  // Add quantity discount details to each order
  const ordersWithQuantityDetails = result.orders.map(order => {
    const notes = JSON.parse(order.notes || '{}');
    return {
      ...order,
      quantitySavings: notes.quantitySavings || 0,
      hasQuantityDiscounts: notes.hasQuantityDiscounts || false
    };
  });
  
  res.status(200).json({
    success: true,
    data: {
      ...result,
      orders: ordersWithQuantityDetails
    }
  });
});

export const getAllOrders = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status, userId, paymentStatus } = req.query;
  
  const result = await orderService.getAllOrders({
    page: parseInt(page),
    limit: parseInt(limit),
    status,
    userId,
    paymentStatus
  });
  
  res.status(200).json({
    success: true,
    data: result
  });
});


export const updateOrderStatus = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const { status, adminNotes } = req.body;
  
  const updatedOrder = await orderService.updateOrderStatus(orderId, {
    status,
    adminNotes
  });
  
  res.status(200).json({
    success: true,
    message: 'Order status updated successfully',
    data: updatedOrder
  });
});

export const updateTrackingInfo = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const { trackingNumber, carrier, trackingUrl, estimatedDelivery } = req.body;
  
  const updatedOrder = await orderService.updateTrackingInfo(orderId, {
    trackingNumber,
    carrier,
    trackingUrl,
    estimatedDelivery
  });
  
  res.status(200).json({
    success: true,
    message: 'Tracking information updated successfully',
    data: updatedOrder
  });
});

export const processRefund = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const { refundAmount, reason, adminNotes } = req.body;
  
  const result = await orderService.processRefund(orderId, {
    refundAmount,
    reason,
    adminNotes
  });
  
  res.status(200).json({
    success: true,
    message: 'Refund processed successfully',
    data: result
  });
});



export const getOrderStats = asyncHandler(async (req, res) => {
  const stats = await orderService.getOrderStats();
  
  res.status(200).json({
    success: true,
    data: stats
  });
});




export const handlePaymentCallback = asyncHandler(async (req, res) => {
  const callbackData = req.body;
  
  try {
    const order = await orderService.handlePhonePeCallback(callbackData);
    
    res.status(200).json({
      success: true,
      message: 'Payment callback processed successfully',
      data: order
    });
  } catch (error) {
    logger.error('Payment callback error:', error);
    
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

export const checkPaymentStatus = asyncHandler(async (req, res) => {
  const { merchantTransactionId } = req.params;
  
  const order = await prisma.order.findFirst({
    where: { phonepeMerchantTransactionId: merchantTransactionId },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      paymentStatus: true,
      phonepeResponseCode: true,
      phonepeResponseMessage: true
    }
  });
  
  if (!order) {
    return res.status(404).json({
      success: false,
      message: 'Order not found'
    });
  }
  
  res.status(200).json({
    success: true,
    data: order
  });
});




// Add to your orderController.js
export const testPhonePeIntegration = asyncHandler(async (req, res) => {
  try {
    
    // Test with minimal amount (₹1)
    const testData = {
      orderId: 'test-' + Date.now(),
      amount: 1, // ₹1 for testing
      userId: 'test-user',
      redirectUrl: 'http://localhost:5173/payment-success',
      callbackUrl: 'http://localhost:5000/api/orders/payment-callback'
    };

    const result = await phonepeService.initiatePayment(testData);
    
    res.status(200).json({
      success: true,
      message: 'PhonePe integration working!',
      data: result
    });
  } catch (error) {
    console.error('❌ PhonePe Test Failed:', error.message);
    
    res.status(400).json({
      success: false,
      message: 'PhonePe test failed',
      error: error.message,
      details: error.response?.data
    });
  }
});

