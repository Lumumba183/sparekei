import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Car, Shield, BrainCircuit, Siren, ShoppingCart, Wrench,
  ChevronRight, Star, Users, Globe, Zap,
  CheckCircle, ArrowRight, Menu, X, Activity
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

const fadeInUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.6, ease: 'easeOut' as const } }),
};

const features = [
  { icon: Car, title: 'Digital Vehicle Passport', desc: 'Complete tamper-evident vehicle identity ledger with service history, compliance tracking, and resale valuation.', color: 'from-blue-500 to-cyan-500' },
  { icon: BrainCircuit, title: 'AI-Powered Intelligence', desc: 'Gemini 2.5 Flash integration for predictive maintenance, fraud detection, mechanic scoring, and market analysis.', color: 'from-purple-500 to-pink-500' },
  { icon: Siren, title: 'Emergency Dispatch', desc: '24/7 roadside assistance with real-time responder tracking, live ETA, and intelligent job routing.', color: 'from-red-500 to-orange-500' },
  { icon: ShoppingCart, title: 'Marketplace & Escrow', desc: 'Alibaba-style marketplace for parts and services with milestone-based escrow protection for every transaction.', color: 'from-emerald-500 to-teal-500' },
  { icon: Wrench, title: 'Universal Service Nodes', desc: '4-class service taxonomy from cosmetic care to enterprise workshops with bay management and hybrid cart.', color: 'from-amber-500 to-yellow-500' },
  { icon: Shield, title: 'Fleet Management', desc: 'Multi-vehicle command center with telematics, risk scoring, compliance tracking, and predictive alerts.', color: 'from-indigo-500 to-violet-500' },
];

const stats = [
  { icon: Users, value: '12,000+', label: 'Active Users', trend: '+28% this month' },
  { icon: Car, value: '8,500+', label: 'Vehicles Managed', trend: '+32% this month' },
  { icon: Wrench, value: '520+', label: 'Service Providers', trend: '+18% this month' },
  { icon: ShoppingCart, value: '45K+', label: 'Transactions', trend: '+45% this month' },
];

