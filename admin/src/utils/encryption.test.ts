import { encryptPassword } from './encryption';
import CryptoJS from 'crypto-js';

describe('Encryption Utility (Admin Panel)', () => {
  const MOCK_KEY = 'testadminmockkey98765432109876543210'; // Example key

  // Store original import.meta.env
  const originalImportMetaEnv = import.meta.env;

  beforeEach(() => {
    // Mock import.meta.env
    // @ts-ignore - We are intentionally modifying import.meta.env for tests
    import.meta.env = {
      ...originalImportMetaEnv,
      VITE_APP_SYMMETRIC_ENCRYPTION_KEY: MOCK_KEY,
    };
  });

  afterEach(() => {
    // Restore original import.meta.env
    // @ts-ignore
    import.meta.env = originalImportMetaEnv;
    // It's good practice to reset modules if they cache environment variables,
    // but for this simple case, direct manipulation of import.meta.env
    // (when possible in test environment like Vitest/Jest with proper setup) is shown.
    // If issues arise, module reset (jest.resetModules()) might be needed.
  });

  it('should encrypt a password successfully', () => {
    const plainPassword = 'myAdminSecretPassword';
    const encrypted = encryptPassword(plainPassword);

    expect(encrypted).toBeDefined();
    expect(encrypted).not.toBe(plainPassword);

    // Verify basic crypto integrity: decrypt with the same key
    const decryptedBytes = CryptoJS.AES.decrypt(encrypted, MOCK_KEY);
    const decryptedPassword = decryptedBytes.toString(CryptoJS.enc.Utf8);
    expect(decryptedPassword).toBe(plainPassword);
  });

  it('should produce a base64 string', () => {
    const plainPassword = 'testAdminBase64Output';
    const encrypted = encryptPassword(plainPassword);
    expect(typeof encrypted).toBe('string');
    const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
    expect(base64Regex.test(encrypted)).toBe(true);
  });
  
  it('should throw an error if encryption key is not defined', () => {
    // @ts-ignore
    delete import.meta.env.VITE_APP_SYMMETRIC_ENCRYPTION_KEY;
    
    const plainPassword = 'testAdminPassword';
    
    expect(() => encryptPassword(plainPassword)).toThrow('Encryption key is not defined.');
  });

  it('should encrypt different passwords to different ciphertexts', () => {
    const passwordA = 'adminPass123';
    const passwordB = 'AdminPass123'; // Different case

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
