export interface EmailTemplate {
    subject: string;
    text: string;
    html: string;
}
export declare const createVerificationEmailTemplate: (username: string, verificationCode: string) => EmailTemplate;
export declare const createEmailChangeVerificationTemplate: (username: string, verificationCode: string, newEmail: string) => EmailTemplate;
//# sourceMappingURL=emailTemplates.d.ts.map