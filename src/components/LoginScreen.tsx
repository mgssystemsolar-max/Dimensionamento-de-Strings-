import React, { useState } from 'react';
import { Sun, ArrowRight, CheckCircle, Mail } from 'lucide-react';
import { motion } from 'motion/react';
import { sendSignInLinkToEmail } from 'firebase/auth';
import { auth } from '../firebase';

export function LoginScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    const actionCodeSettings = {
      url: window.location.href,
      handleCodeInApp: true,
    };

    try {
      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      window.localStorage.setItem('emailForSignIn', email);
      setSuccessMsg('Link de acesso enviado! Verifique sua caixa de entrada.');
    } catch (error: any) {
      console.error("Erro ao enviar link:", error);
      if (error.code === 'auth/invalid-email') {
        setErrorMsg('O e-mail informado é inválido. Verifique se digitou corretamente.');
      } else if (error.code === 'auth/operation-not-allowed') {
        setErrorMsg('O login por link não está habilitado no momento.');
      } else {
        setErrorMsg(error.message || 'Ocorreu um erro ao enviar o e-mail. Tente novamente.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-white flex-col items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-orange-100 text-[#ff9800] mb-4">
            <Sun size={32} strokeWidth={2.5} />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-2">
            SolarString<span className="text-[#ff9800]">Pro</span>
          </h1>
          <p className="text-slate-500">Acesse sua conta para continuar</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 p-8">
          {successMsg ? (
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mb-2">
                <CheckCircle size={24} />
              </div>
              <h3 className="text-lg font-medium text-slate-900">E-mail Enviado!</h3>
              <p className="text-slate-500 text-sm">{successMsg}</p>
              <button
                onClick={() => setSuccessMsg('')}
                className="mt-4 text-sm font-medium text-[#ff9800] hover:text-orange-600"
              >
                Tentar outro e-mail
              </button>
            </div>
          ) : (
            <form onSubmit={handleEmailAuth} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
                  Seu E-mail da Hotmart
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#ff9800] focus:border-[#ff9800] transition-colors sm:text-sm"
                    placeholder="aluno@exemplo.com"
                  />
                </div>
              </div>

              {errorMsg && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-sm text-red-600">
                  {errorMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || !email}
                className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-[#ff9800] hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#ff9800] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    Receber Link de Acesso
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}
