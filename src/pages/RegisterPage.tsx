import { useState } from 'react';
import { useSignUp } from '@clerk/clerk-react';
import { Car, Wrench, Package, Building2, ShoppingBag, Loader2, AlertCircle, Check } from 'lucide-react';

// Role-aware onboarding: How will you use Sparekei? -> identity -> verify -> routed destination.
// Role selection is a declaration, not authorization (backend remains authoritative).
const PATHS = [
  { key: 'owner',      db: 'owner',         icon: Car,         label: 'Vehicle Owner',            desc: 'Manage vehicles, passport, bookings' },
  { key: 'mechanic',   db: 'mechanic',      icon: Wrench,      label: 'Mechanic / Service Provider', desc: 'Jobs, availability, work evidence' },
  { key: 'vendor',     db: 'vendor',        icon: Package,     label: 'Parts Vendor',             desc: 'Inventory, enquiries, orders' },
  { key: 'fleet',      db: 'fleet_manager', icon: Building2,   label: 'Fleet / Business',         desc: 'Vehicles, utilization, maintenance' },
  { key: 'buyer',      db: 'owner',         icon: ShoppingBag, label: 'Marketplace Buyer',        desc: 'Browse and buy parts or services' },
] as const;

export default function RegisterPage() {
  const { signUp, setActive, isLoaded } = useSignUp();
  const [step, setStep] = useState<0 | 1>(0);
  const [path, setPath] = useState<(typeof PATHS)[number] | null>(null);
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || !signUp || !path) return;
    setBusy(true); setError(null);
    try {
      await signUp.create({
        firstName: form.firstName, lastName: form.lastName,
        emailAddress: form.email, password: form.password,
        unsafeMetadata: { role: path.db, intendedUse: path.key },
      });
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      const code = window.prompt('Enter the 6-digit code sent to ' + form.email);
      if (code) {
        const attempt = await signUp.attemptEmailAddressVerification({ code });
        if (attempt.status === 'complete') {
          await setActive({ session: attempt.createdSessionId });
          window.location.href = path.key === 'buyer' ? '/marketplace' : '/dashboard';
        }
      }
    } catch (err: any) {
      console.log('[authflow] signUp error:', err?.errors || err);
      setError(err?.errors?.[0]?.message || 'Sign-up failed.');
    } finally { setBusy(false); }
  };

  const inputCls = 'w-full rounded-lg border border-white/10 bg-background/60 px-4 py-3 text-white focus:border-primary focus:outline-none';

  return (
    <div className='min-h-screen flex bg-background'>
      <div className='hidden lg:flex lg:w-1/2 flex-col justify-between p-12 bg-gradient-to-br from-primary/10 via-background to-accent/5'>
        <div className='flex items-center gap-3'>
          <img src='/sparekei-crest.png' alt='Sparekei' className='w-10 h-10 rounded-full ring-1 ring-primary/40' />
          <span className='text-2xl font-bold'>Sparekei</span>
        </div>
        <div>
          <h2 className='text-3xl font-bold mb-4'>Join Africa&apos;s #1 Automotive Intelligence Platform</h2>
          <p className='text-muted-foreground'>One account. Your role. Your dashboard.</p>
        </div>
        <div className='flex gap-4'>
          <div className='glass-card p-4 flex-1'><p className='text-2xl font-bold text-primary'>90-day</p><p className='text-xs text-muted-foreground'>Free trial</p></div>
          <div className='glass-card p-4 flex-1'><p className='text-2xl font-bold text-accent'>8</p><p className='text-xs text-muted-foreground'>User roles</p></div>
          <div className='glass-card p-4 flex-1'><p className='text-2xl font-bold text-success'>Escrow</p><p className='text-xs text-muted-foreground'>Protected</p></div>
        </div>
      </div>
      <div className='flex-1 flex items-center justify-center p-6'>
        <div className='w-full max-w-md'>
          <div className='glass-card p-8'>
            {step === 0 ? (
              <>
                <h1 className='text-xl font-bold text-center'>How will you use Sparekei?</h1>
                <p className='text-sm text-muted-foreground text-center mt-1 mb-6'>Choose your path - you can add more later</p>
                <div className='space-y-3'>
                  {PATHS.map((p) => (
                    <button key={p.key} type='button' onClick={() => { setPath(p); setStep(1); }}
                      className='w-full flex items-center gap-4 rounded-xl border border-white/10 p-4 text-left transition hover:border-primary/50'>
                      <span className='flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary shrink-0'><p.icon className='h-5 w-5' /></span>
                      <span className='flex-1'>
                        <span className='block font-medium text-white'>{p.label}</span>
                        <span className='block text-xs text-muted-foreground'>{p.desc}</span>
                      </span>
                      <Check className='h-4 w-4 text-transparent' />
                    </button>
                  ))}
                </div>
                <p className='mt-6 text-center text-sm text-muted-foreground'>
                  Have an account? <a href='/login' className='text-primary hover:underline'>Sign in</a>
                </p>
              </>
            ) : (
              <>
                <button type='button' onClick={() => setStep(0)} className='text-xs text-muted-foreground hover:text-white mb-2'>&larr; Change path</button>
                <h1 className='text-xl font-bold text-center'>Create your {path?.label} account</h1>
                <p className='text-sm text-muted-foreground text-center mt-1 mb-6'>{path?.desc}</p>
                {error && (
                  <div className='mb-4 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-300'>
                    <AlertCircle className='h-4 w-4 mt-0.5 shrink-0' /> {error}
                  </div>
                )}
                <form onSubmit={submit} className='space-y-4'>
                  <div className='grid grid-cols-2 gap-4'>
                    <div><label className='text-sm text-muted-foreground mb-1.5 block'>First name</label>
                      <input required value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} className={inputCls} /></div>
                    <div><label className='text-sm text-muted-foreground mb-1.5 block'>Last name</label>
                      <input required value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} className={inputCls} /></div>
                  </div>
                  <div><label className='text-sm text-muted-foreground mb-1.5 block'>Email address</label>
                    <input type='email' required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputCls} /></div>
                  <div><label className='text-sm text-muted-foreground mb-1.5 block'>Password</label>
                    <input type='password' required minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className={inputCls} /></div>
                  <button type='submit' disabled={busy}
                    className='w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-3 font-semibold text-white hover:opacity-90 disabled:opacity-50'>
                    {busy && <Loader2 className='h-4 w-4 animate-spin' />} Continue
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}