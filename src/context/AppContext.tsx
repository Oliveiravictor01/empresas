// AppContext.tsx - versão de produção
// Autenticação e dados oficiais via Supabase.
// Não utilizar dados mock/demo como fonte de dados do aplicativo.

import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode, useCallback } from 'react';
import {
  UserProfile,
  UserAccount,
  ActivityLog,
  UserRole,
  AppModule,
  PermissionAction,
  Company,
  Sale,
  SaleItem,
  Expense,
  AccountPayable,
  AccountReceivable,
  Product,
  ItemComposition,
  ConsumedItemRecord,
  InventoryMovement,
  Customer,
  Supplier,
  Task,
  ActiveTab,
  PeriodFilter,
  ToastNotification,
  UnitType,
} from '../types';
import {
  AppData,
  loadAppData,
  saveAppData,
  getDemoData,
  clearAllData,
  DEFAULT_ADMIN_USER,
  loadSupabaseConfig,
  saveSupabaseConfig,
  SupabaseConfig,
  isMasterConfiguredInStorage,
  setMasterConfiguredInStorage,
  loadAuthSession,
  saveAuthSession,
  clearAuthSession,
} from '../lib/storage';
import { generateUUID, getTodayDateString, formatCurrency } from '../lib/utils';
import { formatCompactStock, formatStockDisplay } from '../lib/unitConversion';
import {
  getSupabaseClient,
  pushDataToSupabase,
  pullDataFromSupabase,
  checkSupabaseHasMaster,
  createSupabaseMaster,
  requestPasswordReset,
  createSupabasePublicUser,
  signInSupabase,
  signOutSupabase,
  getInitialSupabaseSession,
  syncUserUpdateToSupabase,
  deleteUserFromSupabase,
  syncCompanyToSupabase,
  deleteCompanyFromSupabase,
  syncSaleToSupabase,
  deleteSaleFromSupabase,
  syncExpenseToSupabase,
  deleteExpenseFromSupabase,
  syncAccountPayableToSupabase,
  deleteAccountPayableFromSupabase,
  syncAccountReceivableToSupabase,
  deleteAccountReceivableFromSupabase,
  syncProductToSupabase,
  deleteProductFromSupabase,
  syncCustomerToSupabase,
  deleteCustomerFromSupabase,
  syncSupplierToSupabase,
  deleteSupplierFromSupabase,
  syncTaskToSupabase,
  deleteTaskFromSupabase,
  syncInventoryMovementToSupabase,
  syncActivityLogToSupabase,
} from '../lib/supabase';
import {
  checkFirestoreMasterConfigured,
  initializeMasterInFirestore,
  authenticateWithFirestore,
  loadAllDataFromFirestore,
  syncDocToFirestore,
  deleteDocFromFirestore,
  syncFullAppDataToFirestore,
} from '../lib/firestore';
import { checkUserModulePermission, getFullPermissions, getDefaultRolePermissions, getEmptyPermissions } from '../lib/permissions';
import { setupSupabaseRealtime, RealtimeStatus } from '../lib/realtime';

export const MASTER_ADMIN_EMAIL = 'Oliveira.Victor968@gmail.com';

interface QuickActionState {
  isOpen: boolean;
  defaultType?: 'sale' | 'expense' | 'receivable' | 'payable' | 'stock_in' | 'stock_out' | 'stock_adjust';
}

export interface DeleteConfirmState {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
}

interface AppContextType {
  // State
  data: AppData;
  user: UserProfile;
  users: UserAccount[];
  activityLogs: ActivityLog[];
  isAuthenticated: boolean;
  isCheckingMaster: boolean;
  hasMasterConfigured: boolean;
  isMasterUser: boolean;
  canEditOrDelete: boolean;
  allowedCompanies: Company[];
  activeTab: ActiveTab;
  selectedCompanyId: string | null; // null = Visão Geral (Todas as 8 Empresas)
  periodFilter: PeriodFilter;
  customDateRange: { start: string; end: string };
  searchQuery: string;
  quickAction: QuickActionState;
  supabaseConfig: SupabaseConfig;
  realtimeStatus: RealtimeStatus;
  toasts: ToastNotification[];
  isSyncing: boolean;
  confirmDeleteModal: DeleteConfirmState | null;
  isImpersonating: boolean;
  originalMasterUser: UserProfile | null;
  exitImpersonation: () => void;
  
  // Setters & Helpers
  setActiveTab: (tab: ActiveTab) => void;
  setSelectedCompanyId: (id: string | null) => void;
  setPeriodFilter: (filter: PeriodFilter) => void;
  setCustomDateRange: (range: { start: string; end: string }) => void;
  setSearchQuery: (query: string) => void;
  openQuickAction: (type?: 'sale' | 'expense' | 'receivable' | 'payable' | 'stock_in' | 'stock_out' | 'stock_adjust') => void;
  closeQuickAction: () => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning', duration?: number) => void;
  removeToast: (id: string) => void;
  canAccessCompany: (companyId?: string | null) => boolean;
  hasPermission: (module: AppModule, action?: PermissionAction) => boolean;
  canAccessTab: (tab: ActiveTab) => boolean;
  requestDeleteConfirm: (options: { title?: string; message?: string; onConfirm: () => void }) => void;
  closeDeleteConfirm: () => void;
  logActivity: (options: {
    companyId?: string;
    module: string;
    action: 'create' | 'update' | 'delete' | 'cancel' | 'login' | 'status_change';
    description: string;
    recordId?: string;
  }) => void;
  
