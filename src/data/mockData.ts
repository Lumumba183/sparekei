import type { 
  User, Vehicle, MaintenanceLog, PredictiveAlert, ServiceAppointment,
  MarketplaceListing, ServiceNode, ServiceItem, CartItem, EmergencyRequest,
  MechanicJob, EarningRecord, FleetVehicle, NotificationItem, DashboardMetric,
  CityData, FunnelStage, CompetitorData, ChatMessage, Review, ComplianceRecord
} from '@/types';

export const currentUser: User = {
  id: 'usr-001',
  email: 'alex.morgan@sparekei.com',
  fullName: 'Alex Morgan',
  role: 'owner',
  avatar: 'https://i.pravatar.cc/150?u=alex',
  phone: '+254 712 345 678',
  city: 'Nairobi',
  subscriptionPlan: 'premium',
  subscriptionStatus: 'active',
};

export const vehicles: Vehicle[] = [
  {
    id: 'v-001',
    ownerId: 'usr-001',
    make: 'Toyota',
    model: 'Land Cruiser Prado',
    year: 2022,
    vin: 'JTMCB7FV1B5001234',
    registration: 'KDB 123X',
    engineNumber: '1KD-1234567',
    chassis: 'JTEBH3FJ10K123456',
    color: 'Pearl White',
    image: '/vehicle-1.jpg',
    mileage: 45230,
    healthScore: 92,
    lastServiceDate: '2026-04-15',
    nextServiceDue: '2026-07-15',
    status: 'healthy',
  },
  {
    id: 'v-002',
    ownerId: 'usr-001',
    make: 'Mercedes-Benz',
    model: 'C200',
    year: 2023,
    vin: 'WDDWJ4KB1JF123456',
    registration: 'KDC 456Y',
    engineNumber: 'M264-8901234',
    chassis: 'WDD2050421R123456',
    color: 'Obsidian Black',
    image: '/vehicle-2.jpg',
    mileage: 23100,
    healthScore: 88,
    lastServiceDate: '2026-05-20',
    nextServiceDue: '2026-08-20',
    status: 'attention',
  },
];

export const complianceRecords: ComplianceRecord[] = [
  { id: 'c-001', vehicleId: 'v-001', type: 'NTSA Inspection', region: 'Kenya', issueDate: '2026-01-15', expiryDate: '2026-12-15', status: 'valid' },
  { id: 'c-002', vehicleId: 'v-001', type: 'Insurance Cover', region: 'Kenya', issueDate: '2026-02-01', expiryDate: '2027-01-31', status: 'valid' },
  { id: 'c-003', vehicleId: 'v-002', type: 'NTSA Inspection', region: 'Kenya', issueDate: '2026-03-10', expiryDate: '2027-03-10', status: 'valid' },
  { id: 'c-004', vehicleId: 'v-002', type: 'Insurance Cover', region: 'Kenya', issueDate: '2026-01-20', expiryDate: '2026-07-20', status: 'expiring_soon' },
];

export const maintenanceLogs: MaintenanceLog[] = [
  {
    id: 'ml-001', vehicleId: 'v-001', serviceProviderId: 'sp-001', serviceProviderName: 'AutoMax Garage',
    serviceType: 'Full Service', mileage: 45000, cost: 28500, isVerified: true, performedAt: '2026-04-15',
    stampType: 'comprehensive',
    partsUsed: [
      { sku: 'OIL-5W30-001', name: 'Shell Helix Ultra 5W-30', quantity: 5, price: 1200 },
      { sku: 'FIL-OIL-001', name: 'Bosch Oil Filter', quantity: 1, price: 850 },
    ],
  },
  {
    id: 'ml-002', vehicleId: 'v-001', serviceProviderId: 'sp-002', serviceProviderName: 'Premium Car Care',
    serviceType: 'Detailing & Ceramic Coating', mileage: 44000, cost: 15000, isVerified: true, performedAt: '2026-03-20',
    stampType: 'cosmetic',
    partsUsed: [
      { sku: 'CER-COAT-001', name: 'Gtechniq Ceramic Coating', quantity: 1, price: 8000 },
    ],
  },
  {
    id: 'ml-003', vehicleId: 'v-002', serviceProviderId: 'sp-001', serviceProviderName: 'AutoMax Garage',
    serviceType: 'Brake Pad Replacement', mileage: 23000, cost: 18500, isVerified: true, performedAt: '2026-05-20',
    stampType: 'structural',
    partsUsed: [
      { sku: 'BRK-PAD-MB-001', name: 'Genuine Mercedes Brake Pads', quantity: 1, price: 12000 },
      { sku: 'BRK-FLD-001', name: 'ATE Brake Fluid', quantity: 1, price: 1500 },
    ],
  },
];

