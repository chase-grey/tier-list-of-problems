/// <reference types="vite/client" />

// Define environment variables for Vite
interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  // Add other environment variables as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
