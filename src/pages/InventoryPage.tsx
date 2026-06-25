import { useState } from 'react';
import { Package, AlertTriangle, Search, Plus, Minus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { marketplaceListings } from '@/data/mockData';
import { cn } from '@/lib/utils';

export default function InventoryPage() {
  const [inventory, setInventory] = useState(marketplaceListings.map(l => ({ ...l, lowThreshold: 20 })));
  const [search, setSearch] = useState('');
  const filtered = inventory.filter(i => i.partName.toLowerCase().includes(search.toLowerCase()));
  const lowStock = inventory.filter(i => i.stockLevel <= i.lowThreshold);

  const adjustStock = (id: string, delta: number) => {
    setInventory(prev => prev.map(i => i.id === id ? { ...i, stockLevel: Math.max(0, i.stockLevel + delta) } : i));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Inventory</h1>
          <p className="text-muted-foreground text-sm">Manage your parts stock levels</p>
        </div>
        <Button><Plus className="w-4 h-4 mr-2" /> Add Stock</Button>
      </div>

      {lowStock.length > 0 && (
        <Card className="border-warning/50 bg-warning/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-warning mb-2">
              <AlertTriangle className="w-5 h-5" />
              <span className="font-medium">Low Stock Alert: {lowStock.length} items below threshold</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {lowStock.map(i => (
                <Badge key={i.id} variant="outline" className="text-warning border-warning text-[10px]">{i.partName}: {i.stockLevel} left</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search inventory..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
      </div>

      <div className="space-y-3">
        {filtered.map(item => (
          <Card key={item.id} className={cn("glass-card", item.stockLevel <= item.lowThreshold && "border-warning/50")}>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <Package className="w-6 h-6 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm">{item.partName}</p>
                  {item.stockLevel <= item.lowThreshold && <Badge variant="destructive" className="text-[10px]"><AlertTriangle className="w-3 h-3 mr-1" />Low</Badge>}
                </div>
                <p className="text-xs text-muted-foreground">{item.brandName} • {item.category}</p>
                <div className="mt-2">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Stock Level</span>
                    <span className={cn(item.stockLevel <= item.lowThreshold && "text-warning")}>{item.stockLevel} units</span>
                  </div>
                  <Progress value={Math.min(100, (item.stockLevel / 100) * 100)} className="h-2"
                    style={{ '--progress-color': item.stockLevel <= item.lowThreshold ? 'hsl(var(--warning))' : undefined } as React.CSSProperties} />
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => adjustStock(item.id, -1)}><Minus className="w-4 h-4" /></Button>
                <span className="w-10 text-center font-medium">{item.stockLevel}</span>
                <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => adjustStock(item.id, 1)}><Plus className="w-4 h-4" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
