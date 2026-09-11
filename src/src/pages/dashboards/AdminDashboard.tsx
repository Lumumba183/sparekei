import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Users, TrendingUp, Globe,
  Shield, Activity, MapPin, ChevronRight, ShoppingBag
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { adminMetrics, cities, revenueChartData, userGrowthData } from '@/data/mockData';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { cn } from '@/lib/utils';

export default function AdminDashboard() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Command Center</h1>
          <p className="text-muted-foreground text-sm">Platform overview and administration</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/users')}>
            <Users className="w-4 h-4 mr-2" /> Users
          </Button>
          <Button onClick={() => navigate('/admin')}>
            <Shield className="w-4 h-4 mr-2" /> Admin Tools
          </Button>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {adminMetrics.map((m, i) => (
          <motion.div key={m.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <Card className="glass-card-hover">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-5 h-5 text-primary"><m.icon /></div>
                  {m.trend && m.change !== undefined && (
                    <Badge variant="default" className="text-[10px]">+{m.change}%</Badge>
                  )}
                </div>
                <p className="text-2xl font-bold">{m.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{m.label}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="glass-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" /> Revenue Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={revenueChartData}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={v => `KSh ${(v/1000).toFixed(0)}K`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                  formatter={(value: number) => [`KSh ${value.toLocaleString()}`, 'Revenue']}
                />
                <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#revGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" /> User Growth
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={userGrowthData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                />
                <Bar dataKey="users" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="mechanics" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="vendors" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Cities Status */}
        <Card className="glass-card lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Globe className="w-4 h-4 text-primary" /> City Status
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/cities')}>
                View All <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {cities.map(city => (
              <div key={city.id} className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{city.name}, {city.country}</p>
                    <Badge className={cn("text-[10px]",
                      city.status === 'fully_operational' ? 'bg-success/20 text-success' :
                      city.status === 'operational' ? 'bg-primary/20 text-primary' :
                      city.status === 'recruiting' ? 'bg-warning/20 text-warning' :
                      'bg-muted text-muted-foreground'
                    )}>
                      {city.status.replace('_', ' ')}
                    </Badge>
                  </div>
                  <div className="flex gap-3 mt-0.5 text-xs text-muted-foreground">
                    <span>{city.mechanicsCount} mechanics</span>
                    <span>{city.garagesCount} garages</span>
                    <span>{city.vendorsCount} vendors</span>
                    <span>Demand: {city.demandScore}%</span>
                  </div>
                </div>
                <div className="text-right shrink-0 hidden sm:block">
                  <p className="text-xs text-muted-foreground">PPP</p>
                  <p className="text-sm font-medium">{city.pppMultiplier}x</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="glass-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Admin Tools</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              { label: 'User Management', icon: Users, desc: 'Manage all users', path: '/users', color: 'bg-primary/10 text-primary' },
              { label: 'Marketplace Moderation', icon: ShoppingBag, desc: 'Review listings', path: '/admin', color: 'bg-accent/10 text-accent' },
              { label: 'Fraud Detection', icon: Shield, desc: 'AI-powered scans', path: '/admin', color: 'bg-emergency/10 text-emergency' },
              { label: 'City Onboarding', icon: MapPin, desc: 'Expand to new cities', path: '/cities', color: 'bg-success/10 text-success' },
              { label: 'Analytics', icon: Activity, desc: 'Deep insights', path: '/analytics', color: 'bg-purple-500/10 text-purple-400' },
              { label: 'System Health', icon: Activity, desc: 'Monitor status', path: '/admin', color: 'bg-info/10 text-info' },
            ].map(action => (
              <button key={action.label} onClick={() => navigate(action.path)} className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors text-left">
                <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center", action.color)}>
                  <action.icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{action.label}</p>
                  <p className="text-xs text-muted-foreground">{action.desc}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
