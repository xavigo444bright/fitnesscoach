import { describe, expect, it } from "vitest";
import { EXERCISE_CATALOG } from "./catalog.js";
import {
  followAlongCatalogId,
  searchCatalogExercises,
  uniqueCatalogMatchForQuery,
} from "./exerciseSearch.js";

describe("searchCatalogExercises (T22)", () => {
  it("empty query returns the full catalog in order", () => {
    const hits = searchCatalogExercises("  ");
    expect(hits.map((e) => e.id)).toEqual(EXERCISE_CATALOG.map((e) => e.id));
  });

  it("matches English, hyphenated, and Chinese names", () => {
    expect(searchCatalogExercises("bench")[0]?.id).toBe("bench-press");
    expect(searchCatalogExercises("push up").some((e) => e.id === "pushup")).toBe(
      true,
    );
    expect(searchCatalogExercises("飞鸟").some((e) => e.id === "db-fly")).toBe(
      true,
    );
    expect(searchCatalogExercises("下蹲")[0]?.id).toBe("squat");
    expect(searchCatalogExercises("squat")[0]?.id).toBe("squat");
    expect(searchCatalogExercises("deadlift").some((e) => e.id === "rdl")).toBe(
      true,
    );
  });

  it("near-synonyms hit related catalog rows", () => {
    const rows = searchCatalogExercises("划船").map((e) => e.id);
    expect(rows).toContain("db-row");
    expect(rows).toContain("seated-row");
    const flies = searchCatalogExercises("飞鸟").map((e) => e.id);
    expect(flies).toContain("db-fly");
    expect(flies).toContain("rear-delt-fly");
  });

  it("tolerates a one-letter English typo", () => {
    expect(searchCatalogExercises("sqat").some((e) => e.id === "squat")).toBe(
      true,
    );
  });
});

describe("uniqueCatalogMatchForQuery / followAlongCatalogId", () => {
  it("maps unique names to catalog and follow-along ids", () => {
    expect(uniqueCatalogMatchForQuery("深蹲")?.id).toBe("squat");
    expect(uniqueCatalogMatchForQuery("squat")?.id).toBe("squat");
    expect(uniqueCatalogMatchForQuery("下蹲")?.id).toBe("squat");
    expect(uniqueCatalogMatchForQuery("飞鸟")?.id).toBe("db-fly");
    expect(uniqueCatalogMatchForQuery("划船")).toBeUndefined();
    expect(uniqueCatalogMatchForQuery("史密斯深蹲")).toBeUndefined();
    expect(followAlongCatalogId({ kind: "catalog", catalogId: "squat" })).toBe(
      "squat",
    );
    expect(followAlongCatalogId({ kind: "custom", name: "深蹲" })).toBe("squat");
    expect(followAlongCatalogId({ kind: "custom", name: "史密斯深蹲" })).toBe(
      undefined,
    );
    expect(followAlongCatalogId({ kind: "catalog", catalogId: "goblet-squat" })).toBe(
      undefined,
    );
  });
});
