import scoringConfig from "@sahai/mvi-spec/scoring-config.v1.json";

export interface MviFactorResult {
  bin: string;
  score: number;
}

export interface MviDomainScore {
  score: number | null;
  completeness: number;
  sufficient_data: boolean;
}

export interface ContributingFactor {
  factor: string;
  domain: string;
  score: number;
  weight: number;
  weighted_points: number;
  bin: string;
}

export interface MviAssessmentResult {
  overall_score: number;
  completeness: number;
  lower_bound: number;
  upper_bound: number;
  band: "lower" | "moderate" | "elevated" | "priority" | "incomplete_provisional";
  domain_scores: Record<string, number | null>;
  missing_factors: string[];
  top_contributing_factors: ContributingFactor[];
  explanation: Record<string, any>;
}

export class RuleBasedScorer {
  private config: typeof scoringConfig;

  constructor(config = scoringConfig) {
    this.config = config;
  }

  scoreFactor(domain: string, factorName: string, val: any): MviFactorResult | null {
    if (val === undefined || val === null || val === "unknown" || val === "not_assessed") {
      return null;
    }

    if (factorName === "blood_pressure") {
      if (typeof val !== "object") return null;
      const { systolic, diastolic } = val;
      if (systolic === undefined || diastolic === undefined || systolic === null || diastolic === null) return null;
      if (systolic >= 160 || diastolic >= 110) return { bin: "severe_hypertension", score: 100 };
      if (systolic >= 140 || diastolic >= 90) return { bin: "stage1_hypertension", score: 75 };
      if (systolic >= 120 || diastolic >= 80) return { bin: "elevated", score: 40 };
      return { bin: "normal", score: 0 };
    }

    if (factorName === "bp_trend") {
      const mapping: Record<string, number> = { stable_normal: 0, fluctuating: 40, rising_trend: 70 };
      if (val in mapping) return { bin: String(val), score: mapping[val] };
      return null;
    }

    if (factorName === "anaemia") {
      if (typeof val === "object") {
        const { hb, pallor } = val;
        if (hb !== undefined && hb !== null) {
          const hbNum = Number(hb);
          if (hbNum < 7.0) return { bin: "severe_anaemia", score: 100 };
          if (hbNum < 10.0) return { bin: "moderate_anaemia", score: 70 };
          if (hbNum < 11.0) return { bin: "mild_anaemia", score: 35 };
          return { bin: "no_anaemia", score: 0 };
        }
        if (pallor !== undefined && pallor !== null) {
          const mapping: Record<string, number> = { severe: 100, moderate: 70, mild: 35, no: 0 };
          if (pallor in mapping) return { bin: `${pallor}_pallor`, score: mapping[pallor] };
        }
      }
      return null;
    }

    if (factorName === "prior_c_section") {
      const score = (val === true || val === "yes") ? 70 : 0;
      return { bin: score === 70 ? "yes" : "no", score };
    }

    if (factorName === "gestational_age_anc1") {
      if (val === "no_prior_anc") return { bin: "no_prior_anc", score: 100 };
      const w = Number(val);
      if (isNaN(w)) return null;
      if (w <= 12) return { bin: "first_trimester", score: 0 };
      if (w <= 27) return { bin: "second_trimester", score: 40 };
      return { bin: "third_trimester", score: 80 };
    }

    if (factorName === "maternal_age") {
      const age = Number(val);
      if (isNaN(age)) return null;
      if (age < 18) return { bin: "age_adolescent", score: 90 };
      if (age <= 19) return { bin: "age_young", score: 30 };
      if (age <= 34) return { bin: "age_optimal", score: 0 };
      return { bin: "age_advanced", score: 60 };
    }

    if (factorName === "birth_order_parity") {
      const p = Number(val);
      if (isNaN(p)) return null;
      if (p === 0) return { bin: "primigravida", score: 25 };
      if (p === 1 || p === 2) return { bin: "second_or_third", score: 0 };
      return { bin: "grand_multipara", score: 75 };
    }

    if (factorName === "education_level") {
      const mapping: Record<string, number> = {
        higher_secondary_plus: 0,
        secondary: 30,
        primary: 60,
        no_formal_education: 80
      };
      if (val in mapping) return { bin: String(val), score: mapping[val] };
      return null;
    }

    if (factorName === "household_autonomy") {
      if (val === "prefer_not_to_say") return null;
      const mapping: Record<string, number> = {
        independent: 0,
        shared_decision: 20,
        limited_autonomy: 75
      };
      if (val in mapping) return { bin: String(val), score: mapping[val] };
      return null;
    }

    if (factorName === "distance_to_cemoc") {
      const m = Number(val);
      if (isNaN(m)) return null;
      if (m <= 30) return { bin: "under_30_min", score: 0 };
      if (m <= 59) return { bin: "30_to_59_min", score: 35 };
      if (m <= 119) return { bin: "60_to_119_min", score: 70 };
      return { bin: "over_120_min", score: 100 };
    }

    if (factorName === "transport_availability") {
      const mapping: Record<string, number> = {
        always_available: 0,
        delayed_on_call: 45,
        difficult_or_none: 90
      };
      if (val in mapping) return { bin: String(val), score: mapping[val] };
      return null;
    }

    if (factorName === "past_referral_history") {
      const mapping: Record<string, number> = {
        no_prior_referral: 0,
        completed_on_time: 0,
        past_non_completion: 85
      };
      if (val in mapping) return { bin: String(val), score: mapping[val] };
      return null;
    }

    if (factorName === "road_disruption_risk") {
      const mapping: Record<string, number> = {
        all_weather_road: 0,
        seasonal_flood_risk: 55,
        active_road_cut: 100
      };
      if (val in mapping) return { bin: String(val), score: mapping[val] };
      return null;
    }

    if (factorName === "migration_status") {
      const mapping: Record<string, number> = {
        settled_resident: 0,
        seasonal_migrant: 65,
        distress_displacement: 95
      };
      if (val in mapping) return { bin: String(val), score: mapping[val] };
      return null;
    }

    return null;
  }

