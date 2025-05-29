import { memcache } from "../config/cache";
import type { User } from "../types/modelTypes";

interface CacheConfig {
	defaultTTL: number;
	userTTL: number;
	sessionTTL: number;
	verificationTTL: number;
	rateLimitTTL: number;
}

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
}

export const CacheService = new CacheServiceClass();
