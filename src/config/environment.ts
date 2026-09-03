const environment = import.meta.env.VITE_ENVIRONMENT || import.meta.env.MODE || 'production';

if (environment === 'production') {
    console.log("\n -------------- Welcome to production mode -------------- \n");
} else {
    console.log("\n -------------- Welcome to development mode -------------- \n");
}

export const apiBaseURL: string =
  import.meta.env.VITE_API_BASE_URL ||
  (environment === 'development' ? 'https://api-dev.zmhadvisors.com' : 'https://api.zmhadvisors.com');

// Independent base URL for the Activist Campaigns endpoints, separate from
// apiBaseURL so it can point at a local backend during development without
// affecting login and everything else that goes through apiBaseURL.
//
// MUST NOT fall back to apiBaseURL. These endpoints live on the FastAPI
// backend (api-chatbot), whereas apiBaseURL is the Django backend
// (api.zmhadvisors.com) which has no /api/activist-campaigns route at all --
// that fallback 404'd every campaigns call in any environment where the
// override happened to be unset, which is precisely production.
export const activistCampaignsApiBaseURL: string =
  import.meta.env.VITE_ACTIVIST_CAMPAIGNS_API_BASE_URL ||
  import.meta.env.VITE_CHATBOT_API_BASE_URL ||
  'https://api-chatbot.zmhadvisors.com';

export { environment };
