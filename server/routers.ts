import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "./db";
import * as db_training from "./db_training";
import { invokeLLM, type Message } from "./_core/llm";
import { storagePut, storageDelete } from "./storage";
import { notifyOwner } from "./_core/notification";
import { parseProgramsFromPDF } from "./pdfParser";
import { parseProgramsFromExcel } from "./excelParser";

// ==========================================
// トレーニング管理アプリから移植された Zod スキーマ
// ==========================================

const athleteInput = z.object({
  name: z.string().min(1),
  number: z.number().optional(),
  position: z.string().optional(),
  bodyWeight: z.number().optional(),
  notes: z.string().optional(),
});

const trainingExerciseInput = z.object({
  name: z.string(),
  sets: z.number().optional(),
  reps: z.string().optional(),
  load: z.string().optional(),
  attention: z.string().optional(),
  sortOrder: z.number().default(0),
});

const sectionInput = z.object({
  category: z.string(),
  sortOrder: z.number().default(0),
  exercises: z.array(trainingExerciseInput),
});

const programInput = z.object({
  athleteId: z.number(),
  date: z.string(),
  phase: z.string().optional(),
  periodCategory: z.string().optional(),
  goal: z.string().optional(),
  bodyWeight: z.number().optional(),
  totalSets: z.number().optional(),
  notes: z.string().optional(),
  sections: z.array(sectionInput),
  overwriteProgramId: z.number().optional(),
});

const recordInput = z.object({
  programId: z.number(),
  exerciseId: z.number(),
  athleteId: z.number(),
  date: z.string(),
  actualSets: z.number().optional(),
  actualReps: z.string().optional(),
  actualLoad: z.string().optional(),
  notes: z.string().optional(),
  source: z.enum(["manual", "ocr"]).default("manual"),
  changeReason: z.enum(["condition", "injury", "technique", "plan", "other"]).optional(),
  changeNote: z.string().optional(),
});

// ==========================================
// トレーニング管理アプリから移植されたサブルーター
// ==========================================

const athletesRouter = router({
  list: protectedProcedure.query(() => db_training.getAthletes()),

  get: protectedProcedure.input(z.object({ id: z.number() })).query(({ input }) =>
    db_training.getAthleteById(input.id)
  ),

  create: protectedProcedure.input(athleteInput).mutation(async ({ ctx, input }) => {
    const result = await db_training.createAthlete({
      name: input.name,
      number: input.number ?? 0,
      position: input.position ?? "",
      bodyWeight: input.bodyWeight,
      notes: input.notes,
      createdBy: ctx.user.id,
    });
    const id = (result as any)[0]?.insertId;
    return { success: true, id };
  }),

  update: protectedProcedure
    .input(z.object({ id: z.number(), data: athleteInput.partial() }))
    .mutation(async ({ input }) => {
      await db_training.updateAthlete(input.id, input.data);
      return { success: true };
    }),

  delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
    await db_training.deleteAthlete(input.id);
    return { success: true };
  }),
});

