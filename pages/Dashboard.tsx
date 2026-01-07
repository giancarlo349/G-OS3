
import React, { useState, useEffect } from 'react';
import { ref, onValue, remove } from 'firebase/database';
import { db } from '../services/firebase';
import { Quote, User, QuoteStatus } from '../types';
import { Plus, Search, FileText, Trash2, DollarSign, Activity, ChevronRight, ShieldAlert, Phone, User as UserIcon, X, AlertTriangle, Clock, CheckCircle2, Send } from 'lucide-react';

interface DashboardProps {
  user: User;
  onNewQuote: () => void;
  onEditQuote: (quote: Quote) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, onNewQuote, onEditQuote }) => {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quoteToDelete, setQuoteToDelete] = useState<Quote | null>(null);

  useEffect(() => {
    if (!user) return;

    const quotesRef = ref(db, 'quotes');
    const unsubscribe = onValue(quotesRef, 
      (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const allQuotes = Object.keys(data).map(key => ({
            id: key,
            ...data[key]
          })) as Quote[];
          
          const userQuotes = allQuotes.filter(q => q.userId === user.uid);
          userQuotes.sort((a, b) => b.createdAt - a.createdAt);
          setQuotes(userQuotes);
        } else {
          setQuotes([]);
        }
        setLoading(false);
      },
      (err) => {
        console.error('FB Error:', err);
        setLoading(false);
        setError('Erro de conexão com o banco.');
      }
    );

    return () => unsubscribe();
  }, [user]);

  const triggerDelete = (e: React.MouseEvent, quote: Quote) => {
    e.preventDefault();
    e.stopPropagation();
    setQuoteToDelete(quote);
  };

  const confirmDeletion = async () => {
    if (!quoteToDelete) return;
    try {
      const itemRef = ref(db, `quotes/${quoteToDelete.id}`);
      await remove(itemRef);
      setQuoteToDelete(null);
    } catch (err) {
      console.error('Erro ao deletar:', err);
      setError('Falha ao deletar o registro.');
      setQuoteToDelete(null);
    }
  };

  const getStatusTheme = (status: QuoteStatus) => {
    switch (status) {
      case 'Enviado': 
        return {
          card: 'border-green-500/50 bg-green-950/20 hover:bg-green-900/30 hover:border-green-400',
          badge: 'text-green-300 bg-green-500/20 border-green-500/40',
          icon: <Send size={12} className="text-green-400" />,
          glow: 'shadow-[0_0_25px_rgba(34,197,94,0.15)]'
        };
      case 'Finalizado': 
        return {
          card: 'border-blue-500/50 bg-blue-950/20 hover:bg-blue-900/30 hover:border-blue-400',
          badge: 'text-blue-300 bg-blue-500/20 border-blue-500/40',
          icon: <CheckCircle2 size={12} className="text-blue-400" />,
          glow: 'shadow-[0_0_25px_rgba(59,130,246,0.15)]'
        };
      default: 
        return {
          card: 'border-amber-500/50 bg-amber-950/20 hover:bg-amber-900/30 hover:border-amber-400',
          badge: 'text-amber-300 bg-amber-500/20 border-amber-500/40',
          icon: <Clock size={12} className="text-amber-400" />,
          glow: 'shadow-[0_0_25px_rgba(245,158,11,0.15)]'
        };
    }
  };

  const filteredQuotes = quotes.filter(q => 
    q.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (q.author && q.author.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-8 animate-fade">
      {error && (
        <div className="bg-red-950/30 border border-red-500/50 p-4 rounded-xl flex items-center gap-3 text-red-400 font-mono text-xs">
          <ShieldAlert size={16} /> {error}
          <button onClick={() => setError(null)} className="ml-auto"><X size={14}/></button>
        </div>
      )}

      {/* DASHBOARD STATS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-slate-500 text-[10px] font-mono uppercase tracking-[0.2em] mb-1">Registros</p>
            <h3 className="text-2xl font-bold text-slate-100">{quotes.length}</h3>
          </div>
          <div className="p-3 bg-cyan-950/30 rounded-xl border border-cyan-500/20 text-cyan-400">
            <FileText />
          </div>
        </div>
        <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-slate-500 text-[10px] font-mono uppercase tracking-[0.2em] mb-1">Total Geral</p>
            <h3 className="text-2xl font-bold text-slate-100">
              R$ {quotes.reduce((acc, q) => acc + q.total, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </h3>
          </div>
          <div className="p-3 bg-green-950/30 rounded-xl border border-green-500/20 text-green-400">
            <DollarSign />
          </div>
        </div>
        <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-slate-500 text-[10px] font-mono uppercase tracking-[0.2em] mb-1">Terminal</p>
            <h3 className="text-2xl font-bold text-cyan-400 font-mono uppercase">Conectado</h3>
          </div>
          <div className="p-3 bg-blue-950/30 rounded-xl border border-blue-500/20 text-blue-400">
            <Activity />
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-xl font-bold font-mono text-slate-200 flex items-center gap-2">
          <ChevronRight className="text-cyan-500" size={20} />
          DIRETÓRIO_DE_ORÇAMENTOS
        </h2>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input
              type="text"
              placeholder="BUSCAR CLIENTE OU ATENDENTE..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-xs text-slate-300 focus:outline-none focus:border-cyan-500 font-mono min-w-[300px]"
            />
          </div>
          <button
            onClick={onNewQuote}
            className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold px-6 py-2 rounded-lg transition-all text-xs font-mono shadow-lg shadow-cyan-900/20"
          >
            <Plus size={18} />
            GERAR_ORÇAMENTO
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20 text-cyan-500 font-mono text-sm animate-pulse">
          LENDO_SISTEMA_DE_ARQUIVOS...
        </div>
      ) : filteredQuotes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredQuotes.map((quote) => {
            const theme = getStatusTheme(quote.status || 'Pendente');
            return (
              <div
                key={quote.id}
                onClick={() => onEditQuote(quote)}
                className={`border p-6 rounded-3xl cursor-pointer transition-all hover:scale-[1.02] group relative overflow-hidden ${theme.card} ${theme.glow}`}
              >
                {/* Background Decorativo */}
                <div className={`absolute -right-4 -top-4 opacity-10 pointer-events-none transform rotate-12`}>
                   <FileText size={120} />
                </div>

                <div className="absolute top-4 right-4 z-10">
                  <button
                    onClick={(e) => triggerDelete(e, quote)}
                    className="p-2 bg-slate-950/80 hover:bg-red-500 hover:text-white rounded-xl text-slate-500 transition-all md:opacity-0 group-hover:opacity-100 backdrop-blur-sm"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="flex items-start justify-between mb-4">
                  <div className={`px-3 py-1 rounded-full border text-[9px] font-mono uppercase tracking-widest font-black flex items-center gap-1.5 ${theme.badge}`}>
                    {theme.icon}
                    {quote.status || 'Pendente'}
                  </div>
                  <div className="text-slate-500 text-[9px] font-mono font-bold">
                    #{quote.id.slice(-6).toUpperCase()}
                  </div>
                </div>

                <h4 className="text-slate-100 font-black text-xl mb-3 truncate pr-10 uppercase tracking-tight font-outfit">{quote.clientName}</h4>
                
                <div className="space-y-2 mb-8">
                  {quote.clientPhone && (
                    <div className="flex items-center gap-2 text-slate-400 text-[10px] font-mono font-bold">
                      <Phone size={10} className="text-slate-600" />
                      {quote.clientPhone}
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-slate-400 text-[10px] font-mono font-bold">
                    <UserIcon size={10} className="text-slate-600" />
                    ATENDENTE: <span className="text-cyan-400">{(quote.author || 'SISTEMA').toUpperCase()}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-slate-800/80 pt-5">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-mono text-slate-500 uppercase font-black tracking-widest">Valor Geral</span>
                    <span className="text-slate-100 font-mono font-black text-xl">
                      <span className="text-cyan-600 text-xs mr-1">R$</span>
                      {quote.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex flex-col items-end">
                     <span className="text-[9px] font-mono text-slate-500 uppercase font-black tracking-widest">Emissão</span>
                     <span className="text-slate-400 font-mono text-[10px] font-bold">{new Date(quote.createdAt).toLocaleDateString('pt-BR')}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-20 border border-dashed border-slate-900 rounded-[2.5rem]">
          <p className="text-slate-600 font-mono text-sm uppercase">Nenhum registro encontrado</p>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO DE DELEÇÃO */}
      {quoteToDelete && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm animate-fade">
          <div className="bg-slate-900 border border-red-500/50 p-8 rounded-[2rem] max-w-sm w-full shadow-2xl space-y-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="p-4 bg-red-500/10 rounded-full border border-red-500/20 text-red-500">
                <AlertTriangle size={32} />
              </div>
              <h3 className="text-lg font-mono font-black text-slate-100 uppercase tracking-tighter">APAGAR ORÇAMENTO?</h3>
              <p className="text-xs font-mono text-slate-500 leading-relaxed uppercase">
                O orçamento de <span className="text-slate-300 font-bold">{quoteToDelete.clientName}</span> será removido permanentemente do sistema.
              </p>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => setQuoteToDelete(null)}
                className="flex-grow py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-[10px] font-black uppercase rounded-xl transition-all"
              >
                CANCELAR
              </button>
              <button 
                onClick={confirmDeletion}
                className="flex-grow py-3 bg-red-600 hover:bg-red-500 text-slate-950 font-mono text-[10px] font-black uppercase rounded-xl transition-all shadow-lg"
              >
                CONFIRMAR
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
