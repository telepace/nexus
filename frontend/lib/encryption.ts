// In frontend/lib/encryption.ts
import CryptoJS from "crypto-js";

const getEncryptionKey = (): string => {
  const key = process.env.NEXT_PUBLIC_APP_SYMMETRIC_ENCRYPTION_KEY;
  if (!key) {
    console.error(
      "Encryption key is not defined. Please check NEXT_PUBLIC_APP_SYMMETRIC_ENCRYPTION_KEY environment variable.",
    );
    throw new Error("Encryption key is not defined.");
  }
  return key;
};

export const encryptPassword = (plainPassword: string): string => {
  const key = getEncryptionKey();
  try {
    const encrypted = CryptoJS.AES.encrypt(plainPassword, key).toString();
    return encrypted;
  } catch (error) {
    console.error("Password encryption failed:", error);
    throw new Error("Could not encrypt password.");
  }
};
