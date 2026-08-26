import { AppModule, PermissionAction, PermissionsMap, UserProfile, UserRole } from '../types';

export const ALL_APP_MODULES: { id: AppModule; label: string; group: 'Operacional' | 'Financeiro' | 'Cadastros' | 'Estratégico' | 'Sistema'; description: string }[] = [
  { id: 'dashboard', label: 'Dashboard & Indicadores', group: 'Estratégico', description: 'Visão geral de faturamento, gráficos e KPIs consolidados' },
  { id: 'sales', label: 'Vendas & Faturamento', group: 'Operacional', description: 'Lançamento e consulta de pedidos e vendas' },
  { id: 'products', label: 'Produtos & Serviços', group: 'Cadastros', description: 'Catálogo de itens, preços de venda e fichas técnicas' },
  { id: 'inventory', label: 'Controle de Estoque', group: 'Operacional', description: 'Movimentações de entrada, saída, perdas e saldo em estoque' },
  { id: 'customers', label: 'Clientes', group: 'Cadastros', description: 'Cadastro e histórico de compras dos clientes' },
  { id: 'suppliers', label: 'Fornecedores', group: 'Cadastros', description: 'Cadastro e contatos de fornecedores e parceiros' },
  { id: 'expenses', label: 'Despesas & Custos', group: 'Financeiro', description: 'Lançamentos de saídas operacionais e custos fixos/variáveis' },
  { id: 'accounts_payable', label: 'Contas a Pagar', group: 'Financeiro', description: 'Gestão de contas a pagar, vencimentos e baixas' },
  { id: 'accounts_receivable', label: 'Contas a Receber', group: 'Financeiro', description: 'Gestão de recebíveis, prazos e faturamento a receber' },
  { id: 'reports', label: 'Relatórios & DRE', group: 'Estratégico', description: 'Demonstrativos de resultados, relatórios gerenciais e exportações' },
  { id: 'tasks', label: 'Tarefas & Prazos', group: 'Operacional', description: 'Quadro de tarefas, pendências e cronogramas das empresas' },
  { id: 'comparison', label: 'Matriz Comparativa', group: 'Estratégico', description: 'Benchmarking e comparativo lado a lado entre as empresas' },
  { id: 'companies', label: 'Gestão de Empresas', group: 'Sistema', description: 'Cadastro e edição das informações das empresas do grupo' },
  { id: 'users', label: 'Gestão de Usuários & Permissões', group: 'Sistema', description: 'Criação de usuários, atribuição de empresas e controle de acessos' },
  { id: 'activity_logs', label: 'Histórico & Logs de Auditoria', group: 'Sistema', description: 'Rastreabilidade de todas as ações executadas no sistema' },
  { id: 'settings', label: 'Configurações & Supabase', group: 'Sistema', description: 'Parâmetros do sistema, credenciais de banco e sincronização' },
  { id: 'drive', label: 'Google Drive & Documentos', group: 'Sistema', description: 'Armazenamento de arquivos na nuvem, notas fiscais, recibos e backups' },
];

export function getFullPermissions(): PermissionsMap {
  const result = {} as PermissionsMap;
  ALL_APP_MODULES.forEach((m) => {
    result[m.id] = { can_view: true, can_create: true, can_edit: true, can_delete: true };
  });
  return result;
}

export function getEmptyPermissions(): PermissionsMap {
  const result = {} as PermissionsMap;
  ALL_APP_MODULES.forEach((m) => {
    result[m.id] = { can_view: false, can_create: false, can_edit: false, can_delete: false };
  });
  return result;
}

export function getDefaultRolePermissions(role: UserRole): PermissionsMap {
  const normalized = role.toUpperCase();
  if (normalized === 'MASTER' || normalized === 'ADMIN') {
    return getFullPermissions();
  }

  const result = {} as PermissionsMap;

  if (normalized === 'GERENTE' || normalized === 'MANAGER') {
    ALL_APP_MODULES.forEach((m) => {
      if (['users', 'settings'].includes(m.id)) {
        result[m.id] = { can_view: false, can_create: false, can_edit: false, can_delete: false };
      } else if (m.id === 'activity_logs') {
        result[m.id] = { can_view: true, can_create: false, can_edit: false, can_delete: false };
      } else if (m.id === 'companies') {
        result[m.id] = { can_view: true, can_create: false, can_edit: true, can_delete: false };
      } else {
        result[m.id] = { can_view: true, can_create: true, can_edit: true, can_delete: true };
      }
    });
    return result;
  }

  // OPERADOR / EMPLOYEE
  ALL_APP_MODULES.forEach((m) => {
    if (['sales', 'inventory', 'customers', 'tasks'].includes(m.id)) {
      result[m.id] = { can_view: true, can_create: true, can_edit: false, can_delete: false };
    } else if (['products', 'suppliers'].includes(m.id)) {
      result[m.id] = { can_view: true, can_create: false, can_edit: false, can_delete: false };
    } else if (m.id === 'dashboard') {
      result[m.id] = { can_view: true, can_create: false, can_edit: false, can_delete: false };
    } else {
      result[m.id] = { can_view: false, can_create: false, can_edit: false, can_delete: false };
    }
  });

  return result;
}

