import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { SUPABASE_SCHEMA_SQL } from '../../lib/supabase-sql';
import { testSupabaseConnection, testSupabaseAuthSetup, createSupabaseMaster, getSupabaseClient } from '../../lib/supabase';
import {
  Database,
  Key,
  Copy,
  Check,
  Download,
  Upload,
  RefreshCw,
  Sparkles,
  Smartphone,
  ShieldCheck,
  ShieldAlert,
  Server,
  Layers,
  CheckCircle2,
  AlertCircle,
  CloudUpload,
  CloudDownload,
  Globe,
  Lock,
  Mail,
  UserCheck,
  ExternalLink,
  Monitor,
  Terminal,
} from 'lucide-react';

export const DatabaseSettingsView: React.FC = () => {
  const {
    data,
    loadDemoData,
    resetData,
    setData,
    supabaseConfig,
    realtimeStatus,
    updateSupabaseConfig,
    syncWithSupabase,
    isSyncing,
    showToast,
  } = useApp();

  const [copied, setCopied] = useState(false);
  const [supabaseUrl, setSupabaseUrl] = useState(supabaseConfig.url || '');
  const [supabaseKey, setSupabaseKey] = useState(supabaseConfig.anonKey || '');
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  // Auth Provider Test state
  const [isTestingAuth, setIsTestingAuth] = useState(false);
  const [authTestResult, setAuthTestResult] = useState<{
    success: boolean;
    message: string;
    details?: {
      hasClient: boolean;
      authEndpointReachable: boolean;
      sessionActive: boolean;
      emailProviderConfigured: boolean;
      masterProfileFound: boolean;
      userEmail?: string;
    };
  } | null>(null);

  // App Build Guide Tab
  const [buildTab, setBuildTab] = useState<'windows' | 'android'>('windows');

  useEffect(() => {
    setSupabaseUrl(supabaseConfig.url || '');
    setSupabaseKey(supabaseConfig.anonKey || '');
  }, [supabaseConfig]);

  const handleSaveAndTest = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUrl = supabaseUrl.trim();
    const cleanKey = supabaseKey.trim();

    updateSupabaseConfig({
      url: cleanUrl,
      anonKey: cleanKey,
      connected: false,
    });

    if (!cleanUrl || !cleanKey) {
      setTestResult({
        success: false,
        message: 'Preencha a URL e a Anon Key do Supabase.',
      });
      return;
    }

    setIsTesting(true);
    const res = await testSupabaseConnection(cleanUrl, cleanKey);
    setIsTesting(false);
    setTestResult(res);

    if (res.success) {
      updateSupabaseConfig({
        url: cleanUrl,
        anonKey: cleanKey,
        connected: true,
      });
      showToast('Conectado ao Supabase com sucesso!', 'success');
    } else {
      showToast(`Falha na conexão: ${res.message}`, 'error');
    }
  };

  const handleTestAuthProvider = async () => {
    setIsTestingAuth(true);
    const res = await testSupabaseAuthSetup(supabaseConfig);
    setIsTestingAuth(false);
    setAuthTestResult(res);
    if (res.success) {
      showToast('Provedor de Autenticação Supabase validado com sucesso!', 'success');
    } else {
      showToast(res.message, 'error');
    }
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SCHEMA_SQL);
    setCopied(true);
    showToast('Script SQL copiado para a área de transferência!', 'success');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(data, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `omnigestao_backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('Backup JSON exportado com sucesso!', 'success');
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], 'UTF-8');
      fileReader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (parsed && Array.isArray(parsed.companies)) {
            setData(parsed);
            showToast('Backup restaurado com sucesso!', 'success');
          } else {
            showToast('Arquivo JSON inválido ou formato incompatível.', 'error');
          }
        } catch {
          showToast('Erro ao ler arquivo JSON.', 'error');
        }
      };
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-16 lg:pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Banco de Dados & Supabase
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
              PostgreSQL & Nuvem
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Persistência em nuvem multi-empresa, sincronização em tempo real e backup estruturado
          </p>
        </div>
      </div>

      {/* Supabase Connection Setup Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Conexão Supabase / PostgreSQL
              </h2>
              <p className="text-[11px] text-slate-500">
                Insira suas credenciais do projeto Supabase para ativar a sincronização direta
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                realtimeStatus === 'CONNECTED'
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                  : realtimeStatus === 'CONNECTING'
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  realtimeStatus === 'CONNECTED'
                    ? 'bg-emerald-500 animate-pulse'
                    : realtimeStatus === 'CONNECTING'
                    ? 'bg-amber-500 animate-ping'
                    : 'bg-slate-400'
                }`}
              />
              {realtimeStatus === 'CONNECTED'
                ? 'Realtime Ativo'
                : realtimeStatus === 'CONNECTING'
                ? 'Conectando Realtime...'
                : 'Realtime Inativo'}
            </span>
          </div>
        </div>

        <form onSubmit={handleSaveAndTest} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-indigo-500" />
                Project URL (Supabase)
              </label>
              <input
                type="url"
                placeholder="https://xyzcompany.supabase.co"
                value={supabaseUrl}
                onChange={(e) => setSupabaseUrl(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-white placeholder:text-slate-400"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-amber-500" />
                Anon / Public API Key
              </label>
              <input
                type="password"
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                value={supabaseKey}
                onChange={(e) => setSupabaseKey(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-white placeholder:text-slate-400"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={isTesting}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isTesting ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <ShieldCheck className="w-3.5 h-3.5" />
                )}
                <span>{isTesting ? 'Testando Conexão...' : 'Salvar & Testar Conexão'}</span>
              </button>

              <button
                type="button"
                disabled={isSyncing}
                onClick={() => syncWithSupabase('push')}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <CloudUpload className={`w-3.5 h-3.5 ${isSyncing ? 'animate-bounce' : ''}`} />
                <span>Salvar Tudo na Nuvem (Push)</span>
              </button>

              <button
                type="button"
                disabled={isSyncing}
                onClick={() => syncWithSupabase('pull')}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs shadow-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <CloudDownload className="w-3.5 h-3.5" />
                <span>Baixar da Nuvem (Pull)</span>
              </button>
            </div>

            {testResult && (
              <div
                className={`text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 ${
                  testResult.success
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-500" />
                )}
                <span>{testResult.message}</span>
              </div>
            )}
          </div>
        </form>
      </div>

      {/* Supabase Auth Provider (Email/Password) Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  Provedor de Autenticação (Email & Senha)
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                  Supabase Auth Client
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Gerenciamento de credenciais seguras para o Administrador Master e usuários operadores
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={isTestingAuth || !supabaseConfig.connected}
            onClick={handleTestAuthProvider}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isTestingAuth ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <UserCheck className="w-3.5 h-3.5" />
            )}
            <span>{isTestingAuth ? 'Testando Provedor Auth...' : 'Testar Provedor Auth'}</span>
          </button>
        </div>

        {/* Auth Provider Checklist Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span className="text-xs font-bold text-slate-900 dark:text-white">Email & Senha</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Fluxo PKCE com persistência local e auto-refresh de tokens JWT configurado no cliente.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck className="w-4 h-4 text-indigo-500 shrink-0" />
              <span className="text-xs font-bold text-slate-900 dark:text-white">Usuário MASTER</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Criação via <code className="text-[10px] bg-slate-200 dark:bg-slate-700 px-1 py-0.5 rounded font-mono">client.auth.signUp()</code> com metadata de permissão irrestrita.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-1">
              <Layers className="w-4 h-4 text-amber-500 shrink-0" />
              <span className="text-xs font-bold text-slate-900 dark:text-white">Trigger & Perfis</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Sincronização atômica entre <code className="text-[10px] bg-slate-200 dark:bg-slate-700 px-1 py-0.5 rounded font-mono">auth.users</code> e <code className="text-[10px] bg-slate-200 dark:bg-slate-700 px-1 py-0.5 rounded font-mono">public.profiles</code>.
            </p>
          </div>
        </div>

        {/* Auth Provider Test Output */}
        {authTestResult && (
          <div
            className={`p-4 rounded-2xl border text-xs ${
              authTestResult.success
                ? 'bg-emerald-50/80 border-emerald-300 text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-200'
                : 'bg-rose-50/80 border-rose-300 text-rose-900 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-200'
            }`}
          >
            <div className="flex items-start gap-2.5">
              {authTestResult.success ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                <p className="font-bold">{authTestResult.message}</p>
                {authTestResult.details && (
                  <div className="flex flex-wrap gap-2 pt-1 text-[11px]">
                    <span className="px-2 py-0.5 rounded bg-white/60 dark:bg-black/30 border">
                      Endpoint Auth: {authTestResult.details.authEndpointReachable ? 'Acessível' : 'Inacessível'}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-white/60 dark:bg-black/30 border">
                      Sessão Ativa: {authTestResult.details.sessionActive ? `Conectado (${authTestResult.details.userEmail || 'Sessão ativa'})` : 'Nenhuma sessão ativa'}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-white/60 dark:bg-black/30 border">
                      Perfil Master: {authTestResult.details.masterProfileFound ? 'Encontrado em profiles' : 'Aguardando criação'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Helpful Tip for Supabase Dashboard */}
        <div className="p-3 bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-2xl text-[11px] text-amber-900 dark:text-amber-300 flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <strong>Dica de Configuração no Painel Supabase:</strong>
            <p className="mt-0.5">
              Em <strong>Authentication → Providers → Email</strong>, certifique-se de que o provedor está habilitado. Se desejar que o Master e operadores acessem imediatamente sem aguardar envio de e-mail de confirmação, desmarque a opção <em>&quot;Confirm email&quot;</em>.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Supabase Info & SQL Schema (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Supabase Script Box */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-xl">
                  <Server className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                    Script SQL Completo (Supabase / PostgreSQL)
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    Tabelas, índices, chaves estrangeiras e políticas de segurança RLS prontas
                  </p>
                </div>
              </div>

              <button
                onClick={handleCopySql}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all active:scale-95 cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copiado!' : 'Copiar SQL'}</span>
              </button>
            </div>

            <div className="relative">
              <pre className="p-4 bg-slate-950 text-emerald-400 font-mono text-[11px] rounded-2xl overflow-x-auto max-h-72 border border-slate-800 leading-relaxed">
                {SUPABASE_SCHEMA_SQL}
              </pre>
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              Instruções de Conexão: Para conectar um projeto Supabase real, abra seu <strong>SQL Editor</strong> no painel do Supabase e execute o script acima. Ele criará as 10 tabelas relacionais com isolamento multi-empresa por chave estrangeira.
            </p>
          </div>

          {/* Backup & Restore Section */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Database className="w-4 h-4 text-indigo-600" />
              Backup & Restauração de Dados
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={handleExportJson}
                className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 hover:border-indigo-500 text-left transition-all flex items-center justify-between group cursor-pointer"
              >
                <div>
                  <h4 className="font-bold text-xs text-slate-900 dark:text-white group-hover:text-indigo-600">
                    Exportar Backup JSON
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Baixar todas as 8 empresas e lançamentos
                  </p>
                </div>
                <Download className="w-4 h-4 text-slate-400 group-hover:text-indigo-600" />
              </button>

              <label className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 hover:border-indigo-500 text-left transition-all flex items-center justify-between group cursor-pointer">
                <div>
                  <h4 className="font-bold text-xs text-slate-900 dark:text-white group-hover:text-indigo-600">
                    Restaurar Backup JSON
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Carregar arquivo de backup salvo
                  </p>
                </div>
                <Upload className="w-4 h-4 text-slate-400 group-hover:text-indigo-600" />
                <input type="file" accept=".json" onChange={handleImportJson} className="hidden" />
              </label>
            </div>
          </div>

          {/* Installable Apps (Windows .EXE & Android .APK) Section */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded-xl">
                  <Monitor className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Aplicativos Instaláveis (Windows & Android)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Ambos os clientes utilizam o mesmo Supabase com isolamento multiempresa e RLS
                  </p>
                </div>
              </div>

              {/* Tabs selector */}
              <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl gap-1">
                <button
                  type="button"
                  onClick={() => setBuildTab('windows')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    buildTab === 'windows'
                      ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <Monitor className="w-3.5 h-3.5" />
                  <span>Windows (.EXE)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBuildTab('android')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    buildTab === 'android'
                      ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Android (.APK)</span>
                </button>
              </div>
            </div>

            {buildTab === 'windows' ? (
              <div className="space-y-3">
                <div className="p-3 bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-2xl text-xs text-blue-950 dark:text-blue-200 space-y-1.5">
                  <div className="flex items-center gap-2 font-bold">
                    <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span>Versão Desktop para Notebook Master (Windows)</span>
                  </div>
                  <p className="text-[11px] text-blue-800 dark:text-blue-300">
                    Gera o executável <strong>GestaoEmpresarial.exe</strong> com tela nativa, inicialização direta na tela de login e comunicação criptografada com o Supabase.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-blue-600" />
                    Comandos de Compilação no Terminal
                  </label>
                  <pre className="p-3.5 bg-slate-950 text-blue-300 font-mono text-xs rounded-xl overflow-x-auto border border-slate-800 leading-relaxed">
{`# 1. Instalar dependências de build (se necessário)
npm install -D electron electron-builder

# 2. Gerar o instalador GestaoEmpresarial.exe
npm run electron:build

# Arquivo gerado em:
# -> dist_electron/GestaoEmpresarial Setup.exe
# -> dist_electron/GestaoEmpresarial.exe (versão portátil)`}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-xs text-emerald-950 dark:text-emerald-200 space-y-1.5">
                  <div className="flex items-center gap-2 font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Versão Android APK para Celulares dos Operadores</span>
                  </div>
                  <p className="text-[11px] text-emerald-800 dark:text-emerald-300">
                    Gera o pacote <strong>GestaoEmpresarial.apk</strong> via Capacitor Android, pronto para instalação direta em celulares de operadores e gerentes.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-emerald-600" />
                    Comandos de Compilação no Terminal
                  </label>
                  <pre className="p-3.5 bg-slate-950 text-emerald-300 font-mono text-xs rounded-xl overflow-x-auto border border-slate-800 leading-relaxed">
{`# 1. Sincronizar o build com o projeto Android
npm run cap:sync

# 2. Compilar o arquivo GestaoEmpresarial.apk
npm run android:build

# Arquivo gerado em:
# -> android/app/build/outputs/apk/debug/app-debug.apk
# (Renomeie para GestaoEmpresarial.apk)`}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: PWA & Demo Switchers (1 col) */}
        <div className="space-y-6">
          {/* PWA Information Box */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-indigo-600">
              <Smartphone className="w-5 h-5" />
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900 dark:text-white">
                Acesso Mobile & PWA
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              O sistema foi 100% desenhado para alimentação rápida pelo smartphone, com botões de toque largo, modais ergonômicos e navegação inferior.
            </p>
            <div className="p-3 bg-indigo-50/60 dark:bg-indigo-950/40 rounded-2xl text-[11px] text-indigo-900 dark:text-indigo-300">
              <strong>Como instalar no celular:</strong>
              <ul className="list-disc pl-4 mt-1 space-y-1">
                <li>No Safari (iOS): Toque em "Compartilhar" → "Adicionar à Tela de Início".</li>
                <li>No Chrome (Android): Toque nos 3 pontos → "Instalar aplicativo".</li>
              </ul>
            </div>
          </div>

          {/* Demo Data Actions */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs space-y-3">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              Ambiente de Demonstração
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Alterne entre seus dados reais e dados de demonstração para testar relatórios e métricas.
            </p>

            <button
              onClick={loadDemoData}
              className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Carregar 8 Empresas Demo</span>
            </button>

            <button
              onClick={() => {
                if (confirm('Tem certeza que deseja zerar os dados locais para cadastrar tudo do zero?')) {
                  resetData();
                }
              }}
              className="w-full py-2.5 rounded-xl border border-rose-200 dark:border-rose-900 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 text-xs font-semibold transition-colors cursor-pointer"
            >
              Limpar Banco de Dados
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
