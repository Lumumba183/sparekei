import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Search, Filter, ShoppingCart, Star, Package, Wrench,
  Grid3X3, List, Heart, Share2, Shield, X
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { marketplaceListings, serviceNodes, serviceItems, cartItems, categoryHierarchy } from '@/data/mockData';
import { cn } from '@/lib/utils';

type Tab = 'parts' | 'services';

export default function MarketplacePage() {
  const [activeTab, setActiveTab] = useState<Tab>('parts');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [cart, setCart] = useState(cartItems);

  const filteredParts = marketplaceListings.filter(p => {
    const matchesSearch = !searchQuery || p.partName.toLowerCase().includes(searchQuery.toLowerCase()) || p.brandName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const addToCart = (item: typeof marketplaceListings[0]) => {
    setCart(prev => [...prev, {
      id: 'ci-' + Date.now(), type: 'part', name: item.partName, quantity: 1, price: item.unitPrice,
      supplierName: item.vendorName, escrowStatus: 'ESCROW'
    }]);
  };

  const _cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  void _cartTotal;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Marketplace</h1>
          <p className="text-muted-foreground text-sm">Buy parts and book services</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="relative" onClick={() => {}}>
            <ShoppingCart className="w-4 h-4 mr-2" /> Cart
            {cart.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-[10px] text-white rounded-full flex items-center justify-center font-bold">{cart.length}</span>
            )}
          </Button>
        </div>
      </div>

      {/* Search & Tabs */}
      <Card className="glass-card">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search parts, services, brands..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
                <Filter className="w-4 h-4 mr-1" /> Filters
              </Button>
              <div className="flex border rounded-lg overflow-hidden">
                <button onClick={() => setViewMode('grid')} className={cn("p-2", viewMode === 'grid' && "bg-primary text-white")}>
                  <Grid3X3 className="w-4 h-4" />
                </button>
                <button onClick={() => setViewMode('list')} className={cn("p-2", viewMode === 'list' && "bg-primary text-white")}>
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <button onClick={() => setActiveTab('parts')} className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-all",
              activeTab === 'parts' ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:text-foreground"
            )}>
              Parts ({marketplaceListings.length})
            </button>
            <button onClick={() => setActiveTab('services')} className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-all",
              activeTab === 'services' ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:text-foreground"
            )}>
              Services ({serviceItems.length})
            </button>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-6">
        {/* Sidebar Filters */}
        {showFilters && (
          <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: 240, opacity: 1 }} className="shrink-0 overflow-hidden">
            <Card className="glass-card">
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">Categories</h3>
                  <button onClick={() => setShowFilters(false)}><X className="w-4 h-4" /></button>
                </div>
                {categoryHierarchy.map(cat => (
                  <div key={cat.name} className="space-y-1">
                    <button onClick={() => setSelectedCategory(selectedCategory === cat.name ? null : cat.name)}
                      className={cn("text-sm w-full text-left py-1 px-2 rounded hover:bg-accent/50", selectedCategory === cat.name && "text-primary font-medium bg-primary/10")}>
                      {cat.name}
                    </button>
                  </div>
                ))}
                <div className="pt-2 border-t border-border">
                  <h3 className="font-medium mb-2">Condition</h3>
                  {['NEW_OEM', 'CERTIFIED', 'REFURBISHED'].map(c => (
                    <label key={c} className="flex items-center gap-2 text-sm py-1 cursor-pointer">
                      <input type="checkbox" className="rounded" />
                      <span>{c.replace('_', ' ')}</span>
                    </label>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Content */}
        <div className="flex-1">
          {activeTab === 'parts' ? (
            <div className={cn(viewMode === 'grid' ? "grid sm:grid-cols-2 xl:grid-cols-3 gap-4" : "space-y-3")}>
              {filteredParts.map((listing, i) => (
                <motion.div key={listing.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <Card className={cn("glass-card-hover overflow-hidden", viewMode === 'list' && "flex flex-row")}>
                    <div className={cn("bg-muted flex items-center justify-center", viewMode === 'grid' ? "h-40" : "w-32 shrink-0")}>
                      <Package className="w-10 h-10 text-muted-foreground/50" />
                    </div>
                    <CardContent className={cn("p-4", viewMode === 'list' && "flex-1")}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-medium text-sm truncate">{listing.partName}</h3>
                            {listing.vendorVerified && <Shield className="w-3 h-3 text-primary shrink-0" />}
                          </div>
                          <p className="text-xs text-muted-foreground">{listing.brandName} • {listing.category}</p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <button className="p-1 rounded hover:bg-accent"><Heart className="w-3.5 h-3.5 text-muted-foreground" /></button>
                          <button className="p-1 rounded hover:bg-accent"><Share2 className="w-3.5 h-3.5 text-muted-foreground" /></button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex items-center gap-0.5">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                          <span className="text-xs">{listing.rating}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">({listing.reviewCount})</span>
                        <Badge variant="outline" className="text-[10px]">{listing.condition.replace('_', ' ')}</Badge>
                      </div>
                      <div className="flex items-center justify-between mt-3">
                        <div>
                          <p className="text-lg font-bold">KSh {listing.unitPrice.toLocaleString()}</p>
                          {listing.wholesalePrice && <p className="text-xs text-muted-foreground">Wholesale: KSh {listing.wholesalePrice.toLocaleString()}</p>}
                        </div>
                        <Button size="sm" onClick={() => addToCart(listing)}>
                          <ShoppingCart className="w-3.5 h-3.5 mr-1" /> Add
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <Package className="w-3 h-3" /> {listing.stockLevel} in stock • {listing.vendorName}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Service Classes */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { class: 'A', name: 'Aesthetic & Care', desc: 'Car washes, detailing, tinting', color: 'from-pink-500 to-rose-500', icon: 'Sparkles' },
                  { class: 'B', name: 'Structural Restoration', desc: 'Panel beating, spray painting', color: 'from-blue-500 to-indigo-500', icon: 'Wrench' },
                  { class: 'C', name: 'Precision Diagnostics', desc: 'ECU tuning, AC repair, electrics', color: 'from-cyan-500 to-teal-500', icon: 'Cpu' },
                  { class: 'D', name: 'Enterprise Workshops', desc: 'Multi-bay, fleet service', color: 'from-amber-500 to-orange-500', icon: 'Building' },
                ].map((sc, i) => (
                  <motion.div key={sc.class} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                    <Card className="glass-card-hover overflow-hidden cursor-pointer group">
                      <div className={cn("h-2 bg-gradient-to-r", sc.color)} />
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={cn("text-white bg-gradient-to-r", sc.color)}>Class {sc.class}</Badge>
                        </div>
                        <h3 className="font-medium text-sm">{sc.name}</h3>
                        <p className="text-xs text-muted-foreground mt-1">{sc.desc}</p>
                        <p className="text-xs text-primary mt-2">{serviceNodes.filter(n => n.class === sc.class as 'A' | 'B' | 'C' | 'D').length} providers</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>

              {/* Service Nodes */}
              <h3 className="font-semibold flex items-center gap-2"><Package className="w-4 h-4 text-primary" /> Service Providers</h3>
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {serviceNodes.map((node, idx) => (
                  <motion.div key={node.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}>
                    <Card className="glass-card-hover">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                            <Package className="w-6 h-6 text-muted-foreground" />
                          </div>
                          <Badge variant="outline" className="text-[10px]">Class {node.class}</Badge>
                        </div>
                        <h3 className="font-medium mt-3">{node.businessName}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex items-center gap-0.5">
                            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                            <span className="text-xs">{node.rating}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">({node.reviewCount})</span>
                          {node.verified && <Shield className="w-3 h-3 text-primary" />}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          <span className="text-primary">{node.distance}</span> • {node.address}
                        </p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {node.specializations.slice(0, 3).map(s => (
                            <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>
                          ))}
                        </div>
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                          <p className="text-sm font-semibold">KSh {node.basePriceMin.toLocaleString()}+</p>
                          <Button size="sm" variant="outline" className="h-7 text-xs">Book Now</Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>

              {/* Service Items */}
              <h3 className="font-semibold flex items-center gap-2"><Package className="w-4 h-4 text-primary" /> Popular Services</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                {serviceItems.map((item) => (
                  <Card key={item.id} className="glass-card-hover">
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Wrench className="w-6 h-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm">{item.name}</h4>
                        <p className="text-xs text-muted-foreground">{item.estimatedDuration} • {item.category}</p>
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-sm font-bold">KSh {item.basePrice.toLocaleString()}</p>
                          <Badge variant="outline" className="text-[10px]">{item.stampType}</Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
