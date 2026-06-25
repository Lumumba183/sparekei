import { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Car, Wrench, FileCheck, Share2, QrCode, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { vehicles, maintenanceLogs, complianceRecords } from '@/data/mockData';
import { cn } from '@/lib/utils';

export default function VehiclePassportPage() {
  const [activeVehicle] = useState(vehicles[0]);
  const vehicleLogs = maintenanceLogs.filter(l => l.vehicleId === activeVehicle.id);
  const vehicleCompliance = complianceRecords.filter(c => c.vehicleId === activeVehicle.id);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Digital Vehicle Passport</h1>
          <p className="text-muted-foreground text-sm">Tamper-evident vehicle identity ledger</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm"><Share2 className="w-4 h-4 mr-2" /> Share</Button>
          <Button variant="outline" size="sm"><QrCode className="w-4 h-4 mr-2" /> Verify</Button>
        </div>
      </div>

      {/* Vehicle Identity Card */}
      <Card className="glass-card overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-primary via-accent to-success" />
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-6">
            <img src={activeVehicle.image} alt={activeVehicle.model} className="w-full sm:w-48 h-32 object-cover rounded-xl" />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-xl font-bold">{activeVehicle.make} {activeVehicle.model}</h2>
                <Badge variant="outline" className="text-success border-success gap-1">
                  <Shield className="w-3 h-3" /> Verified
                </Badge>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
                {[
                  { label: 'VIN', value: activeVehicle.vin },
                  { label: 'Registration', value: activeVehicle.registration },
                  { label: 'Year', value: activeVehicle.year.toString() },
                  { label: 'Engine', value: activeVehicle.engineNumber || 'N/A' },
                  { label: 'Chassis', value: activeVehicle.chassis || 'N/A' },
                  { label: 'Color', value: activeVehicle.color },
                  { label: 'Mileage', value: activeVehicle.mileage.toLocaleString() + ' km' },
                  { label: 'Health', value: activeVehicle.healthScore + '%' },
                ].map(item => (
                  <div key={item.label}>
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <p className="text-sm font-mono font-medium truncate">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="ledger" className="space-y-6">
        <TabsList className="bg-card border">
          <TabsTrigger value="ledger" className="gap-2"><Wrench className="w-4 h-4" /> Service Ledger</TabsTrigger>
          <TabsTrigger value="compliance" className="gap-2"><FileCheck className="w-4 h-4" /> Compliance</TabsTrigger>
          <TabsTrigger value="resale" className="gap-2"><Share2 className="w-4 h-4" /> Resale Value</TabsTrigger>
        </TabsList>

        <TabsContent value="ledger" className="space-y-4">
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-6 top-0 bottom-0 w-px bg-border" />
            
            {vehicleLogs.map((log, i) => (
              <motion.div key={log.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }} className="relative pl-14 pb-6">
                {/* Timeline dot */}
                <div className={cn("absolute left-4 w-5 h-5 rounded-full border-2 bg-background flex items-center justify-center",
                  log.isVerified ? 'border-success' : 'border-warning'
                )}>
                  {log.isVerified ? <CheckCircle className="w-3 h-3 text-success" /> : <AlertTriangle className="w-3 h-3 text-warning" />}
                </div>
                
                <Card className="glass-card">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{log.serviceType}</h3>
                          <Badge variant="outline" className="text-[10px] capitalize">{log.stampType} Stamp</Badge>
                          {log.isVerified && <Badge variant="outline" className="text-[10px] text-success border-success gap-1"><Shield className="w-3 h-3" />Verified</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{log.serviceProviderName}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(log.performedAt).toLocaleDateString()}</span>
                          <span>{log.mileage.toLocaleString()} km</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">KSh {log.cost.toLocaleString()}</p>
                      </div>
                    </div>
                    {log.partsUsed.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-border">
                        <p className="text-xs text-muted-foreground mb-2">Parts Used:</p>
                        <div className="flex flex-wrap gap-2">
                          {log.partsUsed.map(part => (
                            <Badge key={part.sku} variant="secondary" className="text-[10px] gap-1">
                              <Car className="w-3 h-3" />{part.name} x{part.quantity}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="compliance" className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            {vehicleCompliance.map(record => (
              <Card key={record.id} className={cn("glass-card",
                record.status === 'expiring_soon' && "border-warning/50",
                record.status === 'expired' && "border-emergency/50"
              )}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                      record.status === 'valid' ? 'bg-success/10' : record.status === 'expiring_soon' ? 'bg-warning/10' : 'bg-emergency/10'
                    )}>
                      <FileCheck className={cn("w-5 h-5",
                        record.status === 'valid' ? 'text-success' : record.status === 'expiring_soon' ? 'text-warning' : 'text-emergency'
                      )} />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{record.type}</p>
                      <p className="text-xs text-muted-foreground">{record.region}</p>
                    </div>
                    <Badge variant={record.status === 'valid' ? 'default' : record.status === 'expiring_soon' ? 'secondary' : 'destructive'} className="text-[10px]">
                      {record.status.replace('_', ' ')}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
                    <span>Issued: {new Date(record.issueDate).toLocaleDateString()}</span>
                    <span>Expires: {new Date(record.expiryDate).toLocaleDateString()}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="resale">
          <Card className="glass-card">
            <CardContent className="p-8 text-center space-y-4">
              <div className="w-20 h-20 mx-auto rounded-full bg-success/10 flex items-center justify-center">
                <Shield className="w-10 h-10 text-success" />
              </div>
              <h3 className="text-xl font-bold">Resale Value Engine</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Generate a secure, read-only shareable webpage with your vehicle's complete service pedigree and compliance status.
              </p>
              <div className="flex gap-4 justify-center">
                <div className="text-center p-4 rounded-xl bg-muted/50">
                  <p className="text-2xl font-bold text-success">92%</p>
                  <p className="text-xs text-muted-foreground">Service History</p>
                </div>
                <div className="text-center p-4 rounded-xl bg-muted/50">
                  <p className="text-2xl font-bold text-primary">100%</p>
                  <p className="text-xs text-muted-foreground">Compliance</p>
                </div>
                <div className="text-center p-4 rounded-xl bg-muted/50">
                  <p className="text-2xl font-bold text-accent">+15%</p>
                  <p className="text-xs text-muted-foreground">Value Boost</p>
                </div>
              </div>
              <Button className="gap-2"><Share2 className="w-4 h-4" /> Generate Shareable Report</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
