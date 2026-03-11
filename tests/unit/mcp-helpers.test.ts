import { describe, expect, it } from "vitest";
import { applyCanvasStateOperation } from "../../convex/lib/mcpHelpers";

describe("applyCanvasStateOperation", () => {
  it("preserves earlier title changes across sequential update_canvas operations", () => {
    const initial = {
      title: "Original",
      slug: "original",
      phases: ["Backlog", "Live"],
      categories: ["Ops"],
    };

    const afterTitleUpdate = applyCanvasStateOperation(initial, {
      type: "update_canvas",
      title: "Renamed",
    });
    const afterSlugUpdate = applyCanvasStateOperation(afterTitleUpdate, {
      type: "update_canvas",
      slug: "renamed",
    });

    expect(afterSlugUpdate).toEqual({
      title: "Renamed",
      slug: "renamed",
      phases: ["Backlog", "Live"],
      categories: ["Ops"],
    });
  });

  it("renames phases in the local canvas state", () => {
    const initial = {
      title: "Original",
      slug: "original",
      phases: ["Backlog", "Phase 1"],
      categories: ["Ops"],
    };

    expect(
      applyCanvasStateOperation(initial, {
        type: "rename_phase",
        fromPhase: "Backlog",
        toPhase: "Discovery",
      })
    ).toEqual({
      title: "Original",
      slug: "original",
      phases: ["Discovery", "Phase 1"],
      categories: ["Ops"],
    });
  });
});
