# MVI methodology

MVI is a deterministic, rule-based, provisional prioritisation index from 0 to 100. It is not a probability of complications or death and does not diagnose high-risk pregnancy. Formal clinical identification remains with the Medical Officer/obstetrician; ASHA wording is “needs priority follow-up / refer to ANM-PHC”.

The four domains (Clinical, Social, Accessibility, Environmental) use equal illustrative domain weights. Each factor is scored from configured bins. Missing/unknown values are excluded from the observed weighted mean but contribute to lower and upper bounds (0 and 100), are shown as missing information, and reduce completeness. Below 60% overall completeness the result is “Incomplete: provisional”; below 50% domain completeness the domain is insufficient.

The TypeScript and Python implementations read the shared config in `packages/mvi-spec`. Emergency rules are independent and always take precedence over MVI. Thresholds and translations require clinical/native-speaker review before any field deployment.
