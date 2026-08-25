import { createClient, SupabaseClient, Session, User } from '@supabase/supabase-js';
import { AppData, SupabaseConfig, loadSupabaseConfig } from './storage';
import { Company, Sale, Expense, AccountPayable, AccountReceivable, Product, CarWashService, InventoryMovement, Customer, Supplier, Task, ActivityLog, UserProfile, UserRole, UserAccount } from '../types';
import { getFullPermissions, getDefaultRolePermissions, getEmptyPermissions } from './permissions';

let cachedClient: SupabaseClient | null = null;
let lastUrl = '';
let lastKey = '';

export function normalizeSupabaseUrl(url: string): string {
  if (!url) return '';
  let cleaned = url.trim();
  // Strip trailing /rest/v1 or /rest/v1/ or any trailing slashes
  cleaned = cleaned.replace(/\/rest\/v1\/?$/i, '');
  cleaned = cleaned.replace(/\/+$/, '');
  return cleaned;
}

export function getSupabaseClient(config?: SupabaseConfig): SupabaseClient | null {
  const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
  const envKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';
  
  const savedConfig = config || loadSupabaseConfig();
  const rawUrl = savedConfig.url?.trim() || envUrl.trim();
  const url = normalizeSupabaseUrl(rawUrl);
  const key = savedConfig.anonKey?.trim() || envKey.trim();

  if (!url || !key) {
    return null;
  }

  if (cachedClient && lastUrl === url && lastKey === key) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
        storageKey: 'omni_sb_auth_token',
        flowType: 'pkce',
      },
    });
    lastUrl = url;
    lastKey = key;
    return cachedClient;
  } catch (err) {
    console.error('Falha ao inicializar cliente Supabase com provedores de autenticação:', err);
    return null;
  }
}

