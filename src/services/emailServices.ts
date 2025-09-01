// src/services/emailService.ts
import nodemailer from "nodemailer";
import { createTransport } from "nodemailer";

interface EmailConfig {
  service: string;
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

class EmailService {
  private transporter!: nodemailer.Transporter;
  private defaultFrom: string;

  constructor() {
    this.defaultFrom = process.env.EMAIL_FROM || "noreply@planetskool.com";
    this.setupTransporter();
  }

  private setupTransporter() {
    const emailConfig: EmailConfig = {
      service: process.env.EMAIL_SERVICE || "gmail",
      host: process.env.EMAIL_HOST || "smtp.gmail.com",
      port: parseInt(process.env.EMAIL_PORT || "587"),
      secure: process.env.EMAIL_SECURE === "true",
      auth: {
        user: process.env.EMAIL_USER || "",
        pass: process.env.EMAIL_PASS || "",
      },
    };

    this.transporter = createTransport(emailConfig);
  }

  async sendEmail({
    to,
    subject,
    html,
    text,
    from,
  }: SendEmailParams): Promise<boolean> {
    try {
      const mailOptions = {
        from: from || this.defaultFrom,
        to: Array.isArray(to) ? to.join(", ") : to,
        subject,
        html,
        text: text || this.stripHtml(html),
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log("Email sent successfully:", result.messageId);
      return true;
    } catch (error: any) {
      console.error("Email sending failed:", error.message);
      return false;
    }
  }

  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      console.log("Email service connection verified");
      return true;
    } catch (error: any) {
      console.error("Email service connection failed:", error.message);
      return false;
    }
  }

  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, "");
  }



  getForgotPasswordTemplate(data: {
    email: string;
    otp: string;
  }): EmailTemplate {
    const { email, otp } = data;
    const subject = "Your Password Reset OTP";

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${subject}</title>
      <style>
        body { font-family: Arial, sans-serif; background: #f9f9f9; padding: 20px; }
        .container { background: #ffffff; padding: 30px; border-radius: 10px; max-width: 600px; margin: auto; }
        h2 { color: #333; }
        .otp-box { font-size: 24px; font-weight: bold; background: #f0f0f0; padding: 12px; border-radius: 6px; width: fit-content; margin: 10px 0; }
        .footer { font-size: 12px; color: #888; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <h2>Password Reset Request</h2>
        <p>Hello,</p>
        <p>We received a request to reset the password for your account <strong>${email}</strong>.</p>
        <p>Use the OTP below to proceed:</p>
        <div class="otp-box">${otp}</div>
        <p>This OTP is valid for 2 minutes. Do not share this code with anyone.</p>
        <p>If you didn’t request this, you can safely ignore this email.</p>
        <div class="footer">© ${new Date().getFullYear()} PlanetSkool</div>
      </div>
    </body>
    </html>`;

    const text = `Password Reset Request

Hello,

We received a request to reset the password for your account ${email}.
Use the OTP below to proceed:

OTP: ${otp}

This OTP is valid for 2 minutes. Do not share this code with anyone.

If you didn’t request this, you can safely ignore this email.

- PlanetSkool`;

    return { subject, html, text };
  }


  getResendOtpTemplate(data: { email: string; otp: string }): EmailTemplate {
    const { email, otp } = data;
    const subject = "Resend OTP - Account Verification";

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${subject}</title>
      <style>
        body { font-family: Arial, sans-serif; background: #f9f9f9; padding: 20px; }
        .container { background: #ffffff; padding: 30px; border-radius: 10px; max-width: 600px; margin: auto; }
        h2 { color: #333; }
        .otp-box { font-size: 24px; font-weight: bold; background: #f0f0f0; padding: 12px; border-radius: 6px; width: fit-content; margin: 10px 0; }
        .footer { font-size: 12px; color: #888; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <h2>Resend OTP</h2>
        <p>Hello,</p>
        <p>Here is your new OTP for verifying your account or resetting your password:</p>
        <div class="otp-box">${otp}</div>
        <p>This OTP is valid for 2 minutes. Do not share this code with anyone.</p>
        <div class="footer">© ${new Date().getFullYear()} PlanetSkool</div>
      </div>
    </body>
    </html>`;

    const text = `Resend OTP - Account Verification

Hello,

Here is your new OTP for verifying your account or resetting your password:

OTP: ${otp}

This OTP is valid for 2 minutes. Do not share this code with anyone.

- PlanetSkool`;

    return { subject, html, text };
  }





  async sendForgotPasswordEmail(data: {
    to: string;
    email: string;
    otp: string;
  }): Promise<boolean> {
    const template = this.getForgotPasswordTemplate({
      email: data.email,
      otp: data.otp,
    });
    return this.sendEmail({
      to: data.to,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  }



  async sendResendOtpEmail(data: {
    to: string;
    email: string;
    otp: string;
  }): Promise<boolean> {
    const template = this.getResendOtpTemplate({
      email: data.email,
      otp: data.otp,
    });
    return this.sendEmail({
      to: data.to,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  }

}

export const emailService = new EmailService();
export default EmailService;
