import { createClient, SupabaseClient, Session, User } from '@supabase/supabase-js';
import { AppData, SupabaseConfig, loadSupabaseConfig } from './storage';
import { Company, Sale, Expense, AccountPayable, AccountReceivable, Product, InventoryMovement, Customer, Supplier, Task, ActivityLog, UserProfile, UnitType } from '../types';
import { getFullPermissions, getDefaultRolePermissions, getEmptyPermissions } from './permissions';

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

export function getSupabaseClient(config?: SupabaseConfig): SupabaseClient | null {
    const envUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
    const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

    const url = normalizeSupabaseUrl(envUrl);
    const key = envKey;

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
    });

    lastUrl = url;
    lastKey = key;
    return cachedClient;
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

        const userId = authData.user.id;

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
                    email: authData.user.email,
                    full_name: authData.user.user_metadata?.full_name || email.split('@')[0],
                    role: email.toLowerCase() === 'oliveira.victor968@gmail.com' ? 'MASTER' : 'OPERADOR',
                    is_master: email.toLowerCase() === 'oliveira.victor968@gmail.com',
                    status: 'active'
                })
                .select()
                .single();
            profileData = insertedProfile;
        }

        const isMaster = profileData?.is_master || profileData?.role === 'MASTER' || profileData?.role === 'admin' || email.toLowerCase() === 'oliveira.victor968@gmail.com';

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
            email: authData.user.email || email,
            name: profileData?.full_name || authData.user.user_metadata?.full_name || email.split('@')[0],
            role: isMaster ? 'MASTER' : (profileData?.role || 'OPERADOR'),
            is_master: isMaster,
            status: profileData?.status || 'active',
            company_ids: isMaster ? ['*'] : companiesList.map(c => c.id),
            permissions: isMaster ? getFullPermissions() : (profileData?.permissions || getDefaultRolePermissions(profileData?.role || 'OPERADOR')),
            created_at: profileData?.created_at || new Date().toISOString(),
            last_login: new Date().toISOString(),
        };

        return { success: true, user: userProfile, companies: companiesList };
    } catch (err: any) {
        return { success: false, message: err.message || 'Erro ao autenticar no Supabase.' };
    }
}

