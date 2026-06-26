import { isClerkEnabled } from './clerk';

type ClerkTokenProvider = () => Promise<string | null>;

let tokenProvider: ClerkTokenProvider | null = null;

export const registerClerkTokenProvider = (provider: ClerkTokenProvider | null) => {
  tokenProvider = provider;
};

export const getClerkSessionToken = async () => {
  if (!isClerkEnabled || !tokenProvider) {
    return null;
  }

  return tokenProvider();
};
