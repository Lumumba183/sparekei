import { createRoot } from 'react-dom/client';
import { ClerkProvider } from '@clerk/clerk-react';
import './index.css';
import App from './App.tsx';
import { CLERK_PUBLISHABLE_KEY } from '@/lib/env';

// Proxy Clerk traffic through our own domain so session cookies are first-party
// (browsers/extensions that block third-party cookies would otherwise 401 every session check).
createRoot(document.getElementById('root')!).render(
  <ClerkProvider
    publishableKey={CLERK_PUBLISHABLE_KEY}
    proxyUrl="https://sparekei.com/__clerk"
    afterSignOutUrl="/"
  >
    <App />
  </ClerkProvider>
);