export const predictiveAlerts: PredictiveAlert[] = [
  {
    id: 'pa-001', vehicleId: 'v-002', alertType: 'brake_wear', severity: 'medium',
    component: 'Brake System', message: 'Rear brake pads approaching replacement threshold. Estimated 2,500 km remaining.',
    predictedDueDate: '2026-07-20', estimatedCostMin: 8000, estimatedCostMax: 15000,
    triggeredByOBD: true, status: 'open',
  },
  {
    id: 'pa-002', vehicleId: 'v-001', alertType: 'tire_rotation', severity: 'low',
    component: 'Tires', message: 'Tire rotation due in approximately 3 weeks based on current driving patterns.',
    predictedDueDate: '2026-07-15', estimatedCostMin: 2000, estimatedCostMax: 3500,
    triggeredByOBD: false, status: 'open',
  },
  {
    id: 'pa-003', vehicleId: 'v-002', alertType: 'battery_health', severity: 'medium',
    component: 'Battery', message: 'Battery voltage showing early degradation signs. Cold cranking amps down 15%.',
    predictedDueDate: '2026-09-01', estimatedCostMin: 12000, estimatedCostMax: 18000,
    triggeredByOBD: true, status: 'open',
  },
];

export const serviceAppointments: ServiceAppointment[] = [
  { id: 'sa-001', vehicleId: 'v-002', mechanicId: 'm-001', mechanicName: 'James Kimani', status: 'confirmed', scheduledAt: '2026-06-28T09:00:00', serviceType: 'Brake Inspection', estimatedCostMin: 2000, estimatedCostMax: 5000, notes: 'Check rear brake pads' },
  { id: 'sa-002', vehicleId: 'v-001', status: 'pending', scheduledAt: '2026-07-05T10:00:00', serviceType: 'Oil Change Service', estimatedCostMin: 8000, estimatedCostMax: 12000 },
];

