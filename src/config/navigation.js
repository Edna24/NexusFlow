import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  ClipboardList,
  Wallet,
  Users,
  BarChart3,
  Settings,
  Sparkles,
} from 'lucide-react'

export const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/assistant', label: 'AI Assistant', icon: Sparkles },
  { path: '/sales', label: 'Sales', icon: ShoppingCart },
  { path: '/inventory', label: 'Inventory', icon: Package },
  { path: '/orders', label: 'Orders', icon: ClipboardList },
  { path: '/payments', label: 'Payments', icon: Wallet },
  { path: '/customers', label: 'Customers', icon: Users },
  { path: '/reports', label: 'Reports', icon: BarChart3 },
  { path: '/settings', label: 'Settings', icon: Settings },
]

/** Primary destinations shown in the mobile bottom bar. */
export const mobilePrimaryNav = [
  navItems[0],
  navItems[2],
  navItems[3],
  navItems[4],
]

export const pageTitles = {
  '/': 'Dashboard',
  '/assistant': 'AI Assistant',
  '/sales': 'Sales',
  '/inventory': 'Inventory',
  '/orders': 'Orders',
  '/payments': 'Payments',
  '/customers': 'Customers',
  '/reports': 'Reports',
  '/settings': 'Settings',
}