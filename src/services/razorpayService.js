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


      let amountInPaise;
      
      // Determine if amount is in rupees or already in paise
      if (typeof amount === 'number') {
        if (amount < 1000) {
          // Amount is in rupees (like 260), convert to paise
          amountInPaise = Math.round(amount * 100);
        } else {
          // Amount is already in paise (like 26000)
          amountInPaise = Math.round(amount);
        }
      } else {
        // Handle string or other types
        const numericAmount = parseFloat(amount);
        if (numericAmount < 1000) {
          amountInPaise = Math.round(numericAmount * 100);
        } else {
          amountInPaise = Math.round(numericAmount);
        }
      }



      const options = {
        amount: amountInPaise, // ✅ CORRECT: Now it's in paise
        currency,
        receipt: `receipt_${Date.now()}`,
        notes: {
          amount_rupees: `₹${(amountInPaise / 100).toFixed(2)}`,
          amount_paise: amountInPaise
        }
      };

      const order = await this.razorpay.orders.create(options);
      
      logger.info(`✅ Razorpay order created: ${order.id}`, {
        'Order ID': order.id,
        'Amount (₹)': `₹${(order.amount / 100).toFixed(2)}`,
        'Amount (paise)': order.amount,
        'Currency': order.currency
      });

      
      return order;
    } catch (error) {
      logger.error('❌ Error creating Razorpay order:', error);
      console.error('❌ Razorpay createOrder error:', {
        message: error.message,
        amount: amount,
        error: error
      });
      throw new Error(`Failed to create payment order: ${error.message}`);
    }
  }

  // Also update refundPayment method
  async refundPayment(paymentId, amount, notes = {}) {
    try {
      // Determine if amount is in rupees or paise
      let amountInPaise;
      if (amount < 1000) {
        amountInPaise = Math.round(amount * 100);
      } else {
        amountInPaise = Math.round(amount);
      }


      const refund = await this.razorpay.payments.refund(paymentId, {
        amount: amountInPaise, // ✅ Use paise amount
        notes
      });
      
      logger.info(`✅ Refund processed: ${refund.id} for payment: ${paymentId}`, {
        'Refund ID': refund.id,
        'Amount (₹)': `₹${(refund.amount / 100).toFixed(2)}`,
        'Payment ID': paymentId
      });
      
      return refund;
    } catch (error) {
      logger.error('❌ Error processing refund:', error);
      console.error('❌ Refund error:', error);
      throw new Error(`Refund processing failed: ${error.message}`);
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
        logger.warn(`⚠️ Payment verification failed for order: ${razorpay_order_id}`);
      } else {
        logger.info(`✅ Payment verified successfully for order: ${razorpay_order_id}`);
      }
      
      return isValid;
    } catch (error) {
      logger.error('❌ Error verifying payment:', error);
      console.error('❌ Payment verification error:', error);
      return false;
    }
  }
}

export default new RazorpayService();