
import React, { useState, useEffect } from 'react';
import { ref, onValue, remove, set, push } from 'firebase/database';
import { db } from '../services/firebase';
import { Product, User } from '../types';
import { Search, Trash2, Plus, Database, DollarSign, Edit3, Save, X, ChevronRight, AlertTriangle } from 'lucide-react';

interface ProductsManagerProps {
  user: User;
}

const ProductsManager: React.FC<ProductsManagerProps> = ({ user }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ description: '', price: 0 });
  const [showAddForm, setShowAddForm] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  useEffect(() => {
    const productsRef = ref(db, 'products');
    const unsubscribe = onValue(productsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const productList = Object.keys(data)
          .map(key => ({ id: key, ...data[key] }))
          .filter(p => p.userId === user.uid) as Product[];
        setProducts(productList);
      } else {
        setProducts([]);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  const confirmProductDeletion = async () => {
    if (!productToDelete) return;
    await remove(ref(db, `products/${productToDelete.id}`));
    setProductToDelete(null);
  };

  const startEdit = (p: Product) => {
    setEditingId(p.id);
    setEditForm({ description: p.description, price: p.price });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    await set(ref(db, `products/${editingId}`), {
      ...editForm,
      userId: user.uid,
      lastUsed: Date.now()
    });
    setEditingId(null);
  };

  const addNew = async () => {
    if (!editForm.description) return;
    const newRef = push(ref(db, 'products'));
    await set(newRef, {
      ...editForm,
      userId: user.uid,
      lastUsed: Date.now()
    });
    setEditForm({ description: '', price: 0 });
    setShowAddForm(false);
  };

  const filtered = products.filter(p => 
    p.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold font-mono text-slate-100 flex items-center gap-2">
            <Database className="text-cyan-500" size={24} />
            DATABASE_MANAGER
          </h2>
          <p className="text-[10px] font-mono text-slate-500 uppercase">Gestão de produtos e sugestões inteligentes</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input
              type="text"
              placeholder="Filtrar base de dados..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-sm text-slate-300 focus:outline-none focus:border-cyan-500/50 min-w-[250px] font-mono"
            />
          </div>
          <button
            onClick={() => { setShowAddForm(true); setEditForm({description: '', price: 0}); }}
            className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold px-4 py-2 rounded-lg transition-all text-xs font-mono"
          >
            <Plus size={16} /> ADICIONAR
          </button>
        </div>
      </div>

      {showAddForm && (
        <div className="bg-slate-900/50 border border-cyan-500/30 p-6 rounded-2xl animate-in zoom-in-95 duration-200">
          <h3 className="text-sm font-mono text-cyan-400 mb-4 uppercase">Novo Registro de Produto</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              type="text"
              placeholder="DESCRIÇÃO DO PRODUTO"
              value={editForm.description}
              onChange={e => setEditForm({...editForm, description: e.target.value.toUpperCase()})}
              className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 font-mono text-sm focus:border-cyan-500/50 outline-none"
            />
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
              <input
                type="number"
                placeholder="VALOR"
                value={editForm.price}
                onChange={e => setEditForm({...editForm, price: parseFloat(e.target.value) || 0})}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-4 py-3 text-slate-200 font-mono text-sm focus:border-cyan-500/50 outline-none"
              />
            </div>
            <div className="flex gap-2">
              <button onClick={addNew} className="flex-grow bg-cyan-600 text-slate-950 font-bold rounded-xl text-xs font-mono">SALVAR NO BANCO</button>
              <button onClick={() => setShowAddForm(false)} className="px-4 bg-slate-800 text-slate-400 rounded-xl transition-colors hover:bg-red-900/20 hover:text-red-400"><X size={18} /></button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-slate-900/20 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-900/50 border-b border-slate-800">
              <th className="px-6 py-4 text-[10px] font-mono text-slate-500 uppercase tracking-widest">Produto / Descrição</th>
              <th className="px-6 py-4 text-[10px] font-mono text-slate-500 uppercase tracking-widest">Valor de Sugestão</th>
              <th className="px-6 py-4 text-[10px] font-mono text-slate-500 uppercase tracking-widest text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {filtered.map(p => (
              <tr key={p.id} className="hover:bg-cyan-500/5 transition-colors group">
                <td className="px-6 py-4">
                  {editingId === p.id ? (
                    <input
                      type="text"
                      value={editForm.description}
                      onChange={e => setEditForm({...editForm, description: e.target.value.toUpperCase()})}
                      className="bg-slate-950 border border-cyan-500/50 rounded px-2 py-1 text-sm font-mono w-full text-cyan-400"
                    />
                  ) : (
                    <div className="flex items-center gap-2 font-mono text-sm text-slate-200 uppercase">
                      <ChevronRight size={14} className="text-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                      {p.description}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4">
                  {editingId === p.id ? (
                    <input
                      type="number"
                      value={editForm.price}
                      onChange={e => setEditForm({...editForm, price: parseFloat(e.target.value) || 0})}
                      className="bg-slate-950 border border-cyan-500/50 rounded px-2 py-1 text-sm font-mono w-32 text-cyan-400"
                    />
                  ) : (
                    <span className="font-mono text-sm text-cyan-500 font-bold">R$ {p.price.toFixed(2)}</span>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {editingId === p.id ? (
                      <>
                        <button onClick={saveEdit} className="p-2 text-green-400 hover:bg-green-500/10 rounded-lg"><Save size={18} /></button>
                        <button onClick={() => setEditingId(null)} className="p-2 text-slate-400 hover:bg-slate-800 rounded-lg"><X size={18} /></button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => startEdit(p)} className="p-2 text-slate-500 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-all md:opacity-0 group-hover:opacity-100"><Edit3 size={18} /></button>
                        <button onClick={() => setProductToDelete(p)} className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all md:opacity-0 group-hover:opacity-100"><Trash2 size={18} /></button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={3} className="px-6 py-12 text-center text-slate-600 font-mono text-sm italic">
                  NENHUM REGISTRO ENCONTRADO NO BANCO DE DADOS
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL DE DELEÇÃO DE PRODUTO */}
      {productToDelete && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm animate-fade">
          <div className="bg-slate-900 border border-red-500/50 p-8 rounded-[2rem] max-w-sm w-full shadow-2xl space-y-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="p-4 bg-red-500/10 rounded-full border border-red-500/20 text-red-500">
                <AlertTriangle size={32} />
              </div>
              <h3 className="text-lg font-mono font-black text-slate-100 uppercase tracking-tighter">REMOVER DO BANCO?</h3>
              <p className="text-xs font-mono text-slate-500 leading-relaxed uppercase">
                O produto <span className="text-slate-300 font-bold">{productToDelete.description}</span> será removido permanentemente da sua base de sugestões.
              </p>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => setProductToDelete(null)}
                className="flex-grow py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-[10px] font-black uppercase rounded-xl transition-all"
              >
                CANCELAR
              </button>
              <button 
                onClick={confirmProductDeletion}
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

export default ProductsManager;
