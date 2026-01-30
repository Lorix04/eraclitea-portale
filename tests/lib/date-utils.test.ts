import {
  parseItalianDate,
  formatItalianDate,
  formatItalianDateTime,
  isValidItalianDate,
  formatRelativeDate,
} from "@/lib/date-utils";

describe("date-utils", () => {
  describe("parseItalianDate", () => {
    it("should parse valid Italian date DD/MM/YYYY", () => {
      const result = parseItalianDate("15/03/1990");
      expect(result).toBeInstanceOf(Date);
      expect(result?.getDate()).toBe(15);
      expect(result?.getMonth()).toBe(2);
      expect(result?.getFullYear()).toBe(1990);
    });

    it("should parse date with single digit day/month", () => {
      const result = parseItalianDate("5/3/1990");
      expect(result).toBeInstanceOf(Date);
      expect(result?.getDate()).toBe(5);
      expect(result?.getMonth()).toBe(2);
    });

    it("should return null for empty string", () => {
      expect(parseItalianDate("")).toBeNull();
      expect(parseItalianDate(null)).toBeNull();
      expect(parseItalianDate(undefined)).toBeNull();
    });

    it("should return null for invalid date", () => {
      expect(parseItalianDate("32/13/2024")).toBeNull();
      expect(parseItalianDate("invalid")).toBeNull();
    });

    it("should handle ISO format as fallback", () => {
      const result = parseItalianDate("2024-03-15");
      expect(result).toBeInstanceOf(Date);
      expect(result?.getFullYear()).toBe(2024);
    });
  });

  describe("formatItalianDate", () => {
    it("should format Date to DD/MM/YYYY", () => {
      const date = new Date(1990, 2, 15);
      expect(formatItalianDate(date)).toBe("15/03/1990");
    });

    it("should format ISO string to DD/MM/YYYY", () => {
      expect(formatItalianDate("2024-03-15T00:00:00.000Z")).toMatch(
        /15\/03\/2024/
      );
    });

    it("should return empty string for null/undefined", () => {
      expect(formatItalianDate(null)).toBe("");
      expect(formatItalianDate(undefined)).toBe("");
    });

    it("should return empty string for invalid date", () => {
      expect(formatItalianDate("invalid")).toBe("");
    });
  });

  describe("formatItalianDateTime", () => {
    it("should format Date to DD/MM/YYYY HH:mm", () => {
      const date = new Date(2024, 2, 15, 14, 30);
      expect(formatItalianDateTime(date)).toBe("15/03/2024 14:30");
    });
  });

  describe("isValidItalianDate", () => {
    it("should return true for valid dates", () => {
      expect(isValidItalianDate("15/03/1990")).toBe(true);
      expect(isValidItalianDate("01/01/2024")).toBe(true);
      expect(isValidItalianDate("31/12/2023")).toBe(true);
    });

    it("should return false for invalid dates", () => {
      expect(isValidItalianDate("32/01/2024")).toBe(false);
      expect(isValidItalianDate("invalid")).toBe(false);
      expect(isValidItalianDate("")).toBe(false);
    });
  });

  describe("formatRelativeDate", () => {
    it('should return "Oggi" for today', () => {
      const today = new Date();
      expect(formatRelativeDate(today)).toBe("Oggi");
    });

    it('should return "Ieri" for yesterday', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      expect(formatRelativeDate(yesterday)).toBe("Ieri");
    });

    it('should return "X giorni fa" for recent dates', () => {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      expect(formatRelativeDate(threeDaysAgo)).toBe("3 giorni fa");
    });
  });
});
