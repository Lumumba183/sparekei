import { Users, ShoppingBag, AlertTriangle, TrendingUp, Activity, Settings, ChevronRight, Lock, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { funnelStages, competitorData } from '@/data/mockData';
import { cn } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function AdminCenterPage() {
  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold">Admin Center</h1><p className="text-muted-foreground text-sm">Platform administration tools</p></div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Users', value: '12,458', icon: Users, color: 'bg-primary/10 text-primary' },
          { label: 'Listings', value: '3,847', icon: ShoppingBag, color: 'bg-accent/10 text-accent' },
          { label: 'Flagged Items', value: '23', icon: AlertTriangle, color: 'bg-emergency/10 text-emergency' },
          { label: 'System Health', value: '99.9%', icon: Activity, color: 'bg-success/10 text-success' },
        ].map(s => (
          <Card key={s.label} className="glass-card">
            <CardContent className="p-4">
              <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center mb-2", s.color)}><s.icon className="w-5 h-5" /></div>
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="glass-card">
          <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="w-4 h-4" /> Recruitment Funnel</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={funnelStages} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis dataKey="stage" type="category" stroke="hsl(var(--muted-foreground))" fontSize={11} width={80} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Eye className="w-4 h-4" /> Competitor Monitor</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {competitorData.map(c => (
              <div key={c.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <div className="w-9 h-9 rounded-lg bg-emergency/10 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-4 h-4 text-emergency" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{c.competitorName}</p>
                  <p className="text-xs text-muted-foreground">{c.cityName} • {c.serviceCoverage.join(', ')}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold">KSh {c.pricing.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">{new Date(c.lastUpdated).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { title: 'User Management', desc: 'Manage roles and permissions', icon: Users, color: 'bg-primary/10 text-primary' },
          { title: 'Marketplace Moderation', desc: 'Review listings and disputes', icon: ShoppingBag, color: 'bg-accent/10 text-accent' },
          { title: 'Security Settings', desc: 'Auth and access control', icon: Lock, color: 'bg-emergency/10 text-emergency' },
          { title: 'Fraud Detection', desc: 'AI-powered scam prevention', icon: AlertTriangle, color: 'bg-warning/10 text-warning' },
          { title: 'System Config', desc: 'Platform settings', icon: Settings, color: 'bg-success/10 text-success' },
          { title: 'Audit Log', desc: 'Activity tracking', icon: Activity, color: 'bg-info/10 text-info' },
        ].map(tool => (
          <Card key={tool.title} className="glass-card-hover cursor-pointer">
            <CardContent className="p-4 flex items-center gap-4">
              <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", tool.color)}>
                <tool.icon className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">{tool.title}</p>
                <p className="text-xs text-muted-foreground">{tool.desc}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
