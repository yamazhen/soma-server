export interface User {
  id: number;
  username: string;
  email: string;
  password: string;
  profile_picture: string;
  is_active: boolean;
  is_verified: boolean;
  verification_code?: string;
  verification_code_expiry?: Date;
  last_login: Date;
  create_date: Date;
  update_date: Date;
  done_by: string;
}

export interface UserDto {
  username: string;
  email: string;
}

export interface OAuthProvider {
  id: number;
  user_id: number;
  provider: string;
  provider_id: string;
  create_date: Date;
}

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

export interface EmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: Array<{
    filename: string;
    content?: string | Buffer;
    path?: string;
  }>;
}
