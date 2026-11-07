// Orange County income limits, hand-copied from HCD PDFs on 2026-11-07.
// Each array is household size 1..8. Check against the source before relying on it.
window.LIMIT_TABLES = [
  {
    id: "state-2026-rev",
    name: "2026 State Income Limits (revised)",
    agency: "CA HCD",
    effective: "2026-06-23",
    note: "Revised memo dated June 23, 2026. Replaces the version dated May 29, 2026.",
    superseded: false,
    url: "https://www.hcd.ca.gov/sites/default/files/docs/grants-and-funding/income-limits-2026.pdf",
    county: "Orange",
    ami4: 138600,
    rows: {
      "Acutely low":        [14550, 16650, 18700, 20800, 22450, 24150, 25800, 27450],
      "Extremely low":      [39100, 44700, 50300, 55850, 60350, 64800, 69300, 73750],
      "Very low (50%)":     [65150, 74450, 83750, 93050, 100500, 107950, 115400, 122850],
      "Low (80%)":          [104200, 119100, 134000, 148850, 160800, 172700, 184600, 196500],
      "Median":             [97000, 110900, 124750, 138600, 149700, 160800, 171850, 182950],
      "Moderate (120%)":    [116400, 133050, 149650, 166300, 179600, 192900, 206200, 219500],
    },
  },
  {
    id: "state-2026-may",
    name: "2026 State Income Limits (original)",
    agency: "CA HCD",
    effective: "2026-05-29",
    note: "Replaced by the June 23, 2026 revision. Values not loaded. Do not use.",
    superseded: true,
    url: "https://www.hcd.ca.gov/grants-and-funding/income-limits/state-and-federal-income-rent-and-loan-value-limits",
    county: "Orange",
    rows: null,
  },
  {
    id: "home-2026",
    name: "2026 State HOME Income Limits",
    agency: "CA HCD (HUD HOME program)",
    effective: "2026-06-01",
    note: "For HOME-funded projects. Has no median row, so the affordable-cost formula still uses the State table median.",
    superseded: false,
    url: "https://www.hcd.ca.gov/sites/default/files/docs/grants-and-funding/2026-california-HOME-income-limits_0.pdf",
    county: "Orange",
    rows: {
      "30% limits":         [39100, 44700, 50300, 55850, 60350, 64800, 69300, 73750],
      "Very low (50%)":     [65150, 74450, 83750, 93050, 100500, 107950, 115400, 122850],
      "60% limits":         [78180, 89340, 100500, 111660, 120600, 129540, 138480, 147420],
      "Low (80%)":          [104200, 119100, 134000, 148850, 160800, 172700, 184600, 196500],
    },
  },
];

// Affordable housing cost tiers for owner-occupied housing.
// Source: CA Health & Safety Code 50052.5(b). Checked 2026-11-07 against secondary copies of the
// statute (servanda.ai, california.public.law search excerpts, LA County 2025 limits document),
// not the official leginfo site, which was blocked in this session. Very low (30% x 50%) not yet
// matched to a quoted excerpt. Household size = bedrooms + 1 (studio = 1 ... 4-bedroom = 5).
window.TIERS = [
  { id: "eli", name: "Extremely low income", share: 0.30, amiMult: 0.30, limitRow: "Extremely low", verified: true },
  { id: "vli", name: "Very low income",      share: 0.30, amiMult: 0.50, limitRow: "Very low (50%)", verified: false },
  { id: "li",  name: "Lower income",         share: 0.30, amiMult: 0.70, limitRow: "Low (80%)", verified: true },
  { id: "mod", name: "Moderate income",      share: 0.35, amiMult: 1.10, limitRow: "Moderate (120%)", verified: true },
];
