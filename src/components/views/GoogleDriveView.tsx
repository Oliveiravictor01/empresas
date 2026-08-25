import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import {
  signInWithGoogleDrive,
  signOutGoogleDrive,
  getDriveAccessToken,
  initDriveAuth,
  listDriveFiles,
  createDriveFolder,
  uploadDriveFile,
  uploadJsonBackupToDrive,
  deleteDriveFile,
  formatBytes,
  DriveFile,
} from '../../lib/google-drive';
import { User } from 'firebase/auth';
import {
  HardDrive,
  FolderPlus,
  UploadCloud,
  RefreshCw,
  Folder,
  FileText,
  FileSpreadsheet,
  FileImage,
  FileArchive,
  FileCode,
  File as FileIcon,
  Trash2,
  ExternalLink,
  Search,
  CheckCircle2,
  AlertCircle,
  FolderTree,
  Database,
  ArrowLeft,
  ChevronRight,
  Shield,
  Download,
  Building2,
  Plus,
  LogOut,
  User as UserIcon,
} from 'lucide-react';

export const GoogleDriveView: React.FC = () => {
  const { data, showToast, isMasterUser, logActivity } = useApp();

  // Authentication State
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  // Drive Navigation & Files
  const [currentFolderId, setCurrentFolderId] = useState<string>('root');
  const [breadcrumbs, setBreadcrumbs] = useState<{ id: string; name: string }[]>([
    { id: 'root', name: 'Meu Google Drive' },
  ]);
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'folders' | 'files'>('all');

  // Modals & Action States
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isAutoStructuring, setIsAutoStructuring] = useState(false);

  // Destructive Action Confirmation Modal (MANDATORY per Workspace guidelines)
  const [itemToDelete, setItemToDelete] = useState<DriveFile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // File Upload Input Ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize auth listener
  useEffect(() => {
    const unsubscribe = initDriveAuth(
      (authUser, authToken) => {
        setUser(authUser);
        setToken(authToken);
        setAuthChecked(true);
      },
      () => {
        setUser(null);
        setToken(null);
        setAuthChecked(true);
      }
    );

    // Initial check of in-memory token
    getDriveAccessToken().then((t) => {
      if (t) {
        setToken(t);
      }
      setAuthChecked(true);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Fetch files when folder or token changes
  const fetchFiles = useCallback(async () => {
    if (!token) return;
    setIsLoadingFiles(true);
    try {
      const res = await listDriveFiles(currentFolderId, searchQuery);
      setFiles(res.files || []);
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Erro ao listar arquivos do Google Drive', 'error');
    } finally {
      setIsLoadingFiles(false);
    }
  }, [token, currentFolderId, searchQuery, showToast]);

  useEffect(() => {
    if (token) {
      fetchFiles();
    }
  }, [token, currentFolderId, fetchFiles]);

  // Handle Google Sign-in
  const handleGoogleSignIn = async () => {
    setIsLoggingIn(true);
    try {
      const res = await signInWithGoogleDrive();
      if (res) {
        setUser(res.user);
        setToken(res.accessToken);
        showToast('Autenticado no Google Drive com sucesso!', 'success');
        logActivity({
          module: 'Google Drive',
          action: 'login',
          description: `Login no Google Drive efetuado (${res.user.email})`,
        });
      }
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Falha ao autenticar com o Google Drive', 'error');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Handle Google Sign-out
  const handleGoogleSignOut = async () => {
    try {
      await signOutGoogleDrive();
      setUser(null);
      setToken(null);
      setFiles([]);
      setCurrentFolderId('root');
      setBreadcrumbs([{ id: 'root', name: 'Meu Google Drive' }]);
      showToast('Desconectado do Google Drive.', 'info');
    } catch (err: any) {
      console.error(err);
    }
  };

  // Navigate to subfolder
  const handleOpenFolder = (folder: DriveFile) => {
    setCurrentFolderId(folder.id);
    setBreadcrumbs((prev) => [...prev, { id: folder.id, name: folder.name }]);
    setSearchQuery('');
  };

  // Navigate back in breadcrumbs
  const handleNavigateBreadcrumb = (index: number) => {
    const target = breadcrumbs[index];
    setBreadcrumbs((prev) => prev.slice(0, index + 1));
    setCurrentFolderId(target.id);
    setSearchQuery('');
  };

  // Create folder handler
  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim() || !token) return;
    setIsCreatingFolder(true);
    try {
      const created = await createDriveFolder(newFolderName.trim(), currentFolderId);
      showToast(`Pasta "${created.name}" criada com sucesso!`, 'success');
      setNewFolderName('');
      setIsCreatingFolder(false);
      fetchFiles();
      logActivity({
        module: 'Google Drive',
        action: 'create',
        description: `Criada pasta no Google Drive: "${created.name}"`,
      });
    } catch (err: any) {
      showToast(err.message || 'Erro ao criar pasta', 'error');
      setIsCreatingFolder(false);
    }
  };

  // Upload file handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0 || !token) return;

    setIsUploading(true);
    setUploadProgress(`Enviando ${selectedFiles.length} arquivo(s)...`);
    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        setUploadProgress(`Enviando (${i + 1}/${selectedFiles.length}): ${file.name}...`);
        await uploadDriveFile(file, file.name, file.type || 'application/octet-stream', currentFolderId);
      }
      showToast('Arquivo(s) enviado(s) para o Google Drive com sucesso!', 'success');
      fetchFiles();
      logActivity({
        module: 'Google Drive',
        action: 'create',
        description: `Upload de ${selectedFiles.length} arquivo(s) para o Google Drive`,
      });
    } catch (err: any) {
      showToast(err.message || 'Erro ao enviar arquivo(s)', 'error');
    } finally {
      setIsUploading(false);
      setUploadProgress('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Backup system data to Google Drive
  const handleBackupToDrive = async () => {
    if (!token) return;
    setIsBackingUp(true);
    try {
      // Find or create "Backups - Gestão Empresarial" folder
      const listRes = await listDriveFiles('root', 'Backups - Gestão Empresarial');
      let backupFolder = listRes.files.find(
        (f) => f.mimeType === 'application/vnd.google-apps.folder' && f.name === 'Backups - Gestão Empresarial'
      );

      if (!backupFolder) {
        backupFolder = await createDriveFolder('Backups - Gestão Empresarial', 'root');
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `Backup_Gestao_Empresarial_${timestamp}.json`;

      const backupPayload = {
        exported_at: new Date().toISOString(),
        system: 'Gestão Empresarial Multiempresas',
        version: '1.0.0',
        stats: {
          total_companies: data.companies.length,
          total_sales: data.sales.length,
          total_products: data.products.length,
          total_expenses: data.expenses.length,
          total_customers: data.customers.length,
          total_suppliers: data.suppliers.length,
        },
        data: data,
      };

      await uploadJsonBackupToDrive(backupPayload, fileName, backupFolder.id);

      showToast(`Backup salvo com sucesso na pasta "Backups - Gestão Empresarial"!`, 'success', 6000);
      logActivity({
        module: 'Google Drive',
        action: 'create',
        description: `Backup completo do sistema salvo no Google Drive: "${fileName}"`,
      });

      // If we are currently in that folder, refresh
      if (currentFolderId === backupFolder.id || currentFolderId === 'root') {
        fetchFiles();
      }
    } catch (err: any) {
      showToast(err.message || 'Erro ao gerar backup no Google Drive', 'error');
    } finally {
      setIsBackingUp(false);
    }
  };

  // Auto-structure folders for all 8 companies
  const handleAutoStructureCompanies = async () => {
    if (!token) return;
    setIsAutoStructuring(true);
    try {
      // Find or create root folder "Empresas - Gestão Empresarial"
      const listRes = await listDriveFiles('root', 'Empresas - Gestão Empresarial');
      let rootEmpresasFolder = listRes.files.find(
        (f) => f.mimeType === 'application/vnd.google-apps.folder' && f.name === 'Empresas - Gestão Empresarial'
      );

      if (!rootEmpresasFolder) {
        rootEmpresasFolder = await createDriveFolder('Empresas - Gestão Empresarial', 'root');
      }

      // Check subfolders
      const subfoldersRes = await listDriveFiles(rootEmpresasFolder.id);
      const existingNames = new Set(subfoldersRes.files.map((f) => f.name.toLowerCase()));

      let createdCount = 0;
      for (const comp of data.companies) {
        const folderName = `${comp.name} (${comp.category})`;
        if (!existingNames.has(folderName.toLowerCase())) {
          const compFolder = await createDriveFolder(folderName, rootEmpresasFolder.id);
          // Create standard subfolders inside each company
          await createDriveFolder('Notas Fiscais & Recibos', compFolder.id);
          await createDriveFolder('Contratos & Documentos', compFolder.id);
          await createDriveFolder('Relatórios & Balanços', compFolder.id);
          createdCount++;
        }
      }

      showToast(
        `Estrutura organizada! ${createdCount} pastas de empresas configuradas com subpastas de Notas, Contratos e Relatórios.`,
        'success',
        6000
      );
      fetchFiles();
      logActivity({
        module: 'Google Drive',
        action: 'create',
        description: `Estruturação automática de pastas no Google Drive para as ${data.companies.length} empresas`,
      });
    } catch (err: any) {
      showToast(err.message || 'Erro ao organizar pastas', 'error');
    } finally {
      setIsAutoStructuring(false);
    }
  };

  // Execute deletion after user confirms in dialog
  const handleConfirmDelete = async () => {
    if (!itemToDelete || !token) return;
    setIsDeleting(true);
    try {
      await deleteDriveFile(itemToDelete.id);
      showToast(`"${itemToDelete.name}" foi excluído do Google Drive.`, 'info');
      logActivity({
        module: 'Google Drive',
        action: 'delete',
        description: `Excluído do Google Drive: "${itemToDelete.name}" (${itemToDelete.id})`,
      });
      setItemToDelete(null);
      fetchFiles();
    } catch (err: any) {
      showToast(err.message || 'Erro ao excluir item do Google Drive', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Helper for file type icons
  const getFileIcon = (mimeType: string) => {
    if (mimeType === 'application/vnd.google-apps.folder') {
      return <Folder className="w-5 h-5 text-amber-500 fill-amber-500/20 shrink-0" />;
    }
    if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('text')) {
      return <FileText className="w-5 h-5 text-blue-500 shrink-0" />;
    }
    if (mimeType.includes('spreadsheet') || mimeType.includes('csv') || mimeType.includes('excel')) {
      return <FileSpreadsheet className="w-5 h-5 text-emerald-500 shrink-0" />;
    }
    if (mimeType.includes('image')) {
      return <FileImage className="w-5 h-5 text-purple-500 shrink-0" />;
    }
    if (mimeType.includes('zip') || mimeType.includes('compressed') || mimeType.includes('tar')) {
      return <FileArchive className="w-5 h-5 text-orange-500 shrink-0" />;
    }
    if (mimeType.includes('json') || mimeType.includes('javascript') || mimeType.includes('code')) {
      return <FileCode className="w-5 h-5 text-teal-500 shrink-0" />;
    }
    return <FileIcon className="w-5 h-5 text-slate-400 shrink-0" />;
  };

  const filteredFiles = files.filter((file) => {
    const isFolder = file.mimeType === 'application/vnd.google-apps.folder';
    if (filterType === 'folders') return isFolder;
    if (filterType === 'files') return !isFolder;
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-teal-600 rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/15 backdrop-blur-md rounded-full text-xs font-bold tracking-wide uppercase">
              <HardDrive className="w-3.5 h-3.5 text-blue-200" />
              <span>Armazenamento & Backup na Nuvem</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Google Drive Integrado
            </h1>
            <p className="text-blue-100 text-sm leading-relaxed">
              Organize notas fiscais, recibos, contratos e gere cópias de segurança (backups) automáticas de todas as 8 empresas diretamente no seu Google Drive corporativo.
            </p>
          </div>

          {/* Auth Connection Status Card */}
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 shrink-0 flex flex-col gap-3 min-w-[280px]">
            {token && user ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || 'Usuário'}
                      className="w-10 h-10 rounded-full border-2 border-white/40"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold">
                      <UserIcon className="w-5 h-5 text-white" />
                    </div>
                  )}
                  <div className="truncate">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-xs truncate">{user.displayName || 'Conectado'}</span>
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    </div>
                    <p className="text-[11px] text-blue-100 truncate">{user.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                  <button
                    type="button"
                    onClick={fetchFiles}
                    disabled={isLoadingFiles}
                    className="flex-1 py-1.5 px-2.5 bg-white/15 hover:bg-white/25 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingFiles ? 'animate-spin' : ''}`} />
                    <span>Atualizar</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleGoogleSignOut}
                    className="py-1.5 px-3 bg-rose-500/30 hover:bg-rose-500/50 text-rose-100 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
                    title="Desconectar conta Google"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sair</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-200">
                  <AlertCircle className="w-4 h-4" />
                  <span>Conta Google não conectada</span>
                </div>
                <p className="text-[11px] text-blue-100 leading-snug">
                  Conecte sua conta do Google com permissão ao Google Drive para gerenciar seus arquivos e backups.
                </p>
                
                {/* Official Sign in with Google Button Style */}
                <button
                  type="button"
                  id="btn-google-drive-login"
                  onClick={handleGoogleSignIn}
                  disabled={isLoggingIn}
                  className="w-full bg-white hover:bg-slate-50 text-slate-800 font-bold py-2.5 px-4 rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-3 cursor-pointer active:scale-98 disabled:opacity-50"
                >
                  <svg className="w-4 h-4" viewBox="0 0 48 48">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                  </svg>
                  <span>{isLoggingIn ? 'Conectando...' : 'Entrar com o Google'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Workspace Area */}
      {!token ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 sm:p-12 text-center space-y-6 shadow-xs">
          <div className="w-16 h-16 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-3xl mx-auto flex items-center justify-center shadow-inner">
            <HardDrive className="w-8 h-8" />
          </div>

          <div className="max-w-md mx-auto space-y-2">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Conecte o Google Drive para começar
            </h2>
            <p className="text-slate-500 text-sm leading-relaxed">
              O acesso ao Google Drive permite salvar comprovantes das vendas, contratos de clientes e backups de segurança com criptografia de ponta a ponta.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isLoggingIn}
              className="py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-sm shadow-md transition-all flex items-center gap-2.5 cursor-pointer active:scale-98"
            >
              <HardDrive className="w-4 h-4" />
              <span>Conectar meu Google Drive</span>
            </button>
          </div>

          {/* Highlights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto text-left pt-6 border-t border-slate-100 dark:border-slate-800">
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-xs text-slate-900 dark:text-white">
                <FolderTree className="w-4 h-4 text-blue-600" />
                <span>Pastas por Empresa</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Separação automática de documentos por empresa e segmento.
              </p>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-xs text-slate-900 dark:text-white">
                <Database className="w-4 h-4 text-emerald-600" />
                <span>Backup Automático</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Gere cópias de segurança completas do banco de dados em JSON com um clique.
              </p>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-xs text-slate-900 dark:text-white">
                <Shield className="w-4 h-4 text-indigo-600" />
                <span>Segurança & RLS</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Confirmação explícita antes de qualquer exclusão ou modificação de arquivo.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Quick Automation Actions Toolbar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Action 1: Full Backup to Drive */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 truncate">
                <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-xl shrink-0">
                  <Database className="w-5 h-5" />
                </div>
                <div className="truncate">
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    Backup Geral do Sistema
                  </h3>
                  <p className="text-[11px] text-slate-500 truncate">
                    Exporta banco e empresas em JSON
                  </p>
                </div>
              </div>
              <button
                type="button"
                id="btn-drive-backup"
                onClick={handleBackupToDrive}
                disabled={isBackingUp}
                className="py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5 shrink-0 cursor-pointer active:scale-98 disabled:opacity-50"
              >
                <Download className={`w-3.5 h-3.5 ${isBackingUp ? 'animate-spin' : ''}`} />
                <span>{isBackingUp ? 'Gerando...' : 'Salvar no Drive'}</span>
              </button>
            </div>

            {/* Action 2: Organize Company Folders */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 truncate">
                <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl shrink-0">
                  <Building2 className="w-5 h-5" />
                </div>
                <div className="truncate">
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    Estruturar 8 Empresas
                  </h3>
                  <p className="text-[11px] text-slate-500 truncate">
                    Cria pastas de Notas e Contratos
                  </p>
                </div>
              </div>
              <button
                type="button"
                id="btn-drive-autostructure"
                onClick={handleAutoStructureCompanies}
                disabled={isAutoStructuring}
                className="py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5 shrink-0 cursor-pointer active:scale-98 disabled:opacity-50"
              >
                <FolderTree className={`w-3.5 h-3.5 ${isAutoStructuring ? 'animate-spin' : ''}`} />
                <span>{isAutoStructuring ? 'Criando...' : 'Organizar'}</span>
              </button>
            </div>

            {/* Action 3: Upload Local Files */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex items-center justify-between gap-4 sm:col-span-2 lg:col-span-1">
              <div className="flex items-center gap-3 truncate">
                <div className="p-2.5 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-xl shrink-0">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div className="truncate">
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    Enviar Arquivos / Notas
                  </h3>
                  <p className="text-[11px] text-slate-500 truncate">
                    {uploadProgress || 'PDFs, imagens, planilhas'}
                  </p>
                </div>
              </div>
              <label className="py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5 shrink-0 cursor-pointer active:scale-98">
                <UploadCloud className="w-3.5 h-3.5" />
                <span>{isUploading ? 'Enviando...' : 'Fazer Upload'}</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={isUploading}
                />
              </label>
            </div>
          </div>

          {/* Drive File Explorer Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
            {/* Explorer Header & Controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
              {/* Breadcrumbs Navigation */}
              <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-semibold text-slate-600 dark:text-slate-400 py-1">
                {breadcrumbs.map((crumb, idx) => {
                  const isLast = idx === breadcrumbs.length - 1;
                  return (
                    <React.Fragment key={crumb.id}>
                      {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
                      <button
                        type="button"
                        onClick={() => handleNavigateBreadcrumb(idx)}
                        className={`px-2.5 py-1 rounded-lg transition-all truncate max-w-[160px] ${
                          isLast
                            ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold'
                            : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {crumb.name}
                      </button>
                    </React.Fragment>
                  );
                })}
              </div>

              {/* Action Buttons: New Folder, Filter, Search */}
              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                {/* Search Bar */}
                <div className="relative flex-1 sm:w-56">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar arquivos..."
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Filter Selector */}
                <select
                  value={filterType}
                  onChange={(e: any) => setFilterType(e.target.value)}
                  className="py-1.5 px-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-700 dark:text-slate-300 font-medium focus:outline-none"
                >
                  <option value="all">Todos ({files.length})</option>
                  <option value="folders">Pastas</option>
                  <option value="files">Arquivos</option>
                </select>

                {/* New Folder Toggle Button */}
                <button
                  type="button"
                  onClick={() => setIsCreatingFolder(!isCreatingFolder)}
                  className="py-1.5 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <FolderPlus className="w-3.5 h-3.5 text-blue-600" />
                  <span>Nova Pasta</span>
                </button>
              </div>
            </div>

            {/* Inline New Folder Form */}
            {isCreatingFolder && (
              <form
                onSubmit={handleCreateFolder}
                className="p-3 bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-2xl flex items-center gap-2"
              >
                <FolderPlus className="w-4 h-4 text-blue-600 shrink-0" />
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Nome da nova pasta (ex: Notas Fiscais 2026)..."
                  className="flex-1 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={!newFolderName.trim()}
                  className="py-1.5 px-3.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shrink-0 cursor-pointer disabled:opacity-50"
                >
                  Criar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsCreatingFolder(false);
                    setNewFolderName('');
                  }}
                  className="py-1.5 px-2.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs rounded-xl transition-all shrink-0 cursor-pointer"
                >
                  Cancelar
                </button>
              </form>
            )}

            {/* Files & Folders List Table */}
            {isLoadingFiles ? (
              <div className="py-16 text-center space-y-3">
                <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
                <p className="text-xs font-medium text-slate-500">
                  Carregando arquivos do Google Drive...
                </p>
              </div>
            ) : filteredFiles.length === 0 ? (
              <div className="py-16 text-center space-y-3 bg-slate-50/50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                <Folder className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {searchQuery ? 'Nenhum arquivo encontrado para a busca' : 'Esta pasta está vazia'}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Use os botões acima para fazer upload de arquivos ou criar novas pastas.
                  </p>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden">
                {filteredFiles.map((file) => {
                  const isFolder = file.mimeType === 'application/vnd.google-apps.folder';
                  return (
                    <div
                      key={file.id}
                      className="p-3 sm:p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition-colors group"
                    >
                      {/* Left: Icon & Name */}
                      <div
                        className={`flex items-center gap-3 min-w-0 flex-1 ${
                          isFolder ? 'cursor-pointer' : ''
                        }`}
                        onClick={() => {
                          if (isFolder) handleOpenFolder(file);
                        }}
                      >
                        {getFileIcon(file.mimeType)}
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-slate-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {file.name}
                          </p>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400">
                            <span>
                              {file.modifiedTime
                                ? new Date(file.modifiedTime).toLocaleDateString('pt-BR', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })
                                : '—'}
                            </span>
                            {!isFolder && (
                              <>
                                <span>•</span>
                                <span>{formatBytes(file.size)}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Actions (Open in Drive, Download, Delete) */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {file.webViewLink && (
                          <a
                            href={file.webViewLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/60 rounded-lg transition-all"
                            title="Abrir no Google Drive"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}

                        {/* Explicit User Confirmation Trigger for Deletion */}
                        <button
                          type="button"
                          onClick={() => setItemToDelete(file)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-lg transition-all cursor-pointer"
                          title="Excluir arquivo do Google Drive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MANDATORY EXPLICIT USER CONFIRMATION MODAL FOR DESTRUCTIVE OPERATIONS */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="p-2.5 bg-rose-50 dark:bg-rose-950/60 rounded-2xl">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Confirmar Exclusão no Google Drive
                </h3>
                <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">
                  Ação destrutiva no armazenamento do Google
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs space-y-1.5">
              <p className="text-slate-500">Item a ser excluído:</p>
              <p className="font-bold text-slate-900 dark:text-white break-all">
                {itemToDelete.name}
              </p>
              <p className="text-[11px] text-slate-400">
                Tipo: {itemToDelete.mimeType === 'application/vnd.google-apps.folder' ? 'Pasta' : 'Arquivo'}{' '}
                {itemToDelete.size ? `• Tamanho: ${formatBytes(itemToDelete.size)}` : ''}
              </p>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Você tem certeza de que deseja excluir este item permanentemente do seu Google Drive? Esta ação não poderá ser desfeita.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                disabled={isDeleting}
                className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Trash2 className={`w-3.5 h-3.5 ${isDeleting ? 'animate-spin' : ''}`} />
                <span>{isDeleting ? 'Excluindo...' : 'Confirmar e Excluir'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
