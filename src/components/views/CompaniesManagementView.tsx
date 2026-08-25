import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Company } from '../../types';
import { formatCnpjCpf, formatPhone } from '../../lib/utils';
import {
  Building2,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  Phone,
  Mail,
  MapPin,
  Tag,
  Palette,
  ExternalLink,
} from 'lucide-react';

const PRESET_COLORS = [
  '#3b82f6', // Blue
  '#10b981', // Emerald
  '#8b5cf6', // Violet
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#14b8a6', // Teal
  '#6366f1', // Indigo
  '#84cc16', // Lime
];

export const CompaniesManagementView: React.FC = () => {
  const {
    data,
    canEditOrDelete,
    addCompany,
    updateCompany,
    deleteCompany,
    setSelectedCompanyId,
    setActiveTab,
    requestDeleteConfirm,
  } = useApp();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [tradeName, setTradeName] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [category, setCategory] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [notes, setNotes] = useState('');

  const openCreateModal = () => {
    setEditingCompany(null);
    setName(`Empresa 0${data.companies.length + 1}`);
    setTradeName('');
    setCnpj('');
    setPhone('');
    setEmail('');
    setAddress('');
    setCategory('Comércio / Serviços');
    setColor(PRESET_COLORS[data.companies.length % PRESET_COLORS.length]);
    setStatus('active');
    setNotes('');
    setIsModalOpen(true);
  };

  const openEditModal = (comp: Company) => {
    setEditingCompany(comp);
    setName(comp.name);
    setTradeName(comp.trade_name || '');
    setCnpj(comp.cnpj || '');
    setPhone(comp.phone || '');
    setEmail(comp.email || '');
    setAddress(comp.address || '');
    setCategory(comp.category || '');
    setColor(comp.color || PRESET_COLORS[0]);
    setStatus(comp.status);
    setNotes(comp.notes || '');
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Informe o nome da empresa.');
      return;
    }

    if (editingCompany) {
      updateCompany(editingCompany.id, {
        name: name.trim(),
        trade_name: tradeName.trim() || undefined,
        cnpj: cnpj.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        address: address.trim() || undefined,
        category: category.trim() || 'Geral',
        color,
        status,
        notes: notes.trim() || undefined,
      });
    } else {
      addCompany({
        name: name.trim(),
        trade_name: tradeName.trim() || undefined,
        cnpj: cnpj.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        address: address.trim() || undefined,
        category: category.trim() || 'Geral',
        color,
        status,
        notes: notes.trim() || undefined,
      });
    }

    setIsModalOpen(false);
  };

  const handleDelete = (id: string, name: string) => {
    requestDeleteConfirm({
      title: 'Excluir Empresa',
      message: `Tem certeza que deseja excluir permanentemente a empresa "${name}" e todos os seus lançamentos vinculados?`,
      onConfirm: () => deleteCompany(id),
    });
  };

  return (
    <div className="space-y-6 animate-fade-in pb-16 lg:pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Cadastro e Gestão das 8 Empresas
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
              {data.companies.length} de 8
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Cadastre os dados reais de cada uma das suas 8 empresas para alimentar pelo celular ou
            computador
          </p>
        </div>

        <button
          id="btn-add-company"
          onClick={openCreateModal}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md transition-all active:scale-95 cursor-pointer w-full sm:w-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Cadastrar Nova Empresa</span>
        </button>
      </div>

      {/* Grid of Companies */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {data.companies.map((comp, index) => (
          <div
            key={comp.id}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-11 h-11 rounded-2xl flex items-center justify-center text-white font-bold text-base shadow-xs"
                    style={{ backgroundColor: comp.color || '#4f46e5' }}
                  >
                    {index + 1}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm line-clamp-1">
                      {comp.name}
                    </h3>
                    <span className="text-xs text-slate-400 block truncate">
                      {comp.category || 'Geral'}
                    </span>
                  </div>
                </div>

                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                    comp.status === 'active'
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {comp.status === 'active' ? 'Ativa' : 'Inativa'}
                </span>
              </div>

              {/* Details List */}
              <div className="space-y-1.5 py-3 border-y border-slate-100 dark:border-slate-800/80 text-xs text-slate-600 dark:text-slate-400">
                {comp.trade_name && (
                  <p className="truncate">
                    <strong className="text-slate-700 dark:text-slate-300">Razão:</strong>{' '}
                    {comp.trade_name}
                  </p>
                )}
                {comp.cnpj && (
                  <p className="truncate">
                    <strong className="text-slate-700 dark:text-slate-300">CNPJ:</strong>{' '}
                    {formatCnpjCpf(comp.cnpj)}
                  </p>
                )}
                {comp.phone && (
                  <p className="flex items-center gap-1.5 truncate">
                    <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                    <span>{formatPhone(comp.phone)}</span>
                  </p>
                )}
                {comp.email && (
                  <p className="flex items-center gap-1.5 truncate">
                    <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                    <span>{comp.email}</span>
                  </p>
                )}
                {comp.address && (
                  <p className="flex items-center gap-1.5 truncate">
                    <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                    <span>{comp.address}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Actions Bar */}
            <div className="mt-4 pt-2 flex items-center justify-between gap-2">
              <button
                onClick={() => {
                  setSelectedCompanyId(comp.id);
                  setActiveTab('company-detail');
                }}
                className="flex-1 py-2 px-3 rounded-xl bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white dark:bg-indigo-950/60 dark:hover:bg-indigo-600 dark:text-indigo-300 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
              >
                <span>Acessar Painel</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>

              {canEditOrDelete && (
                <>
                  <button
                    onClick={() => openEditModal(comp)}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                    title="Editar dados"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleDelete(comp.id, comp.name)}
                    className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 transition-colors cursor-pointer"
                    title="Excluir empresa"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
          </div>
        ))}

        {/* Empty Slots */}
        {Array.from({ length: Math.max(0, 8 - data.companies.length) }).map((_, i) => (
          <div
            key={`create-slot-${i}`}
            onClick={openCreateModal}
            className="border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-indigo-400 rounded-3xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all hover:bg-indigo-50/20 group min-h-[260px]"
          >
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 group-hover:text-indigo-600 group-hover:bg-indigo-50 flex items-center justify-center mb-3 transition-colors">
              <Plus className="w-6 h-6" />
            </div>
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 group-hover:text-indigo-600">
              Cadastrar Empresa {data.companies.length + i + 1}
            </h4>
            <p className="text-[11px] text-slate-400 mt-1 max-w-[180px]">
              Clique para preencher os dados da sua empresa
            </p>
          </div>
        ))}
      </div>

      {/* Modal for Create/Edit Company */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div
            className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/60">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-600 text-white rounded-xl">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    {editingCompany ? 'Editar Empresa' : 'Cadastrar Nova Empresa'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Preencha os dados cadastrais da empresa
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-3.5 flex-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nome Fantasia da Empresa *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Empresa 01 - Distribuidora"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Razão Social
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Comercial Silva Ltda"
                    value={tradeName}
                    onChange={(e) => setTradeName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    CNPJ
                  </label>
                  <input
                    type="text"
                    placeholder="00.000.000/0001-00"
                    value={cnpj}
                    onChange={(e) => setCnpj(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Telefone / WhatsApp
                  </label>
                  <input
                    type="text"
                    placeholder="(11) 99999-9999"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    E-mail
                  </label>
                  <input
                    type="email"
                    placeholder="contato@empresa.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Categoria / Ramo
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Varejo, Serviços, Manufatura"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
                  >
                    <option value="active">Ativa</option>
                    <option value="inactive">Inativa</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Endereço Completo
                </label>
                <input
                  type="text"
                  placeholder="Rua, Número, Bairro, Cidade - UF"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                />
              </div>

              {/* Color Picker */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-indigo-500" />
                  Cor de Identificação
                </label>
                <div className="flex items-center gap-2">
                  {PRESET_COLORS.map((c) => (
                    <button
                      type="button"
                      key={c}
                      onClick={() => setColor(c)}
                      className={`w-7 h-7 rounded-xl transition-transform ${
                        color === c ? 'ring-2 ring-indigo-600 scale-110' : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Observações
                </label>
                <textarea
                  rows={2}
                  placeholder="Anotações internas..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md transition-colors"
                >
                  {editingCompany ? 'Salvar Alterações' : 'Cadastrar Empresa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