export const marketplaceListings: MarketplaceListing[] = [
  { id: 'l-001', vendorId: 'vnd-001', vendorName: 'AutoParts Kenya Ltd', vendorRating: 4.8, vendorVerified: true, partSku: 'BRK-PAD-TY-001', partName: 'Toyota Prado Front Brake Pads', category: 'Brake System', brandName: 'Bosch', condition: 'NEW_OEM', unitPrice: 4500, wholesalePrice: 3800, bulkPrice: 3200, stockLevel: 45, image: '', description: 'Genuine Bosch brake pads for Toyota Land Cruiser Prado 150 series. High-quality friction material for optimal stopping power.', compatibility: ['Toyota Prado 150', 'Toyota Hilux 2016+'], rating: 4.7, reviewCount: 128, region: 'Nairobi' },
  { id: 'l-002', vendorId: 'vnd-002', vendorName: 'SpeedMax Auto', vendorRating: 4.5, vendorVerified: true, partSku: 'OIL-5W40-001', partName: 'Mobil 1 ESP 5W-40 Engine Oil (5L)', category: 'Engine Oil', brandName: 'Mobil 1', condition: 'NEW_OEM', unitPrice: 8500, wholesalePrice: 7200, stockLevel: 120, image: '', description: 'Fully synthetic engine oil for Mercedes-Benz and other European vehicles. Meets MB 229.31/229.51 specifications.', compatibility: ['Mercedes C-Class', 'Mercedes E-Class', 'BMW 3-Series'], rating: 4.9, reviewCount: 342, region: 'Nairobi' },
  { id: 'l-003', vendorId: 'vnd-001', vendorName: 'AutoParts Kenya Ltd', vendorRating: 4.8, vendorVerified: true, partSku: 'FIL-AIR-001', partName: 'Mann-Filter Air Filter C 30 005', category: 'Filters', brandName: 'Mann-Filter', condition: 'NEW_OEM', unitPrice: 1800, wholesalePrice: 1500, stockLevel: 80, image: '', description: 'High-quality air filter for optimal engine protection and performance.', compatibility: ['Toyota Prado', 'Toyota Land Cruiser'], rating: 4.6, reviewCount: 89, region: 'Nairobi' },
  { id: 'l-004', vendorId: 'vnd-003', vendorName: 'EuroParts Nairobi', vendorRating: 4.3, vendorVerified: false, partSku: 'BRK-DISC-MB-001', partName: 'Mercedes C-Class Front Brake Discs (Pair)', category: 'Brake System', brandName: 'ATE', condition: 'NEW_OEM', unitPrice: 18500, wholesalePrice: 16200, stockLevel: 12, image: '', description: 'Premium ventilated brake discs for Mercedes-Benz W205 C-Class.', compatibility: ['Mercedes C200', 'Mercedes C250'], rating: 4.4, reviewCount: 56, region: 'Nairobi' },
  { id: 'l-005', vendorId: 'vnd-002', vendorName: 'SpeedMax Auto', vendorRating: 4.5, vendorVerified: true, partSku: 'BAT-001', partName: 'Varta Silver Dynamic AGM Battery (95Ah)', category: 'Battery', brandName: 'Varta', condition: 'NEW_OEM', unitPrice: 28500, stockLevel: 25, image: '', description: 'High-performance AGM battery with exceptional cold cranking power.', compatibility: ['Mercedes C-Class', 'BMW 5-Series', 'Audi A6'], rating: 4.8, reviewCount: 201, region: 'Nairobi' },
  { id: 'l-006', vendorId: 'vnd-001', vendorName: 'AutoParts Kenya Ltd', vendorRating: 4.8, vendorVerified: true, partSku: 'SHK-AB-TY-001', partName: 'Toyota Prado Rear Shock Absorbers (Pair)', category: 'Suspension', brandName: 'KYB', condition: 'NEW_OEM', unitPrice: 12000, wholesalePrice: 10500, bulkPrice: 9200, stockLevel: 18, image: '', description: 'Gas-a-Just shock absorbers for improved handling and comfort.', compatibility: ['Toyota Prado 150'], rating: 4.5, reviewCount: 74, region: 'Nairobi' },
];

export const serviceNodes: ServiceNode[] = [
  { id: 'sn-001', businessName: 'Premium Car Care Nairobi', class: 'A', rating: 4.9, reviewCount: 234, distance: '2.3 km', verified: true, basePriceMin: 2500, basePriceMax: 15000, specializations: ['Detailing', 'Ceramic Coating', 'Window Tint', 'Interior Customization'], image: '', address: 'Westlands Business Park, Nairobi', phone: '+254 722 111 222' },
  { id: 'sn-002', businessName: 'AutoMax Garage & Bodyshop', class: 'B', rating: 4.7, reviewCount: 189, distance: '5.1 km', verified: true, basePriceMin: 5000, basePriceMax: 85000, specializations: ['Panel Beating', 'Spray Painting', 'Dent Removal', 'Chassis Alignment'], image: '', address: 'Industrial Area, Nairobi', phone: '+254 733 444 555' },
  { id: 'sn-003', businessName: 'TechDrive Diagnostics', class: 'C', rating: 4.8, reviewCount: 156, distance: '3.8 km', verified: true, basePriceMin: 3500, basePriceMax: 45000, specializations: ['ECU Tuning', 'AC Repair', 'Electrical Diagnostics', 'Wheel Alignment'], image: '', address: 'Kilimani, Nairobi', phone: '+254 711 666 777' },
  { id: 'sn-004', businessName: 'MegaFix Enterprise Garage', class: 'D', rating: 4.6, reviewCount: 312, distance: '8.2 km', verified: true, basePriceMin: 8000, basePriceMax: 250000, specializations: ['Full Service', 'Engine Overhaul', 'Transmission', 'Fleet Maintenance'], bayCount: 12, availableBays: 4, image: '', address: 'Mombasa Road, Nairobi', phone: '+254 720 888 999' },
  { id: 'sn-005', businessName: 'ShinePro Auto Spa', class: 'A', rating: 4.5, reviewCount: 98, distance: '1.5 km', verified: false, basePriceMin: 1500, basePriceMax: 8000, specializations: ['Car Wash', 'Detailing', 'Paint Protection'], image: '', address: 'Lavington, Nairobi', phone: '+254 734 555 666' },
  { id: 'sn-006', businessName: 'Precision Auto Electric', class: 'C', rating: 4.4, reviewCount: 76, distance: '4.5 km', verified: true, basePriceMin: 2500, basePriceMax: 35000, specializations: ['Auto Electrical', 'AC Service', 'Diagnostic Scan'], image: '', address: 'Ngong Road, Nairobi', phone: '+254 712 777 888' },
];

