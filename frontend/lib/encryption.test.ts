import { encryptPassword } from './encryption';
import CryptoJS from 'crypto-js';

describe('Encryption Utility', () => {
  const MOCK_KEY = 'testmockkey12345678901234567890'; // 32 bytes for AES-256, though crypto-js AES is flexible

  // Store original environment variable
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset modules to clear any potentially cached env variables by other modules
    jest.resetModules();
    // Mock process.env
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_APP_SYMMETRIC_ENCRYPTION_KEY: MOCK_KEY,
    };
  });

  afterEach(() => {
    // Restore original environment variables
    process.env = originalEnv;
  });

  it('should encrypt a password successfully', () => {
    const plainPassword = 'mysecretpassword';
    const encrypted = encryptPassword(plainPassword);

    expect(encrypted).toBeDefined();
    expect(encrypted).not.toBe(plainPassword);

    // Verify basic crypto integrity: decrypt with the same key
    const decryptedBytes = CryptoJS.AES.decrypt(encrypted, MOCK_KEY);
    const decryptedPassword = decryptedBytes.toString(CryptoJS.enc.Utf8);
    expect(decryptedPassword).toBe(plainPassword);
  });

  it('should produce a base64 string', () => {
    const plainPassword = 'testBase64Output';
    const encrypted = encryptPassword(plainPassword);
    // Basic check for Base64: should not contain spaces and should be a string.
    // A more robust check might involve a regex or trying to decode it as Base64.
    expect(typeof encrypted).toBe('string');
    // CryptoJS AES.encrypt().toString() defaults to Base64.
    // A simple regex to check if it looks like Base64 (alphanumeric, +, /, =)
    const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
    expect(base64Regex.test(encrypted)).toBe(true);
  });
  
  it('should throw an error if encryption key is not defined', () => {
    // Temporarily delete the key from our mocked process.env for this test
    delete process.env.NEXT_PUBLIC_APP_SYMMETRIC_ENCRYPTION_KEY;
    
    const plainPassword = 'testpassword';
    
    // We need to re-import or ensure the module re-reads the modified process.env
    // For this structure, the getEncryptionKey function inside encryptPassword will read the updated process.env
    expect(() => encryptPassword(plainPassword)).toThrow('Encryption key is not defined.');
  });

  it('should encrypt different passwords to different ciphertexts', () => {
    const passwordA = 'password123';
    const passwordB = 'Password123'; // Different case

    const encryptedA = encryptPassword(passwordA);
    const encryptedB = encryptPassword(passwordB);

    expect(encryptedA).not.toBe(encryptedB);
  });

  it('should encrypt an empty string successfully', () => {
    const plainPassword = '';
    const encrypted = encryptPassword(plainPassword);
    expect(encrypted).toBeDefined();
    
    const decryptedBytes = CryptoJS.AES.decrypt(encrypted, MOCK_KEY);
    const decryptedPassword = decryptedBytes.toString(CryptoJS.enc.Utf8);
    expect(decryptedPassword).toBe(plainPassword);
  });
});
