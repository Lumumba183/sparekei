import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Car, Eye, EyeOff, ArrowRight, Mail, Lock, User, Building2, 
  Wrench, ShoppingBag, Truck, Factory, Shield, MapPin, ChevronLeft, CheckCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import type { UserRole } from '@/types';
import { cn } from '@/lib/utils';

const roles: { value: UserRole; label: string; icon: React.ElementType; desc: string }[] = [
  { value: 'owner', label: 'Vehicle Owner', icon: Car, desc: 'Manage vehicles, book services, buy parts' },
  { value: 'mechanic', label: 'Mechanic', icon: Wrench, desc: 'Accept jobs, manage earnings, grow business' },
  { value: 'vendor', label: 'Parts Vendor', icon: ShoppingBag, desc: 'Sell parts, manage inventory, storefront' },
  { value: 'wholesaler', label: 'Wholesaler', icon: Factory, desc: 'B2B distribution, bulk orders, RFQ' },
  { value: 'fleet_manager', label: 'Fleet Manager', icon: Truck, desc: 'Multi-vehicle fleet operations' },
  { value: 'admin', label: 'Administrator', icon: Shield, desc: 'Platform management and oversight' },
];

const steps = ['Account', 'Profile', 'Role'];

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register, isLoading } = useAuth();
  const [step, setStep] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', fullName: '', phone: '', city: '', role: 'owner' as UserRole });

  const update = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await register(form.email, form.password, form.fullName, form.role);
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 hero-gradient" />
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 70% 50%, hsl(38 95% 40%) 0%, transparent 60%)' }} />
        <div className="relative z-10 flex flex-col justify-center p-12 w-full">
          <h2 className="text-4xl font-bold mb-6">Join the <span className="gradient-text">Automotive Revolution</span></h2>
          <div className="space-y-4">
            {[
              'Digital Vehicle Passport with tamper-evident records',
              'AI-powered predictive maintenance alerts',
              'Alibaba-style marketplace with escrow protection',
              '24/7 emergency roadside assistance',
              'Fleet management with real-time telematics',
            ].map((feature, i) => (
              <div key={i} className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-success shrink-0" />
                <span className="text-sm">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-4 sm:p-8 overflow-y-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <Car className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold">Sparekei</span>
          </div>

          <div className="mb-6">
            <h1 className="text-2xl font-bold mb-1">Create Account</h1>
            <p className="text-muted-foreground text-sm">Step {step + 1} of {steps.length}: {steps[step]}</p>
          </div>

          {/* Progress */}
          <div className="flex gap-2 mb-6">
            {steps.map((_, i) => (
              <div key={i} className={cn("flex-1 h-1.5 rounded-full transition-colors", i <= step ? "bg-primary" : "bg-muted")} />
            ))}
          </div>

          <form onSubmit={handleSubmit}>
            {step === 0 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                <div className="space-y-2">
                  <Label>Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input type="email" placeholder="you@example.com" required value={form.email} onChange={e => update('email', e.target.value)} className="pl-10" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input type={showPassword ? 'text' : 'password'} placeholder="Min 8 characters" required value={form.password} onChange={e => update('password', e.target.value)} className="pl-10 pr-10" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <Button type="button" className="w-full gap-2" onClick={() => setStep(1)}>
                  Continue <ArrowRight className="w-4 h-4" />
                </Button>
              </motion.div>
            )}

            {step === 1 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input placeholder="John Doe" required value={form.fullName} onChange={e => update('fullName', e.target.value)} className="pl-10" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Phone Number</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input placeholder="+254 712 345 678" value={form.phone} onChange={e => update('phone', e.target.value)} className="pl-10" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>City</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input placeholder="Nairobi" value={form.city} onChange={e => update('city', e.target.value)} className="pl-10" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" className="flex-1 gap-2" onClick={() => setStep(0)}>
                    <ChevronLeft className="w-4 h-4" /> Back
                  </Button>
                  <Button type="button" className="flex-1 gap-2" onClick={() => setStep(2)}>
                    Continue <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                <Label>Select Your Role</Label>
                <div className="grid gap-3">
                  {roles.map(r => (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => update('role', r.value)}
                      className={cn(
                        "flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all",
                        form.role === r.value ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
                      )}
                    >
                      <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", form.role === r.value ? "bg-primary text-white" : "bg-muted")}>
                        <r.icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{r.label}</p>
                        <p className="text-xs text-muted-foreground">{r.desc}</p>
                      </div>
                      {form.role === r.value && <CheckCircle className="w-5 h-5 text-primary shrink-0" />}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2 pt-2">
                  <Button type="button" variant="outline" className="flex-1 gap-2" onClick={() => setStep(1)}>
                    <ChevronLeft className="w-4 h-4" /> Back
                  </Button>
                  <Button type="submit" className="flex-1 gap-2" disabled={isLoading}>
                    {isLoading ? 'Creating...' : <>Create Account <ArrowRight className="w-4 h-4" /></>}
                  </Button>
                </div>
              </motion.div>
            )}
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <button onClick={() => navigate('/login')} className="text-primary font-medium hover:underline">Sign in</button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
