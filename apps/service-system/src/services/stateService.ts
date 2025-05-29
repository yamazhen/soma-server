// src/services/stateService.ts
import { Database } from "@soma-ms/shared";

interface StateData {
	clientType: string;
	timestamp: number;
	[key: string]: any; // Allow additional properties
}

export class StateStore {
	private tableName = "oauth_states";

	/**
	 * Store a state token with associated data and expiration
	 */
	async set(
		stateToken: string,
		data: StateData,
		ttlSeconds: number = 600,
	): Promise<void> {
		try {
			const query = `
        INSERT INTO ${this.tableName} (state_token, data, expires_at)
        VALUES ($1, $2, NOW() + interval '${ttlSeconds} seconds')
        ON CONFLICT (state_token) 
        DO UPDATE SET 
          data = $2,
          expires_at = NOW() + interval '${ttlSeconds} seconds'
      `;

			await Database.query(query, [stateToken, JSON.stringify(data)]);
		} catch (error) {
			console.error("Error storing OAuth state:", error);
			throw error;
		}
	}

	/**
	 * Retrieve data associated with a state token
	 */
	async get(stateToken: string): Promise<StateData | null> {
		try {
			const query = `
        SELECT data 
        FROM ${this.tableName}
        WHERE state_token = $1 AND expires_at > NOW()
      `;

			const result = await Database.query(query, [stateToken]);

			if (result.rows.length === 0) {
				return null;
			}

			return result.rows[0].data;
		} catch (error) {
			console.error("Error retrieving OAuth state:", error);
			return null;
		}
	}

	/**
	 * Delete a state token after it's been used
	 */
	async delete(stateToken: string): Promise<boolean> {
		try {
			const query = `
        DELETE FROM ${this.tableName}
        WHERE state_token = $1
        RETURNING state_token
      `;

			const result = await Database.query(query, [stateToken]);
			return result.rowCount > 0;
		} catch (error) {
			console.error("Error deleting OAuth state:", error);
			return false;
		}
	}

	/**
	 * Clean up expired state tokens
	 */
	async cleanup(): Promise<number> {
		try {
			const query = `
        DELETE FROM ${this.tableName}
        WHERE expires_at <= NOW()
        RETURNING state_token
      `;

			const result = await Database.query(query);
			const count = result.rowCount;

			if (count > 0) {
				console.log(`Cleaned up ${count} expired OAuth states`);
			}

			return count;
		} catch (error) {
			console.error("Error cleaning up expired OAuth states:", error);
			return 0;
		}
	}

	/**
	 * Set up periodic cleanup of expired states
	 */
	setupCleanup(): void {
		// Run cleanup every 15 minutes
		const CLEANUP_INTERVAL = 15 * 60 * 1000; // 15 minutes in milliseconds

		setInterval(() => {
			this.cleanup().catch((err) => {
				console.error("Error during OAuth state cleanup:", err);
			});
		}, CLEANUP_INTERVAL);
	}
}

// Create a singleton instance
export const stateStore = new StateStore();
