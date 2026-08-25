import React from 'react';
import { useApp } from '../context/AppContext';
import { Trash2, AlertTriangle, X } from 'lucide-react';

export const ConfirmModal: React.FC = () => {
  const { confirmDeleteModal, closeDeleteConfirm } = useApp();

  if (!confirmDeleteModal || !confirmDeleteModal.isOpen) return null;

  const handleConfirm = () => {
    confirmDeleteModal.onConfirm();
    closeDeleteConfirm();
  };

  return (
    <div 
      id="confirm-delete-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in"
      onClick={closeDeleteConfirm}
    >
      <div
        id="confirm-delete-card"
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md shadow-2xl p-6 space-y-4 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3.5">
          <div className="p-3 bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 rounded-2xl shrink-0">
            <Trash2 className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-extrabold text-slate-900 dark:text-white text-base leading-tight">
              {confirmDeleteModal.title || 'Confirmar Exclusão'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
              {confirmDeleteModal.message || 'Esta ação é irreversível e removerá permanentemente a informação do sistema.'}
            </p>
          </div>
          <button
            onClick={closeDeleteConfirm}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 rounded-2xl flex items-center gap-2 text-xs text-amber-800 dark:text-amber-300">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>Apenas o Administrador Master tem autorização para apagar dados.</span>
        </div>

        <div className="pt-2 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={closeDeleteConfirm}
            className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            id="btn-confirm-delete-action"
            onClick={handleConfirm}
            className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold shadow-md transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Excluir Agora</span>
          </button>
        </div>
      </div>
    </div>
  );
};