export const PERMISSION_PRESETS: {
  id: string;
  name: string;
  description: string;
  role: UserRole;
  getPermissions: () => PermissionsMap;
}[] = [
  {
    id: 'master',
    name: 'Acesso Total (Master)',
    description: 'Permissão irrestrita em todos os módulos e empresas.',
    role: 'MASTER',
    getPermissions: () => getFullPermissions(),
  },
  {
    id: 'manager',
    name: 'Gerente Geral de Operações',
    description: 'Acesso a Dashboard, Vendas, Estoque, Financeiro e Relatórios (sem gestão de usuários/banco).',
    role: 'GERENTE',
    getPermissions: () => getDefaultRolePermissions('GERENTE'),
  },
  {
    id: 'sales_only',
    name: 'Operador Comercial & Vendas',
    description: 'Visualiza e lança vendas, consulta estoque e cadastra clientes.',
    role: 'OPERADOR',
    getPermissions: () => {
      const p = getDefaultRolePermissions('OPERADOR');
      p.sales = { can_view: true, can_create: true, can_edit: false, can_delete: false };
      p.customers = { can_view: true, can_create: true, can_edit: false, can_delete: false };
      p.products = { can_view: true, can_create: false, can_edit: false, can_delete: false };
      p.inventory = { can_view: true, can_create: false, can_edit: false, can_delete: false };
      p.dashboard = { can_view: true, can_create: false, can_edit: false, can_delete: false };
      return p;
    },
  },
  {
    id: 'finance',
    name: 'Financeiro & Contas',
    description: 'Gestão de despesas, contas a pagar, contas a receber e relatórios financeiros.',
    role: 'GERENTE',
    getPermissions: () => {
      const p = getDefaultRolePermissions('OPERADOR');
      p.dashboard = { can_view: true, can_create: false, can_edit: false, can_delete: false };
      p.sales = { can_view: true, can_create: false, can_edit: false, can_delete: false };
      p.expenses = { can_view: true, can_create: true, can_edit: true, can_delete: true };
      p.accounts_payable = { can_view: true, can_create: true, can_edit: true, can_delete: true };
      p.accounts_receivable = { can_view: true, can_create: true, can_edit: true, can_delete: true };
      p.reports = { can_view: true, can_create: false, can_edit: false, can_delete: false };
      p.suppliers = { can_view: true, can_create: true, can_edit: true, can_delete: false };
      return p;
    },
  },
  {
    id: 'stock_clerk',
    name: 'Almoxarifado & Estoque',
    description: 'Entrada e saída de mercadorias, conferência de saldo e produtos.',
    role: 'OPERADOR',
    getPermissions: () => {
      const p = getDefaultRolePermissions('OPERADOR');
      p.inventory = { can_view: true, can_create: true, can_edit: true, can_delete: false };
      p.products = { can_view: true, can_create: true, can_edit: true, can_delete: false };
      p.suppliers = { can_view: true, can_create: false, can_edit: false, can_delete: false };
      return p;
    },
  },
  {
    id: 'readonly',
    name: 'Somente Leitura / Auditoria',
    description: 'Apenas visualização de dados operacionais sem permissão de criar ou alterar.',
    role: 'OPERADOR',
    getPermissions: () => {
      const result = {} as PermissionsMap;
      ALL_APP_MODULES.forEach((m) => {
        if (['users', 'settings'].includes(m.id)) {
          result[m.id] = { can_view: false, can_create: false, can_edit: false, can_delete: false };
        } else {
          result[m.id] = { can_view: true, can_create: false, can_edit: false, can_delete: false };
        }
      });
      return result;
    },
  },
];

export function checkUserModulePermission(
  user: UserProfile | null | undefined,
  module: AppModule,
  action: PermissionAction = 'view'
): boolean {
  if (!user) return false;

  const role = (user.role || '').toUpperCase();
  if (role === 'MASTER' || role === 'ADMIN') {
    return true;
  }

  if (!user.permissions) {
    const defaultPerms = getDefaultRolePermissions(user.role);
    const mod = defaultPerms[module];
    if (!mod) return false;
    return Boolean(mod[`can_${action}`]);
  }

  const modulePerm = user.permissions[module];
  if (!modulePerm) {
    const defaultPerms = getDefaultRolePermissions(user.role);
    const mod = defaultPerms[module];
    if (!mod) return false;
    return Boolean(mod[`can_${action}`]);
  }
  return Boolean(modulePerm[`can_${action}`]);
}
