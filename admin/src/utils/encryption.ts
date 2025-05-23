// In admin/src/utils/encryption.ts
import CryptoJS from 'crypto-js';

const getEncryptionKey = (): string => {
  const key = import.meta.env.VITE_APP_SYMMETRIC_ENCRYPTION_KEY;
  if (!key) {
    console.error("Encryption key is not defined. Please check VITE_APP_SYMMETRIC_ENCRYPTION_KEY environment variable.");
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
