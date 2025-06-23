import { int, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { randomUUID } from "node:crypto";

export const files = sqliteTable("files", {
  id: int().primaryKey({ autoIncrement: true }),
  uuid: text()
    .notNull()
    .$default(() => randomUUID()),
  encryption_key: text().notNull(),
  name: text().notNull(),
  type: text().notNull(),
  size: int().notNull(),
  created_at: int({ mode: "timestamp_ms" })
    .notNull()
    .$default(() => new Date()),
  updated_at: int({ mode: "timestamp_ms" })
    .notNull()
    .$default(() => new Date()),
});

export const chunks = sqliteTable(
  "chunks",
  {
    id: int().primaryKey({ autoIncrement: true }),
    uuid: text()
      .notNull()
      .$default(() => randomUUID()),
    file_id: int()
      .notNull()
      .references(() => files.id, { onDelete: "cascade" }),
    index: int().notNull(),
    iv: text().notNull(),
    url: text().notNull(),
    url_expires: int({ mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    uniqueIndex("chunks_file_id_index").on(table.file_id, table.index),
  ]
);

export const webhooks = sqliteTable("webhooks", {
  id: int().primaryKey({ autoIncrement: true }),
  url: text().notNull().unique(),
});
