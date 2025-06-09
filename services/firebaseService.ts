// services/firebaseService.ts
import {
  EmailAuthProvider,
  signOut as firebaseSignOut,
  linkWithCredential,
  signInAnonymously,
  signInWithEmailAndPassword
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where
} from 'firebase/firestore';
import { auth, FirebaseUserProfile, firestore } from '../config/firebase';

class FirebaseService {
  private static instance: FirebaseService;
  private isCreatingAnonymousUser = false; // ✅ Prevenir creaciones simultáneas

  static getInstance(): FirebaseService {
    if (!FirebaseService.instance) {
      FirebaseService.instance = new FirebaseService();
    }
    return FirebaseService.instance;
  }

  // Generar username aleatorio único
  private async generateUniqueUsername(): Promise<string> {
    const adjectives = ['Swift', 'Brave', 'Wise', 'Noble', 'Pure', 'Holy', 'Faith', 'Grace', 'Light', 'Peace'];
    const nouns = ['Warrior', 'Guardian', 'Seeker', 'Believer', 'Disciple', 'Pilgrim', 'Saint', 'Angel', 'Spirit', 'Heart'];
    
    let attempts = 0;
    const maxAttempts = 50;

    while (attempts < maxAttempts) {
      const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
      const noun = nouns[Math.floor(Math.random() * nouns.length)];
      const number = Math.floor(Math.random() * 1000);
      const username = `${adjective}${noun}${number}`;

      // Verificar si el username ya existe
      const usernameExists = await this.checkUsernameExists(username);
      if (!usernameExists) {
        return username;
      }
      attempts++;
    }

    // Si no se puede generar uno único, usar timestamp
    return `User${Date.now()}`;
  }

  // Verificar si un username ya existe
  private async checkUsernameExists(username: string): Promise<boolean> {
    try {
      const usersRef = collection(firestore, 'users');
      const q = query(usersRef, where('username', '==', username));
      const querySnapshot = await getDocs(q);
      
      return !querySnapshot.empty;
    } catch (error) {
      if (__DEV__) {
        console.error('Error checking username:', error);
      }
      return false;
    }
  }

  // Crear usuario anónimo COMPLETO (Auth + Firestore)
  async createAnonymousUser(): Promise<FirebaseUserProfile> {
    // ✅ Prevenir creaciones simultáneas
    if (this.isCreatingAnonymousUser) {
      console.log('⏳ Ya creando usuario anónimo en FirebaseService, esperando...');
      // Esperar un poco y reintentar una vez
      await new Promise(resolve => setTimeout(resolve, 1000));
      if (this.isCreatingAnonymousUser) {
        throw new Error('Already creating anonymous user');
      }
    }

    this.isCreatingAnonymousUser = true;
    console.log('🔧 Iniciando creación de usuario anónimo en FirebaseService...');

    try {
      const userCredential = await signInAnonymously(auth);
      const user = userCredential.user;

      if (!user) {
        throw new Error('Failed to create anonymous user');
      }

      console.log(`🔧 Usuario anónimo creado en Auth: ${user.uid}`);

      const username = await this.generateUniqueUsername();
      const userProfile: FirebaseUserProfile = {
        uid: user.uid,
        username,
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
        isAnonymous: true,
        linkedWithEmail: false,
        linkedWithGoogle: false,
      };

      // Guardar en Firestore
      await setDoc(doc(firestore, 'users', user.uid), userProfile);
      console.log(`🔧 Perfil guardado en Firestore: ${username}`);

      return userProfile;
    } catch (error) {
      console.error('❌ Error creating anonymous user:', error);
      throw error;
    } finally {
      this.isCreatingAnonymousUser = false;
      console.log('🔧 Finalizó creación en FirebaseService');
    }
  }

  // Obtener perfil del usuario actual
  async getCurrentUserProfile(): Promise<FirebaseUserProfile | null> {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        return null;
      }

