import { useState } from 'react';
import { useSignUp } from '@clerk/clerk-react';
import { Car, Loader2, AlertCircle } from 'lucide-react';

// Custom-flow sign up (no hosted iframe).
export default function RegisterPage() {
  const { signUp, setActive, isLoaded } = useSignUp();
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || !signUp) return;
    setBusy(true); setError(null);
    try {
      await signUp.create({
        firstName: form.firstName, lastName: form.lastName,
        emailAddress: form.email, password: form.password,
      });
      // Send email verification code
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setError('Check your email for the verification code, then confirm it on the next step.');
      // Simple inline verify step:
      const code = window.prompt('Enter the 6-digit code sent to ' + form.email);
      if (code) {
        const attempt = await signUp.attemptEmailAddressVerification({ code });
        if (attempt.status === 'complete') {
          await setActive({ session: attempt.createdSessionId });
          window.location.href = '/dashboard';
        }
      }
    } catch (err: any) {
      console.log('[authflow] signUp error:', err?.errors || err);
      setError(err?.errors?.[0]?.message || 'Sign-up failed.');
    } finally { setBusy(false); }
  };

  const field = (k: keyof typeof form, label: string, type = 'text') => (
    <div>
      <label className="text-sm text-muted-foreground mb-1.5 block">{label}</label>
      <input type={type} required value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })}
        className="w-full rounded-lg border border-white/10 bg-background/60 px-4 py-3 text-white focus:border-primary focus:outline-none" />
    </div>
  );

  return (
    <div className="min-h-screen flex bg-background">
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 bg-gradient-to-br from-primary/10 via-background to-accent/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center"><Car className="w-6 h-6 text-white" /></div>
          <span className="text-2xl font-bold">Sparekei</span>
        </div>
        <div>
          <h2 className="text-3xl font-bold mb-4">Join Africa&apos;s #1 Automotive Intelligence Platform</h2>
          <p className="text-muted-foreground">Owner, mechanic, vendor, or fleet manager — one account, your role, your dashboard.</p>
        </div>
        <div className="flex gap-4">
          <div className="glass-card p-4 flex-1"><p className="text-2xl font-bold text-primary">90-day</p><p className="text-xs text-muted-foreground">Free trial</p></div>
          <div className="glass-card p-4 flex-1"><p className="text-2xl font-bold text-accent">8</p><p className="text-xs text-muted-foreground">User roles</p></div>
          <div className="glass-card p-4 flex-1"><p className="text-2xl font-bold text-success">Escrow</p><p className="text-xs text-muted-foreground">Protected</p></div>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="glass-card p-8">
            <h1 className="text-xl font-bold text-center">Create your account</h1>
            <p className="text-sm text-muted-foreground text-center mt-1 mb-6">Sign up to get started</p>
            {error && (
              <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-300">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" /> {error}
              </div>
            )}
            <form onSubmit={submit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {field('firstName', 'First name')}
                {field('lastName', 'Last name')}
              </div>
              {field('email', 'Email address', 'email')}
              {field('password', 'Password', 'password')}
              <button type="submit" disabled={busy}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-3 font-semibold text-white hover:opacity-90 disabled:opacity-50">
                {busy && <Loader2 className="h-4 w-4 animate-spin" />} Continue
              </button>
            </form>
            <p className="mt-6 text-center text-sm text-muted-foreground">
              Have an account? <a href="/login" className="text-primary hover:underline">Sign in</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
