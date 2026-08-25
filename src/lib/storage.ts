import {
  UserProfile,
  UserAccount,
  ActivityLog,
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
  PaymentMethod,
} from '../types';
import { generateUUID, getTodayDateString } from './utils';
import { getFullPermissions, getDefaultRolePermissions } from './permissions';

const STORAGE_KEYS = {
  USER: 'omni_user_profile',
  USERS: 'omni_users_list',
  ACTIVITY_LOGS: 'omni_activity_logs',
  COMPANIES: 'omni_companies',
  SALES: 'omni_sales',
  EXPENSES: 'omni_expenses',
  ACCOUNTS_PAYABLE: 'omni_accounts_payable',
  ACCOUNTS_RECEIVABLE: 'omni_accounts_receivable',
  PRODUCTS: 'omni_products',
  SERVICES: 'omni_services',
  INVENTORY_MOVEMENTS: 'omni_inventory_movements',
  CUSTOMERS: 'omni_customers',
  SUPPLIERS: 'omni_suppliers',
  TASKS: 'omni_tasks',
  SUPABASE_CONFIG: 'omni_supabase_config',
  IS_DEMO: 'omni_is_demo_mode',
  MASTER_CONFIGURED: 'omni_master_configured',
  AUTH_SESSION: 'omni_auth_session',
};

export interface AppData {
  user: UserProfile;
  companies: Company[];
  sales: Sale[];
  expenses: Expense[];
  accountsPayable: AccountPayable[];
  accountsReceivable: AccountReceivable[];
  products: Product[];
  services: any[];
  inventoryMovements: InventoryMovement[];
  customers: Customer[];
  suppliers: Supplier[];
  tasks: Task[];
  users: UserAccount[];
  activityLogs: ActivityLog[];
  isDemoMode: boolean;
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  connected: boolean;
}

export const DEFAULT_SUPABASE_CONFIG: SupabaseConfig = {
  url: 'https://iwpthjzpxmtqaigffpdv.supabase.co',
  anonKey: 'sb_publishable_gg76jx4VFCT-N9FhMmv0kw_ADnF3ucS',
  connected: true,
};

// Initial Admin User Template (Empty by default until Master is configured)
export const DEFAULT_ADMIN_USER: UserProfile = {
  id: '',
  email: '',
  name: '',
  role: 'MASTER',
  is_master: true,
  status: 'active',
  company_ids: ['*'],
  permissions: getFullPermissions(),
  created_at: new Date().toISOString(),
};

export function getEmptyAppData(): AppData {
  return {
    user: DEFAULT_ADMIN_USER,
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
    users: [],
    activityLogs: [],
    isDemoMode: false,
  };
}

