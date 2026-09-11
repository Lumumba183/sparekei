import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { funnelStages, cities } from '@/data/mockData';
import { Users, MousePointer, FileText, UserCheck, UserPlus, Activity, TrendingDown } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

const funnelTrend = [
  { week: 'W1', impressions: 3200, clicks: 960, applications: 288, interviews: 115, hired: 58, active: 41 },
  { week: 'W2', impressions: 3500, clicks: 1050, applications: 315, interviews: 126, hired: 63, active: 44 },
  { week: 'W3', impressions: 4100, clicks: 1230, applications: 369, interviews: 148, hired: 74, active: 52 },
  { week: 'W4', impressions: 3800, clicks: 1140, applications: 342, interviews: 137, hired: 68, active: 48 },
  { week: 'W5', impressions: 4200, clicks: 1260, applications: 378, interviews: 151, hired: 76, active: 53 },
  { week: 'W6', impressions: 4500, clicks: 1350, applications: 405, interviews: 162, hired: 81, active: 57 },
];

const stageIcons = [
  { icon: Users, label: 'Impression', color: 'bg-blue-500' },
  { icon: MousePointer, label: 'Click', color: 'bg-indigo-500' },
  { icon: FileText, label: 'Application', color: 'bg-purple-500' },
  { icon: UserCheck, label: 'Interview', color: 'bg-amber-500' },
  { icon: UserPlus, label: 'Hired', color: 'bg-emerald-500' },
  { icon: Activity, label: 'Active', color: 'bg-teal-500' },
];

export default function RecruitmentFunnelPage() {
  const [selectedCity, setSelectedCity] = useState('all');

  const currentStages = selectedCity === 'all' ? funnelStages : funnelStages.map(s => ({
    ...s,
    count: Math.round(s.count * (0.5 + Math.random() * 0.8))
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Recruitment Funnel</h1>
          <p className="text-muted-foreground">Track mechanic recruitment performance across cities</p>
        </div>
        <Select value={selectedCity} onValueChange={setSelectedCity}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Select city" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Cities</SelectItem>
            {cities.map(c => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Funnel Stages */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {currentStages.map((stage, i) => {
          const config = stageIcons[i];
          const Icon = config.icon;
          const prevCount = i > 0 ? currentStages[i - 1].count : stage.count;
          const dropOff = i > 0 ? Math.round(((prevCount - stage.count) / prevCount) * 100) : 0;

          return (
            <Card key={stage.stage} className="relative overflow-hidden">
              <div className={`absolute top-0 left-0 right-0 h-1 ${config.color}`} />
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-9 h-9 rounded-lg ${config.color} bg-opacity-10 flex items-center justify-center`}>
                    <Icon className={`w-4 h-4 ${config.color.replace('bg-', 'text-')}`} />
                  </div>
                  {i > 0 && (
                    <Badge variant="outline" className={dropOff > 50 ? 'text-red-500 border-red-500' : 'text-muted-foreground'}>
                      <TrendingDown className="w-3 h-3 mr-1" /> {dropOff}%
                    </Badge>
                  )}
                </div>
                <p className="text-2xl font-bold">{stage.count.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">{config.label}</p>
                {i > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {stage.conversionRate}% conversion
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Funnel Performance Trend (6 Weeks)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={funnelTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="impressions" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.1} name="Impressions" />
              <Area type="monotone" dataKey="clicks" stackId="1" stroke="#6366f1" fill="#6366f1" fillOpacity={0.1} name="Clicks" />
              <Area type="monotone" dataKey="applications" stackId="1" stroke="#a855f7" fill="#a855f7" fillOpacity={0.1} name="Applications" />
              <Area type="monotone" dataKey="interviews" stackId="1" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.1} name="Interviews" />
              <Area type="monotone" dataKey="hired" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.1} name="Hired" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Conversion Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Conversion Rates by Stage</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={currentStages.slice(1)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[0, 100]} />
                <YAxis dataKey="stage" type="category" width={100} />
                <Tooltip formatter={(v: number) => `${v}%`} />
                <Bar dataKey="conversionRate" fill="#3b82f6" name="Conversion Rate" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">City Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {cities.filter(c => c.status !== 'planned').map(city => (
                <div key={city.id} className="flex items-center justify-between p-3 rounded-lg bg-accent/50">
                  <div>
                    <p className="font-medium">{city.name}</p>
                    <p className="text-xs text-muted-foreground">{city.mechanicsCount} mechanics registered</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-emerald-500">{Math.round(city.demandScore)}%</p>
                    <p className="text-xs text-muted-foreground">demand score</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
