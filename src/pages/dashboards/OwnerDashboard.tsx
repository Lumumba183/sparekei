import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Car, Wrench, AlertTriangle, Calendar, TrendingUp, ChevronRight,
  HeartPulse, Shield, Clock, Zap, Fuel, Battery, Thermometer
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { vehicles, predictiveAlerts, serviceAppointments, ownerMetrics, maintenanceLogs } from '@/data/mockData';
import { cn } from '@/lib/utils';

export default function OwnerDashboard() {
  const navigate = useNavigate();
  const [activeVehicle, setActiveVehicle] = useState(vehicles[0]);
  const vehicleAlerts = predictiveAlerts.filter(a => a.vehicleId === activeVehicle.id);
  const vehicleAppointments = serviceAppointments.filter(a => a.vehicleId === activeVehicle.id);
  const recentLogs = maintenanceLogs.filter(l => l.vehicleId === activeVehicle.id).slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">My Garage</h1>
          <p className="text-muted-foreground text-sm">Manage your vehicles and services</p>
        </div>
        <Button onClick={() => navigate('/marketplace')}>
          <Car className="w-4 h-4 mr-2" /> Browse Marketplace
        </Button>
      </div>

      {/* Vehicle Selector */}
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
        {vehicles.map(v => (
          <button
            key={v.id}
            onClick={() => setActiveVehicle(v)}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all min-w-[260px]",
              activeVehicle.id === v.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/30 bg-card"
            )}
          >
            <img src={v.image} alt={v.model} className="w-14 h-10 object-cover rounded-lg" />
            <div className="text-left">
              <p className="font-medium text-sm">{v.make} {v.model}</p>
              <p className="text-xs text-muted-foreground">{v.registration} • {v.year}</p>
            </div>
            <div className={cn("ml-auto w-2.5 h-2.5 rounded-full", 
              v.status === 'healthy' ? 'bg-success' : v.status === 'attention' ? 'bg-warning' : 'bg-emergency'
            )} />
          </button>
        ))}
        <button className="flex items-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-border hover:border-primary/30 transition-all min-w-[140px] justify-center text-muted-foreground hover:text-foreground">
          <Car className="w-4 h-4" /> Add Vehicle
        </button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {ownerMetrics.map((metric, i) => (
          <motion.div key={metric.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <Card className="glass-card-hover">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-5 h-5 text-primary"><metric.icon /></div>
                  {metric.trend && metric.change !== undefined && (
                    <Badge variant={metric.trend === 'up' ? 'default' : 'secondary'} className="text-[10px]">
                      {metric.trend === 'up' ? '+' : ''}{metric.change}%
                    </Badge>
                  )}
                </div>
                <p className="text-2xl font-bold">{metric.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{metric.label}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Vehicle Health */}
        <Card className="glass-card lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <HeartPulse className="w-4 h-4 text-primary" />
                Vehicle Health Status
              </CardTitle>
              <Badge variant={activeVehicle.status === 'healthy' ? 'default' : 'destructive'}>
                {activeVehicle.status === 'healthy' ? 'Healthy' : 'Attention Needed'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Health Score */}
            <div className="flex items-center gap-6">
              <div className="relative w-24 h-24 shrink-0">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
                  <circle cx="50" cy="50" r="42" fill="none" stroke={activeVehicle.healthScore >= 90 ? 'hsl(var(--success))' : activeVehicle.healthScore >= 70 ? 'hsl(var(--warning))' : 'hsl(var(--emergency))'} 
                    strokeWidth="8" strokeLinecap="round"
                    strokeDasharray={`${activeVehicle.healthScore * 2.64} ${264 - activeVehicle.healthScore * 2.64}`} />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xl font-bold">{activeVehicle.healthScore}</span>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">{activeVehicle.make} {activeVehicle.model}</h3>
                <p className="text-sm text-muted-foreground">{activeVehicle.year} • {activeVehicle.mileage.toLocaleString()} km • {activeVehicle.registration}</p>
                <div className="flex gap-4 mt-2">
                  <span className="flex items-center gap-1 text-xs text-muted-foreground"><Fuel className="w-3 h-3" /> Full</span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground"><Battery className="w-3 h-3" /> Good</span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground"><Thermometer className="w-3 h-3" /> Normal</span>
                </div>
              </div>
              <img src={activeVehicle.image} alt="" className="w-32 h-20 object-cover rounded-lg hidden sm:block" />
            </div>

            {/* Component Status */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Engine', status: 'Good', icon: Zap, color: 'text-success' },
                { label: 'Brakes', status: activeVehicle.id === 'v-002' ? 'Check Soon' : 'Good', icon: Wrench, color: activeVehicle.id === 'v-002' ? 'text-warning' : 'text-success' },
                { label: 'Battery', status: activeVehicle.id === 'v-002' ? 'Degrading' : 'Good', icon: Battery, color: activeVehicle.id === 'v-002' ? 'text-warning' : 'text-success' },
                { label: 'Tires', status: 'Good', icon: Shield, color: 'text-success' },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                  <item.icon className={cn("w-4 h-4", item.color)} />
                  <div>
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <p className={cn("text-xs font-medium", item.color)}>{item.status}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Predictive Alerts */}
            {vehicleAlerts.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-warning" /> Predictive Alerts ({vehicleAlerts.length})
                </p>
                {vehicleAlerts.map(alert => (
                  <div key={alert.id} className={cn(
                    "flex items-start gap-3 p-3 rounded-lg border",
                    alert.severity === 'critical' ? 'bg-emergency/10 border-emergency/30' : 
                    alert.severity === 'high' ? 'bg-warning/10 border-warning/30' : 'bg-info/10 border-info/30'
                  )}>
                    <AlertTriangle className={cn("w-4 h-4 mt-0.5 shrink-0", 
                      alert.severity === 'critical' ? 'text-emergency' : alert.severity === 'high' ? 'text-warning' : 'text-info'
                    )} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{alert.component}</p>
                      <p className="text-xs text-muted-foreground">{alert.message}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" /> Due: {new Date(alert.predictedDueDate).toLocaleDateString()}</span>
                        <span className="text-xs text-muted-foreground">Est: KSh {alert.estimatedCostMin.toLocaleString()} - {alert.estimatedCostMax.toLocaleString()}</span>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" className="shrink-0 text-xs h-7" onClick={() => navigate('/services')}>
                      Book Service
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="glass-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              { label: 'Book Service', icon: Wrench, desc: 'Schedule maintenance', path: '/services', color: 'bg-primary/10 text-primary' },
              { label: 'Emergency', icon: AlertTriangle, desc: '24/7 roadside help', path: '/emergency', color: 'bg-emergency/10 text-emergency' },
              { label: 'Buy Parts', icon: Car, desc: 'Browse marketplace', path: '/marketplace', color: 'bg-accent/10 text-accent' },
              { label: 'Vehicle Passport', icon: Shield, desc: 'View full history', path: '/passport', color: 'bg-success/10 text-success' },
              { label: 'AI Concierge', icon: Zap, desc: 'Ask anything', path: '/ai-concierge', color: 'bg-purple-500/10 text-purple-400' },
            ].map(action => (
              <button key={action.label} onClick={() => navigate(action.path)} className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors text-left">
                <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", action.color)}>
                  <action.icon className="w-5 h-5" />
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

      {/* Upcoming Services & Recent Logs */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="glass-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              Upcoming Appointments
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {vehicleAppointments.length > 0 ? vehicleAppointments.map(appt => (
              <div key={appt.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Wrench className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{appt.serviceType}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(appt.scheduledAt).toLocaleDateString()} at {new Date(appt.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <p className="text-xs text-muted-foreground">{appt.mechanicName}</p>
                </div>
                <Badge variant={appt.status === 'confirmed' ? 'default' : 'secondary'} className="text-[10px] shrink-0">
                  {appt.status}
                </Badge>
              </div>
            )) : (
              <p className="text-sm text-muted-foreground text-center py-6">No upcoming appointments</p>
            )}
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Recent Service History
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentLogs.map(log => (
              <div key={log.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center shrink-0">
                  <Shield className="w-5 h-5 text-success" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{log.serviceType}</p>
                  <p className="text-xs text-muted-foreground">{log.serviceProviderName} • {new Date(log.performedAt).toLocaleDateString()}</p>
                  <div className="flex gap-2 mt-0.5">
                    <span className="text-xs text-muted-foreground">KSh {log.cost.toLocaleString()}</span>
                    <span className="text-xs text-muted-foreground">{log.mileage.toLocaleString()} km</span>
                  </div>
                </div>
                {log.isVerified && <Badge variant="outline" className="text-[10px] text-success border-success shrink-0"><Shield className="w-3 h-3 mr-1" />Verified</Badge>}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
