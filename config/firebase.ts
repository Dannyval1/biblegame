// config/firebase.ts
import { getApps, initializeApp } from 'firebase/app';
import { browserLocalPersistence, getAuth, setPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { Platform } from 'react-native';

// Tu configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCNw9MotF8C8ZCVz6bIEqGS7zIhFmffIXg",
  authDomain: "biblical-challenge.firebaseapp.com",
  projectId: "biblical-challenge",
  storageBucket: "biblical-challenge.firebasestorage.app",
  messagingSenderId: "876370782107",
  appId: "1:876370782107:web:beb0f012f074140db1e33e",
  measurementId: "G-WW150BQB39"
};

// Inicializar Firebase solo una vez
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Usar solo getAuth para evitar problemas con Expo SDK 53
export const auth = getAuth(app);

// ✅ Configurar persistencia si estamos en web
if (Platform.OS === 'web') {
  setPersistence(auth, browserLocalPersistence).catch((error) => {
    if (__DEV__) {
      console.error('Error setting persistence:', error);
    }
  });
}

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
}