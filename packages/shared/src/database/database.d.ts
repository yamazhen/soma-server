import { Pool } from "pg";
export declare class Database {
    private static pool;
    static init(dbName: string): Promise<Pool>;
    static testConnection(): Promise<boolean>;
    static query(text: string, params?: any[]): Promise<any>;
    static end(): Promise<void>;
}
//# sourceMappingURL=database.d.ts.map