const programsRouter = router({
  list: protectedProcedure
    .input(z.object({ athleteId: z.number().optional() }))
    .query(({ input }) => db_training.getPrograms(input.athleteId)),

  getDuplicates: protectedProcedure.query(() =>
    db_training.getDuplicateProgramGroups()
  ),

  get: protectedProcedure.input(z.object({ id: z.number() })).query(({ input }) =>
    db_training.getProgramWithDetails(input.id)
  ),

  create: protectedProcedure.input(programInput).mutation(async ({ ctx, input }) => {
    const { sections: sectionData, ...programData } = input;
    const result = await db_training.createProgram(programData);
    const programs = await db_training.getPrograms(programData.athleteId);
    const newProgram = programs[0];
    if (newProgram) {
      for (const sec of sectionData) {
        const { exercises: exData, ...secData } = sec;
        await db_training.createSection({ ...secData, programId: newProgram.id });
        const secs = await db_training.getSectionsByProgramId(newProgram.id);
        const newSec = secs.find(s => s.category === sec.category && s.sortOrder === sec.sortOrder);
        if (newSec) {
          for (const ex of exData) {
            await db_training.createExercise({ ...ex, sectionId: newSec.id });
            await db_training.upsertExerciseMaster(ex.name, sec.category, {
              defaultSets: ex.sets,
              defaultReps: ex.reps,
              defaultLoad: ex.load,
            });
          }
        }
      }
    }
    return { success: true, id: newProgram?.id };
  }),

  update: protectedProcedure
    .input(z.object({ id: z.number(), data: programInput }))
    .mutation(async ({ input }) => {
      const { sections: sectionData, ...programData } = input.data;
      await db_training.updateProgram(input.id, programData);
      const oldSections = await db_training.getSectionsByProgramId(input.id);
      for (const sec of oldSections) {
        await db_training.deleteExercisesBySectionId(sec.id);
      }
      await db_training.deleteSectionsByProgramId(input.id);
      for (const sec of sectionData) {
        const { exercises: exData, ...secData } = sec;
        await db_training.createSection({ ...secData, programId: input.id });
        const secs = await db_training.getSectionsByProgramId(input.id);
        const newSec = secs.find(s => s.category === sec.category && s.sortOrder === sec.sortOrder);
        if (newSec) {
          for (const ex of exData) {
            await db_training.createExercise({ ...ex, sectionId: newSec.id });
            await db_training.upsertExerciseMaster(ex.name, sec.category);
          }
        }
      }
      return { success: true };
    }),

  delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
    const oldSections = await db_training.getSectionsByProgramId(input.id);
    for (const sec of oldSections) {
      await db_training.deleteExercisesBySectionId(sec.id);
    }
    await db_training.deleteSectionsByProgramId(input.id);
    await db_training.deleteProgram(input.id);
    return { success: true };
  }),

  bulkDelete: protectedProcedure
    .input(z.object({ ids: z.array(z.number()) }))
    .mutation(async ({ input }) => {
      await db_training.bulkDeletePrograms(input.ids);
      return { success: true };
    }),

  getForClone: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const program = await db_training.getProgramWithDetails(input.id);
      if (!program) throw new Error("Program not found");
      return program;
    }),

  listByAthlete: protectedProcedure
    .input(z.object({ athleteId: z.number() }))
    .query(({ input }) => db_training.getPrograms(input.athleteId)),

  listByDate: protectedProcedure
    .input(z.object({ date: z.string() }))
    .query(({ input }) => db_training.getProgramsByDateWithDetails(input.date)),

  parsePDF: protectedProcedure
    .input(z.object({ fileBase64: z.string() }))
    .mutation(async ({ input }) => {
      const buffer = Buffer.from(input.fileBase64, "base64");
      const programs = await parseProgramsFromPDF(buffer);
      return { programs };
    }),

  parseExcel: protectedProcedure
    .input(z.object({ fileBase64: z.string() }))
    .mutation(async ({ input }) => {
      const buffer = Buffer.from(input.fileBase64, "base64");
      const programs = await parseProgramsFromExcel(buffer);
      return { programs };
    }),

  checkDuplicate: protectedProcedure
    .input(z.object({
      athleteId: z.number().optional(),
      athleteNumber: z.number().optional(),
      athleteName: z.string(),
      date: z.string(),
      exerciseNames: z.array(z.string()),
    }))
    .query(async ({ input }) => {
      let athlete;

      // 0. IDが指定されていれば、IDから直接選手を取得
      if (input.athleteId) {
        athlete = await db_training.getAthleteById(input.athleteId);
      }

      // 1. まず背番号から選手を取得
      if (!athlete && input.athleteNumber) {
        athlete = await db_training.getAthleteByNumber(input.athleteNumber);
      }

      // 2. 背番号でヒットしない、または背番号がない場合は名前で検索（スペースなどを排除して正規化比較）
      if (!athlete) {
        const allAthletes = await db_training.getAthletes();
        const normalize = (s: string) => s.replace(/[\s　・]/g, "").toLowerCase();
        athlete = allAthletes.find(a => normalize(a.name) === normalize(input.athleteName));
      }

      // 選手が見つからなければ重複判定は行えない
      if (!athlete) {
        return { isDuplicate: false, duplicateType: "none" as const };
      }

      const existingPrograms = await db_training.getProgramsByAthleteAndDate(athlete.id, input.date);
      if (existingPrograms.length === 0) {
        return { isDuplicate: false, duplicateType: "none" as const };
      }

      const existing = existingPrograms[0];
      const details = await db_training.getProgramWithDetails(existing.id);
      
      if (!details) {
        return { isDuplicate: false, duplicateType: "none" as const };
      }

      // 種目構成の比較
      const existingExerciseNames = details.sections
        .flatMap(sec => sec.exercises.map(ex => ex.name.trim().toLowerCase()));

      // 既存プログラムのメニュー（種目）が0件の場合、無効なゴミデータとして自動的にクリーンアップ（削除）
      if (existingExerciseNames.length === 0) {
        await db_training.bulkDeletePrograms([existing.id]);
        return { isDuplicate: false, duplicateType: "none" as const };
      }

      const inputExerciseNames = input.exerciseNames.map(name => name.trim().toLowerCase());

      const existingSet = new Set(existingExerciseNames);
      const inputSet = new Set(inputExerciseNames);

      const isExactMatch = 
        existingSet.size === inputSet.size && 
        Array.from(existingSet).every(name => inputSet.has(name));

      return {
        isDuplicate: true,
        duplicateType: isExactMatch ? ("exact" as const) : ("partial" as const),
        existingProgramId: existing.id,
        existingProgramName: `${existing.date} - ${details.phase || "プログラム"}`
      };
    }),

  bulkCreate: protectedProcedure
    .input(z.array(programInput))
    .mutation(async ({ input }) => {
      const results: any[] = [];
      for (const programData of input) {
        const { sections: sectionData, overwriteProgramId, ...pData } = programData;
        
        // 重複上書き指示がある場合は既存プログラムを事前に一括削除
        if (overwriteProgramId) {
          await db_training.bulkDeletePrograms([overwriteProgramId]);
        }

        const result = await db_training.createProgram(pData);
        const programs = await db_training.getPrograms(pData.athleteId);
        const newProgram = programs[0];
        if (newProgram) {
          for (const sec of sectionData) {
            const { exercises: exData, ...secData } = sec;
            await db_training.createSection({ ...secData, programId: newProgram.id });
            const secs = await db_training.getSectionsByProgramId(newProgram.id);
            const newSec = secs.find(
              (s) => s.category === sec.category && s.sortOrder === sec.sortOrder
            );
            if (newSec) {
              for (const ex of exData) {
                await db_training.createExercise({ ...ex, sectionId: newSec.id });
                await db_training.upsertExerciseMaster(ex.name, sec.category, {
                  defaultSets: ex.sets,
                  defaultReps: ex.reps,
                  defaultLoad: ex.load,
                });
              }
            }
          }
          results.push({ success: true, id: newProgram.id, athleteId: pData.athleteId });
        }
      }
      return { results };
    }),
});

