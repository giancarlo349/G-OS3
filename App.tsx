
import React, { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './services/firebase';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import QuoteEditor from './pages/QuoteEditor';
import ProductsManager from './pages/ProductsManager';
import { User, Quote } from './types';
import { Terminal, LogOut, Database, LayoutDashboard } from 'lucide-react';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState<'dashboard' | 'editor' | 'products'>('dashboard');
  const [editingQuote, setEditingQuote] = useState<Quote | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser({ uid: firebaseUser.uid, email: firebaseUser.email });
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = () => {
    auth.signOut();
    setCurrentPage('dashboard');
    setEditingQuote(null);
  };

  const openEditor = (quote?: Quote) => {
    setEditingQuote(quote || null);
    setCurrentPage('editor');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950 font-mono text-cyan-400">
        <div className="animate-pulse flex flex-col items-center">
          <Terminal size={48} className="mb-4" />
          <p className="text-xl">INICIALIZANDO SISTEMA...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="border-b border-cyan-900/50 bg-slate-950/80 backdrop-blur-md sticky top-0 z-[100]">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div 
            className="flex items-center gap-2 cursor-pointer group"
            onClick={() => setCurrentPage('dashboard')}
          >
            <div className="p-2 bg-cyan-950 rounded-lg border border-cyan-500/30 group-hover:border-cyan-400 transition-colors">
              <Terminal className="text-cyan-400" size={20} />
            </div>
            <span className="font-mono font-bold text-lg tracking-tight text-slate-200">
              BUDGET<span className="text-cyan-400">HACKER</span>
            </span>
          </div>
          
          <div className="flex items-center gap-2 md:gap-6">
            <div className="hidden md:flex items-center gap-1 border-r border-slate-800 pr-6 mr-2">
               <button 
                onClick={() => setCurrentPage('dashboard')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-mono text-xs transition-all ${currentPage === 'dashboard' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30' : 'text-slate-500 hover:text-slate-300'}`}
               >
                 <LayoutDashboard size={14} /> DASHBOARD
               </button>
               <button 
                onClick={() => setCurrentPage('products')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-mono text-xs transition-all ${currentPage === 'products' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30' : 'text-slate-500 hover:text-slate-300'}`}
               >
                 <Database size={14} /> PRODUTOS
               </button>
            </div>

            <div className="flex items-center gap-4">
              <span className="hidden md:inline text-[10px] text-slate-500 font-mono">
                OPERADOR: <span className="text-cyan-600">{user.email?.split('@')[0].toUpperCase()}</span>
              </span>
              <button 
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-1.5 rounded bg-slate-900 border border-slate-700 hover:border-red-500/50 hover:bg-red-950/20 hover:text-red-400 transition-all text-xs font-mono uppercase"
              >
                <LogOut size={14} />
                SAIR
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-grow container mx-auto px-4 py-8">
        {currentPage === 'dashboard' && (
          <Dashboard user={user} onNewQuote={() => openEditor()} onEditQuote={openEditor} />
        )}
        {currentPage === 'editor' && (
          <QuoteEditor 
            user={user}
            quote={editingQuote} 
            onClose={() => {
              setCurrentPage('dashboard');
              setEditingQuote(null);
            }} 
          />
        )}
        {currentPage === 'products' && (
          <ProductsManager user={user} />
        )}
      </main>
      
      <footer className="py-4 border-t border-slate-900 text-center text-[10px] text-slate-600 font-mono">
        SYSTEM STABLE | V1.0.8 | ENCRYPTED LINK: SECURED
      </footer>
    </div>
  );
};

export default App;
