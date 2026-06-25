import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Car, Eye, EyeOff, ArrowRight, Mail, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/hooks/useAuth';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, isLoading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await login(email, password);
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 hero-gradient" />
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 30% 50%, hsl(210 100% 40%) 0%, transparent 60%)' }} />
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
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
            <div className="glass-card p-4 flex-1">
              <p className="text-2xl font-bold text-primary">12K+</p>
              <p className="text-xs text-muted-foreground">Active Users</p>
            </div>
            <div className="glass-card p-4 flex-1">
              <p className="text-2xl font-bold text-accent">99.9%</p>
              <p className="text-xs text-muted-foreground">Uptime</p>
            </div>
            <div className="glass-card p-4 flex-1">
              <p className="text-2xl font-bold text-success">4.9</p>
              <p className="text-xs text-muted-foreground">App Rating</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <Car className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold">Sparekei</span>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold mb-2">Sign In</h1>
            <p className="text-muted-foreground text-sm">Enter your credentials to access your dashboard.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  id="email" type="email" placeholder="you@example.com" required
                  value={email} onChange={e => setEmail(e.target.value)}
                  className="pl-10" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  id="password" type={showPassword ? 'text' : 'password'} placeholder="Enter your password" required
                  value={password} onChange={e => setPassword(e.target.value)}
                  className="pl-10 pr-10" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox id="remember" />
                <label htmlFor="remember" className="text-sm text-muted-foreground cursor-pointer">Remember me</label>
              </div>
              <button type="button" className="text-sm text-primary hover:underline">Forgot password?</button>
            </div>

            <Button type="submit" className="w-full gap-2" size="lg" disabled={isLoading}>
              {isLoading ? 'Signing in...' : <>Sign In <ArrowRight className="w-4 h-4" /></>}
            </Button>
          </form>

          <div className="mt-8 pt-6 border-t border-border text-center">
            <p className="text-sm text-muted-foreground">
              Don't have an account?{' '}
              <button onClick={() => navigate('/register')} className="text-primary font-medium hover:underline">
                Create account
              </button>
            </p>
          </div>

          <div className="mt-6 flex items-center gap-4">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">Quick Access</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            {['Owner', 'Mechanic', 'Admin'].map(role => (
              <Button key={role} variant="outline" size="sm" onClick={() => { login(role.toLowerCase() + '@demo.com', 'demo'); navigate('/dashboard'); }}>
                {role}
              </Button>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