export const serviceItems: ServiceItem[] = [
  { id: 'si-001', nodeId: 'sn-003', name: 'Full ECU Diagnostics & Tune', description: 'Comprehensive engine control unit diagnostics with performance optimization tune.', basePrice: 15000, estimatedDuration: '2-3 hours', stampType: 'maintenance', category: 'ECU Tuning' },
  { id: 'si-002', nodeId: 'sn-003', name: 'AC System Diagnosis & Recharge', description: 'Complete air conditioning system diagnosis, leak detection, and refrigerant recharge.', basePrice: 8500, estimatedDuration: '1-2 hours', stampType: 'maintenance', category: 'AC Repair' },
  { id: 'si-003', nodeId: 'sn-001', name: 'Premium Ceramic Coating', description: 'Long-lasting ceramic paint protection with 5-year warranty.', basePrice: 12000, estimatedDuration: '6-8 hours', stampType: 'cosmetic', category: 'Ceramic Coating' },
  { id: 'si-004', nodeId: 'sn-002', name: 'Panel Beating & Respray', description: 'Professional panel beating and color-matched spray painting.', basePrice: 25000, estimatedDuration: '2-3 days', stampType: 'structural', category: 'Panel Beating' },
  { id: 'si-005', nodeId: 'sn-004', name: 'Full Engine Service', description: 'Comprehensive engine service including all filters, fluids, and inspection.', basePrice: 18500, estimatedDuration: '3-4 hours', stampType: 'comprehensive', category: 'Full Service' },
];

export const cartItems: CartItem[] = [
  { id: 'ci-001', type: 'part', name: 'Toyota Prado Front Brake Pads', quantity: 1, price: 4500, supplierName: 'AutoParts Kenya Ltd', image: '', escrowStatus: 'ESCROW' },
  { id: 'ci-002', type: 'service', name: 'AC System Diagnosis & Recharge', quantity: 1, price: 8500, supplierName: 'TechDrive Diagnostics', escrowStatus: 'ESCROW' },
];

export const emergencyRequests: EmergencyRequest[] = [
  { id: 'er-001', vehicleId: 'v-001', type: 'tow_truck', status: 'resolved', location: { lat: -1.2921, lng: 36.8219, address: 'Mombasa Road, near City Mall' }, responderName: 'Rapid Rescue Services', responderEta: '15 min', responderRating: 4.8, createdAt: '2026-06-20T14:30:00', resolvedAt: '2026-06-20T15:15:00' },
];

export const mechanicJobs: MechanicJob[] = [
  { id: 'mj-001', mechanicId: 'm-001', vehicleOwner: 'Sarah Wanjiku', vehicleInfo: 'Toyota RAV4 2021', serviceType: 'Brake Replacement', status: 'in_progress', earnings: 8500, scheduledAt: '2026-06-25T09:00:00', location: 'Westlands, Nairobi' },
  { id: 'mj-002', mechanicId: 'm-001', vehicleOwner: 'David Ochieng', vehicleInfo: 'Nissan X-Trail 2020', serviceType: 'Full Service', status: 'accepted', earnings: 12000, scheduledAt: '2026-06-26T10:00:00', location: 'Kilimani, Nairobi' },
  { id: 'mj-003', mechanicId: 'm-001', vehicleOwner: 'Grace Muthoni', vehicleInfo: 'Subaru Forester 2022', serviceType: 'Suspension Repair', status: 'pending', earnings: 18500, scheduledAt: '2026-06-27T14:00:00', location: 'Lavington, Nairobi' },
  { id: 'mj-004', mechanicId: 'm-001', vehicleOwner: 'Peter Kamau', vehicleInfo: 'Mazda CX-5 2019', serviceType: 'Oil Change', status: 'completed', earnings: 4500, scheduledAt: '2026-06-22T11:00:00', completedAt: '2026-06-22T12:30:00', rating: 5, location: 'Karen, Nairobi' },
];

