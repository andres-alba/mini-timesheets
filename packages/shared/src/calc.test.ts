import { describe, it, expect } from "vitest";
import {
  calculatePay,
  summarizeWeek,
  sumHours,
  OVERTIME_THRESHOLD_HOURS,
} from "./calc.js";

describe("calculatePay", () => {
  it("computes regular-only pay below the 40h threshold", () => {
    // John Smith from the sketch: 32h @ $18.00 -> $576.00, no overtime.
    const pay = calculatePay(32, 1800);
    expect(pay.regularHours).toBe(32);
    expect(pay.overtimeHours).toBe(0);
    expect(pay.regularPayCents).toBe(57600);
    expect(pay.overtimePayCents).toBe(0);
    expect(pay.totalPayCents).toBe(57600);
  });

  it("treats exactly 40h as all regular, zero overtime (boundary)", () => {
    const pay = calculatePay(40, 2250);
    expect(pay.regularHours).toBe(40);
    expect(pay.overtimeHours).toBe(0);
    expect(pay.totalPayCents).toBe(90000);
  });

  it("treats 40.01h as 0.01h overtime (just over the boundary)", () => {
    const pay = calculatePay(40.01, 2250);
    expect(pay.regularHours).toBe(40);
    expect(pay.overtimeHours).toBe(0.01);
    // 0.01 * 2250 * 1.5 = 33.75c -> 34c
    expect(pay.overtimePayCents).toBe(34);
    expect(pay.totalPayCents).toBe(90034);
  });

  it("matches the sketch: 45.5h @ $22.50 -> $900.00 + $185.63 = $1,085.63", () => {
    const pay = calculatePay(45.5, 2250);
    expect(pay.regularHours).toBe(40);
    expect(pay.overtimeHours).toBe(5.5);
    expect(pay.regularPayCents).toBe(90000); // $900.00
    expect(pay.overtimePayCents).toBe(18563); // 18562.5 -> half-up -> 18563
    expect(pay.totalPayCents).toBe(108563); // $1,085.63
  });

  it("handles decimal hours that don't sum cleanly in binary float", () => {
    // 0.1 + 0.2 style drift must not leak into the cent result.
    const pay = summarizeWeek([7.5, 7.5, 7.5, 7.5, 7.5, 7.6], 2000); // 45.1h
    expect(pay.totalHours).toBe(45.1);
    expect(pay.regularHours).toBe(40);
    expect(pay.overtimeHours).toBe(5.1);
    expect(pay.regularPayCents).toBe(80000);
    // 5.1 * 2000 * 1.5 = 15300
    expect(pay.overtimePayCents).toBe(15300);
  });

  it("returns zeros for an empty week", () => {
    const pay = summarizeWeek([], 2250);
    expect(pay.totalHours).toBe(0);
    expect(pay.totalPayCents).toBe(0);
  });

  it("does NOT combine hours across weeks — each week is summed separately", () => {
    // Two separate weeks of 30h each must never trigger overtime, even though
    // the running total (60) exceeds 40. Overtime is strictly per-week.
    const weekA = summarizeWeek([10, 10, 10], 3000); // 30h
    const weekB = summarizeWeek([10, 10, 10], 3000); // 30h
    expect(weekA.overtimeHours).toBe(0);
    expect(weekB.overtimeHours).toBe(0);
    expect(weekA.totalPayCents + weekB.totalPayCents).toBe(180000);
  });

  it("uses 40 as the documented threshold constant", () => {
    expect(OVERTIME_THRESHOLD_HOURS).toBe(40);
  });

  it("rejects invalid inputs", () => {
    expect(() => calculatePay(-1, 2250)).toThrow(RangeError);
    expect(() => calculatePay(10, -5)).toThrow(RangeError);
    expect(() => calculatePay(10, 22.5)).toThrow(RangeError); // rate must be integer cents
  });
});

describe("sumHours", () => {
  it("rounds to 2 decimals to absorb float drift", () => {
    expect(sumHours([0.1, 0.2])).toBe(0.3);
  });
});
