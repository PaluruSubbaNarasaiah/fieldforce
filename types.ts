
export enum VisitStatus {
  SCHEDULED = 'Scheduled',
  IN_PROGRESS = 'In Progress',
  COMPLETED = 'Completed',
  CANCELLED = 'Cancelled'
}

export enum LeadStatus {
  NEW = 'New',
  CONTACTED = 'Contacted',
  QUALIFIED = 'Qualified',
  CONVERTED = 'Converted'
}

export enum TaskPriority {
  LOW = 'Low',
  MEDIUM = 'Medium',
  HIGH = 'High'
}

export enum UserRole {
  ADMIN = 'Admin',
  HR = 'HR',
  EMPLOYEE = 'Employee'
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar: string;
  password?: string; // Added password field
}

export interface Location {
  lat: number;
  lng: number;
  address?: string;
  timestamp: string;
}

export interface Staff {
  id: string;
  name: string;
  role: string;
  status: 'Active' | 'Inactive' | 'On Leave';
  currentLocation?: Location;
  avatar: string;
}

export interface Visit {
  id: string;
  customerName: string;
  address: string;
  date: string;
  status: VisitStatus;
  assignedTo: string;
  notes?: string;
}

export interface TaskHistoryItem {
  timestamp: string;
  action: string;
  changedBy: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: TaskPriority;
  status: 'Pending' | 'In Progress' | 'Completed';
  assignedTo: string;
  dueDate: string;
  history?: TaskHistoryItem[];
}

export interface Lead {
  id: string;
  company: string;
  contactPerson: string;
  email: string;
  phone: string;
  status: LeadStatus;
  potentialValue: number;
}

export interface Expense {
  id: string;
  category: string;
  amount: number;
  date: string;
  description: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  receiptUrl?: string;
}

export interface Order {
  id: string;
  customer: string;
  items: string[];
  total: number;
  date: string;
  status: 'Pending' | 'Shipped' | 'Delivered';
}

export interface OnboardingTask {
  id: string;
  employeeName: string;
  task: string;
  status: 'Pending' | 'In Progress' | 'Completed';
  dueDate: string;
}

export interface PhotoLog {
  id: string;
  executiveId: string;
  executiveName: string;
  timestamp: string;
  latitude: number;
  longitude: number;
  address: string;
  campaign: string;
  notes: string;
  photoUrl: string; // View Link
  driveFileId: string; // For Admin download
  status: 'Synced' | 'Pending';
}