// Generic Multi-Company Demo Dataset with 8 Companies
export function getDemoData(): AppData {
  const company1Id = 'comp-empresa-1';
  const company2Id = 'comp-empresa-2';
  const company3Id = 'comp-empresa-3';
  const company4Id = 'comp-empresa-4';
  const company5Id = 'comp-empresa-5';
  const company6Id = 'comp-empresa-6';
  const company7Id = 'comp-empresa-7';
  const company8Id = 'comp-empresa-8';

  const companies: Company[] = [
    {
      id: company1Id,
      name: 'Empresa 01 - Matriz Distribuidora',
      trade_name: 'Distribuidora Alpha Comercial Ltda',
      cnpj: '12.345.678/0001-90',
      phone: '(11) 98765-4321',
      email: 'contato@alpha.com.br',
      address: 'Av. Paulista, 1000 - São Paulo, SP',
      category: 'Distribuição e Atacado',
      color: '#3b82f6', // Blue
      status: 'active',
      notes: 'Unidade Matriz - Foco em atacado e suprimentos',
      created_at: new Date().toISOString(),
    },
    {
      id: company2Id,
      name: 'Empresa 02 - Loja de Varejo & Moda',
      trade_name: 'Varejo Beta Comércio de Vestuário Ltda',
      cnpj: '23.456.789/0001-01',
      phone: '(11) 97654-3210',
      email: 'gerencia@beta.com.br',
      address: 'Shopping Ibirapuera - Piso L2',
      category: 'Varejo & Confecção',
      color: '#10b981', // Emerald
      status: 'active',
      notes: 'Alta rotatividade e fluxo de clientes',
      created_at: new Date().toISOString(),
    },
    {
      id: company3Id,
      name: 'Empresa 03 - E-commerce Nacional',
      trade_name: 'Gama Digital Negócios Online Ltda',
      cnpj: '34.567.890/0001-12',
      phone: '(11) 96543-2109',
      email: 'sac@gama.com.br',
      address: 'Hub Tecnológico, Sala 405 - Florianópolis, SC',
      category: 'E-commerce & Tecnologia',
      color: '#8b5cf6', // Violet
      status: 'active',
      notes: 'Vendas online e canais digitais',
      created_at: new Date().toISOString(),
    },
    {
      id: company4Id,
      name: 'Empresa 04 - Centro de Estética & Bem-Estar',
      trade_name: 'Delta Cuidados & Estética Avançada Ltda',
      cnpj: '45.678.901/0001-23',
      phone: '(21) 95432-1098',
      email: 'contato@deltaestetica.com.br',
      address: 'Av. das Américas, 4200 - Barra da Tijuca, RJ',
      category: 'Estética & Saúde',
      color: '#0284c7', // Sky Blue
      status: 'active',
      notes: 'Prestação de serviços com controle rigoroso de insumos e ficha técnica',
      created_at: new Date().toISOString(),
    },
    {
      id: company5Id,
      name: 'Empresa 05 - Fábrica & Manufatura',
      trade_name: 'Epsilon Indústria e Transformação Ltda',
      cnpj: '56.789.012/0001-34',
      phone: '(19) 94321-0987',
      email: 'producao@epsilon.com.br',
      address: 'Distrito Industrial, Lote 12 - Campinas, SP',
      category: 'Indústria & Manufatura',
      color: '#ef4444', // Red
      status: 'active',
      notes: 'Linha de produção com fichas técnicas de montagem',
      created_at: new Date().toISOString(),
    },
    {
      id: company6Id,
      name: 'Empresa 06 - Cafeteria & Gastronomia',
      trade_name: 'Zeta Gastronomia e Cafés Especiais Ltda',
      cnpj: '67.890.123/0001-45',
      phone: '(11) 93210-9876',
      email: 'unidade@zeta.com.br',
      address: 'Rua Oscar Freire, 220 - São Paulo, SP',
      category: 'Alimentação & Bebidas',
      color: '#ec4899', // Pink
      status: 'active',
      notes: 'Operação presencial e delivery com receitas de insumos',
      created_at: new Date().toISOString(),
    },
    {
      id: company7Id,
      name: 'Empresa 07 - Construtora & Engenharia',
      trade_name: 'Eta Engenharia e Empreendimentos Ltda',
      cnpj: '78.901.234/0001-56',
      phone: '(31) 92109-8765',
      email: 'obras@eta.com.br',
      address: 'Savassi, 800 - Belo Horizonte, MG',
      category: 'Construção Civil & Projetos',
      color: '#06b6d4', // Cyan
      status: 'active',
      notes: 'Obras comerciais, laudos e projetos',
      created_at: new Date().toISOString(),
    },
    {
      id: company8Id,
      name: 'Empresa 08 - Logística & Transportes',
      trade_name: 'Theta Logística e Cargas Rápidas Ltda',
      cnpj: '89.012.345/0001-67',
      phone: '(41) 91098-7654',
      email: 'operacao@theta.com.br',
      address: 'Rodovia BR-116, Km 90 - Curitiba, PR',
      category: 'Transporte & Logística',
      color: '#14b8a6', // Teal
      status: 'active',
      notes: 'Operação de fretes e entregas programadas',
      created_at: new Date().toISOString(),
    },
  ];

  const today = getTodayDateString();

  // Insumos e Materiais com controle de estoque
  const matEmbalagemId = 'prod-caixa-kraft';
  const matFitaId = 'prod-fita-adesiva';
  const matTecidoId = 'prod-tecido-algodao';
  const matOleoMassagemId = 'prod-oleo-essencial';
  const matCremeHidratanteId = 'prod-creme-neutro';
  const matMadeiraMdfId = 'prod-chapa-mdf';
  const matParafusoId = 'prod-parafuso-fix';
  const matCafeGraosId = 'prod-cafe-graos';
  const matLeiteId = 'prod-leite-integral';

  const products: Product[] = [
    // Empresa 01 (Distribuidora)
    {
      id: matEmbalagemId,
      company_id: company1Id,
      name: 'Caixa de Papelão Kraft Reforçada 30x20x15cm',
      sku: 'EMB-KRAFT-3020',
      type: 'Produto',
      category: 'Embalagens',
      sale_price: 6.5,
      cost_price: 2.8,
      unit: 'un',
      track_stock: true,
      quantity: 1200,
      min_quantity: 300,
      max_quantity: 3000,
      status: 'Ativo',
      supplier_name: 'Papéis & Caixas Brasil',
      location: 'Galpão A - Bloco 01',
      last_entry_date: today,
      last_movement_date: today,
      created_at: new Date().toISOString(),
    },
    {
      id: matFitaId,
      company_id: company1Id,
      name: 'Fita Adesiva Transparente 48mm x 100m',
      sku: 'FIT-48100',
      type: 'Produto',
      category: 'Embalagens',
      sale_price: 12.0,
      cost_price: 5.2,
      unit: 'un',
      track_stock: true,
      quantity: 450,
      min_quantity: 100,
      max_quantity: 800,
      status: 'Ativo',
      supplier_name: 'Adesivos Industriais S/A',
      location: 'Galpão A - Bloco 02',
      last_entry_date: today,
      last_movement_date: today,
      created_at: new Date().toISOString(),
    },
    {
      id: 'prod-distrib-kit-envio',
      company_id: company1Id,
      name: 'Kit Operacional de Envio (50 Caixas + 2 Fitas)',
      sku: 'KIT-ENV-50',
      type: 'Produto',
      category: 'Kits Comerciais',
      sale_price: 380.0,
      cost_price: 150.4,
      unit: 'cx',
      track_stock: false,
      quantity: 0,
      min_quantity: 0,
      status: 'Ativo',
      composition: [
        {
          product_id: matEmbalagemId,
          product_name: 'Caixa de Papelão Kraft Reforçada 30x20x15cm',
          quantity: 50,
          unit: 'un',
          unit_cost_estimate: 2.8,
        },
        {
          product_id: matFitaId,
          product_name: 'Fita Adesiva Transparente 48mm x 100m',
          quantity: 2,
          unit: 'un',
          unit_cost_estimate: 5.2,
        },
      ],
      created_at: new Date().toISOString(),
    },

    // Empresa 02 (Varejo & Moda)
    {
      id: 'prod-camisa-polo',
      company_id: company2Id,
      name: 'Camisa Polo Piquet Premium Slim',
      sku: 'POLO-PIQ-01',
      type: 'Produto',
      category: 'Vestuário Masculino',
      sale_price: 149.9,
      cost_price: 55.0,
      unit: 'un',
      track_stock: true,
      quantity: 85,
      min_quantity: 20,
      max_quantity: 200,
      status: 'Ativo',
      supplier_name: 'Têxtil Nacional Ltda',
      location: 'Arara Principal 03',
      created_at: new Date().toISOString(),
    },
    {
      id: 'prod-ajuste-bainha',
      company_id: company2Id,
      name: 'Serviço de Ajuste e Alfaiataria (Bainha/Manga)',
      sku: 'SRV-ALFAIAT-01',
      type: 'Serviço',
      category: 'Serviços de Loja',
      sale_price: 35.0,
      cost_price: 10.0,
      unit: 'un',
      track_stock: false,
      quantity: 0,
      min_quantity: 0,
      status: 'Ativo',
      created_at: new Date().toISOString(),
    },

    // Empresa 03 (E-commerce)
    {
      id: 'prod-teclado-mec',
      company_id: company3Id,
      name: 'Teclado Mecânico RGB Wireless Switch Red',
      sku: 'TEC-MEC-RGB',
      type: 'Produto',
      category: 'Periféricos',
      sale_price: 389.0,
      cost_price: 195.0,
      unit: 'un',
      track_stock: true,
      quantity: 42,
      min_quantity: 15,
      max_quantity: 100,
      status: 'Ativo',
      supplier_name: 'Tech Import Distribuição',
      location: 'Rack Ecom 02',
      created_at: new Date().toISOString(),
    },
    {
      id: 'prod-cabo-usbc',
      company_id: company3Id,
      name: 'Cabo USB-C 100W Trançado 2m',
      sku: 'CAB-USBC-2M',
      type: 'Produto',
      category: 'Cabos e Acessórios',
      sale_price: 69.9,
      cost_price: 22.0,
      unit: 'un',
      track_stock: true,
      quantity: 120,
      min_quantity: 30,
      max_quantity: 250,
      status: 'Ativo',
      supplier_name: 'Tech Import Distribuição',
      location: 'Rack Ecom 05',
      created_at: new Date().toISOString(),
    },

    // Empresa 04 (Estética & Bem-Estar)
    {
      id: matOleoMassagemId,
      company_id: company4Id,
      name: 'Óleo Essencial Puro Relaxante e Terapêutico',
      sku: 'INS-OLEO-1L',
      type: 'Produto',
      category: 'Insumos / Cosméticos',
      sale_price: 0,
      cost_price: 0.12, // R$ 0,12 por ml (R$ 120 / L)
      unit: 'ml',
      track_stock: true,
      quantity: 4500, // 4.500 ml
      min_quantity: 1000,
      max_quantity: 8000,
      status: 'Ativo',
      supplier_name: 'Aroma & Essências Pro',
      location: 'Armário de Cosméticos A1',
      created_at: new Date().toISOString(),
    },
    {
      id: matCremeHidratanteId,
      company_id: company4Id,
      name: 'Creme Base Hidratante Corporal Neutro',
      sku: 'INS-CREM-5KG',
      type: 'Produto',
      category: 'Insumos / Cosméticos',
      sale_price: 0,
      cost_price: 0.04, // R$ 0,04 por g (R$ 40 / kg)
      unit: 'g',
      track_stock: true,
      quantity: 8000, // 8.000 g
      min_quantity: 2000,
      max_quantity: 15000,
      status: 'Ativo',
      supplier_name: 'Dermo Pharma Insumos',
      location: 'Armário de Cosméticos A2',
      created_at: new Date().toISOString(),
    },
    {
      id: 'srv-sessao-massagem',
      company_id: company4Id,
      name: 'Sessão de Massoterapia & Relaxamento (60 min)',
      sku: 'SRV-MASSAG-60',
      type: 'Serviço',
      category: 'Terapias & Estética',
      sale_price: 180.0,
      cost_price: 0,
      unit: 'un',
      track_stock: false,
      quantity: 0,
      min_quantity: 0,
      status: 'Ativo',
      composition: [
        {
          product_id: matOleoMassagemId,
          product_name: 'Óleo Essencial Puro Relaxante e Terapêutico',
          quantity: 30, // 30 ml consumidos por sessão
          unit: 'ml',
          unit_cost_estimate: 0.12,
        },
        {
          product_id: matCremeHidratanteId,
          product_name: 'Creme Base Hidratante Corporal Neutro',
          quantity: 50, // 50 g consumidos por sessão
          unit: 'g',
          unit_cost_estimate: 0.04,
        },
      ],
      created_at: new Date().toISOString(),
    },

    // Empresa 05 (Fábrica & Manufatura)
    {
      id: matMadeiraMdfId,
      company_id: company5Id,
      name: 'Chapa de MDF Naval 18mm 2,75x1,83m',
      sku: 'MAT-MDF-18',
      type: 'Produto',
      category: 'Matéria-Prima',
      sale_price: 240.0,
      cost_price: 135.0,
      unit: 'un',
      track_stock: true,
      quantity: 65,
      min_quantity: 20,
      max_quantity: 150,
      status: 'Ativo',
      supplier_name: 'Madeiras Brasil S/A',
      location: 'Pátio Fabril 01',
      created_at: new Date().toISOString(),
    },
    {
      id: matParafusoId,
      company_id: company5Id,
      name: 'Kit Parafusos Estruturais Autobrocantes (100un)',
      sku: 'MAT-PARAF-100',
      type: 'Produto',
      category: 'Ferragens',
      sale_price: 45.0,
      cost_price: 18.0,
      unit: 'pct',
      track_stock: true,
      quantity: 140,
      min_quantity: 30,
      max_quantity: 300,
      status: 'Ativo',
      supplier_name: 'Fixadores & Metais Ltda',
      location: 'Almoxarifado B',
      created_at: new Date().toISOString(),
    },
    {
      id: 'prod-mesa-escritorio',
      company_id: company5Id,
      name: 'Mesa de Escritório Executiva 160x80cm',
      sku: 'PROD-MESA-160',
      type: 'Produto',
      category: 'Mobiliário Corporativo',
      sale_price: 890.0,
      cost_price: 320.0,
      unit: 'un',
      track_stock: true,
      quantity: 12,
      min_quantity: 5,
      max_quantity: 30,
      status: 'Ativo',
      composition: [
        {
          product_id: matMadeiraMdfId,
          product_name: 'Chapa de MDF Naval 18mm 2,75x1,83m',
          quantity: 2,
          unit: 'un',
          unit_cost_estimate: 135.0,
        },
        {
          product_id: matParafusoId,
          product_name: 'Kit Parafusos Estruturais Autobrocantes (100un)',
          quantity: 1,
          unit: 'pct',
          unit_cost_estimate: 18.0,
        },
      ],
      created_at: new Date().toISOString(),
    },

    // Empresa 06 (Cafeteria Gourmet)
    {
      id: matCafeGraosId,
      company_id: company6Id,
      name: 'Grãos de Café Especial Bourbon Amarelo',
      sku: 'INS-CAFE-GRAO',
      type: 'Produto',
      category: 'Insumos / Alimentos',
      sale_price: 0,
      cost_price: 0.08, // R$ 0,08 por g (R$ 80 / kg)
      unit: 'g',
      track_stock: true,
      quantity: 18500, // 18.500 g = 18,5 kg
      min_quantity: 5000,
      max_quantity: 30000,
      status: 'Ativo',
      supplier_name: 'Fazenda Café Nobre',
      location: 'Despensa Seca',
      created_at: new Date().toISOString(),
    },
    {
      id: matLeiteId,
      company_id: company6Id,
      name: 'Leite Integral Tipo A Fresco',
      sku: 'INS-LEITE-1L',
      type: 'Produto',
      category: 'Insumos / Alimentos',
      sale_price: 0,
      cost_price: 5.5, // R$ 5,50 por Litro
      unit: 'L',
      track_stock: true,
      quantity: 45, // 45 Litros
      min_quantity: 15,
      max_quantity: 80,
      status: 'Ativo',
      supplier_name: 'Laticínios da Serra',
      location: 'Câmara Fria 01',
      created_at: new Date().toISOString(),
    },
    {
      id: 'srv-cafe-cappuccino',
      company_id: company6Id,
      name: 'Cappuccino Italiano Cremoso com Canela (300ml)',
      sku: 'CARD-CAPPUC-300',
      type: 'Produto',
      category: 'Cardápio / Cafés',
      sale_price: 18.5,
      cost_price: 0,
      unit: 'un',
      track_stock: false,
      quantity: 0,
      min_quantity: 0,
      status: 'Ativo',
      composition: [
        {
          product_id: matCafeGraosId,
          product_name: 'Grãos de Café Especial Bourbon Amarelo',
          quantity: 20, // 20 g de grãos
          unit: 'g',
          unit_cost_estimate: 0.08,
        },
        {
          product_id: matLeiteId,
          product_name: 'Leite Integral Tipo A Fresco',
          quantity: 0.25, // 0,25 Litro = 250 ml
          unit: 'L',
          unit_cost_estimate: 5.5,
        },
      ],
      created_at: new Date().toISOString(),
    },

    // Empresa 07 (Construtora & Engenharia)
    {
      id: 'prod-cimento-cp2',
      company_id: company7Id,
      name: 'Saco de Cimento Estrutural CP-II 50kg',
      sku: 'MAT-CIM-50KG',
      type: 'Produto',
      category: 'Materiais Básicos',
      sale_price: 42.0,
      cost_price: 28.5,
      unit: 'un',
      track_stock: true,
      quantity: 180,
      min_quantity: 50,
      max_quantity: 400,
      status: 'Ativo',
      supplier_name: 'Votoran Cimentos',
      location: 'Depósito de Obra 01',
      created_at: new Date().toISOString(),
    },
    {
      id: 'srv-projeto-eletrico',
      company_id: company7Id,
      name: 'Elaboração de Projeto Elétrico Predial & ART',
      sku: 'SRV-PROJ-ELET',
      type: 'Serviço',
      category: 'Projetos de Engenharia',
      sale_price: 3500.0,
      cost_price: 600.0,
      unit: 'un',
      track_stock: false,
      quantity: 0,
      min_quantity: 0,
      status: 'Ativo',
      created_at: new Date().toISOString(),
    },

    // Empresa 08 (Logística & Transportes)
    {
      id: 'srv-frete-regional',
      company_id: company8Id,
      name: 'Frete e Transporte de Cargas Fracionadas (Raio 100km)',
      sku: 'SRV-FRET-100',
      type: 'Serviço',
      category: 'Transporte e Fretes',
      sale_price: 650.0,
      cost_price: 280.0,
      unit: 'un',
      track_stock: false,
      quantity: 0,
      min_quantity: 0,
      status: 'Ativo',
      created_at: new Date().toISOString(),
    },
  ];

  const customers: Customer[] = [
    {
      id: 'cust-1',
      company_id: company1Id,
      name: 'Mercado Central do Bairro Ltda',
      document: '11.222.333/0001-44',
      phone: '(11) 98877-6655',
      email: 'compras@mercadocentral.com.br',
      address: 'Rua das Flores, 120 - SP',
      created_at: new Date().toISOString(),
    },
    {
      id: 'cust-2',
      company_id: company2Id,
      name: 'Juliana Mendes Silveira',
      document: '321.654.987-00',
      phone: '(11) 97766-5544',
      email: 'juliana.mendes@gmail.com',
      created_at: new Date().toISOString(),
    },
    {
      id: 'cust-3',
      company_id: company3Id,
      name: 'Rodrigo Albuquerque Lima',
      document: '456.789.123-11',
      phone: '(48) 99123-4567',
      email: 'rodrigo.tech@outlook.com',
      address: 'Rua Bocaiúva, 50 - Florianópolis, SC',
      created_at: new Date().toISOString(),
    },
    {
      id: 'cust-4',
      company_id: company4Id,
      name: 'Camila Fernandes Costa',
      document: '567.890.123-22',
      phone: '(21) 99887-1122',
      email: 'camila.fernandes@uol.com.br',
      address: 'Barra da Tijuca, Rio de Janeiro - RJ',
      created_at: new Date().toISOString(),
    },
    {
      id: 'cust-5',
      company_id: company5Id,
      name: 'Arquitetura & Design Moderno Ltda',
      document: '22.333.444/0001-55',
      phone: '(19) 98122-3344',
      email: 'contato@arquiteturamoderna.com.br',
      created_at: new Date().toISOString(),
    },
    {
      id: 'cust-6',
      company_id: company6Id,
      name: 'Lucas Brandão Vieira',
      phone: '(11) 98234-5678',
      email: 'lucas.brandao@gmail.com',
      created_at: new Date().toISOString(),
    },
    {
      id: 'cust-7',
      company_id: company7Id,
      name: 'Condomínio Residencial Vista Verde',
      document: '33.444.555/0001-66',
      phone: '(31) 98765-1122',
      email: 'sindico@vistaverde.com.br',
      address: 'Av. do Contorno, 3500 - Belo Horizonte, MG',
      created_at: new Date().toISOString(),
    },
    {
      id: 'cust-8',
      company_id: company8Id,
      name: 'Distribuidora de Alimentos União S/A',
      document: '44.555.666/0001-77',
      phone: '(41) 98456-7890',
      email: 'logistica@alimentosuniao.com.br',
      created_at: new Date().toISOString(),
    },
  ];

  const suppliers: Supplier[] = [
    {
      id: 'supp-1',
      company_id: company1Id,
      name: 'Papéis & Caixas Brasil Ltda',
      cnpj_cpf: '01.234.567/0001-89',
      phone: '(11) 3344-5566',
      email: 'vendas@papeisbrasil.com.br',
      category: 'Embalagens',
      created_at: new Date().toISOString(),
    },
    {
      id: 'supp-2',
      company_id: company2Id,
      name: 'Têxtil Nacional S/A',
      cnpj_cpf: '02.345.678/0001-90',
      phone: '(11) 2233-4455',
      category: 'Tecidos & Confecção',
      created_at: new Date().toISOString(),
    },
    {
      id: 'supp-3',
      company_id: company3Id,
      name: 'Tech Import Distribuição Global',
      cnpj_cpf: '03.456.789/0001-01',
      phone: '(47) 3456-7890',
      category: 'Eletrônicos',
      created_at: new Date().toISOString(),
    },
    {
      id: 'supp-4',
      company_id: company4Id,
      name: 'Dermo Pharma Insumos Cosméticos',
      cnpj_cpf: '04.567.890/0001-12',
      phone: '(21) 3456-1122',
      category: 'Cosméticos & Insumos',
      created_at: new Date().toISOString(),
    },
    {
      id: 'supp-5',
      company_id: company5Id,
      name: 'Madeiras Brasil S/A',
      cnpj_cpf: '05.678.901/0001-23',
      phone: '(19) 3876-5432',
      category: 'Madeiras & Chapas',
      created_at: new Date().toISOString(),
    },
    {
      id: 'supp-6',
      company_id: company6Id,
      name: 'Fazenda Café Nobre Ltda',
      cnpj_cpf: '06.789.012/0001-34',
      phone: '(35) 3211-9876',
      category: 'Café & Grãos Especiais',
      created_at: new Date().toISOString(),
    },
    {
      id: 'supp-7',
      company_id: company7Id,
      name: 'Votoran Cimentos e Materiais',
      cnpj_cpf: '07.890.123/0001-45',
      phone: '(31) 3322-1100',
      category: 'Cimentos & Argamassas',
      created_at: new Date().toISOString(),
    },
    {
      id: 'supp-8',
      company_id: company8Id,
      name: 'Posto & Combustíveis Ipiranga Frota',
      cnpj_cpf: '08.901.234/0001-56',
      phone: '(41) 3344-9988',
      category: 'Combustível & Manutenção',
      created_at: new Date().toISOString(),
    },
  ];

  // Generic multi-item sales
  const sales: Sale[] = [
    {
      id: 'sale-1',
      company_id: company1Id,
      customer_id: 'cust-1',
      customer_name: 'Mercado Central do Bairro Ltda',
      date: today,
      payment_method: 'Pix',
      status: 'Concluída',
      items: [
        {
          product_id: matEmbalagemId,
          name: 'Caixa de Papelão Kraft Reforçada 30x20x15cm',
          type: 'Produto',
          quantity: 100,
          unit_price: 6.5,
          discount: 0,
          total_price: 650.0,
          unit_cost: 2.8,
          total_cost: 280.0,
          unit: 'un',
        },
        {
          product_id: matFitaId,
          name: 'Fita Adesiva Transparente 48mm x 100m',
          type: 'Produto',
          quantity: 10,
          unit_price: 12.0,
          discount: 0,
          total_price: 120.0,
          unit_cost: 5.2,
          total_cost: 52.0,
          unit: 'un',
        },
      ],
      discount: 20.0,
      total_amount: 750.0,
      total_cost: 332.0,
      gross_margin: 418.0,
      notes: 'Pedido faturado para entrega imediata',
      created_at: new Date().toISOString(),
    },
    {
      id: 'sale-2',
      company_id: company2Id,
      customer_id: 'cust-2',
      customer_name: 'Juliana Mendes Silveira',
      date: today,
      payment_method: 'Cartão de Crédito',
      status: 'Concluída',
      items: [
        {
          product_id: 'prod-camisa-polo',
          name: 'Camisa Polo Piquet Premium Slim',
          type: 'Produto',
          quantity: 2,
          unit_price: 149.9,
          discount: 0,
          total_price: 299.8,
          unit_cost: 55.0,
          total_cost: 110.0,
          unit: 'un',
        },
        {
          product_id: 'prod-ajuste-bainha',
          name: 'Serviço de Ajuste e Alfaiataria (Bainha/Manga)',
          type: 'Serviço',
          quantity: 1,
          unit_price: 35.0,
          discount: 0,
          total_price: 35.0,
          unit_cost: 10.0,
          total_cost: 10.0,
          unit: 'un',
        },
      ],
      discount: 14.8,
      total_amount: 320.0,
      total_cost: 120.0,
      gross_margin: 200.0,
      created_at: new Date().toISOString(),
    },
    {
      id: 'sale-3',
      company_id: company3Id,
      customer_id: 'cust-3',
      customer_name: 'Rodrigo Albuquerque Lima',
      date: today,
      payment_method: 'Pix',
      status: 'Concluída',
      items: [
        {
          product_id: 'prod-teclado-mec',
          name: 'Teclado Mecânico RGB Wireless Switch Red',
          type: 'Produto',
          quantity: 1,
          unit_price: 389.0,
          discount: 0,
          total_price: 389.0,
          unit_cost: 195.0,
          total_cost: 195.0,
          unit: 'un',
        },
        {
          product_id: 'prod-cabo-usbc',
          name: 'Cabo USB-C 100W Trançado 2m',
          type: 'Produto',
          quantity: 2,
          unit_price: 69.9,
          discount: 0,
          total_price: 139.8,
          unit_cost: 22.0,
          total_cost: 44.0,
          unit: 'un',
        },
      ],
      discount: 28.8,
      total_amount: 500.0,
      total_cost: 239.0,
      gross_margin: 261.0,
      notes: 'Envio prioritário Sedex',
      created_at: new Date().toISOString(),
    },
    {
      id: 'sale-4',
      company_id: company4Id,
      customer_id: 'cust-4',
      customer_name: 'Camila Fernandes Costa',
      date: today,
      payment_method: 'Cartão de Débito',
      status: 'Concluída',
      items: [
        {
          product_id: 'srv-sessao-massagem',
          name: 'Sessão de Massoterapia & Relaxamento (60 min)',
          type: 'Serviço',
          quantity: 1,
          unit_price: 180.0,
          discount: 0,
          total_price: 180.0,
          unit_cost: 5.6, // 30ml * 0.12 + 50g * 0.04 = 3.60 + 2.00 = 5.60
          total_cost: 5.6,
          unit: 'un',
        },
      ],
      discount: 0,
      total_amount: 180.0,
      total_cost: 5.6,
      gross_margin: 174.4,
      consumed_items: [
        {
          product_id: matOleoMassagemId,
          product_name: 'Óleo Essencial Puro Relaxante e Terapêutico',
          quantity: 30,
          unit: 'ml',
          unit_cost: 0.12,
          total_cost: 3.6,
        },
        {
          product_id: matCremeHidratanteId,
          product_name: 'Creme Base Hidratante Corporal Neutro',
          quantity: 50,
          unit: 'g',
          unit_cost: 0.04,
          total_cost: 2.0,
        },
      ],
      created_at: new Date().toISOString(),
    },
    {
      id: 'sale-5',
      company_id: company5Id,
      customer_id: 'cust-5',
      customer_name: 'Arquitetura & Design Moderno Ltda',
      date: today,
      payment_method: 'Transferência',
      status: 'Concluída',
      items: [
        {
          product_id: 'prod-mesa-escritorio',
          name: 'Mesa de Escritório Executiva 160x80cm',
          type: 'Produto',
          quantity: 2,
          unit_price: 890.0,
          discount: 80.0,
          total_price: 1700.0,
          unit_cost: 288.0, // 2 chapas MDF * 135 + 1 pct parafusos * 18 = 288
          total_cost: 576.0,
          unit: 'un',
        },
      ],
      discount: 80.0,
      total_amount: 1700.0,
      total_cost: 576.0,
      gross_margin: 1124.0,
      created_at: new Date().toISOString(),
    },
    {
      id: 'sale-6',
      company_id: company6Id,
      customer_id: 'cust-6',
      customer_name: 'Lucas Brandão Vieira',
      date: today,
      payment_method: 'Pix',
      status: 'Concluída',
      items: [
        {
          product_id: 'srv-cafe-cappuccino',
          name: 'Cappuccino Italiano Cremoso com Canela (300ml)',
          type: 'Produto',
          quantity: 2,
          unit_price: 18.5,
          discount: 0,
          total_price: 37.0,
          unit_cost: 2.975, // 20g * 0.08 + 0.25L * 5.50 = 1.60 + 1.375 = 2.975
          total_cost: 5.95,
          unit: 'un',
        },
      ],
      discount: 0,
      total_amount: 37.0,
      total_cost: 5.95,
      gross_margin: 31.05,
      consumed_items: [
        {
          product_id: matCafeGraosId,
          product_name: 'Grãos de Café Especial Bourbon Amarelo',
          quantity: 40,
          unit: 'g',
          unit_cost: 0.08,
          total_cost: 3.2,
        },
        {
          product_id: matLeiteId,
          product_name: 'Leite Integral Tipo A Fresco',
          quantity: 0.5,
          unit: 'L',
          unit_cost: 5.5,
          total_cost: 2.75,
        },
      ],
      created_at: new Date().toISOString(),
    },
    {
      id: 'sale-7',
      company_id: company7Id,
      customer_id: 'cust-7',
      customer_name: 'Condomínio Residencial Vista Verde',
      date: today,
      payment_method: 'Boleto',
      status: 'Concluída',
      items: [
        {
          product_id: 'srv-projeto-eletrico',
          name: 'Elaboração de Projeto Elétrico Predial & ART',
          type: 'Serviço',
          quantity: 1,
          unit_price: 3500.0,
          discount: 0,
          total_price: 3500.0,
          unit_cost: 600.0,
          total_cost: 600.0,
          unit: 'un',
        },
      ],
      discount: 0,
      total_amount: 3500.0,
      total_cost: 600.0,
      gross_margin: 2900.0,
      created_at: new Date().toISOString(),
    },
    {
      id: 'sale-8',
      company_id: company8Id,
      customer_id: 'cust-8',
      customer_name: 'Distribuidora de Alimentos União S/A',
      date: today,
      payment_method: 'Transferência',
      status: 'Concluída',
      items: [
        {
          product_id: 'srv-frete-regional',
          name: 'Frete e Transporte de Cargas Fracionadas (Raio 100km)',
          type: 'Serviço',
          quantity: 2,
          unit_price: 650.0,
          discount: 50.0,
          total_price: 1250.0,
          unit_cost: 280.0,
          total_cost: 560.0,
          unit: 'un',
        },
      ],
      discount: 50.0,
      total_amount: 1250.0,
      total_cost: 560.0,
      gross_margin: 690.0,
      created_at: new Date().toISOString(),
    },
  ];

  const expenses: Expense[] = [
    {
      id: 'exp-1',
      company_id: company1Id,
      description: 'Aquisição de lote de caixas kraft e fitas',
      category: 'Estoque',
      supplier_name: 'Papéis & Caixas Brasil Ltda',
      amount: 1800.0,
      payment_method: 'Transferência',
      date: today,
      status: 'Pago',
      created_at: new Date().toISOString(),
    },
    {
      id: 'exp-2',
      company_id: company2Id,
      description: 'Aluguel comercial da loja no shopping',
      category: 'Aluguel',
      supplier_name: 'Administradora de Shopping Center',
      amount: 4500.0,
      payment_method: 'Boleto',
      date: today,
      status: 'Pago',
      created_at: new Date().toISOString(),
    },
    {
      id: 'exp-3',
      company_id: company3Id,
      description: 'Hospedagem Cloud & Servidores E-commerce',
      category: 'Internet',
      supplier_name: 'Amazon Web Services',
      amount: 680.0,
      payment_method: 'Cartão de Crédito',
      date: today,
      status: 'Pago',
      created_at: new Date().toISOString(),
    },
    {
      id: 'exp-4',
      company_id: company4Id,
      description: 'Compra de óleos essenciais e cosméticos',
      category: 'Estoque',
      supplier_name: 'Dermo Pharma Insumos',
      amount: 540.0,
      payment_method: 'Pix',
      date: today,
      status: 'Pago',
      created_at: new Date().toISOString(),
    },
    {
      id: 'exp-5',
      company_id: company5Id,
      description: 'Manutenção preventiva de maquinário de corte',
      category: 'Equipamentos',
      supplier_name: 'Técnica Industrial Ltda',
      amount: 950.0,
      payment_method: 'Transferência',
      date: today,
      status: 'Pago',
      created_at: new Date().toISOString(),
    },
    {
      id: 'exp-6',
      company_id: company6Id,
      description: 'Compra de grãos de café especial e leite fresco',
      category: 'Estoque',
      supplier_name: 'Fazenda Café Nobre Ltda',
      amount: 820.0,
      payment_method: 'Pix',
      date: today,
      status: 'Pago',
      created_at: new Date().toISOString(),
    },
    {
      id: 'exp-7',
      company_id: company7Id,
      description: 'Emissão de ART e taxas de engenharia',
      category: 'Impostos',
      supplier_name: 'CREA Regional',
      amount: 320.0,
      payment_method: 'Boleto',
      date: today,
      status: 'Pago',
      created_at: new Date().toISOString(),
    },
    {
      id: 'exp-8',
      company_id: company8Id,
      description: 'Abastecimento de diesel da frota',
      category: 'Transporte',
      supplier_name: 'Posto & Combustíveis Ipiranga Frota',
      amount: 1450.0,
      payment_method: 'Cartão de Débito',
      date: today,
      status: 'Pago',
      created_at: new Date().toISOString(),
    },
  ];

  const accountsPayable: AccountPayable[] = [
    {
      id: 'ap-1',
      company_id: company1Id,
      description: 'Fatura de fornecedor de caixas kraft',
      supplier_name: 'Papéis & Caixas Brasil Ltda',
      amount: 2400.0,
      due_date: today,
      status: 'Pendente',
      category: 'Fornecedor',
      created_at: new Date().toISOString(),
    },
    {
      id: 'ap-2',
      company_id: company2Id,
      description: 'Condomínio e fundo de promoção shopping',
      supplier_name: 'Administradora de Shopping Center',
      amount: 1850.0,
      due_date: today,
      status: 'Pendente',
      category: 'Aluguel',
      created_at: new Date().toISOString(),
    },
    {
      id: 'ap-3',
      company_id: company5Id,
      description: 'Fornecimento de chapas de MDF naval',
      supplier_name: 'Madeiras Brasil S/A',
      amount: 3200.0,
      due_date: today,
      status: 'Pendente',
      category: 'Fornecedor',
      created_at: new Date().toISOString(),
    },
  ];

  const accountsReceivable: AccountReceivable[] = [
    {
      id: 'ar-1',
      company_id: company1Id,
      customer_name: 'Mercado Central do Bairro Ltda',
      description: 'Faturamento de pedido em atacado',
      amount: 3800.0,
      due_date: today,
      status: 'Pendente',
      payment_method: 'Boleto',
      created_at: new Date().toISOString(),
    },
    {
      id: 'ar-2',
      company_id: company7Id,
      customer_name: 'Condomínio Residencial Vista Verde',
      description: 'Segunda parcela de laudo e projeto estrutural',
      amount: 5200.0,
      due_date: today,
      status: 'Pendente',
      payment_method: 'Boleto',
      created_at: new Date().toISOString(),
    },
    {
      id: 'ar-3',
      company_id: company8Id,
      customer_name: 'Distribuidora de Alimentos União S/A',
      description: 'Fechamento quinzenal de fretes rodoviários',
      amount: 2900.0,
      due_date: today,
      status: 'Pendente',
      payment_method: 'Transferência',
      created_at: new Date().toISOString(),
    },
  ];

  const inventoryMovements: InventoryMovement[] = [
    {
      id: 'mov-1',
      company_id: company1Id,
      product_id: matEmbalagemId,
      product_name: 'Caixa de Papelão Kraft Reforçada 30x20x15cm',
      type: 'saida',
      quantity: 100,
      unit: 'un',
      previous_quantity: 1300,
      new_quantity: 1200,
      unit_cost: 2.8,
      total_cost: 280.0,
      reason: 'Venda #sale-1',
      reference_type: 'venda',
      reference_id: 'sale-1',
      date: today,
      created_at: new Date().toISOString(),
    },
    {
      id: 'mov-2',
      company_id: company4Id,
      product_id: matOleoMassagemId,
      product_name: 'Óleo Essencial Puro Relaxante e Terapêutico',
      type: 'saida',
      quantity: 30,
      unit: 'ml',
      previous_quantity: 4530,
      new_quantity: 4500,
      unit_cost: 0.12,
      total_cost: 3.6,
      reason: 'Consumo na Venda #sale-4 (Sessão de Massoterapia)',
      reference_type: 'venda',
      reference_id: 'sale-4',
      date: today,
      created_at: new Date().toISOString(),
    },
    {
      id: 'mov-3',
      company_id: company6Id,
      product_id: matCafeGraosId,
      product_name: 'Grãos de Café Especial Bourbon Amarelo',
      type: 'saida',
      quantity: 40,
      unit: 'g',
      previous_quantity: 18540,
      new_quantity: 18500,
      unit_cost: 0.08,
      total_cost: 3.2,
      reason: 'Consumo na Venda #sale-6 (Cappuccino Italiano)',
      reference_type: 'venda',
      reference_id: 'sale-6',
      date: today,
      created_at: new Date().toISOString(),
    },
  ];

  const tasks: Task[] = [
    {
      id: 'task-1',
      company_id: company1Id,
      title: 'Conferência física de estoque - Caixas e Fitas',
      description: 'Realizar balanço no Galpão A para verificar divergências',
      priority: 'Média',
      status: 'Pendente',
      due_date: today,
      created_at: new Date().toISOString(),
    },
    {
      id: 'task-2',
      company_id: company3Id,
      title: 'Auditoria de pedidos e envio de notas fiscais',
      priority: 'Alta',
      status: 'Em andamento',
      due_date: today,
      created_at: new Date().toISOString(),
    },
    {
      id: 'task-3',
      company_id: company7Id,
      title: 'Emissão de Laudo Técnico e ART de Obra',
      priority: 'Urgente',
      status: 'Pendente',
      due_date: today,
      created_at: new Date().toISOString(),
    },
  ];

  const users: UserAccount[] = [
    {
      id: 'user-master-victor',
      name: 'Victor Oliveira',
      email: 'Oliveira.Victor968@gmail.com',
      role: 'MASTER',
      status: 'active',
      company_ids: ['*'],
      permissions: getFullPermissions(),
      created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
      last_login: new Date().toISOString(),
    },
    {
      id: 'user-joao-empresa1',
      name: 'João Silva',
      email: 'joao.vendas@empresa1.com.br',
      role: 'OPERADOR',
      status: 'active',
      company_ids: [company1Id],
      permissions: {
        ...getDefaultRolePermissions('OPERADOR'),
        sales: { can_view: true, can_create: true, can_edit: false, can_delete: false },
        customers: { can_view: true, can_create: true, can_edit: false, can_delete: false },
        inventory: { can_view: true, can_create: false, can_edit: false, can_delete: false },
        dashboard: { can_view: true, can_create: false, can_edit: false, can_delete: false },
      },
      created_at: new Date(Date.now() - 15 * 86400000).toISOString(),
      last_login: new Date(Date.now() - 1 * 86400000).toISOString(),
    },
    {
      id: 'user-carlos-gerente',
      name: 'Carlos Mendes',
      email: 'carlos.gerente@grupo.com.br',
      role: 'GERENTE',
      status: 'active',
      company_ids: [company1Id, company2Id],
      permissions: getDefaultRolePermissions('GERENTE'),
      created_at: new Date(Date.now() - 20 * 86400000).toISOString(),
      last_login: new Date(Date.now() - 2 * 3600000).toISOString(),
    },
    {
      id: 'user-pedro-sem-empresa',
      name: 'Pedro Santos',
      email: 'pedro.inativo@semempresa.com.br',
      role: 'OPERADOR',
      status: 'active',
      company_ids: [],
      permissions: getDefaultRolePermissions('OPERADOR'),
      created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    },
  ];

  const activityLogs: ActivityLog[] = [
    {
      id: 'log-1',
      user_id: 'user-master-victor',
      user_name: 'Victor Oliveira',
      user_email: 'Oliveira.Victor968@gmail.com',
      action: 'login',
      module: 'Sistema',
      description: 'Login realizado com sucesso como Administrador MASTER',
      created_at: new Date(Date.now() - 3600000 * 3).toISOString(),
    },
    {
      id: 'log-2',
      user_id: 'user-joao-empresa1',
      user_name: 'João Silva',
      user_email: 'joao.vendas@empresa1.com.br',
      company_id: company1Id,
      company_name: 'Empresa 01 - Matriz Distribuidora',
      action: 'create',
      module: 'Vendas',
      description: 'João criou uma venda na Empresa 1 (Cliente Supermercado São Paulo)',
      created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
    },
    {
      id: 'log-3',
      user_id: 'user-carlos-gerente',
      user_name: 'Carlos Mendes',
      user_email: 'carlos.gerente@grupo.com.br',
      company_id: company2Id,
      company_name: 'Empresa 02 - Loja de Varejo & Moda',
      action: 'update',
      module: 'Estoque',
      description: 'Carlos alterou o estoque na Empresa 2 (Vestido Midi Elegance)',
      created_at: new Date(Date.now() - 3600000 * 8).toISOString(),
    },
    {
      id: 'log-4',
      user_id: 'user-carlos-gerente',
      user_name: 'Carlos Mendes',
      user_email: 'carlos.gerente@grupo.com.br',
      company_id: company1Id,
      company_name: 'Empresa 01 - Matriz Distribuidora',
      action: 'create',
      module: 'Despesas',
      description: 'Carlos lançou uma despesa na Empresa 1 (Manutenção Elétrica)',
      created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
    },
  ];

  return {
    user: DEFAULT_ADMIN_USER,
    companies,
    sales,
    expenses,
    accountsPayable,
    accountsReceivable,
    products,
    services: [],
    inventoryMovements,
    customers,
    suppliers,
    tasks,
    users,
    activityLogs,
    isDemoMode: true,
  };
}

