import { createRoot } from 'react-dom/client';
import { ClerkProvider } from '@clerk/clerk-react';
import './index.css';
import App from './App.tsx';

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string;

createRoot(document.getElementById('root')!).render(
  <ClerkProvider publishableKey={clerkPubKey} afterSignOutUrl="/">
    <App />
  </ClerkProvider>
);
