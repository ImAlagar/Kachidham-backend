// backend/src/services/phonepeService.js
import crypto from "crypto";
import axios from "axios";

class PhonePeService {
  constructor() {
    this.merchantId = process.env.PHONEPAY_MERCHANT_ID
    this.saltKey = process.env.PHONEPAY_SALT_KEY
    this.saltIndex = process.env.PHONEPAY_SALT_INDEX || "1";
    this.baseUrl = process.env.PHONEPAY_BASE_URL || "https://api-preprod.phonepe.com/apis/pg-sandbox";
    this.callbackUrl = process.env.PHONEPAY_CALLBACK_URL || "http://localhost:5000";
  }

  generateXVerifyHeader(base64Payload) {
    // PhonePe specific format - VERY IMPORTANT
    const stringToHash = base64Payload + "/pg/v1/pay" + this.saltKey;
    
    
    const hash = crypto.createHash("sha256").update(stringToHash).digest("hex");
    const xVerify = hash + "###" + this.saltIndex;
    
    return xVerify;
  }

  async initiatePayment(orderData) {
    try {
      
      const { orderId, amount, userId, redirectUrl, callbackUrl } = orderData;

      if (!amount || amount <= 0) {
        throw new Error("Invalid payment amount: " + amount);
      }

      const merchantTransactionId = `MT${Date.now()}${Math.random()
        .toString(36)
        .substring(2, 8)
        .toUpperCase()}`;

      const payload = {
        merchantId: this.merchantId,
        merchantTransactionId,
        merchantUserId: `USER_${userId}`,
        amount: Math.round(amount * 100), // Convert to paise
        redirectUrl: redirectUrl || `${process.env.FRONTEND_URL}/payment-success`,
        redirectMode: "REDIRECT",
        callbackUrl: callbackUrl || `${this.callbackUrl}/api/orders/payment-callback`,
        paymentInstrument: { type: "PAY_PAGE" },
      };


      const payloadString = JSON.stringify(payload);
      const base64Payload = Buffer.from(payloadString).toString("base64");
      const xVerify = this.generateXVerifyHeader(base64Payload);

      
      const response = await axios.post(
        `${this.baseUrl}/pg/v1/pay`,
        { request: base64Payload },
        {
          headers: {
            "Content-Type": "application/json",
            "X-VERIFY": xVerify,
            "accept": "application/json",
          },
          timeout: 30000,
        }
      );
      if (response.data && response.data.success) {
        const redirectUrl = response.data.data?.instrumentResponse?.redirectInfo?.url;
        
        if (!redirectUrl) {
          throw new Error("No redirect URL received from PhonePe");
        }
        
        return {
          success: true,
          redirectUrl,
          merchantTransactionId,
          response: response.data
        };
      } else {
        throw new Error(response.data?.message || "Payment initiation failed");
      }
    } catch (err) {
      console.error("💥 PhonePe Payment Error:");
      console.error("   Error Message:", err.message);
      console.error("   Response Status:", err.response?.status);
      console.error("   Error Code:", err.response?.data?.code);
      console.error("   Error Message:", err.response?.data?.message);
      console.error("   Full Response:", err.response?.data);
      
      if (err.response?.data?.code === 'KEY_NOT_CONFIGURED') {
        throw new Error("PhonePe merchant credentials are invalid. Please use Cash on Delivery or contact support to activate PhonePe account.");
      } else if (err.response?.data?.message) {
        throw new Error(`PhonePe Error: ${err.response.data.message}`);
      } else if (err.code === 'ECONNREFUSED') {
        throw new Error("Cannot connect to PhonePe server. Please check your internet connection.");
      } else {
        throw new Error("Payment service temporarily unavailable. Please try Cash on Delivery.");
      }
    }
  }

  generateStatusXVerify(merchantTransactionId) {
    const endpoint = `/pg/v1/status/${this.merchantId}/${merchantTransactionId}`;
    const endpointPath = endpoint.startsWith("/") ? endpoint.slice(1) : endpoint;
    const stringToHash = endpointPath + this.saltKey;
    
    const hash = crypto.createHash("sha256").update(stringToHash).digest("hex");
    return hash + "###" + this.saltIndex;
  }

  async checkPaymentStatus(merchantTransactionId) {
    try {
      const xVerify = this.generateStatusXVerify(merchantTransactionId);
      
      const response = await axios.get(
        `${this.baseUrl}/pg/v1/status/${this.merchantId}/${merchantTransactionId}`,
        {
          headers: {
            "Content-Type": "application/json",
            "X-VERIFY": xVerify,
            "accept": "application/json",
          },
          timeout: 15000,
        }
      );
      
      return response.data;
    } catch (err) {
      console.error("💥 PhonePe Status Check Error:", err.response?.data || err.message);
      throw err;
    }
  }

  // Test method to verify credentials
  async testCredentials() {
    
    const testPayload = {
      merchantId: this.merchantId,
      merchantTransactionId: "TEST" + Date.now(),
      merchantUserId: "TEST_USER",
      amount: 100, // 1 rupee
      redirectUrl: "https://example.com/success",
      redirectMode: "REDIRECT",
      callbackUrl: "https://example.com/callback",
      paymentInstrument: { type: "PAY_PAGE" },
    };

    try {
      const payloadString = JSON.stringify(testPayload);
      const base64Payload = Buffer.from(payloadString).toString("base64");
      const xVerify = this.generateXVerifyHeader(base64Payload);

      const response = await axios.post(
        `${this.baseUrl}/pg/v1/pay`,
        { request: base64Payload },
        {
          headers: {
            "Content-Type": "application/json",
            "X-VERIFY": xVerify,
            "accept": "application/json",
          },
          timeout: 10000,
        }
      );

      return { success: true, data: response.data };
    } catch (error) {
      console.error('❌ PhonePe Test Failed:', error.response?.data);
      return { 
        success: false, 
        error: error.response?.data,
        message: error.response?.data?.message || 'Test failed'
      };
    }
  }
}

export default new PhonePeService();