const recordsRouter = router({
  listByProgram: protectedProcedure
    .input(z.object({ programId: z.number() }))
    .query(({ input }) => db_training.getRecordsByProgram(input.programId)),

  listByAthlete: protectedProcedure
    .input(z.object({ athleteId: z.number() }))
    .query(({ input }) => db_training.getRecordsByAthlete(input.athleteId)),

  upsert: protectedProcedure.input(recordInput).mutation(async ({ input }) => {
    await db_training.upsertRecord(input);
    return { success: true };
  }),

  bulkSave: protectedProcedure
    .input(z.object({
      programId: z.number(),
      records: z.array(z.object({
        programId: z.number(),
        exerciseId: z.number(),
        athleteId: z.number(),
        date: z.string(),
        actualSets: z.number().optional(),
        actualReps: z.string().optional(),
        actualLoad: z.string().optional(),
        notes: z.string().optional(),
        source: z.enum(["manual", "ocr"]).default("ocr"),
        changeReason: z.enum(["condition", "injury", "technique", "plan", "other"]).optional().nullable(),
        changeNote: z.string().optional().nullable(),
      }))
    }))
    .mutation(async ({ input }) => {
      await db_training.deleteRecordsByProgramId(input.programId);
      if (input.records.length > 0) {
        const insertData = input.records.map(r => ({
          ...r,
          changeReason: r.changeReason || null,
          changeNote: r.changeNote || null,
        }));
        await db_training.bulkInsertRecords(insertData);
      }
      return { success: true };
    }),

  history: protectedProcedure
    .input(z.object({ athleteId: z.number() }))
    .query(({ input }) => db_training.getExerciseHistory(input.athleteId)),

  clearByProgram: protectedProcedure
    .input(z.object({ programId: z.number() }))
    .mutation(async ({ input }) => {
      await db_training.deleteRecordsByProgramId(input.programId);
      return { success: true };
    }),
});

