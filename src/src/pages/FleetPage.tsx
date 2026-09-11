import { Truck, AlertTriangle, Shield, Calendar, Wrench } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { fleetVehicles } from '@/data/mockData';
import { cn } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const statusConfig = {
  HEALTHY: { color: 'text-success', bg: 'bg-success/10', badge: 'default' as const },
  ATTENTION: { color: 'text-warning', bg: 'bg-warning/10', badge: 'secondary' as const },
  CRITICAL: { color: 'text-emergency', bg: 'bg-emergency/10', badge: 'destructive' as const },
};

const utilizationData = [
  { day: 'Mon', utilization: 85 }, { day: 'Tue', utilization: 92 }, { day: 'Wed', utilization: 78 },
  { day: 'Thu', utilization: 88 }, { day: 'Fri', utilization: 95 }, { day: 'Sat', utilization: 60 }, { day: 'Sun', utilization: 45 },
];

export default function FleetPage() {
  const healthy = fleetVehicles.filter(v => v.riskStatus === 'HEALTHY').length;
  const attention = fleetVehicles.filter(v => v.riskStatus === 'ATTENTION').length;
  const critical = fleetVehicles.filter(v => v.riskStatus === 'CRITICAL').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Fleet Command</h1>
        <p className="text-muted-foreground text-sm">Multi-vehicle operations dashboard</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Vehicles', value: fleetVehicles.length, icon: Truck, color: 'text-primary' },
          { label: 'Healthy', value: healthy, icon: Shield, color: 'text-success' },
          { label: 'Attention', value: attention, icon: AlertTriangle, color: 'text-warning' },
          { label: 'Critical', value: critical, icon: AlertTriangle, color: 'text-emergency' },
        ].map(s => (
          <Card key={s.label} className="glass-card">
            <CardContent className="p-4">
              <s.icon className={cn("w-5 h-5 mb-2", s.color)} />
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="glass-card lg:col-span-2">
          <CardHeader className="pb-2"><CardTitle className="text-base">Fleet Utilization</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={utilizationData}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} unit="%" />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                <Bar dataKey="utilization" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardHeader className="pb-2"><CardTitle className="text-base">Fleet Health</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="flex justify-between text-xs mb-1"><span>Healthy</span><span className="text-success">{healthy}/{fleetVehicles.length}</span></div>
              <Progress value={(healthy / fleetVehicles.length) * 100} className="h-2 bg-muted [&>div]:bg-success" />
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1"><span>Needs Attention</span><span className="text-warning">{attention}/{fleetVehicles.length}</span></div>
              <Progress value={(attention / fleetVehicles.length) * 100} className="h-2 bg-muted [&>div]:bg-warning" />
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1"><span>Critical</span><span className="text-emergency">{critical}/{fleetVehicles.length}</span></div>
              <Progress value={(critical / fleetVehicles.length) * 100} className="h-2 bg-muted [&>div]:bg-emergency" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-3">
        {fleetVehicles.map(v => {
          const cfg = statusConfig[v.riskStatus];
          return (
            <Card key={v.id} className={cn("glass-card", v.riskStatus === 'CRITICAL' && "border-emergency/50")}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0", cfg.bg)}>
                  <Truck className={cn("w-6 h-6", cfg.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm">{v.licensePlate}</p>
                    <Badge variant={cfg.badge} className="text-[10px]">{v.riskStatus}</Badge>
                    {v.lastFaultCode && <Badge variant="outline" className="text-[10px] text-warning">{v.lastFaultCode}</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">{v.make} {v.model} {v.year} • {v.currentOdometer.toLocaleString()} km</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    {v.driverName && <span>Driver: {v.driverName}</span>}
                    {v.lastServiceDate && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />Last: {new Date(v.lastServiceDate).toLocaleDateString()}</span>}
                  </div>
                </div>
                <div className="shrink-0 flex gap-1">
                  <Button size="sm" variant="outline" className="h-7 text-xs"><Wrench className="w-3 h-3 mr-1" />Service</Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
