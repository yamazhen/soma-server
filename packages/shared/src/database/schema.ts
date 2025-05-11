import type { ModelSchema } from "../index.js";
import { Database } from "./database.js";

export async function initSchema(models: ModelSchema[]): Promise<void> {
  if (process.env["INIT_SCHEMA"] !== "true") return;
  for (const model of models) {
    try {
      const columnDefinitions = Object.entries(model.columns)
        .map(([name, definition]) => {
          if (typeof definition === "string") {
            return `${name} ${definition}`;
          } else {
            let columnDef = `${name} ${definition.type}`;
            if (definition.primaryKey) columnDef += " PRIMARY KEY";
            if (definition.unique) columnDef += " UNIQUE";
            if (definition.notNull) columnDef += " NOT NULL";
            if (definition.references) {
              columnDef += ` REFERENCES ${definition.references.table}(${definition.references.column})`;
            }
            if (definition.default)
              columnDef += ` DEFAULT ${definition.default}`;
            return columnDef;
          }
        })
        .join(", ");

      const createTableQuery = `CREATE TABLE IF NOT EXISTS ${model.tableName} (${columnDefinitions})`;

      await Database.query(createTableQuery);

      if (model.indexes) {
        for (const index of model.indexes) {
          const indexName =
            index.name || `${model.tableName}_${index.columns.join("_")}_idx`;
          const indexColumns = index.columns.join(", ");
          const indexType = index.type ? `USING ${index.type}` : "";
          const unique = index.unique ? "UNIQUE" : "";

          const createIndexQuery = `CREATE ${unique} INDEX IF NOT EXISTS ${indexName} ON ${model.tableName} ${indexType} (${indexColumns})`;

          await Database.query(createIndexQuery);
        }
      }
    } catch (e) {
      console.error(`Error creating table ${model.tableName}:`, e);
      throw e;
    }
  }
}
