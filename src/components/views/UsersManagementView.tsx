import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Users,
  Shield,
  Building2,
  ExternalLink,
  RefreshCw,
  Edit2,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  Check,
  X,
  AlertTriangle,
  Info,
  ShieldCheck,
  ShieldAlert,
  UserCheck,
  Lock,
  ChevronRight,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { UserAccount, UserRole, Company } from '../../types';
import { MASTER_ADMIN_EMAIL } from '../../context/AppContext';
import {
  fetchSupabaseUsersWithRelations,
  syncUserUpdateToSupabase,
} from '../../lib/supabase';
import { getFullPermissions, getDefaultRolePermissions } from '../../lib/permissions';

export const UsersManagementView: React.FC = () => {
  const {
    data,
    user: currentUser,
    isMasterUser,
    supabaseConfig,
    showToast,
    logActivity,
    setData,
  } = useApp();

  // Local state for users loaded directly from Supabase
  const [supabaseUsers, setSupabaseUsers] = useState<UserAccount[]>(() => data.users || []);
  const [isLoading, setIsLoading] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [companyFilter, setCompanyFilter] = useState<string>('all');

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [formName, setFormName] = useState('');
  const [formRole, setFormRole] = useState<UserRole>('OPERADOR');
  const [formStatus, setFormStatus] = useState<'active' | 'inactive'>('active');
  const [formCompanyIds, setFormCompanyIds] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Function to get the Supabase Auth Users URL safely
  const getSupabaseAuthUsersUrl = useCallback(() => {
    if (!supabaseConfig.url) return 'https://supabase.com/dashboard';
    const cleanUrl = supabaseConfig.url.replace(/^https?:\/\//, '');
    const projectRef = cleanUrl.split('.')[0];
    if (projectRef && projectRef.length > 5) {
      return `https://supabase.com/dashboard/project/${projectRef}/auth/users`;
    }
    return 'https://supabase.com/dashboard';
  }, [supabaseConfig.url]);

  // Open Supabase Dashboard Authentication > Users
  const handleOpenSupabaseUsers = () => {
    const url = getSupabaseAuthUsersUrl();
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Load / Reload real users directly from Supabase PostgreSQL
  const loadUsersFromSupabase = useCallback(async (showFeedback = false) => {
    setIsLoading(true);
    try {
      const res = await fetchSupabaseUsersWithRelations(supabaseConfig);
      if (res.success && res.users) {
        setSupabaseUsers(res.users);
        setLastRefreshedAt(new Date());

        // Update global AppContext data as well
        setData((prev) => ({
          ...prev,
          users: res.users!,
          ...(res.companies && res.companies.length > 0 ? { companies: res.companies } : {}),
        }));

        if (showFeedback) {
          showToast(`${res.users.length} usuário(s) sincronizado(s) com o Supabase!`, 'success');
        }
      } else {
        if (showFeedback) {
          showToast(res.message || 'Não foi possível carregar a lista do Supabase.', 'warning');
        }
      }
    } catch (err: any) {
      console.warn('Erro ao carregar usuários:', err);
      if (showFeedback) {
        showToast('Erro ao consultar tabela profiles no Supabase.', 'error');
      }
    } finally {
      setIsLoading(false);
    }
  }, [supabaseConfig, setData, showToast]);

  // Initial load on component mount
  useEffect(() => {
    if (isMasterUser) {
      loadUsersFromSupabase(false);
    }
  }, [isMasterUser, loadUsersFromSupabase]);

  // Open Edit Modal
  const handleOpenEdit = (targetUser: UserAccount) => {
    setEditingUser(targetUser);
    setFormName(targetUser.name);
    setFormRole(targetUser.role);
    setFormStatus((targetUser.status as 'active' | 'inactive') || 'active');
    setFormCompanyIds(targetUser.company_ids || []);
    setIsEditModalOpen(true);
  };

  // Toggle company selection in modal
  const handleToggleCompany = (companyId: string) => {
    if (formRole === 'MASTER') return;
    if (formCompanyIds.includes(companyId)) {
      setFormCompanyIds(formCompanyIds.filter((id) => id !== companyId));
    } else {
      setFormCompanyIds([...formCompanyIds, companyId]);
    }
  };

  // Select all / deselect all companies
  const handleSelectAllCompanies = () => {
    if (formCompanyIds.length === data.companies.length) {
      setFormCompanyIds([]);
    } else {
      setFormCompanyIds(data.companies.map((c) => c.id));
    }
  };

  // Save changes to Supabase
  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    if (!formName.trim()) {
      showToast('O nome do usuário não pode ficar vazio.', 'warning');
      return;
    }

    if (formRole !== 'MASTER' && formCompanyIds.length === 0) {
      showToast('Vincule pelo menos 1 empresa ao usuário ou defina o perfil como MASTER.', 'warning');
      return;
    }

    // Safety: Prevent removing Master status from the main master if only 1 active master
    const isEditingMainMaster =
      editingUser.email.toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase() ||
      editingUser.id === currentUser?.id;
    if (isEditingMainMaster && formRole !== 'MASTER') {
      showToast('Não é permitido revogar a função MASTER do administrador principal conectado.', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const isMasterRole = formRole === 'MASTER';
      const finalCompanyIds = isMasterRole ? ['*'] : formCompanyIds;
      const finalPermissions = isMasterRole ? getFullPermissions() : getDefaultRolePermissions(formRole);

      // 1. Sync directly with Supabase profiles, user_companies & user_permissions
      const syncRes = await syncUserUpdateToSupabase(
        editingUser.id,
        {
          name: formName.trim(),
          email: editingUser.email,
          role: formRole,
          is_master: isMasterRole,
          status: formStatus,
          company_ids: finalCompanyIds,
          permissions: finalPermissions,
        },
        supabaseConfig
      );

      if (!syncRes.success) {
        showToast(`Aviso: ${syncRes.message || 'Erro ao sincronizar com Supabase'}`, 'warning');
      }

      // 2. Update local state
      const updatedUser: UserAccount = {
        ...editingUser,
        name: formName.trim(),
        role: formRole,
        is_master: isMasterRole,
        status: formStatus,
        company_ids: finalCompanyIds,
        permissions: finalPermissions,
      };

      setSupabaseUsers((prev) =>
        prev.map((u) => (u.id === editingUser.id ? updatedUser : u))
      );

      setData((prev) => ({
        ...prev,
        users: (prev.users || []).map((u) => (u.id === editingUser.id ? updatedUser : u)),
      }));

      logActivity({
        module: 'Usuários',
        action: 'update',
        description: `Atualizado usuário "${updatedUser.name}" (${updatedUser.email}): Função ${formRole}, Status ${formStatus}, ${finalCompanyIds.length} empresa(s) vinculada(s).`,
        recordId: editingUser.id,
      });

      showToast(`Usuário "${updatedUser.name}" atualizado com sucesso!`, 'success');
      setIsEditModalOpen(false);
      setEditingUser(null);
    } catch (err: any) {
      showToast(`Erro ao salvar: ${err.message || 'Falha de conexão'}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle user status active/inactive
  const handleToggleStatus = async (userAccount: UserAccount) => {
    if (userAccount.email.toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase()) {
      showToast('O Administrador Master principal não pode ser inativado.', 'error');
      return;
    }

    const nextStatus = userAccount.status === 'active' ? 'inactive' : 'active';
    try {
      await syncUserUpdateToSupabase(
        userAccount.id,
        { status: nextStatus },
        supabaseConfig
      );

      setSupabaseUsers((prev) =>
        prev.map((u) => (u.id === userAccount.id ? { ...u, status: nextStatus } : u))
      );

      setData((prev) => ({
        ...prev,
        users: (prev.users || []).map((u) => (u.id === userAccount.id ? { ...u, status: nextStatus } : u)),
      }));

      logActivity({
        module: 'Usuários',
        action: 'status_change',
        description: `Status do usuário "${userAccount.name}" alterado para ${nextStatus === 'active' ? 'Ativo' : 'Inativo'}.`,
        recordId: userAccount.id,
      });

      showToast(`Usuário ${nextStatus === 'active' ? 'ativado' : 'inativado'} com sucesso.`, 'info');
    } catch (err: any) {
      showToast(`Erro ao alterar status: ${err.message || 'Falha de conexão'}`, 'error');
    }
  };

  // Filtered list
  const filteredUsers = useMemo(() => {
    return supabaseUsers.filter((u) => {
      // Search
      const matchesSearch =
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.username && u.username.toLowerCase().includes(searchTerm.toLowerCase()));
      if (!matchesSearch) return false;

      // Role
      if (roleFilter !== 'all') {
        const uRole = (u.role || '').toUpperCase();
        if (roleFilter === 'MASTER' && !(uRole === 'MASTER' || u.is_master)) return false;
        if (roleFilter === 'GERENTE' && uRole !== 'GERENTE') return false;
        if (roleFilter === 'OPERADOR' && uRole !== 'OPERADOR') return false;
      }

      // Status
      if (statusFilter !== 'all') {
        const uStatus = u.status || 'active';
        if (uStatus !== statusFilter) return false;
      }

      // Company
      if (companyFilter !== 'all') {
        if (u.role === 'MASTER' || u.is_master || (u.company_ids && u.company_ids.includes('*'))) {
          return true;
        }
        if (!u.company_ids || !u.company_ids.includes(companyFilter)) {
          return false;
        }
      }

      return true;
    });
  }, [supabaseUsers, searchTerm, roleFilter, statusFilter, companyFilter]);

  // Security guard for Non-Master users
  if (!isMasterUser) {
    return (
      <div id="users-access-denied" className="p-8 max-w-2xl mx-auto my-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-rose-200 dark:border-rose-900/50 shadow-sm">
        <div className="w-14 h-14 mx-auto mb-4 bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 rounded-2xl flex items-center justify-center">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Acesso Restrito</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
          A aba <strong>Usuários</strong> é de acesso exclusivo para administradores com a função <strong>MASTER</strong>.
        </p>
      </div>
    );
  }

  return (
    <div id="users-view" className="space-y-6">
      {/* Page Header */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl border border-indigo-100 dark:border-indigo-900/50">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Usuários
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                {supabaseUsers.length} {supabaseUsers.length === 1 ? 'cadastrado' : 'cadastrados'}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Administração de acessos, funções (Master, Gerente, Operador) e empresas vinculadas via Supabase Authentication.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            id="btn-refresh-users-supabase"
            onClick={() => loadUsersFromSupabase(true)}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition-all border border-slate-200 dark:border-slate-700 cursor-pointer disabled:opacity-50"
            title="Recarregar usuários do banco de dados do Supabase"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-indigo-600' : ''}`} />
            <span>{isLoading ? 'Atualizando...' : 'Atualizar Lista'}</span>
          </button>

          <button
            id="btn-manage-users-supabase"
            onClick={handleOpenSupabaseUsers}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer hover:shadow-md"
            title="Abrir a área de Authentication > Users no Supabase para cadastrar e gerenciar credenciais"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>GERENCIAR USUÁRIOS NO SUPABASE</span>
          </button>
        </div>
      </div>

      {/* Guide Workflow Box */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 rounded-2xl border border-indigo-900/40 shadow-sm">
        <div className="flex items-start gap-3.5">
          <div className="p-2 bg-indigo-500/20 text-indigo-300 rounded-xl border border-indigo-500/30 shrink-0 mt-0.5">
            <Info className="w-5 h-5 text-indigo-400" />
          </div>
          <div className="space-y-2 text-xs">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              Fluxo Real de Cadastro de Usuários
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1 text-slate-300">
              <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                <div className="font-bold text-indigo-300 mb-1 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[11px]">1</span>
                  Criar no Supabase
                </div>
                <p className="text-[11px] text-slate-300">
                  Clique no botão verde acima e cadastre o novo usuário no <strong>Authentication &gt; Users</strong> (E-mail + Senha).
                </p>
              </div>

              <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                <div className="font-bold text-indigo-300 mb-1 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[11px]">2</span>
                  Atualizar Lista
                </div>
                <p className="text-[11px] text-slate-300">
                  Ao retornar aqui, clique em <strong>Atualizar Lista</strong> para puxar o perfil criado na tabela <code>public.profiles</code>.
                </p>
              </div>

              <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                <div className="font-bold text-indigo-300 mb-1 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[11px]">3</span>
                  Definir Função e Empresas
                </div>
                <p className="text-[11px] text-slate-300">
                  Clique em <strong>Editar</strong> para atribuir a função (<strong>MASTER</strong>, <strong>GERENTE</strong> ou <strong>OPERADOR</strong>) e vincular as empresas.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            id="input-search-users"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome ou e-mail..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Role Filter */}
          <select
            id="select-filter-role"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
          >
            <option value="all">Todas as Funções</option>
            <option value="MASTER">MASTER (Acesso Total)</option>
            <option value="GERENTE">GERENTE</option>
            <option value="OPERADOR">OPERADOR</option>
          </select>

          {/* Company Filter */}
          <select
            id="select-filter-company"
            value={companyFilter}
            onChange={(e) => setCompanyFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
          >
            <option value="all">Todas as Empresas</option>
            {data.companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            id="select-filter-status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
          >
            <option value="all">Todos os Status</option>
            <option value="active">Ativos</option>
            <option value="inactive">Inativos</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 font-bold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Nome &amp; E-mail</th>
                <th className="py-3.5 px-4">Função</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Empresas Vinculadas</th>
                <th className="py-3.5 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <Users className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                    <p className="font-semibold">Nenhum usuário encontrado com os filtros selecionados.</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Clique em &quot;GERENCIAR USUÁRIOS NO SUPABASE&quot; para cadastrar novos usuários.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isCurrent = currentUser?.id === u.id;
                  const isMaster =
                    u.role === 'MASTER' ||
                    u.is_master ||
                    u.email.toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase();

                  // Assigned Companies List
                  const userCompanies = isMaster
                    ? data.companies
                    : data.companies.filter((c) => (u.company_ids || []).includes(c.id));

                  return (
                    <tr
                      key={u.id}
                      id={`user-row-${u.id}`}
                      className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors ${
                        isCurrent ? 'bg-indigo-50/30 dark:bg-indigo-950/20' : ''
                      }`}
                    >
                      {/* Name & Email */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                            isMaster
                              ? 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                              : u.role === 'GERENTE'
                              ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                              : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                          }`}>
                            {u.name ? u.name.slice(0, 2).toUpperCase() : u.email.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 truncate">
                              <span>{u.name}</span>
                              {isCurrent && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold">
                                  Você
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate">
                              {u.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${
                            isMaster
                              ? 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                              : u.role === 'GERENTE'
                              ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                              : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                          }`}
                        >
                          <Shield className="w-3 h-3" />
                          <span>{isMaster ? 'MASTER' : u.role}</span>
                        </span>
                      </td>

                      {/* Status Badge */}
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => handleToggleStatus(u)}
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold cursor-pointer transition-colors ${
                            u.status === 'active' || !u.status
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-200'
                          }`}
                          title="Clique para alternar o status do usuário"
                        >
                          {u.status === 'active' || !u.status ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Ativo</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3 text-slate-400" />
                              <span>Inativo</span>
                            </>
                          )}
                        </button>
                      </td>

                      {/* Linked Companies */}
                      <td className="py-3.5 px-4">
                        {isMaster ? (
                          <div className="flex items-center gap-1.5 text-purple-700 dark:text-purple-300 font-bold">
                            <Building2 className="w-3.5 h-3.5 text-purple-600" />
                            <span>Todas as {data.companies.length} Empresas</span>
                          </div>
                        ) : userCompanies.length === 0 ? (
                          <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            Nenhuma empresa vinculada
                          </span>
                        ) : (
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {userCompanies.map((c) => (
                              <span
                                key={c.id}
                                className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-md text-[10px] font-bold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                              >
                                <span
                                  className="w-1.5 h-1.5 rounded-full"
                                  style={{ backgroundColor: c.color || '#4f46e5' }}
                                />
                                <span className="truncate max-w-[120px]">{c.name}</span>
                              </span>
                            ))}
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          id={`btn-edit-user-${u.id}`}
                          onClick={() => handleOpenEdit(u)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/80 text-indigo-700 dark:text-indigo-300 text-xs font-bold rounded-lg border border-indigo-200/60 dark:border-indigo-800 transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>Editar Acesso</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {lastRefreshedAt && (
          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Sincronizado diretamente com a tabela <code>public.profiles</code></span>
            <span>Última atualização: {lastRefreshedAt.toLocaleTimeString('pt-BR')}</span>
          </div>
        )}
      </div>

      {/* Edit User Modal */}
      {isEditModalOpen && editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-xl">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Editar Acesso e Empresas
                  </h2>
                  <p className="text-xs text-slate-500 font-mono">{editingUser.email}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingUser(null);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-4 pt-4 text-xs">
              {/* Name */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nome Completo
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white font-medium"
                  required
                />
              </div>

              {/* Role Selection */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Função / Papel no Sistema
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['MASTER', 'GERENTE', 'OPERADOR'] as UserRole[]).map((role) => {
                    const isSelected = formRole === role;
                    return (
                      <button
                        key={role}
                        type="button"
                        onClick={() => {
                          setFormRole(role);
                          if (role === 'MASTER') {
                            setFormCompanyIds(['*']);
                          } else if (formCompanyIds.includes('*')) {
                            setFormCompanyIds(data.companies.length > 0 ? [data.companies[0].id] : []);
                          }
                        }}
                        className={`p-3 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                          isSelected
                            ? role === 'MASTER'
                              ? 'bg-purple-50 dark:bg-purple-950/60 border-purple-500 text-purple-700 dark:text-purple-300 ring-2 ring-purple-400'
                              : role === 'GERENTE'
                              ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-500 text-blue-700 dark:text-blue-300 ring-2 ring-blue-400'
                              : 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-400'
                            : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                        }`}
                      >
                        <Shield className="w-4 h-4 mx-auto mb-1 opacity-80" />
                        <div>{role}</div>
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5">
                  {formRole === 'MASTER' && 'MASTER: Possui acesso total e irrestrito a todas as 8 empresas e módulos.'}
                  {formRole === 'GERENTE' && 'GERENTE: Acesso gerencial com edição e exclusão nas empresas vinculadas.'}
                  {formRole === 'OPERADOR' && 'OPERADOR: Acesso operacional focado em lançamentos nas empresas vinculadas.'}
                </p>
              </div>

              {/* Status */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Status da Conta
                </label>
                <div className="flex gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      value="active"
                      checked={formStatus === 'active'}
                      onChange={() => setFormStatus('active')}
                      className="text-indigo-600"
                    />
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">Ativo</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      value="inactive"
                      checked={formStatus === 'inactive'}
                      onChange={() => setFormStatus('inactive')}
                      className="text-indigo-600"
                    />
                    <span className="font-semibold text-slate-500">Inativo (Bloquear Login)</span>
                  </label>
                </div>
              </div>

              {/* Linked Companies Section */}
              {formRole !== 'MASTER' ? (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="font-bold text-slate-700 dark:text-slate-300">
                      Empresas Vinculadas (Acesso Autorizado)
                    </label>
                    <button
                      type="button"
                      onClick={handleSelectAllCompanies}
                      className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
                    >
                      {formCompanyIds.length === data.companies.length ? 'Desmarcar Todas' : 'Marcar Todas'}
                    </button>
                  </div>

                  <div className="space-y-1.5 max-h-48 overflow-y-auto p-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                    {data.companies.map((c) => {
                      const isChecked = formCompanyIds.includes(c.id);
                      return (
                        <label
                          key={c.id}
                          className={`flex items-center justify-between p-2.5 rounded-lg border transition-colors cursor-pointer ${
                            isChecked
                              ? 'bg-indigo-50/60 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-800'
                              : 'bg-white dark:bg-slate-800 border-slate-200/80 dark:border-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <span
                              className="w-2.5 h-2.5 rounded-full"
                              style={{ backgroundColor: c.color || '#4f46e5' }}
                            />
                            <span className="font-bold text-slate-800 dark:text-slate-200">{c.name}</span>
                          </div>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleCompany(c.id)}
                            className="rounded text-indigo-600 focus:ring-indigo-500"
                          />
                        </label>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-purple-50 dark:bg-purple-950/40 rounded-xl border border-purple-200 dark:border-purple-800/60 text-purple-900 dark:text-purple-200">
                  <div className="flex items-center gap-2 font-bold mb-1">
                    <Building2 className="w-4 h-4 text-purple-600" />
                    <span>Acesso a Todas as Empresas Habilitado</span>
                  </div>
                  <p className="text-[11px] text-purple-700 dark:text-purple-300">
                    Usuários com perfil MASTER visualizam automaticamente todas as 8 empresas e a matriz comparativa.
                  </p>
                </div>
              )}

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingUser(null);
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-sm transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
