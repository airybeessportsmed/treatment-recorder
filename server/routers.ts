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
  }),

  // ===== Player Management =====
  player: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getPlayers(ctx.user.id);
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
        if (!player || player.createdBy !== ctx.user.id) {
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
        if (!player || player.createdBy !== ctx.user.id) {
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
        limit: z.number().int().min(1).max(100).optional(),
        offset: z.number().int().min(0).optional(),
      }).optional())
      .query(async ({ ctx, input }) => {
        return db.getTreatments({
          createdBy: ctx.user.id,
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
        if (!treatment || treatment.createdBy !== ctx.user.id) {
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
        if (!treatment || treatment.createdBy !== ctx.user.id) {
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
        if (!treatment || treatment.createdBy !== ctx.user.id) {
          throw new TRPCError({ code: "NOT_FOUND", message: "記録が見つかりません" });
        }
        await db.deleteTreatment(input.id);
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
