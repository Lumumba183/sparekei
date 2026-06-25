import { useState } from 'react';
import { User, Bell, Shield } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';

export default function SettingsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState({ push: true, email: true, sms: false, marketing: false });

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground text-sm">Manage your account preferences</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="bg-card border">
          <TabsTrigger value="profile" className="gap-2"><User className="w-4 h-4" /> Profile</TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2"><Bell className="w-4 h-4" /> Notifications</TabsTrigger>
          <TabsTrigger value="security" className="gap-2"><Shield className="w-4 h-4" /> Security</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-4">
          <Card className="glass-card">
            <CardHeader className="pb-3"><CardTitle className="text-base">Personal Information</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <img src={user?.avatar} alt="" className="w-16 h-16 rounded-full bg-muted" />
                <div><Button size="sm" variant="outline">Change Avatar</Button></div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Full Name</Label><Input defaultValue={user?.fullName} /></div>
                <div className="space-y-2"><Label>Email</Label><Input defaultValue={user?.email} type="email" /></div>
                <div className="space-y-2"><Label>Phone</Label><Input defaultValue={user?.phone || ''} /></div>
                <div className="space-y-2"><Label>City</Label><Input defaultValue={user?.city || ''} /></div>
              </div>
              <Button>Save Changes</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card className="glass-card">
            <CardHeader className="pb-3"><CardTitle className="text-base">Notification Preferences</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {[
                { key: 'push', label: 'Push Notifications', desc: 'Receive push notifications on your device' },
                { key: 'email', label: 'Email Notifications', desc: 'Receive email updates and newsletters' },
                { key: 'sms', label: 'SMS Alerts', desc: 'Get text messages for critical alerts' },
                { key: 'marketing', label: 'Marketing', desc: 'Receive promotional offers and updates' },
              ].map(n => (
                <div key={n.key} className="flex items-center justify-between py-2">
                  <div>
                    <p className="font-medium text-sm">{n.label}</p>
                    <p className="text-xs text-muted-foreground">{n.desc}</p>
                  </div>
                  <Switch checked={notifications[n.key as keyof typeof notifications]} onCheckedChange={checked => setNotifications(prev => ({ ...prev, [n.key]: checked }))} />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card className="glass-card">
            <CardHeader className="pb-3"><CardTitle className="text-base">Security Settings</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2"><Label>Current Password</Label><Input type="password" /></div>
              <div className="space-y-2"><Label>New Password</Label><Input type="password" /></div>
              <div className="space-y-2"><Label>Confirm Password</Label><Input type="password" /></div>
              <Button>Update Password</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
