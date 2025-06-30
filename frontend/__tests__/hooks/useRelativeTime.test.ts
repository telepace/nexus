import { _internalCalcRelative } from "@/hooks/useRelativeTime";

describe("calcRelativeLabelAndNext", () => {
  const now = new Date("2025-06-28T16:30:00Z").getTime();

  it.each([
    { diffSec: 1, expected: "1s" },
    { diffSec: 59, expected: "59s" },
    { diffSec: 60, expected: "1m" }, // 60秒应该显示为1分钟
  ])("returns $expected for $diffSec seconds diff", ({ diffSec, expected }) => {
    const { label } = _internalCalcRelative(now - diffSec * 1000, now);
    expect(label).toBe(expected);
  });

  it("switches to hours after 3600 seconds", () => {
    const { label } = _internalCalcRelative(now - 3600 * 1000, now);
    expect(label).toBe("1h");
  });

  it("switches to days after 24h", () => {
    const { label } = _internalCalcRelative(now - 90000 * 1000, now); // 25h
    expect(label).toBe("1d");
  });
});
