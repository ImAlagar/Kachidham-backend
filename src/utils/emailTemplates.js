export const emailTemplates = {

    contactNotification: (contactData) => {
        const escapeHtml = (text) => {
        if (!text) return '';
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
        };

        const formatMessage = (message) => {
        if (!message) return 'No message provided';
        return escapeHtml(message).replace(/\n/g, '<br>');
        };

        const currentDate = new Date().toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short'
        });

        return {
        subject: `New Contact Form Submission - ${contactData.name || 'Unknown User'}`,
        html: `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Contact Form Submission</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background: #f6f6f6; padding: 20px; }
            .container { max-width: 650px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
            .header { background: linear(135deg, #2d5e2d 0%, #3a7c3a 100%); padding: 30px 20px; text-align: center; color: #ffffff; }
            .header h1 { font-size: 24px; font-weight: 600; margin-bottom: 8px; }
            .header p { font-size: 14px; opacity: 0.9; }
            .content { padding: 30px; }
            .alert-badge { background: #e8f5e8; color: #2d5e2d; padding: 12px 16px; border-radius: 8px; margin-bottom: 24px; border-left: 4px solid #2d5e2d; }
            .contact-info { background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0; }
            .info-item { display: flex; margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid #e9ecef; }
            .info-item:last-child { margin-bottom: 0; padding-bottom: 0; border-bottom: none; }
            .info-label { font-weight: 600; color: #495057; min-width: 120px; }
            .info-value { color: #212529; flex: 1; }
            .message-section { background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 20px; margin: 24px 0; }
            .message-label { font-weight: 600; color: #856404; margin-bottom: 8px; }
            .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #6c757d; font-size: 12px; border-top: 1px solid #e9ecef; }
            .action-buttons { margin-top: 24px; text-align: center; }
            .btn { display: inline-block; padding: 10px 20px; margin: 0 8px; background: #2d5e2d; color: white; text-decoration: none; border-radius: 6px; font-size: 14px; }
            .btn-outline { background: transparent; border: 1px solid #2d5e2d; color: #2d5e2d; }
            @media (max-width: 600px) {
                .container { border-radius: 0; }
                .content { padding: 20px; }
                .info-item { flex-direction: column; }
                .info-label { margin-bottom: 4px; }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>📩 New Contact Form Submission</h1>
                <p>Kachidham Fashions Website</p>
            </div>
            
            <div class="content">
                <div class="alert-badge">
                    <strong>Action Required:</strong> A new contact form submission has been received and requires your attention.
                </div>
                
                <div class="contact-info">
                    <h3 style="color: #2d5e2d; margin-bottom: 16px;">👤 Contact Details</h3>
                    
                    <div class="info-item">
                        <span class="info-label">Full Name:</span>
                        <span class="info-value">${escapeHtml(contactData.name) || 'Not provided'}</span>
                    </div>
                    
                    <div class="info-item">
                        <span class="info-label">Email Address:</span>
                        <span class="info-value">
                            <a href="mailto:${contactData.email}" style="color: #2d5e2d; text-decoration: none;">
                                ${contactData.email}
                            </a>
                        </span>
                    </div>
                    
                    <div class="info-item">
                        <span class="info-label">Phone Number:</span>
                        <span class="info-value">${contactData.phone ? escapeHtml(contactData.phone) : 'Not provided'}</span>
                    </div>
                    
                    <div class="info-item">
                        <span class="info-label">Submission Time:</span>
                        <span class="info-value">${currentDate}</span>
                    </div>
                </div>
                
                <div class="message-section">
                    <div class="message-label">📝 Message Content:</div>
                    <div style="color: #856404; line-height: 1.5;">
                        ${formatMessage(contactData.message)}
                    </div>
                </div>
                
                <div class="action-buttons">
                    <a href="mailto:${contactData.email}" class="btn">✉️ Reply to ${contactData.name?.split(' ')[0] || 'Customer'}</a>
                    <a href="tel:${contactData.phone}" class="btn btn-outline" style="${!contactData.phone ? 'display: none;' : ''}">📞 Call Customer</a>
                </div>
            </div>
            
            <div class="footer">
                <p>This is an automated notification from Kachidham Fashions Contact System</p>
                <p style="margin-top: 8px;">Please do not reply to this email. Use the reply button above to respond to the customer.</p>
            </div>
        </div>
    </body>
    </html>
        `,
        text: `
    NEW CONTACT FORM SUBMISSION - Kachidham Fashions

    A new contact form submission has been received:

    CONTACT DETAILS:
    ---------------
    Name: ${contactData.name || 'Not provided'}
    Email: ${contactData.email}
    Phone: ${contactData.phone || 'Not provided'}
    Time: ${currentDate}

    MESSAGE:
    --------
    ${contactData.message || 'No message provided'}

    Please respond to this inquiry promptly.

    This is an automated notification from Kachidham Fashions.
        `.trim()
        };
    },

    contactAutoReply: (contactData) => ({
        subject: 'Thank You for Contacting Kachidham Fashions',
        html: `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { text-align: center; margin-bottom: 30px; color: #2d5e2d; }
            .content { background: #f9f9f9; padding: 20px; border-radius: 8px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Thank You for Contacting Us!</h1>
            </div>
            <div class="content">
                <p>Dear ${contactData.name || 'Valued Customer'},</p>
                <p>Thank you for reaching out to Kachidham Fashions. We have received your message and our team will get back to you within 24-48 hours.</p>
                <p>For urgent inquiries, please call us at [Your Phone Number].</p>
                <p>Best regards,<br>Kachidham Fashions Team</p>
            </div>
        </div>
    </body>
    </html>
        `,
        text: `
    Thank you for contacting Kachidham Fashions!

    Dear ${contactData.name || 'Valued Customer'},

    Thank you for reaching out to us. We have received your message and our team will get back to you within 24-48 hours.

    For urgent inquiries, please call us at [Your Phone Number].

    Best regards,
    Kachidham Fashions Team
        `.trim()
    }),

    welcomeEmail: (userData) => {
    const currentYear = new Date().getFullYear();
    const domain = process.env.DOMAIN_NAME || 'Kachidham Fashions.com';
    const frontendUrl = process.env.FRONTEND_URL || `https://${domain}`;
    
    return {
        // ✅ Fixed subject line - remove excessive emojis
        subject: `Welcome to Kachidham Fashions - Get Started with Organic Living`,
        
        html: `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to Kachidham Fashions</title>
        <style>
            /* Reset and basic styles */
            body { font-family: Arial, Helvetica, sans-serif; line-height: 1.6; color: #333333; margin: 0; padding: 0; background-color: #f6f6f6; }
            .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
            .header { background: #2d5e2d; padding: 30px 20px; text-align: center; color: #ffffff; }
            .header h1 { font-size: 24px; margin: 0 0 10px 0; font-weight: bold; }
            .content { padding: 30px; }
            .footer { background: #f5f5f5; padding: 20px; text-align: center; font-size: 12px; color: #666666; }
            
            /* Content styles */
            .welcome-text { margin-bottom: 25px; }
            .features { margin: 25px 0; }
            .feature-item { margin-bottom: 15px; padding-left: 20px; }
            .cta-button { display: inline-block; padding: 12px 25px; background: #2d5e2d; color: #ffffff; text-decoration: none; border-radius: 4px; margin: 20px 0; }
            .account-info { background: #f8f8f8; padding: 15px; margin: 20px 0; border-left: 4px solid #2d5e2d; }
            
            /* Mobile responsive */
            @media only screen and (max-width: 600px) {
                .container { width: 100% !important; }
                .content { padding: 20px !important; }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <!-- Header -->
            <div class="header">
                <h1>Welcome to Kachidham Fashions</h1>
                <p>Your Journey to Healthier Living Begins</p>
            </div>
            
            <!-- Content -->
            <div class="content">
                <div class="welcome-text">
                    <p>Hello <strong>${userData.name}</strong>,</p>
                    <p>Thank you for joining Kachidham Fashions! We're excited to have you as part of our community dedicated to healthy, organic living.</p>
                </div>
                
                <div class="features">
                    <h3 style="color: #2d5e2d; margin-bottom: 15px;">What You Can Expect:</h3>
                    <div class="feature-item">
                        <strong>Fresh Organic Produce:</strong> 100% certified organic fruits and vegetables
                    </div>
                    <div class="feature-item">
                        <strong>Fast Delivery:</strong> Fresh products delivered to your doorstep
                    </div>
                    <div class="feature-item">
                        <strong>Quality Guarantee:</strong> Competitive prices for premium quality products
                    </div>
                </div>
                
                <div style="text-align: center;">
                    <a href="${frontendUrl}/products" class="cta-button">
                        Browse Our Products
                    </a>
                </div>
                
                <div class="account-info">
                    <h4 style="margin: 0 0 10px 0; color: #2d5e2d;">Your Account Information:</h4>
                    <p style="margin: 5px 0;"><strong>Name:</strong> ${userData.name}</p>
                    <p style="margin: 5px 0;"><strong>Email:</strong> ${userData.email}</p>
                    <p style="margin: 5px 0;"><strong>Join Date:</strong> ${userData.joinDate}</p>
                </div>
                
                <div style="background: #fff3cd; padding: 15px; margin: 20px 0; border-radius: 4px;">
                    <p style="margin: 0; color: #856404;"><strong>Tip:</strong> Complete your profile to get personalized recommendations and faster checkout.</p>
                </div>
            </div>
            
            <!-- Footer -->
            <div class="footer">
                <p><strong>Kachidham Fashions</strong></p>
                <p>Nourishing Lives Naturally</p>
                <p>Email: support@${domain} | Phone: +91 98765 43210</p>
                <p>
                    <a href="${frontendUrl}/preferences" style="color: #666666; text-decoration: none;">Update Preferences</a> | 
                    <a href="${frontendUrl}/unsubscribe" style="color: #666666; text-decoration: none;">Unsubscribe</a>
                </p>
                <p style="margin-top: 15px; font-size: 11px; color: #999999;">
                    &copy; ${currentYear} Kachidham Fashions. All rights reserved.<br>
                    This email was sent to ${userData.email} because you registered on our website.
                </p>
            </div>
        </div>
    </body>
    </html>
        `,
        
        // ✅ Proper text version is crucial for spam filters
        text: `
    Welcome to Kachidham Fashions

    Hello ${userData.name},

    Thank you for joining Kachidham Fashions! We're excited to have you as part of our community dedicated to healthy, organic living.

    WHAT YOU CAN EXPECT:
    • Fresh Organic Produce: 100% certified organic fruits and vegetables
    • Fast Delivery: Fresh products delivered to your doorstep
    • Quality Guarantee: Competitive prices for premium quality products

    GET STARTED:
    ${frontendUrl}/products

    YOUR ACCOUNT INFORMATION:
    Name: ${userData.name}
    Email: ${userData.email}
    Join Date: ${userData.joinDate}

    TIP: Complete your profile to get personalized recommendations and faster checkout.

    Need help? Contact us:
    Email: support@${domain}
    Phone: +91 98765 43210

    Update your preferences: ${frontendUrl}/preferences
    Unsubscribe: ${frontendUrl}/unsubscribe

    Kachidham Fashions
    Nourishing Lives Naturally

    © ${currentYear} Kachidham Fashions. All rights reserved.
    This email was sent to ${userData.email} because you registered on our website.
        `.trim()
    };
    },

   passwordReset: (userData, resetUrl) => {
    const domain = process.env.DOMAIN_NAME || 'Kachidham Fashions.com';
    const supportEmail = process.env.SUPPORT_EMAIL || `support@${domain}`;
    const expiryTime = '1 hour';
    
    return {
      subject: 'Reset Your Password - Kachidham Fashions',
      html: `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Reset - Kachidham Fashions</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background: #f6f6f6; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
        .header { background: linear(135deg, #dc3545 0%, #c82333 100%); padding: 30px 20px; text-align: center; color: #ffffff; }
        .header h1 { font-size: 24px; font-weight: 600; margin-bottom: 8px; }
        .content { padding: 30px; }
        .alert-badge { background: #ffe6e6; color: #dc3545; padding: 12px 16px; border-radius: 8px; margin-bottom: 24px; border-left: 4px solid #dc3545; }
        .reset-section { text-align: center; margin: 30px 0; }
        .reset-button { display: inline-block; padding: 14px 32px; background: #dc3545; color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600; margin: 20px 0; }
        .info-box { background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #6c757d; font-size: 12px; border-top: 1px solid #e9ecef; }
        .security-note { background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 15px; margin: 20px 0; color: #856404; }
        @media (max-width: 600px) {
            .container { border-radius: 0; }
            .content { padding: 20px; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔒 Password Reset Request</h1>
            <p>Kachidham Fashions Account Security</p>
        </div>
        
        <div class="content">
            <div class="alert-badge">
                <strong>Security Notice:</strong> A password reset was requested for your account.
            </div>
            
            <p>Hello <strong>${userData.name}</strong>,</p>
            
            <p>We received a request to reset your password for your Kachidham Fashions account. If you didn't make this request, please ignore this email.</p>
            
            <div class="reset-section">
                <p>To reset your password, click the button below:</p>
                <a href="${resetUrl}" class="reset-button">Reset Your Password</a>
                <p style="margin-top: 10px; font-size: 14px; color: #666;">
                    Or copy and paste this link in your browser:<br>
                    <span style="word-break: break-all; color: #dc3545;">${resetUrl}</span>
                </p>
            </div>
            
            <div class="security-note">
                <strong>⚠️ Important Security Information:</strong>
                <ul style="margin: 10px 0 0 20px;">
                    <li>This link will expire in <strong>${expiryTime}</strong></li>
                    <li>Do not share this link with anyone</li>
                    <li>Our team will never ask for your password</li>
                </ul>
            </div>
            
            <div class="info-box">
                <h3 style="color: #495057; margin-bottom: 10px;">Need Help?</h3>
                <p style="margin: 5px 0;">If you're having trouble resetting your password, contact our support team:</p>
                <p style="margin: 5px 0;">
                    <strong>Email:</strong> 
                    <a href="mailto:${supportEmail}" style="color: #dc3545; text-decoration: none;">${supportEmail}</a>
                </p>
                <p style="margin: 5px 0;"><strong>Response Time:</strong> Within 24 hours</p>
            </div>
        </div>
        
        <div class="footer">
            <p>This is an automated security email from Kachidham Fashions</p>
            <p style="margin-top: 8px;">
                <strong>Kachidham Fashions</strong><br>
                Nourishing Lives Naturally
            </p>
        </div>
    </div>
</body>
</html>
      `,
      text: `
PASSWORD RESET REQUEST - Kachidham Fashions

Hello ${userData.name},

We received a request to reset your password for your Kachidham Fashions account.

To reset your password, visit this link:
${resetUrl}

IMPORTANT SECURITY INFORMATION:
- This link will expire in 1 hour
- Do not share this link with anyone
- Our team will never ask for your password

If you didn't request this reset, please ignore this email. Your account remains secure.

Need help? Contact our support team: ${supportEmail}

This is an automated security email from Kachidham Fashions.

Kachidham Fashions
Nourishing Lives Naturally
      `.trim()
    };
    },

    passwordChangedConfirmation: (userData) => {
        const domain = process.env.DOMAIN_NAME || 'Kachidham Fashions.com';
        const supportEmail = process.env.SUPPORT_EMAIL || `support@${domain}`;
        const timestamp = new Date().toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short'
        });
        
        return {
        subject: 'Password Changed Successfully - Kachidham Fashions',
        html: `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Changed - Kachidham Fashions</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background: #f6f6f6; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
            .header { background: linear(135deg, #28a745 0%, #20c997 100%); padding: 30px 20px; text-align: center; color: #ffffff; }
            .header h1 { font-size: 24px; font-weight: 600; margin-bottom: 8px; }
            .content { padding: 30px; }
            .success-badge { background: #d4edda; color: #155724; padding: 12px 16px; border-radius: 8px; margin-bottom: 24px; border-left: 4px solid #28a745; }
            .security-info { background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0; }
            .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #6c757d; font-size: 12px; border-top: 1px solid #e9ecef; }
            @media (max-width: 600px) {
                .container { border-radius: 0; }
                .content { padding: 20px; }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>✅ Password Changed Successfully</h1>
                <p>Kachidham Fashions Account Security</p>
            </div>
            
            <div class="content">
                <div class="success-badge">
                    <strong>Success:</strong> Your password has been updated successfully.
                </div>
                
                <p>Hello <strong>${userData.name}</strong>,</p>
                
                <p>This email confirms that your Kachidham Fashions account password was changed on <strong>${timestamp}</strong>.</p>
                
                <div class="security-info">
                    <h3 style="color: #495057; margin-bottom: 15px;">🔒 Security Information</h3>
                    <ul style="margin-left: 20px;">
                        <li>Your new password is now active</li>
                        <li>You'll need to use this new password for future logins</li>
                        <li>All your existing sessions remain active</li>
                    </ul>
                </div>
                
                <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 15px; margin: 20px 0;">
                    <p style="margin: 0; color: #856404;">
                        <strong>Didn't make this change?</strong><br>
                        If you didn't change your password, please contact our support team immediately at 
                        <a href="mailto:${supportEmail}" style="color: #856404; text-decoration: underline;">${supportEmail}</a>
                    </p>
                </div>
                
                <p>Thank you for helping us keep your account secure.</p>
            </div>
            
            <div class="footer">
                <p>This is an automated security notification from Kachidham Fashions</p>
                <p style="margin-top: 8px;">
                    <strong>Kachidham Fashions</strong><br>
                    Nourishing Lives Naturally
                </p>
            </div>
        </div>
    </body>
    </html>
        `,
        text: `
    PASSWORD CHANGED SUCCESSFULLY - Kachidham Fashions

    Hello ${userData.name},

    This email confirms that your Kachidham Fashions account password was changed on ${timestamp}.

    SECURITY INFORMATION:
    - Your new password is now active
    - You'll need to use this new password for future logins
    - All your existing sessions remain active

    Didn't make this change?
    If you didn't change your password, please contact our support team immediately at ${supportEmail}

    Thank you for helping us keep your account secure.

    This is an automated security notification from Kachidham Fashions.

    Kachidham Fashions
    Nourishing Lives Naturally
        `.trim()
        };
    },


    // Add these templates to your emailTemplates.js file

