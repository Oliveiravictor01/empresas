import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Task, TaskPriority, TaskStatus } from '../../types';
import { formatDate } from '../../lib/utils';
import {
  CheckSquare,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Trash2,
  Edit2,
  AlertCircle,
  X,
} from 'lucide-react';

export const TasksView: React.FC = () => {
  const {
    data,
    canEditOrDelete,
    selectedCompanyId,
    addTask,
    updateTask,
    deleteTask,
    toggleTaskStatus,
    requestDeleteConfirm,
  } = useApp();

  const [search, setSearch] = useState('');
  const [filterCompany, setFilterCompany] = useState<string>(selectedCompanyId || 'all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Form states
  const [companyId, setCompanyId] = useState(selectedCompanyId || (data.companies[0]?.id || ''));
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('Média');
  const [status, setStatus] = useState<TaskStatus>('Pendente');

  const filteredTasks = data.tasks.filter((t) => {
    if (filterCompany !== 'all' && t.company_id !== filterCompany) return false;
    if (filterStatus !== 'all' && t.status !== filterStatus) return false;
    if (filterPriority !== 'all' && t.priority !== filterPriority) return false;

    if (search.trim()) {
      const q = search.toLowerCase();
      const matchTitle = t.title.toLowerCase().includes(q);
      const matchResp = t.assigned_to?.toLowerCase().includes(q);
      if (!matchTitle && !matchResp) return false;
    }
    return true;
  });

  const openNewModal = () => {
    setEditingTask(null);
    setCompanyId(selectedCompanyId || (data.companies[0]?.id || ''));
    setTitle('');
    setDescription('');
    setAssignedTo('Administrador');
    setDueDate(new Date().toISOString().slice(0, 10));
    setPriority('Média');
    setStatus('Pendente');
    setIsModalOpen(true);
  };

  const openEditModal = (t: Task) => {
    setEditingTask(t);
    setCompanyId(t.company_id);
    setTitle(t.title);
    setDescription(t.description || '');
    setAssignedTo(t.assigned_to || '');
    setDueDate(t.due_date || '');
    setPriority(t.priority);
    setStatus(t.status);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !companyId) {
      alert('Preencha os campos obrigatórios.');
      return;
    }

    if (editingTask) {
      updateTask(editingTask.id, {
        company_id: companyId,
        title: title.trim(),
        description: description.trim() || undefined,
        assigned_to: assignedTo.trim() || undefined,
        due_date: dueDate || undefined,
        priority,
        status,
      });
    } else {
      addTask({
        company_id: companyId,
        title: title.trim(),
        description: description.trim() || undefined,
        assigned_to: assignedTo.trim() || undefined,
        due_date: dueDate || undefined,
        priority,
        status,
      });
    }

    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-16 lg:pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Tarefas e Prazos
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
              {filteredTasks.filter((t) => t.status !== 'Concluída').length} pendentes
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Acompanhe entregas, pagamentos de impostos e obrigações operacionais das empresas
          </p>
        </div>

        <button
          onClick={openNewModal}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md transition-all active:scale-95 cursor-pointer w-full sm:w-auto"
        >
          <Plus className="w-4 h-4" />
          <span>+ Nova Tarefa</span>
        </button>
      </div>

      {/* Filter toolbar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar tarefa ou responsável..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border-0 text-xs text-slate-900 dark:text-white"
          />
        </div>

        <select
          value={filterCompany}
          onChange={(e) => setFilterCompany(e.target.value)}
          className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border-0 text-xs font-semibold text-slate-900 dark:text-white"
        >
          <option value="all">Todas as Empresas</option>
          {data.companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border-0 text-xs font-semibold text-slate-900 dark:text-white"
        >
          <option value="all">Todos os Status</option>
          <option value="Pendente">Pendente</option>
          <option value="Em andamento">Em andamento</option>
          <option value="Concluída">Concluída</option>
        </select>
      </div>

      {/* List */}
      {filteredTasks.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-10 text-center">
          <CheckSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">
            Nenhuma tarefa cadastrada
          </h3>
          <p className="text-xs text-slate-400 mt-1 mb-4">
            Crie lembretes de renovações de certificados, impostos ou auditorias.
          </p>
          <button
            onClick={openNewModal}
            className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs"
          >
            + Nova Tarefa
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTasks.map((t) => {
            const comp = data.companies.find((c) => c.id === t.company_id);
            const isCompleted = t.status === 'Concluída';

            return (
              <div
                key={t.id}
                className={`bg-white dark:bg-slate-900 border rounded-2xl p-4 sm:p-5 shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isCompleted
                    ? 'opacity-60 bg-slate-50/50 border-slate-200'
                    : 'border-slate-200 dark:border-slate-800 hover:shadow-md'
                }`}
              >
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => toggleTaskStatus(t.id)}
                    className={`mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                      isCompleted
                        ? 'bg-emerald-600 text-white'
                        : 'border-2 border-slate-300 dark:border-slate-600 hover:border-emerald-500'
                    }`}
                  >
                    {isCompleted && <CheckCircle2 className="w-4 h-4" />}
                  </button>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4
                        className={`font-bold text-sm ${
                          isCompleted
                            ? 'line-through text-slate-400'
                            : 'text-slate-900 dark:text-white'
                        }`}
                      >
                        {t.title}
                      </h4>
                      {comp && (
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-md text-white shrink-0"
                          style={{ backgroundColor: comp.color || '#4f46e5' }}
                        >
                          {comp.name}
                        </span>
                      )}
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          t.priority === 'Alta'
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                            : t.priority === 'Média'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        Prioridade {t.priority}
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        {t.status}
                      </span>
                    </div>

                    {t.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {t.description}
                      </p>
                    )}

                    <div className="flex items-center gap-4 mt-2 text-[11px] text-slate-400">
                      {t.assigned_to && <span>Resp: <strong>{t.assigned_to}</strong></span>}
                      {t.due_date && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-indigo-500" />
                          Prazo: {formatDate(t.due_date)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {canEditOrDelete && (
                  <div className="flex items-center justify-end gap-1.5 pt-2 sm:pt-0">
                    <button
                      onClick={() => openEditModal(t)}
                      className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                      title="Editar Tarefa"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        requestDeleteConfirm({
                          title: 'Excluir Tarefa',
                          message: `Deseja realmente apagar a tarefa "${t.title}"?`,
                          onConfirm: () => deleteTask(t.id),
                        });
                      }}
                      className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-600 transition-colors cursor-pointer"
                      title="Excluir Tarefa"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div
            className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/60">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                {editingTask ? 'Editar Tarefa' : 'Nova Tarefa'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Empresa *
                </label>
                <select
                  value={companyId}
                  onChange={(e) => setCompanyId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
                >
                  {data.companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Título da Tarefa *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Pagar DAS, Enviar notas para contabilidade"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Responsável
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Carlos, Gestor"
                    value={assignedTo}
                    onChange={(e) => setAssignedTo(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Data Limite (Prazo)
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Prioridade
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                  >
                    <option value="Baixa">Baixa</option>
                    <option value="Média">Média</option>
                    <option value="Alta">Alta</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                  >
                    <option value="Pendente">Pendente</option>
                    <option value="Em andamento">Em andamento</option>
                    <option value="Concluída">Concluída</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Detalhes / Instruções
                </label>
                <textarea
                  rows={2}
                  placeholder="Informações adicionais..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
