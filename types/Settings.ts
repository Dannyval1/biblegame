export interface UserProfile {
  username: string;
  email: string;
  avatar: number;
  creed: string;
  denomination: string;
  gamesPlayed: number;
  averageScore: number;
  currentStreak: number;
  bestStreak: number;
  totalQuestions: number;
  correctAnswers: number;
  createdAt: string;
}

export interface GameStats {
  gamesPlayed: number;
  totalQuestions: number;
  correctAnswers: number;
  currentStreak: number;
  bestStreak: number;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
  date?: Date;
}

export const CREEDS = [
  "Select...",
  "Trinitario",
  "Unicitario",
  "Dualista",
  "No especificar",
  "Otro"
];

export const DENOMINATIONS = [
  "No denominacional",
  "Católica",
  "Protestante",
  "Pentecostal Unida (IPUC)",
  "Pentecostal Unida (IPUIC)",
  "Testigos de Jehová",
  "Adventista",
  "Bautista",
  "Metodista",
  "Ortodoxa",
  "Prefiero no decir",
  "Otro"
];

export const DEFAULT_PROFILE = {
  username: `User${Math.floor(Math.random() * 9999)}`,
  email: '',
  avatar: 0,
  creed: '',
  denomination: '',
  gamesPlayed: 0,
  averageScore: 0,
  currentStreak: 0,
  bestStreak: 0,
  totalQuestions: 0,
  correctAnswers: 0,
  createdAt: new Date().toISOString(),
};