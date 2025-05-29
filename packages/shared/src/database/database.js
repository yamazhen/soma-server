import { Pool } from "pg";
export class Database {
    static pool;
    static async init(dbName) {
        if (!this.pool) {
            const poolConfig = {
                host: process.env["PG_HOST"],
                port: parseInt(process.env["PG_PORT"] || "5432"),
                user: process.env["PG_USER"],
                password: process.env["PG_PASSWORD"],
                database: dbName,
            };
            this.pool = new Pool(poolConfig);
            console.log(`DATABASE INITIALIZED: ${dbName}`);
            try {
                await this.testConnection();
            }
            catch (e) {
                console.error("DATABASE INITIALIZATION ERROR:", e);
                await this.end();
                throw e;
            }
        }
        return this.pool;
    }
    static async testConnection() {
        if (!this.pool) {
            throw new Error("DATABASE NOT INITIALIZED");
        }
        const client = await this.pool.connect();
        try {
            const result = await client.query("SELECT current_database() as db_name, NOW()");
            console.log(`Connected to database: ${result.rows[0].db_name} at ${result.rows[0].now}`);
            return true;
        }
        catch (error) {
            console.error("Database connection test failed:", error);
            throw error;
        }
        finally {
            client.release();
        }
    }
    static async query(text, params) {
        if (!this.pool) {
            throw new Error("Database not initialized");
        }
        return await this.pool.query(text, params);
    }
    static async end() {
        if (this.pool) {
            await this.pool.end();
        }
    }
}
//# sourceMappingURL=database.js.map