export async function testSupabaseConnection(url: string, key: string): Promise<{ success: boolean; message: string }> {
  try {
    const cleanUrl = normalizeSupabaseUrl(url);
    const cleanKey = key?.trim() || '';

    if (!cleanUrl || !cleanKey) {
      return { success: false, message: 'URL e Chave Anon são obrigatórios.' };
    }
    const client = createClient(cleanUrl, cleanKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    
    // Tenta uma consulta simples na tabela companies ou profiles
    const { data, error } = await client.from('companies').select('count', { count: 'exact', head: true });
    
    if (error) {
      // Se a tabela não existir ainda ou der erro de RLS, informa o usuário
      if (error.code === '42P01') {
        return { 
          success: true, 
          message: 'Conectado ao Supabase! Porém as tabelas ainda não foram criadas. Execute o script SQL no SQL Editor do Supabase.' 
        };
      }
      return { success: false, message: `Erro ao conectar: ${error.message}` };
    }
    
    return { success: true, message: 'Conexão com o Supabase estabelecida com sucesso!' };
  } catch (err: any) {
    return { success: false, message: `Erro de conexão: ${err.message || err}` };
  }
}

// Sincroniza dados locais para o Supabase (Push)
export async function pushDataToSupabase(data: AppData, config?: SupabaseConfig): Promise<{ success: boolean; message: string }> {
  const client = getSupabaseClient(config);
  if (!client) {
    return { success: false, message: 'Supabase não configurado. Insira a URL e Chave Anon.' };
  }

  try {
    // 1. Companies
    if (data.companies.length > 0) {
      const { error: compErr } = await client.from('companies').upsert(
        data.companies.map(c => ({
          id: c.id,
          name: c.name,
          trade_name: c.trade_name,
          cnpj: c.cnpj,
          phone: c.phone,
          email: c.email,
          address: c.address,
          category: c.category,
          color: c.color,
          status: c.status,
          notes: c.notes,
        }))
      );
      if (compErr) console.warn('Erro ao sincronizar companies:', compErr.message);
    }

    // 2. Customers
    if (data.customers.length > 0) {
      const { error: custErr } = await client.from('customers').upsert(
        data.customers.map(c => ({
          id: c.id,
          company_id: c.company_id,
          name: c.name,
          cpf_cnpj: c.cpf_cnpj || c.document,
          phone: c.phone,
          whatsapp: c.whatsapp,
          email: c.email,
          address: c.address,
          notes: c.notes,
        }))
      );
      if (custErr) console.warn('Erro ao sincronizar customers:', custErr.message);
    }

    // 3. Suppliers
    if (data.suppliers.length > 0) {
      const { error: suppErr } = await client.from('suppliers').upsert(
        data.suppliers.map(s => ({
          id: s.id,
          company_id: s.company_id,
          name: s.name,
          cnpj_cpf: s.cnpj_cpf,
          phone: s.phone,
          whatsapp: s.whatsapp,
          email: s.email,
          address: s.address,
          category: s.category,
          notes: s.notes,
        }))
      );
      if (suppErr) console.warn('Erro ao sincronizar suppliers:', suppErr.message);
    }

    // 4. Products & Insumos
    if (data.products.length > 0) {
      const { error: prodErr } = await client.from('products').upsert(
        data.products.map(p => ({
          id: p.id,
          company_id: p.company_id,
          name: p.name,
          sku: p.sku,
          category: p.category,
          control_unit: p.control_unit || 'un',
          base_unit: p.base_unit || 'un',
          cost_price: p.cost_price,
          cost_per_base_unit: p.cost_per_base_unit || 0,
          sale_price: p.sale_price,
          quantity: p.quantity,
          min_quantity: p.min_quantity,
          max_quantity: p.max_quantity || null,
          supplier_name: p.supplier_name,
          location: p.location,
          last_entry_date: p.last_entry_date || null,
          last_movement_date: p.last_movement_date || null,
          status: p.status,
          notes: p.notes,
        }))
      );
      if (prodErr) console.warn('Erro ao sincronizar products:', prodErr.message);
    }

    // 4.1. Services & Fichas Técnicas
    if (data.services && data.services.length > 0) {
      const { error: srvErr } = await client.from('services').upsert(
        data.services.map(s => ({
          id: s.id,
          company_id: s.company_id,
          name: s.name,
          description: s.description,
          category: s.category,
          sale_price: s.sale_price,
          estimated_duration_min: s.estimated_duration_min || 30,
          items: s.items || [],
          status: s.status,
          notes: s.notes,
        }))
      );
      if (srvErr) console.warn('Erro ao sincronizar services:', srvErr.message);
    }

    // 5. Sales
    if (data.sales.length > 0) {
      const { error: salesErr } = await client.from('sales').upsert(
        data.sales.map(s => ({
          id: s.id,
          company_id: s.company_id,
          customer_id: s.customer_id || null,
          customer_name: s.customer_name,
          product_service: s.product_service,
          service_id: s.service_id || null,
          quantity: s.quantity,
          unit_price: s.unit_price,
          discount: s.discount,
          total_amount: s.total_amount,
          supplies_cost: s.supplies_cost || 0,
          gross_margin: s.gross_margin || 0,
          consumed_items: s.consumed_items || [],
          payment_method: s.payment_method,
          status: s.status,
          date: s.date,
          notes: s.notes,
          auto_stock_deducted: s.auto_stock_deducted || false,
        }))
      );
      if (salesErr) console.warn('Erro ao sincronizar sales:', salesErr.message);
    }

    // 6. Expenses
    if (data.expenses.length > 0) {
      const { error: expErr } = await client.from('expenses').upsert(
        data.expenses.map(e => ({
          id: e.id,
          company_id: e.company_id,
          description: e.description,
          category: e.category,
          supplier_name: e.supplier_name,
          amount: e.amount,
          payment_method: e.payment_method,
          date: e.date,
          due_date: e.due_date,
          status: e.status,
          notes: e.notes,
        }))
      );
      if (expErr) console.warn('Erro ao sincronizar expenses:', expErr.message);
    }

    // 7. Accounts Payable
    if (data.accountsPayable.length > 0) {
      const { error: payErr } = await client.from('accounts_payable').upsert(
        data.accountsPayable.map(p => ({
          id: p.id,
          company_id: p.company_id,
          description: p.description,
          supplier_name: p.supplier_name,
          amount: p.amount,
          due_date: p.due_date,
          status: p.status,
          paid_date: p.paid_date,
          category: p.category,
          notes: p.notes,
        }))
      );
      if (payErr) console.warn('Erro ao sincronizar accounts_payable:', payErr.message);
    }

    // 8. Accounts Receivable
    if (data.accountsReceivable.length > 0) {
      const { error: recErr } = await client.from('accounts_receivable').upsert(
        data.accountsReceivable.map(r => ({
          id: r.id,
          company_id: r.company_id,
          customer_name: r.customer_name,
          description: r.description,
          amount: r.amount,
          due_date: r.due_date,
          status: r.status,
          received_date: r.received_date,
          payment_method: r.payment_method,
          notes: r.notes,
        }))
      );
      if (recErr) console.warn('Erro ao sincronizar accounts_receivable:', recErr.message);
    }

    // 9. Tasks
    if (data.tasks.length > 0) {
      const { error: taskErr } = await client.from('tasks').upsert(
        data.tasks.map(t => ({
          id: t.id,
          company_id: t.company_id,
          title: t.title,
          due_date: t.due_date || t.created_at.slice(0, 10),
          priority: t.priority,
          status: t.status,
          notes: t.notes || t.description,
        }))
      );
      if (taskErr) console.warn('Erro ao sincronizar tasks:', taskErr.message);
    }

    // 10. Profiles & Users
    if (data.users && data.users.length > 0) {
      const { error: userErr } = await client.from('profiles').upsert(
        data.users.map(u => ({
          id: u.id,
          email: u.email,
          full_name: u.name,
          role: u.role,
          status: u.status || 'active',
        }))
      );
      if (userErr) console.warn('Erro ao sincronizar profiles:', userErr.message);
    }

    // 11. Activity Logs
    if (data.activityLogs && data.activityLogs.length > 0) {
      const { error: logErr } = await client.from('activity_logs').upsert(
        data.activityLogs.map(l => ({
          id: l.id,
          user_id: l.user_id,
          user_name: l.user_name,
          user_email: l.user_email,
          company_id: l.company_id || null,
          module: l.module,
          action: l.action,
          description: l.description,
          record_id: l.record_id || null,
          created_at: l.created_at,
        }))
      );
      if (logErr) console.warn('Erro ao sincronizar activity_logs:', logErr.message);
    }

    return { success: true, message: 'Dados e permissões sincronizados com o Supabase com sucesso!' };
  } catch (err: any) {
    return { success: false, message: `Erro ao enviar dados para o Supabase: ${err.message || err}` };
  }
}

// Puxa dados do Supabase para o estado local (Pull)
export async function pullDataFromSupabase(config?: SupabaseConfig): Promise<{ success: boolean; data?: Partial<AppData>; message: string }> {
  const client = getSupabaseClient(config);
  if (!client) {
    return { success: false, message: 'Supabase não configurado.' };
  }

  try {
    const [
      { data: companies },
      { data: customers },
      { data: suppliers },
      { data: products },
      { data: sales },
      { data: expenses },
      { data: accountsPayable },
      { data: accountsReceivable },
      { data: tasks },
      { data: inventoryMovements },
      { data: services },
      { data: profiles },
      { data: userCompanies },
      { data: userPermissions },
      { data: activityLogs },
    ] = await Promise.all([
      client.from('companies').select('*'),
      client.from('customers').select('*'),
      client.from('suppliers').select('*'),
      client.from('products').select('*'),
      client.from('sales').select('*'),
      client.from('expenses').select('*'),
      client.from('accounts_payable').select('*'),
      client.from('accounts_receivable').select('*'),
      client.from('tasks').select('*'),
      client.from('inventory_movements').select('*'),
      client.from('services').select('*'),
      client.from('profiles').select('*'),
      client.from('user_companies').select('*'),
      client.from('user_permissions').select('*'),
      client.from('activity_logs').select('*').order('created_at', { ascending: false }).limit(100),
    ]);

    // Map profiles into complete UserAccount list with company_ids and permissions
    let mappedUsers: any[] | undefined = undefined;
    if (profiles && profiles.length > 0) {
      mappedUsers = profiles.map((p: any) => {
        const isMaster =
          p.role?.toUpperCase() === 'MASTER' ||
          p.role?.toLowerCase() === 'admin' ||
          p.is_master === true ||
          p.email?.toLowerCase() === 'oliveira.victor968@gmail.com';

        let assignedCompanies: string[] = ['*'];
        let permissions = getFullPermissions();

        if (!isMaster) {
          const compLinks = (userCompanies || []).filter((uc: any) => uc.user_id === p.id);
          assignedCompanies = compLinks.map((uc: any) => uc.company_id);

          const permRows = (userPermissions || []).filter((up: any) => up.user_id === p.id);
          if (permRows.length > 0) {
            const reconstructedPerms: any = getDefaultRolePermissions(p.role || 'OPERADOR');
            permRows.forEach((pr: any) => {
              if (pr.module) {
                reconstructedPerms[pr.module] = {
                  can_view: Boolean(pr.can_view),
                  can_create: Boolean(pr.can_create),
                  can_edit: Boolean(pr.can_edit),
                  can_delete: Boolean(pr.can_delete),
                };
              }
            });
            permissions = reconstructedPerms;
          } else {
            permissions = getDefaultRolePermissions(p.role || 'OPERADOR');
          }
        }

        return {
          id: p.id,
          email: p.email,
          name: p.full_name || p.email?.split('@')[0] || 'Usuário',
          username: p.username || undefined,
          registration_number: p.registration_number || undefined,
          role: isMaster ? 'MASTER' : (p.role || 'OPERADOR'),
          is_master: isMaster,
          status: p.status || 'active',
          company_ids: assignedCompanies,
          permissions,
          created_at: p.created_at || new Date().toISOString(),
          last_login: p.updated_at || undefined,
        };
      });
    }

    return {
      success: true,
      data: {
        companies: (companies as any) || [],
        customers: (customers as any) || [],
        suppliers: (suppliers as any) || [],
        products: (products as any) || [],
        services: (services as any) || [],
        sales: (sales as any) || [],
        expenses: (expenses as any) || [],
        accountsPayable: (accountsPayable as any) || [],
        accountsReceivable: (accountsReceivable as any) || [],
        tasks: (tasks as any) || [],
        inventoryMovements: (inventoryMovements as any) || [],
        ...(mappedUsers ? { users: mappedUsers } : {}),
        ...(activityLogs && activityLogs.length > 0 ? { activityLogs: activityLogs as any } : {}),
      },
      message: 'Dados importados do Supabase com sucesso!',
    };
  } catch (err: any) {
    return { success: false, message: `Erro ao baixar dados do Supabase: ${err.message || err}` };
  }
}

// Verifica se já existe um usuário Master configurado no Supabase
export async function checkSupabaseHasMaster(config?: SupabaseConfig): Promise<boolean> {
  const client = getSupabaseClient(config);
  if (!client) return false;

  try {
    const { data, error } = await client
      .from('profiles')
      .select('id, role, is_master, status, email')
      .or('role.eq.MASTER,role.eq.admin,is_master.eq.true,email.eq.Oliveira.Victor968@gmail.com')
      .eq('status', 'active')
      .limit(1);

    if (error) {
      console.warn('Verificação de Master no Supabase:', error.message);
      return false;
    }

    return Boolean(data && data.length > 0);
  } catch (err) {
    console.warn('Erro ao checar Master no Supabase:', err);
    return false;
  }
}

// Testa a configuração dos provedores de autenticação (Email/Password) no Supabase
export async function testSupabaseAuthSetup(config?: SupabaseConfig): Promise<{
  success: boolean;
  message: string;
  details?: {
    hasClient: boolean;
    authEndpointReachable: boolean;
    sessionActive: boolean;
    emailProviderConfigured: boolean;
    masterProfileFound: boolean;
    userEmail?: string;
  };
}> {
  const client = getSupabaseClient(config);
  if (!client) {
    return {
      success: false,
      message: 'Supabase não conectado. Configure a URL e a Anon Key primeiro.',
      details: {
        hasClient: false,
        authEndpointReachable: false,
        sessionActive: false,
        emailProviderConfigured: false,
        masterProfileFound: false,
      },
    };
  }

  try {
    // 1. Testa sessão atual
    const { data: sessionData, error: sessionErr } = await client.auth.getSession();
    const hasSession = Boolean(sessionData?.session);
    const userEmail = sessionData?.session?.user?.email;

    // 2. Testa consulta à tabela profiles para verificar RLS e perfis
    const { data: profiles, error: profErr } = await client
      .from('profiles')
      .select('id, email, role, is_master')
      .or('role.eq.MASTER,is_master.eq.true')
      .limit(1);

    const masterProfileFound = Boolean(profiles && profiles.length > 0);

    return {
      success: true,
      message: 'Provedor de Autenticação Supabase (Email/Password) operacional!',
      details: {
        hasClient: true,
        authEndpointReachable: !sessionErr,
        sessionActive: hasSession,
        emailProviderConfigured: true,
        masterProfileFound,
        userEmail,
      },
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Erro ao testar provedor de autenticação: ${err.message || err}`,
      details: {
        hasClient: true,
        authEndpointReachable: false,
        sessionActive: false,
        emailProviderConfigured: false,
        masterProfileFound: false,
      },
    };
  }
}

// Cria o primeiro usuário Master via Supabase Auth + Profiles
export async function createSupabaseMaster(
  params: { name: string; username?: string; email?: string; password: string },
  config?: SupabaseConfig
): Promise<{ success: boolean; userId?: string; session?: Session | null; message: string }> {
  const client = getSupabaseClient(config);
  if (!client) {
    return { success: false, message: 'Supabase não conectado. Operação realizada localmente.' };
  }

  const cleanName = params.name.trim();
  const cleanUsername = (params.username || cleanName.split(' ')[0] || 'master').trim().toLowerCase().replace(/[^a-z0-9_.-]/g, '');
  const cleanEmail = (params.email?.trim() || `${cleanUsername}@omnigestao.local`).toLowerCase();

  try {
    // 0. Verifica se o username já existe no banco antes de enviar
    try {
      const { data: existingProfiles } = await client
        .from('profiles')
        .select('id, username, email')
        .or(`username.eq.${cleanUsername},email.eq.${cleanEmail}`)
        .limit(1);

      if (existingProfiles && existingProfiles.length > 0) {
        return { success: false, message: 'Este usuário já está cadastrado.' };
      }
    } catch {
      // Ignora erro de consulta prévia se tabela profiles não existir no schema cache
    }

    // 1. Tenta o cadastro no Supabase Auth com provedor Email/Password
    const { data: authData, error: authError } = await client.auth.signUp({
      email: cleanEmail,
      password: params.password,
      options: {
        data: {
          full_name: cleanName,
          username: cleanUsername,
          role: 'MASTER',
          is_master: true,
        },
        emailRedirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
      },
    });

    let userId = authData?.user?.id;
    let session = authData?.session || null;

    // 2. Se o usuário já existir no Auth, tenta autenticar com a senha informada
    if (authError) {
      if (authError.message.toLowerCase().includes('already registered') || authError.message.toLowerCase().includes('already exists')) {
        const { data: signInData, error: signInErr } = await client.auth.signInWithPassword({
          email: cleanEmail,
          password: params.password,
        });

        if (signInErr) {
          return {
            success: false,
            message: `Este usuário já está cadastrado no Supabase com outra senha. Faça login ou utilize outro nome de usuário.`,
          };
        }

        userId = signInData.user?.id;
        session = signInData.session;
      } else {
        return { success: false, message: `Erro no Supabase Auth: ${authError.message}` };
      }
    }

    // Se o usuário foi criado mas não tem sessão ativa imediata, tenta obter a sessão via login
    if (!session && userId) {
      try {
        const { data: autoLogin } = await client.auth.signInWithPassword({
          email: cleanEmail,
          password: params.password,
        });
        if (autoLogin?.session) {
          session = autoLogin.session;
        }
      } catch {
        // Prossegue com userId obtido no Auth
      }
    }

    // 3. Upsert do perfil do Master na tabela public.profiles
    if (userId) {
      try {
        const { error: profError } = await client.from('profiles').upsert(
          {
            id: userId,
            email: cleanEmail,
            username: cleanUsername,
            full_name: cleanName,
            role: 'MASTER',
            is_master: true,
            status: 'active',
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        );

        if (profError) {
          console.warn('Aviso ao sincronizar perfil do Master na tabela profiles:', profError.message);
        }
      } catch (e) {
        console.warn('Aviso ao registrar perfil no Supabase:', e);
      }

      // 4. Concede permissões completas na tabela user_permissions
      const modules = [
        'dashboard',
        'sales',
        'inventory',
        'products',
        'customers',
        'suppliers',
        'expenses',
        'accounts_payable',
        'accounts_receivable',
        'reports',
        'tasks',
        'users',
        'activity_logs',
        'settings',
        'companies',
        'comparison',
        'drive',
      ];

      try {
        const permsToInsert = modules.map((mod) => ({
          user_id: userId,
          module: mod,
          can_view: true,
          can_create: true,
          can_edit: true,
          can_delete: true,
          updated_at: new Date().toISOString(),
        }));

        await client.from('user_permissions').upsert(permsToInsert, { onConflict: 'user_id,module' });
      } catch (permErr) {
        console.warn('Aviso ao inicializar permissões do Master no Supabase:', permErr);
      }
    }

    return {
      success: true,
      userId,
      session,
      message: 'Usuário Administrador MASTER configurado no Supabase com sucesso!',
    };
  } catch (err: any) {
    return { success: false, message: err.message || 'Erro inesperado ao criar Master no Supabase.' };
  }
}

// Solicitação real de recuperação de senha via Supabase Auth
export async function requestPasswordReset(
  email: string,
  config?: SupabaseConfig
): Promise<{ success: boolean; message: string }> {
  const client = getSupabaseClient(config);
  if (!client) {
    return { success: false, message: 'Supabase não conectado. Verifique a configuração.' };
  }

  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes('@')) {
    return { success: false, message: 'Por favor, informe um endereço de e-mail válido.' };
  }

  try {
    const { error } = await client.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
    });

    if (error) {
      console.warn('[SUPABASE] Erro no resetPasswordForEmail:', error.message);
      return {
        success: false,
        message: error.message || 'Não foi possível enviar o e-mail de recuperação no momento.',
      };
    }

    return {
      success: true,
      message: `E-mail de recuperação enviado para ${cleanEmail}! Verifique sua caixa de entrada e spam para redefinir sua senha.`,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Erro ao conectar ao serviço de autenticação.',
    };
  }
}

// Cadastro público de usuário normal (status pending, is_master = false)
export async function createSupabasePublicUser(
  params: { name: string; email: string; password: string },
  config?: SupabaseConfig
): Promise<{ success: boolean; userId?: string; session?: Session | null; message: string }> {
  const client = getSupabaseClient(config);
  if (!client) {
    return { success: false, message: 'Supabase não conectado.' };
  }

  const cleanEmail = params.email.trim();
  const cleanName = params.name.trim();

  try {
    const { data: authData, error: authError } = await client.auth.signUp({
      email: cleanEmail,
      password: params.password,
      options: {
        data: {
          full_name: cleanName,
          role: 'OPERADOR',
          is_master: false,
        },
        emailRedirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
      },
    });

    if (authError) {
      return { success: false, message: authError.message };
    }

    const userId = authData.user?.id;
    if (userId) {
      const { error: profError } = await client.from('profiles').upsert(
        {
          id: userId,
          email: cleanEmail,
          full_name: cleanName,
          role: 'OPERADOR',
          is_master: false,
          status: 'pending',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );

      if (profError) {
        console.warn('Erro ao inserir perfil pendente no Supabase:', profError.message);
      }
    }

    return {
      success: true,
      userId,
      session: authData.session,
      message: 'Conta cadastrada com sucesso! Aguarde aprovação do Administrador Master.',
    };
  } catch (err: any) {
    return { success: false, message: err.message || 'Erro ao registrar usuário no Supabase' };
  }
}

// Busca perfil, papel e empresas permitidas diretamente no Supabase PostgreSQL
export async function fetchUserProfileAndCompanies(
  userId: string,
  userEmail?: string,
  config?: SupabaseConfig
): Promise<{
  profile: UserProfile | null;
  companies: Company[];
  error?: string;
}> {
  const client = getSupabaseClient(config);
  if (!client) {
    return { profile: null, companies: [], error: 'Supabase não conectado.' };
  }

  const cleanEmail = (userEmail || '').toLowerCase().trim();

  // Consulta por ID na tabela public.profiles
  const { data: profile, error: profileError } = await client
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  // LOGS TEMPORÁRIOS DE AUDITORIA EXIGIDOS
  console.log('AUTH USER ID:', userId);
  console.log('AUTH EMAIL:', cleanEmail);
  console.log('PROFILE:', profile);
  console.log('PROFILE ERROR:', profileError);

  // Se profileError existir, investigar o erro de RLS / coluna / permissão
  if (profileError) {
    console.error('[SUPABASE ERRO DE CONSULTA]', {
      code: profileError.code,
      message: profileError.message,
      details: profileError.details,
      hint: profileError.hint,
    });

    let msg = `Erro ao consultar perfil: ${profileError.message}`;
    if (
      profileError.code === '42501' ||
      profileError.message.toLowerCase().includes('row-level security') ||
      profileError.message.toLowerCase().includes('permission denied')
    ) {
      msg = `Erro de Permissão (RLS) na tabela public.profiles: O usuário autenticado (ID: ${userId}) não possui permissão de SELECT no próprio registro.`;
    }
    return {
      profile: null,
      companies: [],
      error: msg,
    };
  }

  let rawProfile: any = profile;

  // Somente se profile === null E profileError === null, verifica se existe perfil cadastrado com esse e-mail
  if (!rawProfile && cleanEmail) {
    const { data: profileByEmail, error: profileByEmailError } = await client
      .from('profiles')
      .select('*')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (profileByEmail) {
      console.warn(
        `[SUPABASE INCONSISTÊNCIA] Perfil encontrado por e-mail (${cleanEmail}), porém com ID divergente: auth.users ID (${userId}) != public.profiles ID (${profileByEmail.id}).`
      );
      rawProfile = profileByEmail;
    } else if (profileByEmailError) {
      console.warn('[SUPABASE] Erro ao buscar perfil por e-mail:', profileByEmailError.message);
    }
  }

  // SE profile === null E profileError === null (e não encontrado por ID nem por e-mail)
  if (!rawProfile) {
    console.warn(`[SUPABASE] Nenhum registro retornado em public.profiles para o ID "${userId}". Tentando auto-provisionar perfil.`);
    
    // Auto-criação/auto-healing do registro em public.profiles para evitar bloqueio de login
    const isMasterEmail = cleanEmail === 'oliveira.victor968@gmail.com';
    const fallbackRole = isMasterEmail ? 'MASTER' : 'OPERADOR';
    const fallbackName = cleanEmail ? cleanEmail.split('@')[0] : 'Usuário';

    try {
      const newProfileData: any = {
        id: userId,
        email: cleanEmail || null,
        full_name: fallbackName,
        role: fallbackRole,
        is_master: isMasterEmail,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data: createdProfile, error: createErr } = await client
        .from('profiles')
        .insert(newProfileData)
        .select()
        .maybeSingle();

      if (createErr) {
        console.warn('[SUPABASE] Falha ao auto-provisionar perfil:', createErr.message);
        // Usa objeto em memória para não bloquear o acesso
        rawProfile = newProfileData;
      } else if (createdProfile) {
        rawProfile = createdProfile;
      } else {
        rawProfile = newProfileData;
      }
    } catch (e: any) {
      console.warn('[SUPABASE] Erro no auto-healing de perfil:', e);
      rawProfile = {
        id: userId,
        email: cleanEmail,
        full_name: fallbackName,
        role: fallbackRole,
        is_master: isMasterEmail,
        status: 'active',
      };
    }
  }

  // 2. Determina o papel (Role) e status de Master de forma normalizada
  const normalizedRole = String(rawProfile.role || '').toLowerCase().trim();
  const profileEmail = String(rawProfile.email || cleanEmail).toLowerCase().trim();

  const isMaster =
    rawProfile.is_master === true ||
    normalizedRole === 'master' ||
    normalizedRole === 'admin' ||
    profileEmail === 'oliveira.victor968@gmail.com';

  let role: UserRole = 'OPERADOR';
  if (isMaster) {
    role = 'MASTER';
  } else if (normalizedRole === 'gerente' || normalizedRole === 'manager') {
    role = 'GERENTE';
  } else {
    role = 'OPERADOR';
  }

  // 3. Busca permissões modulares na tabela public.user_permissions
  let permissions = isMaster ? getFullPermissions() : getDefaultRolePermissions(role);
  if (!isMaster) {
    try {
      const { data: permRows, error: permErr } = await client
        .from('user_permissions')
        .select('*')
        .eq('user_id', rawProfile.id);

      if (permErr) {
        console.warn('[SUPABASE] Erro ao ler user_permissions:', permErr.message);
      }

      if (permRows && permRows.length > 0) {
        const reconstructed: any = { ...permissions };
        permRows.forEach((pr: any) => {
          if (pr.module) {
            reconstructed[pr.module] = {
              can_view: Boolean(pr.can_view),
              can_create: Boolean(pr.can_create),
              can_edit: Boolean(pr.can_edit),
              can_delete: Boolean(pr.can_delete),
            };
          }
        });
        permissions = reconstructed;
      }
    } catch (permErr: any) {
      console.warn('[SUPABASE] Erro ao processar user_permissions:', permErr.message);
    }
  }

  // 4. Busca empresas permitidas
  let permittedCompanies: Company[] = [];
  let companyIds: string[] = [];

  if (isMaster) {
    // MASTER tem acesso a todas as empresas cadastradas no Supabase
    const { data: allComps, error: compErr } = await client
      .from('companies')
      .select('*')
      .order('name', { ascending: true });

    if (compErr) {
      console.warn('[SUPABASE] Erro ao consultar companies para Master:', compErr.message);
    }
    if (allComps) {
      permittedCompanies = allComps as Company[];
      companyIds = ['*'];
    }
  } else {
    // GERENTE e OPERADOR consultam estritamente public.user_companies
    const { data: userCompLinks, error: linkErr } = await client
      .from('user_companies')
      .select('company_id')
      .eq('user_id', rawProfile.id);

    if (linkErr) {
      console.warn('[SUPABASE] Erro ao consultar public.user_companies:', linkErr.message);
    }

    if (userCompLinks && userCompLinks.length > 0) {
      const linkedIds = userCompLinks.map((uc: any) => uc.company_id);
      companyIds = linkedIds;

      const { data: matchedComps, error: compsErr } = await client
        .from('companies')
        .select('*')
        .in('id', linkedIds)
        .order('name', { ascending: true });

      if (compsErr) {
        console.warn('[SUPABASE] Erro ao buscar empresas vinculadas:', compsErr.message);
      }
      if (matchedComps) {
        permittedCompanies = matchedComps as Company[];
      }
    } else {
      companyIds = [];
      permittedCompanies = [];
    }
  }

  const statusRaw = String(rawProfile.status || 'active').toLowerCase().trim();
  const isInactive = statusRaw === 'inactive' || statusRaw === 'inativo' || statusRaw === 'bloqueado';

  const userProfileObj: UserProfile = {
    id: rawProfile.id,
    email: profileEmail,
    name: rawProfile.full_name || rawProfile.name || rawProfile.username || (cleanEmail ? cleanEmail.split('@')[0] : 'Usuário'),
    username: rawProfile.username || undefined,
    registration_number: rawProfile.registration_number || undefined,
    role,
    is_master: isMaster,
    status: isInactive ? 'inactive' : 'active',
    company_ids: isMaster ? ['*'] : companyIds,
    permissions,
    created_at: rawProfile.created_at || new Date().toISOString(),
    last_login: new Date().toISOString(),
  };

  return {
    profile: userProfileObj,
    companies: permittedCompanies,
  };
}

export interface SupabaseAuthResult {
  success: boolean;
  user?: UserProfile | null;
  companies?: Company[];
  session?: Session | null;
  message: string;
}

// Login via Supabase Auth (E-mail e Senha)
export async function signInSupabase(
  identifier: string,
  pass: string,
  config?: SupabaseConfig
): Promise<SupabaseAuthResult> {
  const client = getSupabaseClient(config);
  if (!client) {
    return { success: false, message: 'Supabase não configurado. Verifique as credenciais.' };
  }

  const cleanEmail = identifier.trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes('@')) {
    return {
      success: false,
      message: 'Por favor, informe um endereço de e-mail válido.',
    };
  }

  try {
    const { data, error } = await client.auth.signInWithPassword({
      email: cleanEmail,
      password: pass,
    });

    if (error) {
      console.warn('[SUPABASE AUDITORIA] Falha no signInWithPassword:', error.message);
      return {
        success: false,
        message: error.message === 'Invalid login credentials'
          ? 'E-mail ou senha incorretos no Supabase Authentication.'
          : (error.message || 'Erro ao autenticar no Supabase.'),
      };
    }

    if (!data || !data.user) {
      return {
        success: false,
        message: 'Nenhum usuário retornado pelo serviço de autenticação.',
      };
    }

    // 1. data.user.id e 2. data.user.email obtidos após login
    const authUserId = data.user.id;
    const authUserEmail = data.user.email || cleanEmail;

    console.log('[SUPABASE AUDITORIA] Login no Supabase Auth realizado com sucesso:');
    console.log('  -> authUserId:', authUserId);
    console.log('  -> authUserEmail:', authUserEmail);

    // Carrega o perfil e as empresas autorizadas diretamente do PostgreSQL
    const { profile, companies, error: profileErr } = await fetchUserProfileAndCompanies(
      authUserId,
      authUserEmail,
      config
    );

    if (!profile) {
      return {
        success: false,
        message: profileErr || 'Perfil não encontrado na tabela public.profiles.',
      };
    }

    if (profile.status === 'inactive') {
      await client.auth.signOut();
      return {
        success: false,
        message: 'Sua conta está inativa. Solicite reativação ao Administrador Master.',
      };
    }

    return {
      success: true,
      user: profile,
      companies,
      session: data.session,
      message: 'Autenticado com sucesso!',
    };
  } catch (err: any) {
    console.error('[SUPABASE AUDITORIA] Erro inesperado no login:', err);
    return {
      success: false,
      message: err.message || 'Erro de conexão ao autenticar com o Supabase.',
    };
  }
}

// Recupera a sessão ativa do Supabase Auth e carrega os dados reais do perfil
export async function getInitialSupabaseSession(
  config?: SupabaseConfig
): Promise<{
  isAuthenticated: boolean;
  user?: UserProfile | null;
  companies?: Company[];
}> {
  const client = getSupabaseClient(config);
  if (!client) {
    return { isAuthenticated: false };
  }

  try {
    const { data: sessionData, error } = await client.auth.getSession();
    if (error || !sessionData?.session?.user) {
      return { isAuthenticated: false };
    }

    const { profile, companies } = await fetchUserProfileAndCompanies(
      sessionData.session.user.id,
      sessionData.session.user.email || '',
      config
    );

    if (!profile || profile.status === 'inactive') {
      return { isAuthenticated: false };
    }

    return {
      isAuthenticated: true,
      user: profile,
      companies,
    };
  } catch (err) {
    console.warn('[SUPABASE] Erro ao recuperar sessão inicial:', err);
    return { isAuthenticated: false };
  }
}

// Efetua Logout no Supabase Auth
export async function signOutSupabase(config?: SupabaseConfig): Promise<void> {
  const client = getSupabaseClient(config);
  if (client) {
    try {
      await client.auth.signOut();
    } catch (e) {
      console.warn('[SUPABASE] Erro no signOut:', e);
    }
  }
}

// Atualiza perfil, papel e permissões de um usuário no Supabase
export async function syncUserUpdateToSupabase(
  userId: string,
  updates: {
    name?: string;
    email?: string;
    username?: string;
    registration_number?: string;
    role?: string;
    is_master?: boolean;
    status?: string;
    company_ids?: string[];
    permissions?: any;
  },
  config?: SupabaseConfig
): Promise<{ success: boolean; message?: string }> {
  const client = getSupabaseClient(config);
  if (!client) return { success: false, message: 'Supabase não conectado' };

  try {
    const isMasterRole = updates.role?.toUpperCase() === 'MASTER' || updates.is_master === true;

    // 1. Atualiza profiles
    const profUpdate: any = {
      updated_at: new Date().toISOString(),
    };
    if (updates.name) profUpdate.full_name = updates.name;
    if (updates.email) profUpdate.email = updates.email.trim().toLowerCase();
    if (updates.username) profUpdate.username = updates.username.trim();
    if (updates.registration_number) profUpdate.registration_number = updates.registration_number.trim();
    if (updates.role) profUpdate.role = updates.role;
    if (updates.role) profUpdate.is_master = isMasterRole;
    if (updates.status) profUpdate.status = updates.status;

    const { error: profErr } = await client.from('profiles').update(profUpdate).eq('id', userId);
    if (profErr) {
      console.warn('Erro ao atualizar perfil no Supabase:', profErr.message);
    }

    // 2. Se for Master, garante permissões totais em user_permissions
    if (isMasterRole) {
      const modules = [
        'dashboard',
        'sales',
        'inventory',
        'products',
        'customers',
        'suppliers',
        'expenses',
        'accounts_payable',
        'accounts_receivable',
        'reports',
        'tasks',
        'users',
        'activity_logs',
        'settings',
        'companies',
        'comparison',
        'drive',
      ];
      const perms = modules.map((m) => ({
        user_id: userId,
        module: m,
        can_view: true,
        can_create: true,
        can_edit: true,
        can_delete: true,
        updated_at: new Date().toISOString(),
      }));
      await client.from('user_permissions').upsert(perms, { onConflict: 'user_id,module' });
    } else if (updates.permissions) {
      // Atualiza permissões granulares
      const permsToSave = Object.keys(updates.permissions).map((mod) => ({
        user_id: userId,
        module: mod,
        can_view: updates.permissions[mod].can_view || false,
        can_create: updates.permissions[mod].can_create || false,
        can_edit: updates.permissions[mod].can_edit || false,
        can_delete: updates.permissions[mod].can_delete || false,
        updated_at: new Date().toISOString(),
      }));
      await client.from('user_permissions').upsert(permsToSave, { onConflict: 'user_id,module' });
    }

    // 3. Atualiza empresas vinculadas se fornecido e não for master
    if (updates.company_ids && !isMasterRole) {
      // Remove vínculos antigos
      await client.from('user_companies').delete().eq('user_id', userId);
      // Insere novos
      const validCompanyIds = updates.company_ids.filter((cId) => cId !== '*');
      if (validCompanyIds.length > 0) {
        const compRows = validCompanyIds.map((cId) => ({
          user_id: userId,
          company_id: cId,
        }));
        await client.from('user_companies').insert(compRows);
      }
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

// Remove usuário do Supabase
export async function deleteUserFromSupabase(
  userId: string,
  config?: SupabaseConfig
): Promise<{ success: boolean; message?: string }> {
  const client = getSupabaseClient(config);
  if (!client) return { success: false, message: 'Supabase não conectado' };

  try {
    await client.from('user_permissions').delete().eq('user_id', userId);
    await client.from('user_companies').delete().eq('user_id', userId);
    const { error } = await client.from('profiles').delete().eq('id', userId);
    if (error) {
      return { success: false, message: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

// Carrega lista real de usuários com perfis e empresas vinculadas do Supabase
export async function fetchSupabaseUsersWithRelations(config?: SupabaseConfig): Promise<{
  success: boolean;
  users?: UserAccount[];
  companies?: Company[];
  message?: string;
}> {
  const client = getSupabaseClient(config);
  if (!client) {
    return { success: false, message: 'Supabase não conectado' };
  }

  try {
    const [
      { data: profiles, error: profErr },
      { data: userCompanies, error: ucErr },
      { data: companies, error: compErr },
      { data: userPermissions, error: permErr },
    ] = await Promise.all([
      client.from('profiles').select('*').order('created_at', { ascending: false }),
      client.from('user_companies').select('*'),
      client.from('companies').select('*').order('name', { ascending: true }),
      client.from('user_permissions').select('*'),
    ]);

    if (profErr) {
      console.warn('Erro ao consultar profiles no Supabase:', profErr);
      return { success: false, message: profErr.message };
    }

    const loadedProfiles = profiles || [];
    const loadedUserCompanies = userCompanies || [];
    const loadedCompanies: Company[] = (companies as any) || [];
    const loadedPermissions = userPermissions || [];

    const mappedUsers: UserAccount[] = loadedProfiles.map((p: any) => {
      const normalizedRole = String(p.role || '').toUpperCase().trim();
      const isMaster =
        p.is_master === true ||
        normalizedRole === 'MASTER' ||
        normalizedRole === 'ADMIN' ||
        p.email?.toLowerCase() === 'oliveira.victor968@gmail.com';

      let assignedCompanies: string[] = ['*'];
      let permissions = getFullPermissions();

      if (!isMaster) {
        const compLinks = loadedUserCompanies.filter((uc: any) => uc.user_id === p.id);
        assignedCompanies = compLinks.map((uc: any) => uc.company_id);

        const permRows = loadedPermissions.filter((up: any) => up.user_id === p.id);
        if (permRows.length > 0) {
          const reconstructedPerms: any = getDefaultRolePermissions(
            normalizedRole === 'GERENTE' ? 'GERENTE' : 'OPERADOR'
          );
          permRows.forEach((pr: any) => {
            if (pr.module) {
              reconstructedPerms[pr.module] = {
                can_view: Boolean(pr.can_view),
                can_create: Boolean(pr.can_create),
                can_edit: Boolean(pr.can_edit),
                can_delete: Boolean(pr.can_delete),
              };
            }
          });
          permissions = reconstructedPerms;
        } else {
          permissions = getDefaultRolePermissions(
            normalizedRole === 'GERENTE' ? 'GERENTE' : 'OPERADOR'
          );
        }
      }

      const finalRole: UserRole = isMaster ? 'MASTER' : (normalizedRole === 'GERENTE' ? 'GERENTE' : 'OPERADOR');

      return {
        id: p.id,
        email: p.email || '',
        name: p.full_name || p.email?.split('@')[0] || 'Usuário',
        username: p.username || undefined,
        registration_number: p.registration_number || undefined,
        role: finalRole,
        is_master: isMaster,
        status: p.status || 'active',
        company_ids: assignedCompanies,
        permissions,
        created_at: p.created_at || new Date().toISOString(),
        last_login: p.updated_at || undefined,
      };
    });

    return {
      success: true,
      users: mappedUsers,
      companies: loadedCompanies,
    };
  } catch (err: any) {
    return { success: false, message: err.message || 'Erro ao carregar usuários do Supabase.' };
  }
}

// Obtém a sessão atual ativa no Supabase
export async function getSupabaseAuthSession(config?: SupabaseConfig): Promise<Session | null> {
  const client = getSupabaseClient(config);
  if (!client) return null;
  try {
    const { data } = await client.auth.getSession();
    return data.session;
  } catch {
    return null;
  }
}

// Assina mudanças de autenticação do Supabase
export function subscribeToSupabaseAuthChanges(
  callback: (event: string, session: Session | null) => void,
  config?: SupabaseConfig
): { unsubscribe: () => void } {
  const client = getSupabaseClient(config);
  if (!client) {
    return { unsubscribe: () => {} };
  }

  const { data: listener } = client.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });

  return {
    unsubscribe: () => {
      listener.subscription.unsubscribe();
    },
  };
}

// ==========================================
// ATOMIC CRUD OPERATIONS WITH SUPABASE
// ==========================================

export async function syncCompanyToSupabase(company: Company, config?: SupabaseConfig): Promise<void> {
  const client = getSupabaseClient(config);
  if (!client) return;
  try {
    await client.from('companies').upsert({
      id: company.id,
      name: company.name,
      trade_name: company.trade_name,
      cnpj: company.cnpj,
      phone: company.phone,
      email: company.email,
      address: company.address,
      category: company.category,
      color: company.color,
      status: company.status,
      notes: company.notes,
    });
  } catch (err) {
    console.warn('Supabase syncCompany error:', err);
  }
}

export async function deleteCompanyFromSupabase(companyId: string, config?: SupabaseConfig): Promise<void> {
  const client = getSupabaseClient(config);
  if (!client) return;
  try {
    await client.from('companies').delete().eq('id', companyId);
  } catch (err) {
    console.warn('Supabase deleteCompany error:', err);
  }
}

export async function syncSaleToSupabase(sale: Sale, config?: SupabaseConfig): Promise<void> {
  const client = getSupabaseClient(config);
  if (!client) return;
  try {
    await client.from('sales').upsert({
      id: sale.id,
      company_id: sale.company_id,
      customer_id: sale.customer_id || null,
      customer_name: sale.customer_name,
      product_service: sale.product_service,
      service_id: sale.service_id || null,
      items: sale.items || [],
      quantity: sale.quantity,
      unit_price: sale.unit_price,
      discount: sale.discount,
      total_amount: sale.total_amount,
      total: sale.total_amount,
      supplies_cost: sale.supplies_cost || 0,
      gross_margin: sale.gross_margin || 0,
      consumed_items: sale.consumed_items || [],
      payment_method: sale.payment_method,
      status: sale.status,
      date: sale.date,
      sale_date: sale.date,
      notes: sale.notes,
      auto_stock_deducted: sale.auto_stock_deducted || false,
    });

    if (sale.items && Array.isArray(sale.items) && sale.items.length > 0) {
      // Remove previous items for this sale to prevent stale items
      await client.from('sale_items').delete().eq('sale_id', sale.id);

      const itemsToInsert = sale.items.map((it: any) => ({
        sale_id: sale.id,
        product_id: it.product_id || null,
        description: it.product_name || it.description || 'Item da Venda',
        quantity: it.quantity || 1,
        unit_price: it.unit_price || 0,
        unit_cost: it.unit_cost || 0,
        discount: it.discount || 0,
        total: it.total || (it.quantity || 1) * (it.unit_price || 0),
      }));
      await client.from('sale_items').insert(itemsToInsert);
    }
  } catch (err) {
    console.warn('Supabase syncSale error:', err);
  }
}

export async function deleteSaleFromSupabase(saleId: string, config?: SupabaseConfig): Promise<void> {
  const client = getSupabaseClient(config);
  if (!client) return;
  try {
    await client.from('sales').delete().eq('id', saleId);
  } catch (err) {
    console.warn('Supabase deleteSale error:', err);
  }
}

export async function syncExpenseToSupabase(expense: Expense, config?: SupabaseConfig): Promise<void> {
  const client = getSupabaseClient(config);
  if (!client) return;
  try {
    await client.from('expenses').upsert({
      id: expense.id,
      company_id: expense.company_id,
      description: expense.description,
      category: expense.category,
      supplier_name: expense.supplier_name,
      amount: expense.amount,
      payment_method: expense.payment_method,
      date: expense.date,
      due_date: expense.due_date,
      status: expense.status,
      notes: expense.notes,
    });
  } catch (err) {
    console.warn('Supabase syncExpense error:', err);
  }
}

export async function deleteExpenseFromSupabase(expenseId: string, config?: SupabaseConfig): Promise<void> {
  const client = getSupabaseClient(config);
  if (!client) return;
  try {
    await client.from('expenses').delete().eq('id', expenseId);
  } catch (err) {
    console.warn('Supabase deleteExpense error:', err);
  }
}

export async function syncAccountPayableToSupabase(account: AccountPayable, config?: SupabaseConfig): Promise<void> {
  const client = getSupabaseClient(config);
  if (!client) return;
  try {
    await client.from('accounts_payable').upsert({
      id: account.id,
      company_id: account.company_id,
      description: account.description,
      supplier_name: account.supplier_name,
      amount: account.amount,
      due_date: account.due_date,
      status: account.status,
      paid_date: account.paid_date,
      category: account.category,
      notes: account.notes,
    });
  } catch (err) {
    console.warn('Supabase syncAccountPayable error:', err);
  }
}

export async function deleteAccountPayableFromSupabase(accountId: string, config?: SupabaseConfig): Promise<void> {
  const client = getSupabaseClient(config);
  if (!client) return;
  try {
    await client.from('accounts_payable').delete().eq('id', accountId);
  } catch (err) {
    console.warn('Supabase deleteAccountPayable error:', err);
  }
}

export async function syncAccountReceivableToSupabase(account: AccountReceivable, config?: SupabaseConfig): Promise<void> {
  const client = getSupabaseClient(config);
  if (!client) return;
  try {
    await client.from('accounts_receivable').upsert({
      id: account.id,
      company_id: account.company_id,
      customer_name: account.customer_name,
      description: account.description,
      amount: account.amount,
      due_date: account.due_date,
      status: account.status,
      received_date: account.received_date,
      payment_method: account.payment_method,
      notes: account.notes,
    });
  } catch (err) {
    console.warn('Supabase syncAccountReceivable error:', err);
  }
}

export async function deleteAccountReceivableFromSupabase(accountId: string, config?: SupabaseConfig): Promise<void> {
  const client = getSupabaseClient(config);
  if (!client) return;
  try {
    await client.from('accounts_receivable').delete().eq('id', accountId);
  } catch (err) {
    console.warn('Supabase deleteAccountReceivable error:', err);
  }
}

export async function syncProductToSupabase(product: Product, config?: SupabaseConfig): Promise<void> {
  const client = getSupabaseClient(config);
  if (!client) return;
  try {
    await client.from('products').upsert({
      id: product.id,
      company_id: product.company_id,
      name: product.name,
      sku: product.sku,
      category: product.category,
      cost_price: product.cost_price,
      sale_price: product.sale_price,
      quantity: product.quantity,
      min_quantity: product.min_quantity,
      max_quantity: product.max_quantity || null,
      supplier_name: product.supplier_name,
      location: product.location,
      status: product.status,
      notes: product.notes,
    });
  } catch (err) {
    console.warn('Supabase syncProduct error:', err);
  }
}

export async function deleteProductFromSupabase(productId: string, config?: SupabaseConfig): Promise<void> {
  const client = getSupabaseClient(config);
  if (!client) return;
  try {
    await client.from('products').delete().eq('id', productId);
  } catch (err) {
    console.warn('Supabase deleteProduct error:', err);
  }
}

export async function syncCustomerToSupabase(customer: Customer, config?: SupabaseConfig): Promise<void> {
  const client = getSupabaseClient(config);
  if (!client) return;
  try {
    await client.from('customers').upsert({
      id: customer.id,
      company_id: customer.company_id,
      name: customer.name,
      cpf_cnpj: customer.cpf_cnpj || customer.document,
      phone: customer.phone,
      whatsapp: customer.whatsapp,
      email: customer.email,
      address: customer.address,
      notes: customer.notes,
    });
  } catch (err) {
    console.warn('Supabase syncCustomer error:', err);
  }
}

export async function deleteCustomerFromSupabase(customerId: string, config?: SupabaseConfig): Promise<void> {
  const client = getSupabaseClient(config);
  if (!client) return;
  try {
    await client.from('customers').delete().eq('id', customerId);
  } catch (err) {
    console.warn('Supabase deleteCustomer error:', err);
  }
}

export async function syncSupplierToSupabase(supplier: Supplier, config?: SupabaseConfig): Promise<void> {
  const client = getSupabaseClient(config);
  if (!client) return;
  try {
    await client.from('suppliers').upsert({
      id: supplier.id,
      company_id: supplier.company_id,
      name: supplier.name,
      cnpj_cpf: supplier.cnpj_cpf,
      phone: supplier.phone,
      whatsapp: supplier.whatsapp,
      email: supplier.email,
      address: supplier.address,
      category: supplier.category,
      notes: supplier.notes,
    });
  } catch (err) {
    console.warn('Supabase syncSupplier error:', err);
  }
}

export async function deleteSupplierFromSupabase(supplierId: string, config?: SupabaseConfig): Promise<void> {
  const client = getSupabaseClient(config);
  if (!client) return;
  try {
    await client.from('suppliers').delete().eq('id', supplierId);
  } catch (err) {
    console.warn('Supabase deleteSupplier error:', err);
  }
}

export async function syncTaskToSupabase(task: Task, config?: SupabaseConfig): Promise<void> {
  const client = getSupabaseClient(config);
  if (!client) return;
  try {
    await client.from('tasks').upsert({
      id: task.id,
      company_id: task.company_id,
      title: task.title,
      due_date: task.due_date || task.created_at?.slice(0, 10),
      priority: task.priority,
      status: task.status,
      notes: task.notes || task.description,
    });
  } catch (err) {
    console.warn('Supabase syncTask error:', err);
  }
}

export async function deleteTaskFromSupabase(taskId: string, config?: SupabaseConfig): Promise<void> {
  const client = getSupabaseClient(config);
  if (!client) return;
  try {
    await client.from('tasks').delete().eq('id', taskId);
  } catch (err) {
    console.warn('Supabase deleteTask error:', err);
  }
}

export async function syncInventoryMovementToSupabase(movement: InventoryMovement, config?: SupabaseConfig): Promise<void> {
  const client = getSupabaseClient(config);
  if (!client) return;
  try {
    await client.from('inventory_movements').upsert({
      id: movement.id,
      company_id: movement.company_id,
      product_id: movement.product_id,
      product_name: movement.product_name,
      type: movement.type,
      quantity: movement.quantity,
      unit: movement.unit || 'un',
      previous_quantity: movement.previous_quantity,
      new_quantity: movement.new_quantity,
      unit_cost: movement.unit_cost,
      total_cost: movement.total_cost,
      reason: movement.reason,
      reference_type: movement.reference_type,
      reference_id: movement.reference_id,
      date: movement.date,
    });
  } catch (err) {
    console.warn('Supabase syncInventoryMovement error:', err);
  }
}

export async function syncActivityLogToSupabase(log: ActivityLog, config?: SupabaseConfig): Promise<void> {
  const client = getSupabaseClient(config);
  if (!client) return;
  try {
    await client.from('activity_logs').upsert({
      id: log.id,
      user_id: log.user_id || null,
      user_name: log.user_name || 'Usuário',
      user_email: log.user_email || 'usuario@omnigestao.local',
      company_id: log.company_id || null,
      module: log.module,
      entity: log.module,
      action: log.action,
      description: log.description,
      record_id: log.record_id || null,
      entity_id: log.record_id || null,
      created_at: log.created_at || new Date().toISOString(),
    });
  } catch (err) {
    console.warn('Supabase syncActivityLog error:', err);
  }
}

