import { useState } from 'react';
import { Search, Users, Shield, Car, Wrench, ShoppingBag, MoreHorizontal, Ban, CheckCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const mockUsers = [
  { id: '1', name: 'Alex Morgan', email: 'alex@example.com', role: 'owner', status: 'active', vehicles: 2, joined: '2026-01-15' },
  { id: '2', name: 'James Kimani', email: 'james@example.com', role: 'mechanic', status: 'active', rating: 4.9, joined: '2026-02-01' },
  { id: '3', name: 'Sarah Ochieng', email: 'sarah@example.com', role: 'vendor', status: 'active', listings: 45, joined: '2026-01-20' },
  { id: '4', name: 'David Mwangi', email: 'david@example.com', role: 'mechanic', status: 'active', rating: 4.7, joined: '2026-03-10' },
  { id: '5', name: 'Grace Muthoni', email: 'grace@example.com', role: 'owner', status: 'suspended', vehicles: 1, joined: '2026-04-05' },
  { id: '6', name: 'Peter Kamau', email: 'peter@example.com', role: 'fleet_manager', status: 'active', vehicles: 12, joined: '2025-12-01' },
];

const roleIcons: Record<string, typeof Car> = { owner: Car, mechanic: Wrench, vendor: ShoppingBag, fleet_manager: Car, admin: Shield };
const roleColors: Record<string, string> = { owner: 'bg-primary/10 text-primary', mechanic: 'bg-success/10 text-success', vendor: 'bg-accent/10 text-accent', fleet_manager: 'bg-purple-500/10 text-purple-400', admin: 'bg-emergency/10 text-emergency' };

export default function UsersPage() {
  const [search, setSearch] = useState('');
  const filtered = mockUsers.filter(u => u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold">User Management</h1><p className="text-muted-foreground text-sm">Manage platform users</p></div>
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search users..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
      </div>
      <Card className="glass-card">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b border-border">
                <th className="text-left p-4 text-xs font-medium text-muted-foreground">User</th>
                <th className="text-left p-4 text-xs font-medium text-muted-foreground">Role</th>
                <th className="text-left p-4 text-xs font-medium text-muted-foreground">Status</th>
                <th className="text-left p-4 text-xs font-medium text-muted-foreground">Joined</th>
                <th className="text-right p-4 text-xs font-medium text-muted-foreground">Actions</th>
              </tr></thead>
              <tbody>
                {filtered.map(u => {
                  const Icon = roleIcons[u.role] || Users;
                  return (
                    <tr key={u.id} className="border-b border-border hover:bg-accent/30 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center", roleColors[u.role])}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{u.name}</p>
                            <p className="text-xs text-muted-foreground">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4"><Badge variant="outline" className="text-[10px] capitalize">{u.role.replace('_', ' ')}</Badge></td>
                      <td className="p-4">
                        <Badge variant={u.status === 'active' ? 'default' : 'destructive'} className="text-[10px] gap-1">
                          {u.status === 'active' ? <CheckCircle className="w-3 h-3" /> : <Ban className="w-3 h-3" />}{u.status}
                        </Badge>
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">{new Date(u.joined).toLocaleDateString()}</td>
                      <td className="p-4 text-right"><Button size="sm" variant="ghost" className="h-7 w-7 p-0"><MoreHorizontal className="w-4 h-4" /></Button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
