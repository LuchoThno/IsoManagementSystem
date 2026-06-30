import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ClerkProvider } from '@clerk/clerk-react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App.tsx';
import './index.css';
import {
  clerkAfterSignInUrl,
  clerkAfterSignUpUrl,
  clerkDomain,
  clerkIsSatellite,
  clerkPublishableKey,
  clerkSignInUrl,
  clerkSignUpUrl,
} from './lib/clerk';

const queryClient = new QueryClient();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
  <ClerkProvider
    publishableKey={clerkPublishableKey}
    __internal_bypassMissingPublishableKey
    signInFallbackRedirectUrl={clerkAfterSignInUrl}
    signUpFallbackRedirectUrl={clerkAfterSignUpUrl}
    signInUrl={clerkSignInUrl}
    signUpUrl={clerkSignUpUrl}
    domain={clerkIsSatellite ? clerkDomain : undefined}
    isSatellite={clerkIsSatellite}
    afterSignOutUrl="/login"
  >
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </ClerkProvider>
  </StrictMode>
);
