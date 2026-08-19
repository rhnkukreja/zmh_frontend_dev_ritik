// 1. ENVIRONMENT CONFIGURATION
export const Environment = {
  LOCAL: 'local',
  PRODUCTION: 'production',
  NGROK: 'ngrok'
} as const;

// Define a type that represents ANY of the values in Environment
type EnvType = typeof Environment[keyof typeof Environment];

// ⚠️ CHANGE THIS VARIABLE TO SWITCH ENVIRONMENTS // Options: Environment.LOCAL | Environment.PRODUCTION | Environment.NGROK
const CURRENT_ENV: EnvType = Environment.PRODUCTION;

// Derived flag — single source of truth for any local-only vs. production
// behavioral branching (e.g. the Basic-profile approval-gate bypass in
// ActivistDashboard.tsx). Flip CURRENT_ENV above and this follows.
// [FIX] "(CURRENT_ENV as string)" so TypeScript doesn't flag this as an
// impossible comparison — same reason getRequestHeaders' NGROK check below
// needs the same cast. Without it, this line either won't compile against
// Environment.LOCAL, or (as it did before) silently gets "fixed" by
// comparing against PRODUCTION instead, which is backwards.
export const IS_LOCAL_ENV = (CURRENT_ENV as string) === Environment.LOCAL;

const API_URLS = {
  [Environment.LOCAL]: 'http://127.0.0.1:8000',
  [Environment.PRODUCTION]: 'https://api-chatbot.zmhadvisors.com', // Your Backend URL
  [Environment.NGROK] : 'https://6f72-2401-4900-1c70-83f3-5538-22ed-d0ef-c044.ngrok-free.app'
};

// Helper function to get the current Base URL
export const getApiBaseUrl = () => {
  return API_URLS[CURRENT_ENV];
};

// Define the Base URL constant
export const AI_CHATBOT_API_BASE = getApiBaseUrl();

console.log(`[App Config] Environment: ${CURRENT_ENV}`);
console.log(`[App Config] API Base: ${AI_CHATBOT_API_BASE}`);

// 2. HELPER FUNCTIONS (Headers & CORS)
export const getRequestHeaders = () => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  // [FIX] We use "(CURRENT_ENV as string)" so TypeScript doesn't think this is dead code
  if ((CURRENT_ENV as string) === Environment.NGROK) {
    headers['ngrok-skip-browser-warning'] = 'true';
  }

  return headers;
};

// 3. API FUNCTIONS
export async function uploadPdf(file: File, investorId: string, categories?: string) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("investor_id", investorId);

  // Add categories if provided
  if (categories) {
    formData.append("categories", categories);
  }

  const res = await fetch(`${AI_CHATBOT_API_BASE}/upload-pdf`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    throw new Error("PDF upload failed");
  }

  return res.json();
}
export async function fetchInvestorFilters(investorId: string) {
  const res = await fetch(`${AI_CHATBOT_API_BASE}/investor-filters/${investorId}`);
  if (!res.ok) {
    // It's okay if this fails (e.g. if endpoint doesn't exist yet), 
    // but in production you'd want to handle it.
    console.warn("Could not fetch filters for investor"); 
    return { years: [], categories: [] };
  }
  return res.json();
}
// [UPDATED] Added categories parameter
export async function uploadJson(file: File, investorId: string, categories?: string) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("investor_id", investorId);
  
  // Add categories if provided
  if (categories) {
    formData.append("categories", categories);
  }

  const res = await fetch(`${AI_CHATBOT_API_BASE}/upload-json`, {
    method: "POST",
    body: formData
  });

  if (!res.ok) {
    throw new Error("JSON upload failed");
  }

  return res.json();
}

export const fetchDocuments = async () => {
  const res = await fetch(`${AI_CHATBOT_API_BASE}/documents`);
  if (!res.ok) throw new Error("Failed to fetch documents");
  return res.json();
};

export async function fetchInvestors() {
  const res = await fetch(`${AI_CHATBOT_API_BASE}/investors`);
  if (!res.ok) throw new Error("Failed to fetch investors");
  return res.json();
}