const photosRouter = router({
  listByProgram: protectedProcedure
    .input(z.object({ programId: z.number() }))
    .query(({ input }) => db_training.getPhotosByProgram(input.programId)),

  upload: protectedProcedure
    .input(
      z.object({
        programId: z.number(),
        athleteId: z.number(),
        date: z.string(),
        fileBase64: z.string(),
        mimeType: z.string().default("image/jpeg"),
        fileName: z.string().default("photo.jpg"),
      })
    )
    .mutation(async ({ input }) => {
      const { programId, athleteId, date, fileBase64, mimeType, fileName } = input;
      const buffer = Buffer.from(fileBase64, "base64");
      const key = `training-photos/${athleteId}/${date}-${Date.now()}-${fileName}`;
      const { url } = await storagePut(key, buffer, mimeType);
      await db_training.createPhoto({ programId, athleteId, date, fileUrl: url, fileKey: key, status: "pending" });
      const allPhotos = await db_training.getPhotosByProgram(programId);
      return { success: true, photoId: allPhotos[0]?.id, url };
    }),

  analyze: protectedProcedure
    .input(
      z.object({
        photoId: z.number(),
        programId: z.number(),
        athleteId: z.number(),
        date: z.string(),
        imageUrl: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const { photoId, programId, athleteId, date, imageUrl } = input;
      await db_training.updatePhoto(photoId, { status: "processing" });

      const programDetails = await db_training.getProgramWithDetails(programId);
      const exerciseNames = programDetails?.sections
        .flatMap(s => s.exercises.map(e => e.name))
        .join(", ") || "";

      const systemPrompt = `あなたはラグビーチームのトレーニング記録用紙を解析する専門のOCRアシスタントです。

【用紙の構造】
この用紙は「Strength Training Program」と書かれたA4サイズのトレーニングプログラム表です。
各行に種目名・SET数・回数・負荷（印刷済み計画値）が記載されており、
選手が実際にトレーニングを行った後、負荷欄 of 右隣の空白列または余白に
手書きで「実際に使用した重量（実績値）」を書き込んでいます。

【重要な読み取りルール】
1. 印刷された値（計画値）と手書きの値（実績値）を必ず区別すること
2. 手書きの実績値は通常、負荷欄の右隣の空白セルや余白に鉛筆・ボールペンで書かれている
3. 実績値が「40」「52.5」のように数字のみの場合はkg単位の重量として扱う
4. 「35 / 37.5 / 40」や「57.5/60」のようにスラッシュで区切られている場合は「セット1/セット2/セット3」の順の実績値
   → setResultsに各セットの値を配列で格納すること（例: ["35", "37.5", "40"]）
5. 実績値が書かれていない種目はsetResultsを空配列にする
6. 種目名は印刷された文字から読み取る（手書きではない）
7. SET数・回数は印刷値をそのまま使用する（手書き修正がある場合はそちらを優先）
8. 同じ種目が複数行にまたがっている場合（例：ベンチプレスが3行）は、1つのexerciseNameにまとめてsetResultsに全セットの値を格納すること

【セット別実績値の例】
- ベンチプレス: 1行目「25kg計画→手書き25」、2行目「30kg計画→手書き30」、3行目「35/37.5kg計画→手書き35 / 37.5 / 40」
  → exerciseName: "ベンチプレス", setResults: ["25", "30", "35", "37.5", "40"]
- フロントSQ: 「40.0kg計画→手書き40」「52.5kg計画→手書き52.5」「55kg計画→手書き55」
  → exerciseName: "フロントSQ", setResults: ["40", "52.5", "55"]

【このプログラムの種目一覧（参考）】
${exerciseNames}

【出力形式】
各種目について以下の情報を抽出してください：
- exerciseName: 種目名（印刷文字から読み取る）
- section: セクション名（Preparation/Core/Power/Lower Body/Upper Body/Specific）
- plannedSets: 計画セット数の合計（印刷値の合計）
- plannedReps: 計画回数（印刷値、複数行ある場合は最初の値）
- plannedLoad: 計画負荷（印刷値、複数行ある場合は最初の値）
- setResults: 手書きで記入されたセット別の実績重量の配列（例: ["35", "37.5", "40"]）。書かれていなければ空配列[]
- notes: その行に書かれたその他のメモや注意事項

読み取れない値はnullを使用してください。`;

      try {
        const response = await invokeLLM({
          messages: [
            { role: "system", content: systemPrompt } as Message,
            {
              role: "user",
              content: [
                {
                  type: "image_url" as const,
                  image_url: { url: imageUrl, detail: "high" as const },
                },
                {
                  type: "text" as const,
                  text: "このトレーニング記録用紙から手書きの修正・記録を読み取ってください。",
                },
              ],
            } as Message,
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "training_records",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  records: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        exerciseName: { type: "string", description: "種目名（印刷文字）" },
                        section: { type: ["string", "null"], description: "Preparation/Core/Power/Lower Body/Upper Body/Specific" },
                        plannedSets: { type: ["number", "null"], description: "計画セット数合計" },
                        plannedReps: { type: ["string", "null"], description: "印刷された計画回数" },
                        plannedLoad: { type: ["string", "null"], description: "印刷された計画負荷" },
                        setResults: { type: "array", items: { type: "string" }, description: "セット別実績重量の配列。なければ空配列" },
                        notes: { type: ["string", "null"], description: "その他のメモ" },
                      },
                      required: ["exerciseName", "section", "plannedSets", "plannedReps", "plannedLoad", "setResults", "notes"],
                      additionalProperties: false,
                    },
                  },
                  generalNotes: { type: ["string", "null"], description: "全体的なメモ" },
                },
                required: ["records", "generalNotes"],
                additionalProperties: false,
              },
            },
          },
        });

        const rawContent = response.choices[0]?.message?.content;
        const rawText = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent) || "{}";
        const parsed = JSON.parse(rawText);

        await db_training.updatePhoto(photoId, {
          status: "done",
          ocrRawResult: rawText,
          ocrParsed: parsed,
        });

        try {
          const photo = await db_training.getPhotosByProgram(programId);
          const target = photo.find(p => p.id === photoId);
          if (target?.fileKey) {
            await storageDelete(target.fileKey);
            console.log(`[OCR] Deleted photo from S3: ${target.fileKey}`);
          }
        } catch (deleteErr) {
          console.warn("[OCR] Failed to delete photo from S3:", deleteErr);
        }

        return { success: true, parsed };
      } catch (err) {
        await db_training.updatePhoto(photoId, { status: "error" });
        throw err;
      }
    }),
});

