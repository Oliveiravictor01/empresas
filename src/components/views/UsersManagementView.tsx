import React, { useState, useMemo } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  Building2,
  Lock,
  Key,
  CheckCircle2,
  XCircle,
  Edit2,
  Trash2,
  Search,
  Filter,
  Eye,
  Plus,
  AlertTriangle,
  RefreshCw,
  Sliders,
  LogIn,
  Check,
  X,
  HelpCircle,
  Sparkles,
  Info,
  ShieldCheck,
  ShieldAlert,
  Clock,
  UserCheck,
  Layers,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  UserAccount,
  UserRole,
  AppModule,
  PermissionsMap,
  ModulePermission,
  Company,
} from '../../types';
import {
  ALL_APP_MODULES,
  PERMISSION_PRESETS,
  getFullPermissions,
  getDefaultRolePermissions,
} from '../../lib/permissions';
import { MASTER_ADMIN_EMAIL } from '../../context/AppContext';

export const UsersManagementView: React.FC = () => {
  const {
    data,
    user: currentUser,
    users,
    isMasterUser,
    addUser,
    updateUserAccount,
    deleteUserAccount,
    toggleUserStatus,
    resetUserPassword,
    switchActiveUser,
    approveUser,
    requestDeleteConfirm,
    showToast,
    setActiveTab,
  } = useApp();

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [companyFilter, setCompanyFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modal State for New / Edit User
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formUsername, setFormUsername] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRole, setFormRole] = useState<UserRole>('OPERADOR');
  const [formCompanyIds, setFormCompanyIds] = useState<string[]>([]);
  const [formStatus, setFormStatus] = useState<'active' | 'inactive' | 'pending'>('active');
  const [formPermissions, setFormPermissions] = useState<PermissionsMap>(() =>
    getDefaultRolePermissions('OPERADOR')
  );
  const [selectedPreset, setSelectedPreset] = useState<string>('');
  const [showMasterPromotionConfirm, setShowMasterPromotionConfirm] = useState(false);

  // Password Reset Modal
  const [resetModalUser, setResetModalUser] = useState<UserAccount | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');

  // Active Masters Count
  const activeMastersCount = useMemo(() => {
    return users.filter(
      (u) =>
        (u.role === 'MASTER' || u.is_master || u.email?.toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase()) &&
        (u.status || 'active') === 'active'
    ).length;
  }, [users]);

  // Pending approval list
  const pendingUsers = useMemo(() => {
    return users.filter((u) => u.status === 'pending');
  }, [users]);

  // Open Create Modal
  const handleOpenCreateModal = () => {
    if (!isMasterUser) {
      showToast('Apenas o Administrador Master pode criar usuários.', 'error');
      return;
    }
    setEditingUserId(null);
    setFormName('');
    setFormEmail('');
    setFormUsername('');
    setFormPassword('123456');
    setFormRole('OPERADOR');
    setFormCompanyIds(data.companies.length > 0 ? [data.companies[0].id] : []);
    setFormStatus('active');
    setFormPermissions(getDefaultRolePermissions('OPERADOR'));
    setSelectedPreset('sales_only');
    setShowMasterPromotionConfirm(false);
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (targetUser: UserAccount) => {
    if (!isMasterUser) {
      showToast('Apenas o Administrador Master pode editar usuários.', 'error');
      return;
    }
    setEditingUserId(targetUser.id);
    setFormName(targetUser.name);
    setFormEmail(targetUser.email);
    setFormUsername(targetUser.username || '');
    setFormPassword('');
    setFormRole(targetUser.role);
    setFormCompanyIds(targetUser.company_ids || []);
    setFormStatus(targetUser.status || 'active');
    setFormPermissions(
      targetUser.permissions ||
        (targetUser.role === 'MASTER'
          ? getFullPermissions()
          : getDefaultRolePermissions(targetUser.role))
    );
    setSelectedPreset('');
    setShowMasterPromotionConfirm(false);
    setIsModalOpen(true);
  };

  // Apply a permission preset
  const handleApplyPreset = (presetId: string) => {
    const preset = PERMISSION_PRESETS.find((p) => p.id === presetId);
    if (preset) {
      if (preset.role === 'MASTER' && formRole !== 'MASTER') {
        setShowMasterPromotionConfirm(true);
        return;
      }
      setSelectedPreset(preset.id);
      setFormRole(preset.role);
      setFormPermissions(preset.getPermissions());
      if (preset.role === 'MASTER') {
        setFormCompanyIds(['*']);
      } else if (formCompanyIds.includes('*')) {
        setFormCompanyIds(data.companies.length > 0 ? [data.companies[0].id] : []);
      }
    }
  };

  // Change Role Handler with confirmation when promoting to Master
  const handleRoleChange = (newRole: UserRole) => {
    if (newRole === 'MASTER' && formRole !== 'MASTER') {
      setShowMasterPromotionConfirm(true);
      return;
    }
    setFormRole(newRole);
    if (newRole === 'MASTER') {
      setFormPermissions(getFullPermissions());
      setFormCompanyIds(['*']);
    } else {
      setFormPermissions(getDefaultRolePermissions(newRole));
      if (formCompanyIds.includes('*')) {
        setFormCompanyIds(data.companies.length > 0 ? [data.companies[0].id] : []);
      }
    }
  };

  // Toggle company selection in form
  const handleToggleCompany = (companyId: string) => {
    if (formRole === 'MASTER') return; // Master always has all companies
    if (formCompanyIds.includes(companyId)) {
      setFormCompanyIds(formCompanyIds.filter((id) => id !== companyId));
    } else {
      setFormCompanyIds([...formCompanyIds, companyId]);
    }
  };

  // Select all or deselect all companies
  const handleSelectAllCompanies = () => {
    if (formCompanyIds.length === data.companies.length) {
      setFormCompanyIds([]);
    } else {
      setFormCompanyIds(data.companies.map((c) => c.id));
    }
  };

  // Toggle module permission action
  const handleToggleModulePermission = (
    module: AppModule,
    action: 'can_view' | 'can_create' | 'can_edit' | 'can_delete'
  ) => {
    if (formRole === 'MASTER') return; // Master has full permissions
    setFormPermissions((prev) => {
      const current = prev[module] || {
        can_view: false,
        can_create: false,
        can_edit: false,
        can_delete: false,
      };
      const updatedValue = !current[action];

      // If disabling view, disable all other sub-actions
      let updatedModule: ModulePermission;
      if (action === 'can_view' && !updatedValue) {
        updatedModule = { can_view: false, can_create: false, can_edit: false, can_delete: false };
      } else if (action !== 'can_view' && updatedValue) {
        // If enabling create/edit/delete, automatically enable view
        updatedModule = { ...current, [action]: true, can_view: true };
      } else {
        updatedModule = { ...current, [action]: updatedValue };
      }

      return {
        ...prev,
        [module]: updatedModule,
      };
    });
  };

  // Toggle all permissions for a module
  const handleToggleEntireModule = (module: AppModule) => {
    if (formRole === 'MASTER') return;
    const current = formPermissions[module];
    const isFullyEnabled =
      current &&
      current.can_view &&
      current.can_create &&
      current.can_edit &&
      current.can_delete;

    setFormPermissions((prev) => ({
      ...prev,
      [module]: isFullyEnabled
        ? { can_view: false, can_create: false, can_edit: false, can_delete: false }
        : { can_view: true, can_create: true, can_edit: true, can_delete: true },
    }));
  };

  // Save Form (Create or Update)
  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formEmail.trim()) {
      showToast('Nome e e-mail são obrigatórios.', 'warning');
      return;
    }

    if (formRole !== 'MASTER' && formCompanyIds.length === 0) {
      showToast(
        'Vincule pelo menos uma empresa ao usuário ou defina o perfil como MASTER.',
        'warning'
      );
      return;
    }

    if (editingUserId) {
      updateUserAccount(editingUserId, {
        name: formName.trim(),
        email: formEmail.trim(),
        username: formUsername.trim() || undefined,
        role: formRole,
        company_ids: formRole === 'MASTER' ? ['*'] : formCompanyIds,
        permissions: formRole === 'MASTER' ? getFullPermissions() : formPermissions,
        status: formStatus,
        ...(formPassword ? { password_hash: formPassword } : {}),
      });
      setIsModalOpen(false);
    } else {
      // Check duplicate email
      if (users.some((u) => u.email.toLowerCase() === formEmail.trim().toLowerCase())) {
        showToast('Já existe um usuário cadastrado com este e-mail.', 'error');
        return;
      }

      addUser({
        name: formName.trim(),
        email: formEmail.trim(),
        username: formUsername.trim() || undefined,
        role: formRole,
        company_ids: formRole === 'MASTER' ? ['*'] : formCompanyIds,
        permissions: formRole === 'MASTER' ? getFullPermissions() : formPermissions,
        status: formStatus,
        password_hash: formPassword || '123456',
      });
      setIsModalOpen(false);
    }
  };

  // Confirm Delete
  const handleDeleteUser = (userAccount: UserAccount) => {
    if (userAccount.email.toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase()) {
      showToast('O Administrador Master principal não pode ser excluído.', 'error');
      return;
    }

    requestDeleteConfirm({
      title: 'Excluir Usuário',
      message: `Tem certeza de que deseja excluir o usuário "${userAccount.name}" (${userAccount.email})? O acesso será revogado imediatamente.`,
      onConfirm: () => {
        deleteUserAccount(userAccount.id);
      },
    });
  };

  // Handle password reset
  const handleConfirmPasswordReset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetModalUser) return;
    const pwd = newPasswordInput.trim() || '123456';
    resetUserPassword(resetModalUser.id, pwd);
    setResetModalUser(null);
    setNewPasswordInput('');
  };

  // Filtered Users List
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // Search
      const searchMatch =
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase());
      if (!searchMatch) return false;

      // Role Filter
      if (roleFilter !== 'all' && u.role.toUpperCase() !== roleFilter.toUpperCase()) {
        return false;
      }

      // Status Filter
      if (statusFilter !== 'all' && (u.status || 'active') !== statusFilter) {
        return false;
      }

      // Company Filter
      if (companyFilter !== 'all') {
        if (u.role === 'MASTER' || (u.company_ids && u.company_ids.includes('*'))) {
          return true;
        }
        if (!u.company_ids || !u.company_ids.includes(companyFilter)) {
          return false;
        }
      }

      return true;
    });
  }, [users, searchTerm, roleFilter, companyFilter, statusFilter]);

  return (
    <div id="users-management-view" className="space-y-6">
      {/* Header with Title and Action */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-lg">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Usuários e Permissões</h1>
              <p className="text-sm text-slate-500">
                Controle de acesso por empresa, perfis (Master, Gerente, Operador) e segurança granular (RLS)
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            id="btn-view-activity-logs"
            onClick={() => setActiveTab('activity-logs')}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg transition-colors"
          >
            <ShieldCheck className="w-4 h-4 text-slate-600" />
            Ver Logs de Auditoria
          </button>

          {isMasterUser && (
            <button
              id="btn-new-user"
              onClick={handleOpenCreateModal}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg shadow-sm transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              + Novo Usuário
            </button>
          )}
        </div>
      </div>

      {/* Interactive Quick-Test Bar */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 p-5 rounded-xl text-white shadow-sm border border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 text-indigo-300 rounded-lg border border-indigo-500/30">
              <Sparkles className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Simulação e Teste Imediato de Perfis</h2>
              <p className="text-xs text-indigo-200">
                Alterne instantaneamente o usuário ativo para testar a restrição de empresas e permissões na prática
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {users.map((u) => {
              const isCurrent = currentUser?.id === u.id;
              return (
                <button
                  key={u.id}
                  id={`btn-switch-user-${u.id}`}
                  onClick={() => switchActiveUser(u)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    isCurrent
                      ? 'bg-indigo-600 text-white ring-2 ring-indigo-400 font-semibold'
                      : 'bg-white/10 hover:bg-white/20 text-slate-200'
                  }`}
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>{u.name}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] uppercase ${
                      u.role === 'MASTER'
                        ? 'bg-amber-500/30 text-amber-300'
                        : u.role === 'GERENTE'
                        ? 'bg-blue-500/30 text-blue-300'
                        : 'bg-emerald-500/30 text-emerald-300'
                    }`}
                  >
                    {u.role}
                  </span>
                  {isCurrent && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Pending Approvals Notice Banner */}
      {isMasterUser && pendingUsers.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-900 dark:text-amber-200">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-500/20 rounded-lg text-amber-600 dark:text-amber-300">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-amber-950 dark:text-amber-100">
                {pendingUsers.length} usuário(s) aguardando aprovação
              </h3>
              <p className="text-xs text-amber-800 dark:text-amber-300 mt-0.5">
                Novas contas cadastradas publicamente necessitam de vínculo a empresas e liberação de acesso.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-amber-700 dark:text-amber-300 font-medium">
              Clique em &quot;Editar&quot; ou no botão &quot;Aprovar&quot; para liberar
            </span>
          </div>
        </div>
      )}

      {/* Security & Access Banner */}
      {!isMasterUser && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 text-amber-900">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm">
            <span className="font-semibold">Modo de Acesso Restrito:</span> Você está logado como{' '}
            <strong className="text-amber-950">{currentUser?.name}</strong> (Perfil: {currentUser?.role}). O
            gerenciamento e edição de usuários são exclusivos do perfil <strong className="text-amber-950">MASTER</strong>.
          </div>
        </div>
      )}

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            id="input-search-users"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome ou e-mail..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Role Filter */}
          <select
            id="select-filter-role"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">Todos os Perfis</option>
            <option value="MASTER">Master (Acesso Total)</option>
            <option value="GERENTE">Gerente</option>
            <option value="OPERADOR">Operador</option>
          </select>

          {/* Company Filter */}
          <select
            id="select-filter-company"
            value={companyFilter}
            onChange={(e) => setCompanyFilter(e.target.value)}
            className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
            className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">Todos os Status</option>
            <option value="active">Ativos</option>
            <option value="inactive">Inativos</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4">Usuário</th>
                <th className="py-3.5 px-4">Perfil</th>
                <th className="py-3.5 px-4">Empresas Vinculadas</th>
                <th className="py-3.5 px-4">Módulos Liberados</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Nenhum usuário encontrado com os filtros aplicados.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isCurrent = currentUser?.id === u.id;
                  const isMaster =
                    u.role === 'MASTER' ||
                    u.role === 'admin' ||
                    u.email.toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase();

                  // Assigned Companies List
                  const userCompanies = isMaster
                    ? data.companies
                    : data.companies.filter((c) => (u.company_ids || []).includes(c.id));

                  // Count active permissions
                  const perms = u.permissions || (isMaster ? getFullPermissions() : getDefaultRolePermissions(u.role));
                  const activeModulesCount = Object.keys(perms).filter(
                    (k) => perms[k as AppModule]?.can_view
                  ).length;

                  return (
                    <tr
                      key={u.id}
                      id={`user-row-${u.id}`}
                      className={`hover:bg-slate-50 transition-colors ${
                        isCurrent ? 'bg-indigo-50/40' : ''
                      }`}
                    >
                      {/* Name & Email */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs ${
                              isMaster
                                ? 'bg-amber-100 text-amber-700 ring-2 ring-amber-400'
                                : u.role === 'GERENTE'
                                ? 'bg-blue-100 text-blue-700 ring-1 ring-blue-300'
                                : 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-300'
                            }`}
                          >
                            {u.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                              {u.name}
                              {isCurrent && (
                                <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded">
                                  Você
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-500">{u.email}</div>
                          </div>
                        </div>
                      </td>

                      {/* Profile / Role Badge */}
                      <td className="py-4 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                            isMaster
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : u.role === 'GERENTE'
                              ? 'bg-blue-100 text-blue-800 border border-blue-200'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          }`}
                        >
                          <Shield className="w-3 h-3" />
                          {u.role.toUpperCase()}
                        </span>
                      </td>

                      {/* Linked Companies */}
                      <td className="py-4 px-4">
                        {isMaster ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-xs font-medium">
                            <Building2 className="w-3 h-3 text-indigo-500" />
                            Todas as Empresas ({data.companies.length})
                          </span>
                        ) : userCompanies.length === 0 ? (
                          <span className="text-xs text-rose-500 font-medium flex items-center gap-1">
                            <XCircle className="w-3.5 h-3.5" />
                            Nenhuma empresa vinculada
                          </span>
                        ) : (
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {userCompanies.map((comp) => (
                              <span
                                key={comp.id}
                                className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[11px]"
                              >
                                <span
                                  className="w-1.5 h-1.5 rounded-full"
                                  style={{ backgroundColor: comp.color || '#4f46e5' }}
                                />
                                {comp.name.split('-')[0].trim()}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>

                      {/* Module Permissions Count */}
                      <td className="py-4 px-4">
                        {isMaster ? (
                          <span className="text-xs text-amber-700 font-semibold bg-amber-50 px-2 py-1 rounded border border-amber-200">
                            Acesso Irrestrito (Todos)
                          </span>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-xs font-medium">
                              {activeModulesCount} de {ALL_APP_MODULES.length} módulos
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4 text-center">
                        {u.status === 'pending' ? (
                          <span
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-700"
                            title="Conta aguardando aprovação e vínculo de empresas"
                          >
                            <Clock className="w-3 h-3 text-amber-600 animate-pulse" />
                            Pendente
                          </span>
                        ) : isMasterUser && !isMaster ? (
                          <button
                            id={`btn-toggle-status-${u.id}`}
                            onClick={() => toggleUserStatus(u.id)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                              (u.status || 'active') === 'active'
                                ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
                            }`}
                          >
                            {(u.status || 'active') === 'active' ? (
                              <>
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                Ativo
                              </>
                            ) : (
                              <>
                                <XCircle className="w-3 h-3 text-slate-500" />
                                Inativo
                              </>
                            )}
                          </button>
                        ) : (
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                              (u.status || 'active') === 'active'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}
                          >
                            {(u.status || 'active') === 'active' ? 'Ativo' : 'Inativo'}
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Quick Approve Button if Pending */}
                          {isMasterUser && u.status === 'pending' && (
                            <button
                              id={`btn-quick-approve-${u.id}`}
                              onClick={() => {
                                handleOpenEditModal(u);
                                setFormStatus('active');
                              }}
                              title="Aprovar e Liberar Empresas"
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-colors shadow-sm cursor-pointer"
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                              Aprovar
                            </button>
                          )}

                          {/* Quick test as user button */}
                          {u.status !== 'pending' && (
                            <button
                              id={`btn-login-as-${u.id}`}
                              onClick={() => switchActiveUser(u)}
                              title="Entrar / Simular visão deste usuário"
                              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors cursor-pointer"
                            >
                              <LogIn className="w-4 h-4" />
                            </button>
                          )}

                          {isMasterUser && (
                            <>
                              {/* Reset Password */}
                              <button
                                id={`btn-reset-pwd-${u.id}`}
                                onClick={() => {
                                  setResetModalUser(u);
                                  setNewPasswordInput('123456');
                                }}
                                title="Redefinir Senha"
                                className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors"
                              >
                                <Key className="w-4 h-4" />
                              </button>

                              {/* Edit User & Permissions */}
                              <button
                                id={`btn-edit-user-${u.id}`}
                                onClick={() => handleOpenEditModal(u)}
                                title="Editar Usuário e Permissões"
                                className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>

                              {/* Delete User */}
                              {(!isMaster || activeMastersCount > 1) && u.id !== currentUser.id && (
                                <button
                                  id={`btn-delete-user-${u.id}`}
                                  onClick={() => handleDeleteUser(u)}
                                  title="Excluir Usuário"
                                  className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE / EDIT USER MODAL */}
      {isModalOpen && (
        <div
          id="modal-user-form"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
        >
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                  {editingUserId ? <Edit2 className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    {editingUserId ? 'Editar Usuário e Permissões' : 'Cadastrar Novo Usuário'}
                  </h2>
                  <p className="text-xs text-slate-500">
                    Configure os dados cadastrais, empresas liberadas e matriz de acesso modular
                  </p>
                </div>
              </div>
              <button
                id="btn-close-user-modal"
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveUser} className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Presets Selector */}
              {formRole !== 'MASTER' && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-indigo-600" />
                      Modelos Rápidos de Permissão (Presets)
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                    {PERMISSION_PRESETS.map((preset) => (
                      <button
                        type="button"
                        key={preset.id}
                        onClick={() => handleApplyPreset(preset.id)}
                        className={`p-2 rounded-lg text-left border transition-all text-xs flex flex-col justify-between ${
                          selectedPreset === preset.id
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm font-semibold'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-300'
                        }`}
                      >
                        <span className="font-medium truncate">{preset.name}</span>
                        <span
                          className={`text-[10px] mt-1 ${
                            selectedPreset === preset.id ? 'text-indigo-100' : 'text-slate-400'
                          }`}
                        >
                          {preset.role}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Basic User Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    id="input-form-name"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Ex: João da Silva"
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    E-mail de Acesso *
                  </label>
                  <input
                    type="email"
                    id="input-form-email"
                    required
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="Ex: joao@empresa.com.br"
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {editingUserId ? 'Alterar Senha (opcional)' : 'Senha Inicial *'}
                  </label>
                  <input
                    type="text"
                    id="input-form-password"
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    placeholder={editingUserId ? 'Deixe em branco para manter a atual' : '123456'}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Perfil de Usuário *
                  </label>
                  <select
                    id="select-form-role"
                    value={formRole}
                    onChange={(e) => handleRoleChange(e.target.value as UserRole)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none font-medium"
                  >
                    <option value="MASTER">MASTER (Acesso Global a Todas as Empresas)</option>
                    <option value="GERENTE">GERENTE (Empresas Selecionadas + Gestão)</option>
                    <option value="OPERADOR">OPERADOR (Empresas Selecionadas + Operacional)</option>
                  </select>
                </div>
              </div>

              {/* Status toggle */}
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-slate-700">Status do Usuário:</span>
                <button
                  type="button"
                  id="btn-form-toggle-status"
                  onClick={() => setFormStatus(formStatus === 'active' ? 'inactive' : 'active')}
                  className={`px-3 py-1 text-xs font-semibold rounded-full border transition-colors ${
                    formStatus === 'active'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                      : 'bg-rose-50 text-rose-700 border-rose-300'
                  }`}
                >
                  {formStatus === 'active' ? 'Ativo (Pode Acessar)' : 'Inativo (Acesso Bloqueado)'}
                </button>
              </div>

              {/* Linked Companies Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-indigo-600" />
                      Empresas Vinculadas ao Usuário
                    </h3>
                    <p className="text-xs text-slate-500">
                      O usuário visualizará exclusivamente os dados das empresas selecionadas
                    </p>
                  </div>

                  {formRole !== 'MASTER' && (
                    <button
                      type="button"
                      id="btn-select-all-companies"
                      onClick={handleSelectAllCompanies}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
                    >
                      {formCompanyIds.length === data.companies.length
                        ? 'Desmarcar Todas'
                        : 'Selecionar Todas as 8'}
                    </button>
                  )}
                </div>

                {formRole === 'MASTER' ? (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>
                      O perfil <strong>MASTER</strong> tem acesso automático e irrestrito a todas as{' '}
                      <strong>{data.companies.length} empresas</strong> do grupo.
                    </span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
                    {data.companies.map((comp) => {
                      const isSelected = formCompanyIds.includes(comp.id);
                      return (
                        <div
                          key={comp.id}
                          onClick={() => handleToggleCompany(comp.id)}
                          className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                            isSelected
                              ? 'bg-indigo-50/60 border-indigo-400 ring-1 ring-indigo-400'
                              : 'bg-white border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2 overflow-hidden">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: comp.color || '#4f46e5' }}
                            />
                            <div className="truncate">
                              <div className="text-xs font-semibold text-slate-900 truncate">
                                {comp.name}
                              </div>
                              <div className="text-[10px] text-slate-500 truncate">
                                {comp.category || 'Geral'}
                              </div>
                            </div>
                          </div>
                          <div
                            className={`w-4 h-4 rounded flex items-center justify-center text-white text-[10px] shrink-0 ${
                              isSelected ? 'bg-indigo-600' : 'border border-slate-300 bg-white'
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Module Granular Permissions Matrix */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                      <Lock className="w-4 h-4 text-indigo-600" />
                      Permissões Granulares por Módulo (CRUD)
                    </h3>
                    <p className="text-xs text-slate-500">
                      Defina individualmente os privilégios de visualização, criação, edição e exclusão
                    </p>
                  </div>
                </div>

                {formRole === 'MASTER' ? (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>
                      O perfil <strong>MASTER</strong> possui todas as permissões ativas em todos os módulos.
                    </span>
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-3">Módulo</th>
                          <th className="py-2.5 px-2 text-center">Visualizar</th>
                          <th className="py-2.5 px-2 text-center">Criar</th>
                          <th className="py-2.5 px-2 text-center">Editar</th>
                          <th className="py-2.5 px-2 text-center">Excluir</th>
                          <th className="py-2.5 px-3 text-right">Ação Rápida</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {ALL_APP_MODULES.map((mod) => {
                          const perm = formPermissions[mod.id] || {
                            can_view: false,
                            can_create: false,
                            can_edit: false,
                            can_delete: false,
                          };

                          return (
                            <tr key={mod.id} className="hover:bg-slate-50/60">
                              <td className="py-2.5 px-3">
                                <div className="font-semibold text-slate-900">{mod.label}</div>
                                <div className="text-[10px] text-slate-400">{mod.description}</div>
                              </td>

                              {/* View */}
                              <td className="py-2.5 px-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={perm.can_view}
                                  onChange={() => handleToggleModulePermission(mod.id, 'can_view')}
                                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                                />
                              </td>

                              {/* Create */}
                              <td className="py-2.5 px-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={perm.can_create}
                                  onChange={() => handleToggleModulePermission(mod.id, 'can_create')}
                                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                                />
                              </td>

                              {/* Edit */}
                              <td className="py-2.5 px-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={perm.can_edit}
                                  onChange={() => handleToggleModulePermission(mod.id, 'can_edit')}
                                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                                />
                              </td>

                              {/* Delete */}
                              <td className="py-2.5 px-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={perm.can_delete}
                                  onChange={() => handleToggleModulePermission(mod.id, 'can_delete')}
                                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                                />
                              </td>

                              {/* Quick toggle module */}
                              <td className="py-2.5 px-3 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleToggleEntireModule(mod.id)}
                                  className="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium"
                                >
                                  {perm.can_view && perm.can_create && perm.can_edit && perm.can_delete
                                    ? 'Desativar Tudo'
                                    : 'Liberar Total'}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Modal Footer Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  id="btn-save-user-submit"
                  className="px-5 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors"
                >
                  {editingUserId ? 'Salvar Alterações' : 'Criar Usuário'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PASSWORD RESET MODAL */}
      {resetModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 border border-slate-200 animate-in fade-in zoom-in-95 duration-150 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Redefinir Senha</h3>
                <p className="text-xs text-slate-500">
                  Defina a nova senha para o usuário <strong>{resetModalUser.name}</strong>
                </p>
              </div>
            </div>

            <form onSubmit={handleConfirmPasswordReset} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nova Senha
                </label>
                <input
                  type="text"
                  id="input-reset-password-value"
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                  placeholder="123456"
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setResetModalUser(null)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  id="btn-confirm-password-reset"
                  className="px-4 py-1.5 text-xs font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-sm"
                >
                  Confirmar Redefinição
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* MODAL DE CONFIRMAÇÃO PARA PROMOÇÃO A MASTER */}
      {showMasterPromotionConfirm && (
        <div
          id="modal-confirm-master-promotion"
          className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs"
        >
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-amber-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3.5 mb-4">
              <div className="p-3 bg-amber-50 text-amber-600 rounded-xl border border-amber-200">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Promover para Administrador Master</h3>
                <p className="text-xs text-amber-700 font-medium">Elevação de Acesso Global</p>
              </div>
            </div>

            <p className="text-sm text-slate-600 mb-6 leading-relaxed">
              Este usuário terá <strong>acesso administrativo completo</strong> a todas as empresas e informações do sistema. Deseja continuar?
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                id="btn-cancel-master-promotion"
                onClick={() => {
                  setShowMasterPromotionConfirm(false);
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                id="btn-confirm-master-promotion"
                onClick={() => {
                  setFormRole('MASTER');
                  setFormPermissions(getFullPermissions());
                  setFormCompanyIds(['*']);
                  setShowMasterPromotionConfirm(false);
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-md shadow-indigo-600/20 cursor-pointer"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
