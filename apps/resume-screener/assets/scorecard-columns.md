# Scorecard sheet schema

Sheet name: `Screening — <Role>`. First row is a header note: `criteria.md rev <date>`. Then one row per candidate with exactly these columns, in order:

| Column                | Contents                                                                                 |
| --------------------- | ---------------------------------------------------------------------------------------- |
| Candidate             | Full name                                                                                |
| Contact               | Email / phone from the resume ("not stated" if absent)                                   |
| Must-haves            | `n/N` met, e.g. `4/6`                                                                    |
| Missing               | Which must-haves are unmet, comma-separated ("—" if none)                                |
| Red flags             | Short phrases, each with evidence, e.g. `3 jobs in 2 yrs ("2023–2025: …")` ("—" if none) |
| Years relevant        | Number, best estimate from the resume                                                    |
| Score                 | 1–10. 9–10 exceptional fit · 7–8 advance · 5–6 maybe · <5 pass                           |
| Phone-screen question | ONE question tailored to this candidate's biggest open question — specific, not generic  |
| Recommendation        | `Advance` / `Maybe` / `Pass`                                                             |
| Notes                 | Anything else load-bearing (visa mention, portfolio link, referral)                      |

Scoring discipline: must-haves drive the score; nice-to-haves break ties only. A candidate missing a hard must-have caps at 5 regardless of polish.
