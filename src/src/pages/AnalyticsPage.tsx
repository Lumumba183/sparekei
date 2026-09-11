import { TrendingUp, ShoppingCart, Users, Banknote, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { revenueChartData, userGrowthData } from '@/data/mockData';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const categoryData = [
  { name: 'Brake System', value: 35 }, { name: 'Engine', value: 25 }, { name: 'Suspension', value: 20 }, { name: 'Electrical', value: 15 }, { name: 'Other', value: 5 },
];
const COLORS = ['hsl(var(--primary))', 'hsl(var(--success))', 'hsl(var(--accent))', 'hsl(var(--warning))', 'hsl(var(--muted))'];

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold">Analytics</h1><p className="text-muted-foreground text-sm">Platform performance insights</p></div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Revenue', value: 'KSh 2.4M', change: '+12%', icon: Banknote, up: true },
          { label: 'Orders', value: '1,234', change: '+15%', icon: ShoppingCart, up: true },
          { label: 'New Users', value: '348', change: '+8%', icon: Users, up: true },
          { label: 'Conversion', value: '3.2%', change: '-0.4%', icon: TrendingUp, up: false },
        ].map(s => (
          <Card key={s.label} className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <s.icon className="w-5 h-5 text-primary" />
                <Badge variant={s.up ? 'default' : 'destructive'} className="text-[10px] gap-1">
                  {s.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}{s.change}
                </Badge>
              </div>
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="glass-card">
          <CardHeader className="pb-2"><CardTitle className="text-base">Revenue Trends</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={revenueChartData}>
                <defs><linearGradient id="rg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/><stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fill="url(#rg)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardHeader className="pb-2"><CardTitle className="text-base">Sales by Category</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart><Pie data={categoryData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" label>
                {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie><Tooltip /></PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
      <Card className="glass-card">
        <CardHeader className="pb-2"><CardTitle className="text-base">User Growth</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={userGrowthData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
              <Bar dataKey="users" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="mechanics" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
