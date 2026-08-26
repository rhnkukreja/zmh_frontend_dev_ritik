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

// Whether the app is pointed at the LOCAL backend. Derived from the CURRENT_ENV
// switch above so environments are flipped in exactly one place, rather than
// from import.meta.env (which would report "local" whenever the dev server is
// running, even while it talks to the production API).
// The `as string` cast mirrors getRequestHeaders(): without it TS narrows this
// const to the literal it was initialized with and rejects the comparison.
export const IS_LOCAL_ENV = (CURRENT_ENV as string) === Environment.LOCAL;

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

// allowIdOrCik defaults to false so every existing caller (institution-linking's
// CreateAndEditInstitution.tsx / InvestorCard) keeps its exact current
// name-only behavior, unchanged. Only ActivistDashboard.tsx's Basic Profile
// "Activist Name" search passes true, letting a raw WhaleWisdom filer ID or
// CIK typed into that box resolve directly instead of going through (and
// possibly being mismatched by) the name-based fuzzy search -- see
// fetch_whale_wisdom_id's docstring on the backend.
export const generateWhaleWisdomId = async (institutionName: string, allowIdOrCik: boolean = false) => {
  const url = `${AI_CHATBOT_API_BASE}/generate-whalewisdom-id${allowIdOrCik ? "?allow_id_or_cik=true" : ""}`;
  const res = await fetch(url, {
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