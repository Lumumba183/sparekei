import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { serviceItems, serviceNodes, earnings } from '@/data/mockData';
import { useAuth } from '@/hooks/useAuth';
import {
  Wrench, DollarSign, Star, Plus, Edit, Trash2,
  CheckCircle, Clock, MapPin
} from 'lucide-react';

export default function ServiceNodeDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('offerings');

  // Find the current user's service node (mock)
  const myNode = serviceNodes.find(n => n.class === 'D') || serviceNodes[0];

  const myServices = serviceItems.filter(s => s.nodeId === myNode.id);
  const myEarnings = earnings.filter(e => e.userId === user?.id || e.userId === 'm-001');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Service Node Operator</h1>
          <p className="text-muted-foreground">Manage your service offerings and operations</p>
        </div>
        <Badge variant="outline" className="text-base px-3 py-1">
          Class {myNode.class} Node
        </Badge>
      </div>

      {/* Node Info Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold">{myNode.businessName}</h2>
              <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {myNode.address}</span>
                <span className="flex items-center gap-1"><Star className="w-3.5 h-3.5 text-amber-500" /> {myNode.rating} ({myNode.reviewCount} reviews)</span>
                {myNode.verified && <Badge variant="secondary" className="text-xs">Verified</Badge>}
              </div>
            </div>
            <div className="flex gap-3">
              <div className="text-center">
                <p className="text-2xl font-bold">{myServices.length}</p>
                <p className="text-xs text-muted-foreground">Services</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{myNode.bayCount || '-'}</p>
                <p className="text-xs text-muted-foreground">Bays</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{myNode.availableBays || '-'}</p>
                <p className="text-xs text-muted-foreground">Available</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="offerings">Service Offerings</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="earnings">Earnings</TabsTrigger>
          {myNode.class === 'D' && <TabsTrigger value="bays">Bay Management</TabsTrigger>}
        </TabsList>

        <TabsContent value="offerings" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Your Services</h3>
            <Dialog>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2">
                  <Plus className="w-4 h-4" /> Add Service
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Service</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Service Name</Label>
                    <Input placeholder="e.g., Full Engine Diagnostic" />
                  </div>
                  <div className="space-y-2">
                    <Label>Base Price (KSh)</Label>
                    <Input type="number" placeholder="5000" />
                  </div>
                  <div className="space-y-2">
                    <Label>Estimated Duration</Label>
                    <Input placeholder="e.g., 2-3 hours" />
                  </div>
                  <Button className="w-full">Add Service</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {myServices.map(service => (
              <Card key={service.id}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold">{service.name}</h4>
                      <p className="text-sm text-muted-foreground mt-1">{service.description}</p>
                      <div className="flex items-center gap-3 mt-3">
                        <Badge variant="secondary">KSh {service.basePrice.toLocaleString()}</Badge>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {service.estimatedDuration}
                        </span>
                      </div>
                      <Badge className="mt-2" variant="outline">
                        {service.stampType} stamp
                      </Badge>
                    </div>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="h-8 w-8">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="orders" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Incoming Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Service</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>AC System Diagnosis</TableCell>
                    <TableCell>Alex Morgan</TableCell>
                    <TableCell>Jun 28, 2026</TableCell>
                    <TableCell><Badge className="bg-amber-500">Pending</Badge></TableCell>
                    <TableCell>KSh 8,500</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Full Engine Service</TableCell>
                    <TableCell>Sarah Wanjiku</TableCell>
                    <TableCell>Jun 27, 2026</TableCell>
                    <TableCell><Badge className="bg-emerald-500">In Progress</Badge></TableCell>
                    <TableCell>KSh 18,500</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Brake Pad Replacement</TableCell>
                    <TableCell>David Ochieng</TableCell>
                    <TableCell>Jun 25, 2026</TableCell>
                    <TableCell><Badge className="bg-blue-500">Completed</Badge></TableCell>
                    <TableCell>KSh 12,000</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="earnings" className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">This Month</p>
                    <p className="text-2xl font-bold">KSh 85,400</p>
                  </div>
                  <DollarSign className="w-8 h-8 text-emerald-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Pending</p>
                    <p className="text-2xl font-bold">KSh 27,000</p>
                  </div>
                  <Clock className="w-8 h-8 text-amber-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Jobs</p>
                    <p className="text-2xl font-bold">18</p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Earnings History</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {myEarnings.map(e => (
                    <TableRow key={e.id}>
                      <TableCell>{e.description}</TableCell>
                      <TableCell>{e.date}</TableCell>
                      <TableCell className="font-medium">KSh {e.amount.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant={e.status === 'paid' ? 'default' : 'secondary'}>
                          {e.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {myNode.class === 'D' && (
          <TabsContent value="bays" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Bay Availability</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                  {Array.from({ length: myNode.bayCount || 6 }).map((_, i) => {
                    const isAvailable = i < (myNode.availableBays || 3);
                    return (
                      <div key={i} className={`p-4 rounded-lg border text-center ${isAvailable ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
                        <Wrench className={`w-6 h-6 mx-auto mb-2 ${isAvailable ? 'text-emerald-500' : 'text-red-500'}`} />
                        <p className="text-sm font-medium">Bay {i + 1}</p>
                        <Badge variant="outline" className={isAvailable ? 'border-emerald-500 text-emerald-500' : 'border-red-500 text-red-500'}>
                          {isAvailable ? 'Available' : 'Occupied'}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