  // Auth, Setup & User Management
  login: (email: string, pass: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  setupMasterUser: (params: { name: string; username?: string; email?: string; password: string }) => Promise<{ success: boolean; message: string }>;
  requestPasswordRecovery: (identifier: string) => Promise<{ success: boolean; message: string }>;
  registerPublicUser: (params: { name: string; email: string; password: string }) => Promise<{ success: boolean; message: string }>;
  approveUser: (userId: string, role: UserRole, companyIds: string[]) => void;
  resetMasterToSimulateFirstAccess: () => void;
  refreshData: () => Promise<void>;
  updateUser: (user: Partial<UserProfile>) => void;
  switchUserMode: (mode: 'master' | 'operator', targetCompanyId?: string) => void;
  switchActiveUser: (userIdOrAccount: string | UserAccount) => void;
  addUser: (user: Omit<UserAccount, 'id' | 'created_at'>) => UserAccount;
  updateUserAccount: (id: string, updates: Partial<UserAccount>) => void;
  deleteUserAccount: (id: string) => void;
  toggleUserStatus: (id: string) => void;
  resetUserPassword: (id: string, newPassword?: string) => void;
  
  // CRUD Companies
  addCompany: (company: Omit<Company, 'id' | 'created_at'>) => Company;
  updateCompany: (id: string, updates: Partial<Company>) => void;
  deleteCompany: (id: string) => void;
  
  // CRUD Sales & Estorno
  addSale: (sale: Omit<Sale, 'id' | 'created_at'>) => Sale;
  updateSale: (id: string, updates: Partial<Sale>) => void;
  deleteSale: (id: string) => void;
  cancelSale: (id: string) => void;
  
  // CRUD Expenses
  addExpense: (expense: Omit<Expense, 'id' | 'created_at'>) => Expense;
  updateExpense: (id: string, updates: Partial<Expense>) => void;
  deleteExpense: (id: string) => void;
  
  // CRUD Accounts Payable
  addAccountPayable: (item: Omit<AccountPayable, 'id' | 'created_at'>) => AccountPayable;
  updateAccountPayable: (id: string, updates: Partial<AccountPayable>) => void;
  deleteAccountPayable: (id: string) => void;
  markPayableAsPaid: (id: string) => void;
  
  // CRUD Accounts Receivable
  addAccountReceivable: (item: Omit<AccountReceivable, 'id' | 'created_at'>) => AccountReceivable;
  updateAccountReceivable: (id: string, updates: Partial<AccountReceivable>) => void;
  deleteAccountReceivable: (id: string) => void;
  markReceivableAsReceived: (id: string) => void;
  
  // CRUD Products & Services
  addProduct: (product: Omit<Product, 'id' | 'created_at'>) => Product;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  
  // Backward compatibility alias for services
  addService: (service: any) => any;
  updateService: (id: string, updates: any) => void;
  deleteService: (id: string) => void;

  // Inventory Movements
  addStockMovement: (
    companyId: string,
    productId: string,
    type: 'entrada' | 'saida' | 'ajuste',
    quantity: number,
    reason: string,
    unitCost?: number,
    unit?: UnitType | string
  ) => void;
  recordStockPurchase: (params: {
    companyId: string;
    productId: string;
    purchaseQty: number;
    purchaseUnit: UnitType | string;
    totalCost: number;
    supplierName?: string;
    date?: string;
    notes?: string;
    createExpense?: boolean;
  }) => void;
  recordManualAdjustment: (params: {
    companyId: string;
    productId: string;
    newQuantityBase: number;
    reasonCategory: string;
    notes?: string;
  }) => void;
  
  // CRUD Customers & Suppliers
  addCustomer: (customer: Omit<Customer, 'id' | 'created_at'>) => Customer;
  updateCustomer: (id: string, updates: Partial<Customer>) => void;
  deleteCustomer: (id: string) => void;
  
  addSupplier: (supplier: Omit<Supplier, 'id' | 'created_at'>) => Supplier;
  updateSupplier: (id: string, updates: Partial<Supplier>) => void;
  deleteSupplier: (id: string) => void;
  
  // CRUD Tasks
  addTask: (task: Omit<Task, 'id' | 'created_at'>) => Task;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  toggleTaskStatus: (id: string) => void;
  
  // Data reset & Supabase Sync
  resetToDemoData: () => void;
  clearAllLocalData: () => void;
  saveSupabaseSettings: (config: SupabaseConfig) => void;
  syncSupabaseNow: (direction?: 'push' | 'pull') => Promise<void>;
  setData: React.Dispatch<React.SetStateAction<AppData>>;
  loadDemoData: () => void;
  resetAllData: () => void;
  resetData: () => void;
  updateSupabaseConfig: (config: SupabaseConfig) => void;
  syncWithSupabase: (direction?: 'push' | 'pull') => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [data, setData] = useState<AppData>(() => loadAppData());
  const [hasMasterConfigured, setHasMasterConfigured] = useState<boolean>(() => isMasterConfiguredInStorage(data.users));
  const [isCheckingMaster, setIsCheckingMaster] = useState<boolean>(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    const session = loadAuthSession();
    return session.isAuthenticated;
  });
  const [user, setUser] = useState<UserProfile>(() => {
    const session = loadAuthSession();
    if (session.isAuthenticated && session.userId) {
      const match = (data.users || []).find((u) => u.id === session.userId);
      if (match) {
        return {
          id: match.id,
          email: match.email,
          name: match.name,
          role: match.role,
          is_master: match.is_master || match.role === 'MASTER',
          status: match.status || 'active',
          company_ids: match.company_ids || (match.role === 'MASTER' ? ['*'] : []),
          permissions: match.permissions || (match.role === 'MASTER' ? getFullPermissions() : getDefaultRolePermissions(match.role)),
          created_at: match.created_at,
          last_login: match.last_login,
        };
      }
    }
    return data.user || DEFAULT_ADMIN_USER;
  });
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('esteMes');
  const [customDateRange, setCustomDateRange] = useState<{ start: string; end: string }>({
    start: getTodayDateString(),
    end: getTodayDateString(),
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [quickAction, setQuickAction] = useState<QuickActionState>({ isOpen: false });
  const [supabaseConfig, setSupabaseConfig] = useState<SupabaseConfig>(() => {
    const loaded = loadSupabaseConfig();
    const envUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim().replace(/^["']+|["']+$/g, '');
    const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim().replace(/^["']+|["']+$/g, '');
    const url = envUrl || loaded.url;
    const anonKey = envKey || loaded.anonKey;
    return { url, anonKey, connected: Boolean(url && anonKey) };
  });
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeStatus>('DISCONNECTED');
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [confirmDeleteModal, setConfirmDeleteModal] = useState<DeleteConfirmState | null>(null);
  const [originalMasterUser, setOriginalMasterUser] = useState<UserProfile | null>(null);

  const isImpersonating = originalMasterUser !== null;

  // Sync state to localStorage whenever data changes
  useEffect(() => {
    saveAppData(data);
  }, [data]);

  // Master user role verification
  const isMasterUser = useMemo(() => {
    if (!user) return false;
    if (user.status && user.status !== 'active') return false;
    if (user.is_master === true) return true;
    const r = (user.role || '').toUpperCase();
    return r === 'MASTER' || r === 'ADMIN';
  }, [user]);

  // Only the master user or authorized managers have permissions to edit, delete, or exclude records
  const canEditOrDelete = isMasterUser || (user?.role || '').toUpperCase() === 'GERENTE';

  // Supabase Realtime - Sincronização e Monitoramento Automático em Tempo Real
  useEffect(() => {
    if (!isAuthenticated) {
      setRealtimeStatus('DISCONNECTED');
      return;
    }

    if (!supabaseConfig.connected || !supabaseConfig.url || !supabaseConfig.anonKey) {
      setRealtimeStatus('DISCONNECTED');
      return;
    }

    const allowedIds = isMasterUser
      ? data.companies.map((c) => c.id)
      : (user.company_ids || []);

    const { unsubscribe } = setupSupabaseRealtime(
      {
        user,
        isMaster: isMasterUser,
        allowedCompanyIds: allowedIds,
        activeCompanyId: selectedCompanyId,
        onDataUpdate: (updater) => {
          setData((prev) => updater(prev));
        },
        onStatusChange: (status, message) => {
          setRealtimeStatus(status);
          if (status === 'CONNECTED') {
            console.log('[SUPABASE REALTIME] REALTIME CONNECTED');
          } else if (status === 'ERROR') {
            console.warn('[SUPABASE REALTIME] REALTIME ERROR:', message);
          } else if (status === 'DISCONNECTED') {
            console.log('[SUPABASE REALTIME] REALTIME DISCONNECTED');
          }
        },
        onRefreshNeeded: () => {
          if (getSupabaseClient(supabaseConfig)) {
            pullDataFromSupabase(supabaseConfig)
              .then((res) => {
                if (res.success && res.data) {
                  setData((prev) => ({
                    ...prev,
                    ...res.data,
                    user: prev.user,
                  }));
                }
              })
              .catch((e) => console.warn('Aviso ao sincronizar pós-reconexão Realtime:', e));
          }
        },
      },
      supabaseConfig
    );

    return () => {
      unsubscribe();
    };
  }, [
    isAuthenticated,
    user.id,
    user.role,
    user.company_ids,
    isMasterUser,
    selectedCompanyId,
    supabaseConfig.connected,
    supabaseConfig.url,
    supabaseConfig.anonKey,
  ]);

  // Check Supabase on startup: verify Master status and recover active Supabase Auth session
  useEffect(() => {
    let isMounted = true;

    const performMasterAndSessionCheck = async () => {
      try {
        setIsCheckingMaster(true);
        if (getSupabaseClient(supabaseConfig)) {
          // 1. Verifica se existe Master configurado no Supabase
          const supaHasMaster = await checkSupabaseHasMaster(supabaseConfig);
          if (isMounted) {
            setHasMasterConfigured(supaHasMaster);
            setMasterConfiguredInStorage(supaHasMaster);
          }

          // 2. Recupera sessão ativa no Supabase Auth
          const sessionRes = await getInitialSupabaseSession(supabaseConfig);
          if (sessionRes.isAuthenticated && sessionRes.user && isMounted) {
            setUser(sessionRes.user);
            setIsAuthenticated(true);
            saveAuthSession({ isAuthenticated: true, userId: sessionRes.user.id });

            const pullRes = await pullDataFromSupabase(supabaseConfig);
            if (isMounted) {
              setData((prev) => ({
                ...prev,
                ...(pullRes.success && pullRes.data ? pullRes.data : {}),
                user: sessionRes.user!,
                companies:
                  sessionRes.companies && sessionRes.companies.length > 0
                    ? sessionRes.companies
                    : pullRes.data?.companies || prev.companies,
              }));
            }

            if (!sessionRes.user.is_master && sessionRes.user.role !== 'MASTER' && sessionRes.companies && sessionRes.companies.length > 0) {
              setSelectedCompanyId(sessionRes.companies[0].id);
            }
          } else if (isMounted && !sessionRes.error) {
            setIsAuthenticated(false);
            clearAuthSession();
          }
        } else {
          if (isMounted) {
            setIsAuthenticated(false);
            clearAuthSession();
          }
        }
      } catch (err) {
        console.warn('[SUPABASE] Erro na verificação inicial de autenticação:', err);
      } finally {
        if (isMounted) {
          setIsCheckingMaster(false);
        }
      }
    };

    performMasterAndSessionCheck();

    return () => {
      isMounted = false;
    };
  }, [supabaseConfig.connected, supabaseConfig.url, supabaseConfig.anonKey]);

  // Activity Logger
  const logActivity = useCallback(
    (options: {
      companyId?: string;
      module: string;
      action: 'create' | 'update' | 'delete' | 'cancel' | 'login' | 'status_change';
      description: string;
      recordId?: string;
    }) => {
      const comp = options.companyId ? data.companies.find((c) => c.id === options.companyId) : undefined;
      const newLog: ActivityLog = {
        id: generateUUID(),
        user_id: user?.id || 'admin-master-user',
        user_name: user?.name || 'Administrador Master',
        user_email: user?.email || '',
        company_id: options.companyId,
        company_name: comp?.name,
        module: options.module,
        action: options.action,
        description: options.description,
        record_id: options.recordId,
        created_at: new Date().toISOString(),
      };
      setData((prev) => ({
        ...prev,
        activityLogs: [newLog, ...(prev.activityLogs || [])].slice(0, 300),
      }));
      persistCloud('auditoria', syncActivityLogToSupabase(newLog, supabaseConfig), true);
    },
    [data.companies, user, supabaseConfig]
  );

  // Permission check helper
  const hasPermission = useCallback(
    (module: AppModule, action: PermissionAction = 'view'): boolean => {
      if (isMasterUser) return true;
      return checkUserModulePermission(user, module, action);
    },
    [isMasterUser, user]
  );

  const canAccessTab = useCallback(
    (tab: ActiveTab): boolean => {
      if (isMasterUser) return true;
      switch (tab) {
        case 'overview':
          // Operador e Gerente NÃO devem ver a opção de Visão Geral das 8 empresas
          return false;
        case 'companies-manage':
          // Apenas Master cadastra/gerencia as 8 empresas
          return false;
        case 'comparison':
          // Apenas Master vê a matriz comparativa entre empresas
          return false;
        case 'company-detail':
          return true;
        case 'sales':
          return hasPermission('sales', 'view');
        case 'products-services':
          return hasPermission('products', 'view');
        case 'inventory':
          return hasPermission('inventory', 'view');
        case 'expenses':
          return hasPermission('expenses', 'view');
        case 'accounts-payable':
          return hasPermission('accounts_payable', 'view');
        case 'accounts-receivable':
          return hasPermission('accounts_receivable', 'view');
        case 'customers':
          return hasPermission('customers', 'view');
        case 'suppliers':
          return hasPermission('suppliers', 'view');
        case 'tasks':
          return hasPermission('tasks', 'view');
        case 'reports':
          return hasPermission('reports', 'view');
        case 'users':
          return false;
        case 'activity-logs':
          return false;
        case 'database-settings':
          return false;
        case 'google-drive':
          return false;
        default:
          return true;
      }
    },
    [isMasterUser, hasPermission]
  );

  // Companies accessible for this user (for master: all 8 companies; for operator: only assigned ones)
  const allowedCompanies = useMemo(() => {
    if (isMasterUser || (user.company_ids && user.company_ids.includes('*'))) {
      return data.companies;
    }
    if (!user.company_ids || user.company_ids.length === 0) {
      return [];
    }
    return data.companies.filter((c) => user.company_ids.includes(c.id));
  }, [data.companies, isMasterUser, user.company_ids]);

  const canAccessCompany = useCallback(
    (companyId?: string | null): boolean => {
      if (!companyId) return isMasterUser;
      if (isMasterUser || (user.company_ids && user.company_ids.includes('*'))) return true;
      return Boolean(user.company_ids && user.company_ids.includes(companyId));
    },
    [isMasterUser, user.company_ids]
  );

  // Enforce company selection & active tab rules for Gerente and Operador
  useEffect(() => {
    if (!isMasterUser) {
      // If non-master is on an unauthorized global tab, switch to company-detail
      if (activeTab === 'overview' || activeTab === 'comparison' || activeTab === 'companies-manage' || activeTab === 'users' || activeTab === 'activity-logs' || activeTab === 'database-settings' || activeTab === 'google-drive') {
        setActiveTab('company-detail');
      }

      // Non-master must never have selectedCompanyId = null
      const isSelectedValid = selectedCompanyId && allowedCompanies.some((c) => c.id === selectedCompanyId);
      if (!isSelectedValid) {
        if (allowedCompanies.length > 0) {
          setSelectedCompanyId(allowedCompanies[0].id);
        } else if (user.company_ids && user.company_ids.length > 0 && user.company_ids[0] !== '*') {
          setSelectedCompanyId(user.company_ids[0]);
        }
      }
    }
  }, [isMasterUser, activeTab, selectedCompanyId, allowedCompanies, user.company_ids]);

  // Toast helper
  const showToast = useCallback(
    (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info', duration = 4000) => {
      const id = generateUUID();
      setToasts((prev) => [...prev, { id, message, type, timestamp: Date.now() }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    },
    []
  );

  const persistCloud = useCallback(
    (label: string, task: Promise<void>, silent = false) => {
      task.catch((err: any) => {
        console.warn(`[SUPABASE] ${label}:`, err);
        if (!silent) {
          showToast(`Não gravou no banco (${label}): ${err?.message || 'erro desconhecido'}`, 'error', 7000);
        }
      });
    },
    [showToast]
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // In-app deletion confirmation helper
  const requestDeleteConfirm = useCallback(
    ({ title = 'Confirmar Exclusão', message = 'Deseja realmente apagar esta informação permanentemente?', onConfirm }: { title?: string; message?: string; onConfirm: () => void }) => {
      if (!canEditOrDelete) {
        showToast(
          'Permissão restrita: Apenas usuários com perfil MASTER ou GERENTE autorizado podem excluir registros.',
          'error',
          6000
        );
        return;
      }
      setConfirmDeleteModal({
        isOpen: true,
        title,
        message,
        onConfirm,
      });
    },
    [canEditOrDelete, showToast]
  );

  const closeDeleteConfirm = useCallback(() => {
    setConfirmDeleteModal(null);
  }, []);

  // Quick Action Modal handlers
  const openQuickAction = (type?: QuickActionState['defaultType']) => {
    setQuickAction({ isOpen: true, defaultType: type });
  };

  const closeQuickAction = () => {
    setQuickAction({ isOpen: false });
  };

  // Auth & Roles - Estritamente via Supabase Auth + PostgreSQL (public.profiles & public.user_companies)
  const login = async (email: string, pass: string): Promise<{ success: boolean; message?: string }> => {
    if (!email || !pass) {
      return { success: false, message: 'Por favor, informe o e-mail e a senha.' };
    }

    const cleanEmail = email.trim().toLowerCase();

    if (!supabaseConfig.connected || !supabaseConfig.url || !supabaseConfig.anonKey) {
      return { success: false, message: 'Supabase não configurado. Verifique as credenciais.' };
    }

    const supaRes = await signInSupabase(cleanEmail, pass, supabaseConfig);
    if (!supaRes.success || !supaRes.user) {
      return { success: false, message: supaRes.message || 'Credenciais inválidas no Supabase.' };
    }

    const loggedUser = supaRes.user;
    const permittedCompanies = supaRes.companies || [];

    setUser(loggedUser);
    setIsAuthenticated(true);
    saveAuthSession({ isAuthenticated: true, userId: loggedUser.id });

    const pullRes = await pullDataFromSupabase(supabaseConfig);
    setData((prev) => ({
      ...prev,
      ...(pullRes.success && pullRes.data ? pullRes.data : {}),
      user: loggedUser,
      companies: permittedCompanies.length > 0 ? permittedCompanies : pullRes.data?.companies || prev.companies,
    }));

    if (loggedUser.is_master || loggedUser.role === 'MASTER') {
      setActiveTab('overview');
    } else {
      if (permittedCompanies.length > 0) {
        setSelectedCompanyId(permittedCompanies[0].id);
      } else {
        setSelectedCompanyId(null);
      }
      setActiveTab('company-detail');
    }

    logActivity({
      module: 'Sistema',
      action: 'login',
      description: `Login autenticado no Supabase: ${loggedUser.name} (${loggedUser.email}) [${loggedUser.role}]`,
    });

    showToast(`Bem-vindo, ${loggedUser.name}!`, 'success');

    return { success: true };
  };

  const logout = () => {
    signOutSupabase(supabaseConfig);
    clearAuthSession();
    setSelectedCompanyId(null);
    setActiveTab('overview');
    setSearchQuery('');
    setUser(DEFAULT_ADMIN_USER);
    setIsAuthenticated(false);
    setData((prev) => ({
      ...prev,
      companies: [],
      user: DEFAULT_ADMIN_USER,
    }));
    showToast('Sessão encerrada com sucesso.', 'info');
  };

  const setupMasterUser = async (params: {
    name: string;
    username?: string;
    email?: string;
    password: string;
  }): Promise<{ success: boolean; message: string }> => {
    try {
      const cleanName = params.name.trim();
      const cleanUsername = (params.username || cleanName.split(' ')[0] || 'master').trim().toLowerCase().replace(/[^a-z0-9_.-]/g, '');
      const cleanEmail = (params.email?.trim() || `${cleanUsername}@omnigestao.local`).toLowerCase();

      let supaUserId: string | undefined;
      if (getSupabaseClient(supabaseConfig)) {
        const supaResult = await createSupabaseMaster(
          { name: cleanName, username: cleanUsername, email: cleanEmail, password: params.password },
          supabaseConfig
        );
        if (!supaResult.success && !supaResult.message.includes('already registered')) {
          return { success: false, message: `Erro ao registrar no Supabase: ${supaResult.message}` };
        }
        supaUserId = supaResult.userId;
      }

      const masterAccount: UserAccount = {
        id: supaUserId || generateUUID(),
        name: cleanName,
        email: cleanEmail,
        role: 'MASTER',
        is_master: true,
        status: 'active',
        company_ids: ['*'],
        permissions: getFullPermissions(),
        created_at: new Date().toISOString(),
        last_login: new Date().toISOString(),
      };

      // Initialize Master and base schema in Firestore Cloud Database if applicable
      try {
        await initializeMasterInFirestore(masterAccount, data.companies);
      } catch (fsErr) {
        console.warn('Firestore master init warning:', fsErr);
      }

      setData((prev) => {
        const filtered = (prev.users || []).filter((u) => u.role !== 'MASTER' && !u.is_master);
        return {
          ...prev,
          user: masterAccount,
          users: [masterAccount, ...filtered],
          isDemoMode: false,
        };
      });

      // Auto-authenticate newly created Master directly to Dashboard
      setUser(masterAccount);
      setIsAuthenticated(true);
      saveAuthSession({ isAuthenticated: true, userId: masterAccount.id });
      setHasMasterConfigured(true);
      setMasterConfiguredInStorage(true);

      logActivity({
        module: 'Configuração Inicial',
        action: 'create',
        description: `Inicialização do Sistema: Administrador Master criado (${cleanName} - ${cleanEmail})`,
      });

      showToast(`Administrador Master criado com sucesso! Bem-vindo ao OmniGestão, ${cleanName}.`, 'success');

      return {
        success: true,
        message: 'Administrador Master criado e autenticado com sucesso!',
      };
    } catch (err: any) {
      return { success: false, message: err.message || 'Erro ao inicializar o Administrador Master.' };
    }
  };

  const requestPasswordRecovery = async (email: string): Promise<{ success: boolean; message: string }> => {
    try {
      const cleanEmail = email.trim().toLowerCase();
      if (!cleanEmail || !cleanEmail.includes('@')) {
        return { success: false, message: 'Por favor, informe um e-mail válido cadastrado.' };
      }

      if (getSupabaseClient(supabaseConfig)) {
        const supaRes = await requestPasswordReset(cleanEmail, supabaseConfig);
        return supaRes;
      }

      return {
        success: false,
        message: 'Serviço de autenticação Supabase não está conectado.',
      };
    } catch (err: any) {
      return { success: false, message: err.message || 'Erro ao processar solicitação de recuperação.' };
    }
  };

  const registerPublicUser = async (params: {
    name: string;
    email: string;
    password: string;
  }): Promise<{ success: boolean; message: string }> => {
    try {
      const cleanEmail = params.email.trim();
      const cleanName = params.name.trim();

      const exists = (data.users || []).some((u) => u.email.toLowerCase().trim() === cleanEmail.toLowerCase());
      if (exists) {
        return { success: false, message: 'Este e-mail já está cadastrado no sistema.' };
      }

      let supaUserId: string | undefined;
      if (getSupabaseClient(supabaseConfig)) {
        const supaResult = await createSupabasePublicUser(params, supabaseConfig);
        if (!supaResult.success) {
          return { success: false, message: `Erro ao registrar no Supabase: ${supaResult.message}` };
        }
        supaUserId = supaResult.userId;
      }

      const newUser: UserAccount = {
        id: supaUserId || generateUUID(),
        name: cleanName,
        email: cleanEmail,
        role: 'OPERADOR',
        is_master: false,
        status: 'pending',
        company_ids: [],
        permissions: getEmptyPermissions(),
        created_at: new Date().toISOString(),
      };

      setData((prev) => ({
        ...prev,
        users: [...(prev.users || []), newUser],
      }));

      logActivity({
        module: 'Usuários',
        action: 'create',
        description: `Novo cadastro público: "${cleanName}" (${cleanEmail}) [Aguardando Aprovação]`,
      });

      return {
        success: true,
        message: 'Conta criada com sucesso! Aguarde aprovação do Administrador Master para liberar acesso.',
      };
    } catch (err: any) {
      return { success: false, message: err.message || 'Erro no cadastro de usuário.' };
    }
  };

  const approveUser = useCallback(
    (userId: string, role: UserRole, companyIds: string[]) => {
      if (!isMasterUser) {
        showToast('Apenas o Administrador Master pode aprovar usuários.', 'error');
        return;
      }
      const target = (data.users || []).find((u) => u.id === userId);
      if (!target) return;

      const normalizedRole = role === 'MASTER' ? 'GERENTE' : role;
      const updatedPermissions = getDefaultRolePermissions(normalizedRole);

      setData((prev) => ({
        ...prev,
        users: (prev.users || []).map((u) =>
          u.id === userId
            ? {
                ...u,
                role: normalizedRole,
                status: 'active',
                company_ids: companyIds.length > 0 ? companyIds : (prev.companies[0] ? [prev.companies[0].id] : []),
                permissions: updatedPermissions,
              }
            : u
        ),
      }));

      logActivity({
        module: 'Usuários',
        action: 'status_change',
        description: `Usuário "${target.name}" (${target.email}) aprovado com perfil ${normalizedRole} e ${companyIds.length} empresa(s) vinculada(s).`,
        recordId: userId,
      });

      showToast(`Usuário "${target.name}" aprovado e ativado com sucesso!`, 'success');

      if (getSupabaseClient(supabaseConfig)) {
        persistCloud(
          'aprovação de usuário',
          syncUserUpdateToSupabase(
            userId,
            {
              role: normalizedRole,
              status: 'active',
              company_ids: companyIds.length > 0 ? companyIds : (data.companies[0] ? [data.companies[0].id] : []),
              permissions: updatedPermissions,
            },
            supabaseConfig
          ).then(() => undefined)
        );
      }
    },
    [data.companies, data.users, isMasterUser, logActivity, showToast, supabaseConfig, persistCloud]
  );

  const resetMasterToSimulateFirstAccess = useCallback(() => {
    setMasterConfiguredInStorage(false);
    clearAuthSession();
    setHasMasterConfigured(false);
    setIsAuthenticated(false);
    setData((prev) => ({
      ...prev,
      users: (prev.users || []).filter((u) => u.role !== 'MASTER' && !u.is_master && u.email?.toLowerCase() !== MASTER_ADMIN_EMAIL.toLowerCase()),
    }));
    showToast('Modo Primeiro Acesso ativado. Configure o Administrador Master.', 'info', 5000);
  }, [showToast]);

  const refreshData = useCallback(async () => {
    if (getSupabaseClient(supabaseConfig)) {
      const res = await pullDataFromSupabase(supabaseConfig);
      if (res.success && res.data) {
        setData((prev) => ({ ...prev, ...res.data }));
      }
    }
  }, [supabaseConfig]);

  const updateUser = (updates: Partial<UserProfile>) => {
    const updated = { ...user, ...updates };
    setUser(updated);
    setData((prev) => ({ ...prev, user: updated }));
    if (getSupabaseClient(supabaseConfig)) {
      persistCloud(
        'perfil',
        syncUserUpdateToSupabase(updated.id, { name: updated.name, email: updated.email }, supabaseConfig).then(
          () => undefined
        )
      );
    }
    showToast('Perfil de usuário atualizado.', 'success');
  };

  const switchUserMode = (mode: 'master' | 'operator', targetCompanyId?: string) => {
    if (mode === 'master') {
      const masterUser: UserProfile = {
        id: 'admin-master-user',
        email: MASTER_ADMIN_EMAIL,
        name: 'Victor Oliveira',
        role: 'MASTER',
        status: 'active',
        company_ids: ['*'],
        permissions: getFullPermissions(),
        created_at: new Date().toISOString(),
      };
      setUser(masterUser);
      setData((prev) => ({ ...prev, user: masterUser }));
      logActivity({
        module: 'Sistema',
        action: 'login',
        description: 'Alternado para perfil Administrador MASTER',
      });
      showToast('Perfil alterado para Administrador Master (Permissão Total).', 'success');
    } else {
      const compId = targetCompanyId || data.companies[0]?.id || 'comp-empresa-1';
      const compName = data.companies.find((c) => c.id === compId)?.name || 'Empresa Liberada';
      const operatorUser: UserProfile = {
        id: `operator-${compId}`,
        email: 'joao.vendas@empresa1.com.br',
        name: `Operador • ${compName}`,
        role: 'OPERADOR',
        status: 'active',
        company_ids: [compId],
        permissions: getDefaultRolePermissions('OPERADOR'),
        created_at: new Date().toISOString(),
      };
      setUser(operatorUser);
      setData((prev) => ({ ...prev, user: operatorUser }));
      setSelectedCompanyId(compId);
      logActivity({
        module: 'Sistema',
        action: 'login',
        description: `Alternado para perfil Operador (${compName})`,
      });
      showToast(`Perfil alterado para Operador (${compName}). Visualização restrita à empresa.`, 'info', 5000);
    }
  };

  // User Management Methods
  const addUser = useCallback(
    (userData: Omit<UserAccount, 'id' | 'created_at'>): UserAccount => {
      if (!isMasterUser) {
        showToast('Apenas o Administrador Master pode criar usuários.', 'error');
        throw new Error('Acesso não autorizado');
      }
      const isMasterRole = userData.role === 'MASTER' || userData.is_master === true;
      const newUser: UserAccount = {
        ...userData,
        id: generateUUID(),
        role: isMasterRole ? 'MASTER' : userData.role,
        is_master: isMasterRole,
        company_ids: isMasterRole ? ['*'] : userData.company_ids,
        permissions: isMasterRole ? getFullPermissions() : (userData.permissions || getDefaultRolePermissions(userData.role)),
        created_at: new Date().toISOString(),
      };

      setData((prev) => ({
        ...prev,
        users: [...(prev.users || []), newUser],
      }));

      // Sincroniza criação no Supabase se conectado
      if (getSupabaseClient(supabaseConfig)) {
        persistCloud(
          'usuário',
          syncUserUpdateToSupabase(
            newUser.id,
            {
              name: newUser.name,
              email: newUser.email,
              role: newUser.role,
              is_master: newUser.is_master,
              status: newUser.status,
              company_ids: newUser.company_ids,
              permissions: newUser.permissions,
            },
            supabaseConfig
          ).then(() => undefined)
        );
      }

      logActivity({
        module: 'Usuários',
        action: 'create',
        description: `Criado usuário "${newUser.name}" (${newUser.email}) com perfil ${newUser.role}`,
        recordId: newUser.id,
      });
      showToast(`Usuário "${newUser.name}" cadastrado com sucesso!`, 'success');
      return newUser;
    },
    [isMasterUser, logActivity, showToast, supabaseConfig]
  );

  const updateUserAccount = useCallback(
    (id: string, updates: Partial<UserAccount>) => {
      if (!isMasterUser) {
        showToast('Apenas o Administrador Master pode editar usuários.', 'error');
        return;
      }

      const target = (data.users || []).find((u) => u.id === id);
      if (!target) return;

      const isCurrentTargetMaster = target.role === 'MASTER' || target.is_master;
      const activeMasters = (data.users || []).filter(
        (u) => (u.role === 'MASTER' || u.is_master || u.email?.toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase()) && u.status === 'active'
      );

      // Proteção do Último Master: Não permite rebaixar ou inativar o único Master ativo
      if (isCurrentTargetMaster && activeMasters.length <= 1 && activeMasters.some((m) => m.id === id)) {
        if (updates.role && updates.role !== 'MASTER') {
          showToast('É necessário manter pelo menos um administrador Master ativo.', 'error');
          return;
        }
        if (updates.status && updates.status === 'inactive') {
          showToast('É necessário manter pelo menos um administrador Master ativo.', 'error');
          return;
        }
      }

      const isPromotedToMaster = updates.role === 'MASTER' || updates.is_master === true;
      const normalizedUpdates: Partial<UserAccount> = {
        ...updates,
        ...(isPromotedToMaster
          ? {
              role: 'MASTER',
              is_master: true,
              company_ids: ['*'],
              permissions: getFullPermissions(),
            }
          : {}),
      };

      setData((prev) => ({
        ...prev,
        users: (prev.users || []).map((u) => (u.id === id ? { ...u, ...normalizedUpdates } : u)),
      }));

      // Se o usuário atual for quem foi editado, atualiza a sessão local
      if (user && user.id === id) {
        setUser((prev) => ({
          ...prev,
          name: normalizedUpdates.name || prev.name,
          email: normalizedUpdates.email || prev.email,
          role: normalizedUpdates.role || prev.role,
          is_master: isPromotedToMaster ? true : (normalizedUpdates.is_master ?? prev.is_master),
          company_ids: isPromotedToMaster ? ['*'] : (normalizedUpdates.company_ids ?? prev.company_ids),
          permissions: isPromotedToMaster ? getFullPermissions() : (normalizedUpdates.permissions ?? prev.permissions),
          status: normalizedUpdates.status || prev.status,
        }));
      }

      // Sincroniza no Supabase
      if (getSupabaseClient(supabaseConfig)) {
        persistCloud(
          'usuário',
          syncUserUpdateToSupabase(id, normalizedUpdates, supabaseConfig).then(() => undefined)
        );
      }

      logActivity({
        module: 'Usuários',
        action: 'update',
        description: `Atualizado cadastro e permissões do usuário: ${target.name} (${target.email}) [Perfil: ${normalizedUpdates.role || target.role}]`,
        recordId: id,
      });
      showToast('Usuário atualizado com sucesso.', 'success');
    },
    [data.users, isMasterUser, logActivity, showToast, supabaseConfig, user]
  );

  const deleteUserAccount = useCallback(
    (id: string) => {
      if (!isMasterUser) {
        showToast('Apenas o Administrador Master pode excluir usuários.', 'error');
        return;
      }
      const target = (data.users || []).find((u) => u.id === id);
      if (!target) return;

      const isTargetMaster = target.role === 'MASTER' || target.is_master || target.email.toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase();
      const activeMasters = (data.users || []).filter(
        (u) => (u.role === 'MASTER' || u.is_master || u.email?.toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase()) && u.status === 'active'
      );

      // Proteção do Último Master
      if (isTargetMaster && activeMasters.length <= 1) {
        showToast('É necessário manter pelo menos um administrador Master ativo.', 'error');
        return;
      }

      setData((prev) => ({
        ...prev,
        users: (prev.users || []).filter((u) => u.id !== id),
      }));

      // Sincroniza exclusão no Supabase
      if (getSupabaseClient(supabaseConfig)) {
        persistCloud('usuário', deleteUserFromSupabase(id, supabaseConfig));
      }

      logActivity({
        module: 'Usuários',
        action: 'delete',
        description: `Excluído usuário "${target.name}" (${target.email})`,
        recordId: id,
      });
      showToast('Usuário removido com sucesso.', 'info');
    },
    [data.users, isMasterUser, logActivity, showToast, supabaseConfig]
  );

  const toggleUserStatus = useCallback(
    (id: string) => {
      if (!isMasterUser) {
        showToast('Apenas o Administrador Master pode alterar o status de usuários.', 'error');
        return;
      }
      const target = (data.users || []).find((u) => u.id === id);
      if (!target) return;
      const nextStatus = target.status === 'active' ? 'inactive' : 'active';
      updateUserAccount(id, { status: nextStatus });
      logActivity({
        module: 'Usuários',
        action: 'status_change',
        description: `Status do usuário "${target.name}" alterado para ${nextStatus === 'active' ? 'Ativo' : 'Inativo'}`,
        recordId: id,
      });
    },
    [isMasterUser, data.users, updateUserAccount, logActivity, showToast]
  );

  const resetUserPassword = useCallback(
    (id: string, newPassword?: string) => {
      if (!isMasterUser) {
        showToast('Apenas o Administrador Master pode redefinir senhas.', 'error');
        return;
      }
      const target = (data.users || []).find((u) => u.id === id);
      if (!target) return;
      const defaultPwd = newPassword || '123456';
      updateUserAccount(id, { password_hash: defaultPwd });
      logActivity({
        module: 'Usuários',
        action: 'update',
        description: `Senha do usuário "${target.name}" foi redefinida`,
        recordId: id,
      });
      showToast(`Senha de "${target.name}" redefinida para: ${defaultPwd}`, 'success', 6000);
    },
    [isMasterUser, data.users, updateUserAccount, logActivity, showToast]
  );

  const exitImpersonation = useCallback(() => {
    if (originalMasterUser) {
      setUser(originalMasterUser);
      setData((prev) => ({ ...prev, user: originalMasterUser }));
      setOriginalMasterUser(null);
      setSelectedCompanyId(null);
      showToast('Simulação encerrada. Retornado ao perfil Administrador Master.', 'success');
    }
  }, [originalMasterUser, showToast]);

  const switchActiveUser = useCallback(
    (userIdOrAccount: string | UserAccount) => {
      let target: UserAccount | undefined;
      if (typeof userIdOrAccount === 'string') {
        target = (data.users || []).find((u) => u.id === userIdOrAccount);
      } else {
        target = userIdOrAccount;
      }

      if (!target) return;

      // If starting a simulation from master, save master profile as original
      if (!originalMasterUser && (user.is_master || user.role === 'MASTER')) {
        setOriginalMasterUser(user);
      }

      const isTargetMaster =
        target.role === 'MASTER' ||
        target.role === 'admin' ||
        target.email.toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase();

      const profile: UserProfile = {
        id: target.id,
        email: target.email,
        name: target.name,
        role: target.role,
        status: target.status || 'active',
        company_ids: target.company_ids || (isTargetMaster ? ['*'] : []),
        permissions: target.permissions || (isTargetMaster ? getFullPermissions() : getDefaultRolePermissions(target.role)),
        created_at: target.created_at,
        last_login: new Date().toISOString(),
      };

      setUser(profile);
      setData((prev) => ({ ...prev, user: profile }));

      // Synchronize company selector:
      if (isTargetMaster) {
        // Master can view all
      } else if (profile.company_ids.length === 1 && profile.company_ids[0] !== '*') {
        setSelectedCompanyId(profile.company_ids[0]);
      } else if (profile.company_ids.length > 1) {
        if (!selectedCompanyId || !profile.company_ids.includes(selectedCompanyId)) {
          setSelectedCompanyId(profile.company_ids[0]);
        }
      } else {
        setSelectedCompanyId(null);
      }

      logActivity({
        module: 'Sistema',
        action: 'login',
        description: `Simulação de visão ativada para: ${profile.name} (${profile.role})`,
        recordId: profile.id,
      });

      showToast(`Modo de Simulação: Visualizando como ${profile.name} (${profile.role}).`, 'info', 4000);
    },
    [data.users, originalMasterUser, user, selectedCompanyId, logActivity, showToast]
  );

  // Helper to enforce edit/delete permission
  const checkEditDeletePermission = (actionName: string): boolean => {
    if (!canEditOrDelete) {
      showToast(
        `Ação não permitida: Somente o Administrador Master (${MASTER_ADMIN_EMAIL}) tem autorização para ${actionName}. Caso tenha ocorrido um erro de lançamento, realize um novo registro corretivo.`,
        'error',
        6000
      );
      return false;
    }
    return true;
  };

  // Companies CRUD
  const addCompany = (companyData: Omit<Company, 'id' | 'created_at'>): Company => {
    if (!checkEditDeletePermission('cadastrar novas empresas')) {
      return { ...companyData, id: '', created_at: '' };
    }
    const created: Company = {
      ...companyData,
      id: generateUUID(),
      created_at: new Date().toISOString(),
    };
    setData((prev) => ({
      ...prev,
      companies: [...prev.companies, created],
    }));

    if (getSupabaseClient(supabaseConfig)) {
      persistCloud('empresa', syncCompanyToSupabase(created, supabaseConfig));
    }

    showToast(`Empresa "${created.name}" cadastrada com sucesso!`, 'success');
    return created;
  };

  const updateCompany = (id: string, updates: Partial<Company>) => {
    if (!checkEditDeletePermission('editar dados da empresa')) return;
    setData((prev) => {
      const updated = prev.companies.map((c) => (c.id === id ? { ...c, ...updates } : c));
      const target = updated.find((c) => c.id === id);
      if (target && getSupabaseClient(supabaseConfig)) {
        persistCloud('empresa', syncCompanyToSupabase(target, supabaseConfig));
      }
      return {
        ...prev,
        companies: updated,
      };
    });
    showToast('Dados da empresa atualizados com sucesso.', 'success');
  };

  const deleteCompany = (id: string) => {
    if (!checkEditDeletePermission('excluir empresas')) return;
    const company = data.companies.find((c) => c.id === id);
    setData((prev) => ({
      ...prev,
      companies: prev.companies.filter((c) => c.id !== id),
      sales: prev.sales.filter((s) => s.company_id !== id),
      expenses: prev.expenses.filter((e) => e.company_id !== id),
      accountsPayable: prev.accountsPayable.filter((p) => p.company_id !== id),
      accountsReceivable: prev.accountsReceivable.filter((r) => r.company_id !== id),
      products: prev.products.filter((p) => p.company_id !== id),
      inventoryMovements: prev.inventoryMovements.filter((m) => m.company_id !== id),
      customers: prev.customers.filter((c) => c.company_id !== id),
      suppliers: prev.suppliers.filter((s) => s.company_id !== id),
      tasks: prev.tasks.filter((t) => t.company_id !== id),
    }));

    if (getSupabaseClient(supabaseConfig)) {
      persistCloud('empresa', deleteCompanyFromSupabase(id, supabaseConfig));
    }

    if (selectedCompanyId === id) {
      setSelectedCompanyId(null);
    }
    showToast(`Empresa "${company?.name || id}" excluída permanentemente.`, 'info');
  };

  // ==========================================
  // SALES & GENERIC STOCK DEDUCTION ENGINE
  // ==========================================
  const addSale = (saleData: Omit<Sale, 'id' | 'created_at'>): Sale => {
    if (!canAccessCompany(saleData.company_id)) {
      showToast('Você não possui autorização para lançar vendas nesta empresa.', 'error');
      return { ...saleData, id: '', created_at: '' };
    }

    const saleId = generateUUID();
    let updatedProducts = [...data.products];
    const newMovements: InventoryMovement[] = [];
    const consumedRecords: ConsumedItemRecord[] = [];
    let calculatedTotalCost = 0;

    // Standardize sale items (multi-item support or legacy single-item)
    let saleItems: SaleItem[] = saleData.items && saleData.items.length > 0 ? saleData.items : [];

    if (saleItems.length === 0 && (saleData.product_service || (saleData as any).service_id)) {
      const prodName = saleData.product_service || 'Item';
      const matched = updatedProducts.find(
        (p) =>
          p.company_id === saleData.company_id &&
          (p.id === (saleData as any).service_id || p.name.toLowerCase() === prodName.toLowerCase())
      );

      saleItems = [
        {
          product_id: matched ? matched.id : '',
          name: prodName,
          type: matched ? matched.type : 'Produto',
          quantity: Number(saleData.quantity) || 1,
          unit_price: Number(saleData.unit_price) || Number(saleData.total_amount) || 0,
          unit_cost: matched ? Number(matched.cost_price) || 0 : 0,
          total_price: Number(saleData.total_amount) || 0,
          unit: matched ? matched.unit || 'un' : 'un',
        },
      ];
    }

    // Process inventory deduction for items
    saleItems.forEach((sItem) => {
      const prodIndex = updatedProducts.findIndex((p) => p.id === sItem.product_id);
      if (prodIndex >= 0) {
        const prod = updatedProducts[prodIndex];

        // Case A: Product with direct physical stock tracking
        if (prod.type === 'Produto' && prod.track_stock) {
          const prevQty = Number(prod.quantity) || 0;
          const soldQty = Number(sItem.quantity) || 1;
          const newQty = Math.max(0, prevQty - soldQty);

          updatedProducts[prodIndex] = {
            ...prod,
            quantity: newQty,
            last_movement_date: saleData.date || getTodayDateString(),
          };

          const itemUnitCost = Number(prod.cost_price) || 0;
          const itemTotalCost = soldQty * itemUnitCost;
          calculatedTotalCost += itemTotalCost;

          newMovements.push({
            id: generateUUID(),
            company_id: saleData.company_id,
            product_id: prod.id,
            product_name: prod.name,
            type: 'saida',
            quantity: soldQty,
            unit: prod.unit || 'un',
            previous_quantity: prevQty,
            new_quantity: newQty,
            unit_cost: itemUnitCost,
            total_cost: itemTotalCost,
            reason: `Venda #${saleId.slice(0, 5)} (${saleData.customer_name})`,
            reference_type: 'venda',
            reference_id: saleId,
            date: saleData.date || getTodayDateString(),
            created_at: new Date().toISOString(),
          });

          consumedRecords.push({
            product_id: prod.id,
            product_name: prod.name,
            quantity: soldQty,
            unit: prod.unit || 'un',
            unit_cost: itemUnitCost,
            total_cost: itemTotalCost,
          });
        }

        // Case B: Composite Service/Product with technical recipe (Insumos / Componentes)
        if (prod.composition && prod.composition.length > 0) {
          const factor = Number(sItem.quantity) || 1;
          prod.composition.forEach((comp) => {
            const rawIndex = updatedProducts.findIndex((p) => p.id === comp.product_id);
            if (rawIndex >= 0) {
              const rawProd = updatedProducts[rawIndex];
              const prevRawQty = Number(rawProd.quantity) || 0;
              const consumedQty = Number(comp.quantity) * factor;
              const newRawQty = Math.max(0, prevRawQty - consumedQty);

              updatedProducts[rawIndex] = {
                ...rawProd,
                quantity: newRawQty,
                last_movement_date: saleData.date || getTodayDateString(),
              };

              const rawUnitCost = Number(rawProd.cost_price) || 0;
              const rawTotalCost = consumedQty * rawUnitCost;
              calculatedTotalCost += rawTotalCost;

              newMovements.push({
                id: generateUUID(),
                company_id: saleData.company_id,
                product_id: rawProd.id,
                product_name: rawProd.name,
                type: 'saida',
                quantity: consumedQty,
                unit: comp.unit || rawProd.unit || 'un',
                previous_quantity: prevRawQty,
                new_quantity: newRawQty,
                unit_cost: rawUnitCost,
                total_cost: rawTotalCost,
                reason: `Consumo na venda de "${prod.name}" #${saleId.slice(0, 5)}`,
                reference_type: 'venda',
                reference_id: saleId,
                date: saleData.date || getTodayDateString(),
                created_at: new Date().toISOString(),
              });

              consumedRecords.push({
                product_id: rawProd.id,
                product_name: rawProd.name,
                quantity: consumedQty,
                unit: comp.unit || rawProd.unit || 'un',
                unit_cost: rawUnitCost,
                total_cost: rawTotalCost,
              });
            }
          });
        }
      }
    });

    const finalCost = saleData.total_cost ?? calculatedTotalCost;

    const created: Sale = {
      ...saleData,
      id: saleId,
      items: saleItems,
      total_cost: finalCost,
      consumed_items: consumedRecords,
      created_at: new Date().toISOString(),
    };

    // Auto-create Account Receivable if sale is 'Pendente' or 'Boleto'
    let updatedReceivables = [...data.accountsReceivable];
    if (saleData.status === 'Pendente' || saleData.payment_method === 'Boleto') {
      const receivable: AccountReceivable = {
        id: generateUUID(),
        company_id: saleData.company_id,
        customer_id: saleData.customer_id,
        customer_name: saleData.customer_name,
        description: `Venda #${created.id.slice(0, 5)} - ${created.product_service}`,
        amount: saleData.total_amount,
        due_date: saleData.date || getTodayDateString(),
        status: 'Pendente',
        payment_method: saleData.payment_method,
        notes: saleData.notes,
        created_at: new Date().toISOString(),
      };
      updatedReceivables.push(receivable);
    }

    setData((prev) => ({
      ...prev,
      sales: [created, ...prev.sales],
      accountsReceivable: updatedReceivables,
      products: updatedProducts,
      inventoryMovements: [...newMovements, ...prev.inventoryMovements],
    }));

    if (getSupabaseClient(supabaseConfig)) {
      persistCloud(
        'venda',
        (async () => {
          await syncSaleToSupabase(created, supabaseConfig);
          const newReceivable = updatedReceivables.find(
            (item) => !data.accountsReceivable.some((existing) => existing.id === item.id)
          );
          if (newReceivable) {
            await syncAccountReceivableToSupabase(newReceivable, supabaseConfig);
          }
          const touchedIds = new Set([
            ...saleItems.map((item) => item.product_id).filter(Boolean),
            ...consumedRecords.map((item) => item.product_id),
          ]);
          for (const product of updatedProducts) {
            if (touchedIds.has(product.id)) {
              await syncProductToSupabase(product, supabaseConfig);
            }
          }
          for (const movement of newMovements) {
            await syncInventoryMovementToSupabase(movement, supabaseConfig);
          }
        })()
      );
    }

    const deductionMsg =
      consumedRecords.length > 0
        ? ` (${consumedRecords.length} ${consumedRecords.length === 1 ? 'item baixado no estoque' : 'itens baixados no estoque'})`
        : '';

    showToast(
      `Venda de ${formatCurrency(created.total_amount)} registrada com sucesso!${deductionMsg}`,
      'success'
    );
    return created;
  };

  const updateSale = (id: string, updates: Partial<Sale>) => {
    if (!checkEditDeletePermission('editar vendas')) return;
    setData((prev) => {
      const updated = prev.sales.map((s) => (s.id === id ? { ...s, ...updates } : s));
      const target = updated.find((s) => s.id === id);
      if (target && getSupabaseClient(supabaseConfig)) {
        persistCloud('venda', syncSaleToSupabase(target, supabaseConfig));
      }
      return {
        ...prev,
        sales: updated,
      };
    });
    showToast('Registro de venda atualizado com sucesso!', 'success');
  };

  const deleteSale = (id: string) => {
    if (!checkEditDeletePermission('excluir vendas')) return;
    setData((prev) => ({
      ...prev,
      sales: prev.sales.filter((s) => s.id !== id),
    }));

    if (getSupabaseClient(supabaseConfig)) {
      persistCloud('venda', deleteSaleFromSupabase(id, supabaseConfig));
    }

    showToast('Venda removida com sucesso.', 'info');
  };

  // Sale Cancellation & Inventory Refund (Estorno de Venda)
  const cancelSale = (id: string) => {
    if (!checkEditDeletePermission('estornar ou cancelar vendas')) return;
    const sale = data.sales.find((s) => s.id === id);
    if (!sale) return;
    if (sale.status === 'Cancelada') {
      showToast('Esta venda já está cancelada.', 'info');
      return;
    }

    let updatedProducts = [...data.products];
    const refundMovements: InventoryMovement[] = [];
    let refundedCount = 0;

    // Refund items that were consumed during the sale
    if (sale.consumed_items && sale.consumed_items.length > 0) {
      sale.consumed_items.forEach((item) => {
        const prodIndex = updatedProducts.findIndex((p) => p.id === item.product_id);
        if (prodIndex >= 0) {
          const currentProd = updatedProducts[prodIndex];
          const prevQty = Number(currentProd.quantity) || 0;
          const refundQty = Number(item.quantity) || 0;
          const newQty = prevQty + refundQty;

          updatedProducts[prodIndex] = {
            ...currentProd,
            quantity: newQty,
            last_movement_date: getTodayDateString(),
          };

          refundMovements.push({
            id: generateUUID(),
            company_id: sale.company_id,
            product_id: currentProd.id,
            product_name: currentProd.name,
            type: 'entrada',
            quantity: refundQty,
            unit: currentProd.unit || 'un',
            previous_quantity: prevQty,
            new_quantity: newQty,
            unit_cost: item.unit_cost,
            total_cost: item.total_cost,
            reason: `Estorno de venda #${sale.id.slice(0, 5)} (${sale.customer_name})`,
            reference_type: 'estorno_venda',
            reference_id: sale.id,
            date: getTodayDateString(),
            created_at: new Date().toISOString(),
          });
          refundedCount += 1;
        }
      });
    }

    const updatedSale: Sale = {
      ...sale,
      status: 'Cancelada',
      notes: `${sale.notes || ''} [Estornada em ${getTodayDateString()}]`.trim(),
    };

    setData((prev) => ({
      ...prev,
      sales: prev.sales.map((s) => (s.id === id ? updatedSale : s)),
      products: updatedProducts,
      inventoryMovements: [...refundMovements, ...prev.inventoryMovements],
    }));

    if (getSupabaseClient(supabaseConfig)) {
      persistCloud(
        'estorno de venda',
        (async () => {
          await syncSaleToSupabase(updatedSale, supabaseConfig);
          const touched = new Set(refundMovements.map((m) => m.product_id));
          for (const product of updatedProducts) {
            if (touched.has(product.id)) {
              await syncProductToSupabase(product, supabaseConfig);
            }
          }
          for (const movement of refundMovements) {
            await syncInventoryMovementToSupabase(movement, supabaseConfig);
          }
        })()
      );
    }

    showToast(
      `Venda #${sale.id.slice(0, 5)} cancelada. ${refundedCount} ${
        refundedCount === 1 ? 'item estornado' : 'itens estornados'
      } ao estoque.`,
      'info'
    );
  };

  // Expenses CRUD
  const addExpense = (expenseData: Omit<Expense, 'id' | 'created_at'>): Expense => {
    if (!canAccessCompany(expenseData.company_id)) {
      showToast('Você não possui autorização para lançar despesas nesta empresa.', 'error');
      return { ...expenseData, id: '', created_at: '' };
    }

    const created: Expense = {
      ...expenseData,
      id: generateUUID(),
      created_at: new Date().toISOString(),
    };

    let updatedPayables = [...data.accountsPayable];
    if (expenseData.status === 'Pendente' || expenseData.status === 'Agendado') {
      const payable: AccountPayable = {
        id: generateUUID(),
        company_id: expenseData.company_id,
        supplier_id: expenseData.supplier_id,
        supplier_name: expenseData.supplier_name || 'Fornecedor Diversos',
        description: expenseData.description,
        amount: expenseData.amount,
        due_date: expenseData.due_date || expenseData.date || getTodayDateString(),
        status: 'Pendente',
        category: expenseData.category,
        notes: expenseData.notes,
        created_at: new Date().toISOString(),
      };
      updatedPayables.push(payable);
    }

    setData((prev) => ({
      ...prev,
      expenses: [created, ...prev.expenses],
      accountsPayable: updatedPayables,
    }));

    if (getSupabaseClient(supabaseConfig)) {
      persistCloud(
        'despesa',
        (async () => {
          await syncExpenseToSupabase(created, supabaseConfig);
          const newPayable = updatedPayables.find(
            (item) => !data.accountsPayable.some((existing) => existing.id === item.id)
          );
          if (newPayable) {
            await syncAccountPayableToSupabase(newPayable, supabaseConfig);
          }
        })()
      );
    }

    showToast(`Despesa de ${formatCurrency(created.amount)} lançada com sucesso!`, 'success');
    return created;
  };

  const updateExpense = (id: string, updates: Partial<Expense>) => {
    if (!checkEditDeletePermission('editar despesas')) return;
    setData((prev) => {
      const updated = prev.expenses.map((e) => (e.id === id ? { ...e, ...updates } : e));
      const target = updated.find((e) => e.id === id);
      if (target && getSupabaseClient(supabaseConfig)) {
        persistCloud('despesa', syncExpenseToSupabase(target, supabaseConfig));
      }
      return {
        ...prev,
        expenses: updated,
      };
    });
    showToast('Despesa atualizada com sucesso!', 'success');
  };

  const deleteExpense = (id: string) => {
    if (!checkEditDeletePermission('excluir despesas')) return;
    setData((prev) => ({
      ...prev,
      expenses: prev.expenses.filter((e) => e.id !== id),
    }));

    if (getSupabaseClient(supabaseConfig)) {
      persistCloud('despesa', deleteExpenseFromSupabase(id, supabaseConfig));
    }

    showToast('Despesa excluída com sucesso.', 'info');
  };

  // Accounts Payable
  const addAccountPayable = (item: Omit<AccountPayable, 'id' | 'created_at'>): AccountPayable => {
    if (!canAccessCompany(item.company_id)) {
      showToast('Você não possui autorização para lançar contas a pagar nesta empresa.', 'error');
      return { ...item, id: '', created_at: '' };
    }
    const created: AccountPayable = {
      ...item,
      id: generateUUID(),
      created_at: new Date().toISOString(),
    };
    setData((prev) => ({
      ...prev,
      accountsPayable: [created, ...prev.accountsPayable],
    }));

    if (getSupabaseClient(supabaseConfig)) {
      persistCloud('conta a pagar', syncAccountPayableToSupabase(created, supabaseConfig));
    }

    showToast(`Conta a pagar (${formatCurrency(created.amount)}) registrada!`, 'success');
    return created;
  };

  const updateAccountPayable = (id: string, updates: Partial<AccountPayable>) => {
    if (!checkEditDeletePermission('editar contas a pagar')) return;
    setData((prev) => {
      const updated = prev.accountsPayable.map((p) => (p.id === id ? { ...p, ...updates } : p));
      const target = updated.find((p) => p.id === id);
      if (target && getSupabaseClient(supabaseConfig)) {
        persistCloud('conta a pagar', syncAccountPayableToSupabase(target, supabaseConfig));
      }
      return {
        ...prev,
        accountsPayable: updated,
      };
    });
    showToast('Conta a pagar atualizada!', 'success');
  };

  const deleteAccountPayable = (id: string) => {
    if (!checkEditDeletePermission('excluir contas a pagar')) return;
    setData((prev) => ({
      ...prev,
      accountsPayable: prev.accountsPayable.filter((p) => p.id !== id),
    }));

    if (getSupabaseClient(supabaseConfig)) {
      persistCloud('conta a pagar', deleteAccountPayableFromSupabase(id, supabaseConfig));
    }

    showToast('Conta a pagar removida com sucesso.', 'info');
  };

  const markPayableAsPaid = (id: string) => {
    const item = data.accountsPayable.find((p) => p.id === id);
    if (!item) return;

    const expense: Expense = {
      id: generateUUID(),
      company_id: item.company_id,
      description: `Pagamento: ${item.description}`,
      category: item.category || 'Outros',
      supplier_name: item.supplier_name,
      amount: item.amount,
      payment_method: 'Pix',
      date: getTodayDateString(),
      status: 'Pago',
      notes: `Baixa de conta a pagar #${id.slice(0, 5)}`,
      created_at: new Date().toISOString(),
    };

    const updatedPayable: AccountPayable = {
      ...item,
      status: 'Pago',
      paid_date: getTodayDateString(),
    };

    setData((prev) => ({
      ...prev,
      accountsPayable: prev.accountsPayable.map((p) => (p.id === id ? updatedPayable : p)),
      expenses: [expense, ...prev.expenses],
    }));

    if (getSupabaseClient(supabaseConfig)) {
      persistCloud(
        'baixa de conta a pagar',
        (async () => {
          await syncAccountPayableToSupabase(updatedPayable, supabaseConfig);
          await syncExpenseToSupabase(expense, supabaseConfig);
        })()
      );
    }

    showToast(`Conta quitada e despesa de ${formatCurrency(item.amount)} lançada!`, 'success');
  };

  // Accounts Receivable
  const addAccountReceivable = (item: Omit<AccountReceivable, 'id' | 'created_at'>): AccountReceivable => {
    if (!canAccessCompany(item.company_id)) {
      showToast('Você não possui autorização para lançar contas a receber nesta empresa.', 'error');
      return { ...item, id: '', created_at: '' };
    }
    const created: AccountReceivable = {
      ...item,
      id: generateUUID(),
      created_at: new Date().toISOString(),
    };
    setData((prev) => ({
      ...prev,
      accountsReceivable: [created, ...prev.accountsReceivable],
    }));

    if (getSupabaseClient(supabaseConfig)) {
      persistCloud('conta a receber', syncAccountReceivableToSupabase(created, supabaseConfig));
    }

    showToast(`Conta a receber (${formatCurrency(created.amount)}) registrada!`, 'success');
    return created;
  };

  const updateAccountReceivable = (id: string, updates: Partial<AccountReceivable>) => {
    if (!checkEditDeletePermission('editar contas a receber')) return;
    setData((prev) => {
      const updated = prev.accountsReceivable.map((r) => (r.id === id ? { ...r, ...updates } : r));
      const target = updated.find((r) => r.id === id);
      if (target && getSupabaseClient(supabaseConfig)) {
        persistCloud('conta a receber', syncAccountReceivableToSupabase(target, supabaseConfig));
      }
      return {
        ...prev,
        accountsReceivable: updated,
      };
    });
    showToast('Conta a receber atualizada!', 'success');
  };

  const deleteAccountReceivable = (id: string) => {
    if (!checkEditDeletePermission('excluir contas a receber')) return;
    setData((prev) => ({
      ...prev,
      accountsReceivable: prev.accountsReceivable.filter((r) => r.id !== id),
    }));

    if (getSupabaseClient(supabaseConfig)) {
      persistCloud('conta a receber', deleteAccountReceivableFromSupabase(id, supabaseConfig));
    }

    showToast('Conta a receber removida com sucesso.', 'info');
  };

  const markReceivableAsReceived = (id: string) => {
    const item = data.accountsReceivable.find((r) => r.id === id);
    if (!item) return;

    const updatedReceivable: AccountReceivable = {
      ...item,
      status: 'Recebido',
      received_date: getTodayDateString(),
    };

    setData((prev) => ({
      ...prev,
      accountsReceivable: prev.accountsReceivable.map((r) =>
        r.id === id ? updatedReceivable : r
      ),
    }));

    if (getSupabaseClient(supabaseConfig)) {
      persistCloud('recebimento', syncAccountReceivableToSupabase(updatedReceivable, supabaseConfig));
    }

    showToast(`Recebimento de ${formatCurrency(item.amount)} confirmado!`, 'success');
  };

  // Products & Services CRUD
  const addProduct = (productData: Omit<Product, 'id' | 'created_at'>): Product => {
    if (!canAccessCompany(productData.company_id)) {
      showToast('Você não possui autorização para cadastrar produtos nesta empresa.', 'error');
      return { ...productData, id: '', created_at: '' };
    }
    const created: Product = {
      ...productData,
      id: generateUUID(),
      type: productData.type || 'Produto',
      unit: productData.unit || 'un',
      track_stock: productData.track_stock !== false,
      quantity: Number(productData.quantity) || 0,
      min_quantity: Number(productData.min_quantity) || 0,
      cost_price: Number(productData.cost_price) || 0,
      sale_price: Number(productData.sale_price) || 0,
      status: productData.status || 'Ativo',
      last_entry_date: productData.last_entry_date || getTodayDateString(),
      last_movement_date: productData.last_movement_date || getTodayDateString(),
      created_at: new Date().toISOString(),
    };
    setData((prev) => ({
      ...prev,
      products: [created, ...prev.products],
    }));

    if (getSupabaseClient(supabaseConfig)) {
      persistCloud(
        'produto',
        syncProductToSupabase(created, supabaseConfig).then(() => {
          showToast(`"${created.name}" gravado no banco.`, 'success');
        })
      );
    }

    showToast(`${created.type} "${created.name}" cadastrado. Gravando no banco...`, 'info');
    return created;
  };

  const updateProduct = (id: string, updates: Partial<Product>) => {
    if (!checkEditDeletePermission('editar itens ou produtos')) return;
    setData((prev) => {
      const updated = prev.products.map((p) => (p.id === id ? { ...p, ...updates } : p));
      const target = updated.find((p) => p.id === id);
      if (target && getSupabaseClient(supabaseConfig)) {
        persistCloud('produto', syncProductToSupabase(target, supabaseConfig));
      }
      return {
        ...prev,
        products: updated,
      };
    });
    showToast('Item atualizado com sucesso!', 'success');
  };

  const deleteProduct = (id: string) => {
    if (!checkEditDeletePermission('excluir produtos')) return;
    const pName = data.products.find((p) => p.id === id)?.name || 'Item';
    setData((prev) => ({
      ...prev,
      products: prev.products.filter((p) => p.id !== id),
      inventoryMovements: prev.inventoryMovements.filter((m) => m.product_id !== id),
    }));

    if (getSupabaseClient(supabaseConfig)) {
      persistCloud('produto', deleteProductFromSupabase(id, supabaseConfig));
    }

    showToast(`"${pName}" excluído do catálogo com sucesso.`, 'info');
  };

  // Backwards compatibility for service calls
  const addService = (serviceData: any) => {
    return addProduct({
      ...serviceData,
      type: 'Serviço',
      cost_price: 0,
      unit: 'un',
      track_stock: false,
      quantity: 0,
      min_quantity: 0,
      composition: serviceData.items || serviceData.composition,
    });
  };

  const updateService = (id: string, updates: any) => {
    if (!checkEditDeletePermission('editar serviços')) return;
    updateProduct(id, {
      ...updates,
      type: 'Serviço',
      composition: updates.items || updates.composition,
    });
  };

  const deleteService = (id: string) => {
    deleteProduct(id);
  };

  // Direct Stock Movement
  const addStockMovement = (
    companyId: string,
    productId: string,
    type: 'entrada' | 'saida' | 'ajuste',
    quantity: number,
    reason: string,
    unitCost?: number,
    unit?: UnitType | string
  ) => {
    if (!canAccessCompany(companyId)) {
      showToast('Você não possui autorização para movimentar o estoque desta empresa.', 'error');
      return;
    }
    const targetProduct = data.products.find((p) => p.id === productId);
    if (!targetProduct) return;

    const prevQty = Number(targetProduct.quantity) || 0;
    const moveQty = Number(quantity) || 0;
    let newQty = prevQty;

    if (type === 'entrada') {
      newQty = prevQty + moveQty;
    } else if (type === 'saida') {
      newQty = Math.max(0, prevQty - moveQty);
    } else if (type === 'ajuste') {
      newQty = moveQty;
    }

    const itemUnit = unit || targetProduct.unit || 'un';

    const movement: InventoryMovement = {
      id: generateUUID(),
      company_id: companyId,
      product_id: productId,
      product_name: targetProduct.name,
      type,
      quantity: moveQty,
      unit: itemUnit,
      previous_quantity: prevQty,
      new_quantity: newQty,
      unit_cost: unitCost ?? targetProduct.cost_price,
      total_cost: unitCost ? moveQty * unitCost : undefined,
      reason,
      date: getTodayDateString(),
      created_at: new Date().toISOString(),
    };

    const updatedProduct: Product = {
      ...targetProduct,
      quantity: newQty,
      last_movement_date: getTodayDateString(),
      last_entry_date: type === 'entrada' ? getTodayDateString() : targetProduct.last_entry_date,
    };

    setData((prev) => ({
      ...prev,
      products: prev.products.map((p) => (p.id === productId ? updatedProduct : p)),
      inventoryMovements: [movement, ...prev.inventoryMovements],
    }));

    if (getSupabaseClient(supabaseConfig)) {
      persistCloud(
        'estoque',
        (async () => {
          await syncProductToSupabase(updatedProduct, supabaseConfig);
          await syncInventoryMovementToSupabase(movement, supabaseConfig);
        })()
      );
    }

    showToast(
      `Estoque de "${targetProduct.name}": ${type === 'entrada' ? '+' : '-'}${formatCompactStock(
        moveQty,
        itemUnit
      )} (Novo saldo: ${formatCompactStock(newQty, itemUnit)})`,
      'success'
    );
  };

  // Stock Purchase Entry with Weighted Average Cost
  const recordStockPurchase = ({
    companyId,
    productId,
    purchaseQty,
    purchaseUnit,
    totalCost,
    supplierName,
    date = getTodayDateString(),
    notes,
    createExpense = true,
  }: {
    companyId: string;
    productId: string;
    purchaseQty: number;
    purchaseUnit: UnitType | string;
    totalCost: number;
    supplierName?: string;
    date?: string;
    notes?: string;
    createExpense?: boolean;
  }) => {
    if (!canAccessCompany(companyId)) {
      showToast('Você não possui autorização para lançar compras nesta empresa.', 'error');
      return;
    }
    const targetProduct = data.products.find((p) => p.id === productId);
    if (!targetProduct) return;

    const qty = Number(purchaseQty) || 1;
    const cost = Number(totalCost) || 0;
    const costPerUnit = cost / qty;

    const prevQty = Number(targetProduct.quantity) || 0;
    const newQty = prevQty + qty;

    // Weighted average cost calculation
    const prevTotalVal = prevQty * (Number(targetProduct.cost_price) || 0);
    const newTotalVal = prevTotalVal + cost;
    const newWeightedAvgCost = newQty > 0 ? newTotalVal / newQty : costPerUnit;

    const movement: InventoryMovement = {
      id: generateUUID(),
      company_id: companyId,
      product_id: productId,
      product_name: targetProduct.name,
      type: 'entrada',
      quantity: qty,
      unit: purchaseUnit,
      previous_quantity: prevQty,
      new_quantity: newQty,
      unit_cost: costPerUnit,
      total_cost: cost,
      reason: `Entrada / Compra de Fornecedor: ${supplierName || 'Fornecedor Diversos'}`,
      reference_type: 'compra',
      date,
      created_at: new Date().toISOString(),
    };

    let purchaseExpense: Expense | null = null;
    let updatedExpenses = [...data.expenses];
    if (createExpense && cost > 0) {
      purchaseExpense = {
        id: generateUUID(),
        company_id: companyId,
        description: `Compra Estoque: ${qty} ${purchaseUnit} de ${targetProduct.name}`,
        category: 'Fornecedor',
        supplier_name: supplierName,
        amount: cost,
        payment_method: 'Pix',
        date,
        status: 'Pago',
        notes: notes || `Entrada de insumos / mercadorias`,
        created_at: new Date().toISOString(),
      };
      updatedExpenses.unshift(purchaseExpense);
    }

    const updatedProduct: Product = {
      ...targetProduct,
      quantity: newQty,
      cost_price: Number(newWeightedAvgCost.toFixed(4)),
      last_entry_date: date,
      last_movement_date: date,
      supplier_name: supplierName || targetProduct.supplier_name,
    };

    setData((prev) => ({
      ...prev,
      products: prev.products.map((p) => (p.id === productId ? updatedProduct : p)),
      expenses: updatedExpenses,
      inventoryMovements: [movement, ...prev.inventoryMovements],
    }));

    if (getSupabaseClient(supabaseConfig)) {
      persistCloud(
        'compra de estoque',
        (async () => {
          await syncProductToSupabase(updatedProduct, supabaseConfig);
          await syncInventoryMovementToSupabase(movement, supabaseConfig);
          if (purchaseExpense) {
            await syncExpenseToSupabase(purchaseExpense, supabaseConfig);
          }
        })()
      );
    }

    showToast(
      `Entrada de ${formatCompactStock(qty, purchaseUnit)} registrada com sucesso!`,
      'success'
    );
  };

  // Physical Inventory Adjustment / Balance Count
  const recordManualAdjustment = ({
    companyId,
    productId,
    newQuantityBase,
    reasonCategory,
    notes,
  }: {
    companyId: string;
    productId: string;
    newQuantityBase: number;
    reasonCategory: string;
    notes?: string;
  }) => {
    if (!canAccessCompany(companyId)) {
      showToast('Você não possui autorização para ajustar o estoque desta empresa.', 'error');
      return;
    }
    const targetProduct = data.products.find((p) => p.id === productId);
    if (!targetProduct) return;

    const prevQty = Number(targetProduct.quantity) || 0;
    const diff = newQuantityBase - prevQty;
    const unit = targetProduct.unit || 'un';

    const movement: InventoryMovement = {
      id: generateUUID(),
      company_id: companyId,
      product_id: productId,
      product_name: targetProduct.name,
      type: 'ajuste',
      quantity: Math.abs(diff),
      unit,
      previous_quantity: prevQty,
      new_quantity: newQuantityBase,
      unit_cost: targetProduct.cost_price,
      total_cost: Math.abs(diff) * (Number(targetProduct.cost_price) || 0),
      reason: `Ajuste (${reasonCategory}): ${notes || 'Contagem física / balanço'}`,
      reference_type: 'ajuste_manual',
      date: getTodayDateString(),
      created_at: new Date().toISOString(),
    };

    const updatedProduct: Product = {
      ...targetProduct,
      quantity: newQuantityBase,
      last_movement_date: getTodayDateString(),
    };

    setData((prev) => ({
      ...prev,
      products: prev.products.map((p) => (p.id === productId ? updatedProduct : p)),
      inventoryMovements: [movement, ...prev.inventoryMovements],
    }));

    if (getSupabaseClient(supabaseConfig)) {
      persistCloud(
        'ajuste de estoque',
        (async () => {
          await syncProductToSupabase(updatedProduct, supabaseConfig);
          await syncInventoryMovementToSupabase(movement, supabaseConfig);
        })()
      );
    }

    showToast(
      `Ajuste de estoque salvo! Novo saldo de "${targetProduct.name}": ${formatCompactStock(
        newQuantityBase,
        unit
      )}`,
      'success'
    );
  };

  // Customers
  const addCustomer = (cust: Omit<Customer, 'id' | 'created_at'>): Customer => {
    if (!canAccessCompany(cust.company_id)) {
      showToast('Você não possui autorização para cadastrar clientes nesta empresa.', 'error');
      return { ...cust, id: '', created_at: '' };
    }
    const created: Customer = {
      ...cust,
      id: generateUUID(),
      created_at: new Date().toISOString(),
    };
    setData((prev) => ({
      ...prev,
      customers: [created, ...prev.customers],
    }));

    if (getSupabaseClient(supabaseConfig)) {
      persistCloud('cliente', syncCustomerToSupabase(created, supabaseConfig));
    }

    showToast(`Cliente "${created.name}" cadastrado com sucesso!`, 'success');
    return created;
  };

  const updateCustomer = (id: string, updates: Partial<Customer>) => {
    if (!checkEditDeletePermission('editar clientes')) return;
    setData((prev) => {
      const updated = prev.customers.map((c) => (c.id === id ? { ...c, ...updates } : c));
      const target = updated.find((c) => c.id === id);
      if (target && getSupabaseClient(supabaseConfig)) {
        persistCloud('cliente', syncCustomerToSupabase(target, supabaseConfig));
      }
      return {
        ...prev,
        customers: updated,
      };
    });
    showToast('Dados do cliente atualizados com sucesso!', 'success');
  };

  const deleteCustomer = (id: string) => {
    if (!checkEditDeletePermission('excluir clientes')) return;
    const name = data.customers.find((c) => c.id === id)?.name || 'Cliente';
    setData((prev) => ({
      ...prev,
      customers: prev.customers.filter((c) => c.id !== id),
    }));

    if (getSupabaseClient(supabaseConfig)) {
      persistCloud('cliente', deleteCustomerFromSupabase(id, supabaseConfig));
    }

    showToast(`Cliente "${name}" excluído com sucesso.`, 'info');
  };

  // Suppliers
  const addSupplier = (supp: Omit<Supplier, 'id' | 'created_at'>): Supplier => {
    if (!canAccessCompany(supp.company_id)) {
      showToast('Você não possui autorização para cadastrar fornecedores nesta empresa.', 'error');
      return { ...supp, id: '', created_at: '' };
    }
    const created: Supplier = {
      ...supp,
      id: generateUUID(),
      created_at: new Date().toISOString(),
    };
    setData((prev) => ({
      ...prev,
      suppliers: [created, ...prev.suppliers],
    }));

    if (getSupabaseClient(supabaseConfig)) {
      persistCloud('fornecedor', syncSupplierToSupabase(created, supabaseConfig));
    }

    showToast(`Fornecedor "${created.name}" cadastrado com sucesso!`, 'success');
    return created;
  };

  const updateSupplier = (id: string, updates: Partial<Supplier>) => {
    if (!checkEditDeletePermission('editar fornecedores')) return;
    setData((prev) => {
      const updated = prev.suppliers.map((s) => (s.id === id ? { ...s, ...updates } : s));
      const target = updated.find((s) => s.id === id);
      if (target && getSupabaseClient(supabaseConfig)) {
        persistCloud('fornecedor', syncSupplierToSupabase(target, supabaseConfig));
      }
      return {
        ...prev,
        suppliers: updated,
      };
    });
    showToast('Dados do fornecedor atualizados com sucesso!', 'success');
  };

  const deleteSupplier = (id: string) => {
    if (!checkEditDeletePermission('excluir fornecedores')) return;
    const name = data.suppliers.find((s) => s.id === id)?.name || 'Fornecedor';
    setData((prev) => ({
      ...prev,
      suppliers: prev.suppliers.filter((s) => s.id !== id),
    }));

    if (getSupabaseClient(supabaseConfig)) {
      persistCloud('fornecedor', deleteSupplierFromSupabase(id, supabaseConfig));
    }

    showToast(`Fornecedor "${name}" excluído com sucesso.`, 'info');
  };

  // Tasks
  const addTask = (taskData: Omit<Task, 'id' | 'created_at'>): Task => {
    if (!canAccessCompany(taskData.company_id)) {
      showToast('Você não possui autorização para criar tarefas nesta empresa.', 'error');
      return { ...taskData, id: '', created_at: '' };
    }
    const created: Task = {
      ...taskData,
      id: generateUUID(),
      created_at: new Date().toISOString(),
    };
    setData((prev) => ({
      ...prev,
      tasks: [created, ...prev.tasks],
    }));

    if (getSupabaseClient(supabaseConfig)) {
      persistCloud('tarefa', syncTaskToSupabase(created, supabaseConfig));
    }

    showToast(`Tarefa "${created.title}" criada com sucesso!`, 'success');
    return created;
  };

  const updateTask = (id: string, updates: Partial<Task>) => {
    if (!checkEditDeletePermission('editar tarefas')) return;
    setData((prev) => {
      const updated = prev.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t));
      const target = updated.find((t) => t.id === id);
      if (target && getSupabaseClient(supabaseConfig)) {
        persistCloud('tarefa', syncTaskToSupabase(target, supabaseConfig));
      }
      return {
        ...prev,
        tasks: updated,
      };
    });
    showToast('Tarefa atualizada com sucesso!', 'success');
  };

  const deleteTask = (id: string) => {
    if (!checkEditDeletePermission('excluir tarefas')) return;
    setData((prev) => ({
      ...prev,
      tasks: prev.tasks.filter((t) => t.id !== id),
    }));

    if (getSupabaseClient(supabaseConfig)) {
      persistCloud('tarefa', deleteTaskFromSupabase(id, supabaseConfig));
    }

    showToast('Tarefa removida com sucesso.', 'info');
  };

  const toggleTaskStatus = (id: string) => {
    const task = data.tasks.find((t) => t.id === id);
    if (!task) return;
    const isCompleted = task.status === 'Concluída';
    const nextStatus = isCompleted ? 'Pendente' : 'Concluída';

    const updatedTask: Task = {
      ...task,
      status: nextStatus,
      completed_at: !isCompleted ? new Date().toISOString() : undefined,
    };

    setData((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) => (t.id === id ? updatedTask : t)),
    }));

    if (getSupabaseClient(supabaseConfig)) {
      persistCloud('tarefa', syncTaskToSupabase(updatedTask, supabaseConfig));
    }

    showToast(`Tarefa marcada como ${nextStatus.toLowerCase()}!`, 'success');
  };

  // Reset & Supabase
  const resetToDemoData = () => {
    if (!checkEditDeletePermission('restaurar dados de demonstração')) return;
    const demo = getDemoData();
    setData(demo);
    saveAppData(demo);
    showToast('Base de demonstração multiempresa restaurada com sucesso!', 'info');
  };

  const clearAllLocalData = () => {
    if (!checkEditDeletePermission('apagar todos os dados locais')) return;
    clearAllData();
    const emptyData: AppData = {
      user: DEFAULT_ADMIN_USER,
      users: [],
      activityLogs: [],
      companies: [],
      sales: [],
      expenses: [],
      accountsPayable: [],
      accountsReceivable: [],
      products: [],
      services: [],
      inventoryMovements: [],
      customers: [],
      suppliers: [],
      tasks: [],
      isDemoMode: false,
    };
    setData(emptyData);
    showToast('Todos os dados locais foram apagados.', 'warning');
  };

  const saveSupabaseSettings = (config: SupabaseConfig) => {
    if (!checkEditDeletePermission('configurar banco de dados')) return;
    setSupabaseConfig(config);
    saveSupabaseConfig(config);
    showToast('Configurações do Supabase salvas com sucesso.', 'success');
  };

  const syncSupabaseNow = async (direction: 'push' | 'pull' = 'push') => {
    setIsSyncing(true);
    try {
      const client = getSupabaseClient();
      if (!client) {
        showToast('Supabase não configurado. Insira a URL e Chave Anon.', 'warning');
        setIsSyncing(false);
        return;
      }
      if (direction === 'pull') {
        const pullRes = await pullDataFromSupabase();
        if (pullRes.success && pullRes.data) {
          setData((prev) => {
            const merged: AppData = {
              ...prev,
              ...pullRes.data,
              user: prev.user,
              isDemoMode: false,
            };
            saveAppData(merged);
            return merged;
          });
          showToast('Dados baixados do Supabase com sucesso!', 'success');
        } else {
          showToast(`Erro ao baixar: ${pullRes.message}`, 'error');
        }
      } else {
        await pushDataToSupabase(data);
        showToast('Dados sincronizados com o Supabase com sucesso!', 'success');
      }
    } catch (err: any) {
      console.error(err);
      showToast(`Erro na sincronização: ${err.message || 'Falha de conexão'}`, 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <AppContext.Provider
      value={{
        data,
        user,
        users: data.users || [],
        activityLogs: data.activityLogs || [],
        isAuthenticated,
        isCheckingMaster,
        hasMasterConfigured,
        isMasterUser,
        isImpersonating,
        originalMasterUser,
        exitImpersonation,
        canEditOrDelete,
        allowedCompanies,
        activeTab,
        selectedCompanyId,
        periodFilter,
        customDateRange,
        searchQuery,
        quickAction,
        supabaseConfig,
        realtimeStatus,
        toasts,
        isSyncing,
        confirmDeleteModal,
        setActiveTab,
        setSelectedCompanyId,
        setPeriodFilter,
        setCustomDateRange,
        setSearchQuery,
        openQuickAction,
        closeQuickAction,
        showToast,
        removeToast,
        canAccessCompany,
        hasPermission,
        canAccessTab,
        requestDeleteConfirm,
        closeDeleteConfirm,
        logActivity,
        login,
        logout,
        setupMasterUser,
        requestPasswordRecovery,
        registerPublicUser,
        approveUser,
        resetMasterToSimulateFirstAccess,
        refreshData,
        updateUser,
        switchUserMode,
        switchActiveUser,
        addUser,
        updateUserAccount,
        deleteUserAccount,
        toggleUserStatus,
        resetUserPassword,
        addCompany,
        updateCompany,
        deleteCompany,
        addSale,
        updateSale,
        deleteSale,
        cancelSale,
        addExpense,
        updateExpense,
        deleteExpense,
        addAccountPayable,
        updateAccountPayable,
        deleteAccountPayable,
        markPayableAsPaid,
        addAccountReceivable,
        updateAccountReceivable,
        deleteAccountReceivable,
        markReceivableAsReceived,
        addProduct,
        updateProduct,
        deleteProduct,
        addService,
        updateService,
        deleteService,
        addStockMovement,
        recordStockPurchase,
        recordManualAdjustment,
        addCustomer,
        updateCustomer,
        deleteCustomer,
        addSupplier,
        updateSupplier,
        deleteSupplier,
        addTask,
        updateTask,
        deleteTask,
        toggleTaskStatus,
        resetToDemoData,
        clearAllLocalData,
        saveSupabaseSettings,
        syncSupabaseNow,
        setData,
        loadDemoData: resetToDemoData,
        resetAllData: clearAllLocalData,
        resetData: clearAllLocalData,
        updateSupabaseConfig: saveSupabaseSettings,
        syncWithSupabase: syncSupabaseNow,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
