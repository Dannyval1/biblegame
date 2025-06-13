import { auth } from "@/config/firebase";
import { useAudioManager } from "@/hooks/useAudioManager";
import { useAuth } from "@/hooks/useAuth";
import FirebaseService from "@/services/firebaseService";

import { CREEDS, DENOMINATIONS, GameStats } from "@/types/Settings";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  KeyboardEvent,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from "react-native";

const AVATAR_IMAGES = ["👤", "👨", "👩", "🧔", "👱‍♂️", "👱‍♀️", "👨‍🦱", "👩‍🦱"];

export default function ProfileScreen() {
  const { user, loading, refreshUserProfile, clearUserData } = useAuth();
  const { updateActiveScreen } = useAudioManager();

  const [showUsernameEdit, setShowUsernameEdit] = useState(false);
  const [showEmailEdit, setShowEmailEdit] = useState(false);
  const [showReligiousInfo, setShowReligiousInfo] = useState(false);
  const [tempUsername, setTempUsername] = useState("");
  const [tempEmail, setTempEmail] = useState("");
  const [tempPassword, setTempPassword] = useState("");
  const [tempCreed, setTempCreed] = useState("");
  const [tempDenomination, setTempDenomination] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [statsLoaded, setStatsLoaded] = useState(false);
  const [isEmailValid, setIsEmailValid] = useState(false);
  const [isPasswordValid, setIsPasswordValid] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [isSaveEnabled, setIsSaveEnabled] = useState(false);

  const passwordInputRef = useRef<TextInput>(null);
  
  // 🔧 Referencias para controlar logs
  const lastProcessedUID = useRef<string>("");
  const refreshTimeoutRef = useRef<NodeJS.Timeout | number | null>(null);

  // ✅ Validación con conversión explícita a boolean
  useEffect(() => {
    const creedSelected = Boolean(tempCreed && tempCreed !== "Select..." && tempCreed !== "");
    const denominationSelected = Boolean(tempDenomination && tempDenomination !== "Select..." && tempDenomination !== "");
    
    // Requiere ambos campos seleccionados
    setIsSaveEnabled(creedSelected && denominationSelected);
  }, [tempCreed, tempDenomination]);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      "keyboardDidShow",
      (e: KeyboardEvent) => {
        setKeyboardVisible(true);
      }
    );

    const keyboardDidHideListener = Keyboard.addListener(
      "keyboardDidHide",
      () => {
        setKeyboardVisible(false);
      }
    );

    return () => {
      keyboardDidShowListener?.remove();
      keyboardDidHideListener?.remove();
    };
  }, []);

  // ✅ CORREGIDO: useEffect mejorado para detectar cambios de usuario
  useEffect(() => {
    if (user) {
      console.log("👤 Usuario detectado en Profile:", user.username, "Anonymous:", user.isAnonymous);
      
      // ✅ NUEVO: Detectar si el usuario cambió (especialmente después de sign in)
      const userChanged = lastProcessedUID.current !== user.uid;
      
      if (userChanged) {
        console.log("🔄 Usuario cambió, limpiando estado local...");
        lastProcessedUID.current = user.uid;
        
        // ✅ Limpiar estados relacionados con el usuario anterior
        setStatsLoaded(false);
        setTempEmail("");
        setTempPassword("");
        setIsEmailValid(false);
        setIsPasswordValid(false);
        setShowPassword(false);
        
        // ✅ Cerrar modales si estaban abiertos
        setShowEmailEdit(false);
        setShowUsernameEdit(false);
        setShowReligiousInfo(false);
        
        console.log("✅ Estado local limpiado para nuevo usuario");
      }
      
      // ✅ Si es usuario anónimo nuevo, preparar para carga de stats
      if (user.isAnonymous && !statsLoaded && userChanged) {
        console.log("🔄 Usuario anónimo nuevo detectado");
      }
    } else {
      console.log("❌ No hay usuario en Profile");
      lastProcessedUID.current = "";
    }
  }, [user?.uid, user?.isAnonymous, user?.linkedWithEmail, user?.username]);

  useFocusEffect(
    useCallback(() => {
      updateActiveScreen("profile");
      return () => {};
    }, [updateActiveScreen])
  );

  useEffect(() => {
    if (user && !statsLoaded && !loading && user.uid) {
      const currentUser = auth.currentUser;
      if (currentUser && currentUser.uid === user.uid) {
        loadGameStats();
      } else {
        console.log("⏳ Esperando sincronización con Firebase Auth...");
        setTimeout(() => {
          const retryUser = auth.currentUser;
          if (retryUser && retryUser.uid === user.uid) {
            loadGameStats();
          } else {
            console.log(
              "📝 Usuario restaurado localmente, stats se cargarán cuando Firebase se sincronice"
            );
          }
        }, 1000);
      }
    }
  }, [user, statsLoaded, loading]);

  const loadGameStats = async () => {
    if (!user || statsLoaded) return;

    const currentUser = auth.currentUser;
    if (!currentUser || currentUser.uid !== user.uid) {
      console.log(
        "⏳ Firebase Auth no sincronizado aún, saltando carga de stats"
      );
      return;
    }

    try {
      console.log("📊 Cargando estadísticas de juego...");
      setStatsLoaded(true);

      const savedStats = await AsyncStorage.getItem("gameStats");
      if (savedStats) {
        const stats: GameStats = JSON.parse(savedStats);

        const authCheck = auth.currentUser;
        if (!authCheck || authCheck.uid !== user.uid) {
          console.log(
            "⚠️ Usuario cambió durante la carga, cancelando actualización"
          );
          setStatsLoaded(false);
          return;
        }

        await FirebaseService.updateGameStats({
          gamesPlayed: stats.gamesPlayed,
          averageScore:
            stats.totalQuestions > 0
              ? Math.round((stats.correctAnswers / stats.totalQuestions) * 100)
              : 0,
          currentStreak: stats.currentStreak,
          bestStreak: stats.bestStreak,
          totalQuestions: stats.totalQuestions,
          correctAnswers: stats.correctAnswers,
        });

        await refreshUserProfile();
        console.log("✅ Estadísticas actualizadas");
      } else {
        console.log("📝 No hay estadísticas guardadas localmente");
      }
    } catch (error: any) {
      console.log(
        "⚠️ No se pudieron cargar las estadísticas:",
        error?.message || error
      );
      setStatsLoaded(false);
    }
  };

  const handleUsernameEdit = () => {
    if (!user) return;

    if (user.isAnonymous) {
      Alert.alert(
        "Connect Email First",
        "You need to connect your email before you can customize your username.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Connect Email", onPress: handleEmailEdit },
        ]
      );
      return;
    }

    setTempUsername(user.username);
    setShowUsernameEdit(true);
  };

  const handleSaveUsername = async () => {
    if (!tempUsername.trim()) {
      Alert.alert("Error", "Username cannot be empty");
      return;
    }

    if (tempUsername.length < 3) {
      Alert.alert("Error", "Username must be at least 3 characters long");
      return;
    }

    if (tempUsername.length > 20) {
      Alert.alert("Error", "Username cannot be longer than 20 characters");
      return;
    }

    const usernameRegex = /^[a-zA-Z0-9_-]+$/;
    if (!usernameRegex.test(tempUsername)) {
      Alert.alert(
        "Error",
        "Username can only contain letters, numbers, hyphens, and underscores"
      );
      return;
    }

    setIsProcessing(true);
    try {
      await FirebaseService.updateUsername(tempUsername.trim());
      await refreshUserProfile();
      setShowUsernameEdit(false);
      Alert.alert("Success", "Username updated successfully!");
    } catch (error: any) {
      if (error.message?.includes("already exists")) {
        const suggestions = await generateUsernameSuggestions(
          tempUsername.trim()
        );
        Alert.alert(
          "Username Taken",
          `"${tempUsername}" is already taken. Try one of these:\n\n${suggestions.join(
            "\n"
          )}`,
          [
            { text: "Try Again", style: "cancel" },
            {
              text: "Use First Suggestion",
              onPress: () => {
                setTempUsername(suggestions[0]);
              },
            },
          ]
        );
      } else {
        Alert.alert("Error", error.message || "Failed to update username");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password: string) => {
    return password.length >= 6;
  };

  const handleEmailChange = (email: string) => {
    setTempEmail(email);
    setIsEmailValid(validateEmail(email));
  };

  const handlePasswordChange = (password: string) => {
    setTempPassword(password);
    setIsPasswordValid(validatePassword(password));
  };

  const isContinueButtonEnabled =
    isEmailValid && isPasswordValid && !isProcessing;

  const generateUsernameSuggestions = async (
    baseUsername: string
  ): Promise<string[]> => {
    const suggestions = [
      `${baseUsername}_${Math.floor(Math.random() * 999) + 1}`,
      `${baseUsername}${new Date().getFullYear()}`,
      `${baseUsername}_believer`,
      `faithful_${baseUsername}`,
      `${baseUsername}_seeker`,
    ];
    return suggestions;
  };

  const handleEmailEdit = () => {
    if (!user) return;
    setTempEmail(user.email || "");
    setTempPassword("");
    setIsEmailValid(false);
    setIsPasswordValid(false);
    setShowPassword(false);
    setShowEmailEdit(true);
  };

  // ✅ CORREGIDO: handleSaveEmail con refresh mejorado para iOS
  const handleSaveEmail = async () => {
    if (!isEmailValid) {
      Alert.alert("Invalid Email", "Please enter a valid email address.");
      return;
    }

    if (!isPasswordValid) {
      Alert.alert(
        "Invalid Password",
        "Password must be at least 6 characters long."
      );
      return;
    }

    setIsProcessing(true);
    try {
      const result = await FirebaseService.connectWithEmail(
        tempEmail,
        tempPassword
      );

      // ✅ NUEVO: Cerrar modal inmediatamente
      setShowEmailEdit(false);
      
      // ✅ NUEVO: Mensaje de éxito apropiado
      if (result.type === "linked") {
        Alert.alert(
          "Success",
          "🎉 Your progress is now saved! You can access it from any device.",
          [
            {
              text: "OK",
            }
          ]
        );
      } else {
        Alert.alert(
          "Welcome Back",
          "👋 Your account has been restored with all your saved progress!",
          [
            {
              text: "OK", 
            }
          ]
        );
      }

    } catch (error: any) {
      if (
        error.message?.includes("wrong-password") ||
        error.message?.includes("user-not-found")
      ) {
        Alert.alert(
          "Login Failed",
          "Incorrect email or password. Please try again."
        );
      } else {
        Alert.alert(
          "Connection Failed",
          error.message || "Unable to connect email. Please try again."
        );
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // ✅ Cleanup del timeout
  useEffect(() => {
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, []);

  const handleSignOut = async () => {
    Alert.alert(
      "Sign Out",
      "⚠️ This will sign you out and clear ALL your local data. You will start fresh with a new anonymous account.\n\nThis cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out & Clear All",
          style: "destructive",
          onPress: async () => {
            setIsProcessing(true);
            try {
              // ✅ PASO 1: Limpiar estado local del componente
              clearLocalState();
              
              // ✅ PASO 2: Cerrar sesión en Firebase y AsyncStorage
              await FirebaseService.signOutAndClearAll();
              
              // ✅ PASO 3: Limpiar estado del hook useAuth
              if (clearUserData) {
                await clearUserData();
              }
              
              // ✅ PASO 4: Actualizar perfil para mostrar nuevo usuario anónimo
              await new Promise(resolve => setTimeout(resolve, 300));
              await refreshUserProfile();
              
              Alert.alert("Success", "Signed out successfully. All local data cleared.");
              
            } catch (error: any) {
              console.error("❌ Error en sign out:", error);
              Alert.alert("Error", error.message || "Sign out failed");
            } finally {
              setIsProcessing(false);
            }
          },
        },
      ]
    );
  };

  const handleReligiousInfoEdit = () => {
    if (!user) return;
    setTempCreed(user.creed || "");
    setTempDenomination(user.denomination || "");
    setShowReligiousInfo(true);
  };

  // ✅ NUEVO: Función para cancelar y reiniciar estado
  const handleCancelReligiousInfo = () => {
    // Reiniciar a los valores originales del usuario
    setTempCreed(user?.creed || "");
    setTempDenomination(user?.denomination || "");
    setShowReligiousInfo(false);
  };

  // ✅ MODIFICADO: handleSaveReligiousInfo con validación mejorada
  const handleSaveReligiousInfo = async () => {
    if (!isSaveEnabled) {
      Alert.alert("Error", "Please select both Creed and Denomination");
      return;
    }

    setIsProcessing(true);
    try {
      await FirebaseService.updateReligiousInfo(tempCreed, tempDenomination);
      await refreshUserProfile();
      setShowReligiousInfo(false);
      Alert.alert("Success", "Religious information updated successfully!");
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to update information");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAvatarChange = async (index: number) => {
    setIsProcessing(true);
    try {
      await FirebaseService.updateAvatar(index);
      await refreshUserProfile();
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to update avatar");
    } finally {
      setIsProcessing(false);
    }
  };

  const clearLocalState = () => {
    console.log("🧹 Limpiando estado local del componente...");

    // Limpiar todos los estados de formularios
    setTempUsername("");
    setTempEmail("");
    setTempPassword("");
    setTempCreed("");
    setTempDenomination("");

    // Limpiar estados de validación
    setIsEmailValid(false);
    setIsPasswordValid(false);
    setShowPassword(false);

    // Limpiar estados de modales
    setShowUsernameEdit(false);
    setShowEmailEdit(false);
    setShowReligiousInfo(false);

    // Limpiar estados de carga
    setStatsLoaded(false);
    setIsProcessing(false);
    
    // ✅ NUEVO: Limpiar refs
    lastProcessedUID.current = "";

    console.log("✅ Estado local limpiado");
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Error loading profile</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Avatar and Username Section */}
      <View style={styles.avatarSection}>
        <View style={styles.avatarGrid}>
          {AVATAR_IMAGES.map((emoji, index) => (
            <Pressable
              key={index}
              style={[
                styles.avatarOption,
                user.avatar === index && styles.selectedAvatar,
                isProcessing && styles.disabledOption,
              ]}
              onPress={() => !isProcessing && handleAvatarChange(index)}
              disabled={isProcessing}
            >
              <Text style={styles.avatarEmoji}>{emoji}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.username}>{user.username}</Text>
        <View style={styles.userStatusContainer}>
          {user.isAnonymous && (
            <Text style={styles.anonymousText}>📱 Anonymous User</Text>
          )}
          {user.linkedWithEmail && (
            <Text style={styles.linkedText}>📧 Email Linked</Text>
          )}
          {user.linkedWithGoogle && (
            <Text style={styles.linkedText}>🌐 Google Linked</Text>
          )}
        </View>
        <Pressable
          style={[
            styles.editButton,
            (isProcessing || user.isAnonymous) && styles.disabledButton,
          ]}
          onPress={handleUsernameEdit}
          disabled={isProcessing || user.isAnonymous}
        >
          <Text style={styles.editButtonText}>
            {user.isAnonymous ? "🔒 Connect Email to Edit" : "✏️ Edit Name"}
          </Text>
        </Pressable>
      </View>

      {/* Account Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📧 Account</Text>
        <Text style={styles.emailText}>{user.email || "No email linked"}</Text>

        {!user.linkedWithEmail && !user.linkedWithGoogle ? (
          <View style={styles.buttonGroup}>
            <Pressable
              style={[styles.linkButton, isProcessing && styles.disabledButton]}
              onPress={handleEmailEdit}
              disabled={isProcessing}
            >
              <Text style={styles.linkButtonText}>
                📧 Connect Email / Restore Account
              </Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.buttonGroup}>
            <Pressable
              style={[
                styles.signOutButton,
                isProcessing && styles.disabledButton,
              ]}
              onPress={handleSignOut}
              disabled={isProcessing}
            >
              <Text style={styles.signOutButtonText}>🚪 Sign Out</Text>
            </Pressable>
          </View>
        )}
      </View>

      {/* Religious Information */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>⛪ Religious Information</Text>
          <Pressable
            style={[
              styles.editIconButton,
              isProcessing && styles.disabledButton,
            ]}
            onPress={handleReligiousInfoEdit}
            disabled={isProcessing}
          >
            <Text style={styles.editIcon}>✏️</Text>
          </Pressable>
        </View>
        <Text style={styles.infoText}>
          Creed: {user.creed || "Not specified"}
        </Text>
        <Text style={styles.infoText}>
          Denomination: {user.denomination || "Not specified"}
        </Text>
      </View>

      {/* Progress Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📊 My Progress</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{user.gamesPlayed}</Text>
            <Text style={styles.statLabel}>Games</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{user.averageScore}%</Text>
            <Text style={styles.statLabel}>Average</Text>
          </View>
        </View>
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{user.currentStreak}</Text>
            <Text style={styles.statLabel}>Current Streak</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{user.bestStreak}</Text>
            <Text style={styles.statLabel}>Best Streak</Text>
          </View>
        </View>
        <Pressable style={styles.detailsButton}>
          <Text style={styles.detailsButtonText}>📈 View Detailed Stats</Text>
        </Pressable>
      </View>

      {/* Username Edit Modal */}
      <Modal visible={showUsernameEdit} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Edit Username</Text>

            <Text style={styles.subHelpText}>
              3-20 characters • Letters, numbers, - and _ only
            </Text>

            <TextInput
              style={styles.textInput}
              value={tempUsername}
              onChangeText={setTempUsername}
              placeholder="Enter username"
              maxLength={20}
              editable={!isProcessing}
              autoCapitalize="none"
            />
            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowUsernameEdit(false)}
                disabled={isProcessing}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.modalButton,
                  styles.saveButton,
                  isProcessing && styles.disabledButton,
                ]}
                onPress={handleSaveUsername}
                disabled={isProcessing}
              >
                <Text style={styles.saveButtonText}>
                  {isProcessing ? "Saving..." : "Save"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Email Modal */}
      <Modal visible={showEmailEdit} transparent animationType="slide">
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? -250 : -250}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback onPress={() => {}}>
                <View
                  style={[
                    styles.modal,
                    keyboardVisible && styles.modalKeyboardOpen,
                  ]}
                >
                  <Text style={styles.modalTitle}>
                    Connect Email / Restore Account
                  </Text>

                  <Text style={styles.helpText}>
                    💾 Save your progress and sync across devices.{"\n"}
                    📧 Already have an account? Just enter your email to restore
                    your data.
                  </Text>

                  <Text style={styles.subHelpText}>
                    New users: Your current progress will be saved{"\n"}
                    Existing users: Your saved data will be restored
                  </Text>

                  <TextInput
                    style={[
                      styles.textInput,
                      tempEmail &&
                        (isEmailValid
                          ? styles.validInput
                          : styles.invalidInput),
                    ]}
                    value={tempEmail}
                    onChangeText={handleEmailChange}
                    placeholder="Enter email address"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    editable={!isProcessing}
                    returnKeyType="next"
                    onSubmitEditing={() => passwordInputRef.current?.focus()}
                  />

                  <View style={styles.passwordContainer}>
                    <TextInput
                      ref={passwordInputRef}
                      style={[
                        styles.passwordInput,
                        tempPassword &&
                          (isPasswordValid
                            ? styles.validInput
                            : styles.invalidInput),
                      ]}
                      value={tempPassword}
                      onChangeText={handlePasswordChange}
                      placeholder="Enter password (min 6 characters)"
                      secureTextEntry={!showPassword}
                      editable={!isProcessing}
                      returnKeyType="done"
                      onSubmitEditing={handleSaveEmail}
                    />
                    <Pressable
                      style={styles.eyeButton}
                      onPress={() => setShowPassword(!showPassword)}
                    >
                      <Text style={styles.eyeIcon}>
                        {showPassword ? "🙈" : "👁️"}
                      </Text>
                    </Pressable>
                  </View>

                  <View
                    style={[
                      styles.modalButtons,
                      keyboardVisible && styles.modalButtonsKeyboardOpen,
                    ]}
                  >
                    <Pressable
                      style={[styles.modalButton, styles.cancelButton]}
                      onPress={() => setShowEmailEdit(false)}
                      disabled={isProcessing}
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </Pressable>
                    <Pressable
                      style={[
                        styles.modalButton,
                        isContinueButtonEnabled
                          ? styles.saveButton
                          : styles.disabledSaveButton,
                      ]}
                      onPress={handleSaveEmail}
                      disabled={!isContinueButtonEnabled}
                    >
                      <Text
                        style={[
                          styles.saveButtonText,
                          !isContinueButtonEnabled && styles.disabledButtonText,
                        ]}
                      >
                        {isProcessing ? "Connecting..." : "Continue"}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      {/* Religious Info Modal */}
      <Modal visible={showReligiousInfo} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.religiousModal}>
            <Text style={styles.modalTitle}>Religious Information</Text>

            <ScrollView
              style={styles.religiousContent}
              showsVerticalScrollIndicator={true}
              bounces={false}
              contentContainerStyle={{ paddingBottom: 20 }}
            >
              <Text style={styles.label}>
                Creed: <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.pickerContainer}>
                {CREEDS.map((creed) => (
                  <Pressable
                    key={creed}
                    style={[
                      styles.pickerOption,
                      tempCreed === creed && styles.selectedOption,
                      isProcessing && styles.disabledOption,
                    ]}
                    onPress={() =>
                      !isProcessing &&
                      setTempCreed(creed === "Select..." ? "" : creed)
                    }
                    disabled={isProcessing}
                  >
                    <Text
                      style={[
                        styles.pickerText,
                        tempCreed === creed && styles.selectedText,
                      ]}
                    >
                      {creed}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.label}>
                Denomination: <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.pickerContainer}>
                {DENOMINATIONS.map((denomination) => (
                  <Pressable
                    key={denomination}
                    style={[
                      styles.pickerOption,
                      tempDenomination === denomination &&
                        styles.selectedOption,
                      isProcessing && styles.disabledOption,
                    ]}
                    onPress={() =>
                      !isProcessing &&
                      setTempDenomination(
                        denomination === "Select..." ? "" : denomination
                      )
                    }
                    disabled={isProcessing}
                  >
                    <Text
                      style={[
                        styles.pickerText,
                        tempDenomination === denomination &&
                          styles.selectedText,
                      ]}
                    >
                      {denomination}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>

            {/* ✅ MODIFICADO: Botones con validación mejorada */}
            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalButton, styles.cancelButton]}
                onPress={handleCancelReligiousInfo}
                disabled={isProcessing}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.modalButton,
                  isSaveEnabled ? styles.saveButton : styles.disabledSaveButton,
                  isProcessing && styles.disabledButton,
                ]}
                onPress={handleSaveReligiousInfo}
                disabled={!isSaveEnabled || isProcessing}
              >
                <Text
                  style={[
                    styles.saveButtonText,
                    (!isSaveEnabled || isProcessing) && styles.disabledButtonText,
                  ]}
                >
                  {isProcessing ? "Saving..." : "Save"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 18,
    color: "#666",
  },
  avatarSection: {
    alignItems: "center",
    backgroundColor: "#fff",
    paddingVertical: 30,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  avatarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    marginBottom: 20,
  },
  avatarOption: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
    margin: 8,
    borderWidth: 2,
    borderColor: "transparent",
  },
  selectedAvatar: {
    borderColor: "#2D4B8E",
    backgroundColor: "#e6f2ff",
  },
  disabledOption: {
    opacity: 0.5,
  },
  avatarEmoji: {
    fontSize: 24,
  },
  username: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 10,
  },
  userStatusContainer: {
    alignItems: "center",
    marginBottom: 10,
  },
  anonymousText: {
    fontSize: 14,
    color: "#888",
    marginBottom: 4,
  },
  linkedText: {
    fontSize: 14,
    color: "#2D4B8E",
    marginBottom: 4,
  },
  editButton: {
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  editButtonText: {
    color: "#2D4B8E",
    fontSize: 16,
  },
  disabledButton: {
    opacity: 0.5,
  },
  required: {
    color: "#ff6b6b",
    fontSize: 16,
  },
  disabledSaveButton: {
    backgroundColor: "#ccc",
  },
  disabledButtonText: {
    color: "#999",
  },
  section: {
    backgroundColor: "#fff",
    margin: 15,
    padding: 20,
    borderRadius: 15,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#2D4B8E",
    marginBottom: 15,
  },
  editIconButton: {
    padding: 5,
  },
  editIcon: {
    fontSize: 18,
  },
  emailText: {
    fontSize: 16,
    color: "#333",
    marginBottom: 15,
  },
  buttonGroup: {
    gap: 10,
  },
  linkButton: {
    backgroundColor: "#2D4B8E",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: "center",
  },
  linkButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  signOutButton: {
    backgroundColor: "#ff6b6b",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: "center",
  },
  signOutButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  infoText: {
    fontSize: 16,
    color: "#333",
    marginBottom: 8,
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 15,
  },
  statItem: {
    alignItems: "center",
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#2D4B8E",
  },
  statLabel: {
    fontSize: 14,
    color: "#666",
    marginTop: 5,
  },
  detailsButton: {
    backgroundColor: "#f0f0f0",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: "center",
  },
  detailsButtonText: {
    color: "#2D4B8E",
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: -60,
  },
  modal: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 25,
    width: "100%",
    maxWidth: 400,
    maxHeight: "60%",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalKeyboardOpen: {
    paddingBottom: 10,
    maxHeight: "65%",
    marginTop: Platform.OS === "ios" ? -180 : -100,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 20,
    textAlign: "center",
  },
  helpText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 15,
    lineHeight: 20,
  },
  subHelpText: {
    fontSize: 12,
    color: "#999",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 16,
    fontStyle: "italic",
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    marginBottom: 20,
    minHeight: 50,
  },
  passwordContainer: {
    position: "relative",
    marginBottom: 20,
  },
  passwordInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 15,
    paddingRight: 50,
    fontSize: 16,
    minHeight: 50,
  },
  eyeButton: {
    position: "absolute",
    right: 15,
    top: 10,
    padding: 5,
  },
  eyeIcon: {
    fontSize: 20,
  },
  validInput: {
    borderColor: "#28a745",
    backgroundColor: "#f8fff9",
  },
  invalidInput: {
    borderColor: "#dc3545",
    backgroundColor: "#fff8f8",
  },
  label: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 10,
    marginTop: 15,
  },
  pickerContainer: {
    marginBottom: 15,
  },
  pickerOption: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: "#f0f0f0",
  },
  selectedOption: {
    backgroundColor: "#2D4B8E",
  },
  pickerText: {
    fontSize: 16,
    color: "#333",
  },
  selectedText: {
    color: "#fff",
    fontWeight: "bold",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  modalButtonsKeyboardOpen: {
    marginTop: 10,
    marginBottom: 0,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: "center",
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: "#f0f0f0",
  },
  saveButton: {
    backgroundColor: "#2D4B8E",
  },
  cancelButtonText: {
    color: "#666",
    fontSize: 16,
    fontWeight: "bold",
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  religiousModal: {
    backgroundColor: "#fff",
    borderRadius: 20,
    width: "90%",
    height: "75%",
    padding: 25,
    flexDirection: "column",
  },
  religiousContent: {
    flex: 1,
    marginBottom: 10,
    marginTop: 10,
  },
});
