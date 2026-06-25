import { useState } from 'react';
import { motion } from 'framer-motion';
import { Siren, MapPin, Phone, Clock, Shield, Wrench, Truck, Car, Navigation, CheckCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const emergencyTypes = [
  { id: 'mechanic', label: 'Mobile Mechanic', icon: Wrench, desc: 'On-site repair', color: 'from-blue-500 to-indigo-500' },
  { id: 'rescue', label: 'Rescue Team', icon: Shield, desc: 'Emergency response', color: 'from-emerald-500 to-teal-500' },
  { id: 'tow', label: 'Tow Truck', icon: Truck, desc: 'Vehicle recovery', color: 'from-amber-500 to-orange-500' },
  { id: 'garage', label: 'Linked Garage', icon: Car, desc: 'Nearest garage', color: 'from-purple-500 to-pink-500' },
];

const nearbyResponders = [
  { name: 'Rapid Rescue Services', type: 'Tow Truck', distance: '2.1 km', eta: '8 min', rating: 4.9, available: true, phone: '+254 722 000 111' },
  { name: 'Mobile Mechanic Pro', type: 'Mobile Mechanic', distance: '1.5 km', eta: '12 min', rating: 4.7, available: true, phone: '+254 733 222 333' },
  { name: 'SafeRoad Assistance', type: 'Rescue Team', distance: '3.8 km', eta: '18 min', rating: 4.8, available: true, phone: '+254 711 444 555' },
  { name: 'AutoMax Emergency', type: 'Linked Garage', distance: '4.2 km', eta: '22 min', rating: 4.6, available: false, phone: '+254 720 666 777' },
];

export default function EmergencyPage() {
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [requestSent, setRequestSent] = useState(false);
  const [status, setStatus] = useState<'idle' | 'requesting' | 'assigned' | 'en_route'>('idle');

  const handleRequest = () => {
    setStatus('requesting');
    setRequestSent(true);
    setTimeout(() => setStatus('assigned'), 2000);
    setTimeout(() => setStatus('en_route'), 4000);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emergency/10 border border-emergency/30 text-emergency mb-4">
          <Siren className="w-4 h-4 animate-pulse" />
          <span className="text-sm font-medium">24/7 Emergency Response</span>
        </div>
        <h1 className="text-3xl font-bold">Emergency Assistance</h1>
        <p className="text-muted-foreground mt-2">Get immediate help for roadside emergencies</p>
      </div>

      {!requestSent ? (
        <>
          {/* Location */}
          <Card className="glass-card border-primary/20">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <MapPin className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-medium">Current Location</p>
                <p className="text-sm text-muted-foreground">Westlands Business Park, Nairobi • Accuracy: ±12m</p>
              </div>
              <Button variant="outline" size="sm"><Navigation className="w-4 h-4 mr-1" /> Update</Button>
            </CardContent>
          </Card>

          {/* Emergency Type Selection */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {emergencyTypes.map(type => (
              <button
                key={type.id}
                onClick={() => setSelectedType(type.id)}
                className={cn(
                  "p-5 rounded-xl border-2 transition-all text-center",
                  selectedType === type.id 
                    ? "border-primary bg-primary/5 shadow-lg shadow-primary/10" 
                    : "border-border hover:border-primary/30 bg-card hover:shadow-md"
                )}
              >
                <div className={cn("w-14 h-14 mx-auto rounded-xl bg-gradient-to-br flex items-center justify-center mb-3", type.color)}>
                  <type.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="font-medium text-sm">{type.label}</h3>
                <p className="text-xs text-muted-foreground mt-1">{type.desc}</p>
              </button>
            ))}
          </div>

          {/* Nearby Responders */}
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" /> Nearby Responders
            </h3>
            {nearbyResponders.map((responder, i) => (
              <motion.div key={responder.name} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}>
                <Card className={cn("glass-card-hover", !responder.available && "opacity-60")}>
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Siren className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{responder.name}</p>
                        <Badge variant={responder.available ? 'default' : 'secondary'} className="text-[10px]">
                          {responder.available ? 'Available' : 'Busy'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{responder.distance}</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />ETA {responder.eta}</span>
                        <span className="flex items-center gap-1"><Siren className="w-3 h-3" />{responder.type}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="flex items-center gap-0.5">
                        <span className="text-sm font-semibold">{responder.rating}</span>
                      </div>
                      <Button size="sm" variant="outline" className="h-7 text-xs mt-1" disabled={!responder.available}>
                        <Phone className="w-3 h-3 mr-1" /> Call
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Request Button */}
          <Button 
            className="w-full h-14 text-lg gap-2 bg-emergency hover:bg-emergency/90 animate-emergency-pulse"
            disabled={!selectedType}
            onClick={handleRequest}
          >
            <Siren className="w-6 h-6" />
            {selectedType ? `Request ${emergencyTypes.find(t => t.id === selectedType)?.label}` : 'Select Emergency Type'}
          </Button>
        </>
      ) : (
        /* Active Emergency */
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
          <Card className="glass-card border-primary/30">
            <CardContent className="p-8 text-center space-y-6">
              {/* Status Indicator */}
              <div className="relative w-32 h-32 mx-auto">
                <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
                {status !== 'idle' && (
                  <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                )}
                <div className="absolute inset-4 rounded-full bg-primary/10 flex items-center justify-center">
                  {status === 'requesting' && <Siren className="w-10 h-10 text-primary animate-pulse" />}
                  {status === 'assigned' && <CheckCircle className="w-10 h-10 text-success" />}
                  {status === 'en_route' && <Navigation className="w-10 h-10 text-primary animate-bounce" />}
                </div>
              </div>

              <div>
                <h2 className="text-2xl font-bold">
                  {status === 'requesting' && 'Finding Nearest Responder...'}
                  {status === 'assigned' && 'Responder Assigned!'}
                  {status === 'en_route' && 'Responder En Route!'}
                </h2>
                <p className="text-muted-foreground mt-2">
                  {status === 'requesting' && 'Broadcasting your request to nearby providers'}
                  {status === 'assigned' && 'Rapid Rescue Services has accepted your request'}
                  {status === 'en_route' && 'Arriving in approximately 8 minutes'}
                </p>
              </div>

              {status !== 'requesting' && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-muted/50 rounded-xl p-4 max-w-sm mx-auto">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                      <Siren className="w-7 h-7 text-primary" />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold">Rapid Rescue Services</p>
                      <p className="text-sm text-muted-foreground">Tow Truck • 4.9 rating</p>
                      <p className="text-sm text-primary flex items-center gap-1"><Navigation className="w-3 h-3" /> 8 min away</p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Progress Steps */}
              <div className="flex items-center justify-center gap-4">
                {['Requested', 'Assigned', 'En Route', 'Arrived'].map((step, i) => (
                  <div key={step} className="flex items-center gap-2">
                    <div className={cn("w-3 h-3 rounded-full", 
                      i <= (status === 'requesting' ? 0 : status === 'assigned' ? 1 : status === 'en_route' ? 2 : 3) ? 'bg-primary' : 'bg-muted'
                    )} />
                    <span className={cn("text-xs", i <= (status === 'requesting' ? 0 : status === 'assigned' ? 1 : status === 'en_route' ? 2 : 3) ? 'text-foreground' : 'text-muted-foreground')}>
                      {step}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex gap-3 justify-center">
                <Button variant="outline" className="gap-2"><Phone className="w-4 h-4" /> Call Responder</Button>
                <Button variant="outline" className="gap-2 text-emergency hover:text-emergency" onClick={() => { setRequestSent(false); setStatus('idle'); }}>
                  Cancel Request
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
