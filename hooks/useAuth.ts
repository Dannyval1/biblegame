// hooks/useAuth.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { Platform } from "react-native";
import { auth, FirebaseUserProfile, firestore } from "../config/firebase";
import FirebaseService from "../services/firebaseService";

// ✅ Keys para AsyncStorage
const STORAGE_KEYS = {
  USER_PROFILE: 'userProfile',
  USER_UID: 'anonymousUserUID',
  FIRST_LAUNCH: 'firstLaunch'
};

export const useAuth = () => {
  const [user, setUser] = useState<FirebaseUserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  useEffect(() => {
    // Esperar a que Firebase esté listo
    const waitForFirebase = async () => {
      while (!auth.app.options) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      setInitialized(true);
    };

    waitForFirebase();
  }, []);

  useEffect(() => {
    if (!initialized) return;
    console.log(`🔐 Inicializando Auth en ${Platform.OS}...`);
    
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      console.log(`🔐 Auth state changed: ${authUser ? 'Usuario encontrado' : 'Sin usuario'}`);
      
      // ✅ Evitar procesar si ya estamos creando un usuario
      if (isCreatingUser) {
        console.log(`⏳ Ya creando usuario, saltando...`);
        return;
      }
      
      setLoading(true);

      try {
        if (authUser) {
          console.log(`✅ Usuario autenticado: ${authUser.uid}, isAnonymous: ${authUser.isAnonymous}`);
          
          // ✅ Intentar cargar perfil desde Firebase primero
          let userProfile = await loadUserProfileFromFirebase(authUser.uid);
          
          if (userProfile) {
            console.log(`👤 Perfil cargado desde Firebase: ${userProfile.username}`);
            // ✅ Guardar en AsyncStorage para acceso rápido
            await saveUserProfileToStorage(userProfile);
            setUser(userProfile);
            setIsAuthenticated(true);
          } else if (authUser.isAnonymous) {
            // ✅ Usuario anónimo sin perfil - crear perfil en Firestore
            console.log(`📝 Creando perfil en Firestore para usuario anónimo...`);
            setIsCreatingUser(true);
            try {
              const newProfile = await createUserProfile(authUser);
              await saveUserProfileToStorage(newProfile);
              await AsyncStorage.setItem(STORAGE_KEYS.USER_UID, authUser.uid);
              setUser(newProfile);
              setIsAuthenticated(true);
              console.log(`✅ Perfil anónimo creado: ${newProfile.username}`);
            } catch (error) {
              console.error("❌ Error creando perfil:", error);
              setUser(null);
              setIsAuthenticated(false);
            } finally {
              setIsCreatingUser(false);
            }
          } else {
            // Usuario con email pero sin perfil
            console.log(`🆕 Creando perfil para usuario con email...`);
            setIsCreatingUser(true);
            try {
              await createProfileForExistingUser(authUser);
              console.log(`✅ Perfil con email creado`);
            } catch (error) {
              console.error("❌ Error creando perfil con email:", error);
              setUser(null);
              setIsAuthenticated(false);
            } finally {
              setIsCreatingUser(false);
            }
          }
        } else {
          // ✅ No hay usuario autenticado - verificar si tenemos uno guardado localmente
          console.log(`🔍 Sin usuario autenticado, verificando almacenamiento local...`);
          await handleNoAuthenticatedUser();
        }
      } catch (error) {
        console.error("❌ Error inesperado en auth state change:", error);
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, [initialized]);

  // ✅ Cargar perfil desde Firebase
  const loadUserProfileFromFirebase = async (uid: string): Promise<FirebaseUserProfile | null> => {
    try {
      const userDocRef = doc(firestore, 'users', uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        return userDoc.data() as FirebaseUserProfile;
      }
      return null;
    } catch (error) {
      if (__DEV__) {
        console.error('Error loading user profile from Firebase:', error);
      }
      return null;
    }
  };

  // ✅ Guardar perfil en AsyncStorage
  const saveUserProfileToStorage = async (profile: FirebaseUserProfile): Promise<void> => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(profile));
    } catch (error) {
      if (__DEV__) {
        console.error('Error saving profile to storage:', error);
      }
    }
  };

  // ✅ Cargar perfil desde AsyncStorage
  const loadUserProfileFromStorage = async (): Promise<FirebaseUserProfile | null> => {
    try {
      const profileData = await AsyncStorage.getItem(STORAGE_KEYS.USER_PROFILE);
      if (profileData) {
        return JSON.parse(profileData) as FirebaseUserProfile;
      }
      return null;
    } catch (error) {
      if (__DEV__) {
        console.error('Error loading profile from storage:', error);
      }
      return null;
    }
  };

  // ✅ Manejar caso sin usuario autenticado
  const handleNoAuthenticatedUser = async () => {
    if (isCreatingUser) {
      console.log(`⏳ Ya creando usuario, saltando handleNoAuthenticatedUser...`);
      return;
    }

    try {
      // Verificar si tenemos un UID guardado localmente
      const savedUID = await AsyncStorage.getItem(STORAGE_KEYS.USER_UID);
      const savedProfile = await loadUserProfileFromStorage();
      
      if (savedUID && savedProfile) {
        console.log(`🔄 Restaurando usuario desde almacenamiento: ${savedProfile.username}`);
        setUser(savedProfile);
        setIsAuthenticated(true);
        console.log(`✅ Usuario restaurado: ${savedProfile.username}`);
      } else {
        // ✅ Primera vez o no hay datos - crear nuevo usuario anónimo
        console.log(`🆕 Primera instalación, creando usuario anónimo...`);
        setIsCreatingUser(true); // ✅ Proteger antes de llamar a Firebase
        try {
          const newProfile = await FirebaseService.createAnonymousUser();
          await saveUserProfileToStorage(newProfile);
          await AsyncStorage.setItem(STORAGE_KEYS.USER_UID, newProfile.uid);
          setUser(newProfile);
          setIsAuthenticated(true);
          console.log(`✅ Nuevo usuario anónimo creado: ${newProfile.username}`);
        } catch (error) {
          console.error("❌ Error creando nuevo usuario anónimo:", error);
          setUser(null);
          setIsAuthenticated(false);
        } finally {
          setIsCreatingUser(false);
        }
      }
    } catch (error) {
      console.error('❌ Error manejando usuario no autenticado:', error);
      setUser(null);
      setIsAuthenticated(false);
      setIsCreatingUser(false);
    }
  };

  // ✅ Esta función ya no es necesaria - movimos la lógica a handleNoAuthenticatedUser
  // const createNewAnonymousUser = async () => {
  //   // Código movido a handleNoAuthenticatedUser
  // };

  // ✅ Crear perfil para usuario autenticado existente
  const createUserProfile = async (authUser: User): Promise<FirebaseUserProfile> => {
    const username = await generateUniqueUsername();
    const userProfile: FirebaseUserProfile = {
      uid: authUser.uid,
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
      isAnonymous: authUser.isAnonymous,
      linkedWithEmail: !!authUser.email,
      linkedWithGoogle: false,
    };

    // Guardar en Firestore
    await setDoc(doc(firestore, 'users', authUser.uid), userProfile);
    return userProfile;
  };

  // Crear perfil para usuario existente (cuando se enlaza con email)
  const createProfileForExistingUser = async (authUser: User) => {
    try {
      const userProfile = await createUserProfile(authUser);
      await saveUserProfileToStorage(userProfile);
      setUser(userProfile);
      setIsAuthenticated(true);
    } catch (error) {
      console.error("❌ Error creating profile for existing user:", error);
      throw error;
    }
  };

  // Función auxiliar para generar username único
  const generateUniqueUsername = async (): Promise<string> => {
    const adjectives = ["Swift", "Brave", "Wise", "Noble", "Pure", "Holy"];
    const nouns = ["Warrior", "Guardian", "Seeker", "Believer", "Disciple"];

    const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const number = Math.floor(Math.random() * 1000);

    return `${adjective}${noun}${number}`;
  };

  const refreshUserProfile = async () => {
    try {
      setLoading(true);
      if (user) {
        const userProfile = await loadUserProfileFromFirebase(user.uid);
        if (userProfile) {
          await saveUserProfileToStorage(userProfile);
          setUser(userProfile);
          console.log(`🔄 Perfil actualizado: ${userProfile.username}`);
        }
      }
    } catch (error) {
      if (__DEV__) {
        console.error("❌ Error refreshing user profile:", error);
      }
    } finally {
      setLoading(false);
    }
  };

  // ✅ Función para limpiar datos (útil para testing o reset)
  const clearUserData = async () => {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.USER_PROFILE,
        STORAGE_KEYS.USER_UID,
        STORAGE_KEYS.FIRST_LAUNCH
      ]);
      setUser(null);
      setIsAuthenticated(false);
      console.log('🗑️ Datos de usuario limpiados');
    } catch (error) {
      console.error('❌ Error limpiando datos:', error);
    }
  };

  return {
    user,
    loading,
    isAuthenticated,
    refreshUserProfile,
    initialized,
    clearUserData // ✅ Útil para testing
  };
};