// Local Storage Load / Save
export function loadAppData(): AppData {
  try {
    const isDemoSaved = localStorage.getItem(STORAGE_KEYS.IS_DEMO);
    const companiesRaw = localStorage.getItem(STORAGE_KEYS.COMPANIES);

    if (!companiesRaw) {
      return getEmptyAppData();
    }

    const user = JSON.parse(localStorage.getItem(STORAGE_KEYS.USER) || 'null') || DEFAULT_ADMIN_USER;
    const companies = JSON.parse(companiesRaw);
    const sales = JSON.parse(localStorage.getItem(STORAGE_KEYS.SALES) || '[]');
    const expenses = JSON.parse(localStorage.getItem(STORAGE_KEYS.EXPENSES) || '[]');
    const accountsPayable = JSON.parse(localStorage.getItem(STORAGE_KEYS.ACCOUNTS_PAYABLE) || '[]');
    const accountsReceivable = JSON.parse(localStorage.getItem(STORAGE_KEYS.ACCOUNTS_RECEIVABLE) || '[]');
    const products = JSON.parse(localStorage.getItem(STORAGE_KEYS.PRODUCTS) || '[]');
    const services = JSON.parse(localStorage.getItem(STORAGE_KEYS.SERVICES) || '[]');
    const inventoryMovements = JSON.parse(localStorage.getItem(STORAGE_KEYS.INVENTORY_MOVEMENTS) || '[]');
    const customers = JSON.parse(localStorage.getItem(STORAGE_KEYS.CUSTOMERS) || '[]');
    const suppliers = JSON.parse(localStorage.getItem(STORAGE_KEYS.SUPPLIERS) || '[]');
    const tasks = JSON.parse(localStorage.getItem(STORAGE_KEYS.TASKS) || '[]');
    const users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
    const activityLogs = JSON.parse(localStorage.getItem(STORAGE_KEYS.ACTIVITY_LOGS) || '[]');

    const isDemoMode = isDemoSaved === 'true';

    return {
      user,
      companies,
      sales,
      expenses,
      accountsPayable,
      accountsReceivable,
      products,
      services,
      inventoryMovements,
      customers,
      suppliers,
      tasks,
      users,
      activityLogs,
      isDemoMode,
    };
  } catch (err) {
    console.error('Error loading app data from localStorage:', err);
    return getEmptyAppData();
  }
}

