import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { notifications } from '@/data/mockData';
import { Bell, Check, CheckCheck, AlertTriangle, Info, CircleCheck, Trash2 } from 'lucide-react';
import type { NotificationItem } from '@/types';

const typeConfig = {
  critical: { icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/30' },
  warning: { icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
  success: { icon: CircleCheck, color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' },
  info: { icon: Info, color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/30' },
};

export default function PushNotificationCenterPage() {
  const [notifs, setNotifs] = useState<NotificationItem[]>([
    ...notifications,
    { id: 'n-006', userId: 'usr-001', title: 'Critical Market Intelligence', message: 'AI detected unusual demand spike for brake pads in Nairobi. Recommend stock increase.', type: 'critical', read: false, createdAt: '2026-06-26T09:00:00' },
    { id: 'n-007', userId: 'usr-001', title: 'City Auto-Unlock', message: 'Kigali city has reached recruitment threshold and is now operational.', type: 'success', read: false, createdAt: '2026-06-26T08:30:00' },
    { id: 'n-008', userId: 'usr-001', title: 'Competitor Alert', message: 'AutoDoc Kenya lowered brake pad prices by 12% in Nairobi market.', type: 'warning', read: true, createdAt: '2026-06-25T16:00:00' },
    { id: 'n-009', userId: 'usr-001', title: 'New Competitor Entry', message: 'MechanicPlus has entered the Mombasa market with mobile mechanic services.', type: 'info', read: false, createdAt: '2026-06-25T11:00:00' },
  ]);
  const [browserPushEnabled, setBrowserPushEnabled] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');

  const filtered = activeFilter === 'all' ? notifs : notifs.filter(n => n.type === activeFilter);
  const unreadCount = notifs.filter(n => !n.read).length;

  const markAsRead = (id: string) => {
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllAsRead = () => {
    setNotifs(prev => prev.map(n => ({ ...n, read: true })));
  };

  const deleteNotification = (id: string) => {
    setNotifs(prev => prev.filter(n => n.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Push Notification Center</h1>
          <p className="text-muted-foreground">Manage critical alerts and intelligence notifications</p>
        </div>
        <div className="flex items-center gap-3">
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllAsRead} className="gap-2">
              <CheckCheck className="w-4 h-4" /> Mark all read
            </Button>
          )}
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg border">
            <Switch checked={browserPushEnabled} onCheckedChange={setBrowserPushEnabled} />
            <span className="text-sm">Browser Push</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Filters */}
        <div className="space-y-4">
          <Card>
            <CardContent className="p-4 space-y-2">
              <Button variant={activeFilter === 'all' ? 'default' : 'ghost'} className="w-full justify-start" onClick={() => setActiveFilter('all')}>
                <Bell className="w-4 h-4 mr-2" /> All Notifications <Badge className="ml-auto">{notifs.length}</Badge>
              </Button>
              <Button variant={activeFilter === 'critical' ? 'default' : 'ghost'} className="w-full justify-start text-red-500" onClick={() => setActiveFilter('critical')}>
                <AlertTriangle className="w-4 h-4 mr-2" /> Critical <Badge className="ml-auto">{notifs.filter(n => n.type === 'critical').length}</Badge>
              </Button>
              <Button variant={activeFilter === 'warning' ? 'default' : 'ghost'} className="w-full justify-start text-amber-500" onClick={() => setActiveFilter('warning')}>
                <AlertTriangle className="w-4 h-4 mr-2" /> Warnings <Badge className="ml-auto">{notifs.filter(n => n.type === 'warning').length}</Badge>
              </Button>
              <Button variant={activeFilter === 'info' ? 'default' : 'ghost'} className="w-full justify-start text-blue-500" onClick={() => setActiveFilter('info')}>
                <Info className="w-4 h-4 mr-2" /> Info <Badge className="ml-auto">{notifs.filter(n => n.type === 'info').length}</Badge>
              </Button>
              <Button variant={activeFilter === 'success' ? 'default' : 'ghost'} className="w-full justify-start text-emerald-500" onClick={() => setActiveFilter('success')}>
                <CircleCheck className="w-4 h-4 mr-2" /> Success <Badge className="ml-auto">{notifs.filter(n => n.type === 'success').length}</Badge>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Notification Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span>Critical Alerts</span>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <span>Market Intelligence</span>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <span>Competitor Changes</span>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <span>City Unlocks</span>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <span>Daily Digest</span>
                <Switch />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Notification List */}
        <div className="lg:col-span-3 space-y-3">
          {filtered.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium">No notifications</p>
                <p className="text-muted-foreground">You're all caught up!</p>
              </CardContent>
            </Card>
          ) : (
            filtered.map(n => {
              const config = typeConfig[n.type];
              const Icon = config.icon;
              return (
                <Card key={n.id} className={`transition-all ${!n.read ? 'border-l-4 border-l-primary' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className={`w-10 h-10 rounded-lg ${config.bg} flex items-center justify-center shrink-0`}>
                        <Icon className={`w-5 h-5 ${config.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{n.title}</h4>
                          {!n.read && <Badge variant="secondary" className="text-[10px]">New</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{n.message}</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {n.createdAt ? new Date(n.createdAt).toLocaleString() : 'Just now'}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {!n.read && (
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => markAsRead(n.id)} title="Mark as read">
                            <Check className="w-4 h-4" />
                          </Button>
                        )}
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => deleteNotification(n.id)} title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
