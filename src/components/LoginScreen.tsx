import React, { useState, useEffect } from 'react';
import { Sun, ArrowRight, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { motion } from 'motion/react';
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';

interface LoginScreenProps {
  onLogin: (email: string) => void;
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && user.email) {
        onLogin(user.email);
      }
    });
    return () => unsubscribe();
  }, [onLogin]);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      if (result.user && result.user.email) {
        onLogin(result.user.email);
      }
    } catch (error) {
      console.error("Erro ao fazer login com Google:", error);
      alert("Erro ao fazer login. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900 flex items-center justify-center p-4 z-50">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-amber-500/20 via-slate-900/0 to-slate-900/0" />
        <div className="h-full w-full bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden relative z-10"
      >
        <div className="p-8">
          <div className="flex flex-col items-center mb-8">
            <div className="bg-amber-500 p-3 rounded-xl text-white shadow-lg shadow-amber-500/30 mb-4">
              <Sun size={32} strokeWidth={2.5} />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">
              SolarString<span className="text-amber-600">Pro</span>
            </h1>
            <p className="text-slate-500 text-sm mt-2 text-center">
              Ferramenta Profissional de Dimensionamento
            </p>
          </div>

          <div className="space-y-4">
            <button 
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full bg-white border border-slate-300 text-slate-700 font-medium py-3 rounded-xl transition-all hover:bg-slate-50 hover:shadow-md flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              <svg viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
                <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
                  <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z"/>
                  <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z"/>
                  <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z"/>
                  <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z"/>
                </g>
              </svg>
              {isLoading ? 'Conectando...' : 'Entrar com Google'}
            </button>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-100">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <CheckCircle size={14} className="text-emerald-500" />
                <span>Banco de Módulos</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <CheckCircle size={14} className="text-emerald-500" />
                <span>Leitura OCR</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <CheckCircle size={14} className="text-emerald-500" />
                <span>Relatórios PDF</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <CheckCircle size={14} className="text-emerald-500" />
                <span>Integração Drive</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-slate-50 px-8 py-4 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-400">
            &copy; 2024 SolarString Pro. v2.1.0
          </p>
          <p className="text-[10px] text-slate-400 mt-1">
            Suporte: <a href="mailto:mgssystemsolarclientes@gmail.com" className="hover:text-slate-600 transition-colors">mgssystemsolarclientes@gmail.com</a>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
