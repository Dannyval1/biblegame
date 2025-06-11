// services/firebaseService.ts - CORRECCIONES COMPLETAS PARA iOS
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  EmailAuthProvider,
  signOut as firebaseSignOut,
  linkWithCredential,
  onAuthStateChanged,
  signInAnonymously,
  signInWithEmailAndPassword,
  User,
} from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { Platform } from "react-native";
import { auth, FirebaseUserProfile, firestore } from "../config/firebase";

class FirebaseService {
  private static instance: FirebaseService;
  private isCreatingAnonymousUser = false;
  private authStateReady = false;
  
  // ✅ NUEVO: Variables para iOS específicamente
  private lastAuthState: User | null = null;
  private profileUpdateQueue: Array<() => Promise<void>> = [];
  private processingQueue = false;

  static getInstance(): FirebaseService {
    if (!FirebaseService.instance) {
      FirebaseService.instance = new FirebaseService();
    }
    return FirebaseService.instance;
  }

  private waitForAuthState(): Promise<User | null> {
    return new Promise((resolve) => {
      if (this.authStateReady && auth.currentUser) {
        resolve(auth.currentUser);
        return;
      }

      const unsubscribe = onAuthStateChanged(auth, (user) => {
        this.authStateReady = true;
        this.lastAuthState = user; // ✅ NUEVO: Tracking del estado
        unsubscribe();
        resolve(user);
      });

      // ✅ Timeout más largo para iOS
      const timeout = Platform.OS === 'ios' ? 8000 : 5000;
      setTimeout(() => {
        unsubscribe();
        resolve(auth.currentUser);
      }, timeout);
    });
  }

