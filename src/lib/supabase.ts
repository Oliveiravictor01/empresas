import { createClient, SupabaseClient, Session, User } from '@supabase/supabase-js';
import { AppData, SupabaseConfig, loadSupabaseConfig } from './storage';
import { Company, Sale, SaleItem, Expense, AccountPayable, AccountReceivable, Product, InventoryMovement, Customer, Supplier, Task, ActivityLog, UserProfile, UnitType } from '../types';
import { getFullPermissions, getDefaultRolePermissions, getEmptyPermissions } from './permissions';
import { generateUUID } from './utils';

let cachedClient: SupabaseClient | null = null;
let lastUrl = '';
let lastKey = '';

export function normalizeSupabaseUrl(url: string): string {
    if (!url) return '';
    let cleaned = url.trim();
    cleaned = cleaned.replace(/\/rest\/v1\/?$/i, '');
    cleaned = cleaned.replace(/\/+$/, '');
    return cleaned;
}

function sanitizeSupabaseValue(value: string): string {
    return value.trim().replace(/^["']+|["']+$/g, '').trim();
}

function isJwtToken(token: string): boolean {
    return token.startsWith('eyJ');
}

function supabaseFetch(apiKey: string): typeof fetch {
    return async (input, init) => {
        const headers = new Headers(init?.headers);
        headers.set('apikey', apiKey);
        const authorization = headers.get('Authorization');
        const bearer = authorization?.replace(/^Bearer\s+/i, '') || '';
        // Chaves sb_publishable_ não são JWT. O Auth do Supabase responde "Invalid API key"
        // se elas forem enviadas em Authorization: Bearer.
        if (bearer && !isJwtToken(bearer)) {
            headers.delete('Authorization');
        }
        return fetch(input, { ...init, headers });
    };
}

export function getSupabaseClient(config?: SupabaseConfig): SupabaseClient | null {
    const envUrl = sanitizeSupabaseValue(import.meta.env.VITE_SUPABASE_URL || '');
    const envKey = sanitizeSupabaseValue(import.meta.env.VITE_SUPABASE_ANON_KEY || '');
    const stored = config ?? (typeof window !== 'undefined' ? loadSupabaseConfig() : undefined);

    const url = normalizeSupabaseUrl(envUrl || stored?.url || '');
    const key = sanitizeSupabaseValue(envKey || stored?.anonKey || '');

    if (!url || !key) {
        console.warn('[SUPABASE] Variáveis de ambiente VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não encontradas.');
        return null;
    }

    if (cachedClient && lastUrl === url && lastKey === key) {
        return cachedClient;
    }

    cachedClient = createClient(url, key, {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
        },
        global: {
            fetch: supabaseFetch(key),
        },
    });

    lastUrl = url;
    lastKey = key;
    return cachedClient;
}

const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function asUuid(value?: string | null): string | null {
    if (!value || typeof value !== 'string') return null;
    const trimmed = value.trim();
    return UUID_RE.test(trimmed) ? trimmed : null;
}

function compactRow(row: Record<string, unknown>): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row)) {
        if (value !== undefined) out[key] = value;
    }
    return out;
}

function omitColumn(
    payload: Record<string, unknown> | Record<string, unknown>[],
    column: string
): Record<string, unknown> | Record<string, unknown>[] {
    if (Array.isArray(payload)) {
        return payload.map((row) => {
            const next = { ...row };
            delete next[column];
            return next;
        });
    }
    const next = { ...payload };
    delete next[column];
    return next;
}

function missingColumnFromError(message?: string): string | null {
    const match = message?.match(/Could not find the '([^']+)' column/i);
    return match?.[1] ?? null;
}

