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
        title: z.string().min(1).max(255),
        category: z.string().min(1).max(50),
        type: z.string().max(100).nullable().optional(),
        frequency: z.string().max(255).nullable().optional(),
        points: z.string().nullable().optional(),
        mediaUrls: z.array(z.string()).optional(),
        providedDate: z.date(),
      }))
      .mutation(async ({ ctx, input }) => {
        return db.createExercise({
          ...input,
          type: input.type ?? null,
          frequency: input.frequency ?? null,
          points: input.points ?? null,
          mediaUrls: input.mediaUrls ?? null,
          createdBy: ctx.user.id,
        });
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number().int(),
        playerId: z.number().int().optional(),
        title: z.string().min(1).max(255).optional(),
        category: z.string().min(1).max(50).optional(),
        type: z.string().max(100).nullable().optional(),
        frequency: z.string().max(255).nullable().optional(),
        points: z.string().nullable().optional(),
        mediaUrls: z.array(z.string()).nullable().optional(),
        providedDate: z.date().optional(),
      }))
      .mutation(async ({ input }) => {
        const exercise = await db.getExerciseById(input.id);
        if (!exercise) {
          throw new TRPCError({ code: "NOT_FOUND", message: "エクササイズ記録が見つかりません" });
        }
        const { id, ...data } = input;
        await db.updateExercise(id, data);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number().int() }))
      .mutation(async ({ input }) => {
        const exercise = await db.getExerciseById(input.id);
        if (!exercise) {
          throw new TRPCError({ code: "NOT_FOUND", message: "エクササイズ記録が見つかりません" });
        }
        await db.deleteExercise(input.id);
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
