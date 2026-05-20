import CryptoJS from "crypto-js";

const ENCRYPTION_PREFIX = "[ENC_V1]";
const DECRYPTION_FALLBACK_TEXT = "Note is encrypted";

const getEncryptionKey = (): string => {
  return (import.meta.env.VITE_NOTES_ENCRYPTION_KEY || "").trim();
};

export const encryptNotesText = (plainText: string): string => {
  if (typeof plainText !== "string" || plainText.length === 0) {
    return plainText;
  }

  // Avoid double encryption when data is already encrypted.
  if (plainText.startsWith(ENCRYPTION_PREFIX)) {
    return plainText;
  }

  const key = getEncryptionKey();
  if (!key) {
    console.error("Notes encryption key is missing.");
    return plainText;
  }

  try {
    const encrypted = CryptoJS.AES.encrypt(plainText, key).toString();
    return `${ENCRYPTION_PREFIX}${encrypted}`;
  } catch (error) {
    console.error("Failed to encrypt note text:", error);
    return plainText;
  }
};

export const decryptNotesText = (value: string): string => {
  if (typeof value !== "string") {
    return value as unknown as string;
  }

  // Backward compatibility for old plaintext records.
  if (!value.startsWith(ENCRYPTION_PREFIX)) {
    return value;
  }

  const key = getEncryptionKey();
  if (!key) {
    console.error("Notes decryption key is missing.");
    return DECRYPTION_FALLBACK_TEXT;
  }

  try {
    const cipherText = value.slice(ENCRYPTION_PREFIX.length);
    const bytes = CryptoJS.AES.decrypt(cipherText, key);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);

    if (decrypted === "" && cipherText.length > 0) {
      console.error("Failed to decrypt note text: empty plaintext result.");
      return DECRYPTION_FALLBACK_TEXT;
    }

    return decrypted;
  } catch (error) {
    console.error("Failed to decrypt note text:", error);
    return DECRYPTION_FALLBACK_TEXT;
  }
};

export const encryptNotesField = <T extends Record<string, any>>(data: T): T => {
  if (!data || typeof data !== "object") {
    return data;
  }

  if (typeof data.notes !== "string") {
    return { ...data };
  }

  return {
    ...data,
    notes: encryptNotesText(data.notes),
  };
};

export const decryptNotesDeep = <T>(value: T): T => {
  if (Array.isArray(value)) {
    return value.map((item) => decryptNotesDeep(item)) as T;
  }

  if (value && typeof value === "object") {
    const source = value as Record<string, any>;
    const result: Record<string, any> = {};

    Object.entries(source).forEach(([key, currentValue]) => {
      if (key === "notes" && typeof currentValue === "string") {
        result[key] = decryptNotesText(currentValue);
      } else {
        result[key] = decryptNotesDeep(currentValue);
      }
    });

    return result as T;
  }

  return value;
};