export const earnings: EarningRecord[] = [
  { id: 'e-001', userId: 'm-001', amount: 8500, type: 'service', status: 'paid', date: '2026-06-24', description: 'Brake pad replacement - Toyota Corolla' },
  { id: 'e-002', userId: 'm-001', amount: 12000, type: 'service', status: 'pending', date: '2026-06-23', description: 'Full service - BMW X3' },
  { id: 'e-003', userId: 'm-001', amount: 6000, type: 'emergency', status: 'paid', date: '2026-06-22', description: 'Emergency roadside assistance' },
  { id: 'e-004', userId: 'm-001', amount: 15000, type: 'service', status: 'pending', date: '2026-06-21', description: 'Engine diagnostics & repair' },
];

export const fleetVehicles: FleetVehicle[] = [
  { id: 'fv-001', fleetId: 'f-001', licensePlate: 'KDA 100X', make: 'Toyota', model: 'Hiace', year: 2022, currentOdometer: 78500, riskStatus: 'HEALTHY', driverName: 'John Kamau', lastServiceDate: '2026-05-15' },
  { id: 'fv-002', fleetId: 'f-001', licensePlate: 'KDA 101X', make: 'Toyota', model: 'Hiace', year: 2022, currentOdometer: 92300, riskStatus: 'HEALTHY', driverName: 'Peter Ochieng', lastServiceDate: '2026-04-20' },
  { id: 'fv-003', fleetId: 'f-001', licensePlate: 'KDA 102X', make: 'Mitsubishi', model: 'Canter', year: 2021, currentOdometer: 112500, riskStatus: 'ATTENTION', lastFaultCode: 'P0420', driverName: 'Samuel Kipchoge', lastServiceDate: '2026-03-10' },
  { id: 'fv-004', fleetId: 'f-001', licensePlate: 'KDA 103X', make: 'Toyota', model: 'Hilux', year: 2023, currentOdometer: 34500, riskStatus: 'HEALTHY', driverName: 'James Mwangi', lastServiceDate: '2026-06-01' },
  { id: 'fv-005', fleetId: 'f-001', licensePlate: 'KDA 104X', make: 'Isuzu', model: 'NPR', year: 2020, currentOdometer: 145000, riskStatus: 'CRITICAL', lastFaultCode: 'P0301', driverName: 'Unassigned', lastServiceDate: '2026-01-15' },
];

export const notifications: NotificationItem[] = [
  { id: 'n-001', userId: 'usr-001', title: 'Service Reminder', message: 'Your Mercedes C200 brake inspection is due in 3 days.', type: 'warning', read: false, createdAt: '2026-06-25T08:00:00', actionUrl: '/service-appointments' },
  { id: 'n-002', userId: 'usr-001', title: 'Appointment Confirmed', message: 'James Kimani has confirmed your brake inspection for June 28.', type: 'success', read: false, createdAt: '2026-06-24T16:30:00', actionUrl: '/service-appointments' },
  { id: 'n-003', userId: 'usr-001', title: 'Marketplace Order', message: 'Your brake pads order has been shipped. ETA: June 27.', type: 'info', read: true, createdAt: '2026-06-23T10:15:00', actionUrl: '/orders' },
  { id: 'n-004', userId: 'usr-001', title: 'Predictive Alert', message: 'Battery voltage degradation detected on Mercedes C200. Schedule check.', type: 'warning', read: false, createdAt: '2026-06-22T14:00:00', actionUrl: '/predictive-alerts' },
  { id: 'n-005', userId: 'usr-001', title: 'Welcome to Sparekei Premium', message: 'Your Premium subscription is now active. Enjoy full platform access!', type: 'success', read: true, createdAt: '2026-06-01T09:00:00' },
];

