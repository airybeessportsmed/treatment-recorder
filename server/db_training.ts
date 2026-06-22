import { eq, desc, asc, and, like, sql, inArray } from "drizzle-orm";
import { getDb } from "./db";
import {
  players,
  programs,
  sections,
  trainingExercises,
  records,
  photos,
  exerciseMaster,
  userApprovals,
  type Player,
  type InsertPlayer,
  type InsertProgram,
  type InsertSection,
  type InsertTrainingExercise,
  type InsertRecord,
  type InsertPhoto,
  type InsertExerciseMaster,
  type UserApproval,
  users,
} from "../drizzle/schema";

// =====================
// Athletes (Mapped to Players)
// =====================
export async function getAthletes() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(players).where(eq(players.isActive, 1)).orderBy(asc(players.number));
}

export async function getAthleteById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(players).where(and(eq(players.id, id), eq(players.isActive, 1))).limit(1);
  return result[0];
}

export async function createAthlete(data: Omit<InsertPlayer, "id" | "createdAt" | "updatedAt">) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(players).values(data);
  return result;
}

export async function updateAthlete(id: number, data: Partial<InsertPlayer>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(players).set(data).where(eq(players.id, id));
}

export async function deleteAthlete(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  // Soft delete matches Treatment App behavior
  await db.update(players).set({ isActive: 0 }).where(eq(players.id, id));
}

// =====================
// Programs
// =====================
export async function getProgramsByAthleteAndDate(athleteId: number, date: string) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(programs)
    .where(and(eq(programs.athleteId, athleteId), eq(programs.date, date)))
    .limit(10);
}

export async function getPrograms(athleteId?: number) {
  const db = await getDb();
  if (!db) return [];
  
  let programList;
  if (athleteId) {
    programList = await db.select().from(programs).where(eq(programs.athleteId, athleteId)).orderBy(desc(programs.date));
  } else {
    programList = await db.select().from(programs).orderBy(desc(programs.date));
  }

  if (programList.length === 0) return [];

  // 各プログラムに紐づくレコードの集計を取得
  const recordsSummary = await db
    .select({
      programId: records.programId,
      totalCount: sql<number>`count(${records.id})`,
      ocrCount: sql<number>`sum(case when ${records.source} = 'ocr' then 1 else 0 end)`,
      manualCount: sql<number>`sum(case when ${records.source} = 'manual' then 1 else 0 end)`,
    })
    .from(records)
    .groupBy(records.programId);

  // マップ化してマージしやすくする
  const summaryMap = new Map<number, typeof recordsSummary[0]>();
  for (const s of recordsSummary) {
    summaryMap.set(s.programId, s);
  }

  return programList.map(p => {
    const summary = summaryMap.get(p.id);
    const totalCount = summary ? Number(summary.totalCount) : 0;
    const ocrCount = summary ? Number(summary.ocrCount) : 0;
    const manualCount = summary ? Number(summary.manualCount) : 0;
    
    let status: "ocr" | "manual" | "pending" = "pending";
    if (totalCount > 0) {
      status = ocrCount > 0 ? "ocr" : "manual";
    }

    return {
      ...p,
      recordCount: totalCount,
      ocrCount: ocrCount,
      manualCount: manualCount,
      status
    };
  });
}

export async function getProgramById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(programs).where(eq(programs.id, id)).limit(1);
  return result[0];
}

export async function getProgramWithDetails(id: number) {
  const db = await getDb();
  if (!db) return null;
  const program = await db.select().from(programs).where(eq(programs.id, id)).limit(1);
  if (!program[0]) return null;
  const athlete = await db.select().from(players).where(eq(players.id, program[0].athleteId)).limit(1);
  const sectionList = await db.select().from(sections).where(eq(sections.programId, id)).orderBy(asc(sections.sortOrder));
  const sectionIds = sectionList.map(s => Number(s.id));
  const exerciseList = sectionIds.length > 0
    ? await db.select().from(trainingExercises).where(inArray(trainingExercises.sectionId, sectionIds)).orderBy(asc(trainingExercises.sortOrder))
    : [];
  return {
    ...program[0],
    athlete: athlete[0],
    sections: sectionList.map(s => ({
      ...s,
      exercises: exerciseList.filter(e => Number(e.sectionId) === Number(s.id)),
    })),
  };
}

