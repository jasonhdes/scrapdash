import { formatReleaseDate } from "./format";

describe("formatReleaseDate", () => {
  it("returns a dash when there is no date", () => {
    expect(formatReleaseDate(null, null)).toBe("—");
    expect(formatReleaseDate(undefined, false)).toBe("—");
  });

  it("marks a released date as liberado", () => {
    expect(formatReleaseDate("2026-08-25T13:04:21.000000Z", true)).toBe("25/08/2026 (liberado)");
  });

  it("marks a pending date as previsto", () => {
    expect(formatReleaseDate("2026-08-25T13:04:21.000000Z", false)).toBe("25/08/2026 (previsto)");
  });

  it("formats in Brasília time regardless of the local timezone", () => {
    // 23:30 UTC on Jan 1 is already Jan 2 in some timezones but still Jan 1
    // 20:30 in Brasília (UTC-3) — pins the conversion instead of trusting
    // whatever timezone the machine running the test happens to have.
    expect(formatReleaseDate("2026-01-01T23:30:00.000000Z", false)).toBe("01/01/2026 (previsto)");
  });
});
