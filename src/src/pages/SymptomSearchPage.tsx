import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { serviceNodes, serviceItems, marketplaceListings } from '@/data/mockData';
import { Search, Wrench, MapPin, Star, Clock, Package, Thermometer, Zap, Droplets } from 'lucide-react';
import type { ServiceNode, ServiceItem } from '@/types';

const symptomMap: Record<string, { classes: string[]; keywords: string[]; relatedParts: string[] }> = {
  'engine overheating': { classes: ['C'], keywords: ['cooling', 'radiator', 'thermostat', 'water pump'], relatedParts: ['Radiator', 'Thermostat', 'Coolant'] },
  'brake noise': { classes: ['B', 'C'], keywords: ['brake', 'pads', 'discs', 'squeal'], relatedParts: ['Brake Pads', 'Brake Discs'] },
  'ac not cooling': { classes: ['C'], keywords: ['ac', 'compressor', 'refrigerant', 'hvac'], relatedParts: ['AC Compressor', 'Refrigerant'] },
  'check engine light': { classes: ['C'], keywords: ['diagnostic', 'ecu', 'sensor', 'engine'], relatedParts: ['O2 Sensor', 'Spark Plugs'] },
  'suspension noise': { classes: ['B', 'C'], keywords: ['shock', 'strut', 'suspension', 'bushing'], relatedParts: ['Shock Absorbers', 'Control Arms'] },
  'battery drain': { classes: ['C'], keywords: ['electrical', 'battery', 'alternator', 'wiring'], relatedParts: ['Battery', 'Alternator'] },
};

const classConfig: Record<string, { label: string; color: string; icon: typeof Wrench }> = {
  A: { label: 'Aesthetic & Care', color: 'bg-pink-500', icon: Droplets },
  B: { label: 'Structural Restoration', color: 'bg-orange-500', icon: Wrench },
  C: { label: 'Precision Diagnostics', color: 'bg-blue-500', icon: Zap },
  D: { label: 'Enterprise Workshop', color: 'bg-purple-500', icon: Thermometer },
};

export default function SymptomSearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ nodes: ServiceNode[]; items: ServiceItem[]; relatedParts: typeof marketplaceListings } | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = () => {
    setHasSearched(true);
    const normalized = query.toLowerCase().trim();
    
    const match = Object.entries(symptomMap).find(([key]) => normalized.includes(key) || key.includes(normalized));
    
    if (match) {
      const [, data] = match;
      const matchedNodes = serviceNodes.filter(n => data.classes.includes(n.class));
      const matchedItems = serviceItems.filter(i => 
        data.keywords.some(k => i.description.toLowerCase().includes(k) || i.category.toLowerCase().includes(k))
      );
      const matchedParts = marketplaceListings.filter(p => 
        data.relatedParts.some(r => p.partName.toLowerCase().includes(r.toLowerCase()) || p.category.toLowerCase().includes(r.toLowerCase()))
      );
      setResults({ nodes: matchedNodes, items: matchedItems, relatedParts: matchedParts });
    } else {
      // Fallback: search all
      const matchedNodes = serviceNodes.filter(n => 
        n.specializations.some(s => s.toLowerCase().includes(normalized)) ||
        n.businessName.toLowerCase().includes(normalized)
      );
      const matchedItems = serviceItems.filter(i => 
        i.name.toLowerCase().includes(normalized) || i.description.toLowerCase().includes(normalized)
      );
      setResults({ nodes: matchedNodes, items: matchedItems, relatedParts: [] });
    }
  };

  const popularSymptoms = ['AC not cooling', 'Brake noise', 'Engine overheating', 'Check engine light', 'Battery drain'];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Symptom-Based Search</h1>
        <p className="text-muted-foreground">Describe your vehicle issue and find the right service providers</p>
      </div>

      {/* Search Box */}
      <Card>
        <CardContent className="p-6">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input 
                placeholder="Describe the symptom (e.g., 'AC not cooling', 'brake noise', 'engine overheating')..."
                className="pl-10 h-12"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <Button size="lg" onClick={handleSearch} className="px-8">
              <Search className="w-4 h-4 mr-2" /> Find Services
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 mt-4">
            <span className="text-sm text-muted-foreground">Popular:</span>
            {popularSymptoms.map(s => (
              <Badge key={s} variant="secondary" className="cursor-pointer hover:bg-primary/20" onClick={() => { setQuery(s); handleSearch(); }}>
                {s}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {hasSearched && results && (
        <div className="space-y-6">
          {/* Matched Service Classes */}
          {results.nodes.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-3">Recommended Service Providers</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {results.nodes.map(node => {
                  const config = classConfig[node.class];
                  const ClassIcon = config.icon;
                  return (
                    <Card key={node.id} className="hover:border-primary/50 transition-colors">
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold">{node.businessName}</h4>
                              <Badge className={`${config.color} text-white text-[10px]`}>
                                Class {node.class}
                              </Badge>
                              {node.verified && <Badge variant="outline" className="text-[10px]">Verified</Badge>}
                            </div>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <MapPin className="w-3.5 h-3.5" /> {node.distance} · {node.address}
                            </div>
                            <div className="flex items-center gap-3 mt-2">
                              <span className="flex items-center gap-1 text-sm">
                                <Star className="w-4 h-4 text-amber-500 fill-amber-500" /> {node.rating} ({node.reviewCount})
                              </span>
                              <span className="text-sm text-muted-foreground">
                                KSh {node.basePriceMin.toLocaleString()} - {node.basePriceMax.toLocaleString()}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-1 mt-2">
                              {node.specializations.map(s => (
                                <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>
                              ))}
                            </div>
                            {node.bayCount && (
                              <p className="text-xs text-muted-foreground mt-2">
                                {node.availableBays} of {node.bayCount} bays available
                              </p>
                            )}
                          </div>
                          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                            <ClassIcon className="w-5 h-5 text-muted-foreground" />
                          </div>
                        </div>
                        <div className="flex gap-2 mt-4">
                          <Button size="sm" className="flex-1">Book Service</Button>
                          <Button size="sm" variant="outline">View Profile</Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Related Services */}
          {results.items.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-3">Matching Services</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {results.items.map(item => (
                  <Card key={item.id}>
                    <CardContent className="p-4">
                      <h4 className="font-medium">{item.name}</h4>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.description}</p>
                      <div className="flex items-center justify-between mt-3">
                        <Badge variant="outline" className="text-xs">
                          <Clock className="w-3 h-3 mr-1" /> {item.estimatedDuration}
                        </Badge>
                        <span className="font-semibold text-emerald-500">KSh {item.basePrice.toLocaleString()}</span>
                      </div>
                      <Button size="sm" className="w-full mt-3">Add to Cart</Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Related Parts */}
          {results.relatedParts.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-3">You May Also Need These Parts</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {results.relatedParts.map(part => (
                  <Card key={part.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Package className="w-4 h-4 text-blue-500" />
                        <Badge variant="outline" className="text-[10px]">{part.condition}</Badge>
                      </div>
                      <h4 className="font-medium text-sm">{part.partName}</h4>
                      <p className="text-xs text-muted-foreground">{part.brandName}</p>
                      <div className="flex items-center justify-between mt-3">
                        <span className="font-semibold">KSh {part.unitPrice.toLocaleString()}</span>
                        <Button size="sm" variant="outline">Add</Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {results.nodes.length === 0 && results.items.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium">No results found</p>
                <p className="text-muted-foreground">Try a different symptom or browse service categories</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