  // ✅ NUEVO: Procesar cola de actualizaciones para evitar race conditions
  private async processUpdateQueue(): Promise<void> {
    if (this.processingQueue || this.profileUpdateQueue.length === 0) {
      return;
    }

    this.processingQueue = true;
    
    try {
      while (this.profileUpdateQueue.length > 0) {
        const update = this.profileUpdateQueue.shift();
        if (update) {
          await update();
          // ✅ Pequeño delay entre actualizaciones en iOS
          if (Platform.OS === 'ios') {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
      }
    } catch (error) {
      console.error("❌ Error procesando cola de actualizaciones:", error);
    } finally {
      this.processingQueue = false;
    }
  }

  // ✅ NUEVO: Agregar actualización a la cola
  private queueProfileUpdate(updateFn: () => Promise<void>): void {
    this.profileUpdateQueue.push(updateFn);
    this.processUpdateQueue();
  }

  // Generar username aleatorio único
  private async generateUniqueUsername(): Promise<string> {
    const adjectives = [
      "Swift",
      "Brave",
      "Wise",
      "Noble",
      "Pure",
      "Holy",
      "Faith",
      "Grace",
      "Light",
      "Peace",
    ];
    const nouns = [
      "Warrior",
      "Guardian",
      "Seeker",
      "Believer",
      "Disciple",
      "Pilgrim",
      "Saint",
      "Angel",
      "Spirit",
      "Heart",
    ];

    let attempts = 0;
    const maxAttempts = 50;

    while (attempts < maxAttempts) {
      const adjective =
        adjectives[Math.floor(Math.random() * adjectives.length)];
      const noun = nouns[Math.floor(Math.random() * nouns.length)];
      const number = Math.floor(Math.random() * 1000);
      const username = `${adjective}${noun}${number}`;

      const usernameExists = await this.checkUsernameExists(username);
      if (!usernameExists) {
        return username;
      }
      attempts++;
    }

    return `User${Date.now()}`;
  }

  private async checkUsernameExists(username: string): Promise<boolean> {
    try {
      const usersRef = collection(firestore, "users");
      const q = query(usersRef, where("username", "==", username));
      const querySnapshot = await getDocs(q);

      return !querySnapshot.empty;
    } catch (error) {
      if (__DEV__) {
        console.error("Error checking username:", error);
      }
      return false;
    }
  }

  async initializeAuthState(): Promise<void> {
    return new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        this.authStateReady = true;
        this.lastAuthState = user; // ✅ NUEVO: Tracking
        console.log(
          "🔧 Estado de autenticación inicializado:",
          user ? `Usuario: ${user.uid}` : "Sin usuario"
        );
        unsubscribe();
        resolve();
      });
    });
  }

  async createAnonymousUser(): Promise<FirebaseUserProfile> {
    if (this.isCreatingAnonymousUser) {
      console.log(
        "⏳ Ya creando usuario anónimo en FirebaseService, esperando..."
      );
      await new Promise((resolve) => setTimeout(resolve, 1000));
      if (this.isCreatingAnonymousUser) {
        throw new Error("Already creating anonymous user");
      }
    }

    this.isCreatingAnonymousUser = true;
    console.log(
      "🔧 Iniciando creación de usuario anónimo en FirebaseService..."
    );

    try {
      const userCredential = await signInAnonymously(auth);
      const user = userCredential.user;

      if (!user) {
        throw new Error("Failed to create anonymous user");
      }

      console.log(`🔧 Usuario anónimo creado en Auth: ${user.uid}`);

      const username = await this.generateUniqueUsername();
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + 30);

      const userProfile: FirebaseUserProfile = {
        uid: user.uid,
        username,
        avatar: 0,
        creed: "",
        denomination: "",
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
        lastActivity: new Date().toISOString(),
        expiresAt: expirationDate.toISOString(),
        activityScore: 0,
        markedForDeletion: false,
      };

      // ✅ Guardar en Firestore con retry para iOS
      await this.saveProfileWithRetry(user.uid, userProfile);
      console.log(`🔧 Perfil guardado en Firestore: ${username}`);

      // ✅ NUEVO: Actualizar estado local también
      this.lastAuthState = user;

      return userProfile;
    } catch (error) {
      console.error("❌ Error creating anonymous user:", error);
      throw error;
    } finally {
      this.isCreatingAnonymousUser = false;
      console.log("🔧 Finalizó creación en FirebaseService");
    }
  }

  // ✅ NUEVO: Guardar perfil con retry para iOS
  private async saveProfileWithRetry(uid: string, profile: FirebaseUserProfile, maxRetries: number = 3): Promise<void> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await setDoc(doc(firestore, "users", uid), profile);
        console.log(`✅ Perfil guardado en intento ${attempt}`);
        return;
      } catch (error) {
        console.log(`❌ Error en intento ${attempt}:`, error);
        
        if (attempt === maxRetries) {
          throw error;
        }
        
        // ✅ Wait más tiempo en iOS
        const delay = Platform.OS === 'ios' ? attempt * 500 : attempt * 200;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // ✅ MEJORADO: getCurrentUserProfile con mejor manejo de errores
  async getCurrentUserProfile(): Promise<FirebaseUserProfile | null> {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        console.log("❌ No hay usuario actual en Auth");
        return null;
      }

      console.log(`🔍 Obteniendo perfil para UID: ${currentUser.uid}`);
      
      const userDocRef = doc(firestore, "users", currentUser.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        console.log(`❌ No existe documento en Firestore para UID: ${currentUser.uid}`);
        return null;
      }

      const profileData = userDoc.data() as FirebaseUserProfile;
      console.log(`✅ Perfil obtenido: ${profileData.username}, isAnonymous: ${profileData.isAnonymous}`);
      
      return profileData;
    } catch (error) {
      if (__DEV__) {
        console.error("❌ Error getting user profile:", error);
      }
      return null;
    }
  }

  async updateUsername(newUsername: string): Promise<void> {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error("No user logged in");
      }

      const usernameExists = await this.checkUsernameExists(newUsername);
      if (usernameExists) {
        throw new Error("Username already exists");
      }

      const userDocRef = doc(firestore, "users", currentUser.uid);
      await updateDoc(userDocRef, {
        username: newUsername,
      });
    } catch (error) {
      console.error("❌ Error updating username:", error);
      throw error;
    }
  }

  async updateAvatar(avatarIndex: number): Promise<void> {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error("No user logged in");
      }

      const userDocRef = doc(firestore, "users", currentUser.uid);
      await updateDoc(userDocRef, {
        avatar: avatarIndex,
      });
    } catch (error) {
      console.log("❌ Error updating avatar:", error);
      throw error;
    }
  }

  async registerWithEmail(email: string, password: string): Promise<void> {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser || !currentUser.isAnonymous) {
        throw new Error("Must be an anonymous user to link email");
      }

      const emailExists = await this.checkEmailExists(email);
      if (emailExists) {
        throw new Error("Email already in use");
      }

      const credential = EmailAuthProvider.credential(email, password);
      await linkWithCredential(currentUser, credential);

      const userDocRef = doc(firestore, "users", currentUser.uid);
      await updateDoc(userDocRef, {
        email: email,
        isAnonymous: false,
        linkedWithEmail: true,
      });
    } catch (error) {
      console.error("❌ Error registering with email:", error);
      throw error;
    }
  }

  async signInWithEmail(email: string, password: string): Promise<void> {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error("❌ Error signing in with email:", error);
      throw error;
    }
  }

  private async checkEmailExists(email: string): Promise<boolean> {
    try {
      const usersRef = collection(firestore, "users");
      const q = query(usersRef, where("email", "==", email));
      const querySnapshot = await getDocs(q);

      return !querySnapshot.empty;
    } catch (error) {
      if (__DEV__) {
        console.error("Error checking email:", error);
      }
      return false;
    }
  }

  // ✅ MEJORADO: connectWithEmail con mejor soporte para iOS
  async connectWithEmail(
    email: string,
    password: string
  ): Promise<{ type: "linked" | "signin" | "created"; message: string }> {
    try {
      console.log("🔍 Verificando estado actual...");
      const currentUser = await this.waitForAuthState();

      if (!currentUser) {
        console.log(
          "❌ No hay usuario autenticado, creando usuario anónimo..."
        );
        await this.createAnonymousUser();
        const newUser = auth.currentUser;

        if (!newUser) {
          throw new Error("Failed to create anonymous user");
        }

        console.log("✅ Usuario anónimo creado, procediendo con enlace...");
      }

      const verifiedUser = auth.currentUser;
      if (!verifiedUser) {
        throw new Error("No user available after auth state check");
      }

      console.log("🔍 Estado del usuario para enlace:");
      console.log("- UID:", verifiedUser.uid);
      console.log("- isAnonymous (Auth):", verifiedUser.isAnonymous);
      console.log("- email (Auth):", verifiedUser.email);
      console.log("- providerData length:", verifiedUser.providerData.length);

      const canLink =
        verifiedUser.isAnonymous &&
        !verifiedUser.email &&
        verifiedUser.providerData.length === 0;

      if (canLink) {
        console.log("🔗 Intentando enlazar email con cuenta anónima...");

        try {
          const credential = EmailAuthProvider.credential(email, password);
          await linkWithCredential(verifiedUser, credential);

          // ✅ MEJORADO: Actualización con cola para iOS
          const updateProfile = async () => {
            const userDocRef = doc(firestore, "users", verifiedUser.uid);
            await updateDoc(userDocRef, {
              email: email,
              isAnonymous: false,
              linkedWithEmail: true,
            });
          };

          if (Platform.OS === 'ios') {
            this.queueProfileUpdate(updateProfile);
            // ✅ Delay adicional para iOS
            await new Promise(resolve => setTimeout(resolve, 500));
          } else {
            await updateProfile();
          }

          console.log("✅ Cuenta enlazada exitosamente");
          return { type: "linked", message: "Account linked successfully" };
        } catch (linkError: any) {
          console.log("❌ Error enlazando cuenta:", linkError.code);

          if (linkError.code === "auth/email-already-in-use") {
            console.log("📧 Email ya existe, intentando sign in...");

            try {
              await signInWithEmailAndPassword(auth, email, password);
              console.log("✅ Sign in exitoso con cuenta existente");
              
              // ✅ NUEVO: Pequeño delay para iOS antes de retornar
              if (Platform.OS === 'ios') {
                await new Promise(resolve => setTimeout(resolve, 300));
              }
              
              return {
                type: "signin",
                message: "Signed in with existing account",
              };
            } catch (signInError: any) {
              console.log("❌ Error en sign in:", signInError.code);

              if (
                signInError.code === "auth/invalid-credential" ||
                signInError.code === "auth/user-not-found"
              ) {
                console.log("🆕 Usuario no existe, creando cuenta nueva...");
                return await this.createNewEmailAccount(email, password);
              }

              throw signInError;
            }
          } else {
            throw linkError;
          }
        }
      } else {
        console.log("⚠️ No se puede enlazar, intentando sign in directo...");

        try {
          await signInWithEmailAndPassword(auth, email, password);
          console.log("✅ Sign in directo exitoso");
          
          // ✅ NUEVO: Delay para iOS
          if (Platform.OS === 'ios') {
            await new Promise(resolve => setTimeout(resolve, 300));
          }
          
          return { type: "signin", message: "Signed in successfully" };
        } catch (signInError: any) {
          console.log("❌ Error en sign in directo:", signInError.code);

          if (
            signInError.code === "auth/invalid-credential" ||
            signInError.code === "auth/user-not-found"
          ) {
            console.log("🆕 Usuario no existe, creando cuenta nueva...");
            return await this.createNewEmailAccount(email, password);
          }

          throw signInError;
        }
      }
    } catch (error: any) {
      console.error("❌ Error en connectWithEmail:", error);
      throw error;
    }
  }

  private async createNewEmailAccount(
    email: string,
    password: string
  ): Promise<{ type: "created"; message: string }> {
    try {
      console.log("🆕 Creando nueva cuenta con email/password...");

      const { createUserWithEmailAndPassword } = await import("firebase/auth");
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      console.log("✅ Nueva cuenta creada:", user.uid);

      const username = await this.generateUniqueUsername();
      const userProfile: FirebaseUserProfile = {
        uid: user.uid,
        username,
        email: email,
        avatar: 0,
        creed: "",
        denomination: "",
        gamesPlayed: 0,
        averageScore: 0,
        currentStreak: 0,
        bestStreak: 0,
        totalQuestions: 0,
        correctAnswers: 0,
        createdAt: new Date().toISOString(),
        isAnonymous: false,
        linkedWithEmail: true,
        linkedWithGoogle: false,
        lastActivity: new Date().toISOString(),
        activityScore: 0,
        markedForDeletion: false,
      };

      await this.saveProfileWithRetry(user.uid, userProfile);
      console.log("✅ Perfil creado para nueva cuenta:", username);

      return { type: "created", message: "New account created successfully" };
    } catch (error: any) {
      console.error("❌ Error creando nueva cuenta:", error);
      throw error;
    }
  }

  async debugUserState(): Promise<any> {
    try {
      const currentUser = auth.currentUser;
      const userProfile = await this.getCurrentUserProfile();

      const debugInfo = {
        auth: {
          exists: !!currentUser,
          uid: currentUser?.uid,
          isAnonymous: currentUser?.isAnonymous,
          email: currentUser?.email,
          providersCount: currentUser?.providerData.length,
          providers: currentUser?.providerData.map((p) => p.providerId),
        },
        firestore: {
          exists: !!userProfile,
          isAnonymous: userProfile?.isAnonymous,
          linkedWithEmail: userProfile?.linkedWithEmail,
          email: userProfile?.email,
        },
        inconsistencies: [] as string[],
        platform: Platform.OS, // ✅ NUEVO: Incluir plataforma
      };

      if (currentUser && userProfile) {
        if (currentUser.isAnonymous !== userProfile.isAnonymous) {
          debugInfo.inconsistencies.push(
            "isAnonymous mismatch between Auth and Firestore"
          );
        }

        if (currentUser.email !== userProfile.email) {
          debugInfo.inconsistencies.push(
            "email mismatch between Auth and Firestore"
          );
        }
      }

      console.log("🔍 DEBUG USER STATE:", JSON.stringify(debugInfo, null, 2));
      return debugInfo;
    } catch (error: any) {
      console.error("❌ Error in debugUserState:", error);
      return { error: error.message, platform: Platform.OS };
    }
  }

  async signOutAndClearAll(): Promise<void> {
    try {
      const currentUser = auth.currentUser;

      if (currentUser && currentUser.isAnonymous) {
        console.log("🗑️ Marcando usuario anónimo para eliminación...");
        await this.markUserForDeletion(currentUser.uid);
      }

      await firebaseSignOut(auth);

      await AsyncStorage.multiRemove([
        "userProfile",
        "anonymousUserUID",
        "gameStats",
        "firstLaunch",
      ]);

      // ✅ NUEVO: Limpiar estado interno
      this.lastAuthState = null;
      this.authStateReady = false;
      this.profileUpdateQueue = [];
      this.processingQueue = false;

      console.log("✅ Sesión cerrada y todos los datos limpiados");
    } catch (error) {
      console.error("❌ Error signing out and clearing data:", error);
      throw error;
    }
  }

  private async markUserForDeletion(uid: string): Promise<void> {
    try {
      const userDoc = await getDoc(doc(firestore, "users", uid));

      if (userDoc.exists()) {
        const userData = userDoc.data() as FirebaseUserProfile;

        if (this.shouldMarkForDeletion(userData)) {
          await updateDoc(doc(firestore, "users", uid), {
            markedForDeletion: true,
            deletionMarkedAt: new Date().toISOString(),
            lastActivity: new Date().toISOString(),
          });

          console.log(`🗑️ Usuario ${uid} marcado para eliminación`);
        } else {
          console.log(
            `📊 Usuario ${uid} tiene actividad significativa, manteniendo`
          );
        }
      }
    } catch (error) {
      if (__DEV__) {
        console.log("⚠️ No se pudo marcar usuario para eliminación:", error);
      }
    }
  }

  private shouldMarkForDeletion(userData: FirebaseUserProfile): boolean {
    const hasSignificantActivity =
      userData.gamesPlayed > 0 ||
      userData.creed !== "" ||
      userData.denomination !== "" ||
      (userData.activityScore && userData.activityScore > 5) ||
      !userData.username?.match(/^[A-Z][a-z]+[A-Z][a-z]+\d+$/);

    return !hasSignificantActivity;
  }

  async updateUserActivity(
    activityType: "game" | "profile_edit" | "login"
  ): Promise<void> {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const userDoc = await getDoc(doc(firestore, "users", currentUser.uid));
      if (!userDoc.exists()) return;

      const currentData = userDoc.data() as FirebaseUserProfile;
      const currentScore = currentData.activityScore || 0;

      const scoreMap = {
        game: 10,
        profile_edit: 5,
        login: 1,
      };

      const updates: any = {
        lastActivity: new Date().toISOString(),
        activityScore: currentScore + scoreMap[activityType],
      };

      if (activityType === "game") {
        const newExpiration = new Date();
        newExpiration.setDate(newExpiration.getDate() + 30);
        updates.expiresAt = newExpiration.toISOString();
      }

      await updateDoc(doc(firestore, "users", currentUser.uid), updates);
    } catch (error) {
      if (__DEV__) {
        console.log("⚠️ No se pudo actualizar actividad:", error);
      }
    }
  }

  async updateReligiousInfo(
    creed: string,
    denomination: string
  ): Promise<void> {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error("No user logged in");
      }

      const userDocRef = doc(firestore, "users", currentUser.uid);
      await updateDoc(userDocRef, {
        creed,
        denomination,
      });
    } catch (error) {
      console.error("❌ Error updating religious info:", error);
      throw error;
    }
  }

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
        console.log(
          "⏳ No hay usuario autenticado, saltando actualización de stats"
        );
        return;
      }

      const userDocRef = doc(firestore, "users", currentUser.uid);
      await updateDoc(userDocRef, stats);
      console.log("📊 Estadísticas actualizadas en Firebase");

      await this.updateUserActivity("game");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.log(
        "⚠️ No se pudieron actualizar las estadísticas:",
        errorMessage
      );
    }
  }
}

export default FirebaseService.getInstance();