import type { EmailOptions } from "@soma-ms/shared";
declare class EmailService {
    private transporter;
    constructor();
    sendEmail(options: EmailOptions): Promise<void>;
    verifyConnection(): Promise<boolean>;
}
export declare const emailService: EmailService;
export {};
//# sourceMappingURL=emailService.d.ts.map