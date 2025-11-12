import {
  extractErrorMessage,
  serverEnv,
} from "@soma-ms/shared";
import { CreateEmailOptions, Resend } from "resend";

interface EmailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  cc?: string | string[];
  bcc?: string | string[];
}

class EmailService {
  private resend: Resend;

  constructor() {
    this.resend = new Resend(serverEnv.RESEND_API_KEY);
  }

  async sendEmail(options: EmailOptions): Promise<void> {
    try {
      if (!options.html && !options.text) {
        throw new Error("Email must have either html or text content");
      }

      let emailData: CreateEmailOptions;

      if (options.html) {
        emailData = {
          from: serverEnv.EMAIL_FROM,
          to: options.to,
          subject: options.subject,
          html: options.html,
        };

        if (options.text) emailData.text = options.text;
        if (options.cc) emailData.cc = options.cc;
        if (options.bcc) emailData.bcc = options.bcc;
      } else if (options.text) {
        emailData = {
          from: serverEnv.EMAIL_FROM,
          to: options.to,
          subject: options.subject,
          text: options.text,
        };

        if (options.cc) emailData.cc = options.cc;
        if (options.bcc) emailData.bcc = options.bcc;
      } else {
        throw new Error("Email must have either html or text content");
      }

      await this.resend.emails.send(emailData);
    } catch (e) {
      throw new Error("Failed to send email: " + extractErrorMessage(e));
    }
  }

  async verifyConnection(): Promise<boolean> {
    try {
      if (!serverEnv.RESEND_API_KEY) {
        return false;
      }
      return true;
    } catch (e) {
      console.error("Email service verification failed:", e);
      return false;
    }
  }
}

export const emailService = new EmailService();
