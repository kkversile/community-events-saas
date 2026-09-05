import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'node:crypto';
import nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  constructor(private config: ConfigService) {}

  async sendPasswordReset(to: string, firstName: string, token: string) {
    const host = this.config.get<string>('SMTP_HOST');
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASS');
    if (!host || !user || !pass) throw new ServiceUnavailableException('Password reset email is not configured');
    const port = Number(this.config.get('SMTP_PORT') ?? 587);
    const secure = String(this.config.get('SMTP_SECURE') ?? 'false') === 'true';
    const from = this.config.get<string>('SMTP_FROM') ?? user;
    const fromName = this.config.get<string>('SMTP_FROM_NAME') ?? 'Community Admin';
    const url = `${this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:3004'}/reset-password?token=${encodeURIComponent(token)}`;
    const transporter = nodemailer.createTransport({ host, port, secure, auth: { user, pass } });
    await transporter.sendMail({
      from: `"${fromName}" <${from}>`, to,
      subject: 'Reset your CommunityHub password',
      text: `Hi ${firstName},\n\nUse this link to reset your CommunityHub password. It expires in 30 minutes:\n${url}\n\nIf you did not request this, you can ignore this email.`,
      html: `<p>Hi ${firstName},</p><p>Use the button below to reset your CommunityHub password. This link expires in 30 minutes.</p><p><a href="${url}">Reset password</a></p><p>If you did not request this, you can ignore this email.</p>`,
    });
  }

  static hashToken(token: string) { return createHash('sha256').update(token).digest('hex'); }
  static newToken() { return randomBytes(32).toString('hex'); }
}
