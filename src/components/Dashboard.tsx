import React, { useState, useMemo, useRef } from 'react';
import { AppData, Transaction, TransactionType, Account, Goal, Frequency, SaveFrequency } from '../types';
import { getLevel } from '../constants';
import TransactionModal from './TransactionModal';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area 
} from 'recharts';

// Define standard colors for charts
const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f43f5e'];

interface DashboardProps {
  data: AppData;
  updateData: (newData: Partial<AppData>) => void;
  onLogout: () => void;
}

type TabType = 'overview' | 'analytics' | 'goals' | 'manage';

const Dashboard: React.FC<DashboardProps> = ({ data, updateData, onLogout }) => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterAccount, setFilterAccount] = useState('all');
  const [filterType, setFilterType] = useState<'all' | TransactionType>('all');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [goalContributionAccount, setGoalContributionAccount] = useState<string>('');

  // Handle data import from JSON file
  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        updateData(json);
        alert('Dados importados com sucesso!');
      } catch (err) {
        alert('Erro ao importar arquivo JSON. Verifique o formato.');
      }
    };
    reader.readAsText(file);
  };

  // Cálculo de saldos considerando transferências
  const accountBalances = useMemo(() => {
    const balances: Record<string, number> = {};
    data.accounts.forEach(acc => balances[acc.id] = 0);
    data.transactions.forEach(tx => {
      if (balances[tx.accountId] !== undefined) {
        if (tx.type === 'income') balances[tx.accountId] += tx.amount;
        else if (tx.type === 'expense') balances[tx.accountId] -= tx.amount;
        else if (tx.type === 'transfer') {
            if (tx.destinationAccountId) balances[tx.accountId] -= tx.amount;
            else balances[tx.accountId] += tx.amount;
        }
      }
    });
    return balances;
  }, [data.accounts, data.transactions]);

  // Estatísticas ignorando transferências para o resumo principal
  const stats = useMemo(() => {
    const totalIncome = data.transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    const totalExpenses = data.transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    return { totalIncome, totalExpenses, balance: totalIncome - totalExpenses };
  }, [data.transactions]);

  const levelInfo = useMemo(() => getLevel(data.xp), [data.xp]);

  const filteredTransactions = useMemo(() => {
    return data.transactions
      .filter(t => {
        const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = filterCategory === 'all' || t.category === filterCategory;
        const matchesAccount = filterAccount === 'all' || t.accountId === filterAccount;
        const matchesType = filterType === 'all' || t.type === filterType;
        return matchesSearch && matchesCategory && matchesAccount && matchesType;
      })
      .sort((a, b) => {
        const dateA = new Date(`${a.date}T${a.time}`).getTime();
        const dateB = new Date(`${b.date}T${b.time}`).getTime();
        return dateB - dateA;
      });
  }, [data.transactions, searchTerm, filterCategory, filterAccount, filterType]);

  const chartData = useMemo(() => {
    const daily: Record<string, { date: string; income: number; expense: number }> = {};
    data.transactions.forEach(tx => {
      if (tx.type === 'transfer') return;
      if (!daily[tx.date]) daily[tx.date] = { date: tx.date, income: 0, expense: 0 };
      if (tx.type === 'income') daily[tx.date].income += tx.amount;
      else if (tx.type === 'expense') daily[tx.date].expense += tx.amount;
    });
    return Object.values(daily).sort((a, b) => a.date.localeCompare(b.date)).slice(-15);
  }, [data.transactions]);

  const expensePieData = useMemo(() => {
    const cats: Record<string, number> = {};
    data.transactions.filter(t => t.type === 'expense').forEach(tx => {
      if (!data.categories.includes(tx.category)) return;
      cats[tx.category] = (cats[tx.category] || 0) + tx.amount;
    });
    return Object.entries(cats).map(([name, value]) => ({ name, value }));
  }, [data.transactions, data.categories]);

  const incomePieData = useMemo(() => {
    const cats: Record<string, number> = {};
    data.transactions.filter(t => t.type === 'income').forEach(tx => {
      if (!data.categories.includes(tx.category)) return;
      cats[tx.category] = (cats[tx.category] || 0) + tx.amount;
    });
    return Object.entries(cats).map(([name, value]) => ({ name, value }));
  }, [data.transactions, data.categories]);

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const calculateGoalPlan = (goal: Goal, freq: SaveFrequency) => {
    const currentBalance = accountBalances[goal.linkedAccountId] || 0;
    if (!goal.deadline || currentBalance >= goal.target) return null;
    const remaining = goal.target - currentBalance;
    const today = new Date();
    const deadline = new Date(goal.deadline);
    const timeDiff = deadline.getTime() - today.getTime();
    const daysRemaining = Math.max(Math.ceil(timeDiff / (1000 * 3600 * 24)), 1);
    
    let amount = 0;
    let label = '';
    
    if (freq === 'daily') {
      amount = remaining / daysRemaining;
      label = 'por dia';
    } else if (freq === 'monthly') {
      const months = Math.max(daysRemaining / 30, 1);
      amount = remaining / months;
      label = 'por mês';
    } else {
      const years = Math.max(daysRemaining / 365, 1);
      amount = remaining / years;
      label = 'por ano';
    }
    return { amount, label };
  };

  const handleDeleteTransaction = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm('Excluir esta transação permanentemente? Todos os gráficos e saldos serão atualizados.')) {
      const tx = data.transactions.find(t => t.id === id);
      let newTransactions = data.transactions.filter(t => t.id !== id);
      if (tx?.linkedTransferId) {
          newTransactions = newTransactions.filter(t => t.linkedTransferId !== tx.linkedTransferId);
      }
      updateData({ transactions: newTransactions });
    }
  };

  const handleSaveTransaction = (txData: any) => {
    const now = new Date();
    if (editingTransaction) {
      updateData({ 
        transactions: data.transactions.map(tx => tx.id === editingTransaction.id ? { ...tx, ...txData, isEdited: true, updatedAt: now.toISOString() } : tx) 
      });
    } else {
      const newTx: Transaction = {
        ...txData,
        id: crypto.randomUUID(),
        date: now.toISOString().split('T')[0],
        time: now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      };
      updateData({ transactions: [...data.transactions, newTx], xp: data.xp + 25 });
    }
    setEditingTransaction(null);
    setIsModalOpen(false);
  };

  const handleTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const fromId = (form.elements.namedItem('fromId') as HTMLSelectElement).value;
    const toId = (form.elements.namedItem('toId') as HTMLSelectElement).value;
    const amount = parseFloat((form.elements.namedItem('amount') as HTMLInputElement).value);
    
    if (fromId === toId) return alert("As contas de origem e destino devem ser diferentes.");
    if (amount <= 0) return alert("Valor inválido.");

    const fromAcc = data.accounts.find(a => a.id === fromId);
    const toAcc = data.accounts.find(a => a.id === toId);
    if (!fromAcc || !toAcc) return;

    const now = new Date();
    const commonId = crypto.randomUUID();
    const date = now.toISOString().split('T')[0];
    const time = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    const txOut: Transaction = {
      id: crypto.randomUUID(),
      description: `Transferência para ${toAcc.name}`,
      amount,
      type: 'transfer',
      category: 'Transferência',
      accountId: fromId,
      accountName: fromAcc.name,
      destinationAccountId: toId,
      date, time, linkedTransferId: commonId
    };

    const txIn: Transaction = {
      id: crypto.randomUUID(),
      description: `Transferência de ${fromAcc.name}`,
      amount,
      type: 'transfer',
      category: 'Transferência',
      accountId: toId,
      accountName: toAcc.name,
      date, time, linkedTransferId: commonId
    };

    updateData({ transactions: [...data.transactions, txOut, txIn], xp: data.xp + 30 });
    setIsTransferModalOpen(false);
  };

  const handleSaveGoal = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const gName = (form.elements.namedItem('gName') as HTMLInputElement).value;
    const gTarget = parseFloat((form.elements.namedItem('gTarget') as HTMLInputElement).value);
    const gDeadline = (form.elements.namedItem('gDeadline') as HTMLInputElement).value;

    const goalId = editingGoal ? editingGoal.id : crypto.randomUUID();
    let linkedAccountId = editingGoal?.linkedAccountId;
    let newAccounts = [...data.accounts];

    if (!editingGoal) {
        linkedAccountId = crypto.randomUUID();
        const goalAccount: Account = {
            id: linkedAccountId,
            name: `Meta: ${gName}`,
            color: '#10b981',
            isGoalAccount: true
        };
        newAccounts.push(goalAccount);
    } else {
        newAccounts = newAccounts.map(a => a.id === linkedAccountId ? { ...a, name: `Meta: ${gName}` } : a);
    }

    const gData: Goal = {
      id: goalId,
      name: gName,
      target: gTarget,
      current: 0, 
      deadline: gDeadline,
      linkedAccountId: linkedAccountId!,
      saveFrequency: editingGoal?.saveFrequency || 'monthly'
    };

    if (editingGoal) {
        updateData({ 
            goals: data.goals.map(g => g.id === goalId ? gData : g),
            accounts: newAccounts
        });
    } else {
        updateData({ 
            goals: [...data.goals, gData],
            accounts: newAccounts,
            xp: data.xp + 100
        });
    }
    setShowGoalModal(false);
    setEditingGoal(null);
  };

  const handleDeleteGoal = (goal: Goal) => {
    if (window.confirm(`Deseja realmente excluir a meta "${goal.name}"? As transações vinculadas a ela serão mantidas no histórico, mas a meta e sua conta de reserva serão removidas.`)) {
        updateData({
            goals: data.goals.filter(g => g.id !== goal.id),
            accounts: data.accounts.filter(a => a.id !== goal.linkedAccountId)
        });
    }
  };

  const handleDeleteAccount = (id: string) => {
    if (window.confirm('Excluir esta conta? Se ela pertencer a uma meta, a meta também será excluída.')) {
        const account = data.accounts.find(a => a.id === id);
        if (account?.isGoalAccount) {
            updateData({
                accounts: data.accounts.filter(a => a.id !== id),
                goals: data.goals.filter(g => g.linkedAccountId !== id)
            });
        } else {
            updateData({ accounts: data.accounts.filter(a => a.id !== id) });
        }
    }
  };

  const moveGoalValue = (goal: Goal, direction: 'in' | 'out') => {
    const inputId = direction === 'in' ? `goal-adjust-${goal.id}` : `goal-withdraw-${goal.id}`;
    const input = document.getElementById(inputId) as HTMLInputElement;
    if (!input) return;
    const amount = parseFloat(input.value);
    
    if (isNaN(amount) || amount <= 0) return alert("Insira um valor positivo.");

    const sourceAccountId = direction === 'in' ? goalContributionAccount || (data.accounts.find(a => !a.isGoalAccount)?.id || '') : goal.linkedAccountId;
    const targetAccountId = direction === 'in' ? goal.linkedAccountId : goalContributionAccount || (data.accounts.find(a => !a.isGoalAccount)?.id || '');

    const fromAcc = data.accounts.find(a => a.id === sourceAccountId);
    const toAcc = data.accounts.find(a => a.id === targetAccountId);
    if (!fromAcc || !toAcc) return alert("Selecione uma conta válida.");

    const now = new Date();
    const commonId = crypto.randomUUID();
    const date = now.toISOString().split('T')[0];
    const time = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    const txOut: Transaction = {
      id: crypto.randomUUID(),
      description: direction === 'in' ? `Aporte Meta: ${goal.name}` : `Resgate Meta: ${goal.name}`,
      amount,
      type: 'transfer',
      category: 'Investimentos',
      accountId: sourceAccountId,
      accountName: fromAcc.name,
      destinationAccountId: targetAccountId,
      date, time, linkedTransferId: commonId
    };

    const txIn: Transaction = {
      id: crypto.randomUUID(),
      description: direction === 'in' ? `Aporte Meta: ${goal.name}` : `Resgate Meta: ${goal.name}`,
      amount,
      type: 'transfer',
      category: 'Investimentos',
      accountId: targetAccountId,
      accountName: toAcc.name,
      date, time, linkedTransferId: commonId
    };

    updateData({ transactions: [...data.transactions, txOut, txIn], xp: data.xp + 50 });
    input.value = '';
  };

  const renameCategory = (oldName: string, newName: string) => {
    if (!newName || oldName === newName) return setEditingCategoryId(null);
    updateData({ 
      categories: data.categories.map(c => c === oldName ? newName : c),
      transactions: data.transactions.map(tx => tx.category === oldName ? { ...tx, category: newName } : tx)
    });
    setEditingCategoryId(null);
  };

  const renameAccount = (id: string, newName: string) => {
    if (!newName) return setEditingAccountId(null);
    updateData({ 
      accounts: data.accounts.map(a => a.id === id ? { ...a, name: newName } : a),
      transactions: data.transactions.map(tx => tx.accountId === id ? { ...tx, accountName: newName } : tx)
    });
    setEditingAccountId(null);
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row h-screen overflow-hidden bg-slate-50">
      <aside className="w-full md:w-64 bg-slate-900 text-white flex flex-col">
        <div className="p-6">
          <h2 className="text-2xl font-bold">Finance<span className="text-emerald-400">Flow</span></h2>
          <div className="mt-4 p-4 bg-slate-800 rounded-xl">
             <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1" title="Nível atual">{levelInfo.name}</p>
             <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
               <div className="bg-emerald-500 h-full transition-all" style={{ width: `${levelInfo.progress}%` }} />
             </div>
             <p className="text-[10px] text-slate-500 mt-1">{data.xp} XP</p>
          </div>
        </div>
        <nav className="flex-1 px-4 space-y-2">
          {[
            { id: 'overview', label: 'Início', icon: '📊', t: 'Resumo geral' },
            { id: 'analytics', label: 'Gráficos', icon: '📈', t: 'Análise visual' },
            { id: 'goals', label: 'Metas', icon: '🎯', t: 'Seus sonhos' },
            { id: 'manage', label: 'Ajustes', icon: '⚙️', t: 'Configurações' }
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as TabType)} title={tab.t} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${activeTab === tab.id ? 'bg-emerald-500 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>
              <span>{tab.icon}</span> {tab.label}
            </button>
          ))}
        </nav>
        <div className="p-6"><button onClick={onLogout} className="w-full text-slate-400 text-sm flex items-center gap-2">🚪 Sair</button></div>
      </aside>

      <main className="flex-1 overflow-y-auto p-6 md:p-10">
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-slate-800 capitalize">{activeTab === 'overview' ? 'Visão Geral' : activeTab === 'analytics' ? 'Análise Inteligente' : activeTab === 'goals' ? 'Planejamento de Metas' : 'Configurações'}</h1>
          <div className="flex gap-2">
            <button onClick={() => setIsTransferModalOpen(true)} className="bg-slate-800 text-white px-6 py-3 rounded-2xl font-bold shadow-lg" title="Mover dinheiro">Transferir</button>
            <button onClick={() => { setEditingTransaction(null); setIsModalOpen(true); }} className="bg-emerald-500 text-white px-6 py-3 rounded-2xl font-bold shadow-lg" title="Novo registro">+ Lançamento</button>
          </div>
        </header>

        {activeTab === 'overview' && (
           <div className="space-y-8 animate-in fade-in">
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                  <p className="text-slate-400 text-xs font-bold uppercase mb-1">Saldo Líquido</p>
                  <h3 className={`text-2xl font-black ${stats.balance >= 0 ? 'text-slate-800' : 'text-rose-600'}`}>{formatCurrency(stats.balance)}</h3>
                </div>
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                  <p className="text-slate-400 text-xs font-bold uppercase mb-1">Receitas</p>
                  <h3 className="text-2xl font-black text-emerald-500">{formatCurrency(stats.totalIncome)}</h3>
                </div>
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                  <p className="text-slate-400 text-xs font-bold uppercase mb-1">Despesas</p>
                  <h3 className="text-2xl font-black text-rose-500">{formatCurrency(stats.totalExpenses)}</h3>
                </div>
             </div>

             <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-6 border-b border-slate-50 flex justify-between items-center">
                   <h3 className="font-bold text-slate-800">Histórico de Movimentações</h3>
                   <input type="text" placeholder="Filtrar..." className="text-xs border rounded-lg px-3 py-1 outline-none" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
                <table className="w-full text-left">
                  <thead className="bg-slate-50/50 text-slate-400 text-[10px] font-black uppercase tracking-wider">
                    <tr><th className="px-6 py-4">Data/Hora</th><th className="px-6 py-4">Descrição</th><th className="px-6 py-4">Categoria</th><th className="px-6 py-4 text-right">Valor</th><th className="px-6 py-4"></th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredTransactions.map(t => {
                      const catExists = data.categories.includes(t.category) || t.category === 'Transferência' || t.category === 'Investimentos';
                      return (
                        <tr key={t.id} onClick={() => { setEditingTransaction(t); setIsModalOpen(true); }} className="hover:bg-slate-50/50 group cursor-pointer">
                          <td className="px-6 py-4 text-xs text-slate-500">{t.date} <span className="opacity-50 ml-1">{t.time}</span></td>
                          <td className="px-6 py-4 font-bold text-slate-700 text-sm">{t.description}</td>
                          <td className="px-6 py-4"><span className={`px-2 py-1 rounded text-[10px] font-bold ${catExists ? 'bg-slate-100 text-slate-500' : 'bg-rose-50 text-rose-500'}`}>{t.category}{!catExists && ' (Removida)'}</span></td>
                          <td className={`px-6 py-4 text-sm font-black text-right ${t.type === 'income' ? 'text-emerald-500' : t.type === 'expense' ? 'text-rose-500' : 'text-slate-400'}`}>
                            {t.type === 'transfer' ? '' : (t.type === 'income' ? '+' : '-')} {formatCurrency(t.amount)}
                          </td>
                          <td className="px-6 py-4 text-right">
                             <button onClick={(e) => handleDeleteTransaction(t.id, e)} className="text-slate-300 hover:text-rose-500 p-2" title="Remover permanentemente">🗑️</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
             </div>
           </div>
        )}

        {activeTab === 'analytics' && (
          <div className="space-y-8 animate-in fade-in">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                <h3 className="font-bold text-slate-800 mb-6">Despesas por Categoria</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={expensePieData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                      {expensePieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <ChartTooltip formatter={(value: number) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                <h3 className="font-bold text-slate-800 mb-6">Receitas por Categoria</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={incomePieData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                      {incomePieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <ChartTooltip formatter={(value: number) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
              <h3 className="font-bold text-slate-800 mb-6">Fluxo Temporal (S/ Transferências)</h3>
              <ResponsiveContainer width="100%" height={250}><AreaChart data={chartData}><XAxis dataKey="date" hide /><ChartTooltip formatter={(value: number) => formatCurrency(value)} /><Area type="monotone" dataKey="income" stroke="#10b981" fill="#10b98120" /><Area type="monotone" dataKey="expense" stroke="#f43f5e" fill="#f43f5e10" /></AreaChart></ResponsiveContainer>
            </div>
          </div>
        )}

        {activeTab === 'goals' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in">
            {data.goals.map(goal => {
               const currentBalance = accountBalances[goal.linkedAccountId] || 0;
               const progress = Math.min((currentBalance / goal.target) * 100, 100);
               const currentFreq = goal.saveFrequency || 'monthly';
               const plan = calculateGoalPlan(goal, currentFreq);
               return (
                 <div key={goal.id} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                    <div className="flex justify-between mb-4">
                        <h3 className="font-bold text-slate-800">{goal.name}</h3>
                        <div className="flex gap-1">
                            <button onClick={() => { setEditingGoal(goal); setShowGoalModal(true); }} className="text-slate-300 hover:text-emerald-500 p-1">✏️</button>
                            <button onClick={() => handleDeleteGoal(goal)} className="text-slate-300 hover:text-rose-500 p-1">🗑️</button>
                        </div>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mb-2"><div className="bg-emerald-500 h-full transition-all" style={{ width: `${progress}%` }} /></div>
                    <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-4"><span>{formatCurrency(currentBalance)}</span><span>{formatCurrency(goal.target)}</span></div>
                    
                    <div className="flex gap-1 mb-3">
                       {['daily', 'monthly', 'yearly'].map(f => (
                         <button key={f} onClick={() => updateData({ goals: data.goals.map(g => g.id === goal.id ? { ...g, saveFrequency: f as SaveFrequency } : g) })} className={`flex-1 py-1 text-[8px] font-black uppercase rounded ${currentFreq === f ? 'bg-emerald-500 text-white' : 'bg-slate-50 text-slate-400'}`}>{f === 'daily' ? 'Dia' : f === 'monthly' ? 'Mês' : 'Ano'}</button>
                       ))}
                    </div>

                    {plan && progress < 100 && <div className="p-3 bg-emerald-50 rounded-xl mb-4 text-[9px] text-emerald-800 font-bold">Poupe {formatCurrency(plan.amount)} {plan.label}</div>}

                    <div className="space-y-3">
                      <select onChange={(e) => setGoalContributionAccount(e.target.value)} className="w-full bg-slate-50 border rounded-xl px-3 py-2 text-[10px] outline-none" title="Conta para aporte/resgate">
                        {data.accounts.filter(a => !a.isGoalAccount).map(acc => <option key={acc.id} value={acc.id}>{acc.name} ({formatCurrency(accountBalances[acc.id] || 0)})</option>)}
                      </select>
                      <div className="flex gap-2">
                        <input id={`goal-adjust-${goal.id}`} type="number" placeholder="Aporte R$" className="flex-1 bg-slate-50 border rounded-xl px-2 py-2 text-xs outline-none" />
                        <button onClick={() => moveGoalValue(goal, 'in')} className="bg-slate-900 text-white px-3 py-2 rounded-xl text-[10px] font-bold">Aportar</button>
                      </div>
                      <div className="flex gap-2">
                        <input id={`goal-withdraw-${goal.id}`} type="number" placeholder="Resgate R$" className="flex-1 bg-slate-50 border rounded-xl px-2 py-2 text-xs outline-none" />
                        <button onClick={() => moveGoalValue(goal, 'out')} className="bg-rose-500 text-white px-3 py-2 rounded-xl text-[10px] font-bold">Resgatar</button>
                      </div>
                    </div>
                 </div>
               );
            })}
            <button onClick={() => { setEditingGoal(null); setShowGoalModal(true); }} className="border-2 border-dashed border-slate-200 rounded-3xl p-6 flex flex-col items-center justify-center text-slate-400 hover:text-emerald-500"><span className="text-3xl">＋</span><span className="text-xs font-bold">Novo Sonho</span></button>
          </div>
        )}

        {activeTab === 'manage' && (
           <div className="space-y-8 animate-in fade-in">
             <section className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
               <h3 className="font-bold text-slate-800 mb-6">Contas Bancárias</h3>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                 {data.accounts.map(acc => (
                   <div key={acc.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl group border border-transparent hover:border-slate-200 transition-all">
                     <div className="flex-1">
                       {editingAccountId === acc.id ? (
                         <input autoFocus defaultValue={acc.name} onBlur={(e) => renameAccount(acc.id, e.target.value)} onKeyDown={(e) => e.key === 'Enter' && renameAccount(acc.id, (e.target as any).value)} className="text-sm font-bold bg-white border border-emerald-400 rounded-lg px-2 py-1 outline-none w-full" />
                       ) : (
                         <>
                           <span className={`text-sm font-bold ${acc.isGoalAccount ? 'text-emerald-600' : 'text-slate-700'}`}>{acc.name}</span>
                           <p className="text-[10px] font-black uppercase text-slate-400">{formatCurrency(accountBalances[acc.id] || 0)}</p>
                         </>
                       )}
                     </div>
                     <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setEditingAccountId(acc.id)} className="p-2 text-slate-300 hover:text-emerald-500">✏️</button>
                        <button onClick={() => handleDeleteAccount(acc.id)} className="p-2 text-slate-300 hover:text-rose-500">🗑️</button>
                     </div>
                   </div>
                 ))}
               </div>
               <div className="flex gap-2">
                 <input id="newAcc" type="text" placeholder="Nome da nova conta..." className="flex-1 bg-slate-50 border rounded-xl px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-emerald-500" />
                 <button onClick={() => { const el = document.getElementById('newAcc') as HTMLInputElement; if (el.value) { updateData({ accounts: [...data.accounts, { id: crypto.randomUUID(), name: el.value, color: '#3b82f6' }] }); el.value = ''; } }} className="bg-slate-900 text-white px-6 rounded-xl font-bold transition-all active:scale-95">+</button>
               </div>
             </section>

             <section className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
               <h3 className="font-bold text-slate-800 mb-6">Gestão de Categorias</h3>
               <div className="flex flex-wrap gap-2 mb-6">
                 {data.categories.map(cat => (
                   <div key={cat} className="group flex items-center bg-slate-50 border rounded-full px-4 py-2 hover:border-emerald-500 transition-all">
                     {editingCategoryId === cat ? (
                       <input autoFocus defaultValue={cat} onBlur={(e) => renameCategory(cat, e.target.value)} onKeyDown={(e) => e.key === 'Enter' && renameCategory(cat, (e.target as any).value)} className="text-xs font-bold bg-white border border-emerald-400 rounded-lg px-2 outline-none min-w-[80px]" />
                     ) : (
                       <>
                         <span className="text-xs font-bold text-slate-600">{cat}</span>
                         <div className="flex ml-2 gap-1 opacity-0 group-hover:opacity-100 transition-all">
                            <button onClick={() => setEditingCategoryId(cat)} className="text-[10px] text-slate-400 hover:text-emerald-500">✏️</button>
                            <button onClick={() => { if(window.confirm(`Remover categoria "${cat}"?`)) updateData({ categories: data.categories.filter(c => c !== cat) }) }} className="text-[10px] text-slate-400 hover:text-rose-500">✕</button>
                         </div>
                       </>
                     )}
                   </div>
                 ))}
               </div>
               <div className="flex gap-2">
                 <input id="newCat" type="text" placeholder="Nova categoria..." className="flex-1 bg-slate-50 border rounded-xl px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-emerald-500" />
                 <button onClick={() => { const el = document.getElementById('newCat') as HTMLInputElement; if (el.value) { updateData({ categories: [...data.categories, el.value] }); el.value = ''; } }} className="bg-slate-900 text-white px-6 rounded-xl font-bold transition-all active:scale-95">+</button>
               </div>
             </section>

             <section className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
               <h3 className="font-bold text-slate-800 mb-6">Backup de Segurança</h3>
               <div className="flex gap-4">
                 <button onClick={() => { const b = new Blob([JSON.stringify(data)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'finance_backup.json'; a.click(); }} className="bg-slate-900 text-white px-6 py-4 rounded-2xl font-bold hover:bg-slate-800 transition-all">Exportar Dados</button>
                 <button onClick={() => fileInputRef.current?.click()} className="bg-emerald-500 text-white px-6 py-4 rounded-2xl font-bold hover:bg-emerald-400 transition-all">Importar Backup</button>
                 <input type="file" ref={fileInputRef} onChange={handleImportData} className="hidden" accept=".json" />
               </div>
             </section>
           </div>
        )}
      </main>

      {/* Transfer Modal */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsTransferModalOpen(false)} />
          <form onSubmit={handleTransfer} className="relative bg-white w-full max-w-md rounded-[2rem] shadow-2xl p-8 animate-in zoom-in-95">
            <h3 className="text-xl font-bold mb-6">Mover Dinheiro</h3>
            <div className="space-y-4">
               <div><label className="text-[10px] font-black uppercase text-slate-400">Origem</label><select name="fromId" className="w-full bg-slate-50 border rounded-xl px-4 py-3 text-sm outline-none">{data.accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name} ({formatCurrency(accountBalances[acc.id] || 0)})</option>)}</select></div>
               <div><label className="text-[10px] font-black uppercase text-slate-400">Destino</label><select name="toId" className="w-full bg-slate-50 border rounded-xl px-4 py-3 text-sm outline-none">{data.accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}</select></div>
               <div><label className="text-[10px] font-black uppercase text-slate-400">Valor</label><input name="amount" type="number" step="0.01" className="w-full bg-slate-50 border rounded-xl px-4 py-3 text-sm outline-none" required /></div>
               <button type="submit" className="w-full bg-slate-900 py-4 rounded-2xl font-bold text-white mt-4">Confirmar</button>
            </div>
          </form>
        </div>
      )}

      <TransactionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onConfirm={handleSaveTransaction} accounts={data.accounts} categories={data.categories} initialData={editingTransaction || undefined} />
      
      {showGoalModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowGoalModal(false)} />
          <form onSubmit={handleSaveGoal} className="relative bg-white w-full max-w-md rounded-[2rem] shadow-2xl p-8 animate-in zoom-in-95">
            <h3 className="text-xl font-bold mb-6">{editingGoal ? 'Editar Meta' : 'Novo Sonho'}</h3>
            <div className="space-y-4">
               <input name="gName" defaultValue={editingGoal?.name} className="w-full bg-slate-50 border rounded-xl px-4 py-3 text-sm outline-none" placeholder="Nome do Sonho" required />
               <input name="gTarget" type="number" step="0.01" defaultValue={editingGoal?.target} className="w-full bg-slate-50 border rounded-xl px-4 py-3 text-sm outline-none" placeholder="Valor Alvo" required />
               <input name="gDeadline" type="date" defaultValue={editingGoal?.deadline} className="w-full bg-slate-50 border rounded-xl px-4 py-3 text-sm outline-none" required />
               <button type="submit" className="w-full bg-emerald-500 py-4 rounded-2xl font-bold text-white mt-4">Salvar</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default Dashboard;