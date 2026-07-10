export type UserRole = 'admin' | 'cashier' | 'stock_manager';

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  email: string;
  active: boolean;
  password?: string;
}

export interface PurchaseRecord {
  invoiceId: string;
  date: string;
  total: number;
}

export interface DebtPayment {
  id: string;
  date: string;
  amount: number;
  paymentMethod: PaymentMethod;
  notes?: string;
  operator: string;
}

export interface PostalCheck {
  id: string;
  amount: number;
  entryDate: string;
  expiryDate: string;
}

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  joinDate: string;
  totalSpent: number;
  purchases: PurchaseRecord[];
  outstandingDebt?: number; // total unpaid or partial invoices sum
  debtDate?: string; // Date the debt occurred
  debtDueDate?: string; // Debt collection/due date
  debtPayments?: DebtPayment[]; // historical repayments towards this debt
  hasPostalCheck?: boolean;
  postalChecks?: PostalCheck[]; // Multiple postal checks support
}

export interface Product {
  id: string;
  name: string;
  sku: string; // SKU or Barcode
  buyPrice: number;
  sellPrice: number;
  category: string;
  stock: number;
  minStockAlert: number;
  description: string;
  image: string; // URL, Base64, or visual placeholder representation
  version?: number;
}

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  type: 'in' | 'out'; // 'in' = entry, 'out' = exit
  qty: number;
  date: string;
  reason: string;
  operator: string;
  batchId?: string;
}

export interface InvoiceItem {
  productId: string;
  name: string;
  qty: number;
  sellPrice: number;
  buyPrice: number; // to compute actual profit
}

export type InvoiceStatus = 'paid' | 'pending' | 'cancelled';
export type PaymentMethod = 'cash' | 'card' | 'transfer' | 'check';

export interface Invoice {
  id: string;
  invoiceNumber: string;
  clientName: string;
  clientId?: string;
  clientPhone?: string;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  profit: number; // sellPrice - buyPrice total
  date: string;
  status: InvoiceStatus;
  paymentMethod: PaymentMethod;
  paymentStatus?: 'paid' | 'unpaid' | 'partial';
  amountPaid?: number;
  amountDue?: number;
  notes?: string;
  cashierName: string;
}

export interface AppTranslation {
  // Navigation
  dashboard: string;
  pos: string;
  products: string;
  clients: string;
  stock: string;
  sales: string;
  users: string;
  settings: string;
  logout: string;
  account: string;

  // General dashboard stats
  revenue: string;
  profit: string;
  totalSales: string;
  activeClients: string;
  lowStockAlerts: string;
  topSellingProducts: string;
  recentSales: string;

  // Actions
  add: string;
  edit: string;
  delete: string;
  save: string;
  cancel: string;
  search: string;
  actions: string;
  print: string;
  filter: string;

  // POS / Checkout
  cart: string;
  emptyCart: string;
  checkout: string;
  selectClient: string;
  discountPlh: string;
  taxPlh: string;
  paymentDone: string;
  receiptTicket: string;

  // Stock
  stockEntry: string;
  stockExit: string;
  currentStock: string;
  minStock: string;
  inventoryHistory: string;

  // Interface Language
  langFrench: string;
  langArabic: string;
}

export interface SystemActivity {
  id: string;
  type: 'sale' | 'product_add' | 'product_edit' | 'product_delete' | 'client_add' | 'client_edit' | 'client_delete' | 'stock_edit' | 'withdraw_add' | 'withdraw_edit' | 'withdraw_delete' | 'invoice_edit' | 'invoice_delete';
  date: string;
  operator: string;
  descriptionAr: string;
  descriptionFr: string;
  targetId: string;
}

