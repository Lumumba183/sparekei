import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { competitorData, cities } from '@/data/mockData';
import { Search, MapPin, DollarSign, Activity, TrendingDown } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const priceHistory = [
  { date: 'Jun 20', autoDoc: 28000, mechanicHub: 31000, sparekei: 28500 },
  { date: 'Jun 21', autoDoc: 28000, mechanicHub: 31500, sparekei: 28500 },
  { date: 'Jun 22', autoDoc: 27500, mechanicHub: 32000, sparekei: 28500 },
  { date: 'Jun 23', autoDoc: 27000, mechanicHub: 32000, sparekei: 28200 },
  { date: 'Jun 24', autoDoc: 26500, mechanicHub: 32000, sparekei: 28000 },
  { date: 'Jun 25', autoDoc: 26000, mechanicHub: 32500, sparekei: 27800 },
  { date: 'Jun 26', autoDoc: 25500, mechanicHub: 33000, sparekei: 27500 },
];

export default function CompetitorMonitoringPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCity, setSelectedCity] = useState('all');

  const filtered = competitorData.filter(c => {
    const matchesSearch = c.competitorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         c.cityName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCity = selectedCity === 'all' || c.cityId === selectedCity;
    return matchesSearch && matchesCity;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Competitor Monitoring</h1>
        <p className="text-muted-foreground">Track competitor activity in locked cities</p>
      </div>

      {/* AI Analysis Summary */}
      <Card className="border-l-4 border-l-primary">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Activity className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">AI-Generated Analysis Summary</h3>
              <p className="text-sm text-muted-foreground mt-1">
                AutoDoc Kenya has initiated an aggressive pricing strategy in Nairobi, reducing brake service costs by 12% over the past week. 
                MechanicHub expanded their mobile mechanic coverage to include Karen and Langata areas. 
                A new competitor (MechanicPlus) entered the Mombasa market on June 24. 
                <span className="text-amber-500 font-medium"> Recommend targeted pricing adjustment for brake services in Nairobi.</span>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Price Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Service Pricing Trends - Nairobi (Brake Service)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={priceHistory}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis domain={[20000, 35000]} />
              <Tooltip formatter={(v: number) => `KSh ${v.toLocaleString()}`} />
              <Line type="monotone" dataKey="autoDoc" stroke="#ef4444" strokeWidth={2} name="AutoDoc Kenya" />
              <Line type="monotone" dataKey="mechanicHub" stroke="#f59e0b" strokeWidth={2} name="MechanicHub" />
              <Line type="monotone" dataKey="sparekei" stroke="#3b82f6" strokeWidth={2} name="Sparekei" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search competitors or cities..." className="pl-9" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
        <select className="px-3 py-2 rounded-md border bg-background text-sm" value={selectedCity} onChange={e => setSelectedCity(e.target.value)}>
          <option value="all">All Cities</option>
          {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* Competitor Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Competitor Directory</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>City</TableHead>
                <TableHead>Competitor</TableHead>
                <TableHead>Pricing</TableHead>
                <TableHead>Service Coverage</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(c => (
                <TableRow key={c.id}>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                      {c.cityName}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{c.competitorName}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
                      KSh {c.pricing.toLocaleString()}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {c.serviceCoverage.map(s => (
                        <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{c.lastUpdated}</TableCell>
                  <TableCell>
                    <Badge className="bg-amber-500 gap-1">
                      <TrendingDown className="w-3 h-3" /> Price Drop
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
