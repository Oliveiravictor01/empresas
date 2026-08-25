export type PaymentMethod = 
  | 'Pix' 
  | 'Dinheiro' 
  | 'Cartão de Crédito' 
  | 'Cartão de Débito' 
  | 'Transferência' 
  | 'Boleto' 
  | 'Outro';

export type ExpenseCategory = 
  | 'Estoque' 
  | 'Fornecedor' 
  | 'Funcionários' 
  | 'Aluguel' 
  | 'Energia' 
  | 'Internet' 
  | 'Transporte' 
  | 'Marketing' 
  | 'Impostos' 
  | 'Equipamentos' 
  | 'Outros';

export type TransactionStatus = 
  | 'Pago' 
  | 'Concluída' 
  | 'Pendente' 
  | 'Cancelada' 
  | 'Agendado' 
  | 'Recebido' 
  | 'Vencido' 
  | 'Atrasado';

export type TaskPriority = 'Baixa' | 'Média' | 'Alta' | 'Urgente';
export type TaskStatus = 'Pendente' | 'Em andamento' | 'Em Andamento' | 'Concluída';

export type PeriodFilter = 'hoje' | '7dias' | '30dias' | 'esteMes' | 'mesAnterior' | 'personalizado';

export type ItemType = 'Produto' | 'Serviço';

export type UnitType = 
  | 'un' 
  | 'L' 
  | 'ml' 
  | 'kg' 
  | 'g' 
  | 'm' 
  | 'cm' 
  | 'cx' 
  | 'pct' 
  | 'outro';

export type BaseUnit = 'un' | 'ml' | 'g' | 'm' | 'cm';

export type UserRole = 'MASTER' | 'GERENTE' | 'OPERADOR' | 'admin' | 'manager' | 'employee' | 'user';

export type AppModule = 
  | 'dashboard'
  | 'sales'
  | 'inventory'
  | 'products'
  | 'customers'
  | 'suppliers'
  | 'expenses'
  | 'accounts_payable'
  | 'accounts_receivable'
  | 'reports'
  | 'tasks'
  | 'comparison'
  | 'companies'
  | 'users'
  | 'activity_logs'
  | 'settings'
  | 'drive';

export type PermissionAction = 'view' | 'create' | 'edit' | 'delete';

export interface ModulePermission {
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

export type PermissionsMap = Record<AppModule, ModulePermission>;

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  username?: string;
  registration_number?: string;
  role: UserRole;
  is_master?: boolean;
  status?: 'active' | 'inactive' | 'pending';
  company_ids: string[]; // ['*'] for admin/master
  permissions?: PermissionsMap;
  created_at: string;
  last_login?: string;
}

export interface UserAccount extends UserProfile {
  password_hash?: string;
}

export interface ActivityLog {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  company_id?: string;
  company_name?: string;
  action: 'create' | 'update' | 'delete' | 'cancel' | 'login' | 'status_change';
  module: string;
  description: string;
  record_id?: string;
  created_at: string;
}

export interface Company {
  id: string;
  name: string;
  trade_name?: string; // Razão social
  cnpj?: string;
  phone?: string;
  email?: string;
  address?: string;
  category: string; // Segmento empresarial
  color: string; // Theme color for badge
  logo_url?: string;
  status: 'active' | 'inactive';
  notes?: string;
  created_at: string;
}

// Composition / Ficha Técnica item (component consumed when item is sold)
export interface ItemComposition {
  product_id: string;
  product_name: string;
  quantity: number; // Consumed quantity per 1 unit of the parent item
  unit: UnitType;
  unit_cost_estimate?: number;
}

// Backwards compatibility alias
export type ServiceItem = ItemComposition;

// Generic Product / Service record
export interface Product {
  id: string;
  company_id: string;
  name: string;
  sku?: string;
  type: ItemType; // 'Produto' | 'Serviço'
  category: string;
  sale_price: number;
  cost_price: number; // Cost per unit
  unit: UnitType; // un, L, ml, kg, g, m, cm, cx, pct, outro
  track_stock: boolean; // Controls inventory deduction
  quantity: number; // Current stock balance (allows decimals: 0.5, 1.25, 250, etc.)
  min_quantity: number;
  max_quantity?: number;
  status: 'Ativo' | 'Inativo';
  supplier_id?: string;
  supplier_name?: string;
  location?: string;
  notes?: string;
  composition?: ItemComposition[]; // Optional Ficha Técnica
  last_entry_date?: string;
  last_movement_date?: string;
  created_at: string;

  // Backwards compatibility fields
  control_unit?: UnitType;
  base_unit?: string;
  cost_per_base_unit?: number;
}

// Backward compatibility alias
export interface CarWashService {
  id: string;
  company_id: string;
  name: string;
  description?: string;
  category?: string;
  sale_price: number;
  items: ItemComposition[];
  status: 'Ativo' | 'Inativo';
  estimated_duration_min?: number;
  notes?: string;
  created_at: string;
}

