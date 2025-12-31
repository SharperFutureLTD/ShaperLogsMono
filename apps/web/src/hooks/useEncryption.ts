'use client'

import { useAuth } from './useAuth';
import { encrypt as encryptUtil, decrypt as decryptUtil } from '@/lib/encryption';

export const useEncryption = () => {
  const { user } = useAuth();

  const encrypt = async (plaintext: string): Promise<string | null> => {
    if (!user) return null;
    return encryptUtil(plaintext, user.id);
  };

  const decrypt = async (ciphertext: string): Promise<string | null> => {
    if (!user) return null;
    return decryptUtil(ciphertext, user.id);
  };

  return {
    encrypt,
    decrypt,
  };
};