adminPasswordReset: (adminData, resetUrl) => {
  const domain = process.env.DOMAIN_NAME || 'Kachidham Fashions.com';
  const supportEmail = process.env.SUPPORT_EMAIL || `support@${domain}`;
  const expiryTime = '1 hour';
  
  return {
    subject: '🔐 Admin Password Reset Request - Kachidham Fashions',
    html: `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Password Reset - Kachidham Fashions</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background: #f6f6f6; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
        .header { background: linear(135deg, #dc2626 0%, #b91c1c 100%); padding: 30px 20px; text-align: center; color: #ffffff; }
        .header h1 { font-size: 24px; font-weight: 600; margin-bottom: 8px; }
        .content { padding: 30px; }
        .alert-badge { background: #fee2e2; color: #dc2626; padding: 12px 16px; border-radius: 8px; margin-bottom: 24px; border-left: 4px solid #dc2626; }
        .reset-section { text-align: center; margin: 30px 0; }
        .reset-button { display: inline-block; padding: 14px 32px; background: #dc2626; color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600; margin: 20px 0; }
        .info-box { background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #6c757d; font-size: 12px; border-top: 1px solid #e9ecef; }
        .security-note { background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 15px; margin: 20px 0; color: #92400e; }
        .admin-badge { background: #dc2626; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; display: inline-block; margin-left: 10px; }
        @media (max-width: 600px) {
            .container { border-radius: 0; }
            .content { padding: 20px; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔐 Admin Password Reset</h1>
            <p>Kachidham Fashions Administrator Portal</p>
        </div>
        
        <div class="content">
            <div class="alert-badge">
                <strong>Security Alert:</strong> A password reset was requested for your admin account.
            </div>
            
            <p>Hello <strong>${adminData.name}</strong> <span class="admin-badge">ADMIN</span>,</p>
            
            <p>We received a request to reset your password for the Kachidham Fashions <strong>Administrator Portal</strong>. If you didn't make this request, please contact the super administrator immediately.</p>
            
            <div class="reset-section">
                <p>To reset your admin password, click the button below:</p>
                <a href="${resetUrl}" class="reset-button">Reset Admin Password</a>
                <p style="margin-top: 10px; font-size: 14px; color: #666;">
                    Or copy and paste this link in your browser:<br>
                    <span style="word-break: break-all; color: #dc2626;">${resetUrl}</span>
                </p>
            </div>
            
            <div class="security-note">
                <strong>⚠️ Critical Security Information:</strong>
                <ul style="margin: 10px 0 0 20px;">
                    <li>This admin reset link will expire in <strong>${expiryTime}</strong></li>
                    <li><strong>DO NOT</strong> share this link with anyone</li>
                    <li>This provides access to sensitive admin functions</li>
                    <li>Monitor your account for any suspicious activity</li>
                </ul>
            </div>
            
            <div class="info-box">
                <h3 style="color: #495057; margin-bottom: 10px;">🛡️ Admin Security</h3>
                <p style="margin: 5px 0;">If you're having issues or suspect unauthorized access:</p>
                <p style="margin: 5px 0;">
                    <strong>Contact Super Admin:</strong> 
                    <a href="mailto:${supportEmail}" style="color: #dc2626; text-decoration: none;">${supportEmail}</a>
                </p>
                <p style="margin: 5px 0;"><strong>Response Priority:</strong> Immediate attention</p>
            </div>
            
            <p style="font-size: 14px; color: #666; margin-top: 20px;">
                <strong>Note:</strong> This reset is for admin access only and provides elevated privileges to the system.
            </p>
        </div>
        
        <div class="footer">
            <p>This is an automated security email for Kachidham Fashions Administrators</p>
            <p style="margin-top: 8px;">
                <strong>Kachidham Fashions</strong><br>
                Administrator Portal - Secure Access
            </p>
        </div>
    </div>
</body>
</html>
    `,
    text: `
ADMIN PASSWORD RESET REQUEST - Kachidham Fashions

Hello ${adminData.name} (ADMIN),

We received a request to reset your password for the Kachidham Fashions Administrator Portal.

To reset your admin password, visit this link:
${resetUrl}

CRITICAL SECURITY INFORMATION:
- This admin reset link will expire in 1 hour
- DO NOT share this link with anyone
- This provides access to sensitive admin functions
- Monitor your account for any suspicious activity

If you didn't request this reset, contact the super administrator immediately.

Contact Super Admin: ${supportEmail}
Response Priority: Immediate attention

Note: This reset is for admin access only and provides elevated privileges to the system.

This is an automated security email for Kachidham Fashions Administrators.

Kachidham Fashions
Administrator Portal - Secure Access
    `.trim()
  };
},

