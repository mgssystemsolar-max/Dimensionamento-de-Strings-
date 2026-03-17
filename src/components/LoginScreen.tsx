import React, { useState, useEffect } from 'react';
import { Sun, ArrowRight, CheckCircle, Shield, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { motion } from 'motion/react';
import { signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase';

interface LoginScreenProps {
  onLogin: (email: string, isAdmin?: boolean) => void;
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<'client-login' | 'admin-login' | 'admin-register' | 'admin-forgot'>('client-login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  // Secret Admin Click Tracker
  const [clickCount, setClickCount] = useState(0);
  const [lastClickTime, setLastClickTime] = useState(0);

  // auth state is now managed globally in App.tsx

  const handleLogoClick = () => {
    const now = Date.now();
    if (now - lastClickTime > 1500) {
      // Reset if more than 1.5 seconds passed
      setClickCount(1);
    } else {
      const newCount = clickCount + 1;
      setClickCount(newCount);
      if (newCount >= 3) {
        setMode('admin-login');
        setClickCount(0);
      }
    }
    setLastClickTime(now);
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      if (result.user && result.user.email) {
        onLogin(result.user.email, false);
      }
    } catch (error: any) {
      console.error("Erro ao fazer login com Google:", error);
      setErrorMsg("Erro ao fazer login com Google. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      if (mode === 'admin-login') {
        const result = await signInWithEmailAndPassword(auth, email, password);
        if (result.user && result.user.email) {
          onLogin(result.user.email, true);
        }
      } else if (mode === 'admin-register') {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        if (result.user && result.user.email) {
          onLogin(result.user.email, true);
        }
      } else if (mode === 'admin-forgot') {
        await sendPasswordResetEmail(auth, email);
        setSuccessMsg('E-mail de redefinição de senha enviado! Verifique sua caixa de entrada.');
        setMode('admin-login');
      }
    } catch (error: any) {
      console.error("Erro de autenticação:", error);
      if (error.code === 'auth/operation-not-allowed') {
        setErrorMsg('Autenticação por E-mail/Senha não está habilitada. Acesse o Console do Firebase > Authentication > Sign-in method e habilite "Email/Password".');
      } else if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
        setErrorMsg('E-mail ou senha incorretos.');
      } else if (error.code === 'auth/email-already-in-use') {
        setErrorMsg('Este e-mail já está em uso.');
      } else if (error.code === 'auth/weak-password') {
        setErrorMsg('A senha deve ter pelo menos 6 caracteres.');
      } else {
        setErrorMsg(error.message || 'Ocorreu um erro. Tente novamente.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-white">
      {/* Left Panel - Branding & Image */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-slate-900 overflow-hidden">
        <div className="absolute inset-0">
          <img 
            src="https://images.unsplash.com/photo-1509391366360-2e959784a276?q=80&w=2072&auto=format&fit=crop" 
            alt="Solar Panels" 
            className="w-full h-full object-cover opacity-40"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent" />
        </div>
        
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <div 
            className="flex items-center gap-3 cursor-pointer select-none"
            onClick={handleLogoClick}
          >
            <div className="bg-amber-500 p-2 rounded-lg text-white">
              <Sun size={24} strokeWidth={2.5} />
            </div>
            <span className="text-xl font-bold text-white tracking-tight">
              SolarString<span className="text-amber-500">Pro</span>
            </span>
          </div>

          <div className="max-w-md">
            <h1 className="text-4xl font-bold text-white leading-tight mb-6">
              A plataforma definitiva para projetistas fotovoltaicos.
            </h1>
            <p className="text-slate-300 text-lg mb-8">
              Dimensione strings, valide inversores e gere relatórios técnicos profissionais em segundos.
            </p>
            
            <div className="space-y-4">
              {[
                'Banco de dados com +1000 módulos e inversores',
                'Leitura OCR de datasheets via IA',
                'Geração de diagramas unifilares automáticos',
                'Relatórios em PDF com a sua marca'
              ].map((feature, i) => (
                <div key={i} className="flex items-center gap-3 text-slate-300">
                  <CheckCircle size={20} className="text-amber-500 flex-shrink-0" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm text-slate-400">
            <Shield size={16} />
            <span>Ambiente seguro e criptografado</span>
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 lg:p-24 bg-white">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div 
            className="lg:hidden flex items-center gap-3 mb-12 cursor-pointer select-none"
            onClick={handleLogoClick}
          >
            <div className="bg-amber-500 p-2 rounded-lg text-white">
              <Sun size={24} strokeWidth={2.5} />
            </div>
            <span className="text-xl font-bold text-slate-900 tracking-tight">
              SolarString<span className="text-amber-500">Pro</span>
            </span>
          </div>

          <h2 className="text-3xl font-bold text-slate-900 mb-2">
            {mode === 'client-login' ? 'Bem-vindo' : 
             mode === 'admin-login' ? 'Acesso Administrador' : 
             mode === 'admin-register' ? 'Criar Administrador' : 
             'Recuperar Senha Admin'}
          </h2>
          <p className="text-slate-500 mb-8">
            {mode === 'client-login' ? 'Faça login para acessar seus projetos e dimensionamentos.' : 
             mode === 'admin-login' ? 'Área restrita para configuração do sistema.' : 
             mode === 'admin-register' ? 'Cadastre uma nova senha de administrador.' : 
             'Digite seu e-mail para receber um link de redefinição.'}
          </p>

          {errorMsg && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm">
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-xl text-sm">
              {successMsg}
            </div>
          )}

          {mode === 'client-login' ? (
            <div className="mt-6">
              <button 
                onClick={handleGoogleLogin}
                disabled={isLoading}
                type="button"
                className="w-full bg-white border-2 border-slate-200 text-slate-700 font-semibold py-3 rounded-xl transition-all hover:border-slate-300 hover:bg-slate-50 flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
                  <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
                    <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z"/>
                    <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z"/>
                    <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z"/>
                    <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z"/>
                  </g>
                </svg>
                Entrar com Google
              </button>
            </div>
          ) : (
            <>
              <form onSubmit={handleEmailAuth} className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">E-mail Admin</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail size={18} className="text-slate-400" />
                    </div>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="block w-full pl-10 pr-3 py-3 border border-slate-300 rounded-xl focus:ring-amber-500 focus:border-amber-500 sm:text-sm"
                      placeholder="admin@solarstringpro.com"
                    />
                  </div>
                </div>

                {mode !== 'admin-forgot' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Senha</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock size={18} className="text-slate-400" />
                      </div>
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="block w-full pl-10 pr-10 py-3 border border-slate-300 rounded-xl focus:ring-amber-500 focus:border-amber-500 sm:text-sm"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                )}

                {mode === 'admin-login' && (
                  <div className="flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => { setMode('admin-forgot'); setErrorMsg(''); setSuccessMsg(''); }}
                      className="text-sm font-medium text-amber-600 hover:text-amber-500"
                    >
                      Esqueceu a senha?
                    </button>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 disabled:opacity-70"
                >
                  {isLoading ? 'Aguarde...' : 
                   mode === 'admin-login' ? 'Acessar Painel' : 
                   mode === 'admin-register' ? 'Criar Senha' : 
                   'Enviar Link de Recuperação'}
                </button>
              </form>

              <div className="mt-8 text-center">
                {mode === 'admin-login' ? (
                  <p className="text-sm text-slate-600">
                    Primeiro acesso?{' '}
                    <button onClick={() => { setMode('admin-register'); setErrorMsg(''); setSuccessMsg(''); }} className="font-medium text-amber-600 hover:text-amber-500">
                      Cadastre a senha
                    </button>
                  </p>
                ) : (
                  <p className="text-sm text-slate-600">
                    <button onClick={() => { setMode('admin-login'); setErrorMsg(''); setSuccessMsg(''); }} className="font-medium text-amber-600 hover:text-amber-500">
                      Voltar para o Login
                    </button>
                  </p>
                )}
              </div>
              
              <div className="mt-4 text-center">
                <button 
                  onClick={() => { setMode('client-login'); setErrorMsg(''); setSuccessMsg(''); }} 
                  className="text-sm font-medium text-slate-500 hover:text-slate-700 underline"
                >
                  Voltar para a área do cliente
                </button>
              </div>
            </>
          )}

          <div className="mt-8 text-center space-y-4">
            <div className="pt-6 border-t border-slate-100">
              <p className="text-xs text-slate-500 mt-2">
                Suporte: <a href="mailto:mgssystemsolarclientes@gmail.com" className="text-amber-600 hover:underline">mgssystemsolarclientes@gmail.com</a>
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
