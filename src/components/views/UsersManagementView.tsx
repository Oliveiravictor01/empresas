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
  X,
  AlertTriangle,
  Info,
  ShieldCheck,
  ShieldAlert,
  UserPlus,
  Lock,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { UserAccount, UserRole, PermissionsMap, AppModule, PermissionAction, ModulePermission } from '../../types';
import { MASTER_ADMIN_EMAIL } from '../../context/AppContext';
import {
  fetchSupabaseUsersWithRelations,
  syncUserUpdateToSupabase,
  createManagedUserInSupabase,
} from '../../lib/supabase';
import {
  getFullPermissions,
  getDefaultRolePermissions,
  ALL_APP_MODULES,
  PERMISSION_PRESETS,
} from '../../lib/permissions';

const ROLE_OPTIONS: UserRole[] = ['MASTER', 'GERENTE', 'OPERADOR'];

const ROLE_INFO: Record<
  'MASTER' | 'GERENTE' | 'OPERADOR',
  { title: string; summary: string; color: string }
> = {
  MASTER: {
    title: 'MASTER',
    summary: 'Acesso total: todas as empresas, usuários, configurações e módulos.',
    color: 'purple',
  },
  GERENTE: {
    title: 'GERENTE',
    summary: 'Operação e financeiro nas empresas vinculadas. Sem gestão de usuários e do banco.',
    color: 'blue',
  },
  OPERADOR: {
    title: 'OPERADOR',
    summary: 'Lançamentos do dia a dia (vendas, estoque, clientes). Sem exclusão nem financeiro.',
    color: 'emerald',
  },
};