export const ownerMetrics: DashboardMetric[] = [
  { label: 'Vehicles', value: 2, icon: 'Car', trend: 'neutral' },
  { label: 'Health Score', value: '90%', icon: 'HeartPulse', trend: 'up', change: 2 },
  { label: 'Upcoming Services', value: 2, icon: 'Wrench', trend: 'neutral' },
  { label: 'Alerts', value: 3, icon: 'AlertTriangle', trend: 'up', change: 1 },
];

export const mechanicMetrics: DashboardMetric[] = [
  { label: 'Active Jobs', value: 3, icon: 'Wrench', trend: 'up', change: 2 },
  { label: 'Completed This Week', value: 12, icon: 'CheckCircle', trend: 'up', change: 5 },
  { label: 'Earnings (MTD)', value: 'KSh 85,400', icon: 'Banknote', trend: 'up', change: 12 },
  { label: 'Rating', value: '4.9', icon: 'Star', trend: 'neutral' },
];

export const vendorMetrics: DashboardMetric[] = [
  { label: 'Active Listings', value: 156, icon: 'Package', trend: 'up', change: 8 },
  { label: 'Orders This Month', value: 42, icon: 'ShoppingCart', trend: 'up', change: 15 },
  { label: 'Revenue (MTD)', value: 'KSh 340K', icon: 'Banknote', trend: 'up', change: 23 },
  { label: 'Stock Alerts', value: 3, icon: 'AlertTriangle', trend: 'down', change: 2 },
];

export const adminMetrics: DashboardMetric[] = [
  { label: 'Total Users', value: '12,458', icon: 'Users', trend: 'up', change: 8 },
  { label: 'Transactions (Today)', value: '1,234', icon: 'ArrowLeftRight', trend: 'up', change: 15 },
  { label: 'Revenue (Today)', value: 'KSh 2.4M', icon: 'Banknote', trend: 'up', change: 12 },
  { label: 'Active Emergencies', value: 3, icon: 'Siren', trend: 'down', change: 2 },
];

export const cities: CityData[] = [
  { id: 'c-001', name: 'Nairobi', country: 'Kenya', status: 'fully_operational', population: 4700000, demandScore: 95, mechanicsCount: 1240, garagesCount: 380, vendorsCount: 520, pppMultiplier: 1.0 },
  { id: 'c-002', name: 'Mombasa', country: 'Kenya', status: 'fully_operational', population: 1200000, demandScore: 78, mechanicsCount: 450, garagesCount: 120, vendorsCount: 180, pppMultiplier: 0.95 },
  { id: 'c-003', name: 'Kampala', country: 'Uganda', status: 'operational', population: 1650000, demandScore: 82, mechanicsCount: 380, garagesCount: 95, vendorsCount: 140, pppMultiplier: 0.85 },
  { id: 'c-004', name: 'Dar es Salaam', country: 'Tanzania', status: 'operational', population: 6300000, demandScore: 88, mechanicsCount: 520, garagesCount: 150, vendorsCount: 210, pppMultiplier: 0.82 },
  { id: 'c-005', name: 'Kigali', country: 'Rwanda', status: 'recruiting', population: 1400000, demandScore: 65, mechanicsCount: 120, garagesCount: 35, vendorsCount: 55, pppMultiplier: 0.75 },
  { id: 'c-006', name: 'Lagos', country: 'Nigeria', status: 'planned', population: 14800000, demandScore: 92, mechanicsCount: 0, garagesCount: 0, vendorsCount: 0, pppMultiplier: 0.7 },
];

export const funnelStages: FunnelStage[] = [
  { stage: 'Impression', count: 15420, conversionRate: 100 },
  { stage: 'Click', count: 4626, conversionRate: 30 },
  { stage: 'Application', count: 1388, conversionRate: 30 },
  { stage: 'Interview', count: 556, conversionRate: 40 },
  { stage: 'Hired', count: 278, conversionRate: 50 },
  { stage: 'Active', count: 195, conversionRate: 70 },
];

