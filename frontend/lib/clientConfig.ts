import { client } from "@/app/openapi-client/sdk.gen";

const configureClient = () => {
  // Default to localhost for development, but this should be overridden in production
  const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.API_BASE_URL || 'http://localhost:8000';

  client.setConfig({
    baseURL: baseURL,
    timeout: 10000, // 10 seconds timeout
    headers: {
      'Content-Type': 'application/json',
    },
  });
};

configureClient();