// [UPDATED] Added investorId parameter
export async function askPdf(
  question: string,
  pdfId?: string,
  searchScope: "single" | "all" = "single",
  llmStrength: number = 5,
  investorId?: string 
) {
  const res = await fetch(`${AI_CHATBOT_API_BASE}/ask-pdf`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question,
      pdf_id: pdfId,
      investor_id: investorId, // Sending this to backend now
      search_scope: searchScope,
      llm_strength: llmStrength,
    }),
  });

  return res.json();
}

export async function fetchWhaleWisdomSummary(institutionName: string) {
  // We hit a new endpoint and pass the name as a query parameter
  const url = new URL(`${AI_CHATBOT_API_BASE}/scrape-whalewisdom`);
  url.searchParams.append('name', institutionName);

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: getRequestHeaders(),
  });

  if (!res.ok) {
    throw new Error("Failed to fetch WhaleWisdom summary");
  }

  return res.json();
}

export async function saveWhaleWisdomSummary(institutionId: number | string, data: any) {
  const res = await fetch(`${AI_CHATBOT_API_BASE}/institution/${institutionId}/whalewisdom-summary`, {
    method: "POST",
    headers: getRequestHeaders(),
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    throw new Error("Failed to save WhaleWisdom summary");
  }

  return res.json();
}

export async function scrapeSelectedWhaleWisdom(name: string, link: string) {
  // 🌟 CHANGED: Points to the new onboard endpoint
  const res = await fetch(`${AI_CHATBOT_API_BASE}/investors/onboard`, {
    method: "POST",
    headers: getRequestHeaders(),
    body: JSON.stringify({ name, link }),
  });

  if (!res.ok) {
    throw new Error("Failed to scrape selected link");
  }

  return res.json();
}

export async function fetchExistingSummaryIds() {
  const res = await fetch(`${AI_CHATBOT_API_BASE}/whalewisdom-summaries/existing`, {
    method: "GET",
    headers: getRequestHeaders(),
  });

  if (!res.ok) {
    return [];
  }

  return res.json();
}

export async function searchWhaleWisdom(name: string) {
  const res = await fetch(`${AI_CHATBOT_API_BASE}/search-whalewisdom?name=${encodeURIComponent(name)}`, {
    method: "GET",
    headers: getRequestHeaders(),
  });
  return res.json();
}

export const generateWhaleWisdomId = async (institutionName: string) => {
  const res = await fetch(`${AI_CHATBOT_API_BASE}/generate-whalewisdom-id`, {
    method: "POST",
    headers: getRequestHeaders(), // Uses your existing headers helper
    body: JSON.stringify({ institution_name: institutionName }),
  });

  if (!res.ok) {
    throw new Error("Failed to generate WhaleWisdom ID");
  }

  return res.json();
};

export async function scrapeQuickWhaleWisdom(name: string, link: string) {
  // 🌟 CHANGED: Points to the new onboard endpoint (Engine handles both now)
  const res = await fetch(`${AI_CHATBOT_API_BASE}/investors/onboard`, {
    method: "POST",
    headers: getRequestHeaders(),
    body: JSON.stringify({ name, link }),
  });

  if (!res.ok) {
    throw new Error("Failed to quickly scrape selected link");
  }

  return res.json();
}

export const scrapeBulkWhaleWisdom = async (investors: {name: string, link: string}[]) => {
  // 🌟 CHANGED: Points to the new bulk multiprocessor endpoint
  const res = await fetch(`${AI_CHATBOT_API_BASE}/investors/ownership-summary`, {
    method: "POST",
    headers: getRequestHeaders(),
    body: JSON.stringify({ investors }),
  });

  if (!res.ok) {
    throw new Error("Failed to run bulk scrape");
  }

  const data = await res.json();
  return data.results;
};

// Add this to the bottom of api.ts
export async function pollWhaleWisdomStatus(name: string) {
  const res = await fetch(`${AI_CHATBOT_API_BASE}/poll-status?name=${encodeURIComponent(name)}`, {
    method: "GET",
    headers: getRequestHeaders(),
  });

  if (!res.ok) {
    throw new Error("Failed to poll status");
  }

  return res.json();
}