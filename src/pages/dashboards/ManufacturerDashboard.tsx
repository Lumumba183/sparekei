import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import {
  Factory, TrendingUp, Truck, CheckCircle,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const productionData = [
  { month: 'Jan', planned: 5000, actual: 4800, defect: 120 },
  { month: 'Feb', planned: 5200, actual: 5100, defect: 98 },
  { month: 'Mar', planned: 5500, actual: 5300, defect: 85 },
  { month: 'Apr', planned: 4800, actual: 4900, defect: 110 },
  { month: 'May', planned: 6000, actual: 5800, defect: 95 },
  { month: 'Jun', planned: 6200, actual: 6100, defect: 78 },
];

const demandData = [
  { region: 'East Africa', demand: 45000, growth: 18 },
  { region: 'West Africa', demand: 32000, growth: 24 },
  { region: 'Southern Africa', demand: 28000, growth: 12 },
  { region: 'North Africa', demand: 21000, growth: 15 },
];

const distributionData = [
  { name: 'Warehouse A', stock: 85, capacity: 100 },
  { name: 'Warehouse B', stock: 62, capacity: 80 },
  { name: 'Warehouse C', stock: 45, capacity: 60 },
  { name: 'Warehouse D', stock: 38, capacity: 50 },
];

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

export default function ManufacturerDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Manufacturer Dashboard</h1>
        <p className="text-muted-foreground">Production insights, market demand, and distribution analytics</p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Production (MTD)</p>
                <p className="text-3xl font-bold">6,100</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Factory className="w-5 h-5 text-blue-500" />
              </div>
            </div>
            <p className="text-xs text-emerald-500 mt-2">+8% vs target</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Quality Score</p>
                <p className="text-3xl font-bold">98.7%</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-emerald-500" />
              </div>
            </div>
            <p className="text-xs text-emerald-500 mt-2">Defect rate: 1.3%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Market Demand</p>
                <p className="text-3xl font-bold">126K</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-amber-500" />
              </div>
            </div>
            <p className="text-xs text-emerald-500 mt-2">+17% YoY</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Distribution Fill</p>
                <p className="text-3xl font-bold">84%</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Truck className="w-5 h-5 text-purple-500" />
              </div>
            </div>
            <p className="text-xs text-amber-500 mt-2">3 warehouses low</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="production" className="space-y-4">
        <TabsList>
          <TabsTrigger value="production">Production</TabsTrigger>
          <TabsTrigger value="demand">Market Demand</TabsTrigger>
          <TabsTrigger value="distribution">Distribution</TabsTrigger>
          <TabsTrigger value="rfq">RFQ Responses</TabsTrigger>
        </TabsList>

        <TabsContent value="production" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Production vs Planned vs Defects</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={productionData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="planned" fill="#94a3b8" name="Planned" />
                  <Bar dataKey="actual" fill="#3b82f6" name="Actual" />
                  <Bar dataKey="defect" fill="#ef4444" name="Defects" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground">Capacity Utilization</p>
                <p className="text-2xl font-bold mt-1">94%</p>
                <Progress value={94} className="mt-3" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground">OEE Score</p>
                <p className="text-2xl font-bold mt-1">87.3%</p>
                <Progress value={87.3} className="mt-3" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground">On-Time Delivery</p>
                <p className="text-2xl font-bold mt-1">96.2%</p>
                <Progress value={96.2} className="mt-3" />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="demand" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Regional Demand</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={demandData} cx="50%" cy="50%" outerRadius={100} dataKey="demand" label>
                      {demandData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Demand Growth by Region</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {demandData.map(d => (
                    <div key={d.region} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>{d.region}</span>
                        <span className="font-medium">+{d.growth}%</span>
                      </div>
                      <Progress value={d.growth * 3} />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="distribution" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Warehouse Inventory Levels</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {distributionData.map(w => (
                  <div key={w.name} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{w.name}</span>
                      <span className="text-muted-foreground">{w.stock} / {w.capacity} units</span>
                    </div>
                    <Progress value={(w.stock / w.capacity) * 100} />
                    <div className="flex justify-between text-xs">
                      <span>{Math.round((w.stock / w.capacity) * 100)}% filled</span>
                      {w.stock / w.capacity < 0.5 && (
                        <Badge variant="outline" className="text-amber-500 border-amber-500">Low Stock</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rfq" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Incoming RFQ Requests</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>RFQ ID</TableHead>
                    <TableHead>Part</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Region</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-mono text-xs">rfq-004</TableCell>
                    <TableCell>Toyota Brake Pads</TableCell>
                    <TableCell>1,000</TableCell>
                    <TableCell>East Africa</TableCell>
                    <TableCell><Badge>Open</Badge></TableCell>
                    <TableCell><Button size="sm">Quote</Button></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-mono text-xs">rfq-005</TableCell>
                    <TableCell>Engine Oil Filters</TableCell>
                    <TableCell>2,500</TableCell>
                    <TableCell>West Africa</TableCell>
                    <TableCell><Badge variant="secondary">Quoted</Badge></TableCell>
                    <TableCell><Button size="sm" variant="outline">View</Button></TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-mono text-xs">rfq-006</TableCell>
                    <TableCell>Air Filters</TableCell>
                    <TableCell>800</TableCell>
                    <TableCell>Southern Africa</TableCell>
                    <TableCell><Badge variant="outline">Closed</Badge></TableCell>
                    <TableCell><Button size="sm" variant="ghost">Details</Button></TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
