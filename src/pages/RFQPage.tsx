import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { FileText, Send, CheckCircle, Clock } from 'lucide-react';

const rfqs = [
  { id: 'RFQ-2026-001', buyer: 'AutoParts Kenya Ltd', partName: 'Toyota Prado Front Brake Pads', sku: 'BRK-PAD-TY-001', quantity: 200, targetPrice: 3200, delivery: '14 days', status: 'open', date: '2026-06-25', responses: 0 },
  { id: 'RFQ-2026-002', buyer: 'SpeedMax Auto', partName: 'Mobil 1 ESP 5W-40 (5L)', sku: 'OIL-5W40-001', quantity: 500, targetPrice: 6800, delivery: '10 days', status: 'quoted', date: '2026-06-24', responses: 3 },
  { id: 'RFQ-2026-003', buyer: 'EuroParts Nairobi', partName: 'Mann Air Filter C 30 005', sku: 'FIL-AIR-001', quantity: 150, targetPrice: 1300, delivery: '7 days', status: 'closed', date: '2026-06-20', responses: 2 },
  { id: 'RFQ-2026-004', buyer: 'FleetPro Ltd', partName: 'Varta AGM Battery 95Ah', sku: 'BAT-001', quantity: 50, targetPrice: 24000, delivery: '5 days', status: 'open', date: '2026-06-26', responses: 1 },
];

const quotations = [
  { id: 'QT-001', rfqId: 'RFQ-2026-002', supplier: 'OilMax Distributors', price: 6500, deliveryDays: 8, message: 'Bulk discount applied for 500 units' },
  { id: 'QT-002', rfqId: 'RFQ-2026-002', supplier: 'Lubricants Plus', price: 6700, deliveryDays: 10, message: 'Includes free shipping' },
  { id: 'QT-003', rfqId: 'RFQ-2026-002', supplier: 'AutoLube EA', price: 6400, deliveryDays: 12, message: 'Payment terms: Net 30' },
];

export default function RFQPage() {
  const [activeTab, setActiveTab] = useState('incoming');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Request for Quotation</h1>
          <p className="text-muted-foreground">Manage RFQs and submit quotations</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <FileText className="w-4 h-4" /> New RFQ
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Submit New RFQ</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Part Name / SKU</label>
                <Input placeholder="e.g., Toyota Prado Brake Pads" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Quantity</label>
                  <Input type="number" placeholder="100" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Target Price (KSh)</label>
                  <Input type="number" placeholder="3000" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Delivery Timeline</label>
                <Input placeholder="e.g., 14 business days" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Additional Details</label>
                <Textarea placeholder="Specifications, quality requirements..." />
              </div>
              <Button className="w-full">Submit RFQ</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="incoming">Incoming RFQs</TabsTrigger>
          <TabsTrigger value="my-rfqs">My RFQs</TabsTrigger>
          <TabsTrigger value="quotations">Quotations</TabsTrigger>
        </TabsList>

        <TabsContent value="incoming" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>RFQ ID</TableHead>
                    <TableHead>Buyer</TableHead>
                    <TableHead>Part</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rfqs.filter(r => r.status !== 'closed').map(rfq => (
                    <TableRow key={rfq.id}>
                      <TableCell className="font-mono text-xs">{rfq.id}</TableCell>
                      <TableCell>{rfq.buyer}</TableCell>
                      <TableCell>
                        <div className="font-medium">{rfq.partName}</div>
                        <div className="text-xs text-muted-foreground">{rfq.sku}</div>
                      </TableCell>
                      <TableCell>{rfq.quantity}</TableCell>
                      <TableCell>KSh {rfq.targetPrice.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant={rfq.status === 'open' ? 'default' : 'secondary'}>
                          {rfq.status === 'open' ? <Clock className="w-3 h-3 mr-1" /> : <CheckCircle className="w-3 h-3 mr-1" />}
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
                              <DialogTitle>Submit Quotation for {rfq.id}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              <div className="p-3 rounded-lg bg-accent/50 text-sm space-y-1">
                                <p><span className="text-muted-foreground">Part:</span> {rfq.partName}</p>
                                <p><span className="text-muted-foreground">Quantity:</span> {rfq.quantity}</p>
                                <p><span className="text-muted-foreground">Target:</span> KSh {rfq.targetPrice.toLocaleString()}</p>
                              </div>
                              <Input type="number" placeholder="Your price per unit (KSh)" />
                              <Input placeholder="Delivery timeline" />
                              <Textarea placeholder="Terms & conditions" />
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

        <TabsContent value="my-rfqs" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>RFQ ID</TableHead>
                    <TableHead>Part</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Responses</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rfqs.map(rfq => (
                    <TableRow key={rfq.id}>
                      <TableCell className="font-mono text-xs">{rfq.id}</TableCell>
                      <TableCell>{rfq.partName}</TableCell>
                      <TableCell>{rfq.quantity}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{rfq.responses} received</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={rfq.status === 'open' ? 'default' : rfq.status === 'quoted' ? 'secondary' : 'outline'}>
                          {rfq.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{rfq.date}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quotations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Received Quotations for RFQ-2026-002</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {quotations.map(qt => (
                <div key={qt.id} className="flex items-center justify-between p-4 rounded-lg bg-accent/30 border">
                  <div>
                    <p className="font-medium">{qt.supplier}</p>
                    <p className="text-sm text-muted-foreground">{qt.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">Delivery: {qt.deliveryDays} days</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-emerald-500">KSh {qt.price.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">per unit</p>
                    <div className="flex gap-2 mt-2">
                      <Button size="sm">Accept</Button>
                      <Button size="sm" variant="outline">Negotiate</Button>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
