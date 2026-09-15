import { SignIn } from '@clerk/clerk-react';
import { Car } from 'lucide-react';

export default function LoginPage() {
  return (
    <div className="min-h-screen flex bg-background">
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden flex-col justify-between p-12 bg-gradient-to-br from-primary/10 via-background to-accent/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <Car className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-bold">Sparekei</span>
        </div>
        <div>
          <h2 className="text-3xl font-bold mb-4">Welcome Back to the Future of Automotive Intelligence</h2>
          <p className="text-muted-foreground">
            Connect, manage, and optimize every aspect of your automotive needs with AI-powered precision.
          </p>
        </div>
        <div className="flex gap-4">
          <div className="glass-card p-4 flex-1"><p className="text-2xl font-bold text-primary">12K+</p><p className="text-xs text-muted-foreground">Active Users</p></div>
          <div className="glass-card p-4 flex-1"><p className="text-2xl font-bold text-accent">99.9%</p><p className="text-xs text-muted-foreground">Uptime</p></div>
          <div className="glass-card p-4 flex-1"><p className="text-2xl font-bold text-success">4.9</p><p className="text-xs text-muted-foreground">App Rating</p></div>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center p-6">
        <SignIn
          routing="path"
          path="/login"
          signUpUrl="/register"
          fallbackRedirectUrl="/dashboard"
          appearance={{
            variables: { colorPrimary: '#3b82f6', colorBackground: '#0a0f1a', colorInputBackground: '#101827', colorInputText: '#e5e7eb', colorText: '#e5e7eb', colorTextSecondary: '#9ca3af' },
            elements: { card: 'shadow-2xl border border-white/10' },
          }}
        />
      </div>
    </div>
  );
}
