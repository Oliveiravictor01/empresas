import { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import { AppData, SupabaseConfig } from './storage';
import { getSupabaseClient } from './supabase';
import {
  Company,
  Sale,
  Expense,
  AccountPayable,
  AccountReceivable,
  Product,
  InventoryMovement,
  Customer,
  Supplier,
  Task,
  ActivityLog,
  UserProfile,
  UserAccount,
} from '../types';
import { getFullPermissions, getDefaultRolePermissions } from './permissions';

export type RealtimeStatus = 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED' | 'ERROR';

export interface RealtimeSubscriptionOptions {
  user: UserProfile;
  isMaster: boolean;
  allowedCompanyIds: string[];
  activeCompanyId: string | null;
  onDataUpdate: (updater: (prev: AppData) => AppData) => void;
  onStatusChange?: (status: RealtimeStatus, message?: string) => void;
  onRefreshNeeded?: () => void;
}

let activeChannel: RealtimeChannel | null = null;
let currentSubscriptionKey: string = '';

/**
 * Initializes and binds a Supabase Realtime channel to listen to all relevant tables.
 * Applies multi-company isolation and permission filtering for non-Master users.
 */
export function setupSupabaseRealtime(
  options: RealtimeSubscriptionOptions,
  config?: SupabaseConfig
): { unsubscribe: () => void } {
  const client: SupabaseClient | null = getSupabaseClient(config);

  if (!client) {
    options.onStatusChange?.('DISCONNECTED', 'Supabase não configurado');
    return { unsubscribe: () => {} };
  }

  // Key to identify this subscription
  const subscriptionKey = `${options.user.id || 'anon'}_${options.isMaster ? 'master' : options.allowedCompanyIds.sort().join(',')}_${options.activeCompanyId || 'all'}`;

  // If already subscribed with same parameters and active channel, return existing cleanup
  if (activeChannel && currentSubscriptionKey === subscriptionKey) {
    return {
      unsubscribe: () => teardownSupabaseRealtime(client),
    };
  }

  // Teardown any existing channel before starting a new one
  teardownSupabaseRealtime(client);
  currentSubscriptionKey = subscriptionKey;

  const channelName = `omni_realtime_${options.user.id ? options.user.id.slice(0, 8) : 'guest'}_${Date.now()}`;
  console.log(`[REALTIME] Iniciando canal: ${channelName} | Modo: ${options.isMaster ? 'MASTER' : 'EMPRESAS AUTORIZADAS'}`);

  options.onStatusChange?.('CONNECTING', 'Conectando ao Supabase Realtime...');

  // Helper to check if record belongs to an authorized company
  const isAuthorizedCompany = (companyId?: string | null): boolean => {
    if (options.isMaster) return true;
    if (!companyId) return false;
    return options.allowedCompanyIds.includes(companyId);
  };

  const channel = client.channel(channelName);

  // 1. COMPANIES
  channel.on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'companies' },
    (payload) => {
      console.log('[REALTIME EVENT] companies:', payload.eventType);
      options.onDataUpdate((prev) => {
        let updated = [...prev.companies];
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          const row = payload.new as any;
          if (!row || !row.id) return prev;
          if (!options.isMaster && !options.allowedCompanyIds.includes(row.id)) {
            return prev;
          }
          const comp: Company = {
            id: row.id,
            name: row.name,
            trade_name: row.trade_name || undefined,
            cnpj: row.cnpj || undefined,
            phone: row.phone || undefined,
            email: row.email || undefined,
            address: row.address || undefined,
            category: row.category || 'Geral',
            color: row.color || '#4f46e5',
            logo_url: row.logo_url || undefined,
            status: row.status || 'active',
            notes: row.notes || undefined,
            created_at: row.created_at || new Date().toISOString(),
          };
          const idx = updated.findIndex((c) => c.id === comp.id);
          if (idx >= 0) {
            updated[idx] = comp;
          } else {
            updated.push(comp);
          }
        } else if (payload.eventType === 'DELETE') {
          const oldRow = payload.old as any;
          if (oldRow?.id) {
            updated = updated.filter((c) => c.id !== oldRow.id);
          }
        }
        return { ...prev, companies: updated };
      });
    }
  );

  // 2. SALES
  channel.on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'sales' },
    (payload) => {
      console.log('[REALTIME EVENT] sales:', payload.eventType);
      options.onDataUpdate((prev) => {
        let updated = [...prev.sales];
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          const row = payload.new as any;
          if (!row || !row.id) return prev;
          if (!isAuthorizedCompany(row.company_id)) return prev;

          const sale: Sale = {
            id: row.id,
            company_id: row.company_id,
            customer_id: row.customer_id || undefined,
            customer_name: row.customer_name || 'Cliente',
            date: row.date ? String(row.date).slice(0, 10) : new Date().toISOString().slice(0, 10),
            payment_method: row.payment_method || 'Pix',
            status: row.status || 'Concluída',
            items: Array.isArray(row.items) ? row.items : [],
            discount: Number(row.discount) || 0,
            total_amount: Number(row.total_amount) || 0,
            total_cost: Number(row.total_cost) || 0,
            gross_margin: Number(row.gross_margin) || 0,
            consumed_items: Array.isArray(row.consumed_items) ? row.consumed_items : [],
            notes: row.notes || undefined,
            auto_stock_deducted: Boolean(row.auto_stock_deducted),
            created_at: row.created_at || new Date().toISOString(),
          };

          const idx = updated.findIndex((s) => s.id === sale.id);
          if (idx >= 0) {
            updated[idx] = sale;
          } else {
            updated.unshift(sale);
          }
        } else if (payload.eventType === 'DELETE') {
          const oldRow = payload.old as any;
          if (oldRow?.id) {
            updated = updated.filter((s) => s.id !== oldRow.id);
          }
        }
        return { ...prev, sales: updated };
      });
    }
  );

  // 3. PRODUCTS & SERVICES
  channel.on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'products' },
    (payload) => {
      console.log('[REALTIME EVENT] products:', payload.eventType);
      options.onDataUpdate((prev) => {
        let updated = [...prev.products];
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          const row = payload.new as any;
          if (!row || !row.id) return prev;
          if (!isAuthorizedCompany(row.company_id)) return prev;

          const product: Product = {
            id: row.id,
            company_id: row.company_id,
            name: row.name,
            sku: row.sku || undefined,
            type: (row.type as any) || 'Produto',
            category: row.category || 'Geral',
            unit: row.unit || row.control_unit || 'un',
            cost_price: Number(row.cost_price) || 0,
            sale_price: Number(row.sale_price) || 0,
            quantity: Number(row.quantity) || 0,
            min_quantity: Number(row.min_quantity) || 0,
            max_quantity: row.max_quantity ? Number(row.max_quantity) : undefined,
            track_stock: row.track_stock !== false,
            status: row.status || 'Ativo',
            supplier_id: row.supplier_id || undefined,
            supplier_name: row.supplier_name || undefined,
            location: row.location || undefined,
            composition: Array.isArray(row.composition) ? row.composition : undefined,
            notes: row.notes || undefined,
            last_entry_date: row.last_entry_date || undefined,
            last_movement_date: row.last_movement_date || undefined,
            created_at: row.created_at || new Date().toISOString(),
          };

          const idx = updated.findIndex((p) => p.id === product.id);
          if (idx >= 0) {
            updated[idx] = product;
          } else {
            updated.push(product);
          }
        } else if (payload.eventType === 'DELETE') {
          const oldRow = payload.old as any;
          if (oldRow?.id) {
            updated = updated.filter((p) => p.id !== oldRow.id);
          }
        }
        return { ...prev, products: updated };
      });
    }
  );

  // 4. INVENTORY MOVEMENTS
  channel.on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'inventory_movements' },
    (payload) => {
      console.log('[REALTIME EVENT] inventory_movements:', payload.eventType);
      options.onDataUpdate((prev) => {
        let updated = [...prev.inventoryMovements];
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          const row = payload.new as any;
          if (!row || !row.id) return prev;
          if (!isAuthorizedCompany(row.company_id)) return prev;

          const mov: InventoryMovement = {
            id: row.id,
            company_id: row.company_id,
            product_id: row.product_id,
            product_name: row.product_name || 'Produto',
            type: row.type || 'entrada',
            quantity: Number(row.quantity) || 0,
            unit: row.unit || 'un',
            previous_quantity: Number(row.previous_quantity) || 0,
            new_quantity: Number(row.new_quantity) || 0,
            unit_cost: row.unit_cost ? Number(row.unit_cost) : undefined,
            total_cost: row.total_cost ? Number(row.total_cost) : undefined,
            reason: row.reason || '',
            reference_type: row.reference_type || undefined,
            reference_id: row.reference_id || undefined,
            date: row.date ? String(row.date).slice(0, 10) : new Date().toISOString().slice(0, 10),
            created_at: row.created_at || new Date().toISOString(),
          };

          const idx = updated.findIndex((m) => m.id === mov.id);
          if (idx >= 0) {
            updated[idx] = mov;
          } else {
            updated.unshift(mov);
          }
        } else if (payload.eventType === 'DELETE') {
          const oldRow = payload.old as any;
          if (oldRow?.id) {
            updated = updated.filter((m) => m.id !== oldRow.id);
          }
        }
        return { ...prev, inventoryMovements: updated };
      });
    }
  );

  // 5. EXPENSES
  channel.on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'expenses' },
    (payload) => {
      console.log('[REALTIME EVENT] expenses:', payload.eventType);
      options.onDataUpdate((prev) => {
        let updated = [...prev.expenses];
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          const row = payload.new as any;
          if (!row || !row.id) return prev;
          if (!isAuthorizedCompany(row.company_id)) return prev;

          const exp: Expense = {
            id: row.id,
            company_id: row.company_id,
            description: row.description || '',
            category: row.category || 'Outros',
            supplier_id: row.supplier_id || undefined,
            supplier_name: row.supplier_name || undefined,
            amount: Number(row.amount) || 0,
            payment_method: row.payment_method || 'Pix',
            date: row.date ? String(row.date).slice(0, 10) : new Date().toISOString().slice(0, 10),
            due_date: row.due_date ? String(row.due_date).slice(0, 10) : undefined,
            status: row.status || 'Pago',
            notes: row.notes || undefined,
            created_at: row.created_at || new Date().toISOString(),
          };

          const idx = updated.findIndex((e) => e.id === exp.id);
          if (idx >= 0) {
            updated[idx] = exp;
          } else {
            updated.unshift(exp);
          }
        } else if (payload.eventType === 'DELETE') {
          const oldRow = payload.old as any;
          if (oldRow?.id) {
            updated = updated.filter((e) => e.id !== oldRow.id);
          }
        }
        return { ...prev, expenses: updated };
      });
    }
  );

  // 6. ACCOUNTS PAYABLE
  channel.on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'accounts_payable' },
    (payload) => {
      console.log('[REALTIME EVENT] accounts_payable:', payload.eventType);
      options.onDataUpdate((prev) => {
        let updated = [...prev.accountsPayable];
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          const row = payload.new as any;
          if (!row || !row.id) return prev;
          if (!isAuthorizedCompany(row.company_id)) return prev;

          const ap: AccountPayable = {
            id: row.id,
            company_id: row.company_id,
            description: row.description || '',
            supplier_id: row.supplier_id || undefined,
            supplier_name: row.supplier_name || 'Fornecedor',
            amount: Number(row.amount) || 0,
            due_date: row.due_date ? String(row.due_date).slice(0, 10) : new Date().toISOString().slice(0, 10),
            status: row.status || 'Pendente',
            paid_date: row.paid_date ? String(row.paid_date).slice(0, 10) : undefined,
            category: row.category || undefined,
            notes: row.notes || undefined,
            created_at: row.created_at || new Date().toISOString(),
          };

          const idx = updated.findIndex((a) => a.id === ap.id);
          if (idx >= 0) {
            updated[idx] = ap;
          } else {
            updated.unshift(ap);
          }
        } else if (payload.eventType === 'DELETE') {
          const oldRow = payload.old as any;
          if (oldRow?.id) {
            updated = updated.filter((a) => a.id !== oldRow.id);
          }
        }
        return { ...prev, accountsPayable: updated };
      });
    }
  );

  // 7. ACCOUNTS RECEIVABLE
  channel.on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'accounts_receivable' },
    (payload) => {
      console.log('[REALTIME EVENT] accounts_receivable:', payload.eventType);
      options.onDataUpdate((prev) => {
        let updated = [...prev.accountsReceivable];
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          const row = payload.new as any;
          if (!row || !row.id) return prev;
          if (!isAuthorizedCompany(row.company_id)) return prev;

          const ar: AccountReceivable = {
            id: row.id,
            company_id: row.company_id,
            customer_id: row.customer_id || undefined,
            customer_name: row.customer_name || 'Cliente',
            description: row.description || '',
            amount: Number(row.amount) || 0,
            due_date: row.due_date ? String(row.due_date).slice(0, 10) : new Date().toISOString().slice(0, 10),
            status: row.status || 'Pendente',
            received_date: row.received_date ? String(row.received_date).slice(0, 10) : undefined,
            payment_method: row.payment_method || undefined,
            notes: row.notes || undefined,
            created_at: row.created_at || new Date().toISOString(),
          };

          const idx = updated.findIndex((a) => a.id === ar.id);
          if (idx >= 0) {
            updated[idx] = ar;
          } else {
            updated.unshift(ar);
          }
        } else if (payload.eventType === 'DELETE') {
          const oldRow = payload.old as any;
          if (oldRow?.id) {
            updated = updated.filter((a) => a.id !== oldRow.id);
          }
        }
        return { ...prev, accountsReceivable: updated };
      });
    }
  );

  // 8. CUSTOMERS
  channel.on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'customers' },
    (payload) => {
      console.log('[REALTIME EVENT] customers:', payload.eventType);
      options.onDataUpdate((prev) => {
        let updated = [...prev.customers];
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          const row = payload.new as any;
          if (!row || !row.id) return prev;
          if (!isAuthorizedCompany(row.company_id)) return prev;

          const cust: Customer = {
            id: row.id,
            company_id: row.company_id,
            name: row.name || 'Cliente',
            cpf_cnpj: row.cpf_cnpj || undefined,
            phone: row.phone || undefined,
            whatsapp: row.whatsapp || undefined,
            email: row.email || undefined,
            address: row.address || undefined,
            notes: row.notes || undefined,
            created_at: row.created_at || new Date().toISOString(),
          };

          const idx = updated.findIndex((c) => c.id === cust.id);
          if (idx >= 0) {
            updated[idx] = cust;
          } else {
            updated.push(cust);
          }
        } else if (payload.eventType === 'DELETE') {
          const oldRow = payload.old as any;
          if (oldRow?.id) {
            updated = updated.filter((c) => c.id !== oldRow.id);
          }
        }
        return { ...prev, customers: updated };
      });
    }
  );

  // 9. SUPPLIERS
  channel.on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'suppliers' },
    (payload) => {
      console.log('[REALTIME EVENT] suppliers:', payload.eventType);
      options.onDataUpdate((prev) => {
        let updated = [...prev.suppliers];
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          const row = payload.new as any;
          if (!row || !row.id) return prev;
          if (!isAuthorizedCompany(row.company_id)) return prev;

          const supp: Supplier = {
            id: row.id,
            company_id: row.company_id,
            name: row.name || 'Fornecedor',
            cnpj_cpf: row.cnpj_cpf || undefined,
            phone: row.phone || undefined,
            whatsapp: row.whatsapp || undefined,
            email: row.email || undefined,
            address: row.address || undefined,
            category: row.category || undefined,
            notes: row.notes || undefined,
            created_at: row.created_at || new Date().toISOString(),
          };

          const idx = updated.findIndex((s) => s.id === supp.id);
          if (idx >= 0) {
            updated[idx] = supp;
          } else {
            updated.push(supp);
          }
        } else if (payload.eventType === 'DELETE') {
          const oldRow = payload.old as any;
          if (oldRow?.id) {
            updated = updated.filter((s) => s.id !== oldRow.id);
          }
        }
        return { ...prev, suppliers: updated };
      });
    }
  );

  // 10. TASKS
  channel.on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'tasks' },
    (payload) => {
      console.log('[REALTIME EVENT] tasks:', payload.eventType);
      options.onDataUpdate((prev) => {
        let updated = [...prev.tasks];
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          const row = payload.new as any;
          if (!row || !row.id) return prev;
          if (row.company_id !== 'all' && !isAuthorizedCompany(row.company_id)) return prev;

          const task: Task = {
            id: row.id,
            company_id: row.company_id,
            title: row.title || 'Tarefa',
            description: row.description || undefined,
            assigned_to: row.assigned_to || undefined,
            due_date: row.due_date ? String(row.due_date).slice(0, 10) : new Date().toISOString().slice(0, 10),
            priority: row.priority || 'Média',
            status: row.status || 'Pendente',
            notes: row.notes || undefined,
            completed_at: row.completed_at || undefined,
            created_at: row.created_at || new Date().toISOString(),
          };

          const idx = updated.findIndex((t) => t.id === task.id);
          if (idx >= 0) {
            updated[idx] = task;
          } else {
            updated.unshift(task);
          }
        } else if (payload.eventType === 'DELETE') {
          const oldRow = payload.old as any;
          if (oldRow?.id) {
            updated = updated.filter((t) => t.id !== oldRow.id);
          }
        }
        return { ...prev, tasks: updated };
      });
    }
  );

  // 11. PROFILES & USERS
  channel.on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'profiles' },
    (payload) => {
      console.log('[REALTIME EVENT] profiles:', payload.eventType);
      options.onDataUpdate((prev) => {
        let updatedUsers = [...(prev.users || [])];
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          const row = payload.new as any;
          if (!row || !row.id) return prev;

          const isUserMaster =
            row.role?.toUpperCase() === 'MASTER' ||
            row.role?.toLowerCase() === 'admin' ||
            row.is_master === true ||
            row.email?.toLowerCase() === 'oliveira.victor968@gmail.com';

          const idx = updatedUsers.findIndex((u) => u.id === row.id);
          const existingUser = idx >= 0 ? updatedUsers[idx] : null;

          const updatedAccount: UserAccount = {
            id: row.id,
            email: row.email,
            name: row.full_name || row.email?.split('@')[0] || 'Usuário',
            username: row.username || undefined,
            registration_number: row.registration_number || undefined,
            role: isUserMaster ? 'MASTER' : (row.role || 'OPERADOR'),
            is_master: isUserMaster,
            status: row.status || 'active',
            company_ids: existingUser?.company_ids || (isUserMaster ? ['*'] : []),
            permissions: existingUser?.permissions || (isUserMaster ? getFullPermissions() : getDefaultRolePermissions(row.role)),
            created_at: row.created_at || new Date().toISOString(),
            last_login: row.updated_at || undefined,
          };

          if (idx >= 0) {
            updatedUsers[idx] = updatedAccount;
          } else {
            updatedUsers.push(updatedAccount);
          }
        } else if (payload.eventType === 'DELETE') {
          const oldRow = payload.old as any;
          if (oldRow?.id) {
            updatedUsers = updatedUsers.filter((u) => u.id !== oldRow.id);
          }
        }
        return { ...prev, users: updatedUsers };
      });
    }
  );

  // 12. ACTIVITY LOGS
  channel.on(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'activity_logs' },
    (payload) => {
      console.log('[REALTIME EVENT] activity_logs:', payload.eventType);
      options.onDataUpdate((prev) => {
        const row = payload.new as any;
        if (!row || !row.id) return prev;
        if (row.company_id && !isAuthorizedCompany(row.company_id)) return prev;

        const log: ActivityLog = {
          id: row.id,
          user_id: row.user_id || 'system',
          user_name: row.user_name || 'Sistema',
          user_email: row.user_email || '',
          company_id: row.company_id || undefined,
          action: row.action || 'update',
          module: row.module || 'Geral',
          description: row.description || '',
          record_id: row.record_id || undefined,
          created_at: row.created_at || new Date().toISOString(),
        };

        const existingLogs = prev.activityLogs || [];
        if (existingLogs.some((l) => l.id === log.id)) return prev;

        return {
          ...prev,
          activityLogs: [log, ...existingLogs.slice(0, 99)],
        };
      });
    }
  );

  // Subscribe channel and track state
  channel.subscribe((status, err) => {
    if (status === 'SUBSCRIBED') {
      console.log('[SUPABASE REALTIME] REALTIME CONNECTED');
      options.onStatusChange?.('CONNECTED', 'Supabase Realtime ativo');
      // Perform security refresh to guarantee latest snapshot
      options.onRefreshNeeded?.();
    } else if (status === 'TIMED_OUT' || status === 'CHANNEL_ERROR') {
      console.warn('[SUPABASE REALTIME] REALTIME ERROR:', err || status);
      options.onStatusChange?.('ERROR', err?.message || 'Falha na conexão Realtime');
    } else if (status === 'CLOSED') {
      console.log('[SUPABASE REALTIME] REALTIME DISCONNECTED');
      options.onStatusChange?.('DISCONNECTED', 'Realtime desconectado');
    }
  });

  activeChannel = channel;

  return {
    unsubscribe: () => teardownSupabaseRealtime(client),
  };
}

/**
 * Cleanly tears down active Supabase Realtime channel
 */
export function teardownSupabaseRealtime(client?: SupabaseClient | null): void {
  if (activeChannel) {
    try {
      activeChannel.unsubscribe();
      const cl = client || getSupabaseClient();
      if (cl) {
        cl.removeChannel(activeChannel);
      }
    } catch (e) {
      console.warn('[REALTIME] Aviso ao fechar canal:', e);
    }
    activeChannel = null;
    currentSubscriptionKey = '';
  }
}
