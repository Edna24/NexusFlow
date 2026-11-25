/**
 * Illustrative demo data for the Dashboard UI only.
 * Not connected to Supabase or any live backend.
 */

export const DEMO_BUSINESS_NAME = 'Adebola Provisions'

export const demoStats = {
  todaysSales: 248500,
  transactions: 37,
  totalProducts: 186,
  lowStockItems: 8,
  outstandingPayments: 92000,
}

export const salesTrend = [
  { day: 'Mon', sales: 142000 },
  { day: 'Tue', sales: 168500 },
  { day: 'Wed', sales: 121000 },
  { day: 'Thu', sales: 195000 },
  { day: 'Fri', sales: 231000 },
  { day: 'Sat', sales: 278000 },
  { day: 'Sun', sales: 248500 },
]

export const recentTransactions = [
  {
    id: 'TX-1042',
    customer: 'Chioma Okeke',
    channel: 'In-store',
    amount: 18500,
    status: 'Paid',
    time: '2:14 PM',
  },
  {
    id: 'TX-1041',
    customer: 'Walk-in customer',
    channel: 'In-store',
    amount: 4200,
    status: 'Paid',
    time: '1:48 PM',
  },
  {
    id: 'TX-1040',
    customer: 'Ibrahim Musa',
    channel: 'WhatsApp',
    amount: 27600,
    status: 'Partial',
    time: '12:55 PM',
  },
  {
    id: 'TX-1039',
    customer: 'Funke Adebayo',
    channel: 'WhatsApp',
    amount: 9800,
    status: 'Paid',
    time: '11:30 AM',
  },
  {
    id: 'TX-1038',
    customer: 'Tunde Bakare',
    channel: 'In-store',
    amount: 15300,
    status: 'Pending',
    time: '10:12 AM',
  },
  {
    id: 'TX-1037',
    customer: 'Ngozi Eze',
    channel: 'WhatsApp',
    amount: 6400,
    status: 'Paid',
    time: '9:40 AM',
  },
]

export const lowStockProducts = [
  { id: 'P-012', name: 'Peak Milk 400g', sku: 'PEAK-400', stock: 4, reorderAt: 12 },
  { id: 'P-045', name: 'Indomie Chicken x40', sku: 'IND-CHK-40', stock: 2, reorderAt: 10 },
  { id: 'P-078', name: 'Dettol Soap 100g', sku: 'DET-100', stock: 6, reorderAt: 15 },
  { id: 'P-091', name: 'Coca-Cola 50cl (crate)', sku: 'COKE-50-CR', stock: 1, reorderAt: 5 },
  { id: 'P-103', name: 'Golden Penny Semovita 1kg', sku: 'GP-SEM-1', stock: 5, reorderAt: 20 },
]