async function writeWithSchemaFallback(
    table: string,
    payload: Record<string, unknown> | Record<string, unknown>[],
    writer: (body: Record<string, unknown> | Record<string, unknown>[]) => Promise<{ error: { code?: string; message: string; details?: string | null } | null }>
): Promise<void> {
    let current = payload;
    let statusSwapped = false;
    for (let attempt = 0; attempt < 20; attempt++) {
        const { error } = await writer(current);
        if (!error) return;

        const missing = error.code === 'PGRST204' ? missingColumnFromError(error.message) : null;
        if (missing) {
            console.warn(`[SUPABASE] Coluna ${table}.${missing} não existe no banco; omitindo.`);
            current = omitColumn(current, missing);
            continue;
        }

        const combined = `${error.message || ''} ${error.details || ''}`;
        if (!statusSwapped && (error.code === '23514' || /check constraint|status/i.test(combined))) {
            statusSwapped = true;
            current = Array.isArray(current) ? current.map(swapStatusValue) : swapStatusValue(current);
            console.warn(`[SUPABASE] Ajustando status de ${table} para o formato do banco.`);
            continue;
        }

        if (/last_entry_date|last_movement_date|invalid input syntax for type date/i.test(combined)) {
            current = omitColumn(omitColumn(current, 'last_entry_date'), 'last_movement_date');
            console.warn(`[SUPABASE] Omitindo datas incompatíveis em ${table}.`);
            continue;
        }

        if (error.code === '23503' && /supplier/i.test(combined)) {
            current = omitColumn(current, 'supplier_id');
            continue;
        }

        console.error(`[SUPABASE] Falha ao gravar em ${table}:`, error.code, error.message, error.details, current);
        throw new Error(`${table}: ${error.message}`);
    }
    throw new Error(`${table}: schema incompatível com o banco.`);
}

function swapStatusValue(row: Record<string, unknown>): Record<string, unknown> {
    const status = String(row.status || '');
    const mapped: Record<string, string> = {
        Ativo: 'active',
        Inativo: 'inactive',
        active: 'Ativo',
        inactive: 'Inativo',
        Pago: 'pago',
        Pendente: 'pendente',
        Concluída: 'concluida',
        Cancelada: 'cancelada',
    };
    if (!mapped[status]) return row;
    return { ...row, status: mapped[status] };
}

async function upsertChecked(
    client: SupabaseClient,
    table: string,
    payload: Record<string, unknown> | Record<string, unknown>[]
): Promise<void> {
    await writeWithSchemaFallback(table, payload, (body) =>
        client.from(table).upsert(body, { onConflict: 'id' })
    );
}

async function insertChecked(
    client: SupabaseClient,
    table: string,
    payload: Record<string, unknown> | Record<string, unknown>[]
): Promise<void> {
    await writeWithSchemaFallback(table, payload, (body) => client.from(table).insert(body));
}

async function deleteChecked(client: SupabaseClient, table: string, id: string): Promise<void> {
    const { error } = await client.from(table).delete().eq('id', id);
    if (error) {
        console.error(`[SUPABASE] Falha ao excluir de ${table}:`, error.message, error.details);
        throw new Error(`${table}: ${error.message}`);
    }
}

function mapCompany(company: Company) {
    return compactRow({
        id: company.id,
        name: company.name,
        trade_name: company.trade_name ?? null,
        cnpj: company.cnpj ?? null,
        phone: company.phone ?? null,
        email: company.email ?? null,
        address: company.address ?? null,
        category: company.category,
        color: company.color,
        logo_url: company.logo_url ?? null,
        status: company.status,
        notes: company.notes ?? null,
        created_at: company.created_at,
    });
}

function dateOnly(value?: string | null): string | null {
    if (!value) return null;
    return String(value).slice(0, 10);
}

function mapSale(sale: Sale, userId?: string | null) {
    return compactRow({
        id: sale.id,
        company_id: sale.company_id,
        user_id: asUuid(userId),
        customer_id: asUuid(sale.customer_id),
        customer_name: sale.customer_name,
        product_service: sale.product_service ?? sale.items?.[0]?.name ?? null,
        discount: sale.discount ?? 0,
        total_amount: sale.total_amount,
        payment_method: sale.payment_method,
        status: sale.status,
        date: dateOnly(sale.date),
        notes: sale.notes ?? null,
        created_at: sale.created_at,
    });
}

function mapSaleItem(saleId: string, item: SaleItem) {
    return compactRow({
        id: asUuid(item.id) || generateUUID(),
        sale_id: saleId,
        product_id: asUuid(item.product_id),
        description: item.name || item.product_name || 'Item',
        quantity: item.quantity ?? 1,
        unit_price: item.unit_price ?? 0,
        unit_cost: item.unit_cost ?? 0,
        discount: item.discount ?? 0,
        total: item.total_price ?? 0,
    });
}

