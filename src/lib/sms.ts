interface SMSConfig {
  to: string;
  message: string;
}

class SMSService {
  static async sendSMS(config: SMSConfig): Promise<boolean> {
    // Option 1: Twilio
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      return await this.sendTwilioSMS(config);
    }

    // Option 2: AWS SNS (for production)
    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      return await this.sendAWSSMS(config);
    }

    console.log('No SMS provider configured. SMS would be sent to:', config.to);
    console.log('Message:', config.message);
    return true; // Return true for development
  }

  private static async sendTwilioSMS(config: SMSConfig): Promise<boolean> {
    try {
      // Dynamic import to avoid issues if Twilio is not installed
      const twilio = require('twilio');
      const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

      const message = await client.messages.create({
        body: config.message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: config.to,
      });

      console.log('Twilio SMS sent successfully:', message.sid);
      return true;
    } catch (error) {
      console.error('Failed to send Twilio SMS:', error);
      return false;
    }
  }

  private static async sendAWSSMS(config: SMSConfig): Promise<boolean> {
    try {
      // Dynamic import to avoid issues if AWS SDK is not installed
      const AWS = require('aws-sdk');
      
      AWS.config.update({
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        region: process.env.AWS_REGION || 'us-east-1',
      });

      const sns = new AWS.SNS();
      
      const params = {
        Message: config.message,
        PhoneNumber: config.to,
      };

      const result = await sns.publish(params).promise();
      console.log('AWS SNS SMS sent successfully:', result.MessageId);
      return true;
    } catch (error) {
      console.error('Failed to send AWS SNS SMS:', error);
      return false;
    }
  }

  static async sendOTPSMS(phoneNumber: string, otp: string): Promise<boolean> {
    const message = `🛡️ VoteGuard Security Code: ${otp}

Your phone verification code is: ${otp}

⚠️ SECURITY NOTICE:
- This code expires in 5 minutes
- Never share this code with anyone
- VoteGuard will never ask for your OTP

If you didn't request this code, please ignore this message.`;

    return await this.sendSMS({
      to: phoneNumber,
      message,
    });
  }
}

export default SMSService;