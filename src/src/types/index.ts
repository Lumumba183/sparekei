// ===== SPAREKEI TYPE DEFINITIONS =====

export type UserRole = 
  | 'owner' 
  | 'mechanic' 
  | 'vendor' 
  | 'wholesaler' 
  | 'manufacturer' 
  | 'fleet_manager' 
  | 'detailer'
  | 'bodyshop'
  | 'audio_electronics'
  | 'wiring_electronics'
  | 'solo_workshop'
  | 'service_node_operator'
  | 'admin';

export type ServiceClass = 'A' | 'B' | 'C' | 'D';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  avatar?: string;
  phone?: string;
  city?: string;
  createdAt?: string;
  subscriptionPlan?: 'basic' | 'standard' | 'premium';
  subscriptionStatus?: 'trial' | 'active' | 'expired';
}

export interface Vehicle {
  id: string;
  ownerId: string;
  make: string;
  model: string;
  year: number;
  vin: string;
  registration: string;
  engineNumber?: string;
  chassis?: string;
  color: string;
  image?: string;
  mileage: number;
  healthScore: number;
  lastServiceDate?: string;
  nextServiceDue?: string;
  status: 'healthy' | 'attention' | 'critical';
  complianceStatus?: ComplianceRecord[];
}

export interface ComplianceRecord {
  id: string;
  vehicleId: string;
  type: string;
  region: string;
  issueDate: string;
  expiryDate: string;
  status: 'valid' | 'expiring_soon' | 'expired';
  documentUrl?: string;
}

export interface MaintenanceLog {
  id: string;
  vehicleId: string;
  serviceProviderId: string;
  serviceProviderName: string;
  serviceType: string;
  mileage: number;
  cost: number;
  partsUsed: PartUsage[];
  isVerified: boolean;
  performedAt: string;
  stampType?: 'cosmetic' | 'structural' | 'maintenance' | 'comprehensive';
}

export interface PartUsage {
  sku: string;
  name: string;
  quantity: number;
  price: number;
}

export interface PredictiveAlert {
  id: string;
  vehicleId: string;
  alertType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  component: string;
  message: string;
  predictedDueDate: string;
  estimatedCostMin: number;
  estimatedCostMax: number;
  triggeredByOBD: boolean;
  status: 'open' | 'acknowledged' | 'resolved';
}

export interface ServiceAppointment {
  id: string;
  vehicleId: string;
  mechanicId?: string;
  mechanicName?: string;
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  scheduledAt: string;
  serviceType: string;
  estimatedCostMin: number;
  estimatedCostMax: number;
  notes?: string;
}

export interface MarketplaceListing {
  id: string;
  vendorId: string;
  vendorName: string;
  vendorRating: number;
  vendorVerified: boolean;
  partSku: string;
  partName: string;
  category: string;
  subcategory?: string;
  brandName: string;
  condition: 'NEW_OEM' | 'CERTIFIED' | 'REFURBISHED';
  unitPrice: number;
  wholesalePrice?: number;
  bulkPrice?: number;
  stockLevel: number;
  image?: string;
  description?: string;
  compatibility?: string[];
  rating?: number;
  reviewCount?: number;
  region: string;
}

export interface ServiceNode {
  id: string;
  businessName: string;
  class: ServiceClass;
  rating: number;
  reviewCount: number;
  distance?: string;
  verified: boolean;
  basePriceMin: number;
  basePriceMax: number;
  specializations: string[];
  bayCount?: number;
  availableBays?: number;
  image?: string;
  address: string;
  phone: string;
  description?: string;
}

export interface ServiceItem {
  id: string;
  nodeId: string;
  name: string;
  description: string;
  basePrice: number;
  estimatedDuration: string;
  stampType: string;
  category: string;
}

export interface CartItem {
  id: string;
  type: 'part' | 'service';
  name: string;
  quantity: number;
  price: number;
  supplierName: string;
  image?: string;
  escrowStatus: string;
}

export interface EmergencyRequest {
  id: string;
  vehicleId: string;
  type: 'mobile_mechanic' | 'rescue_team' | 'tow_truck' | 'linked_garage';
  status: 'requested' | 'assigned' | 'en_route' | 'arrived' | 'resolved';
  location: { lat: number; lng: number; address: string };
  responderName?: string;
  responderEta?: string;
  responderRating?: number;
  createdAt?: string;
  resolvedAt?: string;
}

export interface MechanicJob {
  id: string;
  mechanicId: string;
  vehicleOwner: string;
  vehicleInfo: string;
  serviceType: string;
  status: 'pending' | 'accepted' | 'in_progress' | 'completed';
  earnings: number;
  scheduledAt: string;
  completedAt?: string;
  rating?: number;
  location: string;
}

export interface EarningRecord {
  id: string;
  userId: string;
  amount: number;
  type: string;
  status: 'pending' | 'paid';
  date: string;
  description: string;
}

export interface FleetVehicle {
  id: string;
  fleetId: string;
  licensePlate: string;
  make: string;
  model: string;
  year: number;
  currentOdometer: number;
  riskStatus: 'HEALTHY' | 'ATTENTION' | 'CRITICAL';
  lastFaultCode?: string;
  driverName?: string;
  lastServiceDate?: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'critical';
  read: boolean;
  createdAt?: string;
  actionUrl?: string;
}

export interface DashboardMetric {
  label: string;
  value: string | number;
  change?: number;
  icon: string;
  trend?: 'up' | 'down' | 'neutral';
}

export interface RFQRequest {
  id: string;
  buyerId: string;
  partName: string;
  quantity: number;
  targetPrice?: number;
  deliveryTimeline?: string;
  status: 'open' | 'quoted' | 'closed';
  createdAt?: string;
  responses?: RFQResponse[];
}

export interface RFQResponse {
  id: string;
  rfqId: string;
  supplierId: string;
  supplierName: string;
  price: number;
  deliveryDays: number;
  message?: string;
  createdAt?: string;
}

export interface CityData {
  id: string;
  name: string;
  country: string;
  status: 'planned' | 'recruiting' | 'operational' | 'fully_operational';
  population: number;
  demandScore: number;
  mechanicsCount: number;
  garagesCount: number;
  vendorsCount: number;
  pppMultiplier: number;
}

export interface FunnelStage {
  stage: string;
  count: number;
  conversionRate: number;
}

export interface CompetitorData {
  id: string;
  cityId: string;
  cityName: string;
  competitorName: string;
  pricing: number;
  serviceCoverage: string[];
  lastUpdated: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface Review {
  id: string;
  reviewerName: string;
  rating: number;
  comment: string;
  date: string;
  avatar?: string;
}

export interface NavItem {
  label: string;
  icon: string;
  path: string;
  roles?: UserRole[];
  badge?: number;
  children?: NavItem[];
}