adminPasswordChangedConfirmation: (adminData) => {
  const domain = process.env.DOMAIN_NAME || 'Kachidham Fashions.com';
  const supportEmail = process.env.SUPPORT_EMAIL || `support@${domain}`;
  const timestamp = new Date().toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short'
  });
  
  return {
    subject: '✅ Admin Password Changed Successfully - Kachidham Fashions',
    html: `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Password Changed - Kachidham Fashions</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background: #f6f6f6; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
        .header { background: linear(135deg, #059669 0%, #047857 100%); padding: 30px 20px; text-align: center; color: #ffffff; }
        .header h1 { font-size: 24px; font-weight: 600; margin-bottom: 8px; }
        .content { padding: 30px; }
        .success-badge { background: #d1fae5; color: #065f46; padding: 12px 16px; border-radius: 8px; margin-bottom: 24px; border-left: 4px solid #059669; }
        .security-info { background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #6c757d; font-size: 12px; border-top: 1px solid #e9ecef; }
        .admin-badge { background: #059669; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; display: inline-block; margin-left: 10px; }
        .critical-alert { background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 15px; margin: 20px 0; color: #92400e; }
        @media (max-width: 600px) {
            .container { border-radius: 0; }
            .content { padding: 20px; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>✅ Admin Password Changed</h1>
            <p>Kachidham Fashions Administrator Portal</p>
        </div>
        
        <div class="content">
            <div class="success-badge">
                <strong>Success:</strong> Your admin password has been updated successfully.
            </div>
            
            <p>Hello <strong>${adminData.name}</strong> <span class="admin-badge">ADMIN</span>,</p>
            
            <p>This email confirms that your Kachidham Fashions <strong>Administrator Portal</strong> password was changed on <strong>${timestamp}</strong>.</p>
            
            <div class="security-info">
                <h3 style="color: #495057; margin-bottom: 15px;">🔒 Admin Security Update</h3>
                <ul style="margin-left: 20px;">
                    <li>Your new admin password is now active</li>
                    <li>You'll need to use this new password for future admin logins</li>
                    <li>All existing admin sessions remain active</li>
                    <li>Regular user accounts are not affected by this change</li>
                </ul>
            </div>
            
            <div class="critical-alert">
                <p style="margin: 0; color: #92400e;">
                    <strong>🚨 Security Alert - Unauthorized Change?</strong><br>
                    If you didn't change your admin password, this could indicate a security breach. 
                    <strong>Contact the super administrator immediately</strong> at 
                    <a href="mailto:${supportEmail}" style="color: #92400e; text-decoration: underline; font-weight: bold;">${supportEmail}</a>
                </p>
            </div>
            
            <div style="background: #eff6ff; border: 1px solid #3b82f6; border-radius: 8px; padding: 15px; margin: 20px 0;">
                <h4 style="color: #1e40af; margin-bottom: 10px;">📋 Next Steps Recommended:</h4>
                <ul style="margin-left: 20px; color: #374151;">
                    <li>Review recent admin activity logs</li>
                    <li>Verify no unauthorized changes were made</li>
                    <li>Update any stored credentials</li>
                </ul>
            </div>
            
            <p>Thank you for helping us maintain the security of our administrator systems.</p>
        </div>
        
        <div class="footer">
            <p>This is an automated security notification for Kachidham Fashions Administrators</p>
            <p style="margin-top: 8px;">
                <strong>Kachidham Fashions</strong><br>
                Administrator Portal - Security First
            </p>
        </div>
    </div>
</body>
</html>
    `,
    text: `
ADMIN PASSWORD CHANGED SUCCESSFULLY - Kachidham Fashions

Hello ${adminData.name} (ADMIN),

This email confirms that your Kachidham Fashions Administrator Portal password was changed on ${timestamp}.

ADMIN SECURITY UPDATE:
- Your new admin password is now active
- You'll need to use this new password for future admin logins
- All existing admin sessions remain active
- Regular user accounts are not affected by this change

🚨 SECURITY ALERT - UNAUTHORIZED CHANGE?
If you didn't change your admin password, this could indicate a security breach. 
Contact the super administrator immediately at ${supportEmail}

NEXT STEPS RECOMMENDED:
- Review recent admin activity logs
- Verify no unauthorized changes were made
- Update any stored credentials

Thank you for helping us maintain the security of our administrator systems.

This is an automated security notification for Kachidham Fashions Administrators.

Kachidham Fashions
Administrator Portal - Security First
    `.trim()
  };
},

    wholesalerApprovalNotification: (wholesalerData) => {
        const escapeHtml = (text) => {
        if (!text) return '';
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
        };

        const currentDate = new Date().toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short'
        });

        return {
        subject: `New Wholesaler Application - ${wholesalerData.businessName || 'Unknown Business'}`,
        html: `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Wholesaler Application</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background: #f6f6f6; padding: 20px; }
            .container { max-width: 700px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
            .header { background: linear(135deg, #2c5aa0 0%, #3a7bd5 100%); padding: 30px 20px; text-align: center; color: #ffffff; }
            .header h1 { font-size: 24px; font-weight: 600; margin-bottom: 8px; }
            .header p { font-size: 14px; opacity: 0.9; }
            .content { padding: 30px; }
            .alert-badge { background: #e3f2fd; color: #1565c0; padding: 12px 16px; border-radius: 8px; margin-bottom: 24px; border-left: 4px solid #1565c0; }
            .business-info { background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0; }
            .info-item { display: flex; margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid #e9ecef; }
            .info-item:last-child { margin-bottom: 0; padding-bottom: 0; border-bottom: none; }
            .info-label { font-weight: 600; color: #495057; min-width: 150px; }
            .info-value { color: #212529; flex: 1; }
            .requirements-section { background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 20px; margin: 24px 0; }
            .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #6c757d; font-size: 12px; border-top: 1px solid #e9ecef; }
            .action-buttons { margin-top: 24px; text-align: center; }
            .btn { display: inline-block; padding: 10px 20px; margin: 0 8px; background: #2c5aa0; color: white; text-decoration: none; border-radius: 6px; font-size: 14px; }
            .btn-outline { background: transparent; border: 1px solid #2c5aa0; color: #2c5aa0; }
            @media (max-width: 600px) {
                .container { border-radius: 0; }
                .content { padding: 20px; }
                .info-item { flex-direction: column; }
                .info-label { margin-bottom: 4px; }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🏢 New Wholesaler Application</h1>
                <p>Kachidham Fashions Wholesaler Program</p>
            </div>
            
            <div class="content">
                <div class="alert-badge">
                    <strong>Action Required:</strong> A new wholesaler application has been submitted and requires review.
                </div>
                
                <div class="business-info">
                    <h3 style="color: #2c5aa0; margin-bottom: 16px;">🏢 Business Details</h3>
                    
                    <div class="info-item">
                        <span class="info-label">Business Name:</span>
                        <span class="info-value">${escapeHtml(wholesalerData.businessName) || 'Not provided'}</span>
                    </div>
                    
                    <div class="info-item">
                        <span class="info-label">Contact Person:</span>
                        <span class="info-value">${escapeHtml(wholesalerData.contactPerson) || 'Not provided'}</span>
                    </div>
                    
                    <div class="info-item">
                        <span class="info-label">Email Address:</span>
                        <span class="info-value">
                            <a href="mailto:${wholesalerData.email}" style="color: #2c5aa0; text-decoration: none;">
                                ${wholesalerData.email}
                            </a>
                        </span>
                    </div>
                    
                    <div class="info-item">
                        <span class="info-label">Phone Number:</span>
                        <span class="info-value">${wholesalerData.phone ? escapeHtml(wholesalerData.phone) : 'Not provided'}</span>
                    </div>
                    
                    <div class="info-item">
                        <span class="info-label">Business Type:</span>
                        <span class="info-value">${wholesalerData.businessType || 'Not specified'}</span>
                    </div>
                    
                    <div class="info-item">
                        <span class="info-label">GST Number:</span>
                        <span class="info-value">${wholesalerData.gstNumber ? escapeHtml(wholesalerData.gstNumber) : 'Not provided'}</span>
                    </div>
                    
                    <div class="info-item">
                        <span class="info-label">Business Address:</span>
                        <span class="info-value">${wholesalerData.address ? escapeHtml(wholesalerData.address) : 'Not provided'}</span>
                    </div>
                    
                    <div class="info-item">
                        <span class="info-label">Expected Order Volume:</span>
                        <span class="info-value">${wholesalerData.expectedVolume || 'Not specified'}</span>
                    </div>
                    
                    <div class="info-item">
                        <span class="info-label">Submission Time:</span>
                        <span class="info-value">${currentDate}</span>
                    </div>
                </div>
                
                ${wholesalerData.additionalInfo ? `
                <div class="requirements-section">
                    <div class="message-label">📝 Additional Information:</div>
                    <div style="color: #856404; line-height: 1.5;">
                        ${escapeHtml(wholesalerData.additionalInfo).replace(/\n/g, '<br>')}
                    </div>
                </div>
                ` : ''}
                
                <div class="requirements-section">
                    <h4 style="color: #856404; margin-bottom: 10px;">📋 Next Steps Required:</h4>
                    <ol style="color: #856404; margin-left: 20px;">
                        <li>Verify business credentials and GST information</li>
                        <li>Review expected order volume and requirements</li>
                        <li>Contact applicant for additional information if needed</li>
                        <li>Approve or reject the application in the admin panel</li>
                        <li>Send confirmation email to the applicant</li>
                    </ol>
                </div>
                
                <div class="action-buttons">
                    <a href="mailto:${wholesalerData.email}" class="btn">✉️ Contact ${wholesalerData.contactPerson?.split(' ')[0] || 'Applicant'}</a>
                    <a href="tel:${wholesalerData.phone}" class="btn btn-outline" style="${!wholesalerData.phone ? 'display: none;' : ''}">📞 Call Business</a>
                </div>
            </div>
            
            <div class="footer">
                <p>This is an automated notification from Kachidham Fashions Wholesaler Management System</p>
                <p style="margin-top: 8px;">Please review this application within 48 hours.</p>
            </div>
        </div>
    </body>
    </html>
        `,
        text: `
    NEW WHOLESALER APPLICATION - Kachidham Fashions

    A new wholesaler application has been submitted and requires review.

    BUSINESS DETAILS:
    -----------------
    Business Name: ${wholesalerData.businessName || 'Not provided'}
    Contact Person: ${wholesalerData.contactPerson || 'Not provided'}
    Email: ${wholesalerData.email}
    Phone: ${wholesalerData.phone || 'Not provided'}
    Business Type: ${wholesalerData.businessType || 'Not specified'}
    GST Number: ${wholesalerData.gstNumber || 'Not provided'}
    Business Address: ${wholesalerData.address || 'Not provided'}
    Expected Order Volume: ${wholesalerData.expectedVolume || 'Not specified'}
    Submission Time: ${currentDate}

    ${wholesalerData.additionalInfo ? `
    ADDITIONAL INFORMATION:
    -----------------------
    ${wholesalerData.additionalInfo}
    ` : ''}

    NEXT STEPS REQUIRED:
    -------------------
    1. Verify business credentials and GST information
    2. Review expected order volume and requirements
    3. Contact applicant for additional information if needed
    4. Approve or reject the application
    5. Send confirmation email to the applicant

    Please review this application within 48 hours.

    This is an automated notification from Kachidham Fashions.
        `.trim()
        };
    },

    wholesalerAutoReply: (wholesalerData) => ({
        subject: 'Wholesaler Application Received - Kachidham Fashions',
        html: `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { text-align: center; margin-bottom: 30px; color: #2c5aa0; }
            .content { background: #f9f9f9; padding: 20px; border-radius: 8px; }
            .timeline { margin: 20px 0; }
            .timeline-item { margin-bottom: 15px; padding-left: 20px; border-left: 3px solid #2c5aa0; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Wholesaler Application Received</h1>
            </div>
            <div class="content">
                <p>Dear ${wholesalerData.contactPerson || 'Valued Business Partner'},</p>
                
                <p>Thank you for your interest in becoming a wholesale partner with Kachidham Fashions!</p>
                
                <p>We have received your application and our team is currently reviewing it. Here's what you can expect next:</p>
                
                <div class="timeline">
                    <div class="timeline-item">
                        <strong>Application Review</strong><br>
                        Our team will review your business details within 2-3 business days
                    </div>
                    <div class="timeline-item">
                        <strong>Verification Call</strong><br>
                        We may contact you for additional information or clarification
                    </div>
                    <div class="timeline-item">
                        <strong>Approval Decision</strong><br>
                        You will receive notification of our decision via email
                    </div>
                    <div class="timeline-item">
                        <strong>Onboarding</strong><br>
                        If approved, we'll guide you through the onboarding process
                    </div>
                </div>
                
                <p><strong>Business Name:</strong> ${wholesalerData.businessName}</p>
                <p><strong>Application Date:</strong> ${new Date().toLocaleDateString()}</p>
                
                <p>If you have any questions, please don't hesitate to contact our wholesale team.</p>
                
                <p>Best regards,<br>
                <strong>Wholesale Partnership Team</strong><br>
                Kachidham Fashions</p>
            </div>
        </div>
    </body>
    </html>
        `,
        text: `
    Wholesaler Application Received - Kachidham Fashions

    Dear ${wholesalerData.contactPerson || 'Valued Business Partner'},

    Thank you for your interest in becoming a wholesale partner with Kachidham Fashions!

    We have received your application and our team is currently reviewing it. Here's what you can expect next:

    APPLICATION PROCESS:
    -------------------
    • Application Review: Our team will review your business details within 2-3 business days
    • Verification Call: We may contact you for additional information or clarification
    • Approval Decision: You will receive notification of our decision via email
    • Onboarding: If approved, we'll guide you through the onboarding process

    APPLICATION DETAILS:
    -------------------
    Business Name: ${wholesalerData.businessName}
    Application Date: ${new Date().toLocaleDateString()}

    If you have any questions, please don't hesitate to contact our wholesale team.

    Best regards,
    Wholesale Partnership Team
    Kachidham Fashions
        `.trim()
    }),

    wholesalerApprovalConfirmation: (wholesalerData) => ({
        subject: 'Wholesaler Application Approved - Welcome to Kachidham Fashions!',
        html: `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { text-align: center; margin-bottom: 30px; color: #28a745; }
            .content { background: #f9f9f9; padding: 20px; border-radius: 8px; }
            .next-steps { background: #d4edda; padding: 15px; border-radius: 5px; margin: 20px 0; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🎉 Welcome to Our Wholesale Family!</h1>
            </div>
            <div class="content">
                <p>Dear ${wholesalerData.contactPerson},</p>
                
                <p>We are delighted to inform you that your wholesaler application for <strong>${wholesalerData.businessName}</strong> has been approved!</p>
                
                <div class="next-steps">
                    <h3>Next Steps to Get Started:</h3>
                    <ul>
                        <li>Access our wholesale portal using your registered email</li>
                        <li>Explore our complete product catalog with wholesale pricing</li>
                        <li>Review our minimum order quantities and shipping policies</li>
                        <li>Place your first order and experience our quality products</li>
                    </ul>
                </div>
                
                <p><strong>Your Wholesale Account Details:</strong></p>
                <p>Business: ${wholesalerData.businessName}<br>
                Contact: ${wholesalerData.contactPerson}<br>
                Email: ${wholesalerData.email}<br>
                Account Type: Wholesale Partner</p>
                
                <p>Our wholesale team will contact you shortly to discuss your specific requirements and introduce you to your account manager.</p>
                
                <p>Welcome to the Kachidham Fashions family!</p>
                
                <p>Best regards,<br>
                <strong>Wholesale Partnership Team</strong><br>
                Kachidham Fashions</p>
            </div>
        </div>
    </body>
    </html>
        `,
        text: `
    Wholesaler Application Approved - Welcome to Kachidham Fashions!

    Dear ${wholesalerData.contactPerson},

    We are delighted to inform you that your wholesaler application for ${wholesalerData.businessName} has been approved!

    NEXT STEPS TO GET STARTED:
    -------------------------
    • Access our wholesale portal using your registered email
    • Explore our complete product catalog with wholesale pricing
    • Review our minimum order quantities and shipping policies
    • Place your first order and experience our quality products

    YOUR WHOLESALE ACCOUNT DETAILS:
    ------------------------------
    Business: ${wholesalerData.businessName}
    Contact: ${wholesalerData.contactPerson}
    Email: ${wholesalerData.email}
    Account Type: Wholesale Partner

    Our wholesale team will contact you shortly to discuss your specific requirements and introduce you to your account manager.

    Welcome to the Kachidham Fashions family!

    Best regards,
    Wholesale Partnership Team
    Kachidham Fashions
        `.trim()
    }),


    // Add to your existing emailTemplates object
    contactNotification: (contactData) => {
    const escapeHtml = (text) => {
        if (!text) return '';
        return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    };

    const formatMessage = (message) => {
        if (!message) return 'No message provided';
        return escapeHtml(message).replace(/\n/g, '<br>');
    };

    const currentDate = new Date().toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short'
    });

    return {
        subject: `New Contact Form Submission - ${contactData.name || 'Unknown User'}`,
        html: `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Contact Form Submission</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background: #f6f6f6; padding: 20px; }
            .container { max-width: 650px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
            .header { background: linear(135deg, #2d5e2d 0%, #3a7c3a 100%); padding: 30px 20px; text-align: center; color: #ffffff; }
            .header h1 { font-size: 24px; font-weight: 600; margin-bottom: 8px; }
            .header p { font-size: 14px; opacity: 0.9; }
            .content { padding: 30px; }
            .alert-badge { background: #e8f5e8; color: #2d5e2d; padding: 12px 16px; border-radius: 8px; margin-bottom: 24px; border-left: 4px solid #2d5e2d; }
            .contact-info { background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0; }
            .info-item { display: flex; margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid #e9ecef; }
            .info-item:last-child { margin-bottom: 0; padding-bottom: 0; border-bottom: none; }
            .info-label { font-weight: 600; color: #495057; min-width: 120px; }
            .info-value { color: #212529; flex: 1; }
            .message-section { background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 20px; margin: 24px 0; }
            .message-label { font-weight: 600; color: #856404; margin-bottom: 8px; }
            .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #6c757d; font-size: 12px; border-top: 1px solid #e9ecef; }
            .action-buttons { margin-top: 24px; text-align: center; }
            .btn { display: inline-block; padding: 10px 20px; margin: 0 8px; background: #2d5e2d; color: white; text-decoration: none; border-radius: 6px; font-size: 14px; }
            .btn-outline { background: transparent; border: 1px solid #2d5e2d; color: #2d5e2d; }
            @media (max-width: 600px) {
                .container { border-radius: 0; }
                .content { padding: 20px; }
                .info-item { flex-direction: column; }
                .info-label { margin-bottom: 4px; }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>📩 New Contact Form Submission</h1>
                <p>Kachidham Fashions Website</p>
            </div>
            
            <div class="content">
                <div class="alert-badge">
                    <strong>Action Required:</strong> A new contact form submission has been received and requires your attention.
                </div>
                
                <div class="contact-info">
                    <h3 style="color: #2d5e2d; margin-bottom: 16px;">👤 Contact Details</h3>
                    
                    <div class="info-item">
                        <span class="info-label">Full Name:</span>
                        <span class="info-value">${escapeHtml(contactData.name) || 'Not provided'}</span>
                    </div>
                    
                    <div class="info-item">
                        <span class="info-label">Email Address:</span>
                        <span class="info-value">
                            <a href="mailto:${contactData.email}" style="color: #2d5e2d; text-decoration: none;">
                                ${contactData.email}
                            </a>
                        </span>
                    </div>
                    
                    <div class="info-item">
                        <span class="info-label">Phone Number:</span>
                        <span class="info-value">${contactData.phone ? escapeHtml(contactData.phone) : 'Not provided'}</span>
                    </div>
                    
                    <div class="info-item">
                        <span class="info-label">User Account:</span>
                        <span class="info-value">${contactData.userId ? 'Registered User' : 'Guest'}</span>
                    </div>
                    
                    <div class="info-item">
                        <span class="info-label">Submission Time:</span>
                        <span class="info-value">${currentDate}</span>
                    </div>
                </div>
                
                <div class="message-section">
                    <div class="message-label">📝 Message Content:</div>
                    <div style="color: #856404; line-height: 1.5;">
                        ${formatMessage(contactData.message)}
                    </div>
                </div>
                
                <div class="action-buttons">
                    <a href="mailto:${contactData.email}" class="btn">✉️ Reply to ${contactData.name?.split(' ')[0] || 'Customer'}</a>
                    <a href="tel:${contactData.phone}" class="btn btn-outline" style="${!contactData.phone ? 'display: none;' : ''}">📞 Call Customer</a>
                </div>
            </div>
            
            <div class="footer">
                <p>This is an automated notification from Kachidham Fashions Contact System</p>
                <p style="margin-top: 8px;">Please do not reply to this email. Use the reply button above to respond to the customer.</p>
            </div>
        </div>
    </body>
    </html>
        `,
        text: `
    NEW CONTACT FORM SUBMISSION - Kachidham Fashions

    A new contact form submission has been received:

    CONTACT DETAILS:
    ---------------
    Name: ${contactData.name || 'Not provided'}
    Email: ${contactData.email}
    Phone: ${contactData.phone || 'Not provided'}
    User Type: ${contactData.userId ? 'Registered User' : 'Guest'}
    Time: ${currentDate}

    MESSAGE:
    --------
    ${contactData.message || 'No message provided'}

    Please respond to this inquiry promptly.

    This is an automated notification from Kachidham Fashions.
        `.trim()
    };
    },

    contactAutoReply: (contactData) => ({
    subject: 'Thank You for Contacting Kachidham Fashions',
    html: `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { text-align: center; margin-bottom: 30px; color: #2d5e2d; }
            .content { background: #f9f9f9; padding: 20px; border-radius: 8px; }
            .timeline { margin: 20px 0; }
            .timeline-item { margin-bottom: 15px; padding-left: 20px; border-left: 3px solid #2d5e2d; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Thank You for Contacting Us!</h1>
            </div>
            <div class="content">
                <p>Dear ${contactData.name || 'Valued Customer'},</p>
                
                <p>Thank you for reaching out to Kachidham Fashions. We have received your message and our team will get back to you within 24-48 hours.</p>
                
                <div class="timeline">
                    <div class="timeline-item">
                        <strong>Message Received</strong><br>
                        We've received your inquiry and it's in our queue
                    </div>
                    <div class="timeline-item">
                        <strong>Team Review</strong><br>
                        Our team will review your message and assign it to the right person
                    </div>
                    <div class="timeline-item">
                        <strong>Response</strong><br>
                        You'll receive a personalized response from our team
                    </div>
                </div>
                
                <p><strong>Your Inquiry Details:</strong></p>
                <p>Reference ID: ${contactData.id}<br>
                Submitted: ${new Date(contactData.createdAt).toLocaleDateString()}</p>
                
                <p>For urgent inquiries, please call us at +91 98765 43210.</p>
                
                <p>Best regards,<br>
                <strong>Customer Support Team</strong><br>
                Kachidham Fashions</p>
            </div>
        </div>
    </body>
    </html>
    `,
    text: `
    Thank You for Contacting Kachidham Fashions

    Dear ${contactData.name || 'Valued Customer'},

    Thank you for reaching out to Kachidham Fashions. We have received your message and our team will get back to you within 24-48 hours.

    WHAT TO EXPECT:
    --------------
    • Message Received: We've received your inquiry and it's in our queue
    • Team Review: Our team will review your message and assign it to the right person
    • Response: You'll receive a personalized response from our team

    YOUR INQUIRY DETAILS:
    --------------------
    Reference ID: ${contactData.id}
    Submitted: ${new Date(contactData.createdAt).toLocaleDateString()}

    For urgent inquiries, please call us at +91 98765 43210.

    Best regards,
    Customer Support Team
    Kachidham Fashions
    `.trim()
    }),

        // Add these order email templates to your existing emailTemplates object
    orderConfirmationCustomer: (orderData) => {
        const orderDate = new Date(orderData.createdAt).toLocaleString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        const domain = process.env.DOMAIN_NAME || 'Kachidham Fashions.com';
        const supportEmail = process.env.SUPPORT_EMAIL || `support@${domain}`;
        const trackingUrl = orderData.trackingUrl || '#';

        // Enhanced helper function to get product image with all options
            const getProductImage = (item, orderCustomImages = []) => {
                const product = item.product || {};
                const variant = item.productVariant || {};
                

                // First priority: Custom order images
                const itemCustomImages = orderCustomImages.filter(customImg => {
                    const filename = customImg.filename || '';
                    return filename.includes(`item-${item.id}`) || 
                        filename.includes(`product-${item.productId}`) ||
                        filename.includes(`variant-${item.productVariantId}`) ||
                        (orderCustomImages.length === 1 && !filename.includes('item-') && !filename.includes('product-'));
                });
                
                if (itemCustomImages.length > 0 && itemCustomImages[0].imageUrl) {
                    return itemCustomImages[0].imageUrl;
                }
                
                // Second priority: Variant images (with proper null checks)
                if (variant?.variantImages && Array.isArray(variant.variantImages) && variant.variantImages.length > 0) {
                    const validVariantImage = variant.variantImages.find(img => img && img.imageUrl);
                    if (validVariantImage?.imageUrl) {
                        return validVariantImage.imageUrl;
                    }
                    
                    // If no valid image found but array exists, try first item
                    const firstVariantImage = variant.variantImages[0];
                    if (firstVariantImage?.imageUrl) {
                        return firstVariantImage.imageUrl;
                    }
                }
                
                // Third priority: Product images
                if (product?.images && Array.isArray(product.images) && product.images.length > 0) {
                    const validProductImage = product.images.find(img => img && img.imageUrl);
                    if (validProductImage?.imageUrl) {
                        return validProductImage.imageUrl;
                    }
                }
                
                // Final fallback: Placeholder
                const productInitials = product.name?.substring(0, 2).toUpperCase() || 'HG';
                return `https://via.placeholder.com/300x300/2d5e2d/ffffff?text=${productInitials}`;
            };

        const orderItemsWithImages = orderData.orderItems ? orderData.orderItems.map(item => {
            const displayImage = getProductImage(item, orderData.customImages || []);
            
            // Check if this item has custom images
            const hasCustomImage = orderData.customImages && orderData.customImages.some(customImg => {
                const filename = customImg.filename || '';
                return filename.includes(`item-${item.id}`) || 
                    filename.includes(`product-${item.productId}`) ||
                    filename.includes(`variant-${item.productVariantId}`);
            });

            return {
                ...item,
                displayImage: displayImage,
                hasCustomImage: hasCustomImage
            };
        }) : [];


                // Check if order has custom images
        const hasCustomImages = orderData.customImages && orderData.customImages.length > 0;



        return {
            subject: `Order Confirmed - #${orderData.orderNumber} - Kachidham Fashions`,
            html: `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Order Confirmation - Kachidham Fashions</title>
        <style>
            * { 
                margin: 0; 
                padding: 0; 
                box-sizing: border-box; 
            }
            body { 
                font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; 
                line-height: 1.6; 
                color: #333333; 
                background: #f5f5f7; 
                padding: 20px 0; 
            }
            .container { 
                max-width: 650px; 
                margin: 0 auto; 
                background: #ffffff; 
                border-radius: 10px;
                overflow: hidden;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            
            .header { 
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                padding: 40px 30px; 
                text-align: center; 
                color: #ffffff; 
            }
            
            .content { 
                padding: 40px 30px; 
            }
            
            .success-badge { 
                background: #d1fae5; 
                color: #065f46; 
                padding: 16px 20px; 
                border-radius: 12px; 
                margin-bottom: 30px; 
                border-left: 4px solid #10b981;
                display: flex;
                align-items: center;
                gap: 12px;
            }
            
            .order-overview { 
                background: #f8f9fa; 
                border-radius: 12px; 
                padding: 25px; 
                margin: 25px 0; 
                border: 1px solid #e2e8f0;
            }
            
            .overview-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 20px;
                margin-top: 15px;
            }
            
            .overview-item {
                background: white;
                padding: 15px;
                border-radius: 8px;
                border-left: 4px solid #667eea;
            }
            
            .section-title { 
                color: #667eea; 
                margin-bottom: 20px; 
                font-size: 20px;
                font-weight: 600;
                display: flex;
                align-items: center;
                gap: 10px;
            }
            
            .order-items { 
                margin: 30px 0; 
            }
            
            .order-item { 
                display: flex; 
                align-items: flex-start; 
                padding: 20px 0; 
                border-bottom: 1px solid #eee; 
                gap: 20px; 
            }
            
            .item-image { 
                flex-shrink: 0; 
                width: 80px; 
                height: 80px; 
                border-radius: 12px; 
                overflow: hidden; 
                background: #f8fafc; 
                border: 1px solid #f0f0f0; 
                position: relative;
            }
            
            .item-image img { 
                width: 100%; 
                height: 100%; 
                object-fit: cover; 
                display: block; 
            }
            
            .custom-image-badge {
                position: absolute;
                top: -8px;
                right: -8px;
                background: #667eea;
                color: white;
                border-radius: 50%;
                width: 20px;
                height: 20px;
                font-size: 12px;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            }
            
            .item-details { 
                flex: 1; 
            }
            
            .product-name {
                font-weight: 600;
                color: #1a202c;
                margin-bottom: 6px;
                font-size: 16px;
            }
            
            .product-variant {
                color: #718096;
                font-size: 14px;
                margin-bottom: 6px;
            }
            
            .product-quantity {
                color: #4a5568;
                font-size: 14px;
            }
            
            .custom-image-note {
                color: #667eea;
                font-size: 12px;
                font-weight: 600;
                margin-top: 4px;
                display: flex;
                align-items: center;
                gap: 4px;
            }
            
            .item-price { 
                flex-shrink: 0; 
                text-align: right; 
                min-width: 100px; 
                font-weight: 700; 
                color: #667eea; 
                font-size: 16px;
            }
            
            /* Custom Images Section */
            .custom-images-section {
                background: #f0f9ff;
                border-radius: 12px;
                padding: 25px;
                margin: 25px 0;
                border: 1px solid #bae6fd;
            }
            
            .custom-images-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
                gap: 15px;
                margin-top: 15px;
            }
            
            .custom-image-item {
                text-align: center;
            }
            
            .custom-image {
                width: 120px;
                height: 120px;
                border-radius: 8px;
                object-fit: cover;
                border: 2px solid #667eea;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
            
            .custom-image-label {
                font-size: 12px;
                color: #666;
                margin-top: 8px;
                word-break: break-word;
                font-weight: 500;
            }

            .status-badge {
                display: inline-block;
                padding: 6px 12px;
                background: #28a745;
                color: white;
                border-radius: 20px;
                font-size: 12px;
                font-weight: 600;
            }

            .button {
                display: inline-block;
                padding: 14px 28px;
                background: #28a745;
                color: white;
                text-decoration: none;
                border-radius: 6px;
                font-weight: 600;
                margin: 20px 0;
                text-align: center;
                transition: all 0.3s ease;
            }

            .button:hover {
                background: #218838;
                transform: translateY(-2px);
            }

            .info-card {
                background: #f8f9fa;
                border-radius: 12px;
                padding: 25px;
                margin: 20px 0;
                border: 1px solid #e2e8f0;
            }

            .amount-breakdown {
                background: #f8f9fa;
                border-radius: 12px;
                padding: 25px;
                margin: 25px 0;
                border: 1px solid #e2e8f0;
            }

            .breakdown-row {
                display: flex;
                justify-content: space-between;
                padding: 12px 0;
                border-bottom: 1px solid #e2e8f0;
            }

            .breakdown-total {
                border-top: 2px solid #667eea;
                font-weight: bold;
                font-size: 18px;
                color: #1a202c;
                padding-top: 16px;
                margin-top: 8px;
            }

            .support-section {
                background: #eff6ff;
                border-radius: 12px;
                padding: 25px;
                margin: 25px 0;
                border: 1px solid #bfdbfe;
            }

            .footer {
                margin-top: 30px;
                padding: 20px;
                background: #f8f9fa;
                text-align: center;
                font-size: 12px;
                color: #6c757d;
                border-top: 1px solid #e2e8f0;
            }
            
            @media (max-width: 600px) {
                body {
                    padding: 10px;
                }
                .container {
                    border-radius: 8px;
                }
                .content { 
                    padding: 25px 20px; 
                }
                .header {
                    padding: 30px 20px;
                }
                .overview-grid {
                    grid-template-columns: 1fr;
                }
                .order-item { 
                    flex-direction: column; 
                    align-items: flex-start; 
                    gap: 15px;
                }
                .item-price { 
                    text-align: left; 
                    margin-top: 8px; 
                }
                .custom-images-grid {
                    grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
                }
                .custom-image {
                    width: 100px;
                    height: 100px;
                }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🎉 Order Confirmed!</h1>
                <p>Thank you for shopping with Kachidham Fashions</p>
            </div>
            
            <div class="content">
                <div class="success-badge">
                    <strong>Order Confirmed:</strong> Your order #${orderData.orderNumber} has been successfully placed and is being processed.
                </div>
                
                <p style="margin-bottom: 25px; font-size: 16px; color: #4a5568;">
                    Hello <strong style="color: #667eea;">${orderData.name}</strong>,<br>
                    Thank you for choosing Kachidham Fashions! We're preparing your order and will notify you once it's shipped.
                </p>
                
                <!-- Order Overview -->
                <div class="order-overview">
                    <div class="section-title">
                        <span>📊</span> Order Overview
                    </div>
                    <div class="overview-grid">
                        <div class="overview-item">
                            <strong style="color: #718096; font-size: 14px;">Order Number</strong>
                            <p style="color: #1a202c; font-weight: 600; font-size: 18px;">${orderData.orderNumber}</p>
                        </div>
                        <div class="overview-item">
                            <strong style="color: #718096; font-size: 14px;">Order Date</strong>
                            <p style="color: #1a202c; font-weight: 600;">${orderDate}</p>
                        </div>
                        <div class="overview-item">
                            <strong style="color: #718096; font-size: 14px;">Status</strong>
                            <p><span class="status-badge">${orderData.status}</span></p>
                        </div>
                        <div class="overview-item">
                            <strong style="color: #718096; font-size: 14px;">Total Amount</strong>
                            <p style="color: #667eea; font-weight: 700; font-size: 20px;">₹${orderData.totalAmount?.toFixed(2) || '0.00'}</p>
                        </div>
                    </div>
                </div>

                <!-- Custom Images Section -->
                ${hasCustomImages ? `
                <div class="custom-images-section">
                    <div class="section-title">
                        <span>🖼️</span> Your Custom Images
                    </div>
                    <p style="color: #4a5568; margin-bottom: 15px; line-height: 1.6;">
                        We've received your custom images and will use them to create your personalized order. 
                        Below are the images you've provided:
                    </p>
                    <div class="custom-images-grid">
                        ${orderData.customImages.map((image, index) => `
                        <div class="custom-image-item">
                            <img src="${image.imageUrl}" alt="Custom Image ${index + 1}" class="custom-image" 
                                onerror="this.src='https://via.placeholder.com/120x120/667eea/ffffff?text=Image+${index + 1}'" />
                            <div class="custom-image-label">${image.filename || `Custom Image ${index + 1}`}</div>
                        </div>
                        `).join('')}
                    </div>
                </div>
                ` : ''}

                <!-- Order Items -->
                <div class="order-items">
                    <div class="section-title">
                        <span>📦</span> Order Items
                    </div>
                    ${orderItemsWithImages.length > 0 ? orderItemsWithImages.map(item => {
                        const product = item.product || {};
                        const productName = product.name || 'Product';
                        const productImage = item.displayImage;
                        
                        return `
                        <div class="order-item">
                            <div class="item-image">
                                <img src="${productImage}" alt="${productName}" 
                                    onerror="this.src='https://via.placeholder.com/80x80/2d5e2d/ffffff?text=HG'" />
                                ${item.hasCustomImage ? '<div class="custom-image-badge" title="Custom Image Applied">🎨</div>' : ''}
                            </div>
                            <div class="item-details">
                                <div class="product-name">${productName}</div>
                                ${item.productVariant ? `<div class="product-variant">${item.productVariant.color} - ${item.productVariant.size}</div>` : ''}
                                <div class="product-quantity">Quantity: ${item.quantity} × ₹${item.price}</div>
                                ${item.hasCustomImage ? '<div class="custom-image-note"><span>🎨</span> Custom image will be applied</div>' : ''}
                            </div>
                            <div class="item-price">
                                ₹${(item.quantity * item.price).toFixed(2)}
                            </div>
                        </div>
                        `;
                    }).join('') : '<p style="text-align: center; color: #718096; padding: 40px 0;">No items in order</p>'}
                </div>

                <!-- Amount Breakdown -->
                <div class="amount-breakdown">
                    <div class="section-title">
                        <span>💰</span> Amount Breakdown
                    </div>
                    <div class="breakdown-row">
                        <span>Subtotal:</span>
                        <span>₹${orderData.subtotal?.toFixed(2) || '0.00'}</span>
                    </div>
                    ${orderData.discount > 0 ? `
                    <div class="breakdown-row" style="color: #28a745;">
                        <span>Discount:</span>
                        <span>-₹${orderData.discount.toFixed(2)}</span>
                    </div>
                    ` : ''}
                    ${orderData.coupon ? `
                    <div class="breakdown-row">
                        <span>Coupon Applied:</span>
                        <span style="color: #667eea; font-weight: 600;">${orderData.coupon.code}</span>
                    </div>
                    ` : ''}
                    <div class="breakdown-row">
                        <span>Shipping:</span>
                        <span>₹${orderData.shippingCost?.toFixed(2) || '0.00'}</span>
                    </div>
                    <div class="breakdown-row breakdown-total">
                        <span>Total Amount:</span>
                        <span>₹${orderData.totalAmount?.toFixed(2) || '0.00'}</span>
                    </div>
                </div>

                <!-- Customer Information -->
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 30px 0;">
                    <div class="info-card">
                        <div class="section-title">
                            <span>👤</span> Customer Information
                        </div>
                        <div style="color: #4a5568; line-height: 1.6;">
                            <strong>${orderData.name}</strong><br>
                            📧 ${orderData.email}<br>
                            📞 ${orderData.phone}
                        </div>
                    </div>

                    <div class="info-card">
                        <div class="section-title">
                            <span>🏠</span> Shipping Address
                        </div>
                        <p style="color: #4a5568; line-height: 1.6;">
                            ${orderData.address}<br>
                            ${orderData.city}, ${orderData.state}<br>
                            📍 ${orderData.pincode}
                        </p>
                    </div>
                </div>

                <!-- Payment Information -->
                <div class="info-card">
                    <div class="section-title">
                        <span>💳</span> Payment Information
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                        <div>
                            <strong style="color: #718096; font-size: 14px;">Payment Method</strong>
                            <p style="color: #1a202c; font-weight: 600;">${orderData.paymentMethod}</p>
                        </div>
                        <div>
                            <strong style="color: #718096; font-size: 14px;">Payment Status</strong>
                            <p><span class="status-badge">${orderData.paymentStatus}</span></p>
                        </div>
                        ${orderData.razorpayPaymentId ? `
                        <div style="grid-column: 1 / -1;">
                            <strong style="color: #718096; font-size: 14px;">Payment ID</strong>
                            <p style="color: #4a5568; font-family: monospace; font-size: 13px;">${orderData.razorpayPaymentId}</p>
                        </div>
                        ` : ''}
                    </div>
                </div>

                ${orderData.trackingNumber ? `
                <!-- Tracking Information -->
                <div class="info-card" style="background: #eff6ff; border-color: #bfdbfe;">
                    <div class="section-title">
                        <span>🚚</span> Tracking Information
                    </div>
                    <div style="display: grid; gap: 10px;">
                        <div style="display: flex; justify-content: space-between;">
                            <strong style="color: #718096;">Tracking Number</strong>
                            <span style="color: #1a202c; font-weight: 600;">${orderData.trackingNumber}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                            <strong style="color: #718096;">Carrier</strong>
                            <span style="color: #1a202c;">${orderData.carrier}</span>
                        </div>
                        ${orderData.estimatedDelivery ? `
                        <div style="display: flex; justify-content: space-between;">
                            <strong style="color: #718096;">Estimated Delivery</strong>
                            <span style="color: #1a202c;">${new Date(orderData.estimatedDelivery).toLocaleDateString()}</span>
                        </div>
                        ` : ''}
                    </div>
                    ${orderData.trackingUrl ? `
                    <div style="text-align: center; margin-top: 15px;">
                        <a href="${trackingUrl}" class="button" style="display: inline-block;">
                            📦 Track Your Order
                        </a>
                    </div>
                    ` : ''}
                </div>
                ` : `
                <!-- Track Order Button -->
                <div style="text-align: center; width: 100%;">
                    <a href="${trackingUrl}" class="button">
                        📦 Track Your Order
                    </a>
                </div>
                `}

                <!-- Support Section -->
                <div class="support-section">
                    <div class="section-title">
                        <span>📞</span> Need Help?
                    </div>
                    <p style="color: #4a5568; margin-bottom: 20px; line-height: 1.6;">
                        If you have any questions about your order or need assistance, our support team is here to help you.
                    </p>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                        <div>
                            <strong style="color: #667eea; display: block; margin-bottom: 8px;">Email Support</strong>
                            <a href="mailto:${supportEmail}" style="color: #667eea; text-decoration: none; font-weight: 500;">${supportEmail}</a>
                        </div>
                        <div>
                            <strong style="color: #667eea; display: block; margin-bottom: 8px;">Phone Support</strong>
                            <p style="color: #4a5568; font-weight: 500;">+91 88833 85888</p>
                        </div>
                    </div>
                    <div style="margin-top: 15px; padding: 15px; background: #ffffff; border-radius: 8px;">
                        <p style="color: #4a5568; font-size: 14px; margin: 0;">
                            <strong>Business Hours:</strong> Monday - Saturday, 9:00 AM - 6:00 PM
                        </p>
                    </div>
                </div>

                <p style="margin-top: 30px; text-align: center; color: #4a5568; line-height: 1.6;">
                    Thank you for trusting us with your order. We're committed to making your experience wonderful!<br>
                    With love,<br>
                    <strong style="color: #667eea; font-size: 18px;">Kachidham Fashions Team 🤍</strong>
                </p>
            </div>
            
            <div class="footer">
                <p>© ${new Date().getFullYear()} Kachidham Fashions. All rights reserved.</p>
                <p>Nourishing Lives Naturally • <a href="https://${domain}" style="color: #6c757d;">${domain}</a></p>
                <p style="margin-top: 10px; font-size: 11px; color: #8c959f;">
                    This is an automated email. Please do not reply to this message.
                </p>
            </div>
        </div>
    </body>
    </html>
            `,
            text: `
    ORDER CONFIRMED - Kachidham Fashions

    Hello ${orderData.name},

    Thank you for your order! We're excited to let you know that we've received your order #${orderData.orderNumber} and it is now being processed.

    ORDER OVERVIEW:
    ---------------
    Order Number: ${orderData.orderNumber}
    Order Date: ${orderDate}
    Status: ${orderData.status}
    Total Amount: ₹${orderData.totalAmount?.toFixed(2) || '0.00'}

    ${hasCustomImages ? `
    CUSTOM IMAGES:
    --------------
    We've received ${orderData.customImages.length} custom image(s) for your order:
    ${orderData.customImages.map((img, index) => `${index + 1}. ${img.filename || 'Custom Image'}`).join('\n')}
    ` : ''}

    ORDER ITEMS:
    -----------
    ${orderData.orderItems && orderData.orderItems.map(item => {
        const hasCustomImage = orderData.customImages && orderData.customImages.some(customImg => {
            const filename = customImg.filename || '';
            return filename.includes(`item-${item.id}`) || 
                filename.includes(`product-${item.productId}`) ||
                filename.includes(`variant-${item.productVariantId}`);
        });
        
        return `• ${item.product?.name || 'Product'}${item.productVariant ? ` (${item.productVariant.color} - ${item.productVariant.size})` : ''}${hasCustomImage ? ' [CUSTOM IMAGE]' : ''}
    Quantity: ${item.quantity} × ₹${item.price} = ₹${(item.quantity * item.price).toFixed(2)}`;
    }).join('\n') || 'No items'}

    AMOUNT BREAKDOWN:
    -----------------
    Subtotal: ₹${orderData.subtotal?.toFixed(2) || '0.00'}
    ${orderData.discount > 0 ? `Discount: -₹${orderData.discount.toFixed(2)}\n` : ''}${orderData.coupon ? `Coupon Applied: ${orderData.coupon.code}\n` : ''}Shipping: ₹${orderData.shippingCost?.toFixed(2) || '0.00'}
    Total: ₹${orderData.totalAmount?.toFixed(2) || '0.00'}

    CUSTOMER INFORMATION:
    --------------------
    Name: ${orderData.name}
    Email: ${orderData.email}
    Phone: ${orderData.phone}

    SHIPPING ADDRESS:
    -----------------
    ${orderData.address}
    ${orderData.city}, ${orderData.state} - ${orderData.pincode}

    PAYMENT INFORMATION:
    -------------------
    Payment Method: ${orderData.paymentMethod}
    Payment Status: ${orderData.paymentStatus}
    ${orderData.razorpayPaymentId ? `Payment ID: ${orderData.razorpayPaymentId}\n` : ''}

    ${orderData.trackingNumber ? `
    TRACKING INFORMATION:
    ---------------------
    Tracking Number: ${orderData.trackingNumber}
    Carrier: ${orderData.carrier}
    ${orderData.trackingUrl ? `Track Your Order: ${trackingUrl}\n` : ''}${orderData.estimatedDelivery ? `Estimated Delivery: ${new Date(orderData.estimatedDelivery).toLocaleDateString()}\n` : ''}
    ` : ''}

    NEED HELP?
    ----------
    Email: ${supportEmail}
    Phone: +91 88833 85888
    Business Hours: Monday - Saturday, 9:00 AM - 8:00 PM

    Thank you for choosing Kachidham Fashions! We're committed to making your experience wonderful.

    With love,
    Kachidham Fashions Team

    --
    Kachidham Fashions
    Nourishing Lives Naturally
    https://${domain}
            `.trim()
        };
    },

    orderConfirmationAdmin: (orderData) => {
        const orderDate = new Date(orderData.createdAt).toLocaleString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        const domain = process.env.DOMAIN_NAME || 'Kachidham Fashions.com';
        const adminUrl = process.env.ADMIN_URL || `https://admin.${domain}`;

        // Enhanced helper function for admin email
            const getProductImage = (item, orderCustomImages = []) => {
                const product = item.product || {};
                const variant = item.productVariant || {};
                


                // First priority: Custom order images
                const itemCustomImages = orderCustomImages.filter(customImg => {
                    const filename = customImg.filename || '';
                    return filename.includes(`item-${item.id}`) || 
                        filename.includes(`product-${item.productId}`) ||
                        filename.includes(`variant-${item.productVariantId}`) ||
                        (orderCustomImages.length === 1 && !filename.includes('item-') && !filename.includes('product-'));
                });
                
                if (itemCustomImages.length > 0 && itemCustomImages[0].imageUrl) {
                    return itemCustomImages[0].imageUrl;
                }
                
                // Second priority: Variant images (check if they exist and have URLs)
                if (variant && variant.variantImages && variant.variantImages.length > 0) {
                    const validVariantImage = variant.variantImages.find(img => img && img.imageUrl);
                    if (validVariantImage && validVariantImage.imageUrl) {
                        return validVariantImage.imageUrl;
                    }
                }
                
                // Third priority: Product images (check if they exist and have URLs)
                if (product && product.images && product.images.length > 0) {
                    const validProductImage = product.images.find(img => img && img.imageUrl);
                    if (validProductImage && validProductImage.imageUrl) {
                        return validProductImage.imageUrl;
                    }
                }
                
                // Fallback: Use first variant image if available, otherwise placeholder
                if (variant && variant.variantImages && variant.variantImages.length > 0) {
                    const firstVariantImage = variant.variantImages[0];
                    if (firstVariantImage && firstVariantImage.imageUrl) {
                        return firstVariantImage.imageUrl;
                    }
                }
                
                // Final fallback: Placeholder
                const productInitials = product.name?.substring(0, 2).toUpperCase() || 'HG';
                return `https://via.placeholder.com/300x300/2d5e2d/ffffff?text=${productInitials}`;
            };

        // Pre-process order items with images
        const orderItemsWithImages = orderData.orderItems ? orderData.orderItems.map(item => {
            return {
                ...item,
                displayImage: getProductImage(item, orderData.customImages || [])
            };
        }) : [];

        // Check if order has custom images
        const hasCustomImages = orderData.customImages && orderData.customImages.length > 0;

        return {
            // Fixed subject line - removed emoji to prevent spam
            subject: `Order Notification: #${orderData.orderNumber} - Kachidham Fashions`,
            html: `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Order Notification - Kachidham Fashions</title>
        <style>
            * { 
                margin: 0; 
                padding: 0; 
                box-sizing: border-box; 
            }
            body { 
                font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; 
                line-height: 1.6; 
                color: #333333; 
                background: #f5f5f7; 
                padding: 20px 0; 
            }
            .container { 
                max-width: 700px; 
                margin: 0 auto; 
                background: #ffffff; 
                border-radius: 10px;
                overflow: hidden;
            }
            
            .header { 
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                padding: 40px 30px; 
                text-align: center; 
                color: #ffffff; 
            }
            
            .content { 
                padding: 40px 30px; 
            }
            
            .alert-badge { 
                background: #ffe6e6; 
                color: #dc3545; 
                padding: 16px 20px; 
                border-radius: 12px; 
                margin-bottom: 30px; 
                border-left: 4px solid #dc3545;
                display: flex;
                align-items: center;
                gap: 12px;
            }
            
            .overview-grid { 
                display: grid; 
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); 
                gap: 20px; 
                margin-top: 20px; 
            }
            .overview-item { 
                background: white; 
                padding: 20px; 
                border-radius: 12px; 
                border-left: 4px solid #667eea; 
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            
            .order-items { 
                margin: 30px 0; 
            }
            .order-item { 
                display: flex; 
                align-items: flex-start; 
                padding: 20px 0; 
                border-bottom: 1px solid #eee; 
                gap: 20px; 
            }
            .order-item:last-child { 
                border-bottom: none; 
            }
            .item-image { 
                flex-shrink: 0; 
                width: 70px; 
                height: 70px; 
                border-radius: 10px; 
                overflow: hidden; 
                background: #f8fafc; 
                border: 1px solid #f0f0f0; 
                position: relative;
            }
            .item-image img { 
                width: 100%; 
                height: 100%; 
                object-fit: cover; 
                display: block; 
            }
            .custom-image-badge {
                position: absolute;
                top: -6px;
                right: -6px;
                background: #dc3545;
                color: white;
                border-radius: 50%;
                width: 18px;
                height: 18px;
                font-size: 10px;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .item-details { 
                flex: 1; 
            }
            .item-price { 
                flex-shrink: 0; 
                text-align: right; 
                min-width: 100px; 
                font-weight: 700; 
                color: #667eea; 
                font-size: 16px;
            }
            
            .section-title { 
                color: #667eea; 
                margin-bottom: 20px; 
                font-size: 20px;
                font-weight: 600;
                display: flex;
                align-items: center;
                gap: 10px;
            }
            
            .info-card { 
                background: #f8f9fa; 
                border-radius: 12px; 
                padding: 25px; 
                margin: 25px 0; 
                border: 1px solid #e2e8f0;
            }
            
            .action-buttons { 
                margin-top: 30px; 
                text-align: center; 
                display: flex;
                gap: 15px;
                justify-content: center;
            }
            .btn { 
                display: inline-block; 
                padding: 14px 28px; 
                background: #28a745; 
                color: white; 
                text-decoration: none; 
                border-radius: 6px; 
                font-size: 14px; 
                font-weight: 600; 
                transition: all 0.3s ease;
            }
            .btn:hover {
                background: #218838;
                transform: translateY(-2px);
            }
            .btn-outline { 
                background: transparent; 
                border: 2px solid #667eea; 
                color: #667eea; 
            }
            .btn-outline:hover {
                background: #667eea;
                color: white;
            }
            
            .next-steps { 
                background: #fff3cd; 
                border: 1px solid #ffeaa7; 
                border-radius: 12px; 
                padding: 25px; 
                margin: 30px 0; 
            }
            
            .footer { 
                margin-top: 30px; 
                padding: 20px; 
                background: #f8f9fa; 
                text-align: center; 
                font-size: 12px; 
                color: #6c757d; 
            }
            
            .status-badge { 
                display: inline-block; 
                padding: 6px 12px; 
                background: #28a745; 
                color: white; 
                border-radius: 20px; 
                font-size: 12px; 
                font-weight: 600; 
            }
            
            .custom-images-section {
                background: #fff3cd;
                border-radius: 12px;
                padding: 25px;
                margin: 25px 0;
                border: 1px solid #ffeaa7;
            }
            
            .custom-images-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
                gap: 15px;
                margin-top: 15px;
            }
            
            .custom-image-item {
                text-align: center;
            }
            
            .custom-image {
                width: 80px;
                height: 80px;
                border-radius: 8px;
                object-fit: cover;
                border: 2px solid #dc3545;
            }
            
            .custom-image-label {
                font-size: 11px;
                color: #666;
                margin-top: 5px;
                word-break: break-word;
            }
            
            @media (max-width: 600px) {
                body {
                    padding: 10px;
                }
                .content { 
                    padding: 25px 20px; 
                }
                .header {
                    padding: 30px 20px;
                }
                .overview-grid {
                    grid-template-columns: 1fr;
                }
                .order-item { 
                    flex-direction: column; 
                    align-items: flex-start; 
                    gap: 15px;
                }
                .item-price { 
                    text-align: left; 
                    margin-top: 8px; 
                }
                .action-buttons {
                    flex-direction: column;
                }
                .btn {
                    text-align: center;
                    display: block;
                    width: 100%;
                    margin: 5px 0;
                }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>New Order Received</h1>
                <p>Order #${orderData.orderNumber} - Requires Processing</p>
            </div>
            
            <div class="content">
                <div class="alert-badge">
                    <strong>New Order Alert:</strong> A new order has been placed and requires immediate processing.
                </div>
                
                <!-- Order Overview -->
                <div class="info-card">
                    <div class="section-title">
                        <span>📊</span> Order Overview
                    </div>
                    <div class="overview-grid">
                        <div class="overview-item">
                            <strong style="color: #718096; font-size: 14px;">Order Number</strong>
                            <p style="color: #1a202c; font-weight: 600; font-size: 18px;">${orderData.orderNumber}</p>
                        </div>
                        <div class="overview-item">
                            <strong style="color: #718096; font-size: 14px;">Order Date</strong>
                            <p style="color: #1a202c; font-weight: 600;">${orderDate}</p>
                        </div>
                        <div class="overview-item">
                            <strong style="color: #718096; font-size: 14px;">Total Amount</strong>
                            <p style="color: #667eea; font-weight: 700; font-size: 20px;">₹${orderData.totalAmount.toFixed(2)}</p>
                        </div>
                        <div class="overview-item">
                            <strong style="color: #718096; font-size: 14px;">Payment Method</strong>
                            <p style="color: #1a202c; font-weight: 600;">${orderData.paymentMethod}</p>
                        </div>
                    </div>
                </div>

                <!-- Customer Information -->
                <div class="info-card">
                    <div class="section-title">
                        <span>👤</span> Customer Information
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                        <div>
                            <strong style="color: #718096; font-size: 14px;">Name</strong>
                            <p style="color: #1a202c; font-weight: 600;">${orderData.name}</p>
                        </div>
                        <div>
                            <strong style="color: #718096; font-size: 14px;">Email</strong>
                            <p><a href="mailto:${orderData.email}" style="color: #667eea; text-decoration: none;">${orderData.email}</a></p>
                        </div>
                        <div>
                            <strong style="color: #718096; font-size: 14px;">Phone</strong>
                            <p><a href="tel:${orderData.phone}" style="color: #667eea; text-decoration: none;">${orderData.phone}</a></p>
                        </div>
                        ${orderData.user ? `
                        <div>
                            <strong style="color: #718096; font-size: 14px;">Customer ID</strong>
                            <p style="color: #1a202c; font-weight: 600;">${orderData.user.id}</p>
                        </div>
                        ` : ''}
                    </div>
                    <div style="margin-top: 15px;">
                        <strong style="color: #718096; font-size: 14px;">Shipping Address</strong>
                        <p style="color: #4a5568; margin-top: 5px;">${orderData.address}, ${orderData.city}, ${orderData.state} - ${orderData.pincode}</p>
                    </div>
                </div>

                <!-- Custom Images Section for Admin -->
                ${hasCustomImages ? `
                <div class="custom-images-section">
                    <div class="section-title">
                        <span>🖼️</span> Customer Custom Images
                    </div>
                    <p style="color: #856404; margin-bottom: 15px;">
                        <strong>Note:</strong> Customer has provided ${orderData.customImages.length} custom image(s) for this order.
                    </p>
                    <div class="custom-images-grid">
                        ${orderData.customImages.map((image, index) => `
                        <div class="custom-image-item">
                            <img src="${image.imageUrl}" alt="Custom Image ${index + 1}" class="custom-image" />
                            <div class="custom-image-label">${image.filename || `Image ${index + 1}`}</div>
                        </div>
                        `).join('')}
                    </div>
                </div>
                ` : ''}

                <!-- Order Items -->
                <div class="order-items">
                    <div class="section-title">
                        <span>📦</span> Order Items
                    </div>
                    ${orderItemsWithImages.length > 0 ? orderItemsWithImages.map(item => {
                        const product = item.product || {};
                        const hasCustomImage = orderData.customImages && orderData.customImages.some(customImg => {
                            const filename = customImg.filename || '';
                            return filename.includes(`item-${item.id}`) || 
                                filename.includes(`product-${item.productId}`) ||
                                filename.includes(`variant-${item.productVariantId}`);
                        });
                        
                        return `
                        <div class="order-item">
                            <div class="item-image">
                                <img src="${item.displayImage}" alt="${product.name}" />
                                ${hasCustomImage ? '<div class="custom-image-badge" title="Has Custom Image">C</div>' : ''}
                            </div>
                            <div class="item-details">
                                <div style="font-weight: 600; color: #667eea; margin-bottom: 6px; font-size: 16px;">${product.name}</div>
                                ${item.productVariant ? `<div style="color: #718096; font-size: 14px; margin-bottom: 6px;">${item.productVariant.color} - ${item.productVariant.size}</div>` : ''}
                                <div style="color: #4a5568; font-size: 14px;">Quantity: ${item.quantity} × ₹${item.price}</div>
                                ${hasCustomImage ? '<div style="color: #dc3545; font-size: 12px; font-weight: 600; margin-top: 4px;">📷 Custom Image Provided</div>' : ''}
                            </div>
                            <div class="item-price">
                                ₹${(item.quantity * item.price).toFixed(2)}
                            </div>
                        </div>
                        `;
                    }).join('') : '<p style="text-align: center; color: #718096; padding: 40px 0;">No items in order</p>'}
                </div>

                <!-- Order Summary -->
                <div class="info-card">
                    <div class="section-title">
                        <span>💰</span> Order Summary
                    </div>
                    <div style="display: grid; gap: 12px;">
                        <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                            <span>Subtotal:</span>
                            <span style="font-weight: 600;">₹${orderData.subtotal.toFixed(2)}</span>
                        </div>
                        ${orderData.discount > 0 ? `
                        <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0; color: #28a745;">
                            <span>Discount:</span>
                            <span style="font-weight: 600;">-₹${orderData.discount.toFixed(2)}</span>
                        </div>
                        ` : ''}
                        ${orderData.coupon ? `
                        <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                            <span>Coupon Code:</span>
                            <span style="color: #667eea; font-weight: 600;">${orderData.coupon.code}</span>
                        </div>
                        ` : ''}
                        <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0;">
                            <span>Shipping:</span>
                            <span style="font-weight: 600;">₹${orderData.shippingCost.toFixed(2)}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; padding: 12px 0; border-top: 2px solid #667eea; font-weight: bold; font-size: 18px;">
                            <span>Grand Total:</span>
                            <span style="color: #667eea;">₹${orderData.totalAmount.toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                <!-- Action Buttons -->
                <div class="action-buttons">
                    <a href="${adminUrl}/orders/view/${orderData.id}" class="btn">📋 View Order in Admin Panel</a>
                    <a href="mailto:${orderData.email}?subject=Regarding Order ${orderData.orderNumber}" class="btn btn-outline">✉️ Contact Customer</a>
                </div>

                <!-- Next Steps -->
                <div class="next-steps">
                    <div class="section-title" style="color: #856404;">
                        <span>🚀</span> Next Steps
                    </div>
                    <ol style="color: #856404; margin-left: 20px; line-height: 1.8;">
                        <li>Review order details and verify payment status</li>
                        <li>${hasCustomImages ? 'Check custom images and prepare accordingly' : 'Prepare items for shipping and update inventory'}</li>
                        <li>Update order status when shipped</li>
                        <li>Add tracking information to the order</li>
                        <li>Notify customer when order is delivered</li>
                    </ol>
                </div>
            </div>
            
            <div class="footer">
                <p>© ${new Date().getFullYear()} Kachidham Fashions. All rights reserved.</p>
                <p>This is an automated order notification from Kachidham Fashions Order Management System.</p>
            </div>
        </div>
    </body>
    </html>
            `,
            text: `
    NEW ORDER NOTIFICATION - Kachidham Fashions

    A new order has been placed and requires processing.

    ORDER OVERVIEW:
    ---------------
    Order Number: ${orderData.orderNumber}
    Order Date: ${orderDate}
    Total Amount: ₹${orderData.totalAmount.toFixed(2)}
    Payment Method: ${orderData.paymentMethod}
    Payment Status: ${orderData.paymentStatus}

    CUSTOMER INFORMATION:
    --------------------
    Name: ${orderData.name}
    Email: ${orderData.email}
    Phone: ${orderData.phone}
    Address: ${orderData.address}, ${orderData.city}, ${orderData.state} - ${orderData.pincode}
    ${orderData.user ? `Customer ID: ${orderData.user.id}\n` : ''}

    ${hasCustomImages ? `
    CUSTOM IMAGES:
    Customer has provided ${orderData.customImages.length} custom image(s):
    ${orderData.customImages.map((img, index) => `${index + 1}. ${img.filename || 'Custom Image'}`).join('\n')}
    ` : ''}

    ORDER ITEMS:
    -----------
    ${orderData.orderItems && orderData.orderItems.map(item => {
        const hasCustomImage = orderData.customImages && orderData.customImages.some(customImg => {
            const filename = customImg.filename || '';
            return filename.includes(`item-${item.id}`) || 
                filename.includes(`product-${item.productId}`) ||
                filename.includes(`variant-${item.productVariantId}`);
        });
        
        return `• ${item.product.name}${item.productVariant ? ` (${item.productVariant.color} - ${item.productVariant.size})` : ''}${hasCustomImage ? ' [CUSTOM IMAGE]' : ''}
    Quantity: ${item.quantity} × ₹${item.price} = ₹${(item.quantity * item.price).toFixed(2)}`;
    }).join('\n') || 'No items'}

    ORDER SUMMARY:
    -------------
    Subtotal: ₹${orderData.subtotal.toFixed(2)}
    ${orderData.discount > 0 ? `Discount: -₹${orderData.discount.toFixed(2)}\n` : ''}${orderData.coupon ? `Coupon Code: ${orderData.coupon.code}\n` : ''}Shipping: ₹${orderData.shippingCost.toFixed(2)}
    Grand Total: ₹${orderData.totalAmount.toFixed(2)}

    NEXT STEPS:
    ----------
    1. Review order details and verify payment
    2. ${hasCustomImages ? 'Check custom images and prepare accordingly' : 'Prepare items for shipping'}
    3. Update order status when shipped
    4. Add tracking information
    5. Notify customer when delivered

    View order in admin panel: ${adminUrl}/orders/${orderData.id}

    This is an automated order notification from Kachidham Fashions.

    --
    Kachidham Fashions
    Order Management System
            `.trim()
        };
    },

    orderStatusUpdate: (orderData, oldStatus, newStatus) => {
    const orderDate = new Date(orderData.createdAt).toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    return {
        subject: `Order ${newStatus} - #${orderData.orderNumber} - Kachidham Fashions`,
        html: `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Order Status Update - Kachidham Fashions</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background: #f6f6f6; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
            .header { background: linear(135deg, #2c5aa0 0%, #3a7bd5 100%); padding: 30px 20px; text-align: center; color: #ffffff; }
            .header h1 { font-size: 24px; font-weight: 600; margin-bottom: 8px; }
            .content { padding: 30px; }
            .status-badge { display: inline-block; padding: 8px 16px; background: #28a745; color: white; border-radius: 20px; font-size: 14px; font-weight: bold; margin: 10px 0; }
            .order-info { background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0; }
            .tracking-info { background: #e3f2fd; border-radius: 8px; padding: 20px; margin: 20px 0; }
            .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #6c757d; font-size: 12px; border-top: 1px solid #e9ecef; }
            @media (max-width: 600px) {
                .container { border-radius: 0; }
                .content { padding: 20px; }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>📦 Order Status Updated</h1>
                <p>Your order #${orderData.orderNumber} has been updated</p>
            </div>
            
            <div class="content">
                <p>Hello <strong>${orderData.name}</strong>,</p>
                
                <p>Your order status has been updated from <strong>${oldStatus}</strong> to <strong>${newStatus}</strong>.</p>
                
                <div class="order-info">
                    <h3 style="color: #2c5aa0; margin-bottom: 15px;">Order Details</h3>
                    <p><strong>Order Number:</strong> ${orderData.orderNumber}</p>
                    <p><strong>Order Date:</strong> ${orderDate}</p>
                    <p><strong>Current Status:</strong> <span class="status-badge">${newStatus}</span></p>
                    <p><strong>Total Amount:</strong> ₹${orderData.totalAmount.toFixed(2)}</p>
                </div>

                ${orderData.trackingNumber ? `
                <div class="tracking-info">
                    <h3 style="color: #1565c0; margin-bottom: 15px;">🚚 Tracking Information</h3>
                    <p><strong>Tracking Number:</strong> ${orderData.trackingNumber}</p>
                    <p><strong>Carrier:</strong> ${orderData.carrier}</p>
                    ${orderData.trackingUrl ? `<p><strong>Track Your Order:</strong> <a href="${orderData.trackingUrl}" style="color: #1565c0;">Click here to track</a></p>` : ''}
                    ${orderData.estimatedDelivery ? `<p><strong>Estimated Delivery:</strong> ${new Date(orderData.estimatedDelivery).toLocaleDateString()}</p>` : ''}
                </div>
                ` : ''}

                ${newStatus === 'SHIPPED' ? `
                <div style="background: #d4edda; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <h4 style="color: #155724; margin-bottom: 10px;">🎉 Your Order is on the Way!</h4>
                    <p style="margin: 0; color: #155724;">We've shipped your order. You can track its progress using the tracking information above.</p>
                </div>
                ` : ''}

                ${newStatus === 'DELIVERED' ? `
                <div style="background: #d4edda; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <h4 style="color: #155724; margin-bottom: 10px;">🎊 Order Delivered Successfully!</h4>
                    <p style="margin: 0; color: #155724;">Your order has been delivered. We hope you love your purchase!</p>
                </div>
                ` : ''}

                <div style="margin-top: 20px;">
                    <p>Thank you for shopping with Kachidham Fashions!</p>
                </div>
            </div>
            
            <div class="footer">
                <p><strong>Kachidham Fashions</strong></p>
                <p>Nourishing Lives Naturally</p>
                <p style="margin-top: 15px; font-size: 11px; color: #999;">
                    This is an automated status update email. Please do not reply to this message.
                </p>
            </div>
        </div>
    </body>
    </html>
        `,
        text: `
    ORDER STATUS UPDATE - Kachidham Fashions

    Hello ${orderData.name},

    Your order status has been updated from ${oldStatus} to ${newStatus}.

    ORDER DETAILS:
    --------------
    Order Number: ${orderData.orderNumber}
    Order Date: ${orderDate}
    Current Status: ${newStatus}
    Total Amount: ₹${orderData.totalAmount.toFixed(2)}

    ${orderData.trackingNumber ? `
    TRACKING INFORMATION:
    ---------------------
    Tracking Number: ${orderData.trackingNumber}
    Carrier: ${orderData.carrier}
    ${orderData.trackingUrl ? `Track Your Order: ${orderData.trackingUrl}\n` : ''}${orderData.estimatedDelivery ? `Estimated Delivery: ${new Date(orderData.estimatedDelivery).toLocaleDateString()}\n` : ''}
    ` : ''}

    ${newStatus === 'SHIPPED' ? `
    🎉 Your Order is on the Way!
    We've shipped your order. You can track its progress using the tracking information above.
    ` : ''}

    ${newStatus === 'DELIVERED' ? `
    🎊 Order Delivered Successfully!
    Your order has been delivered. We hope you love your purchase!
    ` : ''}

    Thank you for shopping with Kachidham Fashions!

    --
    Kachidham Fashions
    Nourishing Lives Naturally
        `.trim()
    };
    },

    orderRefundNotification: (orderData, refundData) => {
    const orderDate = new Date(orderData.createdAt).toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    return {
        subject: `Order Refund Processed - #${orderData.orderNumber} - Kachidham Fashions`,
        html: `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Order Refund - Kachidham Fashions</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; background: #f6f6f6; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
            .header { background: linear(135deg, #28a745 0%, #20c997 100%); padding: 30px 20px; text-align: center; color: #ffffff; }
            .header h1 { font-size: 24px; font-weight: 600; margin-bottom: 8px; }
            .content { padding: 30px; }
            .refund-info { background: #d4edda; border-radius: 8px; padding: 20px; margin: 20px 0; }
            .order-info { background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0; }
            .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #6c757d; font-size: 12px; border-top: 1px solid #e9ecef; }
            @media (max-width: 600px) {
                .container { border-radius: 0; }
                .content { padding: 20px; }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>💰 Refund Processed</h1>
                <p>Your refund for order #${orderData.orderNumber} has been processed</p>
            </div>
            
            <div class="content">
                <p>Hello <strong>${orderData.name}</strong>,</p>
                
                <p>We have processed your refund for order <strong>#${orderData.orderNumber}</strong>.</p>
                
                <div class="refund-info">
                    <h3 style="color: #155724; margin-bottom: 15px;">Refund Details</h3>
                    <p><strong>Refund Amount:</strong> ₹${refundData.refundAmount.toFixed(2)}</p>
                    <p><strong>Refund Date:</strong> ${new Date().toLocaleDateString()}</p>
                    <p><strong>Refund Reason:</strong> ${refundData.reason}</p>
                    ${refundData.razorpayRefundId ? `<p><strong>Refund ID:</strong> ${refundData.razorpayRefundId}</p>` : ''}
                    <p style="margin-top: 15px; color: #155724;"><strong>Note:</strong> The refund will reflect in your original payment method within 5-7 business days.</p>
                </div>

                <div class="order-info">
                    <h3 style="color: #495057; margin-bottom: 15px;">Order Details</h3>
                    <p><strong>Order Number:</strong> ${orderData.orderNumber}</p>
                    <p><strong>Order Date:</strong> ${orderDate}</p>
                    <p><strong>Original Amount:</strong> ₹${orderData.totalAmount.toFixed(2)}</p>
                    <p><strong>Refunded Amount:</strong> ₹${refundData.refundAmount.toFixed(2)}</p>
                </div>

                <div style="margin-top: 20px;">
                    <p>If you have any questions about your refund, please contact our support team.</p>
                    <p>We hope to serve you better in the future.</p>
                </div>
            </div>
            
            <div class="footer">
                <p><strong>Kachidham Fashions</strong></p>
                <p>Nourishing Lives Naturally</p>
                <p style="margin-top: 15px; font-size: 11px; color: #999;">
                    This is an automated refund notification email. Please do not reply to this message.
                </p>
            </div>
        </div>
    </body>
    </html>
        `,
        text: `
    ORDER REFUND PROCESSED - Kachidham Fashions

    Hello ${orderData.name},

    We have processed your refund for order #${orderData.orderNumber}.

    REFUND DETAILS:
    ---------------
    Refund Amount: ₹${refundData.refundAmount.toFixed(2)}
    Refund Date: ${new Date().toLocaleDateString()}
    Refund Reason: ${refundData.reason}
    ${refundData.razorpayRefundId ? `Refund ID: ${refundData.razorpayRefundId}\n` : ''}
    Note: The refund will reflect in your original payment method within 5-7 business days.

    ORDER DETAILS:
    --------------
    Order Number: ${orderData.orderNumber}
    Order Date: ${orderDate}
    Original Amount: ₹${orderData.totalAmount.toFixed(2)}
    Refunded Amount: ₹${refundData.refundAmount.toFixed(2)}

    If you have any questions about your refund, please contact our support team.
    We hope to serve you better in the future.

    --
    Kachidham Fashions
    Nourishing Lives Naturally
        `.trim()
    };
    }

};