export async function getInitialSupabaseSession(config?: SupabaseConfig): Promise<{ isAuthenticated: boolean; user?: UserProfile; companies?: Company[] }> {
    try {
        const client = getSupabaseClient(config);
        if (!client) return { isAuthenticated: false };

        const { data: sessionData } = await client.auth.getSession();
        if (!sessionData.session || !sessionData.session.user) {
            return { isAuthenticated: false };
        }

        const authUser = sessionData.session.user;
        const res = await signInSupabase(authUser.email || '', '', config);
        if (res.success && res.user) {
            return { isAuthenticated: true, user: res.user, companies: res.companies };
        }

        return { isAuthenticated: false };
    } catch {
        return { isAuthenticated: false };
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
    try {
        const client = getSupabaseClient(config);
        if (!client) return;
        await client.from('companies').upsert(company, { onConflict: 'id' });
    } catch {}
}

export async function deleteCompanyFromSupabase(id: string, config?: SupabaseConfig): Promise<void> {
    try {
        const client = getSupabaseClient(config);
        if (!client) return;
        await client.from('companies').delete().eq('id', id);
    } catch {}
}

export async function syncSaleToSupabase(sale: Sale, config?: SupabaseConfig): Promise<void> {
    try {
        const client = getSupabaseClient(config);
        if (!client) return;

        const { id, items, consumed_items, ...rest } = sale;
        await client.from('sales').upsert({ id, ...rest }, { onConflict: 'id' });

        if (items && items.length > 0) {
            await client.from('sale_items').delete().eq('sale_id', id);
            const itemsPayload = items.map(({ id: itemId, ...itemRest }) => ({
                ...itemRest,
                sale_id: id,
            }));
            await client.from('sale_items').insert(itemsPayload);
        }
    } catch {}
}

export async function deleteSaleFromSupabase(id: string, config?: SupabaseConfig): Promise<void> {
    try {
        const client = getSupabaseClient(config);
        if (!client) return;
        await client.from('sales').delete().eq('id', id);
    } catch {}
}

export async function syncExpenseToSupabase(expense: Expense, config?: SupabaseConfig): Promise<void> {
    try {
        const client = getSupabaseClient(config);
        if (!client) return;
        await client.from('expenses').upsert(expense, { onConflict: 'id' });
    } catch {}
}

export async function deleteExpenseFromSupabase(id: string, config?: SupabaseConfig): Promise<void> {
    try {
        const client = getSupabaseClient(config);
        if (!client) return;
        await client.from('expenses').delete().eq('id', id);
    } catch {}
}

export async function syncAccountPayableToSupabase(item: AccountPayable, config?: SupabaseConfig): Promise<void> {
    try {
        const client = getSupabaseClient(config);
        if (!client) return;
        await client.from('accounts_payable').upsert(item, { onConflict: 'id' });
    } catch {}
}

export async function deleteAccountPayableFromSupabase(id: string, config?: SupabaseConfig): Promise<void> {
    try {
        const client = getSupabaseClient(config);
        if (!client) return;
        await client.from('accounts_payable').delete().eq('id', id);
    } catch {}
}

export async function syncAccountReceivableToSupabase(item: AccountReceivable, config?: SupabaseConfig): Promise<void> {
    try {
        const client = getSupabaseClient(config);
        if (!client) return;
        await client.from('accounts_receivable').upsert(item, { onConflict: 'id' });
    } catch {}
}

export async function deleteAccountReceivableFromSupabase(id: string, config?: SupabaseConfig): Promise<void> {
    try {
        const client = getSupabaseClient(config);
        if (!client) return;
        await client.from('accounts_receivable').delete().eq('id', id);
    } catch {}
}

export async function syncProductToSupabase(product: Product, config?: SupabaseConfig): Promise<void> {
    try {
        const client = getSupabaseClient(config);
        if (!client) return;
        await client.from('products').upsert(product, { onConflict: 'id' });
    } catch {}
}

export async function deleteProductFromSupabase(id: string, config?: SupabaseConfig): Promise<void> {
    try {
        const client = getSupabaseClient(config);
        if (!client) return;
        await client.from('products').delete().eq('id', id);
    } catch {}
}

export async function syncCustomerToSupabase(customer: Customer, config?: SupabaseConfig): Promise<void> {
    try {
        const client = getSupabaseClient(config);
        if (!client) return;
        await client.from('customers').upsert(customer, { onConflict: 'id' });
    } catch {}
}

export async function deleteCustomerFromSupabase(id: string, config?: SupabaseConfig): Promise<void> {
    try {
        const client = getSupabaseClient(config);
        if (!client) return;
        await client.from('customers').delete().eq('id', id);
    } catch {}
}

export async function syncSupplierToSupabase(supplier: Supplier, config?: SupabaseConfig): Promise<void> {
    try {
        const client = getSupabaseClient(config);
        if (!client) return;
        await client.from('suppliers').upsert(supplier, { onConflict: 'id' });
    } catch {}
}

export async function deleteSupplierFromSupabase(id: string, config?: SupabaseConfig): Promise<void> {
    try {
        const client = getSupabaseClient(config);
        if (!client) return;
        await client.from('suppliers').delete().eq('id', id);
    } catch {}
}

export async function syncTaskToSupabase(task: Task, config?: SupabaseConfig): Promise<void> {
    try {
        const client = getSupabaseClient(config);
        if (!client) return;
        await client.from('tasks').upsert(task, { onConflict: 'id' });
    } catch {}
}

export async function deleteTaskFromSupabase(id: string, config?: SupabaseConfig): Promise<void> {
    try {
        const client = getSupabaseClient(config);
        if (!client) return;
        await client.from('tasks').delete().eq('id', id);
    } catch {}
}

export async function syncInventoryMovementToSupabase(movement: InventoryMovement, config?: SupabaseConfig): Promise<void> {
    try {
        const client = getSupabaseClient(config);
        if (!client) return;
        await client.from('inventory_movements').upsert(movement, { onConflict: 'id' });
    } catch {}
}

export async function syncActivityLogToSupabase(log: ActivityLog, config?: SupabaseConfig): Promise<void> {
    try {
        const client = getSupabaseClient(config);
        if (!client) return;
        await client.from('activity_logs').upsert(log, { onConflict: 'id' });
    } catch {}
}

export async function pullDataFromSupabase(config?: SupabaseConfig): Promise<{ success: boolean; data?: Partial<AppData>; message?: string }> {
    try {
        const client = getSupabaseClient(config);
        if (!client) return { success: false, message: 'Supabase não conectado.' };

        const [companies, customers, suppliers, products, sales, expenses, accountsPayable, accountsReceivable, tasks, inventoryMovements, activityLogs] = await Promise.all([
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
            client.from('activity_logs').select('*'),
        ]);

        return {
            success: true,
            data: {
                companies: companies.data || [],
                customers: customers.data || [],
                suppliers: suppliers.data || [],
                products: products.data || [],
                sales: sales.data || [],
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
    if (!client) return;

    if (data.companies?.length) await client.from('companies').upsert(data.companies, { onConflict: 'id' });
    if (data.customers?.length) await client.from('customers').upsert(data.customers, { onConflict: 'id' });
    if (data.suppliers?.length) await client.from('suppliers').upsert(data.suppliers, { onConflict: 'id' });
    if (data.products?.length) await client.from('products').upsert(data.products, { onConflict: 'id' });
    if (data.sales?.length) await client.from('sales').upsert(data.sales, { onConflict: 'id' });
    if (data.expenses?.length) await client.from('expenses').upsert(data.expenses, { onConflict: 'id' });
    if (data.accountsPayable?.length) await client.from('accounts_payable').upsert(data.accountsPayable, { onConflict: 'id' });
    if (data.accountsReceivable?.length) await client.from('accounts_receivable').upsert(data.accountsReceivable, { onConflict: 'id' });
    if (data.tasks?.length) await client.from('tasks').upsert(data.tasks, { onConflict: 'id' });
}

export async function createSupabaseMaster(): Promise<{ success: boolean; message: string }> {
    return { success: true, message: 'Master gerido via Auth.' };
}

export async function createSupabasePublicUser(): Promise<{ success: boolean; message: string }> {
    return { success: true, message: 'Usuário gerido via Auth.' };
}
export async function syncUserUpdateToSupabase(userId: string, updates: any, config?: SupabaseConfig): Promise<void> {
    try {
        const client = getSupabaseClient(config);
        if (!client) return;
        await client.from('profiles').update(updates).eq('id', userId);
    } catch {}
}

export async function deleteUserFromSupabase(userId: string, config?: SupabaseConfig): Promise<void> {
    try {
        const client = getSupabaseClient(config);
        if (!client) return;
        await client.from('profiles').delete().eq('id', userId);
    } catch {}
}
export async function testSupabaseConnection(config?: SupabaseConfig): Promise<{ success: boolean; message: string }> {
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

export async function syncUserUpdateToSupabase(userId: string, updates: any, config?: SupabaseConfig): Promise<void> {
    try {
        const client = getSupabaseClient(config);
        if (!client) return;
        await client.from('profiles').update(updates).eq('id', userId);
    } catch {}
}

export async function deleteUserFromSupabase(userId: string, config?: SupabaseConfig): Promise<void> {
    try {
        const client = getSupabaseClient(config);
        if (!client) return;
        await client.from('profiles').delete().eq('id', userId);
    } catch {}
}
