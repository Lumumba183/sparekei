import { MapPin, TrendingUp, Wrench, ShoppingBag, ChevronRight, Globe } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cities } from '@/data/mockData';
import { cn } from '@/lib/utils';

export default function CitiesPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">City Management</h1>
          <p className="text-muted-foreground text-sm">Monitor and expand city operations</p>
        </div>
        <Button><Globe className="w-4 h-4 mr-2" /> Add City</Button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cities.map(city => (
          <Card key={city.id} className={cn("glass-card-hover",
            city.status === 'fully_operational' && "border-success/30",
            city.status === 'planned' && "border-muted"
          )}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <MapPin className="w-6 h-6 text-primary" />
                </div>
                <Badge className={cn("text-[10px] capitalize",
                  city.status === 'fully_operational' ? 'bg-success' :
                  city.status === 'operational' ? 'bg-primary' :
                  city.status === 'recruiting' ? 'bg-warning' : 'bg-muted text-muted-foreground'
                )}>{city.status.replace('_', ' ')}</Badge>
              </div>
              <h3 className="font-semibold">{city.name}</h3>
              <p className="text-xs text-muted-foreground">{city.country} • {(city.population / 1000000).toFixed(1)}M people</p>

              <div className="mt-3">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Market Demand</span>
                  <span>{city.demandScore}%</span>
                </div>
                <Progress value={city.demandScore} className="h-1.5" />
              </div>

              <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                <div className="p-2 rounded-lg bg-muted/50">
                  <div className="flex items-center justify-center gap-1"><Wrench className="w-3 h-3 text-success" /><span className="text-sm font-bold">{city.mechanicsCount}</span></div>
                  <p className="text-[10px] text-muted-foreground">Mechanics</p>
                </div>
                <div className="p-2 rounded-lg bg-muted/50">
                  <div className="flex items-center justify-center gap-1"><ShoppingBag className="w-3 h-3 text-accent" /><span className="text-sm font-bold">{city.vendorsCount}</span></div>
                  <p className="text-[10px] text-muted-foreground">Vendors</p>
                </div>
                <div className="p-2 rounded-lg bg-muted/50">
                  <div className="flex items-center justify-center gap-1"><TrendingUp className="w-3 h-3 text-primary" /><span className="text-sm font-bold">{city.pppMultiplier}x</span></div>
                  <p className="text-[10px] text-muted-foreground">PPP</p>
                </div>
              </div>

              <Button size="sm" variant="outline" className="w-full mt-4 text-xs">Manage <ChevronRight className="w-3 h-3 ml-1" /></Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
