import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { BottomNav } from './components/BottomNav';
import { QuickActionModal } from './components/QuickActionModal';
import { LoginModal } from './components/LoginModal';
import { ToastContainer } from './components/ToastContainer';
import { ConfirmModal } from './components/ConfirmModal';

import { OverviewView } from './components/views/OverviewView';
import { CompanyDashboardView } from './components/views/CompanyDashboardView';
import { CompaniesManagementView } from './components/views/CompaniesManagementView';
import { ComparisonMatrixView } from './components/views/ComparisonMatrixView';
import { SalesView } from './components/views/SalesView';
import { ProductsServicesView } from './components/views/ProductsServicesView';
import { ExpensesView } from './components/views/ExpensesView';
import { AccountsPayableView } from './components/views/AccountsPayableView';
import { AccountsReceivableView } from './components/views/AccountsReceivableView';
import { InventoryView } from './components/views/InventoryView';
import { CustomersView } from './components/views/CustomersView';
import { SuppliersView } from './components/views/SuppliersView';
import { TasksView } from './components/views/TasksView';
import { ReportsView } from './components/views/ReportsView';
import { DatabaseSettingsView } from './components/views/DatabaseSettingsView';
import { GoogleDriveView } from './components/views/GoogleDriveView';
import { UsersManagementView } from './components/views/UsersManagementView';
import { ActivityLogsView } from './components/views/ActivityLogsView';
import { AuthView } from './components/views/AuthView';
import { PendingApprovalView } from './components/views/PendingApprovalView';
import { OfflineBanner } from './components/OfflineBanner';

const MainLayout: React.FC = () => {
  const { activeTab, isMasterUser, confirmDeleteModal, closeDeleteConfirm } = useApp();
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  const renderActiveView = () => {
    // If not master user, fallback overview and multi-company tabs to single Company Dashboard
    if (!isMasterUser) {
      if (activeTab === 'overview' || activeTab === 'companies-manage' || activeTab === 'comparison') {
        return <CompanyDashboardView />;
      }
    }

    switch (activeTab) {
      case 'overview':
        return isMasterUser ? <OverviewView /> : <CompanyDashboardView />;
      case 'company-detail':
        return <CompanyDashboardView />;
      case 'companies-manage':
        return isMasterUser ? <CompaniesManagementView /> : <CompanyDashboardView />;
      case 'comparison':
        return isMasterUser ? <ComparisonMatrixView /> : <CompanyDashboardView />;
      case 'sales':
        return <SalesView />;
      case 'products-services':
        return <ProductsServicesView />;
      case 'expenses':
        return <ExpensesView />;
      case 'accounts-payable':
        return <AccountsPayableView />;
      case 'accounts-receivable':
        return <AccountsReceivableView />;
      case 'inventory':
        return <InventoryView />;
      case 'customers':
        return <CustomersView />;
      case 'suppliers':
        return <SuppliersView />;
      case 'tasks':
        return <TasksView />;
      case 'reports':
        return <ReportsView />;
      case 'users':
        return isMasterUser ? <UsersManagementView /> : <CompanyDashboardView />;
      case 'activity-logs':
        return isMasterUser ? <ActivityLogsView /> : <CompanyDashboardView />;
      case 'database-settings':
        return isMasterUser ? <DatabaseSettingsView /> : <CompanyDashboardView />;
      case 'google-drive':
        return isMasterUser ? <GoogleDriveView /> : <CompanyDashboardView />;
      default:
        return isMasterUser ? <OverviewView /> : <CompanyDashboardView />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      {/* Top Navbar */}
      <Navbar onOpenLogin={() => setIsLoginModalOpen(true)} />

      {/* Body with Sidebar and Main Content */}
      <div className="flex-1 flex w-full max-w-7xl mx-auto">
        {/* Desktop Sidebar */}
        <Sidebar />

        {/* Dynamic Content Area */}
        <main className="flex-1 p-3 sm:p-6 lg:p-8 min-w-0 overflow-y-auto max-w-full">
          {renderActiveView()}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <BottomNav />

      {/* Floating Quick Action Modal (+ Lançar) */}
      <QuickActionModal />

      {/* Toast Notification Container */}
      <ToastContainer />

      {/* Login & Auth Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />

      {/* Global Confirmation Modal for Deletion */}
      <ConfirmModal
        isOpen={Boolean(confirmDeleteModal?.isOpen)}
        title={confirmDeleteModal?.title || 'Confirmar Exclusão'}
        message={confirmDeleteModal?.message || 'Deseja realmente apagar esta informação permanentemente?'}
        confirmLabel="Apagar Registro"
        cancelLabel="Cancelar"
        variant="danger"
        onConfirm={() => {
          if (confirmDeleteModal?.onConfirm) {
            confirmDeleteModal.onConfirm();
          }
          closeDeleteConfirm();
        }}
        onCancel={closeDeleteConfirm}
      />
    </div>
  );
};

const AppRoot: React.FC = () => {
  const { isCheckingMaster, isAuthenticated, user } = useApp();

  // 0. Initial System Loading State
  if (isCheckingMaster) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-6 select-none font-sans">
        <div className="relative z-10 flex flex-col items-center gap-4 text-center max-w-sm">
          <div className="w-10 h-10 border-3 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">OmniGestão Multiempresas</h2>
            <p className="text-xs text-slate-400 mt-1">Carregando sistema...</p>
          </div>
        </div>
      </div>
    );
  }

  // 1. Auth view: If not authenticated, always display Login
  if (!isAuthenticated) {
    return (
      <>
        <OfflineBanner />
        <AuthView />
        <ToastContainer />
      </>
    );
  }

  // 2. Pending approval: If authenticated but account status is pending
  if (user && user.status === 'pending') {
    return (
      <>
        <OfflineBanner />
        <PendingApprovalView />
        <ToastContainer />
      </>
    );
  }

  // 3. Main application layout for active users
  return (
    <>
      <OfflineBanner />
      <MainLayout />
    </>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppRoot />
    </AppProvider>
  );
}
