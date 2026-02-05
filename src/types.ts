
export type TransactionType = 'income' | 'expense' | 'transfer';
export type Frequency = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
export type SaveFrequency = 'daily' | 'monthly' | 'yearly';

export interface Account {
  id: string;
  name: string;
  color: string;
  isGoalAccount?: boolean;
}

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: TransactionType;
  category: string;
  accountId: string;
  accountName: string; 
  date: string; 
  time: string; 
  isEdited?: boolean;
  updatedAt?: string;
  isRecurring?: boolean;
  frequency?: Frequency;
  linkedTransferId?: string; // ID comum para o par de transações de transferência
  destinationAccountId?: string; // Para identificar o destino em transferências
}

export interface Goal {
  id: string;
  name: string;
  target: number;
  current: number; // Agora derivado ou mantido para compatibilidade, mas idealmente derivado do saldo da conta vinculada
  deadline?: string;
  category?: string;
  saveFrequency?: SaveFrequency;
  linkedAccountId: string;
}

export interface AppData {
  transactions: Transaction[];
  accounts: Account[];
  categories: string[];
  goals: Goal[];
  xp: number;
  lastSync: string;
}

export enum UserLevel {
  POUPADOR = 'Poupador',
  INVESTIDOR = 'Investidor',
  ESTRATEGISTA = 'Estrategista',
  MESTRE = 'Mestre das Finanças'
}
