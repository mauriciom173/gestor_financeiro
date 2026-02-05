
import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import { AppData } from './types';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [data, setData] = useState<AppData>(() => {
    const saved = localStorage.getItem('financeData_pro_v2');
    if (saved) return JSON.parse(saved);
    
    return {
      transactions: [],
      accounts: [
        { id: '1', name: 'Carteira', color: '#10b981' },
        { id: '2', name: 'Banco Principal', color: '#3b82f6' }
      ],
      categories: ['Alimentação', 'Transporte', 'Lazer', 'Saúde', 'Educação', 'Salário', 'Investimentos'],
      goals: [],
      xp: 0,
      lastSync: new Date().toISOString()
    };
  });

  useEffect(() => {
    localStorage.setItem('financeData_pro_v2', JSON.stringify(data));
  }, [data]);

  const handleLogin = (pin: string) => {
    if (pin === '1234') {
      setIsAuthenticated(true);
    } else {
      alert('PIN incorreto!');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
  };

  const updateData = (newData: Partial<AppData>) => {
    setData(prev => ({ ...prev, ...newData, lastSync: new Date().toISOString() }));
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {!isAuthenticated ? (
        <Login onLogin={handleLogin} />
      ) : (
        <Dashboard 
          data={data} 
          updateData={updateData} 
          onLogout={handleLogout} 
        />
      )}
    </div>
  );
};

export default App;
