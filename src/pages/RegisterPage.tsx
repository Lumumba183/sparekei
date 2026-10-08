import { useEffect, useState } from 'react';
import { useSignUp } from '@clerk/clerk-react';
import { Car, Building2, Wrench, Package, Truck, ShieldCheck, Landmark, ShoppingBag, Loader2, AlertCircle, ArrowLeft, RefreshCw } from 'lucide-react';

const SPECIALISTS = [
  'Mechanical', 'Diagnostic / Electrical', 'Tyre / Wheel', 'Body / Restoration',
  'Aesthetics / Detailing', 'Audio / Accessories', 'Tracker / Security Installer',
  'Fabrication', 'Inspection / Assessment', 'Recovery / Towing',
];

const FAMILIES: any[] = [
  { key: 'vehicle',    phrase: 'I own or use vehicles',                 db: 'owner',         icon: Car,        roles: null },
  { key: 'fleet',      phrase: 'I operate vehicles (Fleet / Business)', db: 'fleet_manager', icon: Building2,  roles: null },
  { key: 'services',   phrase: 'I provide automotive services',         db: 'mechanic',      icon: Wrench,     roles: [
    { key: 'mechanic',   label: 'Mechanic / Garage / Workshop' },
    { key: 'tyre',       label: 'Tyre Centre' },
    { key: 'aesthetics', label: 'Aesthetics / Detailing' },
    { key: 'specialist', label: 'Specialist Workshop (choose class)', specialist: true },
    { key: 'recovery',   label: 'Recovery / Roadside Provider' },
  ] },
  { key: 'supply',     phrase: 'I sell or supply automotive products',  db: 'vendor',        icon: Package,    roles: [
    { key: 'vendor',       label: 'Parts Vendor / Dealer' },
    { key: 'wholesaler',   label: 'Wholesaler / Distributor' },
    { key: 'manufacturer', label: 'Manufacturer / OEM' },
  ] },
  { key: 'logistics',  phrase: 'I provide logistics or recovery',       db: 'service_node',  icon: Truck,      roles: [
    { key: 'courier',    label: 'Courier / Logistics Provider' },
    { key: 'recovery_p', label: 'Recovery / Towing Provider' },
  ] },
  { key: 'insurance',  phrase: 'I work in insurance or assessment',     db: 'owner',         icon: ShieldCheck,roles: [
    { key: 'insurer',  label: 'Insurance Provider' },
    { key: 'assessor', label: 'Insurance Assessor' },
  ] },
  { key: 'government', phrase: 'I represent government / compliance',   db: 'owner',         icon: Landmark,   roles: [
    { key: 'gov', label: 'Government / Regulatory Entity' },
  ] },
  { key: 'marketplace',phrase: 'I want to buy parts or services',       db: 'owner',         icon: ShoppingBag,roles: null },
];

