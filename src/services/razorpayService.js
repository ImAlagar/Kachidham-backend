// services/razorpayService.js
import Razorpay from 'razorpay';
import crypto from 'crypto';
import logger from '../utils/logger.js';

class RazorpayService {
  constructor() {
    this.razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET
    });
  }

  async createOrder(amount, currency = 'INR') {
    try {
      const options = {
        amount: amount * 100, // Razorpay expects amount in paise
        currency,
        receipt: `receipt_${Date.now()}`
      };

      const order = await this.razorpay.orders.create(options);
      logger.info(`Razorpay order created: ${order.id}`);
      return order;
    } catch (error) {
      logger.error('Error creating Razorpay order:', error);
      throw new Error('Failed to create payment order');
    }
  }

  verifyPayment(razorpay_order_id, razorpay_payment_id, razorpay_signature) {
    try {
      const body = razorpay_order_id + "|" + razorpay_payment_id;
      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(body.toString())
        .digest('hex');

      const isValid = expectedSignature === razorpay_signature;
      
      if (!isValid) {
        logger.warn(`Payment verification failed for order: ${razorpay_order_id}`);
      } else {
        logger.info(`Payment verified successfully for order: ${razorpay_order_id}`);
      }
      
      return isValid;
    } catch (error) {
      logger.error('Error verifying payment:', error);
      return false;
    }
  }

  async refundPayment(paymentId, amount, notes = {}) {
    try {
      const refund = await this.razorpay.payments.refund(paymentId, {
        amount: amount * 100,
        notes
      });
      
      logger.info(`Refund processed: ${refund.id} for payment: ${paymentId}`);
      return refund;
    } catch (error) {
      logger.error('Error processing refund:', error);
      throw new Error('Refund processing failed');
    }
  }
}

export default new RazorpayService();