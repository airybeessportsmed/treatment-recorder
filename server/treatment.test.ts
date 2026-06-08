import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createAuthContext(userId = 1): TrpcContext {
  return {
    user: {
      id: userId,
      openId: "test-user",
      email: "test@example.com",
      name: "Test User",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

function createUnauthContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("treatment router", () => {
  describe("player.list", () => {
    it("requires authentication", async () => {
      const ctx = createUnauthContext();
      const caller = appRouter.createCaller(ctx);
      await expect(caller.player.list()).rejects.toThrow();
    });
  });

  describe("player.create", () => {
    it("requires authentication", async () => {
      const ctx = createUnauthContext();
      const caller = appRouter.createCaller(ctx);
      await expect(
        caller.player.create({ name: "Test", number: 1, position: "OH" })
      ).rejects.toThrow();
    });

    it("validates input - name required", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);
      await expect(
        caller.player.create({ name: "", number: 1, position: "OH" })
      ).rejects.toThrow();
    });

    it("validates input - number range", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);
      await expect(
        caller.player.create({ name: "Test", number: -1, position: "OH" })
      ).rejects.toThrow();
      await expect(
        caller.player.create({ name: "Test", number: 1000, position: "OH" })
      ).rejects.toThrow();
    });

    it("validates input - position required", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);
      await expect(
        caller.player.create({ name: "Test", number: 1, position: "" })
      ).rejects.toThrow();
    });
  });

  describe("treatment.create", () => {
    it("requires authentication", async () => {
      const ctx = createUnauthContext();
      const caller = appRouter.createCaller(ctx);
      await expect(
        caller.treatment.create({
          playerId: 1,
          bodyParts: ["left_knee"],
          treatmentTypes: ["massage"],
          timing: "after_practice",
          duration: 15,
          treatmentDate: new Date(),
        })
      ).rejects.toThrow();
    });

    it("validates input - bodyParts required", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);
      await expect(
        caller.treatment.create({
          playerId: 1,
          bodyParts: [],
          treatmentTypes: ["massage"],
          timing: "after_practice",
          duration: 15,
          treatmentDate: new Date(),
        })
      ).rejects.toThrow();
    });

    it("validates input - treatmentTypes required", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);
      await expect(
        caller.treatment.create({
          playerId: 1,
          bodyParts: ["left_knee"],
          treatmentTypes: [],
          timing: "after_practice",
          duration: 15,
          treatmentDate: new Date(),
        })
      ).rejects.toThrow();
    });

    it("validates input - duration must be positive", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);
      await expect(
        caller.treatment.create({
          playerId: 1,
          bodyParts: ["left_knee"],
          treatmentTypes: ["massage"],
          timing: "after_practice",
          duration: 0,
          treatmentDate: new Date(),
        })
      ).rejects.toThrow();
    });

    it("validates input - timing required", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);
      await expect(
        caller.treatment.create({
          playerId: 1,
          bodyParts: ["left_knee"],
          treatmentTypes: ["massage"],
          timing: "",
          duration: 15,
          treatmentDate: new Date(),
        })
      ).rejects.toThrow();
    });

    it("accepts valid annotations", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);
      // Should not throw on input validation (will fail on DB but validates schema)
      const validInput = {
        playerId: 1,
        bodyParts: ["left_knee"],
        treatmentTypes: ["massage"],
        timing: "after_practice",
        duration: 15,
        treatmentDate: new Date(),
        annotations: {
          left_knee: {
            view: "detail",
            strokes: [
              {
                points: [{ x: 100, y: 100 }, { x: 150, y: 150 }],
                color: "#ef4444",
                width: 4,
              },
            ],
          },
        },
      };
      // This will throw because DB is not available in tests, but it should
      // pass zod validation (not a ZodError)
      try {
        await caller.treatment.create(validInput);
      } catch (e: any) {
        // Should NOT be a zod validation error
        expect(e.code).not.toBe("BAD_REQUEST");
      }
    });

    it("rejects invalid annotation structure", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);
      await expect(
        caller.treatment.create({
          playerId: 1,
          bodyParts: ["left_knee"],
          treatmentTypes: ["massage"],
          timing: "after_practice",
          duration: 15,
          treatmentDate: new Date(),
          annotations: {
            left_knee: {
              // missing 'view' and 'strokes'
            },
          } as any,
        })
      ).rejects.toThrow();
    });

    it("allows empty annotations (undefined)", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);
      try {
        await caller.treatment.create({
          playerId: 1,
          bodyParts: ["left_knee"],
          treatmentTypes: ["massage"],
          timing: "after_practice",
          duration: 15,
          treatmentDate: new Date(),
          // annotations not provided
        });
      } catch (e: any) {
        // Should NOT be a zod validation error
        expect(e.code).not.toBe("BAD_REQUEST");
      }
    });
  });

  describe("treatment.list", () => {
    it("requires authentication", async () => {
      const ctx = createUnauthContext();
      const caller = appRouter.createCaller(ctx);
      await expect(caller.treatment.list()).rejects.toThrow();
    });

    it("validates input - limit range", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);
      await expect(
        caller.treatment.list({ limit: 0 })
      ).rejects.toThrow();
      await expect(
        caller.treatment.list({ limit: 101 })
      ).rejects.toThrow();
    });
  });

  describe("treatment.getById", () => {
    it("requires authentication", async () => {
      const ctx = createUnauthContext();
      const caller = appRouter.createCaller(ctx);
      await expect(
        caller.treatment.getById({ id: 1 })
      ).rejects.toThrow();
    });
  });

  describe("treatment.delete", () => {
    it("requires authentication", async () => {
      const ctx = createUnauthContext();
      const caller = appRouter.createCaller(ctx);
      await expect(
        caller.treatment.delete({ id: 1 })
      ).rejects.toThrow();
    });
  });

  describe("player.update", () => {
    it("requires authentication", async () => {
      const ctx = createUnauthContext();
      const caller = appRouter.createCaller(ctx);
      await expect(
        caller.player.update({ id: 1, name: "New Name" })
      ).rejects.toThrow();
    });

    it("validates input - number range on update", async () => {
      const ctx = createAuthContext();
      const caller = appRouter.createCaller(ctx);
      await expect(
        caller.player.update({ id: 1, number: 1000 })
      ).rejects.toThrow();
    });
  });

  describe("player.delete", () => {
    it("requires authentication", async () => {
      const ctx = createUnauthContext();
      const caller = appRouter.createCaller(ctx);
      await expect(
        caller.player.delete({ id: 1 })
      ).rejects.toThrow();
    });
  });
});

