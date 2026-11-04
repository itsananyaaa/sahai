import { describe, it, expect } from "vitest";
import goldenVectors from "@sahai/mvi-spec/golden-vectors.v1.json";
import { mviScorer } from "../engine";
import { evaluateEmergency } from "../emergency";

describe("MVI TypeScript Engine Parity with Golden Vectors", () => {
  goldenVectors.forEach((vector) => {
    it(`correctly computes ${vector.id}`, () => {
      const result = mviScorer.calculate(vector.inputs);
      const expected = vector.expected;

      expect(Math.abs(result.overall_score - expected.overall_score)).toBeLessThan(0.05);
      expect(result.band).toBe(expected.band);
      expect(Math.abs(result.completeness - expected.completeness)).toBeLessThan(0.05);
      expect(Math.abs(result.lower_bound - expected.lower_bound)).toBeLessThan(0.05);
      expect(Math.abs(result.upper_bound - expected.upper_bound)).toBeLessThan(0.05);

      const emergencyRes = evaluateEmergency(
        vector.danger_signs,
        vector.inputs.blood_pressure
      );
      expect(emergencyRes.has_emergency).toBe(expected.emergency_result.has_emergency);
      expect(emergencyRes.priority).toBe(expected.emergency_result.priority);
    });
  });

  it("asserts emergency triggers override low MVI score (precedence gate)", () => {
    const vec6 = goldenVectors.find((v) => v.id === "VEC-06-URGENT-WITH-LOW-MVI");
    expect(vec6).toBeDefined();

    const mviRes = mviScorer.calculate(vec6!.inputs);
    const emRes = evaluateEmergency(vec6!.danger_signs, vec6!.inputs.blood_pressure);

    expect(mviRes.overall_score).toBe(0.0);
    expect(mviRes.band).toBe("lower");
    expect(emRes.has_emergency).toBe(true);
    expect(emRes.priority).toBe("Urgent");
    expect(emRes.triggers_fired).toContain("vaginal_bleeding");
  });
});