  calculate(inputs: Record<string, any>): MviAssessmentResult {
    const domainResults: Record<string, MviDomainScore> = {};
    let totalObservedWeight = 0;
    let totalPossibleWeight = 0;
    const missingFactors: string[] = [];
    const contributingFactors: ContributingFactor[] = [];

    const boundScoresLower: Record<string, number> = {};
    const boundScoresUpper: Record<string, number> = {};

    const domains = this.config.domains as Record<string, any>;

    for (const [dName, dConf] of Object.entries(domains)) {
      const factors = dConf.factors as Record<string, any>;
      let dObsWt = 0;
      let dTotWt = 0;
      let dWeightedScore = 0;
      let dLowerWeighted = 0;
      let dUpperWeighted = 0;

      for (const [fName, fConf] of Object.entries(factors)) {
        const fWt = fConf.weight as number;
        dTotWt += fWt;
        const val = inputs[fName];
        const res = this.scoreFactor(dName, fName, val);

        if (res !== null) {
          dObsWt += fWt;
          dWeightedScore += fWt * res.score;
          dLowerWeighted += fWt * res.score;
          dUpperWeighted += fWt * res.score;
          contributingFactors.push({
            factor: fName,
            domain: dName,
            score: res.score,
            weight: fWt,
            weighted_points: Number(((fWt * res.score * 0.25) / dTotWt).toFixed(2)),
            bin: res.bin
          });
        } else {
          missingFactors.push(fName);
          dLowerWeighted += fWt * 0;
          dUpperWeighted += fWt * 100;
        }
      }

      const dCompleteness = dTotWt > 0 ? dObsWt / dTotWt : 0;
      const dScore = dObsWt > 0 ? Number((dWeightedScore / dObsWt).toFixed(2)) : null;

      domainResults[dName] = {
        score: dScore,
        completeness: Number(dCompleteness.toFixed(3)),
        sufficient_data: dCompleteness >= this.config.min_domain_completeness
      };

      boundScoresLower[dName] = dLowerWeighted / dTotWt;
      boundScoresUpper[dName] = dUpperWeighted / dTotWt;

      totalObservedWeight += dObsWt;
      totalPossibleWeight += dTotWt;
    }

    const overallCompleteness = Number((totalObservedWeight / totalPossibleWeight).toFixed(3));

    const validDomains = Object.values(domainResults).filter((d) => d.score !== null);
    let overallScore = 0;
    if (validDomains.length > 0) {
      const sum = validDomains.reduce((acc, curr) => acc + (curr.score || 0), 0);
      overallScore = Number((sum / validDomains.length).toFixed(2));
    }

    const lowerVals = Object.values(boundScoresLower);
    const upperVals = Object.values(boundScoresUpper);
    const lowerBound = Number((lowerVals.reduce((a, b) => a + b, 0) / lowerVals.length).toFixed(2));
    const upperBound = Number((upperVals.reduce((a, b) => a + b, 0) / upperVals.length).toFixed(2));

    let band: MviAssessmentResult["band"];
    if (overallCompleteness < this.config.min_overall_completeness) {
      band = "incomplete_provisional";
    } else if (overallScore < 30) {
      band = "lower";
    } else if (overallScore < 55) {
      band = "moderate";
    } else if (overallScore < 75) {
      band = "elevated";
    } else {
      band = "priority";
    }

    contributingFactors.sort((a, b) => b.score - a.score);

    const explanation = {
      config_version: this.config.version,
      status: this.config.status,
      overall_score: overallScore,
      band,
      completeness: overallCompleteness,
      lower_bound: lowerBound,
      upper_bound: upperBound,
      domain_scores: Object.fromEntries(Object.entries(domainResults).map(([k, v]) => [k, v.score])),
      missing_factors: missingFactors,
      top_contributing_factors: contributingFactors.slice(0, 4),
      disclaimer_key: "mvi_disclaimer_not_clinical_diagnosis"
    };

    return {
      overall_score: overallScore,
      completeness: overallCompleteness,
      lower_bound: lowerBound,
      upper_bound: upperBound,
      band,
      domain_scores: Object.fromEntries(Object.entries(domainResults).map(([k, v]) => [k, v.score])),
      missing_factors: missingFactors,
      top_contributing_factors: contributingFactors.slice(0, 4),
      explanation
    };
  }
}

export const mviScorer = new RuleBasedScorer();
