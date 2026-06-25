import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Wrench, Clock, MapPin, Star, Banknote, CheckCircle,
  Calendar, ChevronRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { mechanicJobs, earnings, mechanicMetrics } from '@/data/mockData';
import { cn } from '@/lib/utils';

export default function MechanicDashboard() {
  const navigate = useNavigate();
  const activeJobs = mechanicJobs.filter(j => j.status === 'in_progress' || j.status === 'accepted');
  const totalEarnings = earnings.reduce((sum, e) => sum + e.amount, 0);
  const pendingEarnings = earnings.filter(e => e.status === 'pending').reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Mechanic Workspace</h1>
          <p className="text-muted-foreground text-sm">Manage your jobs and earnings</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/earnings')}>
            <Banknote className="w-4 h-4 mr-2" /> Earnings
          </Button>
          <Button onClick={() => navigate('/services')}>
            <Wrench className="w-4 h-4 mr-2" /> Find Jobs
          </Button>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {mechanicMetrics.map((m, i) => (
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

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Earnings Summary */}
        <Card className="glass-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Banknote className="w-4 h-4 text-success" /> Earnings Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center py-4">
              <p className="text-3xl font-bold text-success">KSh {totalEarnings.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-1">Total Earnings (MTD)</p>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Pending</span>
                <span className="font-medium text-warning">KSh {pendingEarnings.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Paid</span>
                <span className="font-medium text-success">KSh {(totalEarnings - pendingEarnings).toLocaleString()}</span>
              </div>
            </div>
            <Progress value={((totalEarnings - pendingEarnings) / totalEarnings) * 100} className="h-2" />
            <p className="text-xs text-muted-foreground text-center">{Math.round(((totalEarnings - pendingEarnings) / totalEarnings) * 100)}% paid out</p>
          </CardContent>
        </Card>

        {/* Performance */}
        <Card className="glass-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-400" /> Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="text-center">
                <p className="text-3xl font-bold">4.9</p>
                <div className="flex gap-0.5 mt-1">
                  {[1, 2, 3, 4, 5].map(s => (
                    <Star key={s} className={cn("w-3 h-3", s <= 4 ? "fill-amber-400 text-amber-400" : "fill-amber-400/50 text-amber-400/50")} />
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-1">234 reviews</p>
              </div>
              <div className="flex-1 space-y-2">
                {[{ stars: 5, pct: 85 }, { stars: 4, pct: 12 }, { stars: 3, pct: 3 }].map(r => (
                  <div key={r.stars} className="flex items-center gap-2">
                    <span className="text-xs w-3">{r.stars}</span>
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-amber-400 rounded-full" style={{ width: `${r.pct}%` }} />
                    </div>
                    <span className="text-xs text-muted-foreground w-8">{r.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 rounded-lg bg-muted/50">
                <p className="text-lg font-bold">98%</p>
                <p className="text-[10px] text-muted-foreground">Response</p>
              </div>
              <div className="p-2 rounded-lg bg-muted/50">
                <p className="text-lg font-bold">12m</p>
                <p className="text-[10px] text-muted-foreground">Avg Response</p>
              </div>
              <div className="p-2 rounded-lg bg-muted/50">
                <p className="text-lg font-bold">156</p>
                <p className="text-[10px] text-muted-foreground">Jobs Done</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Availability */}
        <Card className="glass-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" /> Schedule
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-success/10 border border-success/20">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                <span className="text-sm font-medium">Currently Available</span>
              </div>
              <Badge variant="outline" className="text-success border-success text-[10px]">Online</Badge>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">This Week</p>
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map((day, i) => (
                <div key={day} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{day}</span>
                  <span className="text-xs">{8 + i}:00 - {17 + i}:00</span>
                  <Badge variant="outline" className="text-[10px] h-5">{i < 3 ? '3 jobs' : 'Open'}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Jobs */}
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Wrench className="w-4 h-4 text-primary" /> Job Queue
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/jobs')}>
              View All <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {activeJobs.length > 0 ? (
            <div className="space-y-3">
              {activeJobs.map(job => (
                <div key={job.id} className="flex items-center gap-4 p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors">
                  <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                    job.status === 'in_progress' ? 'bg-primary/10' : 'bg-warning/10'
                  )}>
                    <Wrench className={cn("w-5 h-5", job.status === 'in_progress' ? 'text-primary' : 'text-warning')} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{job.serviceType}</p>
                      <Badge variant={job.status === 'in_progress' ? 'default' : 'secondary'} className="text-[10px]">
                        {job.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{job.vehicleInfo} • {job.vehicleOwner}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="w-3 h-3" />{job.location}</span>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground"><Calendar className="w-3 h-3" />{new Date(job.scheduledAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-success">KSh {job.earnings.toLocaleString()}</p>
                    <Button size="sm" variant="outline" className="h-7 text-xs mt-1">
                      {job.status === 'in_progress' ? 'Update' : 'Start'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-success mx-auto mb-3" />
              <p className="text-sm font-medium">All caught up!</p>
              <p className="text-xs text-muted-foreground">No active jobs at the moment</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
