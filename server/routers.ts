import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "./db";

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
          date: t.providedDate,
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
});

export type AppRouter = typeof appRouter;
