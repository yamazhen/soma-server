import type { EmailConfig, EmailOptions } from "@soma-ms/shared";
import {
  createTransport,
  type SendMailOptions,
  type Transporter,
} from "nodemailer";

class EmailService {
  private transporter: Transporter;

  constructor() {
    const config: EmailConfig = {
      host: process.env["EMAIL_HOST"] || "smtp.example.com",
      port: parseInt(process.env["EMAIL_PORT"] || "587"),
      secure: process.env["EMAIL_SECURE"] === "true",
      auth: {
        user: process.env["EMAIL_USER"] || "",
        pass: process.env["EMAIL_PASSWORD"] || "",
      },
    };
    this.transporter = createTransport(config);
  }

  async sendEmail(options: EmailOptions): Promise<void> {
    const mailOptions: SendMailOptions = {
      from: process.env["EMAIL_USER"] || "",
      ...options,
    };

    try {
      await this.transporter.sendMail(mailOptions);
    } catch (e) {
      console.error("Error sending email:", e);
      throw new Error("Failed to send email");
    }
  }

  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      console.log("Email service is ready to send messages");
      return true;
    } catch (e) {
      console.error("Email service verificatin failed:", e);
      return false;
    }
  }
}

export const emailService = new EmailService();
