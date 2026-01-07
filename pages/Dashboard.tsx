
import React, { useState, useEffect } from 'react';
import { ref, onValue, remove } from 'firebase/database';
import { db } from '../services/firebase';
import { Quote, User, QuoteStatus } from '../types';
import { Plus, Search, FileText, Trash2, DollarSign, Activity, ChevronRight, ShieldAlert, Phone, User as UserIcon, X, AlertTriangle } from 'lucide-react';

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

  const getStatusColor = (status: QuoteStatus) => {
    switch (status) {
      case 'Enviado': return 'text-green-400 bg-green-500/10 border-green-500/30';
      case 'Finalizado': return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30';
      default: return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
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
              placeholder="BUSCAR CLIENTE OU COLABORADOR..."
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredQuotes.map((quote) => (
            <div
              key={quote.id}
              onClick={() => onEditQuote(quote)}
              className="bg-slate-900/20 border border-slate-800/60 hover:border-cyan-500/40 p-5 rounded-2xl cursor-pointer transition-all hover:bg-slate-900/40 group relative"
            >
              <div className="absolute top-4 right-4 z-10">
                <button
                  onClick={(e) => triggerDelete(e, quote)}
                  className="p-2 bg-slate-950/50 hover:bg-red-500 hover:text-white rounded-lg text-slate-500 transition-all md:opacity-0 group-hover:opacity-100"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <div className="flex items-start justify-between mb-4">
                <div className={`px-2 py-0.5 rounded border text-[9px] font-mono uppercase tracking-widest font-black ${getStatusColor(quote.status)}`}>
                  {quote.status || 'Pendente'}
                </div>
                <div className="text-slate-700 text-[9px] font-mono">
                  ID: {quote.id.slice(-6).toUpperCase()}
                </div>
              </div>

              <h4 className="text-slate-100 font-bold text-lg mb-1 truncate pr-10 uppercase tracking-tight">{quote.clientName}</h4>
              
              <div className="space-y-1 mb-6">
                {quote.clientPhone && (
                  <div className="flex items-center gap-2 text-slate-500 text-[10px] font-mono">
                    <Phone size={10} className="text-cyan-700" />
                    {quote.clientPhone}
                  </div>
                )}
                <div className="flex items-center gap-2 text-slate-400 text-[10px] font-mono font-bold">
                  <UserIcon size={10} className="text-cyan-600" />
                  COLAB: <span className="text-slate-300">{(quote.author || 'N/A').toUpperCase()}</span>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-slate-800/50 pt-4">
                <div className="flex flex-col">
                  <span className="text-[9px] font-mono text-slate-600 uppercase">Valor Total</span>
                  <span className="text-cyan-400 font-mono font-bold text-lg">R$ {quote.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex flex-col items-end">
                   <span className="text-[9px] font-mono text-slate-600 uppercase">Data</span>
                   <span className="text-slate-500 font-mono text-[10px]">{new Date(quote.createdAt).toLocaleDateString('pt-BR')}</span>
                </div>
              </div>
            </div>
          ))}
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
