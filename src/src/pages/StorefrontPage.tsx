import { useState } from 'react';
import { Plus, Package, Star, Pencil, Trash2, Eye } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { marketplaceListings } from '@/data/mockData';

export default function StorefrontPage() {
  const [listings] = useState(marketplaceListings);
  const [search, setSearch] = useState('');
  const filtered = listings.filter(l => l.partName.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">My Storefront</h1>
          <p className="text-muted-foreground text-sm">Manage your product listings</p>
        </div>
        <Button><Plus className="w-4 h-4 mr-2" /> Add Product</Button>
      </div>

      <div className="flex gap-3">
        <Input placeholder="Search your listings..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-sm" />
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(l => (
          <Card key={l.id} className="glass-card-hover overflow-hidden">
            <div className="h-32 bg-muted flex items-center justify-center">
              <Package className="w-12 h-12 text-muted-foreground/50" />
            </div>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <h3 className="font-medium text-sm line-clamp-2 flex-1">{l.partName}</h3>
                <div className="flex gap-1 ml-2">
                  <button className="p-1 rounded hover:bg-accent"><Pencil className="w-3 h-3 text-muted-foreground" /></button>
                  <button className="p-1 rounded hover:bg-accent"><Trash2 className="w-3 h-3 text-muted-foreground" /></button>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <div className="flex items-center gap-0.5"><Star className="w-3 h-3 fill-amber-400 text-amber-400" /><span className="text-xs">{l.rating}</span></div>
                <Badge variant="outline" className="text-[10px]">{l.condition.replace('_', ' ')}</Badge>
              </div>
              <div className="flex items-center justify-between mt-3">
                <div>
                  <p className="font-bold">KSh {l.unitPrice.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Stock: {l.stockLevel}</p>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" className="h-7 text-xs"><Eye className="w-3 h-3 mr-1" />View</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        <Card className="border-dashed border-2 border-border flex items-center justify-center min-h-[250px] cursor-pointer hover:border-primary/30 transition-colors">
          <div className="text-center">
            <Plus className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm font-medium">Add New Product</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
