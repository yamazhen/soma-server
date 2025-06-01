import { memcache, User } from "@soma-ms/shared";

interface CacheConfig {
  defaultTTL: number;
  userTTL: number;
  sessionTTL: number;
  verificationTTL: number;
  rateLimitTTL: number;
}

interface CachedRefreshTokenData {
  user_id: number;
  username: string;
  email: string;
  expires_at: Date;
  device_info?: string;
}

export const LOGIN_VERIFICATION_CODE_EXPIRY = 300;

class CacheServiceClass {
  private config: CacheConfig = {
    defaultTTL: 300,
    userTTL: 900,
    sessionTTL: 3600,
    verificationTTL: 600,
    rateLimitTTL: 900,
  };

  private metrics = {
    hits: 0,
    misses: 0,
    errors: 0,
  };

  /* Generic Cache Operations
   * Generic Cache Operations */
  private async get<T>(key: string): Promise<T | null> {
    try {
      const cached = await memcache.get(key);
      if (cached.value) {
        this.metrics.hits++;
        return JSON.parse(cached.value.toString());
      }
      this.metrics.misses++;
      return null;
    } catch (error) {
      this.metrics.errors++;
      console.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  private getTTL(type: keyof CacheConfig): number {
    return this.config[type] || this.config.defaultTTL;
  }

  private async set<T>(
    key: string,
    value: T,
    type: keyof CacheConfig,
  ): Promise<void> {
    try {
      const ttl = this.getTTL(type);
      await memcache.set(key, JSON.stringify(value), { expires: ttl });
    } catch (error) {
      this.metrics.errors++;
      console.error(`Cache set error for key ${key}:`, error);
    }
  }

  private async delete(key: string): Promise<void> {
    try {
      await memcache.delete(key);
    } catch (error) {
      this.metrics.errors++;
      console.error(`Cache delete error for key ${key}:`, error);
    }
  }

  /* Utility Methods
   * Utility Methods */
  getMetrics() {
    const total = this.metrics.hits + this.metrics.misses;
    return {
      ...this.metrics,
      hitRate:
        total > 0 ? ((this.metrics.hits / total) * 100).toFixed(2) + "%" : "0%",
      total,
    };
  }

  resetMetrics(): void {
    this.metrics = { hits: 0, misses: 0, errors: 0 };
  }

  updateConfig(newConfig: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  getConfig(): CacheConfig {
    return { ...this.config };
  }

  /* User Cache Operations
   * User Cache Operations */
  async getUser(userId: number): Promise<User | null> {
    return this.get(`user:id:${userId}`);
  }

  async setUser(user: User): Promise<void> {
    const promises = [
      this.set(`user:id:${user.id}`, user, "userTTL"),
      this.set(`user:username:${user.username}`, user, "userTTL"),
      this.set(`user:email:${user.email}`, user, "userTTL"),
    ];
    await Promise.allSettled(promises);
  }

  async getUserByEmail(email: string): Promise<User | null> {
    return this.get(`user:email:${email}`);
  }

  async getUserByUsername(username: string): Promise<User | null> {
    return this.get(`user:username:${username}`);
  }

  async invalidateUser(user: User): Promise<void> {
    const promises = [
      this.delete(`user:id:${user.id}`),
      this.delete(`user:username:${user.username}`),
      this.delete(`user:email:${user.email}`),
      this.delete(`session:${user.id}`),
    ];
    await Promise.allSettled(promises);
  }

  async bulkInvalidateUsers(userIds: number[]): Promise<void> {
    const promises = userIds.map((id) => this.delete(`user:id:${id}`));
    await Promise.allSettled(promises);
  }

  /* Login Session Cache Operations
   * Login Session Cache Operations */
  async setLoginVerificationCode(email: string, code: string): Promise<void> {
    await memcache.set(`login_verification:${email}`, JSON.stringify(code), {
      expires: LOGIN_VERIFICATION_CODE_EXPIRY,
    });
  }

  async getLoginVerificationCode(email: string): Promise<string | null> {
    return this.get(`login_verification:${email}`);
  }

  async deleteLoginVerificationCode(email: string): Promise<void> {
    await this.delete(`login_verification:${email}`);
  }

  async setLoginSession(email: string, sessionData: any): Promise<void> {
    await memcache.set(`login_session:${email}`, JSON.stringify(sessionData), {
      expires: LOGIN_VERIFICATION_CODE_EXPIRY,
    });
  }

  async getLoginSession(email: string): Promise<any | null> {
    return this.get(`login_session:${email}`);
  }

  async deleteLoginSession(email: string): Promise<void> {
    await this.delete(`login_session:${email}`);
  }

  /* Verification Cache Operations
   * Verification Cache Operations */
  async setVerificationCode(email: string, code: string): Promise<void> {
    await this.set(`verification:${email}`, code, "verificationTTL");
  }

  async getVerificationCode(email: string): Promise<string | null> {
    return this.get(`verification:${email}`);
  }

  async deleteVerificationCode(email: string): Promise<void> {
    await this.delete(`verification:${email}`);
  }

  /* Rate Limit & Security Cache Operations
   * Rate Limit & Security Cache Operations */
  async getLoginAttempts(identifier: string): Promise<number> {
    const attempts = await this.get<number>(`login_attempts:${identifier}`);
    return attempts || 0;
  }

  async incrementLoginAttempts(identifier: string): Promise<number> {
    const currentAttempts = await this.getLoginAttempts(identifier);
    const newAttempts = currentAttempts + 1;
    await this.set(`login_attempts:${identifier}`, newAttempts, "rateLimitTTL");
    return newAttempts;
  }

  async resetLoginAttempts(identifier: string): Promise<void> {
    await this.delete(`login_attempts:${identifier}`);
  }

  /* Refresh Token Cache Operations
   * Refresh Token Cache Operations */
  async getRefreshTokenData(
    refreshToken: string,
  ): Promise<CachedRefreshTokenData | null> {
    return this.get<CachedRefreshTokenData>(`refresh_token:${refreshToken}`);
  }

  async setRefreshTokenData(
    refreshToken: string,
    tokenData: CachedRefreshTokenData,
    expiryDate: Date,
  ): Promise<void> {
    const now = new Date();
    const timeUntilExpiry = Math.floor(
      (expiryDate.getTime() - now.getTime()) / 1000,
    );
    const ttl = Math.min(timeUntilExpiry, this.getTTL("sessionTTL"));

    if (ttl > 0) {
      await memcache.set(
        `refresh_token:${refreshToken}`,
        JSON.stringify(tokenData),
        { expires: ttl },
      );
    }
  }

  async deleteRefreshTokenData(refreshToken: string): Promise<void> {
    await this.delete(`refresh_token:${refreshToken}`);
  }

  async invalidateUserRefreshTokens(userId: number): Promise<void> {
    await this.delete(`user:refresh_tokens:${userId}`);
  }

  /* Email Rate Limit Cache Operations
   * Email Rate Limit Cache Operations */
  async getRecentEmailSent(email: string): Promise<boolean> {
    const recent = await this.get<boolean>(`recent_email:${email}`);
    return recent || false;
  }

  async setRecentEmailSent(
    email: string,
    cooldownSeconds: number = 60,
  ): Promise<void> {
    await memcache.set(`recent_email:${email}`, JSON.stringify(true), {
      expires: cooldownSeconds,
    });
  }

  async getEmailSendCount(email: string): Promise<number> {
    const count = await this.get<number>(`email_count:${email}`);
    return count || 0;
  }

  async incrementEmailSendCount(
    email: string,
    windowSeconds: number = 3600,
  ): Promise<number> {
    const currentCount = await this.getEmailSendCount(email);
    const newCount = currentCount + 1;
    await memcache.set(`email_count:${email}`, JSON.stringify(newCount), {
      expires: windowSeconds,
    });
    return newCount;
  }

  /* Verification Attempt Rate Limiting
   * Verification Attempt Rate Limiting */
  async getVerificationAttempts(identifier: string): Promise<number> {
    const attempts = await this.get<number>(
      `verification_attempts:${identifier}`,
    );
    return attempts || 0;
  }

  async incrementVerificationAttempts(identifier: string): Promise<number> {
    const currentAttempts = await this.getVerificationAttempts(identifier);
    const newAttempts = currentAttempts + 1;
    await this.set(
      `verification_attempts:${identifier}`,
      newAttempts,
      "rateLimitTTL",
    );
    return newAttempts;
  }

  async resetVerificationAttempts(identifier: string): Promise<void> {
    await this.delete(`verification_attempts:${identifier}`);
  }
}

export const CacheService = new CacheServiceClass();
