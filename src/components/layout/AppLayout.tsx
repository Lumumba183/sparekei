import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import {
  Car, LayoutDashboard, ShoppingCart, Wrench, Siren, ClipboardCheck,
  Settings, LogOut, ChevronLeft, ChevronRight, Bell,
  Menu, Shield, BrainCircuit, Truck, BarChart3, Users,
  Store, Package, Banknote, HeartPulse,
  Sparkles, MapPin, Search, FileText, Eye, UserPlus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { notifications, cartItems } from '@/data/mockData';
import type { UserRole } from '@/types';

interface NavItem {
  label: string;
  icon: React.ElementType;
  path: string;
  roles: UserRole[];
  badge?: number;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard', roles: ['owner', 'mechanic', 'vendor', 'wholesaler', 'manufacturer', 'fleet_manager', 'service_node_operator', 'admin'] },
  { label: 'Marketplace', icon: ShoppingCart, path: '/marketplace', roles: ['owner', 'mechanic', 'vendor', 'wholesaler', 'manufacturer', 'fleet_manager'] },
  { label: 'Symptom Search', icon: Search, path: '/symptom-search', roles: ['owner', 'mechanic', 'fleet_manager'] },
  { label: 'Cart', icon: ShoppingCart, path: '/cart', roles: ['owner', 'mechanic', 'vendor', 'wholesaler', 'manufacturer', 'fleet_manager'], badge: cartItems.length },
  { label: 'Services', icon: Wrench, path: '/services', roles: ['owner', 'mechanic', 'fleet_manager'] },
  { label: 'Emergency', icon: Siren, path: '/emergency', roles: ['owner', 'mechanic', 'fleet_manager'], badge: 0 },
  { label: 'Vehicle Passport', icon: ClipboardCheck, path: '/passport', roles: ['owner'] },
  { label: 'Predictive Alerts', icon: HeartPulse, path: '/alerts', roles: ['owner', 'mechanic', 'admin'], badge: 3 },
  { label: 'My Jobs', icon: Wrench, path: '/jobs', roles: ['mechanic', 'bodyshop', 'detailer', 'solo_workshop'] },
  { label: 'Earnings', icon: Banknote, path: '/earnings', roles: ['mechanic', 'vendor', 'bodyshop', 'detailer', 'solo_workshop', 'service_node_operator'] },
  { label: 'My Storefront', icon: Store, path: '/storefront', roles: ['vendor'] },
  { label: 'Inventory', icon: Package, path: '/inventory', roles: ['vendor', 'wholesaler'] },
  { label: 'RFQ', icon: FileText, path: '/rfq', roles: ['vendor', 'wholesaler', 'manufacturer'] },
  { label: 'Fleet Command', icon: Truck, path: '/fleet', roles: ['fleet_manager', 'admin'] },
  { label: 'AI Concierge', icon: BrainCircuit, path: '/ai-concierge', roles: ['owner', 'mechanic', 'vendor', 'fleet_manager', 'admin'] },
  { label: 'Analytics', icon: BarChart3, path: '/analytics', roles: ['vendor', 'wholesaler', 'manufacturer', 'admin'] },
  { label: 'Users', icon: Users, path: '/users', roles: ['admin'] },
  { label: 'Cities', icon: MapPin, path: '/cities', roles: ['admin'] },
  { label: 'Recruitment', icon: UserPlus, path: '/recruitment-funnel', roles: ['admin'] },
  { label: 'Push Center', icon: Bell, path: '/push-center', roles: ['admin'] },
  { label: 'Competitors', icon: Eye, path: '/competitor-monitor', roles: ['admin'] },
  { label: 'Admin Center', icon: Shield, path: '/admin', roles: ['admin'] },
];

const roleLabels: Record<UserRole, string> = {
  owner: 'Vehicle Owner',
  mechanic: 'Mechanic',
  vendor: 'Parts Vendor',
  wholesaler: 'Wholesaler',
  manufacturer: 'Manufacturer',
  fleet_manager: 'Fleet Manager',
  detailer: 'Detailer',
  bodyshop: 'Bodyshop',
  audio_electronics: 'Audio Specialist',
  wiring_electronics: 'Wiring Specialist',
  solo_workshop: 'Solo Workshop',
  service_node_operator: 'Service Node Operator',
  admin: 'Administrator',
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const unreadCount = notifications.filter(n => !n.read).length;
  const role = user?.role || 'owner';
  const filteredNav = navItems.filter(item => item.roles.includes(role));

  const isActive = (path: string) => location.pathname === path;

  const NavContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={cn(
        "flex items-center gap-3 px-4 h-16 border-b border-border/50 shrink-0",
        collapsed && "justify-center px-2"
      )}>
        <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center shrink-0">
          <Car className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <div className="flex flex-col overflow-hidden">
            <span className="text-base font-bold tracking-tight leading-tight">Sparekei</span>
            <span className="text-[10px] text-muted-foreground leading-tight">Intelligence Platform</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto scrollbar-thin py-4 px-3 space-y-1">
        {filteredNav.map((item) => (
          <button
            key={item.path}
            onClick={() => { navigate(item.path); setMobileOpen(false); }}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
              isActive(item.path)
                ? "bg-primary/10 text-primary border border-primary/20"
                : "text-muted-foreground hover:text-foreground hover:bg-accent/50 border border-transparent"
            )}
          >
            <item.icon className={cn("w-[18px] h-[18px] shrink-0", isActive(item.path) && "text-primary")} />
            {!collapsed && (
              <>
                <span className="flex-1 text-left truncate">{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <Badge variant="secondary" className="h-5 min-w-5 px-1 text-[10px]">{item.badge}</Badge>
                )}
              </>
            )}
            {!collapsed && item.label === 'Emergency' && (
              <Siren className="w-3 h-3 text-emergency animate-pulse" />
            )}
          </button>
        ))}
      </nav>

      {/* User Section */}
      <div className={cn(
        "border-t border-border/50 p-3 shrink-0",
        collapsed && "flex flex-col items-center"
      )}>
        {!collapsed ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3 px-1">
              <img src={user?.avatar || ''} alt="" className="w-9 h-9 rounded-full bg-muted object-cover" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.fullName}</p>
                <p className="text-[11px] text-muted-foreground truncate">{roleLabels[role]}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" className="flex-1 h-8 text-xs" onClick={() => navigate('/settings')}>
                <Settings className="w-3.5 h-3.5 mr-1" /> Settings
              </Button>
              <Button variant="ghost" size="sm" className="h-8 text-xs text-destructive hover:text-destructive" onClick={logout}>
                <LogOut className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <img src={user?.avatar || ''} alt="" className="w-8 h-8 rounded-full bg-muted object-cover" />
            <button onClick={logout} className="text-destructive"><LogOut className="w-4 h-4" /></button>
          </div>
        )}
      </div>

      {/* Collapse Toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="hidden lg:flex absolute -right-3 top-20 w-6 h-6 bg-card border border-border rounded-full items-center justify-center shadow-md hover:bg-accent transition-colors"
      >
        {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>
    </div>
  );

  return (
    <div className="min-h-screen flex">
      {/* Desktop Sidebar */}
      <aside className={cn(
        "hidden lg:flex fixed left-0 top-0 h-screen flex-col bg-sidebar border-r border-border/50 z-40 transition-all duration-300",
        collapsed ? "w-[72px]" : "w-64"
      )}>
        <NavContent />
      </aside>

      {/* Mobile Sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger asChild className="lg:hidden">
          <button className="fixed top-4 left-4 z-50 w-10 h-10 bg-card border border-border rounded-lg flex items-center justify-center shadow-lg">
            <Menu className="w-5 h-5" />
          </button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0 bg-sidebar border-r border-border">
          <NavContent />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <main className={cn(
        "flex-1 min-h-screen transition-all duration-300",
        "lg:ml-64",
        collapsed && "lg:ml-[72px]"
      )}>
        {/* Top Header */}
        <header className="sticky top-0 z-30 h-16 bg-background/80 backdrop-blur-xl border-b border-border/50 flex items-center justify-between px-4 lg:px-6">
          <div className="lg:hidden w-10" /> {/* Spacer for mobile menu */}
          
          {/* Breadcrumb / Page Title */}
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary hidden sm:block" />
            <span className="text-sm font-medium text-muted-foreground hidden sm:block">
              Sparekei / {location.pathname.slice(1).charAt(0).toUpperCase() + location.pathname.slice(2)}
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Notifications */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-emergency text-[10px] text-white rounded-full flex items-center justify-center font-bold">
                      {unreadCount}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <div className="px-3 py-2 border-b border-border">
                  <p className="text-sm font-medium">Notifications</p>
                </div>
                {notifications.slice(0, 4).map(n => (
                  <DropdownMenuItem key={n.id} className="flex flex-col items-start gap-1 p-3 cursor-pointer" onClick={() => n.actionUrl && navigate(n.actionUrl)}>
                    <div className="flex items-center gap-2 w-full">
                      <span className={cn(
                        "w-2 h-2 rounded-full shrink-0",
                        n.type === 'warning' && "bg-warning",
                        n.type === 'success' && "bg-success",
                        n.type === 'info' && "bg-info",
                        n.type === 'critical' && "bg-emergency"
                      )} />
                      <span className="text-sm font-medium flex-1">{n.title}</span>
                      {!n.read && <Badge variant="secondary" className="h-4 text-[9px]">New</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 pl-4">{n.message}</p>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem className="justify-center text-primary text-sm" onClick={() => navigate('/notifications')}>
                  View all notifications
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Quick Actions */}
            <Button 
              variant="default" 
              size="sm" 
              className="hidden sm:flex items-center gap-2 bg-emergency hover:bg-emergency/90"
              onClick={() => navigate('/emergency')}
            >
              <Siren className="w-4 h-4" />
              Emergency
            </Button>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-4 lg:p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
