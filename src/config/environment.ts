const environment = import.meta.env.VITE_ENVIRONMENT || import.meta.env.MODE || 'production';

if (environment === 'production') {
    console.log("\n -------------- Welcome to production mode -------------- \n");
} else {
    console.log("\n -------------- Welcome to development mode -------------- \n");
}

export const apiBaseURL: string =
  import.meta.env.VITE_API_BASE_URL ||
  (environment === 'development' ? 'https://api-dev.zmhadvisors.com' : 'https://api.zmhadvisors.com');


export { environment };