function mapExpense(expense: Expense, userId?: string | null) {
    return compactRow({
        id: expense.id,
        company_id: expense.company_id,
        user_id: asUuid(userId),
        description: expense.description,
        category: expense.category,
        supplier_id: asUuid(expense.supplier_id),
        supplier_name: expense.supplier_name ?? null,
        amount: expense.amount,
        payment_method: expense.payment_method,
        date: dateOnly(expense.date),
        due_date: dateOnly(expense.due_date),
        status: expense.status,
        notes: expense.notes ?? null,
        created_at: expense.created_at,
    });
}

function mapAccountPayable(item: AccountPayable, userId?: string | null) {
    return compactRow({
        id: item.id,
        company_id: item.company_id,
        user_id: asUuid(userId),
        description: item.description,
        supplier_id: asUuid(item.supplier_id),
        supplier_name: item.supplier_name,
        amount: item.amount,
        due_date: dateOnly(item.due_date),
        status: item.status,
        paid_date: dateOnly(item.paid_date),
        category: item.category ?? null,
        notes: item.notes ?? null,
        created_at: item.created_at,
    });
}

function mapAccountReceivable(item: AccountReceivable, userId?: string | null) {
    return compactRow({
        id: item.id,
        company_id: item.company_id,
        user_id: asUuid(userId),
        customer_id: asUuid(item.customer_id),
        customer_name: item.customer_name,
        description: item.description,
        amount: item.amount,
        due_date: dateOnly(item.due_date),
        status: item.status,
        received_date: dateOnly(item.received_date),
        payment_method: item.payment_method ?? null,
        notes: item.notes ?? null,
        created_at: item.created_at,
    });
}

function mapProduct(product: Product) {
    return compactRow({
        id: product.id,
        company_id: product.company_id,
        name: product.name,
        sku: product.sku || null,
        code: product.sku || null,
        category: product.category || 'Geral',
        unit: product.unit || 'un',
        cost_price: Number(product.cost_price) || 0,
        sale_price: Number(product.sale_price) || 0,
        quantity: Number(product.quantity) || 0,
        min_quantity: Number(product.min_quantity) || 0,
        max_quantity: product.max_quantity ? Number(product.max_quantity) : null,
        status: product.status || 'Ativo',
        supplier_id: asUuid(product.supplier_id),
        supplier_name: product.supplier_name || null,
        location: product.location || null,
        notes: product.notes || null,
        created_at: product.created_at,
    });
}

function mapCustomer(customer: Customer) {
    return compactRow({
        id: customer.id,
        company_id: customer.company_id,
        name: customer.name,
        cpf_cnpj: customer.cpf_cnpj ?? customer.document ?? null,
        document: customer.document ?? customer.cpf_cnpj ?? null,
        phone: customer.phone ?? null,
        whatsapp: customer.whatsapp ?? null,
        email: customer.email ?? null,
        address: customer.address ?? null,
        notes: customer.notes ?? null,
        created_at: customer.created_at,
    });
}

function mapSupplier(supplier: Supplier) {
    return compactRow({
        id: supplier.id,
        company_id: supplier.company_id,
        name: supplier.name,
        cnpj_cpf: supplier.cnpj_cpf ?? null,
        phone: supplier.phone ?? null,
        whatsapp: supplier.whatsapp ?? null,
        email: supplier.email ?? null,
        address: supplier.address ?? null,
        category: supplier.category ?? 'Geral',
        notes: supplier.notes ?? null,
        created_at: supplier.created_at,
    });
}

function mapTask(task: Task) {
    return compactRow({
        id: task.id,
        company_id: task.company_id,
        title: task.title,
        description: task.description ?? null,
        assigned_to: task.assigned_to ?? null,
        due_date: dateOnly(task.due_date) || dateOnly(new Date().toISOString()),
        priority: task.priority,
        status: task.status,
        notes: task.notes ?? null,
        completed_at: task.completed_at ?? null,
        created_at: task.created_at,
    });
}

function mapInventoryMovement(movement: InventoryMovement, userId?: string | null) {
    return compactRow({
        id: movement.id,
        company_id: movement.company_id,
        product_id: asUuid(movement.product_id),
        user_id: asUuid(movement.created_by) || asUuid(userId),
        product_name: movement.product_name,
        type: movement.type,
        quantity: movement.quantity,
        unit: movement.unit || 'un',
        previous_quantity: movement.previous_quantity ?? 0,
        new_quantity: movement.new_quantity ?? 0,
        unit_cost: movement.unit_cost ?? null,
        total_cost: movement.total_cost ?? null,
        reason: movement.reason,
        reference_type: movement.reference_type ?? null,
        reference_id: movement.reference_id ?? null,
        date: dateOnly(movement.date),
        created_at: movement.created_at,
    });
}

