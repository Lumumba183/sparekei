import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { marketplaceListings } from '@/data/mockData';
import {
  Package, TrendingUp, DollarSign, FileText, Send,
  ArrowUpRight
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

const demandForecast = [
  { month: 'Jul', brakes: 420, oil: 680, suspension: 280, electrical: 350 },
  { month: 'Aug', brakes: 450, oil: 720, suspension: 310, electrical: 380 },
  { month: 'Sep', brakes: 510, oil: 790, suspension: 340, electrical: 420 },
  { month: 'Oct', brakes: 480, oil: 750, suspension: 320, electrical: 400 },
  { month: 'Nov', brakes: 550, oil: 820, suspension: 380, electrical: 450 },
  { month: 'Dec', brakes: 620, oil: 900, suspension: 420, electrical: 510 },
];

const rfqData = [
  { id: 'rfq-001', buyer: 'AutoParts Kenya Ltd', partName: 'Toyota Prado Brake Pads', quantity: 200, targetPrice: 3200, status: 'open', date: '2026-06-25' },
  { id: 'rfq-002', buyer: 'SpeedMax Auto', partName: 'Mobil 1 Engine Oil 5W-40', quantity: 500, targetPrice: 6800, status: 'quoted', date: '2026-06-24' },
  { id: 'rfq-003', buyer: 'EuroParts Nairobi', partName: 'Mann Air Filters', quantity: 150, targetPrice: 1300, status: 'closed', date: '2026-06-20' },
];

export default function WholesalerDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Wholesaler Dashboard</h1>
        <p className="text-muted-foreground">Bulk orders, demand forecasting, and market intelligence</p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active RFQs</p>
                <p className="text-3xl font-bold">12</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <FileText className="w-5 h-5 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Bulk Orders (MTD)</p>
                <p className="text-3xl font-bold">48</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Package className="w-5 h-5 text-emerald-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Revenue (MTD)</p>
                <p className="text-3xl font-bold">KSh 2.4M</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-amber-500" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-2 text-xs text-emerald-500">
              <ArrowUpRight className="w-3 h-3" /> +18% vs last month
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Market Trend</p>
                <p className="text-3xl font-bold">+24%</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-purple-500" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-2 text-xs text-emerald-500">
              <ArrowUpRight className="w-3 h-3" /> Demand increasing
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="rfq" className="space-y-4">
        <TabsList>
          <TabsTrigger value="rfq">RFQ Management</TabsTrigger>
          <TabsTrigger value="forecast">Demand Forecasting</TabsTrigger>
          <TabsTrigger value="trends">Market Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="rfq" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Request for Quotations</h3>
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>RFQ ID</TableHead>
                    <TableHead>Buyer</TableHead>
                    <TableHead>Part</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Target Price</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rfqData.map(rfq => (
                    <TableRow key={rfq.id}>
                      <TableCell className="font-mono text-xs">{rfq.id}</TableCell>
                      <TableCell>{rfq.buyer}</TableCell>
                      <TableCell>{rfq.partName}</TableCell>
                      <TableCell>{rfq.quantity}</TableCell>
                      <TableCell>KSh {rfq.targetPrice.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant={rfq.status === 'open' ? 'default' : rfq.status === 'quoted' ? 'secondary' : 'outline'}>
                          {rfq.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="outline" disabled={rfq.status === 'closed'}>
                              <Send className="w-3 h-3 mr-1" /> Quote
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Submit Quotation</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div><span className="text-muted-foreground">Part:</span> {rfq.partName}</div>
                                <div><span className="text-muted-foreground">Quantity:</span> {rfq.quantity}</div>
                                <div><span className="text-muted-foreground">Target:</span> KSh {rfq.targetPrice.toLocaleString()}</div>
                                <div><span className="text-muted-foreground">Buyer:</span> {rfq.buyer}</div>
                              </div>
                              <div className="space-y-2">
                                <label className="text-sm font-medium">Your Price (KSh)</label>
                                <Input type="number" placeholder="Enter your price" />
                              </div>
                              <div className="space-y-2">
                                <label className="text-sm font-medium">Delivery Timeline</label>
                                <Input placeholder="e.g., 7 business days" />
                              </div>
                              <div className="space-y-2">
                                <label className="text-sm font-medium">Notes</label>
                                <Textarea placeholder="Any additional terms..." />
                              </div>
                              <Button className="w-full">Submit Quotation</Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="forecast" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">6-Month Demand Forecast by Category</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={demandForecast}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="brakes" fill="#3b82f6" name="Brake System" />
                  <Bar dataKey="oil" fill="#10b981" name="Engine Oil" />
                  <Bar dataKey="suspension" fill="#f59e0b" name="Suspension" />
                  <Bar dataKey="electrical" fill="#8b5cf6" name="Electrical" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Top Selling Parts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {marketplaceListings.slice(0, 5).map((item, i) => (
                    <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-accent/50">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold">{i + 1}</span>
                        <div>
                          <p className="text-sm font-medium">{item.partName}</p>
                          <p className="text-xs text-muted-foreground">{item.brandName}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{item.stockLevel} units</p>
                        <p className="text-xs text-muted-foreground">KSh {item.unitPrice.toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Price Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={[
                    { month: 'Jan', price: 4200 }, { month: 'Feb', price: 4350 },
                    { month: 'Mar', price: 4100 }, { month: 'Apr', price: 4500 },
                    { month: 'May', price: 4800 }, { month: 'Jun', price: 4600 },
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis domain={[3500, 5500]} />
                    <Tooltip />
                    <Area type="monotone" dataKey="price" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.1} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