describe("shared constants", () => {
  it("has body parts defined", async () => {
    const { BODY_PARTS } = await import("../shared/constants");
    expect(BODY_PARTS.length).toBeGreaterThan(20);
    expect(BODY_PARTS.every(bp => bp.key && bp.label && bp.group)).toBe(true);
  });

  it("has treatment types defined (20+)", async () => {
    const { TREATMENT_TYPES } = await import("../shared/constants");
    expect(TREATMENT_TYPES.length).toBeGreaterThanOrEqual(20);
    expect(TREATMENT_TYPES.every(tt => tt.key && tt.label && tt.icon && tt.category)).toBe(true);
  });

  it("has timing options defined", async () => {
    const { TIMING_OPTIONS } = await import("../shared/constants");
    expect(TIMING_OPTIONS.length).toBeGreaterThanOrEqual(5);
    expect(TIMING_OPTIONS.some(t => t.key === "am_before_practice")).toBe(true);
    expect(TIMING_OPTIONS.some(t => t.key === "after_match")).toBe(true);
  });

  it("has positions defined for volleyball", async () => {
    const { POSITIONS } = await import("../shared/constants");
    expect(POSITIONS.length).toBeGreaterThanOrEqual(5);
    expect(POSITIONS.some(p => p.key === "OH")).toBe(true);
    expect(POSITIONS.some(p => p.key === "S")).toBe(true);
    expect(POSITIONS.some(p => p.key === "L")).toBe(true);
  });

  it("helper functions return correct labels", async () => {
    const { getBodyPartLabel, getTreatmentTypeLabel, getTimingLabel, getPositionLabel } = await import("../shared/constants");
    expect(getBodyPartLabel("left_knee")).toBe("左膝");
    expect(getTreatmentTypeLabel("massage")).toBe("マッサージ");
    expect(getTimingLabel("after_practice")).toBe("練習後");
    expect(getPositionLabel("OH")).toBe("アウトサイドヒッター");
    // Unknown keys return the key itself
    expect(getBodyPartLabel("unknown_part")).toBe("unknown_part");
  });

  it("duration presets include standard values", async () => {
    const { DURATION_PRESETS } = await import("../shared/constants");
    expect(DURATION_PRESETS).toContain(5);
    expect(DURATION_PRESETS).toContain(15);
    expect(DURATION_PRESETS).toContain(30);
    expect(DURATION_PRESETS).toContain(60);
  });
});
