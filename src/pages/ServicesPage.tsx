import { useState } from 'react';
import { motion } from 'framer-motion';
import { Wrench, Search, Star, MapPin, Shield, Phone } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { serviceNodes } from '@/data/mockData';
import { cn } from '@/lib/utils';

export default function ServicesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState<string | null>(null);

  const filteredNodes = serviceNodes.filter(n => {
    const matchesSearch = !searchQuery || n.businessName.toLowerCase().includes(searchQuery.toLowerCase()) || n.specializations.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesClass = !selectedClass || n.class === selectedClass;
    return matchesSearch && matchesClass;
  });

  const classConfig: Record<string, { name: string; color: string; bg: string; text: string }> = {
    A: { name: 'Aesthetic & Care', color: 'from-pink-500 to-rose-500', bg: 'bg-pink-500/10', text: 'text-pink-400' },
    B: { name: 'Structural Restoration', color: 'from-blue-500 to-indigo-500', bg: 'bg-blue-500/10', text: 'text-blue-400' },
    C: { name: 'Precision Diagnostics', color: 'from-cyan-500 to-teal-500', bg: 'bg-cyan-500/10', text: 'text-cyan-400' },
    D: { name: 'Enterprise Workshops', color: 'from-amber-500 to-orange-500', bg: 'bg-amber-500/10', text: 'text-amber-400' },
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Services Marketplace</h1>
        <p className="text-muted-foreground text-sm">Find and book automotive services near you</p>
      </div>

      {/* Symptom Search */}
      <Card className="glass-card">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input placeholder="Describe your problem (e.g., 'AC not cooling', 'brake noise')..." 
              value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-12 h-12 text-base" />
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            {['Engine overheating', 'Brake noise', 'AC not cooling', 'Oil leak', 'Strange sound'].map(s => (
              <button key={s} onClick={() => setSearchQuery(s)} className="px-3 py-1 rounded-full bg-muted text-xs hover:bg-primary/20 hover:text-primary transition-colors">
                {s}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Service Classes */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.entries(classConfig).map(([cls, config]) => (
          <button key={cls} onClick={() => setSelectedClass(selectedClass === cls ? null : cls)}
            className={cn("p-4 rounded-xl border-2 transition-all text-left", 
              selectedClass === cls ? "border-primary bg-primary/5" : "border-border hover:border-primary/30 bg-card"
            )}>
            <Badge className={cn("mb-2 bg-gradient-to-r", config.color)}>Class {cls}</Badge>
            <h3 className="font-medium text-sm">{config.name}</h3>
            <p className="text-xs text-muted-foreground mt-1">{serviceNodes.filter(n => n.class === cls).length} providers</p>
          </button>
        ))}
      </div>

      {/* Service Nodes */}
      <div className="space-y-4">
        {filteredNodes.map((node, i) => (
          <motion.div key={node.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="glass-card-hover">
              <CardContent className="p-5">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center shrink-0">
                    <Wrench className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold">{node.businessName}</h3>
                      <Badge className={cn("text-[10px] text-white bg-gradient-to-r", classConfig[node.class].color)}>
                        Class {node.class}
                      </Badge>
                      {node.verified && <Shield className="w-4 h-4 text-primary" />}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="flex items-center gap-1 text-sm"><Star className="w-4 h-4 fill-amber-400 text-amber-400" />{node.rating}</span>
                      <span className="text-xs text-muted-foreground">({node.reviewCount} reviews)</span>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="w-3 h-3" />{node.distance}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{node.address}</p>
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
                  <div className="sm:text-right shrink-0 flex flex-row sm:flex-col items-center sm:items-end gap-3 sm:gap-2">
                    <div>
                      <p className="text-lg font-bold">KSh {node.basePriceMin.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">starting price</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="h-8"><Phone className="w-3.5 h-3.5" /></Button>
                      <Button size="sm" className="h-8">Book Now</Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