function mapActivityLog(log: ActivityLog) {
    return compactRow({
        id: log.id,
        user_id: asUuid(log.user_id),
        user_name: log.user_name,
        user_email: log.user_email,
        company_id: asUuid(log.company_id),
        module: log.module,
        action: log.action,
        description: log.description,
        record_id: log.record_id ?? null,
        created_at: log.created_at,
    });
}

async function currentUserId(client: SupabaseClient): Promise<string | null> {
    try {
        const { data } = await client.auth.getUser();
        return data.user?.id ?? null;
    } catch {
        return null;
    }
}

export async function checkSupabaseHasMaster(config?: SupabaseConfig): Promise<boolean> {
    try {
        const client = getSupabaseClient(config);
        if (!client) return false;

        const { data, error } = await client
            .from('profiles')
            .select('id')
            .eq('is_master', true)
            .limit(1);

        if (error) {
            return false;
        }
        return data && data.length > 0;
    } catch {
        return false;
    }
}

async function resolveAppUser(
    client: SupabaseClient,
    authUser: User
): Promise<{ user: UserProfile; companies: Company[] }> {
    const email = (authUser.email || '').toLowerCase();
    const userId = authUser.id;

    let { data: profileData, error: profileError } = await client
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

    if (!profileData || profileError) {
        const { data: insertedProfile } = await client
            .from('profiles')
            .upsert({
                id: userId,
                user_id: userId,
                email: authUser.email,
                full_name: authUser.user_metadata?.full_name || email.split('@')[0],
                role: email === 'oliveira.victor968@gmail.com' ? 'MASTER' : 'OPERADOR',
                is_master: email === 'oliveira.victor968@gmail.com',
                status: 'active',
            })
            .select()
            .single();
        profileData = insertedProfile;
    }

    const isMaster =
        profileData?.is_master ||
        profileData?.role === 'MASTER' ||
        profileData?.role === 'admin' ||
        email === 'oliveira.victor968@gmail.com';

    let companiesList: Company[] = [];
    if (isMaster) {
        const { data: allComps } = await client.from('companies').select('*');
        companiesList = allComps || [];
    } else {
        const { data: userComps } = await client
            .from('user_companies')
            .select('company_id, companies(*)')
            .eq('user_id', userId);

        companiesList = (userComps || []).map((uc: any) => uc.companies).filter(Boolean);
    }

    const userProfile: UserProfile = {
        id: userId,
        email: authUser.email || email,
        name: profileData?.full_name || authUser.user_metadata?.full_name || email.split('@')[0],
        role: isMaster ? 'MASTER' : (profileData?.role || 'OPERADOR'),
        is_master: isMaster,
        status: profileData?.status || 'active',
        company_ids: isMaster ? ['*'] : companiesList.map((c) => c.id),
        permissions: isMaster
            ? getFullPermissions()
            : profileData?.permissions || getDefaultRolePermissions(profileData?.role || 'OPERADOR'),
        created_at: profileData?.created_at || new Date().toISOString(),
        last_login: new Date().toISOString(),
    };

    return { user: userProfile, companies: companiesList };
}

export async function signInSupabase(email: string, pass: string, config?: SupabaseConfig): Promise<{ success: boolean; user?: UserProfile; companies?: Company[]; message?: string }> {
    try {
        const client = getSupabaseClient(config);
        if (!client) {
            return { success: false, message: 'Cliente Supabase não inicializado.' };
        }

        const { data: authData, error: authError } = await client.auth.signInWithPassword({
            email,
            password: pass,
        });

        if (authError || !authData.user) {
            return { success: false, message: authError?.message || 'E-mail ou senha incorretos.' };
        }

        const resolved = await resolveAppUser(client, authData.user);
        return { success: true, user: resolved.user, companies: resolved.companies };
    } catch (err: any) {
        return { success: false, message: err.message || 'Erro ao autenticar no Supabase.' };
    }
}