export const competitorData: CompetitorData[] = [
  { id: 'cmp-001', cityId: 'c-001', cityName: 'Nairobi', competitorName: 'AutoDoc Kenya', pricing: 28500, serviceCoverage: ['Diagnostics', 'Parts'], lastUpdated: '2026-06-24' },
  { id: 'cmp-002', cityId: 'c-001', cityName: 'Nairobi', competitorName: 'MechanicHub', pricing: 32000, serviceCoverage: ['Mobile Mechanic', 'Towing'], lastUpdated: '2026-06-23' },
  { id: 'cmp-003', cityId: 'c-002', cityName: 'Mombasa', competitorName: 'CoastAuto', pricing: 24000, serviceCoverage: ['Service', 'Parts'], lastUpdated: '2026-06-22' },
];

export const chatMessages: ChatMessage[] = [
  { id: 'cm-001', role: 'assistant', content: 'Hello! I\'m Sparekei AI Concierge. How can I help you today?', timestamp: '2026-06-25T10:00:00' },
  { id: 'cm-002', role: 'user', content: 'My check engine light came on. What should I do?', timestamp: '2026-06-25T10:01:00' },
  { id: 'cm-003', role: 'assistant', content: 'A check engine light can indicate various issues. I recommend scheduling a diagnostic scan. Would you like me to find nearby diagnostic centers or help you understand common causes?', timestamp: '2026-06-25T10:01:30' },
];

export const reviews: Review[] = [
  { id: 'r-001', reviewerName: 'James Mwangi', rating: 5, comment: 'Excellent service! Very professional and quick turnaround.', date: '2026-06-20', avatar: 'https://i.pravatar.cc/150?u=james' },
  { id: 'r-002', reviewerName: 'Sarah Ochieng', rating: 4, comment: 'Great work on my brake replacement. Fair pricing too.', date: '2026-06-18', avatar: 'https://i.pravatar.cc/150?u=sarah' },
  { id: 'r-003', reviewerName: 'David Kimani', rating: 5, comment: 'Best mechanic I\'ve found in Nairobi. Highly recommended!', date: '2026-06-15', avatar: 'https://i.pravatar.cc/150?u=david' },
];

export const revenueChartData = [
  { name: 'Jan', revenue: 420000, orders: 280 },
  { name: 'Feb', revenue: 380000, orders: 250 },
  { name: 'Mar', revenue: 510000, orders: 340 },
  { name: 'Apr', revenue: 480000, orders: 310 },
  { name: 'May', revenue: 620000, orders: 410 },
  { name: 'Jun', revenue: 750000, orders: 520 },
];

export const userGrowthData = [
  { name: 'Jan', users: 4200, mechanics: 180, vendors: 120 },
  { name: 'Feb', users: 5100, mechanics: 220, vendors: 145 },
  { name: 'Mar', users: 6200, mechanics: 280, vendors: 180 },
  { name: 'Apr', users: 7800, mechanics: 340, vendors: 220 },
  { name: 'May', users: 9500, mechanics: 420, vendors: 280 },
  { name: 'Jun', users: 12458, mechanics: 520, vendors: 350 },
];

export const categoryHierarchy = [
  {
    name: 'Engine & Drivetrain',
    subcategories: ['Engine Parts', 'Transmission', 'Belts & Chains', 'Gaskets & Seals', 'Fuel System'],
  },
  {
    name: 'Brake System',
    subcategories: ['Brake Pads', 'Brake Discs', 'Brake Drums', 'Brake Calipers', 'Brake Fluid'],
  },
  {
    name: 'Suspension & Steering',
    subcategories: ['Shock Absorbers', 'Struts', 'Control Arms', 'Steering Components', 'Springs'],
  },
  {
    name: 'Electrical & Ignition',
    subcategories: ['Battery', 'Alternator', 'Starter Motor', 'Spark Plugs', 'Sensors'],
  },
  {
    name: 'Cooling & Heating',
    subcategories: ['Radiator', 'Water Pump', 'Thermostat', 'Heater Core', 'AC Compressor'],
  },
  {
    name: 'Body & Exterior',
    subcategories: ['Bumpers', 'Fenders', 'Doors', 'Lights', 'Mirrors'],
  },
];
