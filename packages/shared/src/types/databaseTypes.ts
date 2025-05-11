export interface ColumnDefinition {
  type: string;
  primaryKey?: boolean;
  unique?: boolean;
  notNull?: boolean;
  references?: {
    table: string;
    column: string;
  };
  default?: string;
}

export interface IndexDefinition {
  name?: string;
  columns: string[];
  unique?: boolean;
  type?: "btree" | "hash" | "gist" | "gin";
}

export interface ModelSchema {
  tableName: string;
  columns: Record<string, ColumnDefinition | string>;
  indexes?: IndexDefinition[];
}
