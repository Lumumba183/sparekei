import { useState } from 'react';
import { useSignIn } from '@clerk/clerk-react';
import { Car, Loader2, Mail, Lock, AlertCircle } from 'lucide-react';

// Custom-flow sign in (no hosted iframe): full control, works everywhere.
export default function LoginPage() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [needPassword, setNeedPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || !signIn) return;
    setBusy(true); setError(null);
    try {
      const attempt = await signIn.create({ identifier: email });
      const pw = attempt.supportedFirstFactors?.find((f: any) => f.strategy === 'password');
      if (attempt.status === 'complete') {
        await setActive({ session: attempt.createdSessionId });
        window.location.href = '/dashboard';
        return;
      }
      if (pw) setNeedPassword(true);
      else setError('Password sign-in is not available for this account. Use Google or contact support.');
    } catch (err: any) {
      console.log('[authflow] signIn.create error:', err?.errors || err);
      setError(err?.errors?.[0]?.message || 'Sign-in failed. Check your email.');
    } finally { setBusy(false); }
  };

  const finish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || !signIn) return;
    setBusy(true); setError(null);
    try {
      const attempt = await signIn.attemptFirstFactor({ strategy: 'password', password });
      if (attempt.status === 'complete') {
        await setActive({ session: attempt.createdSessionId });
        window.location.href = '/dashboard';
      } else {
        setError('Additional verification required: ' + attempt.status);
      }
    } catch (err: any) {
      console.log('[authflow] password attempt error:', err?.errors || err);
      setError(err?.errors?.[0]?.message || 'Incorrect password.');
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen flex bg-background">
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 bg-gradient-to-br from-primary/10 via-background to-accent/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <Car className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-bold">Sparekei</span>
        </div>
        <div>
          <h2 className="text-3xl font-bold mb-4">Welcome Back to the Future of Automotive Intelligence</h2>
          <p className="text-muted-foreground">Connect, manage, and optimize every aspect of your automotive needs with AI-powered precision.</p>
        </div>
        <div className="flex gap-4">
          <div className="glass-card p-4 flex-1"><p className="text-2xl font-bold text-primary">12K+</p><p className="text-xs text-muted-foreground">Active Users</p></div>
          <div className="glass-card p-4 flex-1"><p className="text-2xl font-bold text-accent">99.9%</p><p className="text-xs text-muted-foreground">Uptime</p></div>
          <div className="glass-card p-4 flex-1"><p className="text-2xl font-bold text-success">4.9</p><p className="text-xs text-muted-foreground">App Rating</p></div>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="glass-card p-8">
            <h1 className="text-xl font-bold text-center">{needPassword ? 'Enter your password' : 'Sign in to Sparekei'}</h1>
            <p className="text-sm text-muted-foreground text-center mt-1 mb-6">
              {needPassword ? email : 'Welcome back! Sign in to continue'}
            </p>
            {error && (
              <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" /> {error}
              </div>
            )}
            <form onSubmit={needPassword ? finish : start} className="space-y-4">
              {!needPassword && (
                <div>
                  <label className="text-sm text-muted-foreground flex items-center gap-2 mb-1.5"><Mail className="h-4 w-4" /> Email address</label>
                  <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-background/60 px-4 py-3 text-white placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                    placeholder="you@example.com" />
                </div>
              )}
              {needPassword && (
                <div>
                  <label className="text-sm text-muted-foreground flex items-center gap-2 mb-1.5"><Lock className="h-4 w-4" /> Password</label>
                  <input type="password" required autoFocus value={password} onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-background/60 px-4 py-3 text-white placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                    placeholder="Your password" />
                </div>
              )}
              <button type="submit" disabled={busy}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-3 font-semibold text-white hover:opacity-90 disabled:opacity-50">
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                {needPassword ? 'Sign In' : 'Continue'}
              </button>
            </form>
            {!needPassword && (
              <p className="mt-6 text-center text-sm text-muted-foreground">
                No account? <a href="/register" className="text-primary hover:underline">Sign up</a>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
