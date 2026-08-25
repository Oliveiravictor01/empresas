import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Customer } from '../../types';
import { formatCnpjCpf, formatPhone, formatCurrency } from '../../lib/utils';
import {
  Users,
  Plus,
  Search,
  Trash2,
  Edit2,
  Phone,
  Mail,
  MapPin,
  X,
  ShoppingBag,
} from 'lucide-react';

export const CustomersView: React.FC = () => {
  const {
    data,
    canEditOrDelete,
    selectedCompanyId,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    requestDeleteConfirm,
  } = useApp();

  const [search, setSearch] = useState('');
  const [filterCompany, setFilterCompany] = useState<string>(selectedCompanyId || 'all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  // Form states
  const [companyId, setCompanyId] = useState(selectedCompanyId || (data.companies[0]?.id || ''));
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [document, setDocument] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');

  const filteredCustomers = data.customers.filter((c) => {
    if (filterCompany !== 'all' && c.company_id !== filterCompany) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = c.name.toLowerCase().includes(q);
      const matchDoc = c.document?.toLowerCase().includes(q);
      const matchPhone = c.phone?.toLowerCase().includes(q);
      if (!matchName && !matchDoc && !matchPhone) return false;
    }
    return true;
  });

  const openNewModal = () => {
    setEditingCustomer(null);
    setCompanyId(selectedCompanyId || (data.companies[0]?.id || ''));
    setName('');
    setPhone('');
    setEmail('');
    setDocument('');
    setAddress('');
    setNotes('');
    setIsModalOpen(true);
  };

  const openEditModal = (c: Customer) => {
    setEditingCustomer(c);
    setCompanyId(c.company_id);
    setName(c.name);
    setPhone(c.phone || '');
    setEmail(c.email || '');
    setDocument(c.document || '');
    setAddress(c.address || '');
    setNotes(c.notes || '');
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !companyId) {
      alert('Preencha os campos obrigatórios (Empresa e Nome).');
      return;
    }

    if (editingCustomer) {
      updateCustomer(editingCustomer.id, {
        company_id: companyId,
        name: name.trim(),
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        document: document.trim() || undefined,
        address: address.trim() || undefined,
        notes: notes.trim() || undefined,
      });
    } else {
      addCustomer({
        company_id: companyId,
        name: name.trim(),
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        document: document.trim() || undefined,
        address: address.trim() || undefined,
        notes: notes.trim() || undefined,
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
              Clientes
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
              {filteredCustomers.length} cadastrados
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Base de clientes vinculada às suas empresas
          </p>
        </div>

        <button
          onClick={openNewModal}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md transition-all active:scale-95 cursor-pointer w-full sm:w-auto"
        >
          <Plus className="w-4 h-4" />
          <span>+ Cadastrar Cliente</span>
        </button>
      </div>

      {/* Filter toolbar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row gap-2.5">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nome, documento ou telefone..."
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

      {/* Grid of Customers */}
      {filteredCustomers.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-10 text-center">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">
            Nenhum cliente cadastrado
          </h3>
          <p className="text-xs text-slate-400 mt-1 mb-4">
            Cadastre clientes para associar vendas e contas a receber.
          </p>
          <button
            onClick={openNewModal}
            className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs"
          >
            + Cadastrar Cliente
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCustomers.map((c) => {
            const comp = data.companies.find((compItem) => compItem.id === c.company_id);
            const customerSales = data.sales.filter(
              (s) => s.customer_name.toLowerCase() === c.name.toLowerCase()
            );
            const totalSpent = customerSales.reduce((sum, s) => sum + Number(s.total_amount), 0);

            return (
              <div
                key={c.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm">
                        {c.name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm line-clamp-1">
                          {c.name}
                        </h4>
                        {c.document && (
                          <span className="text-[11px] text-slate-400">
                            Doc: {formatCnpjCpf(c.document)}
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
                    {c.phone && (
                      <p className="flex items-center gap-1.5 truncate">
                        <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{formatPhone(c.phone)}</span>
                      </p>
                    )}
                    {c.email && (
                      <p className="flex items-center gap-1.5 truncate">
                        <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{c.email}</span>
                      </p>
                    )}
                    {c.address && (
                      <p className="flex items-center gap-1.5 truncate">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{c.address}</span>
                      </p>
                    )}
                  </div>

                  {/* Purchases stats */}
                  <div className="mt-3 p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl flex items-center justify-between text-xs">
                    <span className="text-slate-500 text-[11px]">
                      {customerSales.length} compras
                    </span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      Total: {formatCurrency(totalSpent)}
                    </span>
                  </div>
                </div>

                {canEditOrDelete && (
                  <div className="mt-3 pt-2 flex items-center justify-end gap-1.5 border-t border-slate-100 dark:border-slate-800">
                    <button
                      onClick={() => openEditModal(c)}
                      className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                      title="Editar Cliente"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        requestDeleteConfirm({
                          title: 'Excluir Cliente',
                          message: `Deseja realmente apagar o cadastro do cliente "${c.name}"?`,
                          onConfirm: () => deleteCustomer(c.id),
                        });
                      }}
                      className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-600 transition-colors cursor-pointer"
                      title="Excluir Cliente"
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
                {editingCustomer ? 'Editar Cliente' : 'Cadastrar Cliente'}
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
                  Nome Completo / Razão Social *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Nome do cliente"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
                />
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
                    CPF ou CNPJ
                  </label>
                  <input
                    type="text"
                    placeholder="000.000.000-00"
                    value={document}
                    onChange={(e) => setDocument(e.target.value)}
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
                  placeholder="cliente@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Endereço
                </label>
                <input
                  type="text"
                  placeholder="Cidade, Bairro, Endereço"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
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
