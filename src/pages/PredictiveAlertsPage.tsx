import { motion } from 'framer-motion';
import { AlertTriangle, HeartPulse, Wrench, Clock, Battery, Gauge, CircleDot } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { predictiveAlerts } from '@/data/mockData';
import { cn } from '@/lib/utils';

export default function PredictiveAlertsPage() {
  const severityConfig = {
    critical: { color: 'text-emergency', bg: 'bg-emergency/10', border: 'border-emergency/30', icon: AlertTriangle },
    high: { color: 'text-warning', bg: 'bg-warning/10', border: 'border-warning/30', icon: AlertTriangle },
    medium: { color: 'text-accent', bg: 'bg-accent/10', border: 'border-accent/30', icon: Gauge },
    low: { color: 'text-info', bg: 'bg-info/10', border: 'border-info/30', icon: CircleDot },
  };

  const componentIcons: Record<string, typeof Battery> = {
    'Brake System': Wrench,
    'Tires': Gauge,
    'Battery': Battery,
    'Engine': HeartPulse,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Predictive Maintenance</h1>
        <p className="text-muted-foreground text-sm">AI-powered maintenance forecasting</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Alerts', value: predictiveAlerts.length, color: 'bg-primary/10 text-primary', icon: AlertTriangle },
          { label: 'Critical', value: predictiveAlerts.filter(a => a.severity === 'critical').length, color: 'bg-emergency/10 text-emergency', icon: AlertTriangle },
          { label: 'OBD Triggered', value: predictiveAlerts.filter(a => a.triggeredByOBD).length, color: 'bg-accent/10 text-accent', icon: HeartPulse },
          { label: 'Resolved', value: predictiveAlerts.filter(a => a.status === 'resolved').length, color: 'bg-success/10 text-success', icon: Gauge },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <Card className="glass-card">
              <CardContent className="p-4">
                <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center mb-3", stat.color)}>
                  <stat.icon className="w-5 h-5" />
                </div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Alerts */}
      <div className="space-y-4">
        {predictiveAlerts.map((alert, i) => {
          const config = severityConfig[alert.severity];
          const CompIcon = componentIcons[alert.component] || HeartPulse;
          return (
            <motion.div key={alert.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}>
              <Card className={cn("glass-card border", config.border)}>
                <CardContent className="p-5">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0", config.bg)}>
                      <CompIcon className={cn("w-6 h-6", config.color)} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold">{alert.component}</h3>
                        <Badge className={cn("text-[10px] text-white",
                          alert.severity === 'critical' ? 'bg-emergency' : alert.severity === 'high' ? 'bg-warning' : 'bg-accent'
                        )}>
                          {alert.severity.toUpperCase()}
                        </Badge>
                        {alert.triggeredByOBD && <Badge variant="outline" className="text-[10px] gap-1"><HeartPulse className="w-3 h-3" />OBD</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{alert.message}</p>
                      <div className="flex flex-wrap gap-4 mt-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />Predicted: {new Date(alert.predictedDueDate).toLocaleDateString()}</span>
                        <span>Est. Cost: KSh {alert.estimatedCostMin.toLocaleString()} - {alert.estimatedCostMax.toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="shrink-0 flex flex-row sm:flex-col gap-2">
                      <Button size="sm" className="gap-1"><Wrench className="w-3.5 h-3.5" /> Book Service</Button>
                      <Button size="sm" variant="outline" className="gap-1">Dismiss</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
