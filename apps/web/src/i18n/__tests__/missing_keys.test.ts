import { describe, it, expect } from "vitest";
import en from "../locales/en.json";
import hi from "../locales/hi.json";
import ml from "../locales/ml.json";
import ta from "../locales/ta.json";
import te from "../locales/te.json";

function getLeafKeys(obj: Record<string, any>, prefix = ""): string[] {
  let keys: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    if (key.startsWith("_")) continue; // Skip metadata keys like _status
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      keys = keys.concat(getLeafKeys(value, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

function getValueByPath(obj: Record<string, any>, path: string): any {
  const parts = path.split(".");
  let curr = obj;
  for (const p of parts) {
    if (curr === undefined || curr === null) return undefined;
    curr = curr[p];
  }
  return curr;
}

describe("i18n Multilingual Completeness Gate", () => {
  const enKeys = getLeafKeys(en);
  const targetLocales = [
    { code: "hi", name: "Hindi", data: hi },
    { code: "ml", name: "Malayalam", data: ml },
    { code: "ta", name: "Tamil", data: ta },
    { code: "te", name: "Telugu", data: te }
  ];

  it("verifies English locale has substantial translation keys", () => {
    expect(enKeys.length).toBeGreaterThan(80);
  });

  targetLocales.forEach(({ code, name, data }) => {
    it(`guarantees zero missing keys for ${name} (${code})`, () => {
      const missing: string[] = [];
      const emptyOrRaw: string[] = [];

      for (const key of enKeys) {
        const val = getValueByPath(data, key);
        if (val === undefined || val === null) {
          missing.push(key);
        } else if (typeof val === "string" && val.trim() === "") {
          emptyOrRaw.push(key);
        }
      }

      expect(missing, `Missing keys in ${code}: ${missing.join(", ")}`).toEqual([]);
      expect(emptyOrRaw, `Empty string keys in ${code}: ${emptyOrRaw.join(", ")}`).toEqual([]);
    });

    it(`discloses machine-drafted status in ${code}.json metadata`, () => {
      expect((data as any)._status).toBe("machine-drafted, needs native-speaker and clinical review");
    });
  });
});
