import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { fleetVehicles, complianceRecords } from '@/data/mockData';
import {
  Truck, AlertTriangle, CheckCircle, Calendar,
  TrendingUp, Gauge, Users
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const statusConfig = {
  HEALTHY: { color: 'bg-emerald-500', label: 'Healthy', icon: CheckCircle },
  ATTENTION: { color: 'bg-amber-500', label: 'Attention', icon: AlertTriangle },
  CRITICAL: { color: 'bg-red-500', label: 'Critical', icon: AlertTriangle },
};

const maintenanceData = [
  { month: 'Jan', cost: 125000, downtime: 12 },
  { month: 'Feb', cost: 98000, downtime: 8 },
  { month: 'Mar', cost: 145000, downtime: 15 },
  { month: 'Apr', cost: 110000, downtime: 10 },
  { month: 'May', cost: 89000, downtime: 7 },
  { month: 'Jun', cost: 132000, downtime: 11 },
];

const fuelData = [
  { name: 'Toyota Hiace', efficiency: 8.2 },
  { name: 'Mitsubishi Canter', efficiency: 6.5 },
  { name: 'Toyota Hilux', efficiency: 9.1 },
  { name: 'Isuzu NPR', efficiency: 5.8 },
];

export default function FleetManagerDashboard() {

  const healthy = fleetVehicles.filter(v => v.riskStatus === 'HEALTHY').length;
  const attention = fleetVehicles.filter(v => v.riskStatus === 'ATTENTION').length;
  const critical = fleetVehicles.filter(v => v.riskStatus === 'CRITICAL').length;
  const totalOdometer = fleetVehicles.reduce((sum, v) => sum + v.currentOdometer, 0);

  const pieData = [
    { name: 'Healthy', value: healthy, color: '#10b981' },
    { name: 'Attention', value: attention, color: '#f59e0b' },
    { name: 'Critical', value: critical, color: '#ef4444' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Fleet Command Center</h1>
          <p className="text-muted-foreground">Manage and monitor your entire vehicle fleet</p>
        </div>
        <Button variant="outline" className="gap-2">
          <Calendar className="w-4 h-4" />
          Schedule Maintenance
        </Button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Vehicles</p>
                <p className="text-3xl font-bold">{fleetVehicles.length}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Truck className="w-5 h-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Fleet Health</p>
                <p className="text-3xl font-bold">{Math.round((healthy / fleetVehicles.length) * 100)}%</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Gauge className="w-5 h-5 text-emerald-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Mileage</p>
                <p className="text-3xl font-bold">{(totalOdometer / 1000).toFixed(0)}k</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Drivers</p>
                <p className="text-3xl font-bold">{fleetVehicles.filter(v => v.driverName).length}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Fleet Overview</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Vehicle Status Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Fleet Status Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value">
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex justify-center gap-4 mt-2">
                  {pieData.map(d => (
                    <div key={d.name} className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                      <span className="text-xs text-muted-foreground">{d.name} ({d.value})</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Critical Vehicles */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Fleet Vehicles</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vehicle</TableHead>
                      <TableHead>Driver</TableHead>
                      <TableHead>Mileage</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Service</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fleetVehicles.map(v => {
                      const status = statusConfig[v.riskStatus];
                      const StatusIcon = status.icon;
                      return (
                        <TableRow key={v.id} className="cursor-pointer hover:bg-accent/50">
                          <TableCell>
                            <div className="font-medium">{v.licensePlate}</div>
                            <div className="text-xs text-muted-foreground">{v.make} {v.model} {v.year}</div>
                          </TableCell>
                          <TableCell>{v.driverName || 'Unassigned'}</TableCell>
                          <TableCell>{v.currentOdometer.toLocaleString()} km</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`gap-1 ${v.riskStatus === 'HEALTHY' ? 'border-emerald-500 text-emerald-500' : v.riskStatus === 'ATTENTION' ? 'border-amber-500 text-amber-500' : 'border-red-500 text-red-500'}`}>
                              <StatusIcon className="w-3 h-3" />
                              {status.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{v.lastServiceDate}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="maintenance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Maintenance Schedule</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Service Type</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fleetVehicles.map(v => (
                    <TableRow key={v.id}>
                      <TableCell>
                        <div className="font-medium">{v.licensePlate}</div>
                        <div className="text-xs text-muted-foreground">{v.make} {v.model}</div>
                      </TableCell>
                      <TableCell>Routine Service</TableCell>
                      <TableCell>
                        {v.riskStatus === 'CRITICAL' ? 'Overdue' : v.riskStatus === 'ATTENTION' ? 'Within 2 weeks' : 'On Schedule'}
                      </TableCell>
                      <TableCell>
                        <Badge className={v.riskStatus === 'CRITICAL' ? 'bg-red-500' : v.riskStatus === 'ATTENTION' ? 'bg-amber-500' : 'bg-emerald-500'}>
                          {v.riskStatus === 'CRITICAL' ? 'High' : v.riskStatus === 'ATTENTION' ? 'Medium' : 'Low'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline">Schedule</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Compliance Tracking</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Document Type</TableHead>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Issue Date</TableHead>
                    <TableHead>Expiry Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {complianceRecords.map(c => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.type}</TableCell>
                      <TableCell>{c.vehicleId === 'v-001' ? 'KDB 123X' : 'KDC 456Y'}</TableCell>
                      <TableCell>{c.issueDate}</TableCell>
                      <TableCell>{c.expiryDate}</TableCell>
                      <TableCell>
                        <Badge variant={c.status === 'valid' ? 'default' : c.status === 'expiring_soon' ? 'secondary' : 'destructive'}>
                          {c.status === 'valid' ? 'Valid' : c.status === 'expiring_soon' ? 'Expiring Soon' : 'Expired'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Maintenance Costs & Downtime</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={maintenanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="cost" fill="#3b82f6" name="Cost (KSh)" />
                    <Bar dataKey="downtime" fill="#f59e0b" name="Downtime (hrs)" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Fuel Efficiency by Vehicle</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={fuelData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" domain={[0, 12]} />
                    <YAxis dataKey="name" type="category" width={120} />
                    <Tooltip />
                    <Bar dataKey="efficiency" fill="#10b981" name="km/L" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
