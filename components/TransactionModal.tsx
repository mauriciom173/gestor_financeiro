
import React, { useState, useEffect } from 'react';
import { TransactionType, Account, Transaction, Frequency } from '../types';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (t: { 
    description: string; 
    amount: number; 
    type: TransactionType; 
    category: string; 
    accountId: string; 
    accountName: string;
    isRecurring?: boolean;
    frequency?: Frequency;
  }) => void;
  accounts: Account[];
  categories: string[];
  initialData?: Transaction;
}

const TransactionModal: React.FC<TransactionModalProps> = ({ isOpen, onClose, onConfirm, accounts, categories, initialData }) => {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<TransactionType>('expense');
  const [category, setCategory] = useState('');
  const [accountId, setAccountId] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState<Frequency>('none');

  useEffect(() => {
    if (initialData) {
      setDescription(initialData.description);
      setAmount(initialData.amount.toString());
      setType(initialData.type);
      setCategory(initialData.category);
      setAccountId(initialData.accountId);
      setIsRecurring(!!initialData.isRecurring);
      setFrequency(initialData.frequency || 'none');
    } else {
      setDescription('');
      setAmount('');
      setType('expense');
      setCategory(categories[0] || '');
      setAccountId(accounts[0]?.id || '');
      setIsRecurring(false);
      setFrequency('none');
    }
  }, [initialData, isOpen, categories, accounts]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount || !accountId) return;
    
    const selectedAccount = accounts.find(a => a.id === accountId);
    const accountName = selectedAccount ? selectedAccount.name : (initialData?.accountName || 'Conta Removida');
    
    onConfirm({
      description,
      amount: parseFloat(amount),
      type,
      category,
      accountId,
      accountName,
      isRecurring,
      frequency: isRecurring ? frequency : 'none'
    });
    
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className="relative bg-white w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden p-6 animate-slide-up">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-slate-800">{initialData ? 'Editar Transação' : 'Nova Transação'}</h3>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
            <button type="button" onClick={() => setType('income')} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${type === 'income' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-50'}`}>Receita</button>
            <button type="button" onClick={() => setType('expense')} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${type === 'expense' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-50'}`}>Despesa</button>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Descrição</label>
            <input type="text" value={description} onChange={e => setDescription(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none" placeholder="O que aconteceu?" required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Valor (R$)</label>
              <input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-emerald-500/20 outline-none" placeholder="0,00" required />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Conta</label>
              <select value={accountId} onChange={e => setAccountId(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none appearance-none" required>
                {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                {!accounts.find(a => a.id === accountId) && accountId && (
                  <option value={accountId}>{initialData?.accountName || 'Conta Removida'} (Deletada)</option>
                )}
              </select>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Categoria</label>
            <select value={category} onChange={e => setCategory(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none appearance-none">
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
              {!categories.includes(category) && category && <option value={category}>{category} (Removida)</option>}
            </select>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-slate-700">Transação Recorrente</span>
              <button type="button" onClick={() => setIsRecurring(!isRecurring)} className={`w-10 h-5 rounded-full transition-colors relative ${isRecurring ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-all ${isRecurring ? 'translate-x-5' : ''}`} />
              </button>
            </div>
            {isRecurring && (
              <select value={frequency} onChange={e => setFrequency(e.target.value as Frequency)} className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs outline-none">
                <option value="none">Selecione a frequência</option>
                <option value="daily">Diária</option>
                <option value="weekly">Semanal</option>
                <option value="monthly">Mensal</option>
                <option value="yearly">Anual</option>
              </select>
            )}
          </div>

          <button type="submit" className={`w-full py-4 rounded-2xl font-bold text-white shadow-lg transition-transform active:scale-95 mt-4 ${type === 'income' ? 'bg-emerald-500 shadow-emerald-500/20' : 'bg-rose-500 shadow-rose-500/20'}`}>
            {initialData ? 'Salvar Alterações' : 'Registrar Transação'}
          </button>
        </form>
      </div>
      <style>{`
        @keyframes slide-up { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .animate-slide-up { animation: slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
      `}</style>
    </div>
  );
};

export default TransactionModal;