export async function createProgram(data: InsertProgram) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(programs).values(data);
  return result[0];
}

export async function updateProgram(id: number, data: Partial<InsertProgram>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(programs).set(data).where(eq(programs.id, id));
}

export async function deleteProgram(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(programs).where(eq(programs.id, id));
}

export async function bulkDeletePrograms(ids: number[]) {
  const db = await getDb();
  if (!db || ids.length === 0) return;

  await db.transaction(async (tx) => {
    // 1. 各プログラムに関連する sections の ID を取得
    const sectionsToDelete = await tx
      .select({ id: sections.id })
      .from(sections)
      .where(inArray(sections.programId, ids));

    const sectionIds = sectionsToDelete.map(s => s.id);

    if (sectionIds.length > 0) {
      // 2. exercises を削除
      await tx
        .delete(trainingExercises)
        .where(inArray(trainingExercises.sectionId, sectionIds));

      // 3. sections を削除
      await tx
        .delete(sections)
        .where(inArray(sections.id, sectionIds));
    }

    // 4. 関連する records (実績記録) を削除
    await tx
      .delete(records)
      .where(inArray(records.programId, ids));

    // 5. 関連する photos (OCR画像レコード) を削除
    await tx
      .delete(photos)
      .where(inArray(photos.programId, ids));

    // 6. programs 自体を削除
    await tx
      .delete(programs)
      .where(inArray(programs.id, ids));
  });
}

// =====================
// Sections
// =====================
export async function getSectionsByProgramId(programId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(sections).where(eq(sections.programId, programId)).orderBy(asc(sections.sortOrder));
}

export async function createSection(data: InsertSection) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(sections).values(data);
  return result;
}

export async function deleteSectionsByProgramId(programId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(sections).where(eq(sections.programId, programId));
}

// =====================
// Exercises (Mapped to trainingExercises)
// =====================
export async function getExercisesBySectionId(sectionId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(trainingExercises).where(eq(trainingExercises.sectionId, sectionId)).orderBy(asc(trainingExercises.sortOrder));
}

export async function createExercise(data: InsertTrainingExercise) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(trainingExercises).values(data);
  return result;
}

export async function deleteExercisesBySectionId(sectionId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(trainingExercises).where(eq(trainingExercises.sectionId, sectionId));
}

// =====================
// Records
// =====================
export async function getRecordsByProgram(programId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(records).where(eq(records.programId, programId));
}

export async function getRecordsByAthlete(athleteId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(records).where(eq(records.athleteId, athleteId)).orderBy(desc(records.date));
}

export async function getRecordsByExerciseName(athleteId: number, exerciseName: string) {
  const db = await getDb();
  if (!db) return [];
  const result = await db
    .select({
      id: records.id,
      date: records.date,
      actualSets: records.actualSets,
      actualReps: records.actualReps,
      actualLoad: records.actualLoad,
      notes: records.notes,
      exerciseName: trainingExercises.name,
    })
    .from(records)
    .innerJoin(trainingExercises, eq(records.exerciseId, trainingExercises.id))
    .where(and(eq(records.athleteId, athleteId), like(trainingExercises.name, `%${exerciseName}%`)))
    .orderBy(asc(records.date));
  return result;
}

export async function upsertRecord(data: InsertRecord) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const existing = await db
    .select()
    .from(records)
    .where(and(eq(records.programId, data.programId), eq(records.exerciseId, data.exerciseId)))
    .limit(1);
  if (existing[0]) {
    await db.update(records).set(data).where(eq(records.id, existing[0].id));
    return existing[0].id;
  } else {
    const result = await db.insert(records).values(data);
    return result[0];
  }
}

export async function bulkInsertRecords(dataList: InsertRecord[]) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  if (dataList.length === 0) return;
  await db.insert(records).values(dataList);
}

// =====================
// Photos
// =====================
export async function createPhoto(data: InsertPhoto) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(photos).values(data);
  return result;
}

export async function getPhotosByProgram(programId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(photos).where(eq(photos.programId, programId)).orderBy(desc(photos.createdAt));
}

