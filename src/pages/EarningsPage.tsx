import { Banknote, TrendingUp, Clock, CheckCircle, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { earnings } from '@/data/mockData';
import { cn } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const chartData = [
  { day: 'Mon', amount: 4500 }, { day: 'Tue', amount: 8500 }, { day: 'Wed', amount: 12000 },
  { day: 'Thu', amount: 6000 }, { day: 'Fri', amount: 15000 }, { day: 'Sat', amount: 18000 }, { day: 'Sun', amount: 21400 },
];

export default function EarningsPage() {
  const total = earnings.reduce((s, e) => s + e.amount, 0);
  const pending = earnings.filter(e => e.status === 'pending').reduce((s, e) => s + e.amount, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Earnings</h1>
        <p className="text-muted-foreground text-sm">Track your income and payouts</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Earnings', value: `KSh ${total.toLocaleString()}`, icon: Banknote, color: 'text-success' },
          { label: 'Pending', value: `KSh ${pending.toLocaleString()}`, icon: Clock, color: 'text-warning' },
          { label: 'This Week', value: 'KSh 85,400', icon: TrendingUp, color: 'text-primary' },
          { label: 'Completed Jobs', value: '156', icon: CheckCircle, color: 'text-accent' },
        ].map((stat) => (
          <Card key={stat.label} className="glass-card">
            <CardContent className="p-4">
              <stat.icon className={cn("w-5 h-5 mb-2", stat.color)} />
              <p className="text-xl font-bold">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="glass-card">
        <CardHeader className="pb-2"><CardTitle className="text-base">Weekly Earnings</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
              <Bar dataKey="amount" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {earnings.map(e => (
          <Card key={e.id} className="glass-card-hover">
            <CardContent className="p-4 flex items-center gap-4">
              <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center shrink-0", e.status === 'paid' ? 'bg-success/10' : 'bg-warning/10')}>
                <Banknote className={cn("w-5 h-5", e.status === 'paid' ? 'text-success' : 'text-warning')} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{e.description}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(e.date).toLocaleDateString()}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-semibold">KSh {e.amount.toLocaleString()}</p>
                <Badge variant={e.status === 'paid' ? 'default' : 'secondary'} className="text-[10px]">{e.status}</Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