export function saveAppData(data: AppData): void {
  try {
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(data.user));
    localStorage.setItem(STORAGE_KEYS.COMPANIES, JSON.stringify(data.companies));
    localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(data.sales));
    localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(data.expenses));
    localStorage.setItem(STORAGE_KEYS.ACCOUNTS_PAYABLE, JSON.stringify(data.accountsPayable));
    localStorage.setItem(STORAGE_KEYS.ACCOUNTS_RECEIVABLE, JSON.stringify(data.accountsReceivable));
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(data.products));
    localStorage.setItem(STORAGE_KEYS.SERVICES, JSON.stringify(data.services || []));
    localStorage.setItem(STORAGE_KEYS.INVENTORY_MOVEMENTS, JSON.stringify(data.inventoryMovements));
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(data.customers));
    localStorage.setItem(STORAGE_KEYS.SUPPLIERS, JSON.stringify(data.suppliers));
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(data.tasks));
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(data.users || []));
    localStorage.setItem(STORAGE_KEYS.ACTIVITY_LOGS, JSON.stringify(data.activityLogs || []));
    localStorage.setItem(STORAGE_KEYS.IS_DEMO, data.isDemoMode ? 'true' : 'false');
  } catch (err) {
    console.error('Error saving app data to localStorage:', err);
  }
}

