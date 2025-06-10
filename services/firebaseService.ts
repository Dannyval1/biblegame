// services/firebaseService.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
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
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + 30);
      
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
        // ✅ Campos opcionales con valores por defecto
        lastActivity: new Date().toISOString(),
        expiresAt: expirationDate.toISOString(),
        activityScore: 0,
        markedForDeletion: false
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

  // ✅ NUEVO: Cerrar sesión y limpiar TODO (Opción B)
  async signOutAndClearAll(): Promise<void> {
    try {
      const currentUser = auth.currentUser;
      
      if (currentUser && currentUser.isAnonymous) {
        console.log('🗑️ Marcando usuario anónimo para eliminación...');
        // ✅ Marcar usuario anónimo para eliminación si no tiene actividad significativa
        await this.markUserForDeletion(currentUser.uid);
      }
      
      // Cerrar sesión en Firebase
      await firebaseSignOut(auth);
      
      // ✅ Limpiar TODO el AsyncStorage
      await AsyncStorage.multiRemove([
        'userProfile',
        'anonymousUserUID', 
        'gameStats',
        'firstLaunch'
      ]);
      
      console.log('✅ Sesión cerrada y todos los datos limpiados');
      
    } catch (error) {
      console.error('❌ Error signing out and clearing data:', error);
      throw error;
    }
  }

  // ✅ Marcar usuario para eliminación (soft delete)
  private async markUserForDeletion(uid: string): Promise<void> {
    try {
      const userDoc = await getDoc(doc(firestore, 'users', uid));
      
      if (userDoc.exists()) {
        const userData = userDoc.data() as FirebaseUserProfile;
        
        // ✅ Solo marcar si no tiene actividad significativa
        if (this.shouldMarkForDeletion(userData)) {
          await updateDoc(doc(firestore, 'users', uid), {
            markedForDeletion: true,
            deletionMarkedAt: new Date().toISOString(),
            lastActivity: new Date().toISOString()
          });
          
          console.log(`🗑️ Usuario ${uid} marcado para eliminación`);
        } else {
          console.log(`📊 Usuario ${uid} tiene actividad significativa, manteniendo`);
        }
      }
    } catch (error) {
      // ✅ No fallar si no se puede marcar
      if (__DEV__) {
        console.log('⚠️ No se pudo marcar usuario para eliminación:', error);
      }
    }
  }

  // ✅ Criterios para decidir si eliminar (con verificaciones de campos opcionales)
  private shouldMarkForDeletion(userData: FirebaseUserProfile): boolean {
    const hasSignificantActivity = 
      userData.gamesPlayed > 0 ||                           // Ha jugado
      userData.creed !== '' ||                              // Ha configurado religión
      userData.denomination !== '' ||                       // Ha configurado denominación
      (userData.activityScore && userData.activityScore > 5) || // Actividad general (campo opcional)
      !userData.username?.match(/^[A-Z][a-z]+[A-Z][a-z]+\d+$/); // Username personalizado
    
    return !hasSignificantActivity;
  }

  // ✅ Actualizar actividad del usuario (versión simplificada)
  async updateUserActivity(activityType: 'game' | 'profile_edit' | 'login'): Promise<void> {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      // ✅ Obtener el valor actual primero
      const userDoc = await getDoc(doc(firestore, 'users', currentUser.uid));
      if (!userDoc.exists()) return;

      const currentData = userDoc.data() as FirebaseUserProfile;
      const currentScore = currentData.activityScore || 0;

      const scoreMap = {
        'game': 10,
        'profile_edit': 5,
        'login': 1
      };

      const updates: any = {
        lastActivity: new Date().toISOString(),
        activityScore: currentScore + scoreMap[activityType] // ✅ Sumar manualmente
      };

      // ✅ Extender expiración si hay actividad significativa
      if (activityType === 'game') {
        const newExpiration = new Date();
        newExpiration.setDate(newExpiration.getDate() + 30);
        updates.expiresAt = newExpiration.toISOString();
      }

      await updateDoc(doc(firestore, 'users', currentUser.uid), updates);
      
    } catch (error) {
      if (__DEV__) {
        console.log('⚠️ No se pudo actualizar actividad:', error);
      }
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

  // ✅ Actualizar estadísticas del juego con tracking de actividad
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
        // ✅ No mostrar error, solo avisar
        console.log('⏳ No hay usuario autenticado, saltando actualización de stats');
        return;
      }

      const userDocRef = doc(firestore, 'users', currentUser.uid);
      await updateDoc(userDocRef, stats);
      console.log('📊 Estadísticas actualizadas en Firebase');

      // ✅ Registrar actividad de juego
      await this.updateUserActivity('game');

    } catch (error) {
      // ✅ Log más amigable con type safety
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log('⚠️ No se pudieron actualizar las estadísticas:', errorMessage);
      // ✅ No lanzar error para que la app continúe funcionando
    }
  }
}

export default FirebaseService.getInstance();