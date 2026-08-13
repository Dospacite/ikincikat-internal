import { describe, expect, it } from "vitest";

import { settlementTotal } from "@/lib/credits";

describe("settlementTotal", () => {
  it("uses the overall rate once", () =>
    expect(settlementTotal(8, "OVERALL")).toEqual({
      unitCount: 1,
      creditsTotal: 8,
    }));
  it("multiplies whole hourly units", () =>
    expect(settlementTotal(3, "HOURLY", 4)).toEqual({
      unitCount: 4,
      creditsTotal: 12,
    }));
  it("allows the owner to correct the total", () =>
    expect(settlementTotal(3, "DAILY", 2, 5)).toEqual({
      unitCount: 2,
      creditsTotal: 5,
    }));
  it("rejects fractions and non-positive values", () => {
    expect(() => settlementTotal(0, "OVERALL")).toThrow();
    expect(() => settlementTotal(2, "HOURLY", 1.5)).toThrow();
  });
});
