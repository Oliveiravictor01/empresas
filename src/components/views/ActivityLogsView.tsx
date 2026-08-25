import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  Search,
  Filter,
  Download,
  Calendar,
  Building2,
  User,
  Activity,
  PlusCircle,
  Edit,
  Trash2,
  LogIn,
  AlertCircle,
  CheckCircle,
  FileText,
  Clock,
  RefreshCw,
  Layers,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ActivityLog } from '../../types';

export const ActivityLogsView: React.FC = () => {
  const { activityLogs, data, user, isMasterUser, allowedCompanies } = useApp();

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('all');
  const [selectedModule, setSelectedModule] = useState('all');
  const [selectedAction, setSelectedAction] = useState('all');
  const [selectedUser, setSelectedUser] = useState('all');

  // Filtered Logs
  const filteredLogs = useMemo(() => {
    return activityLogs.filter((log) => {
      // Company isolation: if not master, user can only see logs of allowed companies or general
      if (!isMasterUser) {
        if (log.company_id && !user.company_ids?.includes(log.company_id) && !user.company_ids?.includes('*')) {
          return false;
        }
      }

      // Search keyword
      const searchMatch =
        log.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.user_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.company_name && log.company_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        log.module.toLowerCase().includes(searchTerm.toLowerCase());
      if (!searchMatch) return false;

      // Filter Company
      if (selectedCompany !== 'all' && log.company_id !== selectedCompany) {
        return false;
      }

      // Filter Module
      if (selectedModule !== 'all' && log.module.toLowerCase() !== selectedModule.toLowerCase()) {
        return false;
      }

      // Filter Action
      if (selectedAction !== 'all' && log.action !== selectedAction) {
        return false;
      }

      // Filter User
      if (selectedUser !== 'all' && log.user_email.toLowerCase() !== selectedUser.toLowerCase()) {
        return false;
      }

      return true;
    });
  }, [activityLogs, isMasterUser, user.company_ids, searchTerm, selectedCompany, selectedModule, selectedAction, selectedUser]);

  // Statistics Summary
  const stats = useMemo(() => {
    const total = filteredLogs.length;
    const creates = filteredLogs.filter((l) => l.action === 'create').length;
    const updates = filteredLogs.filter((l) => l.action === 'update').length;
    const deletes = filteredLogs.filter((l) => l.action === 'delete' || l.action === 'cancel').length;
    const logins = filteredLogs.filter((l) => l.action === 'login').length;
    return { total, creates, updates, deletes, logins };
  }, [filteredLogs]);

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredLogs.length === 0) return;
    const headers = ['Data/Hora', 'Usuário', 'E-mail', 'Empresa', 'Módulo', 'Ação', 'Descrição', 'ID Registro'];
    const rows = filteredLogs.map((l) => [
      new Date(l.created_at).toLocaleString('pt-BR'),
      `"${l.user_name}"`,
      `"${l.user_email}"`,
      `"${l.company_name || 'Geral/Sistema'}"`,
      `"${l.module}"`,
      `"${l.action}"`,
      `"${l.description.replace(/"/g, '""')}"`,
      `"${l.record_id || ''}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `logs_auditoria_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Action badge renderer
  const renderActionBadge = (action: string) => {
    switch (action) {
      case 'create':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <PlusCircle className="w-3 h-3" />
            Criação
          </span>
        );
      case 'update':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Edit className="w-3 h-3" />
            Alteração
          </span>
        );
      case 'delete':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <Trash2 className="w-3 h-3" />
            Exclusão
          </span>
        );
      case 'cancel':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <AlertCircle className="w-3 h-3" />
            Cancelamento
          </span>
        );
      case 'login':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            <LogIn className="w-3 h-3" />
            Login / Acesso
          </span>
        );
      case 'status_change':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <RefreshCw className="w-3 h-3" />
            Status
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
            {action}
          </span>
        );
    }
  };

  return (
    <div id="activity-logs-view" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-lg">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Histórico de Atividades & Auditoria</h1>
            <p className="text-sm text-slate-500">
              Rastreamento detalhado de todas as ações executadas pelos usuários em cada empresa do grupo
            </p>
          </div>
        </div>

        <button
          id="btn-export-logs-csv"
          onClick={handleExportCSV}
          disabled={filteredLogs.length === 0}
          className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium rounded-lg border border-slate-300 shadow-xs transition-colors disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          Exportar Relatório CSV
        </button>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Total de Eventos</span>
            <Activity className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">{stats.total}</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Novos Cadastros</span>
            <PlusCircle className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 mt-2">{stats.creates}</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Edições & Alterações</span>
            <Edit className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-blue-600 mt-2">{stats.updates}</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Exclusões & Estornos</span>
            <Trash2 className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-bold text-rose-600 mt-2">{stats.deletes}</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Logins & Acessos</span>
            <LogIn className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-bold text-purple-600 mt-2">{stats.logins}</div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col lg:flex-row gap-3 items-center justify-between">
        <div className="relative w-full lg:w-72">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            id="input-search-logs"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por descrição, usuário..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          {/* Company */}
          <select
            id="select-log-company"
            value={selectedCompany}
            onChange={(e) => setSelectedCompany(e.target.value)}
            className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">Todas as Empresas</option>
            {allowedCompanies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Module */}
          <select
            id="select-log-module"
            value={selectedModule}
            onChange={(e) => setSelectedModule(e.target.value)}
            className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">Todos os Módulos</option>
            <option value="Vendas">Vendas</option>
            <option value="Estoque">Estoque</option>
            <option value="Produtos">Produtos</option>
            <option value="Despesas">Despesas</option>
            <option value="Contas a Pagar">Contas a Pagar</option>
            <option value="Contas a Receber">Contas a Receber</option>
            <option value="Clientes">Clientes</option>
            <option value="Fornecedores">Fornecedores</option>
            <option value="Tarefas">Tarefas</option>
            <option value="Usuários">Usuários</option>
            <option value="Sistema">Sistema / Login</option>
          </select>

          {/* Action */}
          <select
            id="select-log-action"
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value)}
            className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">Todas as Ações</option>
            <option value="create">Criação (Create)</option>
            <option value="update">Alteração (Update)</option>
            <option value="delete">Exclusão (Delete)</option>
            <option value="cancel">Cancelamento (Cancel)</option>
            <option value="login">Login / Acesso</option>
          </select>

          {/* User */}
          <select
            id="select-log-user"
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
            className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">Todos os Usuários</option>
            {data.users?.map((u) => (
              <option key={u.id} value={u.email}>
                {u.name} ({u.role})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4">Data e Hora</th>
                <th className="py-3.5 px-4">Usuário</th>
                <th className="py-3.5 px-4">Empresa</th>
                <th className="py-3.5 px-4">Módulo</th>
                <th className="py-3.5 px-4 text-center">Tipo de Ação</th>
                <th className="py-3.5 px-4">Descrição da Operação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Activity className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    Nenhum registro de atividade encontrado para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const dateObj = new Date(log.created_at);
                  const formattedDate = dateObj.toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                  });
                  const formattedTime = dateObj.toLocaleTimeString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  });

                  return (
                    <tr key={log.id} id={`log-row-${log.id}`} className="hover:bg-slate-50 transition-colors">
                      {/* Date & Time */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-medium text-slate-900">{formattedDate}</div>
                        <div className="text-xs text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formattedTime}
                        </div>
                      </td>

                      {/* User */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-semibold text-slate-900">{log.user_name}</div>
                        <div className="text-xs text-slate-400">{log.user_email}</div>
                      </td>

                      {/* Company */}
                      <td className="py-3.5 px-4">
                        {log.company_name ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-slate-100 text-slate-800 rounded text-xs font-medium">
                            <Building2 className="w-3 h-3 text-indigo-600" />
                            {log.company_name.split('-')[0].trim()}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Geral / Todas</span>
                        )}
                      </td>

                      {/* Module */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-medium text-slate-800">{log.module}</span>
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {renderActionBadge(log.action)}
                      </td>

                      {/* Description */}
                      <td className="py-3.5 px-4">
                        <div className="text-slate-800">{log.description}</div>
                        {log.record_id && (
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            ID Ref: {log.record_id}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
