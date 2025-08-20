// export const baseURL = `https://api.zmhadvisors.com`;
export const baseURL = `https://api-dev.zmhadvisors.com`;
// export const baseURL = `https://zmh-backend-2498c1b50991.herokuapp.com`;
// export const baseURL = `http://127.0.0.1:8000`;

export const PAGE_SIZE = 10;
export const characterColors: {
  [key: string]: string;
} = {
  A: "#8B0000",
  B: "#006400",
  C: "#00008B",
  D: "#8B008B",
  E: "#4B0082",
  F: "#008B8B",
  G: "#8B4513",
  H: "#8B0000",
  I: "#556B2F",
  J: "#483D8B",
  K: "#8B3A3A",
  L: "#4B0082",
  M: "#006400",
  N: "#8B0000",
  O: "#8B0000",
  P: "#006400",
  Q: "#00008B",
  R: "#8B008B",
  S: "#4B0082",
  T: "#008B8B",
  U: "#8B4513",
  V: "#8B0000",
  W: "#2F4F4F",
  X: "#483D8B",
  Y: "#8B3A3A",
  Z: "#4B0082",
};

export const adminRoutes = ["Company", "Institutions"];

export const investorProfileEditableSectionsInvestors = {
  summary: { value: "Summary", type: "investor" },
  engagement_priorities: { value: "Engagement Priorities", type: "investor" },
  reporting_expectations: { value: "Reporting Expectations", type: "investor" },
  esg_integration_process: {
    value: "ESG Integration Process",
    type: "investor",
  },
  voting_guidelines: { value: "Voting Guidelines", type: "investor" },
  references: { value: "References", type: "investor" },
};
export const investorProfileEditableSectionsEquity = {
  equity_firm_name: { value: "Equity Firm Name", type: "equity" },
  specific_expectations: { value: "Specific Expectations", type: "equity" },
  checklist: {
    value: "Checklist",
    type: "equity",
  },
  other: { value: "Other", type: "equity" },
};

export const no_header_company = [
  "investor-profile",
  "engagement-question",
  "voting-guidelines",
  "case-studies",
  "engagement-detail"
];
export const proponent_type = ["shareholder", "management"];
export const meeting_type = ["Proxy Contest", "Annual", "Special"];
export const proposal_type = ["elect directors", "say on pay", "auditor"];
export const proposal_keywords = {
  "elect directors": ["elect director", "elect"],
  "say on pay": ["executive compensation", "named executive compensation", "compensation"],
  "auditor": ["ratify auditor", "auditor"]
};

export const subSidebarRoutes = ["/notes"];

export const pageTitles: Record<string, string | null> = {
  "/notes": "Notes",
  "/investor-profile": null,
  "/engagement-question": null,
  "/voting-guidelines": null,
  "/case-studies": null,
  "/engagement-detail": null,
  "/shareholder-proposal":null
};

};
export const guideSteps = [
   {
      target: ".step-1",
      content: "You can search any company by name, ticker, or symbol here. Just start typing and select from the suggestions",
    },
     {
      target: ".step-2",
      content: "Here’s the company overview — including ticker, market, and industry details. This updates when you select a new company.",
    },
    {
      target: ".step-3",
      content: "This section lists the top 20 shareholders, their ownership percentage, and key engagement details",
    },
      {
      target: ".step-4",
      content: "See the voting outcomes for board nominees and proposals from recent shareholder meetings.",
    },
  ];

