import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, json, float } from "drizzle-orm/mysql-core";

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
  treatmentRole: varchar("treatmentRole", { length: 20 }).default("write").notNull(),
  trainingRole: varchar("trainingRole", { length: 20 }).default("write").notNull(),
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
  bodyWeight: float("bodyWeight"),
  notes: text("notes"),
  isActive: int("isActive").default(1).notNull(),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Player = typeof players.$inferSelect;
export type InsertPlayer = typeof players.$inferInsert;
export type Athlete = Player;
export type InsertAthlete = InsertPlayer;

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
  annotations: json("annotations").$type<{ [key: string]: { view: string; strokes: Array<{ points: Array<{x: number; y: number}>; color: string; width: number }> } }>(),
  /** JSON object: per-body-part detailed treatments { [bodyPartKey]: { treatmentTypes: string[]; duration: number } } */
  treatmentDetails: json("treatmentDetails").$type<{ [key: string]: { treatmentTypes: string[]; duration: number } }>(),
  /** Severity status: out (離脱), limited (要制限), caution (要注意), normal (通常) */
  severity: varchar("severity", { length: 50 }).default("normal").notNull(),
  createdBy: int("createdBy").notNull(),
  treatmentDate: timestamp("treatmentDate").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Treatment = typeof treatments.$inferSelect;
export type InsertTreatment = typeof treatments.$inferInsert;

/**
 * Schedules table - チームスケジュール & トリートメント割り当て
 */
export const schedules = mysqlTable("schedules", {
  id: int("id").autoincrement().primaryKey(),
  date: varchar("date", { length: 10 }).notNull().unique(), // YYYY-MM-DD
  practiceAm: text("practiceAm"),
  practicePm: text("practicePm"),
  assignments: text("assignments"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Schedule = typeof schedules.$inferSelect;
export type InsertSchedule = typeof schedules.$inferInsert;

/**
 * Exercises table - 提供されたエクササイズ (セルフケア、コレクティブ、リコンディショニング等)
 */
export const exercises = mysqlTable("exercises", {
  id: int("id").autoincrement().primaryKey(),
  playerId: int("playerId").notNull(),
  sessionId: varchar("sessionId", { length: 50 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  category: varchar("category", { length: 50 }).notNull(), // self_care, collective, rehab, other
  type: varchar("type", { length: 100 }), // ストレッチ, 体幹トレーニング等
  frequency: varchar("frequency", { length: 255 }), // 週3回, 毎日練習前等
  points: text("points"), // 目的・ポイント
  mediaUrls: json("mediaUrls").$type<string[]>(), // 添付メディア(画像・動画)URLの配列
  createdBy: int("createdBy").notNull(), // 登録したトレーナーID
  providedDate: timestamp("providedDate").notNull(), // 提供日
  isCompleted: int("isCompleted").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Exercise = typeof exercises.$inferSelect;
export type InsertExercise = typeof exercises.$inferInsert;

// ==========================================
// トレーニング管理アプリから移植されたスキーマ
// ==========================================

export const programs = mysqlTable("programs", {
  id: int("id").autoincrement().primaryKey(),
  athleteId: int("athleteId").notNull(), // players.id を参照します
  date: varchar("date", { length: 10 }).notNull(), // YYYY-MM-DD
  phase: varchar("phase", { length: 100 }),
  periodCategory: varchar("periodCategory", { length: 100 }),
  goal: text("goal"),
  bodyWeight: float("bodyWeight"),
  totalSets: int("totalSets"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Program = typeof programs.$inferSelect;
export type InsertProgram = typeof programs.$inferInsert;

export const sections = mysqlTable("sections", {
  id: int("id").autoincrement().primaryKey(),
  programId: int("programId").notNull(),
  category: varchar("category", { length: 50 }).notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Section = typeof sections.$inferSelect;
export type InsertSection = typeof sections.$inferInsert;

// ※ 施術アプリの exercises と衝突するため、変数名を trainingExercises, 物理テーブル名を training_exercises に変更
export const trainingExercises = mysqlTable("training_exercises", {
  id: int("id").autoincrement().primaryKey(),
  sectionId: int("sectionId").notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  sets: int("sets"),
  reps: varchar("reps", { length: 50 }),
  load: varchar("load", { length: 100 }),
  attention: text("attention"),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TrainingExercise = typeof trainingExercises.$inferSelect;
export type InsertTrainingExercise = typeof trainingExercises.$inferInsert;

export const records = mysqlTable("records", {
  id: int("id").autoincrement().primaryKey(),
  programId: int("programId").notNull(),
  exerciseId: int("exerciseId").notNull(), // trainingExercises.id を参照します
  athleteId: int("athleteId").notNull(), // players.id を参照します
  date: varchar("date", { length: 10 }).notNull(), // YYYY-MM-DD
  actualSets: int("actualSets"),
  actualReps: varchar("actualReps", { length: 50 }),
  actualLoad: varchar("actualLoad", { length: 100 }),
  notes: text("notes"),
  source: mysqlEnum("source", ["manual", "ocr"]).default("manual").notNull(),
  changeReason: mysqlEnum("changeReason", ["condition", "injury", "technique", "plan", "other"]),
  changeNote: text("changeNote"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Record = typeof records.$inferSelect;
export type InsertRecord = typeof records.$inferInsert;

export const photos = mysqlTable("photos", {
  id: int("id").autoincrement().primaryKey(),
  programId: int("programId").notNull(),
  athleteId: int("athleteId").notNull(), // players.id を参照します
  date: varchar("date", { length: 10 }).notNull(),
  fileUrl: text("fileUrl").notNull(),
  fileKey: varchar("fileKey", { length: 500 }).notNull(),
  ocrRawResult: text("ocrRawResult"),
  ocrParsed: json("ocrParsed"),
  status: mysqlEnum("status", ["pending", "processing", "done", "error"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Photo = typeof photos.$inferSelect;
export type InsertPhoto = typeof photos.$inferInsert;

export const exerciseMaster = mysqlTable("exercise_master", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 200 }).notNull().unique(),
  category: varchar("category", { length: 50 }).notNull(),
  defaultSets: int("defaultSets"),
  defaultReps: varchar("defaultReps", { length: 50 }),
  defaultLoad: varchar("defaultLoad", { length: 100 }),
  attention: text("attention"),
  usageCount: int("usageCount").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ExerciseMaster = typeof exerciseMaster.$inferSelect;
export type InsertExerciseMaster = typeof exerciseMaster.$inferInsert;

export const userApprovals = mysqlTable("user_approvals", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
  approvedBy: int("approvedBy"),
  approvedAt: timestamp("approvedAt"),
  note: text("note"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UserApproval = typeof userApprovals.$inferSelect;
export type InsertUserApproval = typeof userApprovals.$inferInsert;

