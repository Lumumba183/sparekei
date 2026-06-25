import { useState } from 'react';
import { Wrench, Clock, MapPin, Star, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { mechanicJobs } from '@/data/mockData';
import { cn } from '@/lib/utils';

export default function JobsPage() {
  const [jobs] = useState(mechanicJobs);
  const pending = jobs.filter(j => j.status === 'pending');
  const active = jobs.filter(j => j.status === 'accepted' || j.status === 'in_progress');
  const completed = jobs.filter(j => j.status === 'completed');

  const JobCard = ({ job }: { job: typeof jobs[0] }) => (
    <Card className="glass-card-hover">
      <CardContent className="p-4 flex items-center gap-4">
        <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
          job.status === 'in_progress' ? 'bg-primary/10' : job.status === 'completed' ? 'bg-success/10' : 'bg-warning/10'
        )}>
          <Wrench className={cn("w-6 h-6",
            job.status === 'in_progress' ? 'text-primary' : job.status === 'completed' ? 'text-success' : 'text-warning'
          )} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium text-sm">{job.serviceType}</p>
            <Badge variant={job.status === 'completed' ? 'default' : 'secondary'} className="text-[10px]">{job.status}</Badge>
          </div>
          <p className="text-xs text-muted-foreground">{job.vehicleInfo} • {job.vehicleOwner}</p>
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{job.location}</span>
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(job.scheduledAt).toLocaleDateString()}</span>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="font-semibold text-sm">KSh {job.earnings.toLocaleString()}</p>
          {job.status === 'pending' && (
            <div className="flex gap-1 mt-1">
              <Button size="sm" variant="default" className="h-7 text-xs"><CheckCircle className="w-3 h-3 mr-1" />Accept</Button>
              <Button size="sm" variant="outline" className="h-7 text-xs"><XCircle className="w-3 h-3 mr-1" />Decline</Button>
            </div>
          )}
          {job.status === 'in_progress' && <Button size="sm" variant="outline" className="h-7 text-xs mt-1">Update</Button>}
          {job.rating && <div className="flex items-center gap-0.5 mt-1 justify-end"><Star className="w-3 h-3 fill-amber-400 text-amber-400" /><span className="text-xs">{job.rating}</span></div>}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Jobs</h1>
        <p className="text-muted-foreground text-sm">Manage your service jobs</p>
      </div>

      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList className="bg-card border">
          <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>
          <TabsTrigger value="active">Active ({active.length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({completed.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="pending" className="space-y-3">
          {pending.length > 0 ? pending.map(job => <JobCard key={job.id} job={job} />) : <p className="text-center text-muted-foreground py-8">No pending jobs</p>}
        </TabsContent>
        <TabsContent value="active" className="space-y-3">
          {active.length > 0 ? active.map(job => <JobCard key={job.id} job={job} />) : <p className="text-center text-muted-foreground py-8">No active jobs</p>}
        </TabsContent>
        <TabsContent value="completed" className="space-y-3">
          {completed.length > 0 ? completed.map(job => <JobCard key={job.id} job={job} />) : <p className="text-center text-muted-foreground py-8">No completed jobs</p>}
        </TabsContent>
      </Tabs>
    </div>
  );
}
