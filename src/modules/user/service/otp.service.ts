import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface OtpStore {
  [phone: string]: {
    otp: string;
    expiresAt: Date;
    attempts: number;
  };
}

@Injectable()
export class OtpService {
  private otpStore: OtpStore = {};
  private readonly OTP_LENGTH = 6;
  private readonly OTP_EXPIRY_MINUTES = 10;
  private readonly MAX_ATTEMPTS = 3;

  constructor(private readonly configService: ConfigService) {}

  /**
   * Generate and send OTP to phone number
   */
  async generateAndSendOtp(phone: string): Promise<void> {
    // Generate 6-digit OTP
    const otp = this.generateOtp(this.OTP_LENGTH);

    // Store OTP with expiry
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + this.OTP_EXPIRY_MINUTES);

    this.otpStore[phone] = {
      otp,
      expiresAt,
      attempts: 0,
    };

    // Send OTP via SMS
    await this.sendOtpViaSms(phone, otp);

    console.log(`[OTP] Generated for ${phone}: ${otp} (expires at ${expiresAt})`);
  }

  /**
   * Verify OTP
   */
  async verifyOtp(phone: string, otp: string): Promise<boolean> {
    const stored = this.otpStore[phone];

    if (!stored) {
      throw new BadRequestException('No OTP found for this phone number. Please request a new one.');
    }

    // Check if expired
    if (new Date() > stored.expiresAt) {
      delete this.otpStore[phone];
      throw new BadRequestException('OTP has expired. Please request a new one.');
    }

    // Check attempts
    if (stored.attempts >= this.MAX_ATTEMPTS) {
      delete this.otpStore[phone];
      throw new BadRequestException('Maximum verification attempts exceeded. Please request a new OTP.');
    }

    // Increment attempts
    stored.attempts += 1;

    // Verify OTP
    if (stored.otp !== otp) {
      if (stored.attempts >= this.MAX_ATTEMPTS) {
        delete this.otpStore[phone];
      }
      throw new BadRequestException('Invalid OTP. Please try again.');
    }

    // OTP is valid - remove from store
    delete this.otpStore[phone];
    return true;
  }

  /**
   * Generate random numeric OTP
   */
  private generateOtp(length: number): string {
    let otp = '';
    for (let i = 0; i < length; i++) {
      otp += Math.floor(Math.random() * 10).toString();
    }
    return otp;
  }

  /**
   * Send OTP via SMS
   * TODO: Integrate with SMS provider (Termii, Twilio, etc.)
   */
  private async sendOtpViaSms(phone: string, otp: string): Promise<void> {
    const smsService = this.configService.get('SMS_SERVICE');
    const smsApiKey = this.configService.get('SMS_API_KEY');
    const smsSenderId = this.configService.get('SMS_SENDER_ID', 'Bet2Learn');

    // For development, just log the OTP
    if (process.env.NODE_ENV === 'development') {
      console.log(`[SMS] Sending OTP to ${phone}: ${otp}`);
      return;
    }

    // TODO: Implement actual SMS sending
    // Example with Termii:
    /*
    const response = await fetch('https://api.ng.termii.com/api/sms/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: phone,
        from: smsSenderId,
        sms: `Your Bet2Learn verification code is: ${otp}. Valid for ${this.OTP_EXPIRY_MINUTES} minutes.`,
        type: 'plain',
        api_key: smsApiKey,
        channel: 'generic',
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to send OTP via SMS');
    }
    */

    console.log(`[SMS] Would send OTP to ${phone} via ${smsService}: ${otp}`);
  }

  /**
   * Clean up expired OTPs (should be called periodically)
   */
  cleanupExpiredOtps(): void {
    const now = new Date();
    Object.keys(this.otpStore).forEach((phone) => {
      if (this.otpStore[phone].expiresAt < now) {
        delete this.otpStore[phone];
      }
    });
  }
}