const testimonials = [
  { name: 'James Kimani', role: 'Vehicle Owner, Nairobi', avatar: 'https://i.pravatar.cc/150?u=james', text: 'Sparekei transformed how I manage my fleet. The predictive alerts alone have saved me thousands in preventable repairs.', rating: 5 },
  { name: 'Sarah Ochieng', role: 'Parts Vendor', avatar: 'https://i.pravatar.cc/150?u=sarah', text: 'The marketplace and escrow system gives my customers confidence. My sales have doubled since joining the platform.', rating: 5 },
  { name: 'David Mwangi', role: 'Master Mechanic', avatar: 'https://i.pravatar.cc/150?u=david', text: 'The AI scoring and job management tools are incredible. I earn more and work smarter with Sparekei.', rating: 5 },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        scrolled ? "bg-background/90 backdrop-blur-xl border-b border-border/50 shadow-lg" : "bg-transparent"
      )}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
                <Car className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold">Sparekei</span>
            </div>
            
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a>
              <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">How It Works</a>
              <a href="#testimonials" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Testimonials</a>
              <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>Sign In</Button>
              <Button size="sm" onClick={() => navigate('/register')}>Get Started</Button>
            </div>

            <button className="md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden bg-card border-b border-border p-4 space-y-3">
            <a href="#features" className="block text-sm py-2" onClick={() => setMobileMenuOpen(false)}>Features</a>
            <a href="#how-it-works" className="block text-sm py-2" onClick={() => setMobileMenuOpen(false)}>How It Works</a>
            <a href="#testimonials" className="block text-sm py-2" onClick={() => setMobileMenuOpen(false)}>Testimonials</a>
            <Button className="w-full" onClick={() => navigate('/login')}>Sign In</Button>
            <Button className="w-full" variant="default" onClick={() => navigate('/register')}>Get Started</Button>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center pt-16 overflow-hidden">
        <div className="absolute inset-0 hero-gradient" />
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, hsl(210 100% 30% / 0.15) 0%, transparent 50%)' }} />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.1 } } }}>
              <motion.div variants={fadeInUp} custom={0} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-6">
                <Zap className="w-4 h-4" />
                Africa's #1 Automotive Intelligence Platform
              </motion.div>
              
              <motion.h1 variants={fadeInUp} custom={1} className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6">
                The Complete <span className="gradient-text">Automotive</span> Intelligence Ecosystem
              </motion.h1>
              
              <motion.p variants={fadeInUp} custom={2} className="text-lg text-muted-foreground mb-8 max-w-lg">
                Connect with mechanics, buy spare parts, manage your fleet, and access emergency services — all powered by AI and protected by escrow.
              </motion.p>
              
              <motion.div variants={fadeInUp} custom={3} className="flex flex-wrap gap-4 mb-10">
                <Button size="lg" className="gap-2" onClick={() => navigate('/register')}>
                  Get Started Free <ArrowRight className="w-4 h-4" />
                </Button>
                <Button size="lg" variant="outline" className="gap-2" onClick={() => navigate('/login')}>
                  Sign In to Platform
                </Button>
              </motion.div>

              <motion.div variants={fadeInUp} custom={4} className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5"><CheckCircle className="w-4 h-4 text-success" /> Free 90-day trial</span>
                <span className="flex items-center gap-1.5"><CheckCircle className="w-4 h-4 text-success" /> No credit card</span>
                <span className="flex items-center gap-1.5"><CheckCircle className="w-4 h-4 text-success" /> 12 user roles</span>
              </motion.div>
            </motion.div>

            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3, duration: 0.8 }} className="relative hidden lg:block">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-border/50 glow-primary">
                <img src="/hero-main.jpg" alt="Sparekei Platform" className="w-full h-auto object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
                
                {/* Floating Stats Cards */}
                <motion.div 
                  initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1 }}
                  className="absolute bottom-20 left-4 glass-card p-3 flex items-center gap-3"
                >
                  <div className="w-10 h-10 rounded-lg bg-success/20 flex items-center justify-center">
                    <Activity className="w-5 h-5 text-success" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">92% Health</p>
                    <p className="text-xs text-muted-foreground">Vehicle Score</p>
                  </div>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1.2 }}
                  className="absolute top-8 right-4 glass-card p-3 flex items-center gap-3"
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Escrow Protected</p>
                    <p className="text-xs text-muted-foreground">All Transactions</p>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-muted-foreground"
        >
          <span className="text-xs">Scroll to explore</span>
          <motion.div animate={{ y: [0, 8, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}>
            <ChevronRight className="w-4 h-4 rotate-90" />
          </motion.div>
        </motion.div>
      </section>

      {/* Stats Section */}
      <section className="py-20 border-y border-border/50 bg-card/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            {stats.map((stat, i) => (
              <motion.div 
                key={stat.label}
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className="text-center"
              >
                <stat.icon className="w-6 h-6 mx-auto mb-3 text-primary" />
                <p className="text-2xl lg:text-3xl font-bold">{stat.value}</p>
                <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
                <p className="text-xs text-success mt-0.5">{stat.trend}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">Everything You Need for <span className="gradient-text">Automotive Excellence</span></h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">A comprehensive platform connecting every stakeholder in the automotive ecosystem with AI-powered intelligence.</p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className="glass-card-hover p-6 group cursor-pointer"
              >
                <div className={cn("w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center mb-4 group-hover:scale-110 transition-transform", feature.color)}>
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 bg-card/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">How <span className="gradient-text">Sparekei</span> Works</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">Get started in minutes with our streamlined onboarding process.</p>
          </motion.div>

          <div className="grid md:grid-cols-4 gap-8">
            {[
              { step: '01', title: 'Create Account', desc: 'Sign up and select your role — vehicle owner, mechanic, vendor, or fleet manager.', icon: Users },
              { step: '02', title: 'Add Vehicle(s)', desc: 'Register your vehicles with VIN for automatic compliance and maintenance tracking.', icon: Car },
              { step: '03', title: 'Connect & Transact', desc: 'Browse the marketplace, book services, or manage your automotive business.', icon: Globe },
              { step: '04', title: 'AI Intelligence', desc: 'Receive predictive alerts, market insights, and AI-powered recommendations.', icon: BrainCircuit },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.15 }}
                className="relative text-center"
              >
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <item.icon className="w-8 h-8 text-primary" />
                </div>
                <span className="text-xs font-bold text-primary mb-2 block">{item.step}</span>
                <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">Trusted by <span className="gradient-text">Thousands</span></h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">See what our users say about their Sparekei experience.</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className="glass-card p-6"
              >
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: t.rating }).map((_, j) => (
                    <Star key={j} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground mb-4 leading-relaxed">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <img src={t.avatar} alt={t.name} className="w-10 h-10 rounded-full" />
                  <div>
                    <p className="text-sm font-medium">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-card/30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          >
            <h2 className="text-3xl lg:text-5xl font-bold mb-6">Ready to Transform Your <span className="gradient-text">Automotive Experience</span>?</h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Join 12,000+ users across Africa who trust Sparekei for vehicle management, parts procurement, and emergency services.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button size="lg" className="gap-2" onClick={() => navigate('/register')}>
                Get Started Free <ArrowRight className="w-4 h-4" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate('/login')}>
                Sign In
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-4">90-day free trial • No credit card required • Cancel anytime</p>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                  <Car className="w-4 h-4 text-white" />
                </div>
                <span className="text-lg font-bold">Sparekei</span>
              </div>
              <p className="text-sm text-muted-foreground">Africa's most intelligent automotive platform connecting vehicle owners, mechanics, vendors, and fleet operators.</p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Platform</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">Marketplace</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Emergency Services</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Fleet Management</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">AI Concierge</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">About Us</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Press</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Terms of Service</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Cookie Policy</a></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-border/50 flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-xs text-muted-foreground"> 2026 Sparekei. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <Globe className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Proudly built for Africa</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
