import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  TrendingUp, Package, Star,
  Plus, ArrowUpRight, ArrowDownRight, AlertTriangle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { vendorMetrics, marketplaceListings } from '@/data/mockData';

export default function VendorDashboard() {
  const navigate = useNavigate();
  const myListings = marketplaceListings.slice(0, 4);
  const lowStock = myListings.filter(l => l.stockLevel < 20);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Vendor Center</h1>
          <p className="text-muted-foreground text-sm">Manage your storefront and inventory</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/inventory')}>
            <Package className="w-4 h-4 mr-2" /> Inventory
          </Button>
          <Button onClick={() => navigate('/storefront')}>
            <Plus className="w-4 h-4 mr-2" /> Add Product
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {vendorMetrics.map((m, i) => (
          <motion.div key={m.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <Card className="glass-card-hover">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-5 h-5 text-primary"><m.icon /></div>
                  {m.trend && m.change !== undefined && (
                    <Badge variant={m.trend === 'up' ? 'default' : 'destructive'} className="text-[10px] gap-1">
                      {m.trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                      {m.change}%
                    </Badge>
                  )}
                </div>
                <p className="text-2xl font-bold">{m.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{m.label}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="glass-card lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Product Listings</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/storefront')}>View All</Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {myListings.map(listing => (
              <div key={listing.id} className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
                <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <Package className="w-6 h-6 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">{listing.partName}</p>
                    {listing.vendorVerified && <Badge variant="outline" className="text-[10px] text-primary border-primary shrink-0">Verified</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">{listing.brandName} • {listing.category}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs flex items-center gap-1"><Star className="w-3 h-3 fill-amber-400 text-amber-400" />{listing.rating}</span>
                    <span className="text-xs text-muted-foreground">{listing.reviewCount} reviews</span>
                    <span className="text-xs text-muted-foreground">Stock: {listing.stockLevel}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold">KSh {listing.unitPrice.toLocaleString()}</p>
                  {listing.stockLevel < 20 && (
                    <Badge variant="destructive" className="text-[10px] mt-1"><AlertTriangle className="w-3 h-3 mr-1" />Low Stock</Badge>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" /> Sales Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center py-3">
                <p className="text-3xl font-bold">KSh 340,000</p>
                <p className="text-xs text-muted-foreground">This Month Revenue</p>
              </div>
              <div className="space-y-2">
                {[
                  { label: 'Today', value: 'KSh 18,500', pct: 65 },
                  { label: 'This Week', value: 'KSh 85,200', pct: 78 },
                  { label: 'This Month', value: 'KSh 340,000', pct: 92 },
                ].map(item => (
                  <div key={item.label}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">{item.label}</span>
                      <span className="font-medium">{item.value}</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${item.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {lowStock.length > 0 && (
            <Card className="glass-card border-warning/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-warning">
                  <AlertTriangle className="w-4 h-4" /> Stock Alerts ({lowStock.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {lowStock.map(item => (
                  <div key={item.id} className="flex items-center justify-between p-2 rounded bg-warning/10">
                    <span className="text-sm truncate flex-1">{item.partName}</span>
                    <Badge variant="destructive" className="text-[10px] shrink-0">{item.stockLevel} left</Badge>
                  </div>
                ))}
                <Button size="sm" variant="outline" className="w-full text-xs mt-2" onClick={() => navigate('/inventory')}>
                  Manage Inventory
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
