import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cartItems } from '@/data/mockData';
import { ShoppingCart, Package, Wrench, Trash2, Minus, Plus, Shield } from 'lucide-react';
import type { CartItem } from '@/types';

export default function CartPage() {
  const [items, setItems] = useState<CartItem[]>(cartItems);

  const parts = items.filter(i => i.type === 'part');
  const services = items.filter(i => i.type === 'service');
  const partsTotal = parts.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const servicesTotal = services.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const grandTotal = partsTotal + servicesTotal;

  const updateQuantity = (id: string, delta: number) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i));
  };

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const renderItem = (item: CartItem) => (
    <div key={item.id} className="flex items-center gap-4 p-4 rounded-lg bg-accent/30">
      <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center shrink-0">
        {item.type === 'part' ? <Package className="w-6 h-6 text-blue-500" /> : <Wrench className="w-6 h-6 text-amber-500" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{item.name}</p>
        <p className="text-xs text-muted-foreground">{item.supplierName}</p>
        <Badge variant="outline" className="mt-1 text-[10px]">
          <Shield className="w-3 h-3 mr-1" /> {item.escrowStatus}
        </Badge>
      </div>
      <div className="flex items-center gap-2">
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => updateQuantity(item.id, -1)}>
          <Minus className="w-3 h-3" />
        </Button>
        <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => updateQuantity(item.id, 1)}>
          <Plus className="w-3 h-3" />
        </Button>
      </div>
      <div className="text-right min-w-[80px]">
        <p className="font-medium">KSh {(item.price * item.quantity).toLocaleString()}</p>
        <p className="text-xs text-muted-foreground">KSh {item.price.toLocaleString()} each</p>
      </div>
      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive shrink-0" onClick={() => removeItem(item.id)}>
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  );

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Hybrid Cart</h1>
          <p className="text-muted-foreground">Parts and services in one checkout</p>
        </div>
        <Badge variant="secondary" className="text-base px-3 py-1">
          <ShoppingCart className="w-4 h-4 mr-1" /> {items.length} items
        </Badge>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <ShoppingCart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium">Your cart is empty</p>
            <p className="text-muted-foreground">Browse the marketplace to add parts and services</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {parts.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Parts</h3>
                <div className="space-y-2">{parts.map(renderItem)}</div>
              </div>
            )}
            {services.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Services</h3>
                <div className="space-y-2">{services.map(renderItem)}</div>
              </div>
            )}
          </div>

          {/* Summary */}
          <div>
            <Card className="sticky top-20">
              <CardHeader>
                <CardTitle className="text-base">Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Parts Subtotal</span>
                    <span>KSh {partsTotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Services Subtotal</span>
                    <span>KSh {servicesTotal.toLocaleString()}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-semibold text-lg">
                    <span>Grand Total</span>
                    <span>KSh {grandTotal.toLocaleString()}</span>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <p className="text-xs text-amber-500 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5" />
                    Escrow protected. Funds released upon completion.
                  </p>
                </div>

                <Button className="w-full" size="lg">Proceed to Checkout</Button>
                <Button variant="outline" className="w-full" onClick={() => setItems([])}>Clear Cart</Button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
