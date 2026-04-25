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
  [Environment.PRODUCTION]: 'https://zmh-chatbot.duckdns.org', // Your Backend URL
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