const reportsRouter = router({
  recentDates: protectedProcedure
    .input(z.object({ limit: z.number().default(10) }))
    .query(({ input }) => db_training.getRecentTrainingDates(input.limit)),

  byDate: protectedProcedure
    .input(z.object({ date: z.string() }))
    .query(async ({ input }) => {
      const rows = await db_training.getTrainingReportByDate(input.date);

      const enriched = rows.map(row => {
        const plannedLoadNum = parseFloat((row.plannedLoad ?? "").replace(/[^0-9.]/g, ""));
        const actualLoadNum = parseFloat((row.actualLoad ?? "").replace(/[^0-9.]/g, ""));
        const hasLoadChange =
          row.actualLoad !== null &&
          row.plannedLoad !== null &&
          row.actualLoad !== "" &&
          !isNaN(plannedLoadNum) &&
          !isNaN(actualLoadNum) &&
          Math.abs(actualLoadNum - plannedLoadNum) > 0.1;
        const loadDiff =
          hasLoadChange ? actualLoadNum - plannedLoadNum : null;
        return {
          ...row,
          hasLoadChange,
          loadDiff,
          loadDiffPct:
            hasLoadChange && plannedLoadNum > 0
              ? Math.round((loadDiff! / plannedLoadNum) * 100)
              : null,
        };
      });

      const byAthlete: Record<number, {
        athleteId: number;
        athleteName: string;
        athleteNumber: number | null;
        sections: Record<string, typeof enriched>;
        loadChangedCount: number;
        totalExercises: number;
      }> = {};

      for (const row of enriched) {
        if (!byAthlete[row.athleteId]) {
          byAthlete[row.athleteId] = {
            athleteId: row.athleteId,
            athleteName: row.athleteName,
            athleteNumber: row.athleteNumber,
            sections: {},
            loadChangedCount: 0,
            totalExercises: 0,
          };
        }
        const athlete = byAthlete[row.athleteId];
        if (!athlete.sections[row.sectionCategory]) {
          athlete.sections[row.sectionCategory] = [];
        }
        athlete.sections[row.sectionCategory].push(row);
        athlete.totalExercises++;
        if (row.hasLoadChange) athlete.loadChangedCount++;
      }

      return {
        date: input.date,
        athletes: Object.values(byAthlete),
        totalRecords: rows.length,
        totalLoadChanges: enriched.filter(r => r.hasLoadChange).length,
      };
    }),

  dashboardStats: protectedProcedure.query(() => db_training.getDashboardStats()),
});

const exerciseMasterRouter = router({
  list: protectedProcedure
    .input(z.object({ category: z.string().optional() }))
    .query(({ input }) => db_training.getExerciseMaster(input.category)),
  grouped: protectedProcedure
    .query(() => db_training.getAllExerciseMasterGrouped()),
  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      category: z.string().min(1),
      defaultSets: z.number().optional(),
      defaultReps: z.string().optional(),
      defaultLoad: z.string().optional(),
      attention: z.string().optional(),
    }))
    .mutation(({ input }) => db_training.createExerciseMaster(input)),
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).optional(),
      category: z.string().min(1).optional(),
      defaultSets: z.number().optional(),
      defaultReps: z.string().optional(),
      defaultLoad: z.string().optional(),
      attention: z.string().optional(),
    }))
    .mutation(({ input }) => {
      const { id, ...data } = input;
      return db_training.updateExerciseMaster(id, data);
    }),
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => db_training.deleteExerciseMaster(input.id)),

  parseExcel: protectedProcedure
    .input(z.object({ fileBase64: z.string() }))
    .mutation(async ({ input }) => {
      const XLSX = await import("xlsx");
      const buffer = Buffer.from(input.fileBase64, "base64");
      const wb = XLSX.read(buffer, { type: "buffer", cellDates: true });

      const CATEGORY_KEYWORDS: Record<string, string> = {
        "Preparation": "Preparation",
        "Core": "Core",
        "Power": "Power",
        "Lower Body": "Lower Body",
        "Upper Body": "Upper Body",
        "Specific": "Specific",
      };

      function normalizeName(name: string): string {
        return name
          .replace(/　/g, " ")
          .replace(/\s+/g, " ")
          .trim();
      }

      function canonicalName(name: string): string {
        return normalizeName(name).replace(/・/g, "");
      }

      const exerciseMap = new Map<string, { name: string; category: string; defaultSets?: number; defaultReps?: string; defaultLoad?: string }>();

      for (const sheetName of wb.SheetNames) {
        const ws = wb.Sheets[sheetName];
        const rows: (string | number | null)[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null }) as (string | number | null)[][];

        let currentCategory: string | null = null;

        for (const row of rows) {
          const col0 = row[0] != null ? String(row[0]).trim() : "";

          if (col0 && row[3] == null) {
            for (const [kw, cat] of Object.entries(CATEGORY_KEYWORDS)) {
              if (col0.includes(kw)) {
                currentCategory = cat;
                break;
              }
            }
          }

          if (currentCategory && col0 && row[3] != null) {
            const sets = typeof row[3] === "number" ? Math.round(row[3]) : parseInt(String(row[3]));
            if (!isNaN(sets) && sets > 0) {
              const name = normalizeName(col0);
              const canonical = canonicalName(name);
              if (name !== "種目" && name !== "TOTAL" && !exerciseMap.has(canonical)) {
                exerciseMap.set(canonical, {
                  name,
                  category: currentCategory,
                  defaultSets: sets,
                  defaultReps: row[4] != null ? String(row[4]).trim() : undefined,
                  defaultLoad: row[5] != null ? String(row[5]).trim() : undefined,
                });
              }
            }
          }
        }
      }

      const parsed = Array.from(exerciseMap.values());
      const existing = await db_training.getExerciseMaster();
      const existingNames = new Set(existing.map((e: { name: string }) => canonicalName(e.name)));

      const preview = parsed.map(item => ({
        ...item,
        isNew: !existingNames.has(canonicalName(item.name)),
      }));

      return { preview };
    }),

  bulkImport: protectedProcedure
    .input(z.object({
      items: z.array(z.object({
        name: z.string(),
        category: z.string(),
        defaultSets: z.number().optional(),
        defaultReps: z.string().optional(),
        defaultLoad: z.string().optional(),
      }))
    }))
    .mutation(({ input }) => db_training.bulkInsertExerciseMasterSkipExisting(input.items)),
});