      const userDocRef = doc(firestore, 'users', currentUser.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        // ✅ En lugar de lanzar error, retornar null
        // Esto es normal para usuarios nuevos
        return null;
      }

      return userDoc.data() as FirebaseUserProfile;
    } catch (error) {
      // ✅ Solo mostrar error en desarrollo
      if (__DEV__) {
        console.error('Error getting user profile:', error);
      }
      // ✅ Retornar null en lugar de lanzar error
      return null;
    }
  }

  // Actualizar username
  async updateUsername(newUsername: string): Promise<void> {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('No user logged in');
      }

      // Verificar que el username no exista
      const usernameExists = await this.checkUsernameExists(newUsername);
      if (usernameExists) {
        throw new Error('Username already exists');
      }

      // Actualizar en Firestore
      const userDocRef = doc(firestore, 'users', currentUser.uid);
      await updateDoc(userDocRef, {
        username: newUsername
      });

    } catch (error) {
      console.error('❌ Error updating username:', error);
      throw error;
    }
  }

  // Actualizar avatar
  async updateAvatar(avatarIndex: number): Promise<void> {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('No user logged in');
      }

      const userDocRef = doc(firestore, 'users', currentUser.uid);
      await updateDoc(userDocRef, {
        avatar: avatarIndex
      });

    } catch (error) {
      console.error('❌ Error updating avatar:', error);
      throw error;
    }
  }

  // Registrar con email y contraseña
  async registerWithEmail(email: string, password: string): Promise<void> {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser || !currentUser.isAnonymous) {
        throw new Error('Must be an anonymous user to link email');
      }

      // Verificar que el email no esté en uso
      const emailExists = await this.checkEmailExists(email);
      if (emailExists) {
        throw new Error('Email already in use');
      }

      // Crear credencial de email
      const credential = EmailAuthProvider.credential(email, password);
      
      // Enlazar la cuenta anónima con email
      await linkWithCredential(currentUser, credential);

      // Actualizar perfil en Firestore
      const userDocRef = doc(firestore, 'users', currentUser.uid);
      await updateDoc(userDocRef, {
        email: email,
        isAnonymous: false,
        linkedWithEmail: true
      });

    } catch (error) {
      console.error('❌ Error registering with email:', error);
      throw error;
    }
  }

  // Iniciar sesión con email y contraseña
  async signInWithEmail(email: string, password: string): Promise<void> {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error('❌ Error signing in with email:', error);
      throw error;
    }
  }

  // Verificar si un email ya existe
  private async checkEmailExists(email: string): Promise<boolean> {
    try {
      const usersRef = collection(firestore, 'users');
      const q = query(usersRef, where('email', '==', email));
      const querySnapshot = await getDocs(q);
      
      return !querySnapshot.empty;
    } catch (error) {
      if (__DEV__) {
        console.error('Error checking email:', error);
      }
      return false;
    }
  }

  // Cerrar sesión
  async signOut(): Promise<void> {
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      console.error('❌ Error signing out:', error);
      throw error;
    }
  }

  // Actualizar información religiosa
  async updateReligiousInfo(creed: string, denomination: string): Promise<void> {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('No user logged in');
      }

      const userDocRef = doc(firestore, 'users', currentUser.uid);
      await updateDoc(userDocRef, {
        creed,
        denomination
      });

    } catch (error) {
      console.error('❌ Error updating religious info:', error);
      throw error;
    }
  }

  // Actualizar estadísticas del juego
  async updateGameStats(stats: {
    gamesPlayed: number;
    averageScore: number;
    currentStreak: number;
    bestStreak: number;
    totalQuestions: number;
    correctAnswers: number;
  }): Promise<void> {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('No user logged in');
      }

      const userDocRef = doc(firestore, 'users', currentUser.uid);
      await updateDoc(userDocRef, stats);

    } catch (error) {
      console.error('❌ Error updating game stats:', error);
      throw error;
    }
  }
}

export default FirebaseService.getInstance();