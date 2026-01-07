
import React, { useState, useEffect, useRef } from 'react';
import { ref, push, set, onValue } from 'firebase/database';
import { db } from '../services/firebase';
import { Quote, QuoteItem, Product, User as AppUser, QuoteStatus } from '../types';
import { 
  X, Trash2, Save, Search, ArrowLeft, ChevronRight,
  Play, User, Phone, ShoppingBag, Check, 
  ChevronLeft, ChevronUp, ChevronDown, Plus, 
  ShieldAlert, LayoutList, SearchCode, UserCheck, Activity, AlertCircle, Printer, FileText, CheckCircle2,
  Calendar, Info, Tag
} from 'lucide-react';

interface QuoteEditorProps {
  user: AppUser;
  quote: Quote | null;
  onClose: () => void;
}

const QuoteEditor: React.FC<QuoteEditorProps> = ({ user, quote, onClose }) => {
  const [clientName, setClientName] = useState(quote?.clientName || '');
  const [clientPhone, setClientPhone] = useState(quote?.clientPhone || '');
  const [author, setAuthor] = useState(quote?.author || user.email?.split('@')[0] || '');
  const [status, setStatus] = useState<QuoteStatus>(quote?.status || 'Pendente');
  const [items, setItems] = useState<QuoteItem[]>(quote?.items || []);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showPrintView, setShowPrintView] = useState(false);
  const [copiedSuccess, setCopiedSuccess] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [manualPrice, setManualPrice] = useState('');
  const [suggestions, setSuggestions] = useState<Partial<Product>[]>([]);
  const [history, setHistory] = useState<Product[]>([]);
  
  const [listFilter, setListFilter] = useState('');
  const [listMatches, setListMatches] = useState<string[]>([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);

  const [isAuditMode, setIsAuditMode] = useState(false);
  const [auditIndex, setAuditIndex] = useState(0);

  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const itemRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  useEffect(() => {
    if (!user) return;
    const productsRef = ref(db, 'products');
    onValue(productsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const userProducts = Object.keys(data).map(key => ({ id: key, ...data[key] })).filter(p => p.userId === user.uid) as Product[];
        setHistory(userProducts);
      }
    });
  }, [user]);

  useEffect(() => {
    if (listFilter.length > 1) {
      const matches = items.filter(i => i.description.toLowerCase().includes(listFilter.toLowerCase())).map(i => i.id);
      setListMatches(matches);
      setCurrentMatchIndex(0);
      if (matches.length > 0) scrollToItem(matches[0]);
    } else {
      setListMatches([]);
    }
  }, [listFilter, items]);

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    if (val.length < 2) { setSuggestions([]); return; }
    const localMatches = history.filter(p => p.description.toLowerCase().includes(val.toLowerCase())).slice(0, 10);
    setSuggestions(localMatches);
  };

  const addItem = (desc: string, price: number) => {
    const newItem: QuoteItem = {
      id: crypto.randomUUID(),
      description: desc.toUpperCase(),
      price: price,
      quantity: 1,
      comment: '',
      isVerified: false
    };
    setItems(prev => [...prev, newItem]);
    setSearchQuery('');
    setManualPrice('');
    setSuggestions([]);
  };

  const addManualItem = () => {
    if (!searchQuery) return;
    addItem(searchQuery, parseFloat(manualPrice) || 0);
  };

  const updateItem = (id: string, updates: Partial<QuoteItem>) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
  };

  const confirmItemDeletion = () => {
    if (itemToDelete) {
      setItems(prev => prev.filter(item => item.id !== itemToDelete));
      setItemToDelete(null);
    }
  };

  const navigateMatches = (dir: 'next' | 'prev') => {
    if (listMatches.length === 0) return;
    let nextIdx = dir === 'next' ? currentMatchIndex + 1 : currentMatchIndex - 1;
    if (nextIdx >= listMatches.length) nextIdx = 0;
    if (nextIdx < 0) nextIdx = listMatches.length - 1;
    setCurrentMatchIndex(nextIdx);
    scrollToItem(listMatches[nextIdx]);
  };

  const scrollToItem = (id: string) => {
    setTimeout(() => {
      const el = itemRefs.current[id];
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 50);
  };

  const saveQuote = async (silent = false) => {
    if (!clientName) {
        setErrorMsg("IDENTIFICAÇÃO DO CLIENTE É OBRIGATÓRIA.");
        return null;
    }
    if (!silent) setSaving(true);
    try {
      const data = { 
        clientName: clientName.toUpperCase(), 
        clientPhone, 
        author: author.toUpperCase(), 
        status, 
        items, 
        total, 
        updatedAt: Date.now(), 
        userId: user.uid 
      };
      let finalId = quote?.id;
      if (quote?.id) {
        await set(ref(db, `quotes/${quote.id}`), { ...data, createdAt: quote.createdAt });
      } else {
        const newRef = push(ref(db, 'quotes'));
        finalId = newRef.key || '';
        await set(newRef, { ...data, createdAt: Date.now() });
      }
      if (!silent) onClose();
      return finalId;
    } catch (err) { 
        console.error(err); 
        setErrorMsg("FALHA AO SALVAR NO SERVIDOR.");
        return null;
    } finally { 
        if (!silent) setSaving(false); 
    }
  };

  const handleGenerateBudget = async () => {
    const success = await saveQuote(true);
    if (success) {
      const msg = `Olá! Estou te enviando o orçamento 😊\nPeço, por gentileza, que confira os comentários, valores e quantidades.\nCaso precise de alguma alteração, é só nos avisar que ajustamos.\nEm alguns casos, adaptamos alguns produtos para os que temos à pronta entrega.\nSe encontrar qualquer erro ou tiver dúvidas, é só falar com a gente.`;
      
      try {
        await navigator.clipboard.writeText(msg);
        setCopiedSuccess(true);
        setTimeout(() => setCopiedSuccess(false), 3000);
      } catch (err) {
        console.warn("Falha ao copiar para clipboard.");
      }
      setShowPrintView(true);
    }
  };

  const total = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const health = items.length === 0 ? 0 : Math.round((items.filter(i => i.isVerified).length / items.length) * 100);

  if (showPrintView) {
    return (
      <div className="fixed inset-0 z-[2000] bg-slate-50 text-black overflow-auto animate-fade font-soft">
        <div className="no-print bg-white/95 backdrop-blur-md border-b border-slate-200 p-4 sticky top-0 flex justify-between items-center px-10 shadow-sm">
            <div className="flex items-center gap-6">
                <button onClick={() => setShowPrintView(false)} className="flex items-center gap-2 px-4 py-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-all font-bold text-xs border border-slate-200 uppercase">
                    <ArrowLeft size={14}/> VOLTAR AO EDITOR
                </button>
                <div className="flex flex-col">
                   <span className="text-emerald-700 font-black uppercase text-[10px] tracking-widest">VISUALIZAÇÃO DE DOCUMENTO A4</span>
                   {copiedSuccess && <span className="text-emerald-500 text-[9px] font-bold animate-pulse flex items-center gap-1"><CheckCircle2 size={10}/> MENSAGEM COPIADA PARA O WHATSAPP</span>}
                </div>
            </div>
            <button onClick={() => window.print()} className="flex items-center gap-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black px-10 py-3 rounded-xl shadow-lg transition-all active:scale-95 text-xs">
                <Printer size={18}/> IMPRIMIR ORÇAMENTO
            </button>
        </div>

        {/* DOCUMENTO FORMAL EM PORTUGUÊS (OTIMIZADO PARA A4) */}
        <div className="a4-container mx-auto bg-white text-black shadow-2xl my-10 print:my-0 print:shadow-none budget-document relative">
            <div className="p-[15mm] h-full flex flex-col">
              {/* CABEÇALHO SUAVE */}
              <div className="flex flex-col items-center text-center space-y-2 mb-10">
                  <div className="w-16 h-16 mb-2 flex items-center justify-center bg-yellow-50 rounded-full border-2 border-yellow-200">
                      <ShoppingBag size={32} className="text-emerald-700" />
                  </div>
                  <h1 className="text-xl font-black uppercase tracking-wide text-emerald-900 font-outfit">MASATOCHI YAHIRO BAZAR E ARTIGOS EM GERAL</h1>
                  <p className="text-[10px] font-bold text-slate-500 tracking-wider">CNPJ: 05.862.953/0001-82</p>
                  <p className="text-[9px] text-slate-400 max-w-md font-medium uppercase">
                    RUA JOAQUIM JANUS PENTEADO, 125 | A. JORDANESIA/ CAJAMAR-SP | CEP 07786-520
                  </p>
                  <div className="flex items-center gap-3 mt-2 text-[9px] font-bold text-emerald-800 bg-emerald-50 px-5 py-1 rounded-full border border-emerald-100">
                    <span className="flex items-center gap-1"><Phone size={8}/> (11) 4447-3578</span>
                    <span className="w-1 h-1 rounded-full bg-emerald-300"></span>
                    <span>vendasbazarnovareal@gmail.com</span>
                  </div>
              </div>

              <div className="flex items-center gap-4 mb-8">
                  <div className="h-[1px] flex-grow bg-slate-100"></div>
                  <h2 className="text-center text-[10px] font-black tracking-[0.4em] uppercase text-slate-400 font-outfit">ORÇAMENTO DE MATERIAIS</h2>
                  <div className="h-[1px] flex-grow bg-slate-100"></div>
              </div>

              <div className="grid grid-cols-2 gap-8 mb-6 px-1">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-[8px] font-black text-emerald-600 uppercase tracking-widest"><User size={10}/> CLIENTE</div>
                    <div className="text-base font-black text-slate-900 border-b border-emerald-50 pb-0.5">{clientName || 'NÃO INFORMADO'}</div>
                  </div>
                  <div className="text-right space-y-1">
                    <div className="flex items-center justify-end gap-2 text-[8px] font-black text-emerald-600 uppercase tracking-widest"><Calendar size={10}/> EMISSÃO</div>
                    <div className="text-sm font-bold text-slate-800">{new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                  </div>
              </div>

              {/* TABELA LIMPA E SUAVE */}
              <div className="flex-grow overflow-hidden border border-slate-100 rounded-2xl shadow-sm">
                  <table className="w-full border-collapse">
                      <thead>
                          <tr className="bg-emerald-600 text-white">
                              <th className="px-5 py-3 text-left uppercase text-[9px] font-black tracking-widest">PRODUTO / DESCRIÇÃO</th>
                              <th className="px-5 py-3 text-center text-[9px] font-black w-16">QTD.</th>
                              <th className="px-5 py-3 text-right text-[9px] font-black w-32">PREÇO UNIT.</th>
                              <th className="px-5 py-3 text-right text-[9px] font-black w-32">TOTAL</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                          {items.map((item, idx) => (
                              <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-yellow-50/20'}>
                                  <td className="px-5 py-2.5 text-[10px] uppercase font-bold text-slate-700">
                                      <div className="flex items-start gap-2">
                                          <Tag size={8} className="mt-1 text-emerald-200" />
                                          <span>{item.description}</span>
                                      </div>
                                      {item.comment && (
                                        <div className="text-[8px] italic text-slate-400 font-medium mt-0.5 ml-4">
                                          Nota: {item.comment}
                                        </div>
                                      )}
                                  </td>
                                  <td className="px-5 py-2.5 text-center text-[10px] font-bold text-slate-500">{item.quantity}</td>
                                  <td className="px-5 py-2.5 text-right text-[10px] font-medium text-slate-500">R$ {item.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                  <td className="px-5 py-2.5 text-right text-[10px] font-black text-emerald-900">R$ {(item.price * item.quantity).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                              </tr>
                          ))}
                          {[...Array(Math.max(0, 15 - items.length))].map((_, i) => (
                              <tr key={`empty-${i}`} className={`h-8 ${(items.length + i) % 2 === 0 ? 'bg-white' : 'bg-yellow-50/20'}`}>
                                  <td></td><td></td><td></td><td></td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>

              {/* RODAPÉ DO DOCUMENTO */}
              <div className="mt-8 border-t border-emerald-100 pt-6">
                <div className="flex justify-between items-center mb-10 px-4">
                   <div className="text-[9px] font-black uppercase text-emerald-800 tracking-widest">VALOR TOTAL DO ORÇAMENTO</div>
                   <div className="text-xl font-black text-emerald-900">R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                </div>

                <div className="grid grid-cols-[1fr_200px] gap-8 items-start">
                    <div className="space-y-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                      <div className="flex gap-3">
                          <div className="w-8 h-8 flex-shrink-0 bg-yellow-100 text-yellow-700 flex items-center justify-center font-black text-xs rounded-xl shadow-sm">!</div>
                          <div className="space-y-0.5">
                            <p className="text-[9px] font-black text-slate-900 uppercase">Aviso de Estoque</p>
                            <p className="text-[8px] font-medium text-slate-500 leading-tight">
                                Marcas e qualidade podem variar. Adaptamos alguns itens para pronta entrega caso necessário.
                            </p>
                          </div>
                      </div>
                      <div className="flex gap-3">
                          <div className="w-8 h-8 flex-shrink-0 bg-emerald-100 text-emerald-700 flex items-center justify-center font-black text-xs rounded-xl shadow-sm"><Info size={14}/></div>
                          <div className="space-y-0.5">
                            <p className="text-[9px] font-black text-slate-900 uppercase">Política de Validade</p>
                            <p className="text-[8px] font-bold text-emerald-700 italic leading-tight">
                                Válido por 04 dias úteis. Sujeito a alterações diárias de preço e estoque.
                            </p>
                          </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-center justify-center self-end pb-2">
                        <div className="text-center space-y-2">
                            <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">ATENDENTE RESPONSÁVEL</p>
                            <div className="text-sm font-black text-emerald-900 border-b border-emerald-100 px-4 min-w-[150px]">
                              {author.toUpperCase() || 'EQUIPE BAZAR'}
                            </div>
                        </div>
                    </div>
                </div>
              </div>
            </div>
        </div>
        
        <style>{`
            .a4-container {
                width: 210mm;
                min-height: 297mm;
                background: white;
            }
            .budget-document, .budget-document * {
                font-family: 'Outfit', sans-serif !important;
            }
            @media print {
                body { background: white !important; }
                .a4-container {
                    margin: 0 !important;
                    padding: 0 !important;
                    box-shadow: none !important;
                    width: 100% !important;
                    min-height: auto !important;
                }
                .budget-document { 
                    border: none !important;
                    margin: 0 !important;
                }
                @page {
                  size: A4;
                  margin: 0;
                }
            }
        `}</style>
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-6 animate-fade pb-20 no-print ${isAuditMode ? 'audit-mode-active' : ''}`}>
      
      {errorMsg && (
        <div className="bg-red-950/30 border border-red-500/50 p-4 rounded-xl flex items-center justify-between gap-3 text-red-400 font-mono text-xs">
          <div className="flex items-center gap-2"><AlertCircle size={16} /> {errorMsg}</div>
          <button onClick={() => setErrorMsg(null)}><X size={14}/></button>
        </div>
      )}

      {/* CABEÇALHO / TOOLBAR */}
      <div className="flex justify-between items-center bg-slate-900/90 backdrop-blur-xl p-4 rounded-2xl border border-cyan-500/10 shadow-2xl sticky top-20 z-50">
        <div className="flex items-center gap-4">
          <button className="p-2 hover:bg-slate-800 rounded-lg text-cyan-600 transition-colors" onClick={onClose}><ArrowLeft size={22}/></button>
          <div>
            <h2 className="font-mono font-black text-slate-100 flex items-center gap-2 tracking-tighter uppercase">
              <span className="text-cyan-500">_</span>SISTEMA_DE_ORÇAMENTO
            </h2>
            <div className="flex items-center gap-3 text-[9px] font-mono font-bold uppercase text-slate-500">
               <span>REF: {quote?.id ? quote.id.slice(-8).toUpperCase() : 'NOVO_CADASTRO'}</span>
               <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse"></span>
               <span className={status === 'Pendente' ? 'text-amber-500' : 'text-green-500'}>{status}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
           <button 
            onClick={() => { setIsAuditMode(!isAuditMode); if(!isAuditMode) setAuditIndex(0); }} 
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-[10px] font-bold border transition-all ${isAuditMode ? 'bg-cyan-500 text-slate-950 border-cyan-300' : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-cyan-500/50'}`}
           >
              {isAuditMode ? <X size={14}/> : <Play size={14}/>} {isAuditMode ? 'FECHAR_CONFERÊNCIA' : 'INICIAR_CONFERÊNCIA'}
           </button>
           <button onClick={() => saveQuote()} className="flex items-center gap-2 px-6 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-500 font-black font-mono text-[10px] rounded-lg transition-all shadow-lg active:scale-95">
              <Save size={14}/> {saving ? 'SALVANDO...' : 'SALVAR_DATABASE'}
           </button>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_380px] gap-6 items-start">
        <div className="space-y-6">
          <div className="bg-slate-900/40 p-6 rounded-[2rem] border border-slate-800/40 shadow-inner">
             <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="space-y-1.5 md:col-span-2">
                   <label className="text-[9px] font-mono text-cyan-800 uppercase font-black tracking-widest flex items-center gap-2"><User size={10}/> Nome_do_Cliente</label>
                   <input className="cyber-input" value={clientName} onChange={e => setClientName(e.target.value)} placeholder="CLIENTE" />
                </div>
                <div className="space-y-1.5">
                   <label className="text-[9px] font-mono text-cyan-800 uppercase font-black tracking-widest flex items-center gap-2"><Phone size={10}/> WhatsApp</label>
                   <input className="cyber-input" value={clientPhone} onChange={e => setClientPhone(e.target.value)} placeholder="(00) 00000-0000" />
                </div>
                <div className="space-y-1.5">
                   <label className="text-[9px] font-mono text-cyan-800 uppercase font-black tracking-widest flex items-center gap-2"><UserCheck size={10}/> Atendente</label>
                   <input className="cyber-input" value={author} onChange={e => setAuthor(e.target.value)} placeholder="VENDEDOR" />
                </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="space-y-1.5 md:col-span-1">
                   <label className="text-[9px] font-mono text-cyan-800 uppercase font-black tracking-widest flex items-center gap-2"><Activity size={10}/> Status</label>
                   <select 
                     className="cyber-input bg-slate-950 text-slate-200 cursor-pointer"
                     value={status}
                     onChange={e => setStatus(e.target.value as QuoteStatus)}
                   >
                     <option value="Pendente">PENDENTE</option>
                     <option value="Finalizado">FINALIZADO</option>
                     <option value="Enviado">ENVIADO</option>
                   </select>
                </div>
             </div>

             <div className="relative pt-4 border-t border-slate-800/50">
                <label className="text-[10px] font-mono text-cyan-500 uppercase font-black mb-3 flex items-center gap-2">
                   <ShoppingBag size={12}/> ENTRADA_DE_DADOS_PRODUTO
                </label>
                <div className="flex gap-2">
                   <div className="relative flex-grow">
                      <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" />
                      <input 
                        className="cyber-input pl-12 py-4 text-base bg-slate-950/80 border-slate-800" 
                        placeholder="Buscar no histórico ou digitar novo..." 
                        value={searchQuery} 
                        onChange={e => handleSearchChange(e.target.value)} 
                      />
                   </div>
                   <div className="relative w-36">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-cyan-700 font-mono font-bold">R$</span>
                      <input 
                        type="number" step="0.01"
                        className="cyber-input pl-10 py-4 text-center font-bold" 
                        placeholder="0.00" 
                        value={manualPrice} 
                        onChange={e => setManualPrice(e.target.value)} 
                      />
                   </div>
                   <button 
                    onClick={addManualItem}
                    className="w-14 bg-slate-800 hover:bg-cyan-600 hover:text-slate-950 text-cyan-500 rounded-2xl transition-all border border-slate-700 flex items-center justify-center shadow-lg active:scale-90"
                   >
                     <Plus size={24}/>
                   </button>
                </div>

                {suggestions.length > 0 && (
                  <div className="absolute top-full left-0 w-full mt-2 bg-slate-950 border border-cyan-500/30 rounded-2xl z-[100] shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2">
                    <div className="flex justify-between items-center px-4 py-2 bg-slate-900/50 border-b border-slate-800">
                      <span className="text-[9px] font-mono text-cyan-700 uppercase font-bold flex items-center gap-2"><LayoutList size={10}/> Sugestões Localizadas</span>
                      <button onClick={() => setSuggestions([])} className="text-slate-500 hover:text-red-400"><X size={14}/></button>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {suggestions.map((p, idx) => (
                        <div key={idx} className="p-4 border-b border-slate-900/50 flex justify-between items-center hover:bg-cyan-500/10 cursor-pointer group/item transition-all" onClick={() => addItem(p.description!, p.price!)}>
                          <span className="font-mono font-bold text-sm text-slate-300 uppercase group-hover/item:text-white">{p.description}</span>
                          <span className="text-cyan-500 font-bold font-mono text-sm bg-cyan-950/20 px-3 py-1 rounded-lg border border-cyan-500/10">R$ {p.price?.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
             </div>
          </div>

          <div className="space-y-4">
             <div className="flex justify-between items-center px-4">
                <h3 className="font-mono text-[11px] text-slate-600 font-black uppercase flex items-center gap-2">
                   <LayoutList size={14} className="text-cyan-900"/> CORPO_DO_ORÇAMENTO ({items.length})
                </h3>
                
                <div className="flex items-center gap-2">
                   <div className="relative">
                      <SearchCode size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
                      <input 
                        className={`bg-slate-950 border rounded-full pl-9 pr-5 py-2 text-[10px] font-mono w-72 outline-none transition-all ${listMatches.length > 0 ? 'border-amber-500 ring-4 ring-amber-500/10' : 'border-slate-800 focus:border-cyan-500/30'}`} 
                        placeholder="LOCALIZAR NA LISTA..." 
                        value={listFilter} 
                        onChange={e => setListFilter(e.target.value)} 
                      />
                      {listMatches.length > 0 && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2 bg-slate-900 px-2 py-0.5 rounded-full border border-slate-800">
                           <span className="text-[9px] font-mono font-black text-amber-500">{currentMatchIndex + 1}/{listMatches.length}</span>
                           <div className="flex gap-1 border-l border-slate-800 pl-2 ml-1">
                              <button onClick={() => navigateMatches('prev')} className="text-slate-500 hover:text-amber-400"><ChevronUp size={14}/></button>
                              <button onClick={() => navigateMatches('next')} className="text-slate-500 hover:text-amber-400"><ChevronDown size={14}/></button>
                           </div>
                        </div>
                      )}
                   </div>
                </div>
             </div>

             <div className="space-y-3">
                {items.map((item, index) => {
                  const isAuditFocus = isAuditMode && auditIndex === index;
                  const isMatch = listMatches.includes(item.id);
                  const isCurrentMatch = isMatch && listMatches[currentMatchIndex] === item.id;

                  return (
                    <div 
                      key={item.id} 
                      ref={el => { itemRefs.current[item.id] = el; }}
                      className={`group bg-slate-900/30 p-4 rounded-2xl border transition-all duration-300 relative ${
                        item.isVerified ? 'border-green-500/30 bg-green-500/[0.02]' : 'border-slate-800/40'
                      } ${isAuditFocus ? 'audit-highlight' : ''} ${
                        isAuditMode && !isAuditFocus ? 'audit-blurred' : ''
                      } ${isMatch ? (isCurrentMatch ? 'ring-4 ring-amber-500/30 border-amber-500 bg-amber-500/[0.05] z-10' : 'border-amber-500/40 bg-amber-500/[0.02]') : ''}`}
                    >
                      <div className="flex items-center gap-5">
                        <div className="flex-grow min-w-0">
                           <div className="flex flex-col">
                             <input 
                               className={`bg-transparent border-none p-0 font-mono font-black text-lg uppercase outline-none w-full transition-colors ${item.isVerified ? 'text-green-400' : 'text-slate-200'} focus:text-cyan-400`} 
                               value={item.description}
                               onChange={e => updateItem(item.id, { description: e.target.value.toUpperCase() })}
                             />
                             <div className="flex items-center gap-2 mt-1">
                               <span className="text-[10px] font-mono text-cyan-900/40 select-none">//</span>
                               <input 
                                 className="bg-transparent border-none p-0 font-mono text-[10px] text-slate-500 focus:text-cyan-600 outline-none w-full"
                                 placeholder="ADICIONAR OBSERVAÇÃO AO ITEM..."
                                 value={item.comment || ''}
                                 onChange={e => updateItem(item.id, { comment: e.target.value })}
                               />
                             </div>
                           </div>

                           <div className="flex items-center gap-5 mt-2">
                              <div className="flex items-center gap-1.5">
                                 <span className="text-[8px] text-slate-700 font-mono font-black uppercase tracking-widest">Valor Unit:</span>
                                 <div className="flex items-center bg-slate-950/50 border border-slate-800 rounded px-2 py-0.5">
                                    <span className="text-[10px] text-cyan-800 font-mono mr-1">R$</span>
                                    <input 
                                      className="bg-transparent border-none p-0 font-mono text-xs font-bold text-cyan-500 w-20 outline-none"
                                      type="number" step="0.01"
                                      value={item.price}
                                      onChange={e => updateItem(item.id, { price: parseFloat(e.target.value) || 0 })}
                                    />
                                 </div>
                              </div>
                              <div className="flex items-center gap-1.5">
                                 <span className="text-[8px] text-slate-700 font-mono font-black uppercase tracking-widest">QTD:</span>
                                 <div className="flex items-center bg-slate-950/50 border border-slate-800 rounded px-1 py-0.5">
                                    <button onClick={() => updateItem(item.id, { quantity: Math.max(0, item.quantity - 1) })} className="text-slate-600 p-0.5 hover:text-cyan-500"><ChevronLeft size={14}/></button>
                                    <input type="number" step="0.001" className="bg-transparent border-none text-center font-mono font-bold text-xs text-slate-200 w-14 outline-none" value={item.quantity} onChange={e => updateItem(item.id, { quantity: parseFloat(e.target.value) || 0 })} />
                                    <button onClick={() => updateItem(item.id, { quantity: item.quantity + 1 })} className="text-slate-600 p-0.5 hover:text-cyan-500"><ChevronRight size={14}/></button>
                                 </div>
                              </div>
                           </div>
                        </div>

                        <div className="text-right min-w-[120px]">
                           <span className="text-[9px] font-mono text-slate-700 uppercase block mb-1 font-black">Subtotal</span>
                           <div className={`font-mono font-black text-xl ${item.isVerified ? 'text-green-400' : 'text-slate-100'}`}>
                              <span className="text-cyan-600 text-xs mr-1">R$</span>
                              {(item.price * item.quantity).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                           </div>
                        </div>

                        <div className="flex gap-2">
                           <button className={`w-11 h-11 flex items-center justify-center rounded-xl border transition-all ${item.isVerified ? 'bg-green-600 border-green-400 text-slate-950' : 'bg-slate-950/50 border-slate-800 text-slate-700 hover:text-cyan-400 hover:border-cyan-500'}`} onClick={() => isAuditFocus ? updateItem(item.id, { isVerified: true }) : updateItem(item.id, { isVerified: !item.isVerified })}>
                              <Check size={22} strokeWidth={3}/>
                           </button>
                           <button className="w-11 h-11 flex items-center justify-center rounded-xl bg-slate-950/50 border border-slate-800 text-slate-700 hover:text-red-500 hover:border-red-500" onClick={() => setItemToDelete(item.id)}>
                              <Trash2 size={20}/>
                           </button>
                        </div>
                      </div>

                      {isAuditFocus && (
                        <div className="mt-4 bg-cyan-500/10 p-3 rounded-xl border border-cyan-500/20 flex justify-between items-center animate-pulse">
                           <span className="text-[10px] font-mono font-black text-cyan-400 uppercase tracking-widest">CONFERÊNCIA_ATIVA: VERIFIQUE O REGISTRO</span>
                           <div className="flex gap-2">
                             <button className="px-4 py-1.5 bg-slate-800 rounded-lg text-[10px] font-mono text-white font-bold" onClick={() => setAuditIndex(prev => Math.min(items.length - 1, prev + 1))}>Pular</button>
                             <button className="px-6 py-1.5 bg-cyan-500 rounded-lg text-[10px] font-mono text-slate-950 font-black uppercase" onClick={() => { updateItem(item.id, { isVerified: true }); setAuditIndex(prev => Math.min(items.length - 1, prev + 1)); }}>Conferido</button>
                           </div>
                        </div>
                      )}
                    </div>
                  );
                })}
             </div>
          </div>
        </div>

        <div className="sticky top-24 space-y-6">
          <div className="bg-slate-900/60 p-8 rounded-[2.5rem] border border-cyan-900/20 backdrop-blur-md shadow-2xl">
             <h3 className="font-mono text-[10px] text-cyan-800 font-black uppercase tracking-[0.4em] border-b border-slate-800 pb-5 mb-8">SUMÁRIO_TOTAL</h3>
             
             <div className="space-y-6">
                <div className="flex justify-between items-center text-[10px] font-mono font-black uppercase text-slate-600">
                   <span>Itens Totais</span>
                   <span className="text-white text-2xl tracking-tighter">{items.length}</span>
                </div>

                <div className="pt-6 border-t border-slate-800/40">
                   <p className="text-cyan-900 text-[10px] font-mono font-black uppercase mb-2">Valor Geral Líquido</p>
                   <div className="flex items-baseline gap-3 font-mono">
                      <span className="text-3xl font-black text-slate-600">R$</span>
                      <span className="text-6xl font-black text-white tracking-tighter drop-shadow-[0_0_15px_rgba(6,182,212,0.1)]">
                         {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                   </div>
                </div>

                <div className="space-y-3 pt-6">
                   <button 
                    onClick={handleGenerateBudget} 
                    disabled={saving || items.length === 0} 
                    className="w-full h-16 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-slate-950 font-black font-mono text-base uppercase rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-95 shadow-xl"
                   >
                      <FileText size={24}/> {saving ? 'SALVANDO...' : 'GERAR_ORÇAMENTO'}
                   </button>
                   <div className="pt-4">
                      <div className="flex justify-between text-[10px] font-mono font-black uppercase text-slate-700 mb-2">
                         <span>Status_de_Conferência</span>
                         <span className={health === 100 ? 'text-green-500' : 'text-slate-600'}>{health}%</span>
                      </div>
                      <div className="h-2 bg-slate-950 rounded-full overflow-hidden border border-white/5 shadow-inner">
                         <div className="h-full transition-all duration-700 bg-cyan-500" style={{ width: `${health}%`, backgroundColor: health === 100 ? '#22c55e' : '#06b6d4' }} />
                      </div>
                   </div>
                </div>
             </div>
          </div>
        </div>
      </div>

      {/* MODAL DE EXCLUSÃO FIXO NO MEIO DA VIEWPORT */}
      {itemToDelete && (
        <div className="fixed inset-0 z-[5000] flex items-center justify-center bg-slate-950/90 backdrop-blur-md animate-fade">
           <div className="bg-slate-900 border border-red-500/50 p-8 rounded-[2rem] max-w-sm w-full shadow-2xl space-y-6 mx-4">
              <div className="flex flex-col items-center text-center space-y-4">
                 <div className="p-4 bg-red-500/10 rounded-full border border-red-500/20 text-red-500 animate-pulse">
                    <ShieldAlert size={32} />
                 </div>
                 <h3 className="text-lg font-mono font-black text-slate-100 uppercase tracking-tighter">REMOVER REGISTRO?</h3>
                 <p className="text-xs font-mono text-slate-500 leading-relaxed uppercase">
                    Este item será removido apenas desta sessão de edição. O banco de dados histórico não será afetado.
                 </p>
              </div>
              <div className="flex gap-3">
                 <button 
                  onClick={() => setItemToDelete(null)}
                  className="flex-grow py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-[10px] font-black uppercase rounded-xl transition-all"
                 >
                    MANTER
                 </button>
                 <button 
                  onClick={confirmItemDeletion}
                  className="flex-grow py-3 bg-red-600 hover:bg-red-500 text-slate-950 font-mono text-[10px] font-black uppercase rounded-xl transition-all shadow-lg"
                 >
                    REMOVER
                 </button>
              </div>
           </div>
        </div>
      )}
      
      <style>{`
        .cyber-input {
          width: 100%;
          background: #020617;
          border: 1px solid rgba(30, 41, 59, 0.8);
          color: #f8fafc;
          font-family: 'Fira Code', monospace;
          padding: 0.8rem 1.2rem;
          border-radius: 1rem;
          outline: none;
          font-size: 14px;
          transition: all 0.2s ease-out;
        }
        .cyber-input:focus {
          border-color: #06b6d4;
          box-shadow: 0 0 20px rgba(6, 182, 212, 0.1);
          background: #000;
        }
        .audit-mode-active { position: relative; }
        .audit-blurred { 
          opacity: 0.05; 
          filter: blur(8px) grayscale(1); 
          pointer-events: none; 
          transform: scale(0.94);
        }
        .audit-highlight { 
          opacity: 1 !important; 
          filter: none !important; 
          border-color: #06b6d4 !important; 
          box-shadow: 0 0 50px rgba(6, 182, 212, 0.3) !important; 
          z-index: 50;
          transform: scale(1.05);
          background: rgba(6, 182, 212, 0.05) !important;
        }
      `}</style>
    </div>
  );
};

export default QuoteEditor;
