import emailService from './emailService.js';
import { emailTemplates } from '../utils/emailTemplates.js';
import { EmailValidator } from '../utils/emailValidator.js';
import logger from '../utils/logger.js';

class EmailNotificationService {
  constructor() {
    this.isValidEmail = (email) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(email);
    };
  }

  async sendContactNotification(contactData) {
    try {
      const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_USER;
      
      // Enhanced validation
      if (!adminEmail || !this.isValidEmail(adminEmail)) {
        throw new Error(`Invalid admin email address: ${adminEmail}`);
      }

      if (!contactData || !contactData.email || !this.isValidEmail(contactData.email)) {
        throw new Error(`Invalid contact email: ${contactData?.email}`);
      }

      const template = emailTemplates.contactNotification(contactData);
            
      const result = await emailService.sendEmail({
        to: adminEmail,
        subject: template.subject,
        html: template.html,
        text: template.text,
        from: `"Kachidham Fashions Contact" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`
      });
      
      return result;
      
    } catch (error) {
      console.error('❌ Contact Notification Failed:', {
        error: error.message,
        contactData: {
          name: contactData?.name,
          email: contactData?.email,
          phone: contactData?.phone,
          messageLength: contactData?.message?.length
        },
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }

  // NEW METHOD: Send wholesaler approval notification
  async sendWholesalerApprovalNotification(wholesalerData) {
    try {
      const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_USER;
      
      // Enhanced validation
      if (!adminEmail || !this.isValidEmail(adminEmail)) {
        throw new Error(`Invalid admin email address: ${adminEmail}`);
      }

      if (!wholesalerData || !wholesalerData.email || !this.isValidEmail(wholesalerData.email)) {
        throw new Error(`Invalid wholesaler email: ${wholesalerData?.email}`);
      }

      const template = emailTemplates.wholesalerApprovalNotification(wholesalerData);
            
      const result = await emailService.sendEmail({
        to: adminEmail,
        subject: template.subject,
        html: template.html,
        text: template.text,
        from: `"Kachidham Fashions Wholesaler" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`
      });
      
      return result;
      
    } catch (error) {
      console.error('❌ Wholesaler Approval Notification Failed:', {
        error: error.message,
        wholesalerData: {
          businessName: wholesalerData?.businessName,
          email: wholesalerData?.email,
          contactPerson: wholesalerData?.contactPerson,
          phone: wholesalerData?.phone
        },
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }

  // Optional: Send auto-reply to the wholesaler
  async sendWholesalerAutoReply(wholesalerData) {
    try {
      if (!wholesalerData?.email || !this.isValidEmail(wholesalerData.email)) {
        return;
      }

      const template = emailTemplates.wholesalerAutoReply(wholesalerData);
      
      const result = await emailService.sendEmail({
        to: wholesalerData.email,
        subject: template.subject,
        html: template.html,
        text: template.text,
        from: `"Kachidham Fashions Wholesaler" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`
      });
      
      return result;
      
    } catch (error) {
      console.error('❌ Wholesaler auto-reply failed:', error.message);
      // Don't throw error for auto-reply failure
    }
  }

  // Optional: Send approval confirmation to wholesaler
  async sendWholesalerApprovalConfirmation(wholesalerData) {
    try {
      if (!wholesalerData?.email || !this.isValidEmail(wholesalerData.email)) {
        return;
      }

      const template = emailTemplates.wholesalerApprovalConfirmation(wholesalerData);
      
      const result = await emailService.sendEmail({
        to: wholesalerData.email,
        subject: template.subject,
        html: template.html,
        text: template.text,
        from: `"Kachidham Fashions Wholesaler" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`
      });
      
      return result;
      
    } catch (error) {
      console.error('❌ Wholesaler approval confirmation failed:', error.message);
      // Don't throw error for confirmation email failure
    }
  }

  // Optional: Send auto-reply to the person who contacted
  async sendContactAutoReply(contactData) {
    try {
      if (!contactData?.email || !this.isValidEmail(contactData.email)) {
        return;
      }

      const template = emailTemplates.contactAutoReply(contactData);
      
      const result = await emailService.sendEmail({
        to: contactData.email,
        subject: template.subject,
        html: template.html,
        text: template.text,
        from: `"Kachidham Fashions" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`
      });
      
      return result;
      
    } catch (error) {
      console.error('❌ Contact auto-reply failed:', error.message);
      // Don't throw error for auto-reply failure
    }
  }

  async sendWelcomeEmail(userData) {
    try {
      const template = emailTemplates.welcomeEmail(userData);
      
      // Validate email content for spam triggers
      const warnings = EmailValidator.validateEmailContent(
        template.subject, 
        template.html, 
        template.text
      );
      
      if (warnings.length > 0) {
        console.warn('⚠️ Email content warnings:', warnings);
      }
      
      const result = await emailService.sendEmail({
        to: userData.email,
        subject: template.subject,
        html: template.html,
        text: template.text
      });
      
      return result;
      
    } catch (error) {
      console.error('❌ Welcome email failed:', error.message);
      throw error;
    }
  }


  async sendPasswordReset(userData, resetUrl) {
    try {
      const template = emailTemplates.passwordReset(userData, resetUrl);
      
      const result = await emailService.sendEmail({
        to: userData.email,
        subject: template.subject,
        html: template.html,
        text: template.text
      });
      
      return result;
      
    } catch (error) {
      console.error('❌ Password reset email failed:', error.message);
      throw error;
    }
  }

  async sendPasswordChangedConfirmation(userData) {
    try {
      const template = emailTemplates.passwordChangedConfirmation(userData);
      
      const result = await emailService.sendEmail({
        to: userData.email,
        subject: template.subject,
        html: template.html,
        text: template.text
      });
      
      return result;
      
    } catch (error) {
      console.error('❌ Password changed confirmation failed:', error.message);
      // Don't throw error for confirmation email failure
    }
  }


  async sendAdminPasswordReset(adminData, resetUrl) {
  try {
    const template = emailTemplates.adminPasswordReset(adminData, resetUrl);
    
    const result = await emailService.sendEmail({
      to: adminData.email,
      subject: template.subject,
      html: template.html,
      text: template.text,
      from: `"Kachidham Fashions Admin Security" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`
    });
    
    return result;
    
  } catch (error) {
    console.error('❌ Admin password reset email failed:', error.message);
    throw error;
  }
}

async sendAdminPasswordChangedConfirmation(adminData) {
  try {
    const template = emailTemplates.adminPasswordChangedConfirmation(adminData);
    
    const result = await emailService.sendEmail({
      to: adminData.email,
      subject: template.subject,
      html: template.html,
      text: template.text,
      from: `"Kachidham Fashions Admin Security" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`
    });
    
    return result;
    
  } catch (error) {
    console.error('❌ Admin password changed confirmation failed:', error.message);
    // Don't throw error for confirmation email failure
  }
}


  async sendOrderConfirmationCustomer(orderData) {
    try {
      const template = emailTemplates.orderConfirmationCustomer(orderData);
      
      const result = await emailService.sendEmail({
        to: orderData.email,
        subject: template.subject,
        html: template.html,
        text: template.text,
        from: `"Kachidham Fashions Orders" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`
      });
      
      return result;
      
    } catch (error) {
      console.error('❌ Order confirmation email to customer failed:', error.message);
      // Don't throw error - order should complete even if email fails
    }
  }

  async sendOrderConfirmationAdmin(orderData) {
    try {
      const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_USER;
      
      if (!adminEmail) {
        console.warn('⚠️ Admin email not configured, skipping admin notification');
        return;
      }

      const template = emailTemplates.orderConfirmationAdmin(orderData);
      
      const result = await emailService.sendEmail({
        to: adminEmail,
        subject: template.subject,
        html: template.html,
        text: template.text,
        from: `"Kachidham Fashions Orders" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`
      });
      
      return result;
      
    } catch (error) {
      console.error('❌ Order notification email to admin failed:', error.message);
      // Don't throw error - order should complete even if email fails
    }
  }

  async sendOrderStatusUpdate(orderData, oldStatus, newStatus) {
    try {
      const template = emailTemplates.orderStatusUpdate(orderData, oldStatus, newStatus);
      
      const result = await emailService.sendEmail({
        to: orderData.email,
        subject: template.subject,
        html: template.html,
        text: template.text,
        from: `"Kachidham Fashions Orders" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`
      });
      
      return result;
      
    } catch (error) {
      console.error('❌ Order status update email failed:', error.message);
      // Don't throw error - continue even if email fails
    }
  }

  async sendOrderRefundNotification(orderData, refundData) {
    try {
      const template = emailTemplates.orderRefundNotification(orderData, refundData);
      
      const result = await emailService.sendEmail({
        to: orderData.email,
        subject: template.subject,
        html: template.html,
        text: template.text,
        from: `"Kachidham Fashions Orders" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`
      });
      
      return result;
      
    } catch (error) {
      console.error('❌ Order refund notification email failed:', error.message);
      // Don't throw error - continue even if email fails
    }
  }

  async sendOrderNotifications(orderData) {
      try {

          if (orderData.orderItems) {
              orderData.orderItems.forEach((item, index) => {
              });
          }

          // Send to customer
          await this.sendOrderConfirmationCustomer(orderData);
          
          // Send to admin
          await this.sendOrderConfirmationAdmin(orderData);
          
          logger.info(`Order notifications sent for: ${orderData.orderNumber}`);
          
      } catch (error) {
          console.error('❌ Order notifications failed:', error.message);
          // Continue even if notifications fail
      }
  }


  async sendCustomNotification(to, subject, content) {
    try {
      const result = await emailService.sendEmail({
        to,
        subject,
        html: content
      });
      
      return result;
      
    } catch (error) {
      console.error('❌ Custom notification failed:', error.message);
      throw error;
    }
  }



}

export default new EmailNotificationService();