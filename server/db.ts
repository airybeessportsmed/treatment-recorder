import { eq, desc, and, like, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { InsertUser, users, players, treatments, type InsertPlayer, type InsertTreatment } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      // Safely parse URL to strip custom 'ssl' parameter which crashes mysql2
      const parsedUrl = new URL(process.env.DATABASE_URL);
      parsedUrl.searchParams.delete("ssl");
      const cleanUrl = parsedUrl.toString();

      // Create custom connection pool with explicit SSL rejection settings for TiDB/MySQL
      const pool = mysql.createPool({
        uri: cleanUrl,
        ssl: {
          rejectUnauthorized: true,
        },
      });

      _db = drizzle(pool);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ===== User Helpers =====

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ===== Player Helpers =====

export async function createPlayer(data: Omit<InsertPlayer, "id" | "createdAt" | "updatedAt">) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(players).values(data);
  return { id: result[0].insertId };
}

export async function getPlayers(createdBy?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(players)
    .where(eq(players.isActive, 1))
    .orderBy(players.number);
}

export async function getPlayerById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.select().from(players).where(eq(players.id, id)).limit(1);
  return result[0] ?? null;
}

export async function updatePlayer(id: number, data: Partial<Pick<InsertPlayer, "name" | "number" | "position">>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(players).set(data).where(eq(players.id, id));
}

export async function deletePlayer(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Soft delete
  await db.update(players).set({ isActive: 0 }).where(eq(players.id, id));
}

// ===== Treatment Helpers =====

export async function createTreatment(data: Omit<InsertTreatment, "id" | "createdAt" | "updatedAt">) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(treatments).values(data);
  return { id: result[0].insertId };
}

export async function getTreatments(filters: {
  createdBy: number;
  playerId?: number;
  dateFrom?: Date;
  dateTo?: Date;
  bodyPart?: string;
  treatmentType?: string;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const conditions: any[] = [];

  if (filters.playerId) {
    conditions.push(eq(treatments.playerId, filters.playerId));
  }
  if (filters.dateFrom) {
    conditions.push(sql`${treatments.treatmentDate} >= ${filters.dateFrom}`);
  }
  if (filters.dateTo) {
    conditions.push(sql`${treatments.treatmentDate} <= ${filters.dateTo}`);
  }
  if (filters.bodyPart) {
    conditions.push(sql`JSON_CONTAINS(${treatments.bodyParts}, ${JSON.stringify(filters.bodyPart)})`);
  }
  if (filters.treatmentType) {
    conditions.push(sql`JSON_CONTAINS(${treatments.treatmentTypes}, ${JSON.stringify(filters.treatmentType)})`);
  }

  const limit = filters.limit ?? 50;
  const offset = filters.offset ?? 0;

  const rows = await db.select({
    id: treatments.id,
    playerId: treatments.playerId,
    bodyParts: treatments.bodyParts,
    treatmentTypes: treatments.treatmentTypes,
    timing: treatments.timing,
    duration: treatments.duration,
    soapS: treatments.soapS,
    soapO: treatments.soapO,
    soapA: treatments.soapA,
    soapP: treatments.soapP,
    comment: treatments.comment,
    annotations: treatments.annotations,
    treatmentDetails: treatments.treatmentDetails,
    severity: treatments.severity,
    createdBy: treatments.createdBy,
    createdByName: users.name,
    treatmentDate: treatments.treatmentDate,
    createdAt: treatments.createdAt,
    updatedAt: treatments.updatedAt,
  })
  .from(treatments)
  .leftJoin(users, eq(treatments.createdBy, users.id))
  .where(and(...conditions))
  .orderBy(desc(treatments.treatmentDate))
  .limit(limit)
  .offset(offset);

  // Count total for pagination
  const countResult = await db.select({ count: sql<number>`count(*)` }).from(treatments)
    .where(and(...conditions));

  return {
    rows,
    total: countResult[0]?.count ?? 0,
  };
}

export async function getTreatmentById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.select({
    id: treatments.id,
    playerId: treatments.playerId,
    bodyParts: treatments.bodyParts,
    treatmentTypes: treatments.treatmentTypes,
    timing: treatments.timing,
    duration: treatments.duration,
    soapS: treatments.soapS,
    soapO: treatments.soapO,
    soapA: treatments.soapA,
    soapP: treatments.soapP,
    comment: treatments.comment,
    annotations: treatments.annotations,
    treatmentDetails: treatments.treatmentDetails,
    severity: treatments.severity,
    createdBy: treatments.createdBy,
    createdByName: users.name,
    treatmentDate: treatments.treatmentDate,
    createdAt: treatments.createdAt,
    updatedAt: treatments.updatedAt,
  })
  .from(treatments)
  .leftJoin(users, eq(treatments.createdBy, users.id))
  .where(eq(treatments.id, id))
  .limit(1);
  return result[0] ?? null;
}

export async function updateTreatment(id: number, data: Partial<Omit<InsertTreatment, "id" | "createdAt" | "updatedAt" | "createdBy">>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(treatments).set(data).where(eq(treatments.id, id));
}

export async function deleteTreatment(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(treatments).where(eq(treatments.id, id));
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(users).where(eq(users.isActive, 1)).orderBy(desc(users.id));
}

export async function updateUser(openId: string, name: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ name }).where(eq(users.openId, openId));
}

export async function deactivateUser(openId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ isActive: 0 }).where(eq(users.openId, openId));
}