export function clearAllData(): void {
  Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key));
}

export function loadSupabaseConfig(): SupabaseConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SUPABASE_CONFIG);
    if (!raw) return DEFAULT_SUPABASE_CONFIG;
    const parsed = JSON.parse(raw);
    return {
      url: parsed.url ? parsed.url.trim() : DEFAULT_SUPABASE_CONFIG.url,
      anonKey: parsed.anonKey ? parsed.anonKey.trim() : DEFAULT_SUPABASE_CONFIG.anonKey,
      connected: parsed.connected !== undefined ? parsed.connected : DEFAULT_SUPABASE_CONFIG.connected,
    };
  } catch {
    return DEFAULT_SUPABASE_CONFIG;
  }
}

export function saveSupabaseConfig(config: SupabaseConfig): void {
  localStorage.setItem(STORAGE_KEYS.SUPABASE_CONFIG, JSON.stringify(config));
}

export function isMasterConfiguredInStorage(users?: UserAccount[]): boolean {
  try {
    const flag = localStorage.getItem(STORAGE_KEYS.MASTER_CONFIGURED);
    if (flag === 'true') return true;
    if (flag === 'false') return false;

    // Check users in localStorage or passed users
    const usersRaw = localStorage.getItem(STORAGE_KEYS.USERS);
    const userList: UserAccount[] = users || (usersRaw ? JSON.parse(usersRaw) : []);
    
    const hasMaster = userList.some(
      (u) =>
        (u.role === 'MASTER' || u.role === 'admin' || u.is_master === true) &&
        u.status === 'active'
    );

    if (hasMaster) {
      localStorage.setItem(STORAGE_KEYS.MASTER_CONFIGURED, 'true');
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export function setMasterConfiguredInStorage(isConfigured: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEYS.MASTER_CONFIGURED, isConfigured ? 'true' : 'false');
  } catch (e) {
    console.error('Error saving master configured flag:', e);
  }
}

export function loadAuthSession(): { isAuthenticated: boolean; userId?: string } {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.AUTH_SESSION);
    if (!raw) return { isAuthenticated: false };
    return JSON.parse(raw);
  } catch {
    return { isAuthenticated: false };
  }
}

export function saveAuthSession(session: { isAuthenticated: boolean; userId?: string }): void {
  try {
    localStorage.setItem(STORAGE_KEYS.AUTH_SESSION, JSON.stringify(session));
  } catch (e) {
    console.error('Error saving auth session:', e);
  }
}

export function clearAuthSession(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.AUTH_SESSION);
  } catch (e) {
    console.error('Error clearing auth session:', e);
  }
}