export async function updatePhoto(id: number, data: Partial<InsertPhoto>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(photos).set(data).where(eq(photos.id, id));
}

// =====================
// Exercise Master
// =====================
export async function getExerciseMaster(category?: string) {
  const db = await getDb();
  if (!db) return [];
  if (category) {
    return db.select().from(exerciseMaster).where(eq(exerciseMaster.category, category)).orderBy(desc(exerciseMaster.usageCount));
  }
  return db.select().from(exerciseMaster).orderBy(desc(exerciseMaster.usageCount));
}

export async function upsertExerciseMaster(name: string, category: string, defaults?: Partial<InsertExerciseMaster>) {
  const db = await getDb();
  if (!db) return;
  await db
    .insert(exerciseMaster)
    .values({ name, category, usageCount: 1, ...defaults })
    .onDuplicateKeyUpdate({
      set: { usageCount: sql`${exerciseMaster.usageCount} + 1`, ...defaults },
    });
}

// =====================
// Stats for charts
// =====================
export async function getExerciseHistory(athleteId: number) {
  const db = await getDb();
  if (!db) return [];
  const result = await db
    .select({
      date: records.date,
      actualLoad: records.actualLoad,
      actualReps: records.actualReps,
      actualSets: records.actualSets,
      exerciseName: trainingExercises.name,
      exerciseId: trainingExercises.id,
      notes: records.notes,
      changeReason: records.changeReason,
      changeNote: records.changeNote,
    })
    .from(records)
    .innerJoin(trainingExercises, eq(records.exerciseId, trainingExercises.id))
    .where(eq(records.athleteId, athleteId))
    .orderBy(asc(records.date));
  return result;
}

// =====================
// Report: 日付別トレーニングレポート
// =====================
export async function getTrainingReportByDate(date: string) {
  const db = await getDb();
  if (!db) return [];
  const result = await db
    .select({
      recordId: records.id,
      programId: records.programId,
      athleteId: records.athleteId,
      athleteName: players.name,
      athleteNumber: players.number,
      exerciseId: trainingExercises.id,
      exerciseName: trainingExercises.name,
      sectionCategory: sections.category,
      // 計画値
      plannedSets: trainingExercises.sets,
      plannedReps: trainingExercises.reps,
      plannedLoad: trainingExercises.load,
      // 実績値
      actualSets: records.actualSets,
      actualReps: records.actualReps,
      actualLoad: records.actualLoad,
      notes: records.notes,
      source: records.source,
      date: records.date,
      changeReason: records.changeReason,
      changeNote: records.changeNote,
    })
    .from(records)
    .innerJoin(trainingExercises, eq(records.exerciseId, trainingExercises.id))
    .innerJoin(sections, eq(trainingExercises.sectionId, sections.id))
    .innerJoin(players, eq(records.athleteId, players.id))
    .where(eq(records.date, date))
    .orderBy(asc(players.number), asc(sections.sortOrder), asc(trainingExercises.sortOrder));
  return result;
}

export async function getRecentTrainingDates(limit = 10) {
  const db = await getDb();
  if (!db) return [];
  const result = await db
    .selectDistinct({ date: records.date })
    .from(records)
    .orderBy(desc(records.date))
    .limit(limit);
  return result.map(r => r.date);
}

export async function getDashboardStats() {
  const db = await getDb();
  if (!db) return { athleteCount: 0, programCount: 0, recordCount: 0, ocrCount: 0 };
  const [athleteCount, programCount, recordCount, ocrCount] = await Promise.all([
    db.select({ count: sql<number>`COUNT(*)` }).from(players).where(eq(players.isActive, 1)),
    db.select({ count: sql<number>`COUNT(*)` }).from(programs),
    db.select({ count: sql<number>`COUNT(*)` }).from(records),
    db.select({ count: sql<number>`COUNT(*)` }).from(records).where(eq(records.source, "ocr")),
  ]);
  return {
    athleteCount: Number(athleteCount[0]?.count ?? 0),
    programCount: Number(programCount[0]?.count ?? 0),
    recordCount: Number(recordCount[0]?.count ?? 0),
    ocrCount: Number(ocrCount[0]?.count ?? 0),
  };
}

