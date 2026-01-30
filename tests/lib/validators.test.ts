import { validateCF, validatePIVA } from "@/lib/validators";

describe("validateCF", () => {
  it("should validate correct CF", () => {
    expect(validateCF("RSSMRA80A01H501U")).toBe(true);
  });

  it("should reject invalid CF", () => {
    expect(validateCF("INVALID123456789")).toBe(false);
    expect(validateCF("SHORT")).toBe(false);
    expect(validateCF("")).toBe(false);
  });

  it("should handle lowercase", () => {
    expect(validateCF("rssmra80a01h501u")).toBe(true);
  });
});

describe("validatePIVA", () => {
  it("should validate correct PIVA", () => {
    expect(validatePIVA("12345678903")).toBe(true);
  });

  it("should reject invalid PIVA", () => {
    expect(validatePIVA("12345678901")).toBe(false);
    expect(validatePIVA("1234567890")).toBe(false);
    expect(validatePIVA("123456789012")).toBe(false);
    expect(validatePIVA("ABCDEFGHIJK")).toBe(false);
  });
});
