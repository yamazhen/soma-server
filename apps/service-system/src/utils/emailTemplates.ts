export interface EmailTemplate {
  subject: string;
  text: string;
  html: string;
}

export const createVerificationEmailTemplate = (
  username: string,
  verificationCode: string,
): EmailTemplate => {
  return {
    subject: "Email Verification Code",
    text: `
      Email Verification

      Hello ${username},

      Thank you for joining soma! Please use the following code to verify your email address:

      ${verificationCode}

      This code will expire in 10 minutes.

      If you did not request this code, please ignore this email.
    `,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Email Verification</h2>
        <p>Hello ${username},</p>
        <p>Thank you for registering! Please use the following verification code to activate your account:</p>
        <div style="background-color: #f4f4f4; padding: 20px; text-align: center; margin: 20px 0;">
          <h1 style="color: #333; letter-spacing: 5px;">${verificationCode}</h1>
        </div>
        <p>This code will expire in 10 minutes.</p>
        <p>If you didn't request this verification, please ignore this email.</p>
        <hr style="margin: 30px 0;">
        <p style="color: #666; font-size: 12px;">This is an automated message, please do not reply.</p>
      </div>
    `,
  };
};
