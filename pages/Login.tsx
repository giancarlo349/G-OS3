
import React, { useState } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../services/firebase';
import { Shield, Key, Mail, Terminal, AlertCircle } from 'lucide-react';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isRegistering) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      setError(err.message || 'Erro na autenticação');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-4 bg-cyan-950/30 rounded-full border border-cyan-500/20 mb-4 animate-pulse">
            <Shield className="text-cyan-400" size={40} />
          </div>
          <h1 className="text-3xl font-bold font-mono text-slate-100 tracking-widest">
            BUDGET<span className="text-cyan-400">HACKER</span>
          </h1>
          <p className="text-slate-500 text-sm mt-2 font-mono uppercase tracking-tighter">Terminal de Atendimento v1.0</p>
        </div>

        <div className="bg-slate-900/50 backdrop-blur-sm border border-cyan-900/40 p-8 rounded-2xl cyber-border transition-all">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-mono text-cyan-500/70 uppercase flex items-center gap-2">
                <Mail size={12} /> ID de Atendente (Email)
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-slate-100 focus:outline-none focus:border-cyan-500/50 font-mono text-sm transition-all"
                  placeholder="atendente@empresa.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-mono text-cyan-500/70 uppercase flex items-center gap-2">
                <Key size={12} /> Código de Acesso (Senha)
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-slate-100 focus:outline-none focus:border-cyan-500/50 font-mono text-sm transition-all"
                  placeholder="********"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-950/20 border border-red-500/30 text-red-400 p-3 rounded-lg flex items-center gap-2 text-xs font-mono">
                <AlertCircle size={14} />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2 text-sm uppercase tracking-widest shadow-lg shadow-cyan-900/20"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <Terminal size={18} />
                  {isRegistering ? 'REGISTRAR ACESSO' : 'INICIAR SESSÃO'}
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <button
              onClick={() => setIsRegistering(!isRegistering)}
              className="text-cyan-500/60 hover:text-cyan-400 text-xs font-mono transition-colors uppercase tracking-widest underline decoration-cyan-900 underline-offset-4"
            >
              {isRegistering ? 'JÁ POSSUO CREDENCIAIS' : 'REQUISITAR NOVO ACESSO'}
            </button>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-3 gap-2 opacity-30 grayscale pointer-events-none">
          <div className="h-1 bg-cyan-900 rounded-full"></div>
          <div className="h-1 bg-cyan-900 rounded-full animate-pulse"></div>
          <div className="h-1 bg-cyan-900 rounded-full"></div>
        </div>
      </div>
    </div>
  );
};

export default Login;
