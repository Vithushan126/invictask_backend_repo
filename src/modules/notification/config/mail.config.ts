import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

@Injectable()
export class MailConfig {
  private transporter: Transporter;

  constructor() {
    this.createTransporter();
  }

  private createTransporter(): void {
    this.transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.MAIL_PORT || '465'),
      secure: parseInt(process.env.MAIL_PORT || '465') === 465, // true for 465, false for other ports
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });
  }

  getTransporter(): Transporter {
    return this.transporter;
  }

  getFromAddress(): string {
    return process.env.MAIL_FROM || '"InvicTask" <noreply@invictask.com>';
  }

  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      console.error('Mail configuration error:', error);
      return false;
    }
  }
}