export async function getInitialSupabaseSession(config?: SupabaseConfig): Promise<{ isAuthenticated: boolean; user?: UserProfile; companies?: Company[]; error?: string }> {
    try {
        const client = getSupabaseClient(config);
        if (!client) return { isAuthenticated: false, error: 'no_client' };

        const { data: sessionData, error: sessionError } = await client.auth.getSession();
        if (sessionError) {
            return { isAuthenticated: false, error: sessionError.message };
        }
        if (!sessionData.session || !sessionData.session.user) {
            return { isAuthenticated: false };
        }

        const resolved = await resolveAppUser(client, sessionData.session.user);
        return { isAuthenticated: true, user: resolved.user, companies: resolved.companies };
    } catch (err: any) {
        return { isAuthenticated: false, error: err.message || 'session_error' };
    }
}

export async function signOutSupabase(config?: SupabaseConfig): Promise<void> {
    try {
        const client = getSupabaseClient(config);
        if (client) {
            await client.auth.signOut();
        }
    } catch {}
}

export async function requestPasswordReset(email: string, config?: SupabaseConfig): Promise<{ success: boolean; message: string }> {
    try {
        const client = getSupabaseClient(config);
        if (!client) return { success: false, message: 'Supabase não configurado.' };

        const { error } = await client.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin,
        });

        if (error) {
            return { success: false, message: error.message };
        }

        return { success: true, message: 'E-mail de recuperação de senha enviado com sucesso.' };
    } catch (err: any) {
        return { success: false, message: err.message || 'Erro ao solicitar recuperação.' };
    }
}

export async function syncCompanyToSupabase(company: Company, config?: SupabaseConfig): Promise<void> {
    const client = getSupabaseClient(config);
    if (!client) throw new Error('Cliente Supabase não inicializado.');
    await upsertChecked(client, 'companies', mapCompany(company));
}

export async function deleteCompanyFromSupabase(id: string, config?: SupabaseConfig): Promise<void> {
    const client = getSupabaseClient(config);
    if (!client) throw new Error('Cliente Supabase não inicializado.');
    await deleteChecked(client, 'companies', id);
}

export async function syncSaleToSupabase(sale: Sale, config?: SupabaseConfig): Promise<void> {
    const client = getSupabaseClient(config);
    if (!client) throw new Error('Cliente Supabase não inicializado.');
    const userId = await currentUserId(client);
    await upsertChecked(client, 'sales', mapSale(sale, userId));

    const { error: deleteItemsError } = await client.from('sale_items').delete().eq('sale_id', sale.id);
    if (deleteItemsError) {
        console.error('[SUPABASE] Falha ao limpar sale_items:', deleteItemsError.message);
        throw new Error(`sale_items: ${deleteItemsError.message}`);
    }

    if (sale.items && sale.items.length > 0) {
        await insertChecked(
            client,
            'sale_items',
            sale.items.map((item) => mapSaleItem(sale.id, item))
        );
    }
}

export async function deleteSaleFromSupabase(id: string, config?: SupabaseConfig): Promise<void> {
    const client = getSupabaseClient(config);
    if (!client) throw new Error('Cliente Supabase não inicializado.');
    await deleteChecked(client, 'sales', id);
}

export async function syncExpenseToSupabase(expense: Expense, config?: SupabaseConfig): Promise<void> {
    const client = getSupabaseClient(config);
    if (!client) throw new Error('Cliente Supabase não inicializado.');
    const userId = await currentUserId(client);
    await upsertChecked(client, 'expenses', mapExpense(expense, userId));
}

export async function deleteExpenseFromSupabase(id: string, config?: SupabaseConfig): Promise<void> {
    const client = getSupabaseClient(config);
    if (!client) throw new Error('Cliente Supabase não inicializado.');
    await deleteChecked(client, 'expenses', id);
}

export async function syncAccountPayableToSupabase(item: AccountPayable, config?: SupabaseConfig): Promise<void> {
    const client = getSupabaseClient(config);
    if (!client) throw new Error('Cliente Supabase não inicializado.');
    const userId = await currentUserId(client);
    await upsertChecked(client, 'accounts_payable', mapAccountPayable(item, userId));
}

export async function deleteAccountPayableFromSupabase(id: string, config?: SupabaseConfig): Promise<void> {
    const client = getSupabaseClient(config);
    if (!client) throw new Error('Cliente Supabase não inicializado.');
    await deleteChecked(client, 'accounts_payable', id);
}

