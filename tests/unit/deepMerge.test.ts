import { describe, expect, it } from "vitest";
import { deepMerge } from "../../convex/lib/deepMerge";

describe("deepMerge", () => {
  it("merges nested plain objects without dropping sibling keys", () => {
    expect(
      deepMerge(
        {
          status: "testing",
          metrics: {
            roi: 50000,
            numberOfUsers: 22,
            timeSaved: 140,
            timesUsed: 280,
          },
        },
        {
          metrics: {
            roi: 70000,
          },
        }
      )
    ).toEqual({
      status: "testing",
      metrics: {
        roi: 70000,
        numberOfUsers: 22,
        timeSaved: 140,
        timesUsed: 280,
      },
    });
  });

  it("replaces arrays and primitive values outright", () => {
    expect(
      deepMerge(
        {
          tools: ["rag", "forms"],
          status: "testing",
        },
        {
          tools: ["code"],
          status: "wip",
        }
      )
    ).toEqual({
      tools: ["code"],
      status: "wip",
    });
  });
});