export async function bulkInsertExerciseMasterSkipExisting(
  items: Array<{ name: string; category: string; defaultSets?: number; defaultReps?: string; defaultLoad?: string; attention?: string }>
): Promise<{ inserted: string[]; skipped: string[] }> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const existing = await db.select({ name: exerciseMaster.name }).from(exerciseMaster);
  const existingNames = new Set(existing.map(e => e.name.trim().toLowerCase()));
  const inserted: string[] = [];
  const skipped: string[] = [];
  for (const item of items) {
    const normalizedName = item.name.trim().toLowerCase();
    if (existingNames.has(normalizedName)) {
      skipped.push(item.name);
    } else {
      await db.insert(exerciseMaster).values({ ...item, usageCount: 0 });
      existingNames.add(normalizedName);
      inserted.push(item.name);
    }
  }
  return { inserted, skipped };
}

export async function createExerciseMaster(data: InsertExerciseMaster) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(exerciseMaster).values({ ...data, usageCount: 0 });
  return result;
}

export async function updateExerciseMaster(id: number, data: Partial<InsertExerciseMaster>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(exerciseMaster).set(data).where(eq(exerciseMaster.id, id));
}

export async function deleteExerciseMaster(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(exerciseMaster).where(eq(exerciseMaster.id, id));
}

export async function getAllExerciseMasterGrouped() {
  const db = await getDb();
  if (!db) return {};
  const all = await db.select().from(exerciseMaster).orderBy(asc(exerciseMaster.category), desc(exerciseMaster.usageCount), asc(exerciseMaster.name));
  const grouped: Record<string, typeof all> = {};
  for (const item of all) {
    if (!grouped[item.category]) grouped[item.category] = [];
    grouped[item.category].push(item);
  }
  return grouped;
}

// =====================
// Batch Print
// =====================
export async function getProgramsByDateWithDetails(date: string) {
  const db = await getDb();
  if (!db) return [];

  const programList = await db
    .select()
    .from(programs)
    .where(eq(programs.date, date))
    .orderBy(asc(programs.athleteId));

  if (programList.length === 0) return [];

  const athleteIds = Array.from(new Set(programList.map(p => p.athleteId)));
  const athleteList = await db
    .select()
    .from(players)
    .where(inArray(players.id, athleteIds));
  const athleteMap = new Map(athleteList.map(a => [a.id, a]));

  const programIds = programList.map(p => p.id);
  const sectionList = await db
    .select()
    .from(sections)
    .where(inArray(sections.programId, programIds))
    .orderBy(asc(sections.sortOrder));

  const sectionIds = sectionList.map(s => Number(s.id));
  const exerciseList = sectionIds.length > 0
    ? await db
        .select()
        .from(trainingExercises)
        .where(inArray(trainingExercises.sectionId, sectionIds))
        .orderBy(asc(trainingExercises.sortOrder))
    : [];

  return programList.map(p => {
    const progSections = sectionList
      .filter(s => Number(s.programId) === Number(p.id))
      .map(s => ({
        ...s,
        exercises: exerciseList.filter(e => Number(e.sectionId) === Number(s.id)),
      }));
    return {
      ...p,
      athlete: athleteMap.get(p.athleteId),
      sections: progSections,
    };
  });
}

// =====================
// User Approvals
// =====================
export async function getUserApprovalStatus(userId: number): Promise<UserApproval | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(userApprovals).where(eq(userApprovals.userId, userId)).limit(1);
  return rows[0] ?? null;
}

export async function createPendingApproval(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const existing = await getUserApprovalStatus(userId);
  if (existing) return;
  await db.insert(userApprovals).values({ userId, status: "pending" });
}

export async function listPendingApprovals() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      approval: userApprovals,
      user: users,
    })
    .from(userApprovals)
    .leftJoin(users, eq(userApprovals.userId, users.id))
    .orderBy(asc(userApprovals.createdAt));
}

export async function updateApprovalStatus(
  userId: number,
  status: "approved" | "rejected",
  approvedBy: number,
  note?: string
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(userApprovals)
    .set({
      status,
      approvedBy,
      approvedAt: status === "approved" ? new Date() : null,
      note: note ?? null,
    })
    .where(eq(userApprovals.userId, userId));
}
