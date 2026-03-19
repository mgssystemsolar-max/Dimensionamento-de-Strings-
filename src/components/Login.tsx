import React, { useState } from 'react';
import { Eye, EyeOff, Mail, Lock, Sun, ArrowLeft } from 'lucide-react';

interface LoginProps {
  onLogin: (email: string) => void;
}

export function Login({ onLogin }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (isRecovering) {
      if (!email.includes('@')) {
        setMessage({ type: 'error', text: 'Por favor, insira um e-mail válido.' });
        return;
      }
      setMessage({ type: 'success', text: 'Instruções de recuperação enviadas para o seu e-mail (simulação).' });
      setTimeout(() => {
        setIsRecovering(false);
        setMessage(null);
      }, 3000);
      return;
    }

    if (isRegistering) {
      if (!email.includes('@') || password.length < 4) {
        setMessage({ type: 'error', text: 'E-mail inválido ou senha muito curta.' });
        return;
      }
      setMessage({ type: 'success', text: 'Conta criada com sucesso! Fazendo login...' });
      setTimeout(() => {
        onLogin(email);
      }, 1500);
      return;
    }

    if (!email.includes('@') || password.length < 4) {
      setMessage({ type: 'error', text: 'E-mail inválido ou senha muito curta.' });
      return;
    }

    // Simula o login com sucesso
    onLogin(email);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        <div className="p-8">
          <div className="flex justify-center mb-8">
            <div className="flex items-center gap-2">
              <div className="bg-amber-500 p-2 rounded-lg text-white shadow-amber-200 shadow-md">
                <Sun size={24} strokeWidth={2.5} />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 leading-none">
                  SolarString<span className="text-amber-600">Pro</span>
                </h1>
              </div>
            </div>
          </div>

          <h2 className="text-xl font-bold text-slate-900 text-center mb-2">
            {isRecovering ? 'Recuperar Senha' : isRegistering ? 'Criar Nova Conta' : 'Bem-vindo de volta'}
          </h2>
          <p className="text-sm text-slate-500 text-center mb-6">
            {isRecovering 
              ? 'Insira seu e-mail para receber as instruções de recuperação.'
              : isRegistering
              ? 'Preencha os dados abaixo para se cadastrar.'
              : 'Faça login para acessar a ferramenta.'}
          </p>

          {message && (
            <div className={`p-3 rounded-lg mb-6 text-sm font-medium ${
              message.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            }`}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">E-mail</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail size={18} />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all"
                  placeholder="seu@email.com"
                  required
                />
              </div>
            </div>

            {!isRecovering && (
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-medium text-slate-700">Senha</label>
                  {!isRegistering && (
                    <button 
                      type="button" 
                      onClick={() => {
                        setIsRecovering(true);
                        setMessage(null);
                      }}
                      className="text-xs font-medium text-amber-600 hover:text-amber-700"
                    >
                      Esqueceu a senha?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock size={18} />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {!isRegistering && (
                  <div className="flex items-center mt-3">
                    <input
                      id="remember-me"
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="h-4 w-4 text-amber-600 focus:ring-amber-500 border-slate-300 rounded cursor-pointer"
                    />
                    <label htmlFor="remember-me" className="ml-2 block text-sm text-slate-700 cursor-pointer">
                      Lembrar-me
                    </label>
                  </div>
                )}
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-slate-900 text-white font-medium py-2.5 rounded-lg hover:bg-slate-800 transition-colors mt-2"
            >
              {isRecovering ? 'Enviar Instruções' : isRegistering ? 'Cadastrar' : 'Entrar'}
            </button>
          </form>

          {!isRecovering && (
            <div className="mt-6 text-center text-sm text-slate-600">
              {isRegistering ? (
                <>
                  Já tem uma conta?{' '}
                  <button type="button" onClick={() => { setIsRegistering(false); setMessage(null); }} className="text-amber-600 font-medium hover:underline">
                    Faça login
                  </button>
                </>
              ) : (
                <>
                  Não tem uma conta?{' '}
                  <button type="button" onClick={() => { setIsRegistering(true); setMessage(null); }} className="text-amber-600 font-medium hover:underline">
                    Cadastre-se
                  </button>
                </>
              )}
            </div>
          )}

          {isRecovering && (
            <button
              onClick={() => {
                setIsRecovering(false);
                setMessage(null);
              }}
              className="mt-6 flex items-center justify-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 w-full"
            >
              <ArrowLeft size={16} /> Voltar para o login
            </button>
          )}
        </div>
        
        <div className="bg-slate-50 border-t border-slate-200 p-4 text-center">
          <p className="text-xs text-slate-500">
            Suporte e contato: <a href="mailto:mgssystemsolarclientes@gmail.com" className="text-amber-600 hover:underline">mgssystemsolarclientes@gmail.com</a> | Tel: +55 (88) 98836-0143
          </p>
        </div>
      </div>
    </div>
  );
}