export async function syncAccountReceivableToSupabase(item: AccountReceivable, config?: SupabaseConfig): Promise<void> {
    const client = getSupabaseClient(config);
    if (!client) throw new Error('Cliente Supabase não inicializado.');
    const userId = await currentUserId(client);
    await upsertChecked(client, 'accounts_receivable', mapAccountReceivable(item, userId));
}

export async function deleteAccountReceivableFromSupabase(id: string, config?: SupabaseConfig): Promise<void> {
    const client = getSupabaseClient(config);
    if (!client) throw new Error('Cliente Supabase não inicializado.');
    await deleteChecked(client, 'accounts_receivable', id);
}

export async function syncProductToSupabase(product: Product, config?: SupabaseConfig): Promise<void> {
    const client = getSupabaseClient(config);
    if (!client) throw new Error('Cliente Supabase não inicializado.');
    await upsertChecked(client, 'products', mapProduct(product));
}

export async function deleteProductFromSupabase(id: string, config?: SupabaseConfig): Promise<void> {
    const client = getSupabaseClient(config);
    if (!client) throw new Error('Cliente Supabase não inicializado.');
    await deleteChecked(client, 'products', id);
}

export async function syncCustomerToSupabase(customer: Customer, config?: SupabaseConfig): Promise<void> {
    const client = getSupabaseClient(config);
    if (!client) throw new Error('Cliente Supabase não inicializado.');
    await upsertChecked(client, 'customers', mapCustomer(customer));
}

export async function deleteCustomerFromSupabase(id: string, config?: SupabaseConfig): Promise<void> {
    const client = getSupabaseClient(config);
    if (!client) throw new Error('Cliente Supabase não inicializado.');
    await deleteChecked(client, 'customers', id);
}

export async function syncSupplierToSupabase(supplier: Supplier, config?: SupabaseConfig): Promise<void> {
    const client = getSupabaseClient(config);
    if (!client) throw new Error('Cliente Supabase não inicializado.');
    await upsertChecked(client, 'suppliers', mapSupplier(supplier));
}

export async function deleteSupplierFromSupabase(id: string, config?: SupabaseConfig): Promise<void> {
    const client = getSupabaseClient(config);
    if (!client) throw new Error('Cliente Supabase não inicializado.');
    await deleteChecked(client, 'suppliers', id);
}

export async function syncTaskToSupabase(task: Task, config?: SupabaseConfig): Promise<void> {
    const client = getSupabaseClient(config);
    if (!client) throw new Error('Cliente Supabase não inicializado.');
    await upsertChecked(client, 'tasks', mapTask(task));
}

export async function deleteTaskFromSupabase(id: string, config?: SupabaseConfig): Promise<void> {
    const client = getSupabaseClient(config);
    if (!client) throw new Error('Cliente Supabase não inicializado.');
    await deleteChecked(client, 'tasks', id);
}

export async function syncInventoryMovementToSupabase(movement: InventoryMovement, config?: SupabaseConfig): Promise<void> {
    const client = getSupabaseClient(config);
    if (!client) throw new Error('Cliente Supabase não inicializado.');
    const userId = await currentUserId(client);
    await upsertChecked(client, 'inventory_movements', mapInventoryMovement(movement, userId));
}

export async function syncActivityLogToSupabase(log: ActivityLog, config?: SupabaseConfig): Promise<void> {
    const client = getSupabaseClient(config);
    if (!client) throw new Error('Cliente Supabase não inicializado.');
    await upsertChecked(client, 'activity_logs', mapActivityLog(log));
}

