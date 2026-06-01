import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, json } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  isActive: int("isActive").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Players table - 選手マスタ
 */
export const players = mysqlTable("players", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  number: int("number").notNull(),
  position: varchar("position", { length: 50 }).notNull(),
  isActive: int("isActive").default(1).notNull(),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Player = typeof players.$inferSelect;
export type InsertPlayer = typeof players.$inferInsert;

/**
 * Treatments table - トリートメント記録
 */
export const treatments = mysqlTable("treatments", {
  id: int("id").autoincrement().primaryKey(),
  playerId: int("playerId").notNull(),
  /** JSON array of body part keys, e.g. ["left_shoulder","right_knee"] */
  bodyParts: json("bodyParts").$type<string[]>().notNull(),
  /** JSON array of treatment type keys, e.g. ["massage","taping"] */
  treatmentTypes: json("treatmentTypes").$type<string[]>().notNull(),
  /** Timing: before_practice, during_practice, after_practice, before_match, after_match, other */
  timing: varchar("timing", { length: 50 }).notNull(),
  /** Duration in minutes */
  duration: int("duration").notNull(),
  /** SOAP notes */
  soapS: text("soapS"),
  soapO: text("soapO"),
  soapA: text("soapA"),
  soapP: text("soapP"),
  comment: text("comment"),
  /** JSON object: per-body-part drawing annotations { [bodyPartKey]: { view, strokes } } */
  annotations: json("annotations").$type<Record<string, { view: string; strokes: Array<{ points: Array<{x: number; y: number}>; color: string; width: number }> }>>(),
  /** JSON object: per-body-part detailed treatments { [bodyPartKey]: { treatmentTypes: string[]; duration: number } } */
  treatmentDetails: json("treatmentDetails").$type<Record<string, { treatmentTypes: string[]; duration: number }>>(),
  /** Severity status: out (離脱), limited (要制限), caution (要注意), normal (通常) */
  severity: varchar("severity", { length: 50 }).default("normal").notNull(),
  createdBy: int("createdBy").notNull(),
  treatmentDate: timestamp("treatmentDate").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Treatment = typeof treatments.$inferSelect;
export type InsertTreatment = typeof treatments.$inferInsert;