export default function RegisterPage() {
  const { signUp, setActive, isLoaded } = useSignUp();
  const [step, setStep] = useState(0);
  const [fam, setFam] = useState<any>(null);
  const [role, setRole] = useState<any>(null);
  const [specialist, setSpecialist] = useState('');
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '' });
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const s: any = signUp;
    if (isLoaded && s && s.status && s.emailAddress) {
      setForm((f) => ({ ...f, email: s.emailAddress }));
      setStep(3);
      setNotice('Welcome back - finish verifying your email to complete signup.');
    }
  }, [isLoaded, signUp]);

  const submitIdentity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || !signUp || !fam) return;
    setBusy(true); setError(null);
    try {
      await signUp.create({
        firstName: form.firstName, lastName: form.lastName,
        emailAddress: form.email, password: form.password,
        unsafeMetadata: { family: fam.key, role: role?.key ?? fam.key, specialist: specialist || null, dbRole: fam.db },
      });
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setStep(3); setNotice('Verification code sent to ' + form.email);
    } catch (err: any) {
      console.log('[authflow] signUp.create error:', err?.errors || err);
      const c0 = err?.errors?.[0]?.code;
      if (c0 === 'form_identifier_exists' || c0 === 'identifier_already_exists') {
        try { await signUp.prepareEmailAddressVerification({ strategy: 'email_code' }); } catch {}
        setStep(3); setNotice('This email has a pending signup - a new code was sent to ' + form.email);
      } else { setError(err?.errors?.[0]?.message || 'Sign-up failed.'); }
    } finally { setBusy(false); }
  };

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || !signUp) return;
    setBusy(true); setError(null);
    try {
      const attempt = await signUp.attemptEmailAddressVerification({ code });
      if (attempt.status === 'complete') {
        await setActive({ session: attempt.createdSessionId });
        window.location.href = fam?.key === 'marketplace' ? '/marketplace' : '/dashboard';
      }
    } catch (err: any) {
      console.log('[authflow] verify error:', err?.errors || err);
      setError(err?.errors?.[0]?.message || 'Invalid or expired code.');
    } finally { setBusy(false); }
  };

  const resend = async () => {
    if (!signUp) return; setBusy(true);
    try { await signUp.prepareEmailAddressVerification({ strategy: 'email_code' }); setNotice('A new code was sent.'); }
    catch (err: any) { setError(err?.errors?.[0]?.message || 'Could not resend.'); }
    finally { setBusy(false); }
  };

  const inputCls = 'w-full rounded-lg border border-white/10 bg-background/60 px-4 py-3 text-white focus:border-primary focus:outline-none';
  const famBtn = 'w-full flex items-center gap-4 rounded-xl border border-white/10 p-4 text-left transition hover:border-primary/50';

  return (
    <div className='min-h-screen flex bg-background'>
      <div className='hidden lg:flex lg:w-1/2 flex-col justify-between p-12 bg-gradient-to-br from-primary/10 via-background to-accent/5'>
        <div className='flex items-center gap-3'>
          <img src='/sparekei-crest.png' alt='Sparekei' className='w-10 h-10 rounded-full ring-1 ring-primary/40' />
          <span className='text-2xl font-bold'>Sparekei</span>
        </div>
        <div>
          <h2 className='text-3xl font-bold mb-4'>Join Africa&apos;s #1 Automotive Intelligence Platform</h2>
          <p className='text-muted-foreground'>One platform. Your stakeholder experience.</p>
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
            {notice && !error && (<div className='mb-4 rounded-lg border border-teal-500/30 bg-teal-500/10 p-3 text-sm text-teal-300'>{notice}</div>)}
            {error && (<div className='mb-4 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-300'><AlertCircle className='h-4 w-4 mt-0.5 shrink-0' /> {error}</div>)}
            {step === 0 && (<>
                <h1 className='text-xl font-bold text-center'>How will you use Sparekei?</h1>
                <p className='text-sm text-muted-foreground text-center mt-1 mb-6'>Choose the closest match - you can refine later</p>
                <div className='space-y-3'>
                  {FAMILIES.map((f) => (
                    <button key={f.key} type='button' onClick={() => { setFam(f); setRole(null); setStep(f.roles ? 1 : 2); }} className={famBtn}>
                      <span className='flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary shrink-0'><f.icon className='h-5 w-5' /></span>
                      <span className='flex-1 font-medium text-white'>{f.phrase}</span>
                    </button>
                  ))}
                </div>
                <p className='mt-6 text-center text-sm text-muted-foreground'>Have an account? <a href='/login' className='text-primary hover:underline'>Sign in</a></p>
              </>)}
            {step === 1 && fam && (<>
                <button type='button' onClick={() => setStep(0)} className='text-xs text-muted-foreground hover:text-white mb-2 flex items-center gap-1'><ArrowLeft className='h-3 w-3' /> All paths</button>
                <h1 className='text-xl font-bold text-center'>{fam.phrase}</h1>
                <p className='text-sm text-muted-foreground text-center mt-1 mb-6'>Choose your specific role</p>
                <div className='space-y-3'>
                  {fam.roles.map((r: any) => (
                    <button key={r.key} type='button' onClick={() => { setRole(r); if (!r.specialist) setStep(2); }} className={famBtn}>
                      <span className='flex-1 font-medium text-white'>{r.label}</span>
                    </button>
                  ))}
                </div>
                {role?.specialist && (<div className='mt-4 space-y-3'>
                    <div><label className='text-sm text-muted-foreground mb-1.5 block'>Specialist class</label>
                      <select value={specialist} onChange={(e) => setSpecialist(e.target.value)} className={inputCls}>
                        <option value=''>Select specialist class...</option>
                        {SPECIALISTS.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select></div>
                    <button type='button' disabled={!specialist} onClick={() => setStep(2)} className='w-full rounded-xl bg-primary py-3 font-semibold text-white hover:opacity-90 disabled:opacity-50'>Continue as {specialist}</button>
                  </div>)}
              </>)}
            {step === 2 && (<>
                <button type='button' onClick={() => setStep(fam?.roles ? 1 : 0)} className='text-xs text-muted-foreground hover:text-white mb-2 flex items-center gap-1'><ArrowLeft className='h-3 w-3' /> Back</button>
                <h1 className='text-xl font-bold text-center'>Create your account</h1>
                <p className='text-sm text-muted-foreground text-center mt-1 mb-6'>{fam?.phrase}{role ? ' - ' + role.label : ''}</p>
                <form onSubmit={submitIdentity} className='space-y-4'>
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
                  <button type='submit' disabled={busy} className='w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-3 font-semibold text-white hover:opacity-90 disabled:opacity-50'>{busy && <Loader2 className='h-4 w-4 animate-spin' />} Continue</button>
                </form>
              </>)}
            {step === 3 && (<>
                <h1 className='text-xl font-bold text-center'>Verify your email</h1>
                <p className='text-sm text-muted-foreground text-center mt-1 mb-6'>Enter the 6-digit code sent to {form.email || 'your email'}</p>
                <form onSubmit={verify} className='space-y-4'>
                  <input required inputMode='numeric' pattern='[0-9]{6}' maxLength={6} value={code} onChange={(e) => setCode(e.target.value)} className={inputCls + ' text-center text-2xl tracking-[0.5em]'} placeholder='------' />
                  <button type='submit' disabled={busy || code.length !== 6} className='w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-3 font-semibold text-white hover:opacity-90 disabled:opacity-50'>{busy && <Loader2 className='h-4 w-4 animate-spin' />} Complete signup</button>
                </form>
                <button type='button' onClick={resend} disabled={busy} className='mt-4 w-full flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-white'><RefreshCw className='h-4 w-4' /> Resend code</button>
                <p className='mt-4 text-center text-sm text-muted-foreground'>Wrong email? <button type='button' onClick={() => { setStep(2); setNotice(null); }} className='text-primary hover:underline'>Go back</button></p>
              </>)}
          </div>
        </div>
      </div>
    </div>
  );
}