
import { UserLevel } from './types';

export const LEVEL_THRESHOLD = 500; // XP needed per major level

export const getLevel = (xp: number): { name: UserLevel; progress: number } => {
  const levelIndex = Math.floor(xp / LEVEL_THRESHOLD);
  const progress = ((xp % LEVEL_THRESHOLD) / LEVEL_THRESHOLD) * 100;
  
  if (levelIndex === 0) return { name: UserLevel.POUPADOR, progress };
  if (levelIndex === 1) return { name: UserLevel.INVESTIDOR, progress };
  if (levelIndex === 2) return { name: UserLevel.ESTRATEGISTA, progress };
  return { name: UserLevel.MESTRE, progress: 100 };
};

export const CATEGORIES = [
  'Alimentação',
  'Transporte',
  'Lazer',
  'Saúde',
  'Educação',
  'Salário',
  'Investimentos',
  'Outros'
];