const approvalRouter = router({
  myStatus: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role === "admin") return { status: "approved" as const };
    const approval = await db_training.getUserApprovalStatus(ctx.user.id);
    if (!approval) {
      await db_training.createPendingApproval(ctx.user.id);
      await notifyOwner({
        title: "新規ユーザーがログインしました",
        content: `${ctx.user.name ?? ctx.user.email ?? "不明"}（${ctx.user.email ?? ""}）がアクセスを試みました。管理画面から承認してください。`,
      });
      return { status: "pending" as const };
    }
    return { status: approval.status };
  }),

  list: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
    return db_training.listPendingApprovals();
  }),

  updateStatus: protectedProcedure
    .input(z.object({
      userId: z.number(),
      status: z.enum(["approved", "rejected"]),
      note: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      await db_training.updateApprovalStatus(input.userId, input.status, ctx.user.id, input.note);
      return { success: true };
    }),
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
    listTrainers: publicProcedure.query(async () => {
      return db.getAllUsers();
    }),
    createTrainer: publicProcedure
      .input(z.object({
        name: z.string().min(1).max(100),
      }))
      .mutation(async ({ input }) => {
        const openId = `trainer-${Math.random().toString(36).substring(2, 15)}`;
        await db.upsertUser({
          openId,
          name: input.name,
          loginMethod: "mock",
          lastSignedIn: new Date(),
        });
        return { success: true };
      }),
    updateProfile: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(100),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.updateUser(ctx.user.openId, input.name);
        return { success: true };
      }),
    deleteTrainer: publicProcedure
      .input(z.object({ openId: z.string() }))
      .mutation(async ({ input }) => {
        await db.deactivateUser(input.openId);
        return { success: true };
      }),
  }),

  // ===== Player Management =====
  player: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getPlayers();
    }),

    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(100),
        number: z.number().int().min(0).max(999),
        position: z.string().min(1).max(50),
      }))
      .mutation(async ({ ctx, input }) => {
        return db.createPlayer({
          name: input.name,
          number: input.number,
          position: input.position,
          createdBy: ctx.user.id,
        });
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number().int(),
        name: z.string().min(1).max(100).optional(),
        number: z.number().int().min(0).max(999).optional(),
        position: z.string().min(1).max(50).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const player = await db.getPlayerById(input.id);
        if (!player) {
          throw new TRPCError({ code: "NOT_FOUND", message: "選手が見つかりません" });
        }
        const { id, ...data } = input;
        await db.updatePlayer(id, data);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number().int() }))
      .mutation(async ({ ctx, input }) => {
        const player = await db.getPlayerById(input.id);
        if (!player) {
          throw new TRPCError({ code: "NOT_FOUND", message: "選手が見つかりません" });
        }
        await db.deletePlayer(input.id);
        return { success: true };
      }),

    getSummary: protectedProcedure
      .input(z.object({ playerId: z.number().int() }))
      .query(async ({ input }) => {
        const player = await db.getPlayerById(input.playerId);
        if (!player) {
          throw new TRPCError({ code: "NOT_FOUND", message: "選手が見つかりません" });
        }

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const treatmentsResult = await db.getTreatments({
          playerId: input.playerId,
          dateFrom: thirtyDaysAgo,
        });
        const treatments = treatmentsResult.rows;

        const exercises = await db.getExercises({
          playerId: input.playerId,
        });
        const recentExercises = exercises.filter(
          (ex: any) => new Date(ex.providedDate).getTime() >= thirtyDaysAgo.getTime()
        );

        const partCounts: Record<string, number> = {};
        treatments.forEach((t: any) => {
          if (t.bodyParts && Array.isArray(t.bodyParts)) {
            t.bodyParts.forEach((bp: string) => {
              partCounts[bp] = (partCounts[bp] || 0) + 1;
            });
          }
        });
        const bodyPartStats = Object.entries(partCounts)
          .map(([part, count]) => ({ part, count }))
          .sort((a, b) => b.count - a.count);

        const typeCounts: Record<string, number> = {};
        treatments.forEach((t: any) => {
          if (t.treatmentDetails && typeof t.treatmentDetails === "object") {
            Object.values(t.treatmentDetails).forEach((detail: any) => {
              if (detail && Array.isArray(detail.treatmentTypes)) {
                detail.treatmentTypes.forEach((type: string) => {
                  typeCounts[type] = (typeCounts[type] || 0) + 1;
                });
              }
            });
          }
        });
        const treatmentTypeStats = Object.entries(typeCounts)
          .map(([type, count]) => ({ type, count }))
          .sort((a, b) => b.count - a.count);

        const recentSOAP = treatments.slice(0, 3).map((t: any) => ({
          date: t.treatmentDate,
          createdByName: t.createdByName,
          severity: t.severity,
          soapS: t.soapS,
          soapO: t.soapO,
          soapA: t.soapA,
          soapP: t.soapP,
          comment: t.comment,
        }));

        const uniqueExercisesMap: Record<string, any> = {};
        recentExercises.forEach((ex: any) => {
          if (!uniqueExercisesMap[ex.title] || new Date(ex.providedDate).getTime() > new Date(uniqueExercisesMap[ex.title].providedDate).getTime()) {
            uniqueExercisesMap[ex.title] = {
              title: ex.title,
              category: ex.category,
              points: ex.points,
              providedDate: ex.providedDate,
            };
          }
        });
        const activeExercises = Object.values(uniqueExercisesMap).sort(
          (a: any, b: any) => new Date(b.providedDate).getTime() - new Date(a.providedDate).getTime()
        );

        return {
          playerId: player.id,
          playerName: player.name,
          playerNumber: player.number,
          playerPosition: player.position,
          totalTreatments: treatments.length,
          bodyPartStats,
          treatmentTypeStats,
          recentSOAP,
          activeExercises,
        };
      }),
  }),

  // ===== Treatment Records =====
  treatment: router({
    list: protectedProcedure
      .input(z.object({
        playerId: z.number().int().optional(),
        dateFrom: z.date().optional(),
        dateTo: z.date().optional(),
        bodyPart: z.string().optional(),
        treatmentType: z.string().optional(),
        limit: z.number().int().min(1).max(2000).optional(),
        offset: z.number().int().min(0).optional(),
      }).optional())
      .query(async ({ ctx, input }) => {
        return db.getTreatments({
          playerId: input?.playerId,
          dateFrom: input?.dateFrom,
          dateTo: input?.dateTo,
          bodyPart: input?.bodyPart,
          treatmentType: input?.treatmentType,
          limit: input?.limit,
          offset: input?.offset,
        });
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.number().int() }))
      .query(async ({ ctx, input }) => {
        const treatment = await db.getTreatmentById(input.id);
        if (!treatment) {
          throw new TRPCError({ code: "NOT_FOUND", message: "記録が見つかりません" });
        }
        return treatment;
      }),

    create: protectedProcedure
      .input(z.object({
        playerId: z.number().int(),
        bodyParts: z.array(z.string()).min(1),
        treatmentTypes: z.array(z.string()).min(1),
        timing: z.string().min(1),
        duration: z.number().int().min(1),
        soapS: z.string().optional(),
        soapO: z.string().optional(),
        soapA: z.string().optional(),
        soapP: z.string().optional(),
        comment: z.string().optional(),
        annotations: z.record(z.string(), z.object({
          view: z.string(),
          strokes: z.array(z.object({
            points: z.array(z.object({ x: z.number(), y: z.number() })),
            color: z.string(),
            width: z.number(),
          })),
        })).optional(),
        treatmentDetails: z.record(z.string(), z.object({
          treatmentTypes: z.array(z.string()),
          duration: z.number().int().min(1),
        })).optional(),
        severity: z.string().default("normal"),
        treatmentDate: z.date(),
      }))
      .mutation(async ({ ctx, input }) => {
        return db.createTreatment({
          ...input,
          soapS: input.soapS ?? null,
          soapO: input.soapO ?? null,
          soapA: input.soapA ?? null,
          soapP: input.soapP ?? null,
          comment: input.comment ?? null,
          annotations: input.annotations ?? null,
          treatmentDetails: input.treatmentDetails ?? null,
          createdBy: ctx.user.id,
        });
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number().int(),
        playerId: z.number().int().optional(),
        bodyParts: z.array(z.string()).min(1).optional(),
        treatmentTypes: z.array(z.string()).min(1).optional(),
        timing: z.string().min(1).optional(),
        duration: z.number().int().min(1).optional(),
        soapS: z.string().nullable().optional(),
        soapO: z.string().nullable().optional(),
        soapA: z.string().nullable().optional(),
        soapP: z.string().nullable().optional(),
        comment: z.string().nullable().optional(),
        annotations: z.record(z.string(), z.object({
          view: z.string(),
          strokes: z.array(z.object({
            points: z.array(z.object({ x: z.number(), y: z.number() })),
            color: z.string(),
            width: z.number(),
          })),
        })).nullable().optional(),
        treatmentDetails: z.record(z.string(), z.object({
          treatmentTypes: z.array(z.string()),
          duration: z.number().int().min(1),
        })).nullable().optional(),
        severity: z.string().optional(),
        treatmentDate: z.date().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const treatment = await db.getTreatmentById(input.id);
        if (!treatment) {
          throw new TRPCError({ code: "NOT_FOUND", message: "記録が見つかりません" });
        }
        const { id, ...data } = input;
        await db.updateTreatment(id, data);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number().int() }))
      .mutation(async ({ ctx, input }) => {
        const treatment = await db.getTreatmentById(input.id);
        if (!treatment) {
          throw new TRPCError({ code: "NOT_FOUND", message: "記録が見つかりません" });
        }
        await db.deleteTreatment(input.id);
        return { success: true };
      }),
  }),

  // ===== Schedule Management =====
  schedule: router({
    list: protectedProcedure
      .input(z.object({
        dateFrom: z.string(),
        dateTo: z.string(),
      }))
      .query(async ({ input }) => {
        return db.getScheduleByDateRange(input.dateFrom, input.dateTo);
      }),

    save: protectedProcedure
      .input(z.object({
        date: z.string(),
        practiceAm: z.string().nullable().optional(),
        practicePm: z.string().nullable().optional(),
        assignments: z.string().nullable().optional(),
      }))
      .mutation(async ({ input }) => {
        await db.upsertSchedule(input);
        return { success: true };
      }),
  }),

  // ===== Exercise Management =====
  exercise: router({
    list: protectedProcedure
      .input(z.object({
        playerId: z.number().int().optional(),
        category: z.string().optional(),
      }).optional())
      .query(async ({ input }) => {
        return db.getExercises({
          playerId: input?.playerId,
          category: input?.category,
        });
      }),

    create: protectedProcedure
      .input(z.object({
        playerId: z.number().int(),
        category: z.string().min(1).max(50),
        providedDate: z.date(),
        mediaUrls: z.array(z.string()).optional(),
        exercises: z.array(z.object({
          title: z.string().min(1).max(255),
          points: z.string().nullable().optional(),
        })).min(1),
      }))
      .mutation(async ({ ctx, input }) => {
        const sessionId = crypto.randomUUID();
        const dataList = input.exercises.map(item => ({
          playerId: input.playerId,
          sessionId,
          title: item.title,
          category: input.category,
          points: item.points ?? null,
          mediaUrls: input.mediaUrls ?? null,
          providedDate: input.providedDate,
          isCompleted: 0,
          createdBy: ctx.user.id,
          type: null,
          frequency: null,
        }));
        return db.createExercises(dataList);
      }),

    update: protectedProcedure
      .input(z.object({
        sessionId: z.string().min(1),
        playerId: z.number().int(),
        category: z.string().min(1).max(50),
        providedDate: z.date(),
        mediaUrls: z.array(z.string()).optional(),
        isCompleted: z.boolean().optional(),
        exercises: z.array(z.object({
          title: z.string().min(1).max(255),
          points: z.string().nullable().optional(),
        })).min(1),
      }))
      .mutation(async ({ ctx, input }) => {
        return db.updateExercisesBySession(
          input.sessionId,
          input.playerId,
          input.category,
          input.providedDate,
          ctx.user.id,
          input.mediaUrls ?? null,
          input.isCompleted ? 1 : 0,
          input.exercises.map(item => ({
            title: item.title,
            points: item.points ?? null,
          }))
        );
      }),

    delete: protectedProcedure
      .input(z.object({ sessionId: z.string().min(1) }))
      .mutation(async ({ input }) => {
        return db.deleteExercisesBySession(input.sessionId);
      }),

    toggleComplete: protectedProcedure
      .input(z.object({
        sessionId: z.string().min(1),
        isCompleted: z.boolean(),
      }))
      .mutation(async ({ input }) => {
        return db.toggleExerciseSessionComplete(input.sessionId, input.isCompleted);
      }),
  }),
  athletes: athletesRouter,
  programs: programsRouter,
  records: recordsRouter,
  photos: photosRouter,
  exerciseMaster: exerciseMasterRouter,
  reports: reportsRouter,
  approval: approvalRouter,
});

export type AppRouter = typeof appRouter;
