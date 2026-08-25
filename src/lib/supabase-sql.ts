export const SUPABASE_SQL_SCHEMA = `-- ========================================================================
-- OMNIGESTÃO MULTIEMPRESAS - ARQUITETURA DE USUÁRIOS, PERMISSÕES, RLS E AUDITORIA
-- ========================================================================

-- 1. HABILITAR EXTENSÃO UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABELA DE PERFIS DE USUÁRIOS (Profiles)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
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

-- 3. TABELA DE EMPRESAS
CREATE TABLE IF NOT EXISTS public.companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  trade_name TEXT,
  cnpj TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  category TEXT DEFAULT 'Geral',
  color TEXT DEFAULT '#4f46e5',
  logo_url TEXT,
  status TEXT NOT NULL CHECK (status IN ('active', 'inactive')) DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABELA DE RELACIONAMENTO USUÁRIO × EMPRESA (Multiempresa)
CREATE TABLE IF NOT EXISTS public.user_companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_user_company UNIQUE (user_id, company_id)
);

-- 5. TABELA DE PERMISSÕES GRANULARES POR MÓDULO (CRUD)
CREATE TABLE IF NOT EXISTS public.user_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  module TEXT NOT NULL, -- 'dashboard', 'sales', 'inventory', 'products', 'customers', 'suppliers', 'expenses', 'accounts_payable', 'accounts_receivable', 'reports', 'tasks', 'users', 'activity_logs', 'settings'
  can_view BOOLEAN NOT NULL DEFAULT false,
  can_create BOOLEAN NOT NULL DEFAULT false,
  can_edit BOOLEAN NOT NULL DEFAULT false,
  can_delete BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_user_module UNIQUE (user_id, module)
);

-- 6. TABELA DE LOGS DE AUDITORIA & HISTÓRICO DE ATIVIDADES
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  user_name TEXT NOT NULL,
  user_email TEXT NOT NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  module TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete', 'cancel', 'login', 'status_change')),
  description TEXT NOT NULL,
  record_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. TABELA DE CLIENTES
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  cpf_cnpj TEXT,
  phone TEXT,
  whatsapp TEXT,
  email TEXT,
  address TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. TABELA DE FORNECEDORES
CREATE TABLE IF NOT EXISTS public.suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  cnpj_cpf TEXT,
  phone TEXT,
  whatsapp TEXT,
  email TEXT,
  address TEXT,
  category TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. TABELA DE PRODUTOS / ESTOQUE
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sku TEXT,
  category TEXT DEFAULT 'Geral',
  unit TEXT DEFAULT 'un',
  cost_price NUMERIC(14, 4) NOT NULL DEFAULT 0.0000,
  sale_price NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
  quantity NUMERIC(14, 4) NOT NULL DEFAULT 0,
  min_quantity NUMERIC(14, 4) NOT NULL DEFAULT 5,
  max_quantity NUMERIC(14, 4),
  track_stock BOOLEAN DEFAULT true,
  status TEXT NOT NULL CHECK (status IN ('Ativo', 'Inativo')) DEFAULT 'Ativo',
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  supplier_name TEXT,
  location TEXT,
  composition JSONB DEFAULT '[]'::JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. TABELA DE MOVIMENTAÇÕES DE ESTOQUE
CREATE TABLE IF NOT EXISTS public.inventory_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('entrada', 'saida', 'ajuste')),
  quantity NUMERIC(14, 4) NOT NULL,
  unit TEXT DEFAULT 'un',
  previous_quantity NUMERIC(14, 4) NOT NULL,
  new_quantity NUMERIC(14, 4) NOT NULL,
  unit_cost NUMERIC(14, 4),
  total_cost NUMERIC(14, 4),
  reason TEXT NOT NULL,
  reference_type TEXT,
  reference_id TEXT,
  date TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. TABELA DE VENDAS
CREATE TABLE IF NOT EXISTS public.sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  items JSONB DEFAULT '[]'::JSONB,
  discount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(12, 2) NOT NULL,
  total_cost NUMERIC(12, 2) DEFAULT 0,
  gross_margin NUMERIC(12, 2) DEFAULT 0,
  payment_method TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('Pago', 'Concluída', 'Pendente', 'Cancelada')) DEFAULT 'Concluída',
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  auto_stock_deducted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. TABELA DE DESPESAS
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  supplier_name TEXT,
  amount NUMERIC(12, 2) NOT NULL,
  payment_method TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  status TEXT NOT NULL CHECK (status IN ('Pago', 'Pendente', 'Agendado')) DEFAULT 'Pago',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. TABELA DE CONTAS A PAGAR
CREATE TABLE IF NOT EXISTS public.accounts_payable (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  supplier_name TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  due_date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('Pendente', 'Pago', 'Vencido')) DEFAULT 'Pendente',
  paid_date DATE,
  category TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. TABELA DE CONTAS A RECEBER
CREATE TABLE IF NOT EXISTS public.accounts_receivable (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  due_date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('Pendente', 'Recebido', 'Atrasado')) DEFAULT 'Pendente',
  received_date DATE,
  payment_method TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. TABELA DE TAREFAS
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id TEXT NOT NULL, -- UUID da empresa ou 'all'
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

-- Proteção de Segurança: Impede que usuários não-Master alterem roles, status ou se promovam a Master
CREATE OR REPLACE FUNCTION public.protect_profile_security()
RETURNS trigger AS $$
BEGIN
  -- Se houver tentativa de alterar role, is_master ou status
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

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  CASE act_name
    WHEN 'view' THEN RETURN COALESCE(perm_view, false);
    WHEN 'create' THEN RETURN COALESCE(perm_create, false);
    WHEN 'edit' THEN RETURN COALESCE(perm_edit, false);
    WHEN 'delete' THEN RETURN COALESCE(perm_delete, false);
    ELSE RETURN FALSE;
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================================================
-- POLÍTICAS ROW LEVEL SECURITY (RLS)
-- ========================================================================

-- Habilitar RLS em todas as tabelas
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

-- 6. Sales RLS (Isolamento por Empresa e Permissão)
CREATE POLICY "Consulta de vendas autorizadas por empresa" ON public.sales
  FOR SELECT USING (public.has_company_access(company_id) AND public.has_module_access('sales', 'view'));

CREATE POLICY "Criação de vendas na empresa autorizada" ON public.sales
  FOR INSERT WITH CHECK (public.has_company_access(company_id) AND public.has_module_access('sales', 'create'));

CREATE POLICY "Edição de vendas na empresa autorizada" ON public.sales
  FOR UPDATE USING (public.has_company_access(company_id) AND public.has_module_access('sales', 'edit'));

CREATE POLICY "Exclusão de vendas na empresa autorizada" ON public.sales
  FOR DELETE USING (public.has_company_access(company_id) AND public.has_module_access('sales', 'delete'));

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
    OR public.has_company_access(company_id::UUID)
  );

-- ========================================================================
-- PROVEDOR DE AUTENTICAÇÃO (Email/Password) & TRIGGER AUTOMÁTICO DE PERFIL
-- ========================================================================
-- Este trigger garante que qualquer novo usuário criado via Supabase Auth
-- (Email/Password) tenha sua linha correspondente em public.profiles criada
-- com segurança e sem quebrar políticas de RLS.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_role TEXT;
  v_is_master BOOLEAN;
  v_status TEXT;
  v_full_name TEXT;
BEGIN
  -- Determina se é Master pelo email ou metadata
  v_role := COALESCE(new.raw_user_meta_data->>'role', 'OPERADOR');
  v_is_master := COALESCE((new.raw_user_meta_data->>'is_master')::boolean, false);
  
  IF LOWER(new.email) = 'oliveira.victor968@gmail.com' OR v_role = 'MASTER' THEN
    v_role := 'MASTER';
    v_is_master := true;
    v_status := 'active';
  ELSIF v_is_master = true THEN
    v_status := 'active';
  ELSE
    v_status := 'pending';
  END IF;

  v_full_name := COALESCE(
    new.raw_user_meta_data->>'full_name',
    split_part(new.email, '@', 1)
  );

  INSERT INTO public.profiles (id, email, full_name, role, is_master, status, created_at, updated_at)
  VALUES (
    new.id,
    new.email,
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
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    is_master = EXCLUDED.is_master,
    status = EXCLUDED.status,
    updated_at = NOW();

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Registra o trigger na tabela auth.users do Supabase
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ========================================================================
-- ATIVAÇÃO DO SUPABASE REALTIME PARA SINCRONIZAÇÃO AUTOMÁTICA
-- ========================================================================
-- Adiciona todas as tabelas à publicação supabase_realtime para permitir
-- escuta instantânea de INSERT, UPDATE e DELETE no aplicativo.

DO $$
BEGIN
  -- Cria a publicação se não existir
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
ALTER PUBLICATION supabase_realtime ADD TABLE public.expenses;
ALTER PUBLICATION supabase_realtime ADD TABLE public.accounts_payable;
ALTER PUBLICATION supabase_realtime ADD TABLE public.accounts_receivable;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_logs;

-- ========================================================================
-- INSTRUÇÕES DE ATIVAÇÃO DO PROVEDOR NO PAINEL SUPABASE:
-- 1. Acesse Authentication -> Providers -> Email
-- 2. Marque 'Enable Email provider' como HABILITADO (ON).
-- 3. (Recomendado para DEV/Produção Direta): Desative 'Confirm email' se desejar
--    que o usuário Master e operadores entrem imediatamente sem aguardar email.
-- ========================================================================
`;

export const SUPABASE_SCHEMA_SQL = SUPABASE_SQL_SCHEMA;
