import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Lock, ArrowRight, ArrowLeft, Building2, KeyRound, AlertCircle, CheckCircle2, Mail, UserPlus, User } from 'lucide-react';

interface AuthViewProps {
  initialMessage?: string | null;
}

type AuthScreenState = 'login' | 'register' | 'forgot_password';

export const AuthView: React.FC<AuthViewProps> = ({ initialMessage }) => {
  const { login, registerPublicUser, requestPasswordRecovery, supabaseConfig } = useApp();

  const [screen, setScreen] = useState<AuthScreenState>('login');
  const [successBanner, setSuccessBanner] = useState<string | null>(initialMessage || null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Register form state
  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState('');

  // Forgot password form state
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoverySuccessMessage, setRecoverySuccessMessage] = useState<string | null>(null);

  // Handlers
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessBanner(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErrorMessage('Por favor, informe seu e-mail.');
      return;
    }
    if (!password) {
      setErrorMessage('Por favor, digite sua senha.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await login(cleanEmail, password);
      if (!result.success) {
        setErrorMessage(result.message || 'Credenciais inválidas. Verifique seu e-mail e senha.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Falha ao autenticar.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessBanner(null);

    const cleanName = registerName.trim();
    const cleanEmail = registerEmail.trim().toLowerCase();

    if (!cleanName) {
      setErrorMessage('Por favor, informe seu nome completo.');
      return;
    }
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMessage('Por favor, informe um endereço de e-mail válido.');
      return;
    }
    if (!registerPassword || registerPassword.length < 6) {
      setErrorMessage('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (registerPassword !== registerConfirmPassword) {
      setErrorMessage('As senhas digitadas não coincidem.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await registerPublicUser({
        name: cleanName,
        email: cleanEmail,
        password: registerPassword,
      });

      if (result.success) {
        setSuccessBanner(result.message || 'Conta criada com sucesso! Você já pode realizar o login.');
        setEmail(cleanEmail);
        setPassword(registerPassword);
        setScreen('login');
      } else {
        setErrorMessage(result.message || 'Erro ao criar conta.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Falha ao processar cadastro.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecoverySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setRecoverySuccessMessage(null);

    const cleanEmail = recoveryEmail.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMessage('Por favor, informe um e-mail válido.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await requestPasswordRecovery(cleanEmail);
      if (result.success) {
        setRecoverySuccessMessage(result.message);
      } else {
        setErrorMessage(result.message || 'Erro ao solicitar recuperação de senha.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao processar recuperação.');
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
                  <label htmlFor="input-login-email" className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    E-MAIL
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      id="input-login-email"
                      type="email"
                      required
                      autoComplete="email"
                      placeholder="seu.email@empresa.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
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
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
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

                  <div className="flex items-center justify-between text-xs pt-1">
                    <button
                      id="btn-forgot-password"
                      type="button"
                      onClick={() => {
                        setErrorMessage(null);
                        setSuccessBanner(null);
                        setRecoverySuccessMessage(null);
                        setRecoveryEmail(email);
                        setScreen('forgot_password');
                      }}
                      className="text-slate-400 hover:text-indigo-400 transition-colors uppercase tracking-wider font-semibold py-1 cursor-pointer"
                    >
                      Esqueci a senha
                    </button>

                    <button
                      id="btn-switch-register"
                      type="button"
                      onClick={() => {
                        setErrorMessage(null);
                        setSuccessBanner(null);
                        setRegisterEmail(email);
                        setScreen('register');
                      }}
                      className="text-indigo-400 hover:text-indigo-300 font-bold uppercase tracking-wider py-1 cursor-pointer flex items-center gap-1"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Criar Conta</span>
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* SCREEN 2: CRIAR CONTA (CADASTRO) */}
          {screen === 'register' && (
            <div>
              <div className="mb-5 text-center">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mb-2">
                  <UserPlus className="w-5 h-5" />
                </div>
                <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wide">
                  CRIAR NOVA CONTA
                </h2>
                <p className="text-slate-400 text-xs mt-1">
                  Cadastre-se para acessar o sistema OmniGestão
                </p>
              </div>

              <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
                <div>
                  <label htmlFor="input-register-name" className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    NOME COMPLETO
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      id="input-register-name"
                      type="text"
                      required
                      placeholder="Ex: Victor Oliveira"
                      value={registerName}
                      onChange={(e) => setRegisterName(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-white text-sm placeholder:text-slate-500 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="input-register-email" className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    E-MAIL
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      id="input-register-email"
                      type="email"
                      required
                      placeholder="seu.email@exemplo.com"
                      value={registerEmail}
                      onChange={(e) => setRegisterEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-white text-sm placeholder:text-slate-500 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="input-register-password" className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    SENHA (MÍNIMO 6 DÍGITOS)
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      id="input-register-password"
                      type="password"
                      required
                      placeholder="Crie sua senha segura"
                      value={registerPassword}
                      onChange={(e) => setRegisterPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-white text-sm placeholder:text-slate-500 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="input-register-confirm" className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    CONFIRMAR SENHA
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      id="input-register-confirm"
                      type="password"
                      required
                      placeholder="Repita sua senha"
                      value={registerConfirmPassword}
                      onChange={(e) => setRegisterConfirmPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-white text-sm placeholder:text-slate-500 transition-colors"
                    />
                  </div>
                </div>

                <div className="pt-2 space-y-2.5">
                  <button
                    id="btn-register-submit"
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 group disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer uppercase tracking-wider"
                  >
                    {isLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Cadastrando...</span>
                      </>
                    ) : (
                      <>
                        <span>FINALIZAR CADASTRO</span>
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </button>

                  <button
                    id="btn-register-back"
                    type="button"
                    onClick={() => {
                      setErrorMessage(null);
                      setScreen('login');
                    }}
                    className="w-full py-2.5 px-4 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Já tenho uma conta (Fazer Login)</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* SCREEN 3: RECUPERAR SENHA */}
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
                  Informe seu e-mail cadastrado para receber o link de recuperação
                </p>
              </div>

              {recoverySuccessMessage ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs">
                    <div className="flex items-center gap-2 font-bold text-emerald-200 mb-1">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>E-mail Enviado</span>
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
                    <label htmlFor="input-recover-email" className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                      E-MAIL CADASTRADO
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        id="input-recover-email"
                        type="email"
                        required
                        placeholder="seu.email@empresa.com"
                        value={recoveryEmail}
                        onChange={(e) => setRecoveryEmail(e.target.value)}
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
                          <span>Enviando link...</span>
                        </>
                      ) : (
                        <>
                          <span>ENVIAR LINK DE RECUPERAÇÃO</span>
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