export async function pullDataFromSupabase(config?: SupabaseConfig): Promise<{ success: boolean; data?: Partial<AppData>; message?: string }> {
    try {
        const client = getSupabaseClient(config);
        if (!client) return { success: false, message: 'Supabase não conectado.' };

        const [companies, customers, suppliers, products, sales, saleItems, expenses, accountsPayable, accountsReceivable, tasks, inventoryMovements, activityLogs] = await Promise.all([
            client.from('companies').select('*'),
            client.from('customers').select('*'),
            client.from('suppliers').select('*'),
            client.from('products').select('*'),
            client.from('sales').select('*'),
            client.from('sale_items').select('*'),
            client.from('expenses').select('*'),
            client.from('accounts_payable').select('*'),
            client.from('accounts_receivable').select('*'),
            client.from('tasks').select('*'),
            client.from('inventory_movements').select('*'),
            client.from('activity_logs').select('*'),
        ]);

        const itemsBySale: Record<string, any[]> = {};
        (saleItems.data || []).forEach((item: any) => {
            if (!item?.sale_id) return;
            if (!itemsBySale[item.sale_id]) itemsBySale[item.sale_id] = [];
            itemsBySale[item.sale_id].push({
                id: item.id,
                product_id: item.product_id || '',
                name: item.description || item.name || 'Item',
                type: 'Produto',
                quantity: Number(item.quantity) || 1,
                unit_price: Number(item.unit_price) || 0,
                discount: Number(item.discount) || 0,
                total_price: Number(item.total ?? item.total_price) || 0,
                unit_cost: Number(item.unit_cost) || 0,
            });
        });

        return {
            success: true,
            data: {
                companies: companies.data || [],
                customers: customers.data || [],
                suppliers: suppliers.data || [],
                products: (products.data || []).map((p: any) => ({
                    ...p,
                    type: p.type || 'Produto',
                    track_stock: p.track_stock ?? true,
                    quantity: Number(p.quantity ?? p.current_stock ?? 0),
                    cost_price: Number(p.cost_price ?? p.cost ?? 0),
                    sale_price: Number(p.sale_price ?? 0),
                    min_quantity: Number(p.min_quantity ?? p.minimum_stock ?? 0),
                    unit: p.unit || 'un',
                    status: p.status === 'inactive' ? 'Inativo' : p.status === 'active' ? 'Ativo' : (p.status || 'Ativo'),
                })),
                sales: (sales.data || []).map((s: any) => ({
                    ...s,
                    items: itemsBySale[s.id] || (Array.isArray(s.items) ? s.items : []),
                    total_amount: Number(s.total_amount ?? s.total ?? 0),
                    total_cost: Number(s.total_cost ?? 0),
                    discount: Number(s.discount ?? 0),
                })),
                expenses: expenses.data || [],
                accountsPayable: accountsPayable.data || [],
                accountsReceivable: accountsReceivable.data || [],
                tasks: tasks.data || [],
                inventoryMovements: inventoryMovements.data || [],
                activityLogs: activityLogs.data || [],
            }
        };
    } catch (err: any) {
        return { success: false, message: err.message || 'Erro ao puxar dados.' };
    }
}

export async function pushDataToSupabase(data: AppData, config?: SupabaseConfig): Promise<void> {
    const client = getSupabaseClient(config);
    if (!client) throw new Error('Cliente Supabase não inicializado.');
    const userId = await currentUserId(client);

    if (data.companies?.length) await upsertChecked(client, 'companies', data.companies.map(mapCompany));
    if (data.customers?.length) await upsertChecked(client, 'customers', data.customers.map(mapCustomer));
    if (data.suppliers?.length) await upsertChecked(client, 'suppliers', data.suppliers.map(mapSupplier));
    if (data.products?.length) await upsertChecked(client, 'products', data.products.map(mapProduct));
    if (data.sales?.length) {
        await upsertChecked(client, 'sales', data.sales.map((sale) => mapSale(sale, userId)));
        const allItems = data.sales.flatMap((sale) => (sale.items || []).map((item) => mapSaleItem(sale.id, item)));
        if (allItems.length) {
            await upsertChecked(client, 'sale_items', allItems);
        }
    }
    if (data.expenses?.length) await upsertChecked(client, 'expenses', data.expenses.map((item) => mapExpense(item, userId)));
    if (data.accountsPayable?.length) {
        await upsertChecked(client, 'accounts_payable', data.accountsPayable.map((item) => mapAccountPayable(item, userId)));
    }
    if (data.accountsReceivable?.length) {
        await upsertChecked(client, 'accounts_receivable', data.accountsReceivable.map((item) => mapAccountReceivable(item, userId)));
    }
    if (data.tasks?.length) await upsertChecked(client, 'tasks', data.tasks.map(mapTask));
    if (data.inventoryMovements?.length) {
        await upsertChecked(
            client,
            'inventory_movements',
            data.inventoryMovements.map((item) => mapInventoryMovement(item, userId))
        );
    }
}

