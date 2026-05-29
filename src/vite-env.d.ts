/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_NOTES_ENCRYPTION_KEY?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
