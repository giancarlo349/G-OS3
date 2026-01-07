
import React, { useState, useEffect, useRef } from 'react';
import { ref, push, set, onValue } from 'firebase/database';
import { db } from '../services/firebase';
import { Quote, QuoteItem, Product, User as AppUser, QuoteStatus } from '../types';
import * as XLSX from 'xlsx';
import html2pdf from 'html2pdf.js';
import { 
  X, Trash2, Save, Search, ArrowLeft, ChevronRight,
  Play, User, Phone, ShoppingBag, Check, 
  ChevronLeft, ChevronUp, ChevronDown, Plus, 
  ShieldAlert, LayoutList, SearchCode, UserCheck, Activity, AlertCircle, FileText, CheckCircle2,
  Download, AlertTriangle, FileDown, MapPin, Info, GripVertical, Settings2, Copy
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
  const [exporting, setExporting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showPrintView, setShowPrintView] = useState(false);
  const [logoBase64, setLogoBase64] = useState<string | null>(null);
  
  const [pdfSuffix, setPdfSuffix] = useState(quote?.clientName || '');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [manualPrice, setManualPrice] = useState('');
  const [suggestions, setSuggestions] = useState<Partial<Product>[]>([]);
  const [history, setHistory] = useState<Product[]>([]);
  
  const [listFilter, setListFilter] = useState('');
  const [listMatches, setListMatches] = useState<string[]>([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);

  const [isAuditMode, setIsAuditMode] = useState(false);
  const [auditIndex, setAuditIndex] = useState(0);

  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);
  
  const itemRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const printRef = useRef<HTMLDivElement>(null);

  const EXTERNAL_LOGO_URL = 'https://raw.githubusercontent.com/giancarlo349/G-OS3/refs/heads/main/asd.png';

  useEffect(() => {
    if (!user) return;
    const productsRef = ref(db, 'products');
    onValue(productsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const allProducts = Object.keys(data).map(key => ({ id: key, ...data[key] })) as Product[];
        setHistory(allProducts.filter(p => p.userId === user.uid));
      }
    });

    const convertLogo = async () => {
      try {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.src = EXTERNAL_LOGO_URL;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0);
          setLogoBase64(canvas.toDataURL('image/png'));
        };
        img.onerror = () => { img.src = '/logo.png'; };
      } catch (e) { console.warn("Erro ao processar logo:", e); }
    };
    convertLogo();
  }, [user]);

  useEffect(() => {
    if (listFilter.length > 1) {
      const matches = items
        .filter(i => i.description.toLowerCase().includes(listFilter.toLowerCase()))
        .map(i => i.id);
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
    
    const queryTerms = val.toLowerCase().trim().split(/\s+/);
    const localMatches = history.filter(p => {
      const desc = p.description.toLowerCase();
      return queryTerms.some(term => desc.includes(term));
    }).sort((a, b) => {
      const aCount = queryTerms.filter(t => a.description.toLowerCase().includes(t)).length;
      const bCount = queryTerms.filter(t => b.description.toLowerCase().includes(t)).length;
      return bCount - aCount;
    }).slice(0, 10);
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

  const deleteItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const handleDragStart = (index: number) => {
    if (isAuditMode) return;
    setDraggedItemIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (isAuditMode || draggedItemIndex === null || draggedItemIndex === index) return;
    const newItems = [...items];
    const item = newItems[draggedItemIndex];
    newItems.splice(draggedItemIndex, 1);
    newItems.splice(index, 0, item);
    setItems(newItems);
    setDraggedItemIndex(index);
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
        setErrorMsg("FALHA AO SALVAR NO SERVIDOR.");
        return null;
    } finally { 
        if (!silent) setSaving(false); 
    }
  };

  const exportToPDF = async () => {
    if (!printRef.current) return;
    const html2pdfLib = (html2pdf as any).default || html2pdf;
    setExporting(true);
    try {
      // COPIA O TEXTO PERSONALIZADO PARA O CLIPBOARD
      const shareText = `Olá!\nEncaminhamos o orçamento em PDF.\n\nObservações:\n• Alguns itens podem ser adaptados conforme disponibilidade.\n• Pedimos atenção aos valores, descrições e quantidades.\n• Em caso de dúvidas ou qualquer divergência, é só nos chamar 😊`;
      try {
        await navigator.clipboard.writeText(shareText);
      } catch (e) {
        console.warn("Falha ao copiar para clipboard");
      }
      
      await document.fonts.ready;
      const fileName = `Orcamento-${pdfSuffix.replace(/\s+/g, '_') || clientName.replace(/\s+/g, '_')}.pdf`;
      const opt = {
        margin: 0,
        filename: fileName,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true, scrollY: 0, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };
      await html2pdfLib().set(opt).from(printRef.current).save();
    } catch (err) { 
      console.error(err);
      setErrorMsg('Falha ao processar o arquivo PDF.'); 
    } finally { setExporting(false); }
  };

  const handleGenerateBudget = async () => {
    const success = await saveQuote(true);
    if (success) {
      setShowPrintView(true);
    }
  };

  const total = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const health = items.length === 0 ? 0 : Math.round((items.filter(i => i.isVerified).length / items.length) * 100);

  if (showPrintView) {
    return (
      <div className="fixed inset-0 z-[2000] bg-slate-100 text-black overflow-auto animate-fade font-soft print:bg-white">
        <div className="no-print bg-white/95 backdrop-blur-md border-b border-slate-300 p-4 sticky top-0 flex justify-between items-center px-10 shadow-lg z-[2100]">
            <div className="flex items-center gap-6">
                <button onClick={() => setShowPrintView(false)} className="flex items-center gap-2 px-4 py-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-all font-bold text-xs border border-slate-300 uppercase">
                    <ArrowLeft size={14}/> VOLTAR AO EDITOR
                </button>
                <div className="flex items-center gap-3">
                   <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 shadow-sm">
                      <span className="text-[10px] font-black text-slate-400 mr-2 tracking-tighter uppercase">NOME DO PDF:</span>
                      <span className="text-sm font-mono font-black text-emerald-600">Orcamento-</span>
                      <input 
                        className="bg-transparent border-none p-0 text-sm font-mono font-black text-emerald-800 outline-none w-56 ml-1 placeholder:text-emerald-900/20"
                        value={pdfSuffix}
                        onChange={e => setPdfSuffix(e.target.value)}
                        placeholder="NOME_DO_CLIENTE"
                      />
                      <span className="text-sm font-mono font-black text-emerald-600">.pdf</span>
                   </div>
                </div>
            </div>
            <div className="flex gap-3">
                <button onClick={exportToPDF} disabled={exporting} className="flex items-center gap-3 bg-emerald-700 hover:bg-emerald-600 text-white font-black px-8 py-3 rounded-xl shadow-lg transition-all active:scale-95 text-xs disabled:opacity-50">
                    {exporting ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <FileDown size={18}/>}
                    {exporting ? 'GERANDO PDF...' : 'BAIXAR AGORA'}
                </button>
            </div>
        </div>

        <div ref={printRef} className="a4-page mx-auto shadow-2xl print:shadow-none print:m-0 bg-white">
            <div className="a4-content">
                <div className="flex flex-col items-center text-center mb-6">
                    {logoBase64 && (
                      <img src={logoBase64} alt="Logo" className="h-20 mb-3 object-contain" />
                    )}
                    <h1 className="text-lg font-black uppercase tracking-tight text-emerald-900 font-outfit" style={{ fontFamily: 'Outfit, sans-serif' }}>MASATOCHI YAHIRO BAZAR E ARTIGOS EM GERAL</h1>
                    <div className="flex flex-col items-center gap-0.5 mt-1">
                        <div className="flex justify-center items-center gap-3 text-[8px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                            <span>CNPJ: 05.862.953/0001-82</span>
                            <span className="w-1 h-1 rounded-full bg-emerald-200"></span>
                            <span>(11) 4447-3578</span>
                            <span className="w-1 h-1 rounded-full bg-emerald-200"></span>
                            <span>Cajamar - SP</span>
                        </div>
                        <div className="flex items-center gap-2 text-[8px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                            <MapPin size={8} className="text-emerald-500" />
                            <span>Avenida Joaquim Janus Penteado, 125, Altos de Jordanésia (Jordanésia)</span>
                        </div>
                    </div>
                    <div className="w-full h-[1px] bg-emerald-800/20 mt-4 mb-6"></div>
                </div>

                <div className="grid grid-cols-2 gap-6 mb-6 bg-emerald-50/20 p-6 rounded-2xl border border-emerald-100/30">
                    <div className="space-y-1">
                        <span className="text-[8px] font-black text-emerald-600 block uppercase tracking-widest">CLIENTE</span>
                        <span className="text-base font-black text-slate-900 uppercase leading-none font-outfit" style={{ fontFamily: 'Outfit, sans-serif' }}>{clientName || 'CONSUMIDOR'}</span>
                        {clientPhone && <div className="text-[10px] font-bold text-slate-400 mt-1">{clientPhone}</div>}
                    </div>
                    <div className="text-right space-y-1">
                        <span className="text-[8px] font-black text-emerald-600 block uppercase tracking-widest">DATA DE EMISSÃO</span>
                        <span className="text-xs font-bold text-slate-800">{new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                    </div>
                </div>

                <div className="mb-4 flex items-center gap-2">
                  <div className="w-1 h-4 bg-emerald-600 rounded-full"></div>
                  <h3 className="text-[10px] font-black text-emerald-900 uppercase tracking-[0.2em]">ORÇAMENTO DE MATERIAIS</h3>
                </div>

                <div className="flex-grow">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="border-b-2 border-slate-100">
                                <th className="text-left py-2 text-[8px] font-black uppercase tracking-widest text-slate-300">PRODUTO / DESCRIÇÃO</th>
                                <th className="text-center py-2 text-[8px] font-black uppercase w-10 text-slate-300">QTD.</th>
                                <th className="text-right py-2 text-[8px] font-black uppercase w-20 text-slate-300">PREÇO UNIT.</th>
                                <th className="text-right py-2 text-[8px] font-black uppercase w-20 text-slate-300">TOTAL</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {items.map((item, idx) => (
                                <tr key={idx} className={`avoid-break ${idx % 2 === 1 ? 'bg-yellow-50/70' : 'bg-white'}`}>
                                    <td className="py-2.5 px-3">
                                        <div className="text-[11px] font-black text-slate-800 uppercase leading-tight font-outfit" style={{ fontFamily: 'Outfit, sans-serif' }}>{item.description}</div>
                                        {item.comment && <div className="text-[8px] font-bold text-slate-400 italic mt-0.5 uppercase">Nota: {item.comment}</div>}
                                    </td>
                                    <td className="py-2.5 text-center text-[10px] font-black text-slate-600 font-mono">{item.quantity}</td>
                                    <td className="py-2.5 text-right text-[10px] font-bold text-slate-400 font-mono">R$ {item.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                    <td className="py-2.5 text-right text-[10px] font-black text-emerald-700 font-mono pr-3">R$ {(item.price * item.quantity).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="mt-6 pt-6 border-t-2 border-slate-50 avoid-break">
                    <div className="flex justify-between items-center bg-emerald-900 text-white p-6 rounded-2xl shadow-sm">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">VALOR TOTAL DO ORÇAMENTO</span>
                        <div className="text-right">
                          <span className="text-2xl font-black font-outfit" style={{ fontFamily: 'Outfit, sans-serif' }}>R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                    </div>
                </div>

                <div className="mt-8 grid grid-cols-2 gap-4 avoid-break">
                    <div className="flex items-start gap-3 p-4 border border-amber-100 bg-amber-50/20 rounded-2xl">
                        <div className="p-2 bg-amber-100 rounded-xl text-amber-600 flex-shrink-0"><AlertTriangle size={16}/></div>
                        <div className="space-y-1">
                            <h4 className="text-[9px] font-black text-amber-800 uppercase tracking-widest">AVISO DE ESTOQUE</h4>
                            <p className="text-[8px] font-bold text-amber-700 leading-tight uppercase">
                              Marcas e qualidade podem variar conforme estoque disponível no ato da separação. 
                              Adaptamos itens para pronta entrega caso necessário.
                            </p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3 p-4 border border-emerald-100 bg-emerald-50/20 rounded-2xl">
                        <div className="p-2 bg-emerald-100 rounded-xl text-emerald-600 flex-shrink-0"><Info size={16}/></div>
                        <div className="space-y-1">
                            <h4 className="text-[9px] font-black text-emerald-800 uppercase tracking-widest">POLÍTICA DE VALIDADE</h4>
                            <p className="text-[8px] font-bold text-emerald-700 leading-tight uppercase">
                              Válido por 04 dias úteis. Sujeito a alterações diárias de preço e estoque conforme oscilações do mercado atacadista.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <style>{`
            .a4-page { width: 210mm; min-height: 297mm; background: white; margin-top: 20px; margin-bottom: 20px; position: relative; overflow: hidden; font-family: 'Outfit', sans-serif; }
            .a4-content { padding: 12mm; min-height: 297mm; display: flex; flex-direction: column; background: white; }
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            @media print { @page { size: A4; margin: 0; } body { background: white !important; margin: 0 !important; } .no-print { display: none !important; } .a4-page { width: 100% !important; margin: 0 !important; border-radius: 0 !important; } }
            .avoid-break { page-break-inside: avoid; break-inside: avoid; }
        `}</style>
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-6 animate-fade pb-40 no-print ${isAuditMode ? 'audit-mode-active' : ''}`}>
      {errorMsg && (
        <div className="bg-red-950/30 border border-red-500/50 p-4 rounded-xl flex items-center justify-between gap-3 text-red-400 font-mono text-xs">
          <div className="flex items-center gap-2"><AlertCircle size={16} /> {errorMsg}</div>
          <button onClick={() => setErrorMsg(null)}><X size={14}/></button>
        </div>
      )}

      {/* CABEÇALHO / TOOLBAR */}
      <div className="flex justify-between items-center bg-slate-900/95 backdrop-blur-xl p-4 rounded-2xl border border-cyan-500/10 shadow-2xl sticky top-20 z-[100]">
        <div className="flex items-center gap-4">
          <button className="p-2 hover:bg-slate-800 rounded-lg text-cyan-600 transition-colors" onClick={onClose}><ArrowLeft size={22}/></button>
          <div>
            <h2 className="font-mono font-black text-slate-100 flex items-center gap-2 tracking-tighter uppercase text-sm md:text-base">
              <span className="text-cyan-500">_</span>SISTEMA_DE_ORÇAMENTO
            </h2>
            <div className="flex items-center gap-2 text-[9px] font-mono text-slate-500">
               <span className="uppercase font-black text-cyan-700 tracking-widest">{author || 'SELECIONE ATENDENTE'}</span>
               <span className="w-1 h-1 rounded-full bg-slate-700"></span>
               <span className={status === 'Pendente' ? 'text-amber-500' : status === 'Finalizado' ? 'text-blue-500' : 'text-green-500'}>{status.toUpperCase()}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
           <button onClick={() => { setIsAuditMode(!isAuditMode); if(!isAuditMode) setAuditIndex(0); }} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-[10px] font-bold border transition-all ${isAuditMode ? 'bg-cyan-500 text-slate-950 border-cyan-300' : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-cyan-500/50'}`}>
              {isAuditMode ? <X size={14}/> : <Play size={14}/>} {isAuditMode ? 'FECHAR_CONFERÊNCIA' : 'INICIAR_CONFERÊNCIA'}
           </button>
           <button onClick={() => saveQuote()} className="flex items-center gap-2 px-6 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-500 font-black font-mono text-[10px] rounded-lg transition-all shadow-lg active:scale-95">
              <Save size={14}/> {saving ? 'SALVANDO...' : 'SALVAR_DATABASE'}
           </button>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_380px] gap-6 items-start">
        <div className="space-y-6">
          <div className="bg-slate-900/40 p-6 rounded-[2.5rem] border border-slate-800/40 shadow-inner">
             <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="space-y-1.5 md:col-span-1">
                   <label className="text-[9px] font-mono text-cyan-800 uppercase font-black tracking-widest flex items-center gap-2"><User size={10}/> Cliente</label>
                   <input className="cyber-input" value={clientName} onChange={e => { setClientName(e.target.value.toUpperCase()); setPdfSuffix(e.target.value); }} placeholder="CLIENTE" />
                </div>
                <div className="space-y-1.5 md:col-span-1">
                   <label className="text-[9px] font-mono text-cyan-800 uppercase font-black tracking-widest flex items-center gap-2"><Phone size={10}/> Contato</label>
                   <input className="cyber-input" value={clientPhone} onChange={e => setClientPhone(e.target.value)} placeholder="(00) 00000-0000" />
                </div>
                <div className="space-y-1.5 md:col-span-1">
                   <label className="text-[9px] font-mono text-cyan-800 uppercase font-black tracking-widest flex items-center gap-2"><UserCheck size={10}/> Atendente</label>
                   <input className="cyber-input" value={author} onChange={e => setAuthor(e.target.value.toUpperCase())} placeholder="ATENDENTE" />
                </div>
                <div className="space-y-1.5 md:col-span-1">
                   <label className="text-[9px] font-mono text-cyan-800 uppercase font-black tracking-widest flex items-center gap-2"><Activity size={10}/> Status</label>
                   <select className="cyber-input bg-slate-950 cursor-pointer text-slate-200" value={status} onChange={e => setStatus(e.target.value as QuoteStatus)}>
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
                      <input className="cyber-input pl-12 py-4 text-base bg-slate-950/80 border-slate-800" placeholder="Pesquisar por termo (ex: lapis cis)..." value={searchQuery} onChange={e => handleSearchChange(e.target.value)} />
                      {suggestions.length > 0 && (
                        <div className="absolute top-full left-0 w-full mt-2 bg-slate-950 border border-cyan-500/30 rounded-2xl z-[150] shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2">
                          <div className="flex justify-between items-center px-4 py-2 bg-slate-900/50 border-b border-slate-800">
                            <span className="text-[9px] font-mono text-cyan-700 uppercase font-bold flex items-center gap-2"><LayoutList size={10}/> Resultados do Banco</span>
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
                   <div className="relative w-36">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-cyan-700 font-mono font-bold">R$</span>
                      <input type="number" step="0.01" className="cyber-input pl-10 py-4 text-center font-bold" placeholder="0.00" value={manualPrice} onChange={e => setManualPrice(e.target.value)} />
                   </div>
                   <button onClick={addManualItem} className="w-14 bg-slate-800 hover:bg-cyan-600 hover:text-slate-950 text-cyan-500 rounded-2xl transition-all border border-slate-700 flex items-center justify-center shadow-lg active:scale-90"><Plus size={24}/></button>
                </div>
             </div>
          </div>

          <div className="space-y-4">
             <div className="bg-slate-900/20 p-4 rounded-2xl border border-slate-800/40 flex items-center gap-4">
                <div className="relative flex-grow">
                   <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
                   <input className="w-full bg-slate-950/50 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs font-mono text-slate-300 focus:border-cyan-500/30 outline-none" placeholder="Pesquisar e destacar na lista..." value={listFilter} onChange={e => setListFilter(e.target.value)} />
                </div>
                {listMatches.length > 0 && (
                   <div className="flex items-center gap-2 animate-fade">
                      <span className="text-[10px] font-mono text-cyan-600 font-black uppercase">{currentMatchIndex + 1} / {listMatches.length}</span>
                      <button onClick={() => navigateMatches('prev')} className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-400"><ChevronUp size={14}/></button>
                      <button onClick={() => navigateMatches('next')} className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-400"><ChevronDown size={14}/></button>
                   </div>
                )}
             </div>
             <div className="flex justify-between items-center px-4">
                <h3 className="font-mono text-[11px] text-slate-600 font-black uppercase flex items-center gap-2">
                   <LayoutList size={14} className="text-cyan-900"/> CORPO_DO_ORÇAMENTO ({items.length})
                </h3>
             </div>
             <div className="space-y-6 pb-96 px-4">
                {items.map((item, index) => {
                  const isAuditFocus = isAuditMode && auditIndex === index;
                  const isHighlighted = listFilter.length > 1 && item.description.toLowerCase().includes(listFilter.toLowerCase());
                  const isCurrentMatch = listMatches[currentMatchIndex] === item.id;
                  return (
                    <div 
                      key={item.id} 
                      ref={el => { itemRefs.current[item.id] = el; }} 
                      draggable={!isAuditMode} 
                      onDragStart={() => handleDragStart(index)} 
                      onDragOver={(e) => handleDragOver(e, index)} 
                      className={`group p-6 rounded-[2rem] border transition-all duration-300 relative flex items-center gap-4 ${
                        item.isVerified 
                          ? 'border-green-500/50 bg-green-500/[0.06] shadow-[0_5px_15px_rgba(34,197,94,0.1)]' 
                          : 'bg-slate-900/30 border-slate-800/40 shadow-lg'
                      } ${isAuditFocus ? 'audit-highlight' : ''} ${isAuditMode && !isAuditFocus ? 'opacity-30 grayscale blur-[2px] scale-[0.98]' : ''} ${isHighlighted ? 'border-yellow-500/50 bg-yellow-500/10' : ''} ${isCurrentMatch ? 'ring-2 ring-yellow-500 ring-offset-4 ring-offset-slate-950' : ''}`}
                    >
                      {!isAuditMode && (
                        <div className="cursor-grab active:cursor-grabbing p-1 text-slate-700 hover:text-cyan-500 transition-colors"><GripVertical size={20} /></div>
                      )}
                      
                      {isAuditFocus && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-cyan-600 text-slate-950 text-[9px] font-mono font-black rounded-full uppercase tracking-widest z-[210] shadow-lg border border-white/20 whitespace-nowrap">
                           MODO_CONFERÊNCIA
                        </div>
                      )}

                      {item.isVerified && !isAuditMode && (
                        <div className="absolute -top-3 left-10 px-4 py-1 bg-green-600 text-slate-950 text-[9px] font-mono font-black rounded-full uppercase tracking-widest z-[10] border border-green-300/40">
                           <span className="flex items-center gap-1.5"><CheckCircle2 size={12}/> CONFERIDO</span>
                        </div>
                      )}

                      <div className="flex-grow min-w-0">
                         <div className="flex flex-col">
                           <input className={`bg-transparent border-none p-0 font-mono font-black text-2xl uppercase outline-none w-full transition-colors ${item.isVerified ? 'text-green-400' : 'text-slate-100'} focus:text-cyan-400 ${isHighlighted ? 'text-yellow-400' : ''}`} value={item.description} onChange={e => updateItem(item.id, { description: e.target.value.toUpperCase() })} />
                           <input className="bg-transparent border-none p-0 font-mono text-xs text-slate-600 font-bold focus:text-cyan-600 outline-none w-full mt-1" placeholder="Adicionar observação..." value={item.comment || ''} onChange={e => updateItem(item.id, { comment: e.target.value })} />
                         </div>
                         <div className="flex items-center gap-6 mt-4">
                            <div className="flex items-center bg-slate-950/80 border border-slate-800 rounded-2xl px-4 py-1.5 shadow-inner">
                               <span className="text-[10px] text-cyan-800 font-mono mr-2 font-black">R$</span>
                               <input className="bg-transparent border-none p-0 font-mono text-base font-black text-cyan-500 w-28 outline-none" type="number" step="0.01" value={item.price} onChange={e => updateItem(item.id, { price: parseFloat(e.target.value) || 0 })} />
                            </div>
                            <div className="flex items-center bg-slate-950/80 border border-slate-800 rounded-2xl px-3 py-1.5 shadow-inner">
                               <button onClick={() => updateItem(item.id, { quantity: Math.max(0, item.quantity - 1) })} className="text-slate-600 p-1.5 hover:text-cyan-500"><ChevronLeft size={20}/></button>
                               <input type="number" step="0.001" className="bg-transparent border-none text-center font-mono font-black text-base text-slate-200 w-20 outline-none" value={item.quantity} onChange={e => updateItem(item.id, { quantity: parseFloat(e.target.value) || 0 })} />
                               <button onClick={() => updateItem(item.id, { quantity: item.quantity + 1 })} className="text-slate-600 p-1.5 hover:text-cyan-500"><ChevronRight size={20}/></button>
                            </div>
                         </div>
                      </div>
                      <div className="text-right min-w-[150px]">
                         <div className={`font-mono font-black text-3xl ${item.isVerified ? 'text-green-400' : 'text-slate-100'}`}>
                            <span className="text-cyan-600 text-sm mr-1">R$</span>
                            {(item.price * item.quantity).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                         </div>
                      </div>
                      <div className="flex gap-3">
                         <button className={`w-14 h-14 flex items-center justify-center rounded-2xl border-2 transition-all ${item.isVerified ? 'bg-green-600 border-green-300 text-slate-950 shadow-[0_0_20px_rgba(34,197,94,0.4)]' : 'bg-slate-950/50 border-slate-800 text-slate-700 hover:text-cyan-400 hover:border-cyan-500'}`} onClick={() => updateItem(item.id, { isVerified: !item.isVerified })}>
                            <Check size={28} strokeWidth={5}/>
                         </button>
                         {!isAuditMode && (
                           <button className="w-14 h-14 flex items-center justify-center rounded-2xl bg-slate-950/50 border-2 border-slate-800 text-slate-700 hover:text-red-500 hover:border-red-500 transition-all active:scale-90" onClick={() => deleteItem(item.id)}><Trash2 size={24}/></button>
                         )}
                      </div>
                      {isAuditFocus && (
                        <div className="absolute -bottom-24 left-0 w-full flex justify-center gap-6 z-[300] animate-fade p-4">
                           <button className="bg-slate-900/90 text-slate-400 font-mono text-[11px] font-black px-10 py-4 rounded-3xl border border-slate-800 hover:bg-slate-800 hover:text-white shadow-xl transition-all uppercase tracking-widest" onClick={() => { if (auditIndex < items.length - 1) { setAuditIndex(prev => prev + 1); scrollToItem(items[auditIndex + 1].id); } else { setIsAuditMode(false); } }}>PULAR</button>
                           <button className="bg-green-600 text-slate-950 font-mono text-[11px] font-black px-16 py-4 rounded-3xl shadow-lg active:scale-95 transition-all uppercase tracking-widest border border-green-400" onClick={() => { updateItem(item.id, { isVerified: true }); if (auditIndex < items.length - 1) { setAuditIndex(prev => prev + 1); scrollToItem(items[auditIndex + 1].id); } else { setIsAuditMode(false); } }}>APROVAR</button>
                        </div>
                      )}
                    </div>
                  );
                })}
             </div>
          </div>
        </div>
        <div className="sticky top-24 space-y-6">
          <div className="bg-slate-900/60 p-8 rounded-[2.5rem] border border-cyan-900/20 backdrop-blur-md shadow-2xl overflow-hidden">
             
             {/* CONFIG PDF INTEGRADA */}
             <div className="mb-8 p-6 bg-slate-950/80 rounded-[2rem] border-2 border-slate-800 border-dashed group/config">
                <label className="text-[10px] font-mono text-cyan-800 uppercase font-black mb-4 block flex items-center gap-2 group-hover/config:text-cyan-500 transition-colors"><Settings2 size={14}/> EXPORT_PROFILE_MANAGER</label>
                <div className="flex flex-col gap-3">
                   <div className="flex items-center font-mono text-[11px] font-black text-slate-600 uppercase">
                      <span className="bg-slate-900 px-2 py-1 rounded">Prefix:</span>
                      <span className="text-cyan-500 ml-2 drop-shadow-[0_0_10px_rgba(6,182,212,0.4)]">Orcamento-</span>
                   </div>
                   <div className="relative">
                     <input 
                        className="bg-slate-900 border-2 border-slate-800 rounded-2xl px-4 py-4 text-sm font-mono font-black text-white focus:border-cyan-500 focus:shadow-[0_0_20px_rgba(6,182,212,0.2)] outline-none w-full transition-all uppercase tracking-tight"
                        value={pdfSuffix}
                        onChange={e => setPdfSuffix(e.target.value)}
                        placeholder="IDENTIFICADOR"
                     />
                     <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-mono font-black text-slate-700">.PDF</span>
                   </div>
                </div>
             </div>

             <h3 className="font-mono text-[10px] text-cyan-800 font-black uppercase tracking-[0.4em] border-b border-slate-800 pb-5 mb-8">SUMÁRIO_TOTAL</h3>
             <div className="space-y-6">
                <div className="flex justify-between items-center text-[10px] font-mono font-black uppercase text-slate-600">
                   <span>Itens Registrados</span>
                   <span className="text-white text-2xl tracking-tighter">{items.length}</span>
                </div>
                <div className="pt-6 border-t border-slate-800/40">
                   <p className="text-cyan-900 text-[10px] font-mono font-black uppercase mb-2 font-black tracking-widest">Valor Geral Líquido</p>
                   <div className="flex items-baseline gap-3 font-mono">
                      <span className="text-3xl font-black text-slate-700">R$</span>
                      <span className="text-6xl font-black text-white tracking-tighter leading-none">{total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                   </div>
                </div>
                <div className="space-y-3 pt-6">
                   <button onClick={handleGenerateBudget} disabled={saving || items.length === 0} className="w-full h-20 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-slate-950 font-black font-mono text-base uppercase rounded-[2rem] flex items-center justify-center gap-3 transition-all active:scale-95 shadow-xl shadow-cyan-900/30"><FileText size={28}/> GERAR_PDF_FINAL</button>
                   <div className="pt-6">
                      <div className="flex justify-between text-[10px] font-mono font-black uppercase text-slate-700 mb-3 tracking-widest">
                         <span>Conferência Realizada</span>
                         <span className={health === 100 ? 'text-green-500' : 'text-slate-600'}>{health}%</span>
                      </div>
                      <div className="h-3 bg-slate-950 rounded-full overflow-hidden border border-white/5 shadow-inner">
                         <div className="h-full transition-all duration-1000 bg-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.6)]" style={{ width: `${health}%`, backgroundColor: health === 100 ? '#22c55e' : '#06b6d4' }} />
                      </div>
                   </div>
                </div>
             </div>
          </div>
        </div>
      </div>

      <style>{`
        .cyber-input { width: 100%; background: #020617; border: 1px solid rgba(30, 41, 59, 0.8); color: #f8fafc; font-family: 'Fira Code', monospace; padding: 1rem 1.4rem; border-radius: 1.25rem; outline: none; font-size: 14px; transition: all 0.2s ease-out; font-weight: 700; }
        .cyber-input:focus { border-color: #06b6d4; box-shadow: 0 0 30px rgba(6, 182, 212, 0.15); background: #000; }
        
        /* Ajuste do foco na conferência para não sair da tela e mudar cor sutilmente */
        .audit-highlight { 
          opacity: 1 !important; 
          filter: none !important; 
          border: 4px solid #06b6d4 !important; 
          box-shadow: 0 10px 40px rgba(6, 182, 212, 0.3) !important; 
          z-index: 50 !important; 
          transform: scale(1.005) !important; 
          background: #1e293b !important; 
          position: relative;
        }
        .audit-mode-active { overflow-x: hidden; }
      `}</style>
    </div>
  );
};

export default QuoteEditor;
