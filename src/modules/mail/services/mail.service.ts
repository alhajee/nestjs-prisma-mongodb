import { Inject, Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';
import { CONTACT_EMAIL, SITE_URL } from '@constants/env.constants';

@Injectable()
export class MailService {
  private siteUrl: string;
  private contactEmail: string;

  constructor(
    @Inject(ConfigService) private readonly configService: ConfigService,
    private readonly mailerService: MailerService,
  ) {
    this.siteUrl = this.configService.get(SITE_URL);
    this.contactEmail = this.configService.get(CONTACT_EMAIL);
  }

  async sendOTPConirmation(to: string, context?: any) {
    try {
      await this.mailerService.sendMail({
        to,
        subject: 'OTP Confirmation',
        template: './otp-confirmation',
        context: {
          ...context,
          year: new Date().getFullYear(),
          website: this.siteUrl,
        },
      });
    } catch (error) {
      Logger.error('Error sending email', error.message);
    }
  }
}
