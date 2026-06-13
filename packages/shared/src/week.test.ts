import { describe, it, expect } from "vitest";
import {
  getWeekStart,
  getWeekEnd,
  addWeeks,
  isSameWeek,
  datesInWeek,
  isValidDateString,
} from "./week.js";

describe("week helpers (Monday-start)", () => {
  it("maps any day to its Monday, matching the sketch week Jun 08–14, 2026", () => {
    // 2026-06-08 is a Monday; 2026-06-14 is the Sunday.
    expect(getWeekStart("2026-06-08")).toBe("2026-06-08"); // Mon
    expect(getWeekStart("2026-06-10")).toBe("2026-06-08"); // Wed
    expect(getWeekStart("2026-06-14")).toBe("2026-06-08"); // Sun
    expect(getWeekEnd("2026-06-10")).toBe("2026-06-14");
  });

  it("keeps Sunday with the week it ends, not the next one", () => {
    expect(getWeekStart("2026-06-07")).toBe("2026-06-01"); // prev Sunday
  });

  it("crosses month and year boundaries correctly", () => {
    expect(getWeekStart("2027-01-01")).toBe("2026-12-28"); // Fri -> prev Mon
    expect(getWeekEnd("2026-12-31")).toBe("2027-01-03");
  });

  it("addWeeks shifts by whole weeks in both directions", () => {
    expect(addWeeks("2026-06-08", 1)).toBe("2026-06-15");
    expect(addWeeks("2026-06-08", -1)).toBe("2026-06-01");
  });

  it("isSameWeek groups by Monday", () => {
    expect(isSameWeek("2026-06-08", "2026-06-14")).toBe(true);
    expect(isSameWeek("2026-06-08", "2026-06-15")).toBe(false);
  });

  it("datesInWeek returns Mon..Sun", () => {
    expect(datesInWeek("2026-06-10")).toEqual([
      "2026-06-08", "2026-06-09", "2026-06-10", "2026-06-11",
      "2026-06-12", "2026-06-13", "2026-06-14",
    ]);
  });

  it("validates date strings strictly", () => {
    expect(isValidDateString("2026-06-08")).toBe(true);
    expect(isValidDateString("2026-13-01")).toBe(false); // bad month
    expect(isValidDateString("2026-02-30")).toBe(false); // not a real day
    expect(isValidDateString("6/8/2026")).toBe(false);
  });
});
