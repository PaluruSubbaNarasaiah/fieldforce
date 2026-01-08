import { 
  LayoutDashboard, 
  MapPin, 
  Users, 
  ClipboardList, 
  Briefcase, 
  IndianRupee, 
  ShoppingCart, 
  CheckSquare,
  UserPlus,
  FileCheck,
  Camera,
  Image
} from 'lucide-react';
import { UserRole } from './types';

export const MENU_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: [UserRole.ADMIN, UserRole.HR, UserRole.EMPLOYEE] },
  { id: 'users', label: 'Team Management', icon: UserPlus, roles: [UserRole.ADMIN, UserRole.HR] },
  { id: 'onboarding', label: 'Onboarding', icon: FileCheck, roles: [UserRole.HR] },
  { id: 'attendance', label: 'Geo-Attendance', icon: MapPin, roles: [UserRole.ADMIN, UserRole.HR, UserRole.EMPLOYEE] },
  { id: 'proof', label: 'GPS Photo Proof', icon: Camera, roles: [UserRole.EMPLOYEE] },
  { id: 'gallery', label: 'Proof Gallery', icon: Image, roles: [UserRole.ADMIN, UserRole.HR] },
  { id: 'visits', label: 'Visits', icon: ClipboardList, roles: [UserRole.ADMIN, UserRole.EMPLOYEE] },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare, roles: [UserRole.ADMIN, UserRole.EMPLOYEE] },
  { id: 'leads', label: 'Lead Management', icon: Users, roles: [UserRole.ADMIN, UserRole.EMPLOYEE] },
  { id: 'orders', label: 'Orders', icon: ShoppingCart, roles: [UserRole.ADMIN, UserRole.EMPLOYEE] },
  { id: 'expenses', label: 'Expenses', icon: IndianRupee, roles: [UserRole.ADMIN, UserRole.HR, UserRole.EMPLOYEE] },
  { id: 'tracking', label: 'Live Tracking', icon: Briefcase, roles: [UserRole.ADMIN, UserRole.HR] },
];