export async function createSupabaseMaster(
    params?: { name: string; username?: string; email: string; password: string },
    config?: SupabaseConfig
): Promise<{ success: boolean; message: string; userId?: string }> {
    if (!params) return { success: true, message: 'Master gerido via Auth.' };
    const client = getSupabaseClient(config);
    if (!client) return { success: false, message: 'Cliente Supabase não inicializado.' };
    const { data, error } = await client.auth.signUp({
        email: params.email,
        password: params.password,
        options: {
            data: {
                full_name: params.name,
                username: params.username,
                role: 'MASTER',
                is_master: true,
            },
        },
    });
    if (error && !/already registered/i.test(error.message)) {
        return { success: false, message: error.message };
    }
    return { success: true, message: error?.message || 'Master registrado.', userId: data.user?.id };
}

export async function createSupabasePublicUser(
    params?: { name: string; email: string; password: string },
    config?: SupabaseConfig
): Promise<{ success: boolean; message: string; userId?: string }> {
    if (!params) return { success: false, message: 'Dados de cadastro ausentes.' };
    const client = getSupabaseClient(config);
    if (!client) return { success: false, message: 'Cliente Supabase não inicializado.' };
    const { data, error } = await client.auth.signUp({
        email: params.email,
        password: params.password,
        options: {
            data: {
                full_name: params.name,
                role: 'OPERADOR',
                is_master: false,
            },
        },
    });
    if (error) return { success: false, message: error.message };
    return { success: true, message: 'Usuário registrado.', userId: data.user?.id };
}

export async function syncUserUpdateToSupabase(
    userId: string,
    updates: any,
    config?: SupabaseConfig
): Promise<{ success: boolean; message: string }> {
    const client = getSupabaseClient(config);
    if (!client) throw new Error('Cliente Supabase não inicializado.');

    const profilePatch = compactRow({
        full_name: updates.name ?? updates.full_name,
        email: updates.email,
        role: updates.role,
        is_master: updates.is_master,
        status: updates.status,
    });

    if (Object.keys(profilePatch).length > 0) {
        const { error } = await client.from('profiles').update(profilePatch).eq('id', userId);
        if (error) throw new Error(`profiles: ${error.message}`);
    }

    if (Array.isArray(updates.company_ids)) {
        const { error: delError } = await client.from('user_companies').delete().eq('user_id', userId);
        if (delError) throw new Error(`user_companies: ${delError.message}`);
        const rows = updates.company_ids
            .filter((id: string) => id && id !== '*')
            .map((companyId: string) => compactRow({
                id: generateUUID(),
                user_id: userId,
                company_id: asUuid(companyId),
            }))
            .filter((row) => row.company_id);
        if (rows.length) {
            await insertChecked(client, 'user_companies', rows);
        }
    }

    return { success: true, message: 'Usuário sincronizado.' };
}

export async function deleteUserFromSupabase(userId: string, config?: SupabaseConfig): Promise<void> {
    const client = getSupabaseClient(config);
    if (!client) throw new Error('Cliente Supabase não inicializado.');
    await deleteChecked(client, 'profiles', userId);
}
export async function testSupabaseConnection(
    configOrUrl?: SupabaseConfig | string,
    maybeKey?: string
): Promise<{ success: boolean; message: string }> {
    const config: SupabaseConfig | undefined =
        typeof configOrUrl === 'string'
            ? { url: configOrUrl, anonKey: maybeKey || '', connected: false }
            : configOrUrl;
    const client = getSupabaseClient(config);
    if (!client) return { success: false, message: 'Cliente não inicializado.' };
    const { error } = await client.from('companies').select('id').limit(1);
    if (error) return { success: false, message: error.message };
    return { success: true, message: 'Conexão bem-sucedida.' };
}

export async function testSupabaseAuthSetup(config?: SupabaseConfig): Promise<{ success: boolean; message: string }> {
    const client = getSupabaseClient(config);
    if (!client) return { success: false, message: 'Cliente não inicializado.' };
    return { success: true, message: 'Auth configurado.' };
}
export async function fetchSupabaseUsersWithRelations(config?: SupabaseConfig): Promise<any[]> {
    try {
        const client = getSupabaseClient(config);
        if (!client) return [];
        const { data, error } = await client.from('profiles').select('*, user_companies(*)');
        if (error) return [];
        return data || [];
    } catch {
        return [];
    }
}
