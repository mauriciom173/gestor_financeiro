
import React, { useState } from 'react';

interface LoginProps {
  onLogin: (pin: string) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [pin, setPin] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(pin);
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 bg-slate-900 text-white">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold mb-2">Finance<span className="text-emerald-400">Flow</span></h1>
        <p className="text-slate-400 text-sm">Controle Inteligente de Gastos</p>
      </div>
      
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700 backdrop-blur-sm">
          <label className="block text-xs uppercase tracking-widest text-slate-500 mb-2 font-semibold">PIN de Acesso</label>
          <input
            type="password"
            maxLength={4}
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="••••"
            className="w-full bg-slate-700 border-none text-white text-center text-3xl tracking-[1em] rounded-xl py-4 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
            autoFocus
          />
        </div>
        
        <button
          type="submit"
          className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
        >
          Entrar no Dashboard
        </button>
        
        <p className="text-center text-xs text-slate-500">Padrão: 1234</p>
      </form>
    </div>
  );
};

export default Login;
