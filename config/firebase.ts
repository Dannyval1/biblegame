import { getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Estos datos deben ir en un archivo de ENV, asumo yo porque son confidenciales
const firebaseConfig = {
  apiKey: "AIzaSyCNw9MotF8C8ZCVz6bIEqGS7zIhFmffIXg",
  authDomain: "biblical-challenge.firebaseapp.com",
  projectId: "biblical-challenge",
  storageBucket: "biblical-challenge.firebasestorage.app",
  messagingSenderId: "876370782107",
  appId: "1:876370782107:web:beb0f012f074140db1e33e",
  measurementId: "G-WW150BQB39"
};

if (getApps().length === 0) {
  console.log('🔥 Inicializando Firebase por primera vez...');
} else {
  console.log('🔥 Firebase ya inicializado, usando instancia existente');
}

// Inicializar Firebase solo una vez
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);
export const firestore = getFirestore(app);

// Debug info simple
console.log('🔥 Firebase inicializado correctamente');

export interface FirebaseUserProfile {
  uid: string;
  username: string;
  email?: string;
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
  isAnonymous: boolean;
  linkedWithEmail?: boolean;
  linkedWithGoogle?: boolean;
  
  // ✅ Campos opcionales para compatibilidad con usuarios existentes
  lastActivity?: string;           // Última actividad
  expiresAt?: string;             // Cuándo expira (solo anónimos)
  markedForDeletion?: boolean;    // Marcado para eliminar
  deletionMarkedAt?: string;      // Cuándo se marcó
  activityScore?: number;         // Puntuación de actividad
}