import { Bell, CheckCircle, AlertTriangle, Info, Clock, CheckCheck } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { notifications } from '@/data/mockData';
import { cn } from '@/lib/utils';
import { useState } from 'react';

const typeConfig: Record<string, { icon: typeof Bell; color: string }> = {
  success: { icon: CheckCircle, color: 'text-success bg-success/10' },
  warning: { icon: AlertTriangle, color: 'text-warning bg-warning/10' },
  info: { icon: Info, color: 'text-primary bg-primary/10' },
  critical: { icon: AlertTriangle, color: 'text-emergency bg-emergency/10' },
};

export default function NotificationsPage() {
  const [notifs, setNotifs] = useState(notifications);
  const markAllRead = () => setNotifs(prev => prev.map(n => ({ ...n, read: true })));
  const markRead = (id: string) => setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  const unreadCount = notifs.filter(n => !n.read).length;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="text-muted-foreground text-sm">{unreadCount} unread notifications</p>
        </div>
        <Button variant="outline" size="sm" onClick={markAllRead}><CheckCheck className="w-4 h-4 mr-2" /> Mark All Read</Button>
      </div>

      <div className="space-y-3">
        {notifs.map(n => {
          const cfg = typeConfig[n.type] || typeConfig.info;
          const Icon = cfg.icon;
          return (
            <Card key={n.id} className={cn("glass-card-hover transition-all", !n.read && "border-primary/20")}>
              <CardContent className="p-4 flex items-start gap-4">
                <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center shrink-0", cfg.color)}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={cn("text-sm", !n.read && "font-semibold")}>{n.title}</p>
                    {!n.read && <Badge variant="secondary" className="text-[10px]">New</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">{n.message}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="flex items-center gap-1 text-xs text-muted-foreground"><Clock className="w-3 h-3" />{n.createdAt ? new Date(n.createdAt).toLocaleTimeString() : ''}</span>
                    {n.actionUrl && <button className="text-xs text-primary hover:underline">View Details</button>}
                  </div>
                </div>
                {!n.read && (
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 shrink-0" onClick={() => markRead(n.id)}>
                    <CheckCircle className="w-4 h-4 text-muted-foreground" />
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
