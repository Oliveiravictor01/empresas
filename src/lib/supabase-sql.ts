export const SUPABASE_SQL_SCHEMA = `-- ========================================================================
-- OMNIGESTÃO MULTIEMPRESAS - ARQUITETURA POSTGRESQL DEFINITIVA
-- ESTRUTURA COMPLETA DE BANCO, MULTI-TENANCY, RLS, TRIGGERS E REALTIME
-- ========================================================================

-- 1. HABILITAR EXTENSÃO UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABELA DE PERFIS DE USUÁRIOS (Profiles)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  username TEXT UNIQUE,
  registration_number TEXT,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('MASTER', 'GERENTE', 'OPERADOR', 'admin', 'manager', 'employee', 'user')) DEFAULT 'OPERADOR',
  is_master BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL CHECK (status IN ('active', 'inactive', 'pending')) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(LOWER(username));
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- 3. TABELA DE EMPRESAS (Companies)
CREATE TABLE IF NOT EXISTS public.companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  trade_name TEXT,
  legal_name TEXT,
  cnpj TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  category TEXT DEFAULT 'Geral',
  color TEXT DEFAULT '#4f46e5',
  logo_url TEXT,
  status TEXT NOT NULL CHECK (status IN ('active', 'inactive')) DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_companies_cnpj ON public.companies(cnpj);
CREATE INDEX IF NOT EXISTS idx_companies_status ON public.companies(status);

-- 4. TABELA DE RELACIONAMENTO USUÁRIO × EMPRESA (Multiempresa / User_Companies)
CREATE TABLE IF NOT EXISTS public.user_companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_user_company UNIQUE (user_id, company_id)
);

CREATE INDEX IF NOT EXISTS idx_user_companies_user ON public.user_companies(user_id);
CREATE INDEX IF NOT EXISTS idx_user_companies_company ON public.user_companies(company_id);

-- 5. TABELA DE PERMISSÕES GRANULARES POR MÓDULO (CRUD / User_Permissions)
CREATE TABLE IF NOT EXISTS public.user_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  module TEXT NOT NULL,
  can_view BOOLEAN NOT NULL DEFAULT false,
  can_create BOOLEAN NOT NULL DEFAULT false,
  can_edit BOOLEAN NOT NULL DEFAULT false,
  can_delete BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_user_module UNIQUE (user_id, module)
);

CREATE INDEX IF NOT EXISTS idx_user_permissions_user ON public.user_permissions(user_id);

-- 6. TABELA DE LOGS DE AUDITORIA (Activity_Logs / Audit_Logs)
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  user_name TEXT NOT NULL,
  user_email TEXT NOT NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  module TEXT NOT NULL,
  entity TEXT,
  action TEXT NOT NULL,
  description TEXT NOT NULL,
  record_id TEXT,
  entity_id TEXT,
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_company ON public.activity_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON public.activity_logs(created_at DESC);

-- 7. TABELA DE CLIENTES (Customers)
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  cpf_cnpj TEXT,
  document TEXT,
  phone TEXT,
  whatsapp TEXT,
  email TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  status TEXT DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customers_company ON public.customers(company_id);
CREATE INDEX IF NOT EXISTS idx_customers_cpf_cnpj ON public.customers(cpf_cnpj);

-- 8. TABELA DE FORNECEDORES (Suppliers)
CREATE TABLE IF NOT EXISTS public.suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  cnpj_cpf TEXT,
  document TEXT,
  phone TEXT,
  whatsapp TEXT,
  email TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  category TEXT DEFAULT 'Geral',
  status TEXT DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_suppliers_company ON public.suppliers(company_id);

-- 9. TABELA DE PRODUTOS / ESTOQUE (Products)
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sku TEXT,
  code TEXT,
  category TEXT DEFAULT 'Geral',
  unit TEXT DEFAULT 'un',
  cost_price NUMERIC(14, 4) NOT NULL DEFAULT 0.0000,
  cost NUMERIC(14, 4) DEFAULT 0.0000,
  sale_price NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  quantity NUMERIC(14, 4) NOT NULL DEFAULT 0,
  current_stock NUMERIC(14, 4) DEFAULT 0,
  min_quantity NUMERIC(14, 4) NOT NULL DEFAULT 5,
  minimum_stock NUMERIC(14, 4) DEFAULT 5,
  max_quantity NUMERIC(14, 4),
  track_stock BOOLEAN DEFAULT true,
  status TEXT NOT NULL CHECK (status IN ('Ativo', 'Inativo', 'active', 'inactive')) DEFAULT 'Ativo',
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  supplier_name TEXT,
  location TEXT,
  composition JSONB DEFAULT '[]'::JSONB,
  notes TEXT,
  last_entry_date DATE,
  last_movement_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_company ON public.products(company_id);
CREATE INDEX IF NOT EXISTS idx_products_sku ON public.products(sku);

-- 10. TABELA DE MOVIMENTAÇÕES DE ESTOQUE (Inventory_Movements)
CREATE TABLE IF NOT EXISTS public.inventory_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('entrada', 'saida', 'ajuste', 'ENTRY', 'EXIT', 'ADJUSTMENT')),
  quantity NUMERIC(14, 4) NOT NULL,
  unit TEXT DEFAULT 'un',
  previous_quantity NUMERIC(14, 4) NOT NULL DEFAULT 0,
  new_quantity NUMERIC(14, 4) NOT NULL DEFAULT 0,
  unit_cost NUMERIC(14, 4),
  total_cost NUMERIC(14, 4),
  reason TEXT NOT NULL,
  reference_type TEXT,
  reference_id TEXT,
  date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_movements_company ON public.inventory_movements(company_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_product ON public.inventory_movements(product_id);

-- 11. TABELA DE VENDAS (Sales)
CREATE TABLE IF NOT EXISTS public.sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  product_service TEXT,
  service_id UUID,
  items JSONB DEFAULT '[]'::JSONB,
  discount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total NUMERIC(12, 2) DEFAULT 0,
  total_cost NUMERIC(12, 2) DEFAULT 0,
  gross_margin NUMERIC(12, 2) DEFAULT 0,
  supplies_cost NUMERIC(12, 2) DEFAULT 0,
  consumed_items JSONB DEFAULT '[]'::JSONB,
  payment_method TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('Pago', 'Concluída', 'Pendente', 'Cancelada', 'concluida', 'pendente', 'cancelada')) DEFAULT 'Concluída',
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  sale_date DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  auto_stock_deducted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sales_company ON public.sales(company_id);
CREATE INDEX IF NOT EXISTS idx_sales_customer ON public.sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_date ON public.sales(date);

-- 11.1. TABELA RELACIONAL DE ITENS DA VENDA (Sale_Items)
CREATE TABLE IF NOT EXISTS public.sale_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  quantity NUMERIC(14, 4) NOT NULL DEFAULT 1,
  unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  unit_cost NUMERIC(12, 2) DEFAULT 0,
  discount NUMERIC(12, 2) DEFAULT 0,
  total NUMERIC(12, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON public.sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product ON public.sale_items(product_id);

-- 12. TABELA DE DESPESAS (Expenses)
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  supplier_name TEXT,
  amount NUMERIC(12, 2) NOT NULL,
  payment_method TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  expense_date DATE DEFAULT CURRENT_DATE,
  due_date DATE,
  status TEXT NOT NULL CHECK (status IN ('Pago', 'Pendente', 'Agendado', 'pago', 'pendente', 'agendado')) DEFAULT 'Pago',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expenses_company ON public.expenses(company_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(date);

-- 13. TABELA DE CONTAS A PAGAR (Accounts_Payable)
CREATE TABLE IF NOT EXISTS public.accounts_payable (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  supplier_name TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  due_date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('Pendente', 'Pago', 'Vencido', 'pendente', 'pago', 'vencido')) DEFAULT 'Pendente',
  paid_date DATE,
  paid_at DATE,
  payment_method TEXT,
  category TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_accounts_payable_company ON public.accounts_payable(company_id);
CREATE INDEX IF NOT EXISTS idx_accounts_payable_due_date ON public.accounts_payable(due_date);

-- 14. TABELA DE CONTAS A RECEBER (Accounts_Receivable)
CREATE TABLE IF NOT EXISTS public.accounts_receivable (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  due_date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('Pendente', 'Recebido', 'Atrasado', 'pendente', 'recebido', 'atrasado')) DEFAULT 'Pendente',
  received_date DATE,
  received_at DATE,
  payment_method TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_accounts_receivable_company ON public.accounts_receivable(company_id);
CREATE INDEX IF NOT EXISTS idx_accounts_receivable_due_date ON public.accounts_receivable(due_date);

-- 15. TABELA DE TAREFAS (Tasks)
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  assigned_to TEXT,
  due_date DATE NOT NULL,
  priority TEXT NOT NULL CHECK (priority IN ('Baixa', 'Média', 'Alta', 'Urgente')) DEFAULT 'Média',
  status TEXT NOT NULL CHECK (status IN ('Pendente', 'Em andamento', 'Em Andamento', 'Concluída')) DEFAULT 'Pendente',
  notes TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================================================
-- FUNÇÕES DE SEGURANÇA E VALIDAÇÃO (SECURITY DEFINER)
-- ========================================================================

-- Verifica se o usuário atual é Master/Admin (Multi-Master Suportado)
CREATE OR REPLACE FUNCTION public.is_master()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
      AND (UPPER(role) = 'MASTER' OR role = 'admin' OR is_master = true OR LOWER(email) = 'oliveira.victor968@gmail.com')
      AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Proteção de Segurança: Impede que usuários não-Master alterem papéis, status ou permissões
CREATE OR REPLACE FUNCTION public.protect_profile_security()
RETURNS trigger AS $$
BEGIN
  IF (NEW.role IS DISTINCT FROM OLD.role) OR (NEW.is_master IS DISTINCT FROM OLD.is_master) OR (NEW.status IS DISTINCT FROM OLD.status) THEN
    IF NOT public.is_master() THEN
      RAISE EXCEPTION 'Ação negada: Apenas um Administrador Master pode alterar papéis, permissões ou status de usuários.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_protect_profile_security ON public.profiles;
CREATE TRIGGER trg_protect_profile_security
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_security();

-- Verifica se o usuário tem vínculo com a empresa específica (ou é Master)
CREATE OR REPLACE FUNCTION public.has_company_access(check_company_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  IF public.is_master() THEN
    RETURN TRUE;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.user_companies uc
    JOIN public.profiles p ON p.id = uc.user_id
    WHERE uc.user_id = auth.uid() 
      AND uc.company_id = check_company_id
      AND p.status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verifica se o usuário tem permissão para o módulo e ação específicos
CREATE OR REPLACE FUNCTION public.has_module_access(mod_name TEXT, act_name TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  perm_view BOOLEAN;
  perm_create BOOLEAN;
  perm_edit BOOLEAN;
  perm_delete BOOLEAN;
  v_role TEXT;
BEGIN
  IF public.is_master() THEN
    RETURN TRUE;
  END IF;

  SELECT can_view, can_create, can_edit, can_delete 
  INTO perm_view, perm_create, perm_edit, perm_delete
  FROM public.user_permissions up
  JOIN public.profiles p ON p.id = up.user_id
  WHERE up.user_id = auth.uid() 
    AND up.module = mod_name
    AND p.status = 'active';

  IF FOUND THEN
    CASE act_name
      WHEN 'view' THEN RETURN COALESCE(perm_view, false);
      WHEN 'create' THEN RETURN COALESCE(perm_create, false);
      WHEN 'edit' THEN RETURN COALESCE(perm_edit, false);
      WHEN 'delete' THEN RETURN COALESCE(perm_delete, false);
      ELSE RETURN FALSE;
    END CASE;
  END IF;

  -- Sem linha na matriz: usa o padrão do papel (OPERADOR vê catálogo/produtos)
  SELECT UPPER(role) INTO v_role
  FROM public.profiles
  WHERE id = auth.uid() AND status = 'active';

  IF v_role IS NULL THEN
    RETURN FALSE;
  END IF;

  IF v_role IN ('MASTER', 'ADMIN') THEN
    RETURN TRUE;
  END IF;

  IF v_role IN ('GERENTE', 'MANAGER') THEN
    IF mod_name IN ('users', 'settings') THEN
      RETURN FALSE;
    END IF;
    IF mod_name = 'activity_logs' THEN
      RETURN act_name = 'view';
    END IF;
    IF mod_name = 'companies' THEN
      RETURN act_name IN ('view', 'edit');
    END IF;
    RETURN TRUE;
  END IF;

  -- OPERADOR / EMPLOYEE
  IF mod_name IN ('sales', 'inventory', 'customers', 'tasks') THEN
    RETURN act_name IN ('view', 'create');
  END IF;
  IF mod_name IN ('products', 'suppliers', 'dashboard') THEN
    RETURN act_name = 'view';
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================================================
-- POLÍTICAS ROW LEVEL SECURITY (RLS)
-- ========================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts_payable ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts_receivable ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- 1. Profiles RLS
CREATE POLICY "Master gerencia todos os perfis" ON public.profiles
  FOR ALL USING (public.is_master());

CREATE POLICY "Usuário consulta seu próprio perfil" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- 2. Companies RLS
CREATE POLICY "Master tem acesso irrestrito a empresas" ON public.companies
  FOR ALL USING (public.is_master());

CREATE POLICY "Usuário acessa apenas empresas vinculadas" ON public.companies
  FOR SELECT USING (public.has_company_access(id));

-- 3. User_Companies RLS
CREATE POLICY "Master gerencia vínculos de empresas" ON public.user_companies
  FOR ALL USING (public.is_master());

CREATE POLICY "Usuário consulta seus próprios vínculos de empresa" ON public.user_companies
  FOR SELECT USING (user_id = auth.uid());

-- 4. User_Permissions RLS
CREATE POLICY "Master gerencia matriz de permissões" ON public.user_permissions
  FOR ALL USING (public.is_master());

CREATE POLICY "Usuário consulta suas próprias permissões" ON public.user_permissions
  FOR SELECT USING (user_id = auth.uid());

-- 5. Activity_Logs RLS
CREATE POLICY "Master e autorizados visualizam logs de auditoria" ON public.activity_logs
  FOR SELECT USING (public.is_master() OR public.has_module_access('activity_logs', 'view'));

CREATE POLICY "Sistema e usuários autenticados registram logs" ON public.activity_logs
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 6. Sales RLS
CREATE POLICY "Consulta de vendas autorizadas por empresa" ON public.sales
  FOR SELECT USING (public.has_company_access(company_id) AND public.has_module_access('sales', 'view'));

CREATE POLICY "Criação de vendas na empresa autorizada" ON public.sales
  FOR INSERT WITH CHECK (public.has_company_access(company_id) AND public.has_module_access('sales', 'create'));

CREATE POLICY "Edição de vendas na empresa autorizada" ON public.sales
  FOR UPDATE USING (public.has_company_access(company_id) AND public.has_module_access('sales', 'edit'));

CREATE POLICY "Exclusão de vendas na empresa autorizada" ON public.sales
  FOR DELETE USING (public.has_company_access(company_id) AND public.has_module_access('sales', 'delete'));

-- 6.1 Sale_Items RLS
CREATE POLICY "Acesso aos itens de venda autorizados" ON public.sale_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.sales s 
      WHERE s.id = sale_items.sale_id 
        AND public.has_company_access(s.company_id)
    )
  );

-- 7. Products & Inventory RLS
CREATE POLICY "Consulta de produtos por empresa" ON public.products
  FOR SELECT USING (public.has_company_access(company_id) AND public.has_module_access('products', 'view'));

CREATE POLICY "Criação de produtos por empresa" ON public.products
  FOR INSERT WITH CHECK (public.has_company_access(company_id) AND public.has_module_access('products', 'create'));

CREATE POLICY "Edição de produtos por empresa" ON public.products
  FOR UPDATE USING (public.has_company_access(company_id) AND public.has_module_access('products', 'edit'));

CREATE POLICY "Exclusão de produtos por empresa" ON public.products
  FOR DELETE USING (public.has_company_access(company_id) AND public.has_module_access('products', 'delete'));

-- 8. Inventory Movements RLS
CREATE POLICY "Acesso a movimentações de estoque por empresa" ON public.inventory_movements
  FOR ALL USING (public.has_company_access(company_id) AND public.has_module_access('inventory', 'view'));

-- 9. Expenses RLS
CREATE POLICY "Consulta de despesas por empresa" ON public.expenses
  FOR SELECT USING (public.has_company_access(company_id) AND public.has_module_access('expenses', 'view'));

CREATE POLICY "Criação de despesas por empresa" ON public.expenses
  FOR INSERT WITH CHECK (public.has_company_access(company_id) AND public.has_module_access('expenses', 'create'));

CREATE POLICY "Edição de despesas por empresa" ON public.expenses
  FOR UPDATE USING (public.has_company_access(company_id) AND public.has_module_access('expenses', 'edit'));

CREATE POLICY "Exclusão de despesas por empresa" ON public.expenses
  FOR DELETE USING (public.has_company_access(company_id) AND public.has_module_access('expenses', 'delete'));

-- 10. Accounts Payable & Receivable RLS
CREATE POLICY "Acesso a contas a pagar por empresa" ON public.accounts_payable
  FOR ALL USING (public.has_company_access(company_id) AND public.has_module_access('accounts_payable', 'view'));

CREATE POLICY "Acesso a contas a receber por empresa" ON public.accounts_receivable
  FOR ALL USING (public.has_company_access(company_id) AND public.has_module_access('accounts_receivable', 'view'));

-- 11. Customers & Suppliers RLS
CREATE POLICY "Acesso a clientes por empresa" ON public.customers
  FOR ALL USING (public.has_company_access(company_id) AND public.has_module_access('customers', 'view'));

CREATE POLICY "Acesso a fornecedores por empresa" ON public.suppliers
  FOR ALL USING (public.has_company_access(company_id) AND public.has_module_access('suppliers', 'view'));

-- 12. Tasks RLS
CREATE POLICY "Acesso a tarefas autorizadas" ON public.tasks
  FOR ALL USING (
    company_id = 'all' 
    OR (company_id ~ '^[0-9a-fA-F-]{36}$' AND public.has_company_access(company_id::UUID))
  );

-- ========================================================================
-- PROVEDOR DE AUTENTICAÇÃO (Email/Password) & TRIGGER AUTOMÁTICO DE PERFIL
-- ========================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_role TEXT;
  v_is_master BOOLEAN;
  v_status TEXT;
  v_full_name TEXT;
  v_username TEXT;
BEGIN
  -- Nunca confiar em raw_user_meta_data para papel MASTER (signup público).
  v_role := 'OPERADOR';
  v_is_master := false;
  v_status := 'pending';

  IF LOWER(new.email) = 'oliveira.victor968@gmail.com' THEN
    v_role := 'MASTER';
    v_is_master := true;
    v_status := 'active';
  END IF;

  v_full_name := COALESCE(
    new.raw_user_meta_data->>'full_name',
    split_part(new.email, '@', 1)
  );

  v_username := COALESCE(
    new.raw_user_meta_data->>'username',
    split_part(new.email, '@', 1)
  );

  INSERT INTO public.profiles (id, user_id, email, username, full_name, role, is_master, status, created_at, updated_at)
  VALUES (
    new.id,
    new.id,
    new.email,
    v_username,
    v_full_name,
    v_role,
    v_is_master,
    v_status,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    email = EXCLUDED.email,
    username = COALESCE(profiles.username, EXCLUDED.username),
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    updated_at = NOW();

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ========================================================================
-- ATIVAÇÃO DO SUPABASE REALTIME PARA SINCRONIZAÇÃO AUTOMÁTICA
-- ========================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END $$;

ALTER PUBLICATION supabase_realtime ADD TABLE public.companies;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_companies;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_permissions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.customers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.suppliers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory_movements;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sales;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sale_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.expenses;
ALTER PUBLICATION supabase_realtime ADD TABLE public.accounts_payable;
ALTER PUBLICATION supabase_realtime ADD TABLE public.accounts_receivable;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_logs;
`;

export const SUPABASE_SCHEMA_SQL = SUPABASE_SQL_SCHEMA;

