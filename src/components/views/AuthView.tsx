import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ShieldCheck, User, Lock, ArrowRight, ArrowLeft, Building2, KeyRound, UserCheck, AlertCircle, CheckCircle2, ShieldAlert } from 'lucide-react';

interface AuthViewProps {
  initialMessage?: string | null;
}

type AuthScreenState = 'login' | 'forgot_password' | 'create_master' | 'register_operator';

export const AuthView: React.FC<AuthViewProps> = ({ initialMessage }) => {
  const {
    login,
    setupMasterUser,
    requestPasswordRecovery,
    registerPublicUser,
    hasMasterConfigured,
    isCheckingMaster,
    supabaseConfig,
  } = useApp();

  const [screen, setScreen] = useState<AuthScreenState>('login');
  const [successBanner, setSuccessBanner] = useState<string | null>(initialMessage || null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Login form state
  const [loginUser, setLoginUser] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Forgot password form state
  const [recoveryIdentifier, setRecoveryIdentifier] = useState('');
  const [recoverySuccessMessage, setRecoverySuccessMessage] = useState<string | null>(null);

  // Create Master form state
  const [masterName, setMasterName] = useState('');
  const [masterUser, setMasterUser] = useState('');
  const [masterEmail, setMasterEmail] = useState('');
  const [masterPassword, setMasterPassword] = useState('');
  const [masterConfirmPassword, setMasterConfirmPassword] = useState('');

  // Register Operator form state
  const [opName, setOpName] = useState('');
  const [opEmail, setOpEmail] = useState('');
  const [opPassword, setOpPassword] = useState('');
  const [opConfirmPassword, setOpConfirmPassword] = useState('');

  // Handlers
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessBanner(null);

    const cleanUser = loginUser.trim();
    if (!cleanUser) {
      setErrorMessage('Por favor, informe seu Usuário ou E-mail.');
      return;
    }
    if (!loginPassword) {
      setErrorMessage('Por favor, digite sua senha de acesso.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await login(cleanUser, loginPassword);
      if (!result.success) {
        setErrorMessage(result.message || 'Credenciais inválidas. Verifique seu usuário e senha.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Falha ao autenticar.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecoverySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setRecoverySuccessMessage(null);

    const cleanId = recoveryIdentifier.trim();
    if (!cleanId) {
      setErrorMessage('Por favor, informe seu Usuário ou E-mail cadastrado.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await requestPasswordRecovery(cleanId);
      if (result.success) {
        setRecoverySuccessMessage(result.message);
      } else {
        setErrorMessage(result.message || 'Usuário não localizado na base de dados.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao processar recuperação.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateMasterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessBanner(null);

    if (!masterName.trim()) {
      setErrorMessage('Por favor, informe o Nome Completo do Administrador.');
      return;
    }
    if (!masterUser.trim()) {
      setErrorMessage('Por favor, defina um nome de Usuário para o Master.');
      return;
    }
    if (masterPassword.length < 6) {
      setErrorMessage('A senha deve ter no mínimo 6 caracteres.');
      return;
    }
    if (masterPassword !== masterConfirmPassword) {
      setErrorMessage('As senhas digitadas não coincidem.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await setupMasterUser({
        name: masterName.trim(),
        username: masterUser.trim(),
        email: masterEmail.trim() || undefined,
        password: masterPassword,
      });

      if (!result.success) {
        setErrorMessage(result.message || 'Erro ao criar Administrador Master.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao inicializar Master.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterOperatorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!opName.trim()) {
      setErrorMessage('Por favor, preencha seu Nome Completo.');
      return;
    }
    if (!opEmail.trim() || !opEmail.includes('@')) {
      setErrorMessage('Por favor, insira um e-mail válido.');
      return;
    }
    if (opPassword.length < 6) {
      setErrorMessage('A senha deve conter no mínimo 6 caracteres.');
      return;
    }
    if (opPassword !== opConfirmPassword) {
      setErrorMessage('As senhas não coincidem.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await registerPublicUser({
        name: opName.trim(),
        email: opEmail.trim(),
        password: opPassword,
      });

      if (result.success) {
        setSuccessBanner('Conta criada com sucesso! Solicite ao Administrador Master a liberação das suas empresas.');
        setLoginUser(opEmail.trim());
        setLoginPassword(opPassword);
        setScreen('login');
      } else {
        setErrorMessage(result.message || 'Erro ao cadastrar operador.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro inesperado.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 font-sans select-none">
      {/* Background Ambience */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-indigo-600/15 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white shadow-xl shadow-indigo-500/25 mb-3 border border-indigo-400/30">
            <Building2 className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight uppercase">
            OMNIGESTÃO
          </h1>
          <p className="text-indigo-400 font-semibold text-xs tracking-wider uppercase mt-0.5">
            Painel Multiempresas
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-slate-900/95 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl shadow-black/60">
          {/* Success Banner */}
          {successBanner && (
            <div className="mb-5 p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-emerald-200">Sucesso</p>
                <p className="mt-0.5">{successBanner}</p>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-rose-200">Atenção</p>
                <p className="mt-0.5">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* SCREEN 1: LOGIN */}
          {screen === 'login' && (
            <div>
              <div className="mb-5 text-center">
                <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wide">
                  Acesso ao Sistema
                </h2>
                <p className="text-slate-400 text-xs mt-0.5">
                  Informe suas credenciais para acessar o painel
                </p>
              </div>

              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label htmlFor="input-login-user" className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    USUÁRIO
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      id="input-login-user"
                      type="text"
                      required
                      autoComplete="username"
                      placeholder="Digite seu usuário ou e-mail"
                      value={loginUser}
                      onChange={(e) => setLoginUser(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-800/90 border border-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-white text-sm placeholder:text-slate-500 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="input-login-password" className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    SENHA
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      id="input-login-password"
                      type="password"
                      required
                      autoComplete="current-password"
                      placeholder="Digite sua senha"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-800/90 border border-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-white text-sm placeholder:text-slate-500 transition-colors"
                    />
                  </div>
                </div>

                <div className="pt-2 space-y-3">
                  <button
                    id="btn-login-submit"
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 group disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer uppercase tracking-wider"
                  >
                    {isLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Autenticando...</span>
                      </>
                    ) : (
                      <>
                        <span>ENTRAR</span>
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </button>

                  <div className="text-center">
                    <button
                      id="btn-forgot-password"
                      type="button"
                      onClick={() => {
                        setErrorMessage(null);
                        setSuccessBanner(null);
                        setRecoverySuccessMessage(null);
                        setRecoveryIdentifier(loginUser);
                        setScreen('forgot_password');
                      }}
                      className="text-xs font-semibold text-slate-400 hover:text-indigo-400 transition-colors uppercase tracking-wider py-1 cursor-pointer"
                    >
                      ESQUECI MINHA SENHA
                    </button>
                  </div>
                </div>
              </form>

              {/* Discrete First Admin Option only if Master is not configured */}
              {!isCheckingMaster && !hasMasterConfigured && (
                <div className="mt-6 pt-5 border-t border-slate-800/80 text-center">
                  <button
                    id="btn-create-first-master"
                    type="button"
                    onClick={() => {
                      setErrorMessage(null);
                      setSuccessBanner(null);
                      setScreen('create_master');
                    }}
                    className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors flex items-center justify-center gap-1.5 mx-auto py-1 cursor-pointer"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Criar primeiro administrador</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* SCREEN 2: RECUPERAR SENHA */}
          {screen === 'forgot_password' && (
            <div>
              <div className="mb-5 text-center">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 mb-2">
                  <KeyRound className="w-5 h-5" />
                </div>
                <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wide">
                  RECUPERAR SENHA
                </h2>
                <p className="text-slate-400 text-xs mt-1">
                  Informe seu usuário ou e-mail para recuperar o acesso
                </p>
              </div>

              {recoverySuccessMessage ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs">
                    <div className="flex items-center gap-2 font-bold text-emerald-200 mb-1">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Solicitação Registrada</span>
                    </div>
                    <p className="leading-relaxed">{recoverySuccessMessage}</p>
                  </div>

                  <button
                    id="btn-recover-back-success"
                    type="button"
                    onClick={() => {
                      setErrorMessage(null);
                      setRecoverySuccessMessage(null);
                      setScreen('login');
                    }}
                    className="w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Voltar para o Login</span>
                  </button>
                </div>
              ) : (
                <form onSubmit={handleRecoverySubmit} className="space-y-4">
                  <div>
                    <label htmlFor="input-recover-user" className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                      USUÁRIO OU E-MAIL DE RECUPERAÇÃO
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        id="input-recover-user"
                        type="text"
                        required
                        placeholder="Digite seu usuário ou e-mail cadastrado"
                        value={recoveryIdentifier}
                        onChange={(e) => setRecoveryIdentifier(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-800/90 border border-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-white text-sm placeholder:text-slate-500 transition-colors"
                      />
                    </div>
                  </div>

                  <div className="pt-2 space-y-2.5">
                    <button
                      id="btn-recover-submit"
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-3.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 group disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer uppercase tracking-wider"
                    >
                      {isLoading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Localizando Usuário...</span>
                        </>
                      ) : (
                        <>
                          <span>CONTINUAR</span>
                          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </>
                      )}
                    </button>

                    <button
                      id="btn-recover-back"
                      type="button"
                      onClick={() => {
                        setErrorMessage(null);
                        setRecoverySuccessMessage(null);
                        setScreen('login');
                      }}
                      className="w-full py-2.5 px-4 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Voltar para o Login</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* SCREEN 3: CRIAR ADMINISTRADOR MASTER */}
          {screen === 'create_master' && (
            <div>
              <div className="mb-5 text-center">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mb-2">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wide">
                  CRIAR ADMINISTRADOR MASTER
                </h2>
                <p className="text-slate-400 text-xs mt-1">
                  Configure o primeiro administrador com acesso total ao sistema
                </p>
              </div>

              <form onSubmit={handleCreateMasterSubmit} className="space-y-3.5">
                <div>
                  <label htmlFor="input-master-name" className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Nome Completo
                  </label>
                  <input
                    id="input-master-name"
                    type="text"
                    required
                    placeholder="Ex: Victor Oliveira"
                    value={masterName}
                    onChange={(e) => setMasterName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-white text-sm placeholder:text-slate-500 transition-colors"
                  />
                </div>

                <div>
                  <label htmlFor="input-master-user" className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Usuário
                  </label>
                  <input
                    id="input-master-user"
                    type="text"
                    required
                    placeholder="Ex: VICTOR"
                    value={masterUser}
                    onChange={(e) => setMasterUser(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-white text-sm placeholder:text-slate-500 transition-colors"
                  />
                </div>

                <div>
                  <label htmlFor="input-master-email" className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    E-mail (Opcional)
                  </label>
                  <input
                    id="input-master-email"
                    type="email"
                    placeholder="seu.email@empresa.com"
                    value={masterEmail}
                    onChange={(e) => setMasterEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-white text-sm placeholder:text-slate-500 transition-colors"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="input-master-password" className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                      Senha
                    </label>
                    <input
                      id="input-master-password"
                      type="password"
                      required
                      placeholder="Mínimo 6 dígitos"
                      value={masterPassword}
                      onChange={(e) => setMasterPassword(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-white text-sm placeholder:text-slate-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label htmlFor="input-master-confirm" className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                      Confirmar Senha
                    </label>
                    <input
                      id="input-master-confirm"
                      type="password"
                      required
                      placeholder="Repita a senha"
                      value={masterConfirmPassword}
                      onChange={(e) => setMasterConfirmPassword(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-white text-sm placeholder:text-slate-500 transition-colors"
                    />
                  </div>
                </div>

                <div className="pt-2 space-y-2.5">
                  <button
                    id="btn-create-master-submit"
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 group disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer uppercase tracking-wider"
                  >
                    {isLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Configurando Master...</span>
                      </>
                    ) : (
                      <>
                        <span>CRIAR MASTER</span>
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </button>

                  <button
                    id="btn-master-back"
                    type="button"
                    onClick={() => {
                      setErrorMessage(null);
                      setScreen('login');
                    }}
                    className="w-full py-2.5 px-4 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Voltar para o Login</span>
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Cloud database indicator */}
        <div className="mt-4 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
          <span className={`w-2 h-2 rounded-full ${supabaseConfig.connected ? 'bg-emerald-500' : 'bg-slate-600'}`} />
          <span>{supabaseConfig.connected ? 'Conectado ao Supabase Cloud' : 'OmniGestão Enterprise'}</span>
        </div>
      </div>
    </div>
  );
};