function PermissionsMatrix({
  permissions,
  onChange,
  locked,
}: {
  permissions: PermissionsMap;
  onChange: (next: PermissionsMap) => void;
  locked?: boolean;
}) {
  const groups = useMemo(() => {
    const map = new Map<string, typeof ALL_APP_MODULES>();
    ALL_APP_MODULES.forEach((m) => {
      const list = map.get(m.group) || [];
      list.push(m);
      map.set(m.group, list);
    });
    return Array.from(map.entries());
  }, []);

  const toggle = (module: AppModule, action: PermissionAction) => {
    if (locked) return;
    const current: ModulePermission = permissions[module] || {
      can_view: false,
      can_create: false,
      can_edit: false,
      can_delete: false,
    };
    const key = `can_${action}` as const;
    const nextVal = !current[key];
    const updated: ModulePermission = { ...current, [key]: nextVal };
    if (action === 'view' && !nextVal) {
      updated.can_create = false;
      updated.can_edit = false;
      updated.can_delete = false;
    }
    if (action !== 'view' && nextVal) {
      updated.can_view = true;
    }
    onChange({ ...permissions, [module]: updated });
  };

  const actions: { id: PermissionAction; label: string }[] = [
    { id: 'view', label: 'Ver' },
    { id: 'create', label: 'Criar' },
    { id: 'edit', label: 'Editar' },
    { id: 'delete', label: 'Excluir' },
  ];

  return (
    <div className="space-y-3">
      {groups.map(([group, modules]) => (
        <div key={group}>
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">{group}</p>
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <table className="w-full text-[11px]">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500">
                <tr>
                  <th className="text-left py-1.5 px-2 font-bold">Módulo</th>
                  {actions.map((a) => (
                    <th key={a.id} className="py-1.5 px-1 font-bold text-center w-14">
                      {a.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {modules.map((m) => {
                  const perm = permissions[m.id];
                  return (
                    <tr key={m.id} className="bg-white dark:bg-slate-900">
                      <td className="py-1.5 px-2">
                        <div className="font-bold text-slate-800 dark:text-slate-200">{m.label}</div>
                        <div className="text-[10px] text-slate-400 leading-tight">{m.description}</div>
                      </td>
                      {actions.map((a) => {
                        const on = Boolean(perm?.[`can_${a.id}`]);
                        return (
                          <td key={a.id} className="text-center">
                            <button
                              type="button"
                              disabled={locked}
                              onClick={() => toggle(m.id, a.id)}
                              className={`w-6 h-6 rounded-md border text-[10px] font-black transition-colors ${
                                locked ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'
                              } ${
                                on
                                  ? 'bg-indigo-600 border-indigo-600 text-white'
                                  : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-300'
                              }`}
                              title={`${a.label} em ${m.label}`}
                            >
                              {on ? '✓' : ''}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

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

  const [supabaseUsers, setSupabaseUsers] = useState<UserAccount[]>(() => data.users || []);
  const [isLoading, setIsLoading] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [companyFilter, setCompanyFilter] = useState<string>('all');

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formPasswordConfirm, setFormPasswordConfirm] = useState('');
  const [formRole, setFormRole] = useState<UserRole>('OPERADOR');
  const [formStatus, setFormStatus] = useState<'active' | 'inactive'>('active');
  const [formCompanyIds, setFormCompanyIds] = useState<string[]>([]);
  const [formPermissions, setFormPermissions] = useState<PermissionsMap>(() => getDefaultRolePermissions('OPERADOR'));
  const [isSaving, setIsSaving] = useState(false);

  const getSupabaseAuthUsersUrl = useCallback(() => {
    if (!supabaseConfig.url) return 'https://supabase.com/dashboard';
    const cleanUrl = supabaseConfig.url.replace(/^https?:\/\//, '');
    const projectRef = cleanUrl.split('.')[0];
    if (projectRef && projectRef.length > 5) {
      return `https://supabase.com/dashboard/project/${projectRef}/auth/users`;
    }
    return 'https://supabase.com/dashboard';
  }, [supabaseConfig.url]);

  const handleOpenSupabaseUsers = () => {
    window.open(getSupabaseAuthUsersUrl(), '_blank', 'noopener,noreferrer');
  };

  const loadUsersFromSupabase = useCallback(
    async (showFeedback = false) => {
      setIsLoading(true);
      try {
        const res = await fetchSupabaseUsersWithRelations(supabaseConfig);
        if (res.success && res.users) {
          setSupabaseUsers(res.users);
          setLastRefreshedAt(new Date());
          setData((prev) => ({
            ...prev,
            users: res.users!,
            ...(res.companies && res.companies.length > 0 ? { companies: res.companies } : {}),
          }));
          if (showFeedback) {
            showToast(`${res.users.length} usuário(s) sincronizado(s) com o Supabase!`, 'success');
          }
        } else if (showFeedback) {
          showToast(res.message || 'Não foi possível carregar a lista do Supabase.', 'warning');
        }
      } catch (err: any) {
        console.warn('Erro ao carregar usuários:', err);
        if (showFeedback) {
          showToast('Erro ao consultar tabela profiles no Supabase.', 'error');
        }
      } finally {
        setIsLoading(false);
      }
    },
    [supabaseConfig, setData, showToast]
  );

  useEffect(() => {
    if (isMasterUser) {
      loadUsersFromSupabase(false);
    }
  }, [isMasterUser, loadUsersFromSupabase]);

  const applyRole = (role: UserRole) => {
    setFormRole(role);
    if (role === 'MASTER') {
      setFormCompanyIds(['*']);
      setFormPermissions(getFullPermissions());
    } else {
      if (formCompanyIds.includes('*')) {
        setFormCompanyIds(data.companies.length > 0 ? [data.companies[0].id] : []);
      }
      setFormPermissions(getDefaultRolePermissions(role));
    }
  };

  const resetForm = (role: UserRole = 'OPERADOR') => {
    setFormName('');
    setFormEmail('');
    setFormPassword('');
    setFormPasswordConfirm('');
    setFormStatus('active');
    setFormRole(role);
    setFormCompanyIds(data.companies.length > 0 ? [data.companies[0].id] : []);
    setFormPermissions(getDefaultRolePermissions(role));
    setEditingUser(null);
  };

  const handleOpenCreate = () => {
    resetForm('OPERADOR');
    setIsCreateModalOpen(true);
  };

  const handleOpenEdit = (targetUser: UserAccount) => {
    setEditingUser(targetUser);
    setFormName(targetUser.name);
    setFormEmail(targetUser.email);
    setFormPassword('');
    setFormPasswordConfirm('');
    setFormRole(targetUser.role);
    setFormStatus((targetUser.status as 'active' | 'inactive') || 'active');
    setFormCompanyIds(targetUser.company_ids || []);
    setFormPermissions(
      targetUser.permissions ||
        (targetUser.role === 'MASTER' || targetUser.is_master
          ? getFullPermissions()
          : getDefaultRolePermissions(targetUser.role))
    );
    setIsEditModalOpen(true);
  };

  const handleToggleCompany = (companyId: string) => {
    if (formRole === 'MASTER') return;
    if (formCompanyIds.includes(companyId)) {
      setFormCompanyIds(formCompanyIds.filter((id) => id !== companyId));
    } else {
      setFormCompanyIds([...formCompanyIds, companyId]);
    }
  };

  const handleSelectAllCompanies = () => {
    if (formCompanyIds.length === data.companies.length) {
      setFormCompanyIds([]);
    } else {
      setFormCompanyIds(data.companies.map((c) => c.id));
    }
  };

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

    const isEditingMainMaster =
      editingUser.email.toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase();
    if (isEditingMainMaster && formRole !== 'MASTER') {
      showToast('Não é permitido revogar a função MASTER do administrador principal.', 'error');
      return;
    }

    const isTargetMaster =
      editingUser.role === 'MASTER' ||
      editingUser.is_master ||
      editingUser.email.toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase();
    const activeMasters = supabaseUsers.filter(
      (u) =>
        (u.role === 'MASTER' || u.is_master || u.email.toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase()) &&
        (u.status === 'active' || !u.status)
    );
    if (isTargetMaster && activeMasters.length <= 1 && activeMasters.some((m) => m.id === editingUser.id)) {
      if (formRole !== 'MASTER') {
        showToast('É necessário manter pelo menos um administrador Master ativo.', 'error');
        return;
      }
      if (formStatus === 'inactive') {
        showToast('É necessário manter pelo menos um administrador Master ativo.', 'error');
        return;
      }
    }

    setIsSaving(true);
    try {
      const isMasterRole = formRole === 'MASTER';
      const finalCompanyIds = isMasterRole ? ['*'] : formCompanyIds;
      const finalPermissions = isMasterRole ? getFullPermissions() : formPermissions;

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

      const updatedUser: UserAccount = {
        ...editingUser,
        name: formName.trim(),
        role: formRole,
        is_master: isMasterRole,
        status: formStatus,
        company_ids: finalCompanyIds,
        permissions: finalPermissions,
      };

      setSupabaseUsers((prev) => prev.map((u) => (u.id === editingUser.id ? updatedUser : u)));
      setData((prev) => ({
        ...prev,
        users: (prev.users || []).map((u) => (u.id === editingUser.id ? updatedUser : u)),
      }));

      logActivity({
        module: 'Usuários',
        action: 'update',
        description: `Atualizado usuário "${updatedUser.name}" (${updatedUser.email}): função ${formRole}, permissões e empresas.`,
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

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      showToast('Informe o nome completo.', 'warning');
      return;
    }
    if (!formEmail.trim() || !formEmail.includes('@')) {
      showToast('Informe um e-mail válido.', 'warning');
      return;
    }
    if (formPassword.length < 6) {
      showToast('A senha deve ter pelo menos 6 caracteres.', 'warning');
      return;
    }
    if (formPassword !== formPasswordConfirm) {
      showToast('A confirmação de senha não confere.', 'warning');
      return;
    }
    if (formRole !== 'MASTER' && formCompanyIds.length === 0) {
      showToast('Vincule pelo menos 1 empresa ou escolha MASTER.', 'warning');
      return;
    }

    setIsSaving(true);
    try {
      const isMasterRole = formRole === 'MASTER';
      const res = await createManagedUserInSupabase(
        {
          name: formName.trim(),
          email: formEmail.trim().toLowerCase(),
          password: formPassword,
          role: formRole,
          company_ids: isMasterRole ? ['*'] : formCompanyIds,
          permissions: isMasterRole ? getFullPermissions() : formPermissions,
          status: formStatus,
        },
        supabaseConfig
      );

      if (!res.success) {
        showToast(res.message || 'Não foi possível criar o usuário.', 'error');
        return;
      }

      const created: UserAccount = {
        id: res.userId || crypto.randomUUID(),
        name: formName.trim(),
        email: formEmail.trim().toLowerCase(),
        role: formRole,
        is_master: isMasterRole,
        status: formStatus,
        company_ids: isMasterRole ? ['*'] : formCompanyIds,
        permissions: isMasterRole ? getFullPermissions() : formPermissions,
        created_at: new Date().toISOString(),
      };

      setSupabaseUsers((prev) => {
        if (prev.some((u) => u.id === created.id || u.email.toLowerCase() === created.email)) {
          return prev.map((u) => (u.id === created.id || u.email.toLowerCase() === created.email ? { ...u, ...created } : u));
        }
        return [...prev, created];
      });
      setData((prev) => ({
        ...prev,
        users: [...(prev.users || []).filter((u) => u.id !== created.id && u.email.toLowerCase() !== created.email), created],
      }));

      logActivity({
        module: 'Usuários',
        action: 'create',
        description: `Criado usuário "${formName.trim()}" (${formEmail.trim()}) com função ${formRole}.`,
        recordId: res.userId,
      });

      showToast(res.message || 'Usuário criado. Se o e-mail de confirmação estiver ativo no Auth, o acesso só libera após confirmar.', 'success');
      setIsCreateModalOpen(false);
      resetForm();
      await loadUsersFromSupabase(false);
    } catch (err: any) {
      showToast(`Erro ao criar: ${err.message || 'Falha de conexão'}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async (userAccount: UserAccount) => {
    if (userAccount.email.toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase()) {
      showToast('O Administrador Master principal não pode ser inativado.', 'error');
      return;
    }

    const nextStatus = userAccount.status === 'active' ? 'inactive' : 'active';
    const isTargetMaster =
      userAccount.role === 'MASTER' ||
      userAccount.is_master ||
      userAccount.email.toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase();
    if (nextStatus === 'inactive' && isTargetMaster) {
      const otherActiveMasters = supabaseUsers.filter(
        (u) =>
          u.id !== userAccount.id &&
          (u.role === 'MASTER' || u.is_master || u.email.toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase()) &&
          (u.status === 'active' || !u.status)
      );
      if (otherActiveMasters.length === 0) {
        showToast('É necessário manter pelo menos um administrador Master ativo.', 'error');
        return;
      }
    }
    try {
      await syncUserUpdateToSupabase(userAccount.id, { status: nextStatus }, supabaseConfig);
      setSupabaseUsers((prev) => prev.map((u) => (u.id === userAccount.id ? { ...u, status: nextStatus } : u)));
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

  const filteredUsers = useMemo(() => {
    return supabaseUsers.filter((u) => {
      const matchesSearch =
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.username && u.username.toLowerCase().includes(searchTerm.toLowerCase()));
      if (!matchesSearch) return false;

      if (roleFilter !== 'all') {
        const uRole = (u.role || '').toUpperCase();
        if (roleFilter === 'MASTER' && !(uRole === 'MASTER' || u.is_master)) return false;
        if (roleFilter === 'GERENTE' && uRole !== 'GERENTE') return false;
        if (roleFilter === 'OPERADOR' && uRole !== 'OPERADOR') return false;
      }

      if (statusFilter !== 'all') {
        const uStatus = u.status || 'active';
        if (uStatus !== statusFilter) return false;
      }

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

  const renderRoleAndCompanies = () => (
    <>
      <div>
        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Função / Papel no Sistema</label>
        <div className="grid grid-cols-3 gap-2">
          {ROLE_OPTIONS.map((role) => {
            const isSelected = formRole === role;
            return (
              <button
                key={role}
                type="button"
                onClick={() => applyRole(role)}
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
        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5">{ROLE_INFO[formRole as keyof typeof ROLE_INFO]?.summary}</p>
      </div>

      {formRole !== 'MASTER' ? (
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="font-bold text-slate-700 dark:text-slate-300">Empresas Vinculadas</label>
            <button type="button" onClick={handleSelectAllCompanies} className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline">
              {formCompanyIds.length === data.companies.length ? 'Desmarcar Todas' : 'Marcar Todas'}
            </button>
          </div>
          <div className="space-y-1.5 max-h-40 overflow-y-auto p-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
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
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color || '#4f46e5' }} />
                    <span className="font-bold text-slate-800 dark:text-slate-200">{c.name}</span>
                  </div>
                  <input type="checkbox" checked={isChecked} onChange={() => handleToggleCompany(c.id)} className="rounded text-indigo-600 focus:ring-indigo-500" />
                </label>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="p-3 bg-purple-50 dark:bg-purple-950/40 rounded-xl border border-purple-200 dark:border-purple-800/60 text-purple-900 dark:text-purple-200">
          <div className="flex items-center gap-2 font-bold mb-1">
            <Building2 className="w-4 h-4 text-purple-600" />
            <span>Acesso a todas as empresas</span>
          </div>
          <p className="text-[11px] text-purple-700 dark:text-purple-300">MASTER visualiza automaticamente todas as empresas e a matriz comparativa.</p>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5" />
            Permissões por módulo
          </label>
        </div>
        {formRole !== 'MASTER' && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {PERMISSION_PRESETS.filter((p) => p.role !== 'MASTER').map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => {
                  setFormRole(preset.role);
                  setFormPermissions(preset.getPermissions());
                }}
                className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-[10px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                title={preset.description}
              >
                {preset.name}
              </button>
            ))}
          </div>
        )}
        <div className="max-h-64 overflow-y-auto pr-1">
          <PermissionsMatrix
            permissions={formPermissions}
            onChange={setFormPermissions}
            locked={formRole === 'MASTER'}
          />
        </div>
        {formRole === 'MASTER' && (
          <p className="text-[11px] text-purple-600 dark:text-purple-300 mt-1">MASTER tem todas as permissões; a matriz fica bloqueada.</p>
        )}
      </div>
    </>
  );

  return (
    <div id="users-view" className="space-y-6">
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl border border-indigo-100 dark:border-indigo-900/50">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Usuários</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                {supabaseUsers.length} {supabaseUsers.length === 1 ? 'cadastrado' : 'cadastrados'}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Crie contas, defina função (Master, Gerente, Operador) e ajuste permissões por módulo.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            id="btn-refresh-users-supabase"
            onClick={() => loadUsersFromSupabase(true)}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition-all border border-slate-200 dark:border-slate-700 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-indigo-600' : ''}`} />
            <span>{isLoading ? 'Atualizando...' : 'Atualizar Lista'}</span>
          </button>
          <button
            id="btn-create-user"
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Novo usuário</span>
          </button>
          <button
            id="btn-manage-users-supabase"
            onClick={handleOpenSupabaseUsers}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
            title="Painel Auth do Supabase (confirmação de e-mail, senhas)"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Auth no Supabase</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {(Object.keys(ROLE_INFO) as Array<keyof typeof ROLE_INFO>).map((key) => {
          const info = ROLE_INFO[key];
          return (
            <div
              key={key}
              className={`p-4 rounded-2xl border bg-white dark:bg-slate-900 ${
                key === 'MASTER'
                  ? 'border-purple-200 dark:border-purple-900/50'
                  : key === 'GERENTE'
                    ? 'border-blue-200 dark:border-blue-900/50'
                    : 'border-emerald-200 dark:border-emerald-900/50'
              }`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <Shield
                  className={`w-4 h-4 ${
                    key === 'MASTER' ? 'text-purple-600' : key === 'GERENTE' ? 'text-blue-600' : 'text-emerald-600'
                  }`}
                />
                <h3 className="text-sm font-black text-slate-900 dark:text-white">{info.title}</h3>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">{info.summary}</p>
            </div>
          );
        })}
      </div>

      <div className="bg-indigo-50/80 dark:bg-indigo-950/30 text-slate-700 dark:text-slate-300 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-900/40 flex items-start gap-3">
        <Info className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
        <p className="text-xs leading-relaxed">
          Use <strong>Novo usuário</strong> para cadastrar e-mail, senha, empresas e permissões nesta tela. Modelos prontos
          (comercial, financeiro, estoque, somente leitura) aceleram o preenchimento da matriz. Se o projeto exigir
          confirmação de e-mail no Auth, o login só funciona depois que o usuário confirmar.
        </p>
      </div>

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
          <select
            id="select-filter-status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
          >
            <option value="all">Todos os Status</option>
            <option value="active">Ativos</option>
            <option value="inactive">Inativos</option>
            <option value="pending">Pendentes</option>
          </select>
        </div>
      </div>

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
                    <p className="text-[11px] text-slate-400 mt-1">Clique em &quot;Novo usuário&quot; para cadastrar.</p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isCurrent = currentUser?.id === u.id;
                  const isMaster =
                    u.role === 'MASTER' || u.is_master || u.email.toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase();
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
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                              isMaster
                                ? 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                                : u.role === 'GERENTE'
                                  ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                                  : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                            }`}
                          >
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
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate">{u.email}</div>
                          </div>
                        </div>
                      </td>
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
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => handleToggleStatus(u)}
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold cursor-pointer transition-colors ${
                            u.status === 'active' || !u.status
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-200'
                          }`}
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
                                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: c.color || '#4f46e5' }} />
                                <span className="truncate max-w-[120px]">{c.name}</span>
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
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
            <span>
              Sincronizado com <code>profiles</code>, <code>user_companies</code> e <code>user_permissions</code>
            </span>
            <span>Última atualização: {lastRefreshedAt.toLocaleTimeString('pt-BR')}</span>
          </div>
        )}
      </div>

      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-xl">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">Novo usuário</h2>
                  <p className="text-xs text-slate-500">Conta, empresas e permissões</p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateUser} className="space-y-4 pt-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Nome completo</label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white font-medium"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">E-mail de login</label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white font-medium"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Senha (mín. 6)</label>
                  <input
                    type="password"
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white font-medium"
                    required
                    minLength={6}
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Confirmar senha</label>
                  <input
                    type="password"
                    value={formPasswordConfirm}
                    onChange={(e) => setFormPasswordConfirm(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white font-medium"
                    required
                    minLength={6}
                  />
                </div>
              </div>
              {renderRoleAndCompanies()}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {isSaving ? 'Criando...' : 'Criar usuário'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isEditModalOpen && editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-xl">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">Editar acesso e permissões</h2>
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
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Nome completo</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white font-medium"
                  required
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Status da conta</label>
                <div className="flex gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="status" value="active" checked={formStatus === 'active'} onChange={() => setFormStatus('active')} />
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">Ativo</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="status" value="inactive" checked={formStatus === 'inactive'} onChange={() => setFormStatus('inactive')} />
                    <span className="font-semibold text-slate-500">Inativo</span>
                  </label>
                </div>
              </div>
              {renderRoleAndCompanies()}
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
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {isSaving ? 'Salvando...' : 'Salvar alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
