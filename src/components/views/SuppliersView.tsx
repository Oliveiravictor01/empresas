import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Supplier } from '../../types';
import { formatPhone } from '../../lib/utils';
import {
  Truck,
  Plus,
  Search,
  Trash2,
  Edit2,
  Phone,
  Mail,
  Boxes,
  X,
} from 'lucide-react';

export const SuppliersView: React.FC = () => {
  const {
    data,
    canEditOrDelete,
    selectedCompanyId,
    addSupplier,
    updateSupplier,
    deleteSupplier,
    requestDeleteConfirm,
  } = useApp();

  const [search, setSearch] = useState('');
  const [filterCompany, setFilterCompany] = useState<string>(selectedCompanyId || 'all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  // Form
  const [companyId, setCompanyId] = useState(selectedCompanyId || (data.companies[0]?.id || ''));
  const [name, setName] = useState('');
  const [contactName, setContactName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [productsSupplied, setProductsSupplied] = useState('');

  const filteredSuppliers = data.suppliers.filter((s) => {
    if (filterCompany !== 'all' && s.company_id !== filterCompany) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = s.name.toLowerCase().includes(q);
      const matchProd = s.products_supplied?.toLowerCase().includes(q);
      if (!matchName && !matchProd) return false;
    }
    return true;
  });

  const openNewModal = () => {
    setEditingSupplier(null);
    setCompanyId(selectedCompanyId || (data.companies[0]?.id || ''));
    setName('');
    setContactName('');
    setPhone('');
    setEmail('');
    setProductsSupplied('');
    setIsModalOpen(true);
  };

  const openEditModal = (s: Supplier) => {
    setEditingSupplier(s);
    setCompanyId(s.company_id);
    setName(s.name);
    setContactName(s.contact_name || '');
    setPhone(s.phone || '');
    setEmail(s.email || '');
    setProductsSupplied(s.products_supplied || '');
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !companyId) {
      alert('Preencha os campos obrigatórios.');
      return;
    }

    if (editingSupplier) {
      updateSupplier(editingSupplier.id, {
        company_id: companyId,
        name: name.trim(),
        contact_name: contactName.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        products_supplied: productsSupplied.trim() || undefined,
      });
    } else {
      addSupplier({
        company_id: companyId,
        name: name.trim(),
        contact_name: contactName.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        products_supplied: productsSupplied.trim() || undefined,
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
              Fornecedores
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
              {filteredSuppliers.length} parceiros
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Gestão de fornecedores por empresa e itens fornecidos
          </p>
        </div>

        <button
          onClick={openNewModal}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md transition-all active:scale-95 cursor-pointer w-full sm:w-auto"
        >
          <Plus className="w-4 h-4" />
          <span>+ Novo Fornecedor</span>
        </button>
      </div>

      {/* Filter toolbar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar fornecedor ou produtos..."
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
      </div>

      {/* List of suppliers */}
      {filteredSuppliers.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-10 text-center">
          <Truck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">
            Nenhum fornecedor cadastrado
          </h3>
          <p className="text-xs text-slate-400 mt-1 mb-4">
            Cadastre os parceiros e fornecedores de mercadorias e serviços.
          </p>
          <button
            onClick={openNewModal}
            className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs"
          >
            + Cadastrar Fornecedor
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSuppliers.map((s) => {
            const comp = data.companies.find((compItem) => compItem.id === s.company_id);

            return (
              <div
                key={s.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm">
                        <Truck className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm line-clamp-1">
                          {s.name}
                        </h4>
                        {s.contact_name && (
                          <span className="text-[11px] text-slate-400">
                            Contato: {s.contact_name}
                          </span>
                        )}
                      </div>
                    </div>

                    {comp && (
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-md text-white shrink-0"
                        style={{ backgroundColor: comp.color || '#4f46e5' }}
                      >
                        {comp.name}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1.5 py-2.5 border-y border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
                    {s.phone && (
                      <p className="flex items-center gap-1.5 truncate">
                        <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{formatPhone(s.phone)}</span>
                      </p>
                    )}
                    {s.email && (
                      <p className="flex items-center gap-1.5 truncate">
                        <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{s.email}</span>
                      </p>
                    )}
                    {s.products_supplied && (
                      <p className="flex items-start gap-1.5">
                        <Boxes className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
                        <span className="text-slate-700 dark:text-slate-300 font-medium line-clamp-2">
                          {s.products_supplied}
                        </span>
                      </p>
                    )}
                  </div>
                </div>

                {canEditOrDelete && (
                  <div className="mt-4 pt-2 flex items-center justify-end gap-1.5 border-t border-slate-100 dark:border-slate-800">
                    <button
                      onClick={() => openEditModal(s)}
                      className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                      title="Editar Fornecedor"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        requestDeleteConfirm({
                          title: 'Excluir Fornecedor',
                          message: `Deseja realmente apagar o fornecedor "${s.name}"?`,
                          onConfirm: () => deleteSupplier(s.id),
                        });
                      }}
                      className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-600 transition-colors cursor-pointer"
                      title="Excluir Fornecedor"
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
                {editingSupplier ? 'Editar Fornecedor' : 'Cadastrar Fornecedor'}
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
                  Empresa Vinculada *
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
                  Nome do Fornecedor / Razão Social *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Distribuidora Central de Embalagens"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Nome do Contato
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Carlos Representante"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Telefone
                  </label>
                  <input
                    type="text"
                    placeholder="(11) 99999-9999"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  E-mail
                </label>
                <input
                  type="email"
                  placeholder="vendas@fornecedor.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Produtos ou Serviços Fornecidos
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Matéria-prima têxtil, insumos químicos, embalagens..."
                  value={productsSupplied}
                  onChange={(e) => setProductsSupplied(e.target.value)}
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
