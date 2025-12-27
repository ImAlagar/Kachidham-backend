import nodemailer from 'nodemailer';

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: 465,
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: false,
        minVersion: "TLSv1.2"
      },
      socketTimeout: 30000,
      connectionTimeout: 30000,
    });
  }

  async sendEmail({ to, subject, html, text, from }) {
    try {
      const mailOptions = {
        from: from || `"Kachidham Fashions" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to: Array.isArray(to) ? to.join(', ') : to,
        subject: this.cleanSubject(subject),
        html: html,
        text: text || this.htmlToText(html),
        replyTo: process.env.SMTP_REPLY_TO || process.env.SMTP_FROM || process.env.SMTP_USER,
        
        // ✅ Anti-spam headers
        headers: {
          'X-Priority': '3',
          'X-MSMail-Priority': 'Normal',
          'Importance': 'Normal',
          'X-Mailer': 'Kachidham Fashions Mailer 1.0',
          'List-Unsubscribe': `<mailto:${process.env.SMTP_UNSUBSCRIBE || process.env.SMTP_FROM}>`,
          'Precedence': 'bulk',
        },
        
        // ✅ DKIM and SPF friendly options
        dkim: {
          domainName: process.env.DOMAIN_NAME,
          keySelector: 'default',
          privateKey: process.env.DKIM_PRIVATE_KEY
        },
        
        // ✅ Priority settings
        priority: 'normal'
      };

      const result = this.transporter.sendMail(mailOptions);
      return result;
    } catch (error) {
      console.error('❌ Email sending failed:', error.message);
      throw error;
    }
  }

  cleanSubject(subject) {
    // Remove excessive emojis and special characters
    return subject
      .replace(/[^\w\s\-.,!?@#]/g, '')
      .replace(/\s+/g, ' ')
      .substring(0, 100)
      .trim();
  }

  htmlToText(html) {
    return html
      .replace(/<style[^>]*>.*?<\/style>/gs, '')
      .replace(/<script[^>]*>.*?<\/script>/gs, '')
      .replace(/<[^>]*>/g, '')
      .replace(/\s+/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .trim();
  }
}

export default new EmailService();