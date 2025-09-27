import nodemailer from 'nodemailer';

interface EmailConfig {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

class EmailService {
  private static transporter: nodemailer.Transporter | null = null;

  private static getTransporter() {
    if (this.transporter) {
      return this.transporter;
    }

    // Option 1: SMTP Configuration (Gmail, Outlook, etc.)
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_PORT === '465', // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
      return this.transporter;
    }

    // Option 2: SendGrid
    if (process.env.SENDGRID_API_KEY) {
      this.transporter = nodemailer.createTransport({
        service: 'SendGrid',
        auth: {
          user: 'apikey',
          pass: process.env.SENDGRID_API_KEY,
        },
      });
      return this.transporter;
    }

    throw new Error('No email configuration found. Please set SMTP or SendGrid credentials.');
  }

  static async sendEmail(config: EmailConfig): Promise<boolean> {
    try {
      const transporter = this.getTransporter();
      if (!transporter) {
        console.error('No email transporter available');
        return false;
      }
      
      const mailOptions = {
        from: process.env.FROM_EMAIL || process.env.SMTP_USER,
        to: config.to,
        subject: config.subject,
        text: config.text,
        html: config.html,
      };

      const result = await transporter.sendMail(mailOptions);
      console.log('Email sent successfully:', result.messageId);
      return true;
    } catch (error) {
      console.error('Failed to send email:', error);
      return false;
    }
  }

  static async sendOTPEmail(email: string, otp: string): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>VoteGuard - Email Verification</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .otp-box { background: white; border: 2px solid #667eea; border-radius: 10px; padding: 20px; text-align: center; margin: 20px 0; }
          .otp-code { font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 5px; }
          .warning { background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px; padding: 15px; margin: 20px 0; }
          .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🛡️ VoteGuard</h1>
            <h2>Email Verification Required</h2>
          </div>
          <div class="content">
            <p>Hello,</p>
            <p>You have requested to verify your email address for your VoteGuard account registration. Please use the following One-Time Password (OTP) to complete your verification:</p>
            
            <div class="otp-box">
              <div class="otp-code">${otp}</div>
              <p><strong>This code expires in 5 minutes</strong></p>
            </div>
            
            <div class="warning">
              <strong>⚠️ Security Notice:</strong>
              <ul>
                <li>Never share this OTP with anyone</li>
                <li>VoteGuard staff will never ask for your OTP</li>
                <li>This code is only valid for 5 minutes</li>
                <li>If you didn't request this verification, please ignore this email</li>
              </ul>
            </div>
            
            <p>If you're having trouble with verification, please contact our support team.</p>
            
            <p>Best regards,<br>
            The VoteGuard Security Team</p>
          </div>
          <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
            <p>&copy; 2024 VoteGuard. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
VoteGuard - Email Verification

Your verification code is: ${otp}

This code expires in 5 minutes.

Security Notice:
- Never share this OTP with anyone
- VoteGuard staff will never ask for your OTP
- If you didn't request this verification, please ignore this email

Best regards,
The VoteGuard Security Team
    `.trim();

    return await this.sendEmail({
      to: email,
      subject: '🛡️ VoteGuard - Email Verification Code',
      html,
      text,
    });
  }

  static async sendPasswordResetEmail(email: string, firstName: string, resetUrl: string): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>VoteGuard - Password Reset</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .reset-button { display: inline-block; background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
          .reset-button:hover { background: #5a67d8; }
          .warning { background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px; padding: 15px; margin: 20px 0; }
          .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
          .link-text { word-break: break-all; font-size: 12px; color: #666; background: #f0f0f0; padding: 10px; border-radius: 5px; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🛡️ VoteGuard</h1>
            <h2>Password Reset Request</h2>
          </div>
          <div class="content">
            <p>Hello ${firstName},</p>
            <p>You have requested to reset your password for your VoteGuard account. Click the button below to create a new password:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" class="reset-button">Reset My Password</a>
            </div>
            
            <p>If the button above doesn't work, copy and paste this link into your browser:</p>
            <div class="link-text">${resetUrl}</div>
            
            <div class="warning">
              <strong>🔒 Security Notice:</strong>
              <ul>
                <li>This link expires in 1 hour</li>
                <li>Only use this link if you requested a password reset</li>
                <li>Never share this link with anyone</li>
                <li>If you didn't request this reset, please ignore this email</li>
                <li>Contact our support team if you have concerns</li>
              </ul>
            </div>
            
            <p>If you're having trouble resetting your password, please contact our support team.</p>
            
            <p>Best regards,<br>
            The VoteGuard Security Team</p>
          </div>
          <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
            <p>&copy; 2024 VoteGuard. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
VoteGuard - Password Reset Request

Hello ${firstName},

You have requested to reset your password for your VoteGuard account.

Please click on the following link to reset your password:
${resetUrl}

Security Notice:
- This link expires in 1 hour
- Only use this link if you requested a password reset
- Never share this link with anyone
- If you didn't request this reset, please ignore this email

Best regards,
The VoteGuard Security Team
    `.trim();

    return await this.sendEmail({
      to: email,
      subject: '🛡️ VoteGuard - Password Reset Request',
      html,
      text,
    });
  }
}

export default EmailService;