export type Service = CarWashService;

// Consumed item recorded during a sale
export interface ConsumedItemRecord {
  product_id: string;
  product_name: string;
  quantity: number;
  unit: UnitType | string;
  unit_cost: number;
  total_cost: number;
}

export type ConsumedSupplyItem = ConsumedItemRecord;

// Single item inside a multi-item sale
export interface SaleItem {
  id?: string;
  product_id: string;
  name: string;
  type: ItemType;
  quantity: number;
  unit_price: number;
  discount?: number;
  total_price: number;
  unit_cost?: number;
  total_cost?: number;
  unit?: UnitType;
  product_name?: string; // alias
}

export interface Sale {
  id: string;
  company_id: string;
  customer_id?: string;
  customer_name: string;
  date: string;
  payment_method: PaymentMethod;
  status: 'Pago' | 'Concluída' | 'Pendente' | 'Cancelada';
  items?: SaleItem[];
  discount?: number;
  total_amount: number;
  total_cost?: number; // Cost of products + consumed composition items
  gross_margin?: number; // total_amount - total_cost
  consumed_items?: ConsumedItemRecord[];
  notes?: string;
  auto_stock_deducted?: boolean;
  created_at: string;

  // Backwards compatibility aliases
  product_service?: string;
  quantity?: number;
  unit_price?: number;
  supplies_cost?: number;
  service_id?: string;
}

export interface Expense {
  id: string;
  company_id: string;
  description: string;
  category: ExpenseCategory;
  supplier_id?: string;
  supplier_name?: string;
  amount: number;
  payment_method: PaymentMethod;
  date: string;
  due_date?: string;
  status: 'Pago' | 'Pendente' | 'Agendado';
  notes?: string;
  created_at: string;
}

export interface AccountPayable {
  id: string;
  company_id: string;
  description: string;
  supplier_id?: string;
  supplier_name: string;
  amount: number;
  due_date: string;
  status: 'Pendente' | 'Pago' | 'Vencido';
  paid_date?: string;
  category?: ExpenseCategory;
  notes?: string;
  created_at: string;
}

export interface AccountReceivable {
  id: string;
  company_id: string;
  customer_id?: string;
  customer_name: string;
  description: string;
  amount: number;
  due_date: string;
  status: 'Pendente' | 'Recebido' | 'Atrasado';
  received_date?: string;
  payment_method?: PaymentMethod;
  notes?: string;
  created_at: string;
}

export interface InventoryMovement {
  id: string;
  company_id: string;
  product_id: string;
  product_name: string;
  type: 'entrada' | 'saida' | 'ajuste';
  quantity: number;
  unit?: UnitType | string;
  previous_quantity: number;
  new_quantity: number;
  unit_cost?: number;
  total_cost?: number;
  reason: string;
  reference_type?: 'venda' | 'estorno_venda' | 'compra' | 'ajuste_manual' | 'perda_desperdicio' | 'inicial';
  reference_id?: string; // e.g. sale_id
  created_by?: string;
  date: string;
  created_at: string;
}

export interface Customer {
  id: string;
  company_id: string;
  name: string;
  document?: string; // CPF or CNPJ
  cpf_cnpj?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  address?: string;
  notes?: string;
  created_at: string;

  // Optional legacy
  vehicle_plate?: string;
  vehicle_model?: string;
}

export interface Supplier {
  id: string;
  company_id: string;
  name: string;
  contact_name?: string;
  cnpj_cpf?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  address?: string;
  category?: string;
  products_supplied?: string;
  notes?: string;
  created_at: string;
}

export interface Task {
  id: string;
  company_id: string; // or 'all'
  title: string;
  description?: string;
  assigned_to?: string;
  due_date?: string;
  priority: TaskPriority;
  status: TaskStatus;
  notes?: string;
  completed_at?: string;
  created_at: string;
}

export interface AppData {
  companies: Company[];
  sales: Sale[];
  expenses: Expense[];
  accountsPayable: AccountPayable[];
  accountsReceivable: AccountReceivable[];
  products: Product[];
  services: CarWashService[];
  inventoryMovements: InventoryMovement[];
  customers: Customer[];
  suppliers: Supplier[];
  tasks: Task[];
  users: UserAccount[];
  activityLogs: ActivityLog[];
  user: UserProfile;
  isDemoMode?: boolean;
}

export interface ToastNotification {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  timestamp: number;
}

export type ActiveTab = 
  | 'overview' 
  | 'company-detail' 
  | 'companies-manage' 
  | 'sales' 
  | 'products-services' 
  | 'inventory' 
  | 'customers' 
  | 'suppliers' 
  | 'expenses' 
  | 'accounts-payable' 
  | 'accounts-receivable' 
  | 'reports' 
  | 'tasks' 
  | 'comparison' 
  | 'users'
  | 'activity-logs'
  | 'database-settings'
  | 'google-drive';
