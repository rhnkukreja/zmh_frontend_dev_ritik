const environment = import.meta.env.VITE_ENVIRONMENT || 'production';

if (environment === 'production') {
    console.log("\n -------------- Welcome to production mode -------------- \n");
} else {
    console.log("\n -------------- Welcome to development mode -------------- \n");
}

export const apiBaseURL: string = import.meta.env.VITE_API_BASE_URL || 'https://api.zmhadvisors.com';

export { environment };
