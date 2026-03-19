import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Zap, FileText, CheckCircle2, ArrowRight, Loader2 } from 'lucide-react';

export function Login() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setStatus('loading');
    try {
      const response = await fetch('/api/auth/signin/resend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          email,
          callbackUrl: window.location.origin,
        }),
      });

      if (response.ok) {
        setStatus('success');
      } else {
        setStatus('error');
        setErrorMessage('Falha ao enviar o link. Tente novamente.');
      }
    } catch (error) {
      setStatus('error');
      setErrorMessage('Ocorreu um erro inesperado.');
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col md:flex-row">
      {/* Left Side - Benefits (Hidden on small screens) */}
      <div className="hidden md:flex md:w-1/2 bg-slate-900 text-white p-12 flex-col justify-center">
        <div className="max-w-md mx-auto">
          <h1 className="text-4xl font-bold mb-8">
            Simplifique seus projetos solares
          </h1>
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="bg-orange-500/20 p-3 rounded-xl">
                <Zap className="w-6 h-6 text-orange-500" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">OCR via IA</h3>
                <p className="text-slate-400">Extraia dados de datasheets automaticamente com precisão.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="bg-orange-500/20 p-3 rounded-xl">
                <FileText className="w-6 h-6 text-orange-500" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">Laudos em PDF</h3>
                <p className="text-slate-400">Gere relatórios profissionais e diagramas unifilares.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="bg-orange-500/20 p-3 rounded-xl">
                <CheckCircle2 className="w-6 h-6 text-orange-500" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">Dimensionamento Exato</h3>
                <p className="text-slate-400">Cálculos precisos de strings e compatibilidade de inversores.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 rounded-2xl mb-6">
              <Zap className="w-8 h-8 text-orange-500" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Acesse sua conta</h2>
            <p className="text-slate-500">Enviaremos um link mágico para seu e-mail.</p>
          </div>

          {status === 'success' ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-emerald-50 text-emerald-800 p-6 rounded-2xl text-center border border-emerald-100"
            >
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-2">Link enviado!</h3>
              <p className="text-emerald-600/80 text-sm">
                Verifique sua caixa de entrada (e spam) para acessar a plataforma.
              </p>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
                  E-mail
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors bg-white"
                  disabled={status === 'loading'}
                />
              </div>

              {status === 'error' && (
                <p className="text-red-500 text-sm">{errorMessage}</p>
              )}

              <button
                type="submit"
                disabled={status === 'loading'}
                className="w-full bg-[#ff9800] hover:bg-[#f57c00] text-white font-semibold py-3.5 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {status === 'loading' ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Receber Link Mágico
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
