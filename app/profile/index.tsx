// app/profile/index.tsx
import { auth } from "@/config/firebase"; // ✅ Importar auth para verificación
import { useAudioManager } from "@/hooks/useAudioManager";
import { useAuth } from "@/hooks/useAuth";
import FirebaseService from "@/services/firebaseService";

import { CREEDS, DENOMINATIONS, GameStats } from "@/types/Settings";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

const AVATAR_IMAGES = ["👤", "👨", "👩", "🧔", "👱‍♂️", "👱‍♀️", "👨‍🦱", "👩‍🦱"];

export default function ProfileScreen() {
  // ✅ TODOS LOS HOOKS AL PRINCIPIO
  const { user, loading, refreshUserProfile } = useAuth();
  const { updateActiveScreen } = useAudioManager();

  const [showUsernameEdit, setShowUsernameEdit] = useState(false);
  const [showEmailEdit, setShowEmailEdit] = useState(false);
  const [showReligiousInfo, setShowReligiousInfo] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [tempUsername, setTempUsername] = useState("");
  const [tempEmail, setTempEmail] = useState("");
  const [tempPassword, setTempPassword] = useState("");
  const [tempCreed, setTempCreed] = useState("");
  const [tempDenomination, setTempDenomination] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [statsLoaded, setStatsLoaded] = useState(false); // ✅ Evitar cargar stats múltiples veces

  // ✅ ARREGLAR useFocusEffect - agregar dependencias
  useFocusEffect(
    useCallback(() => {
      updateActiveScreen("profile");
      return () => {};
    }, [updateActiveScreen]) // ✅ Agregar dependencia
  );

  // ✅ ARREGLAR useEffect - agregar condición para evitar ciclo infinito
  useEffect(() => {
    // ✅ Solo cargar stats si el usuario está autenticado en Firebase Auth
    if (user && !statsLoaded && !loading && user.uid) {
      // ✅ Verificar que Firebase Auth esté sincronizado
      const currentUser = auth.currentUser;
      if (currentUser && currentUser.uid === user.uid) {
        loadGameStats();
      } else {
        console.log("⏳ Esperando sincronización con Firebase Auth...");
        // ✅ Intentar de nuevo en un momento
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
  }, [user, statsLoaded, loading]); // ✅ Dependencias específicas

  const loadGameStats = async () => {
    if (!user || statsLoaded) return; // ✅ Prevenir múltiples cargas

    // ✅ Verificar que Firebase Auth esté sincronizado antes de proceder
    const currentUser = auth.currentUser;
    if (!currentUser || currentUser.uid !== user.uid) {
      console.log(
        "⏳ Firebase Auth no sincronizado aún, saltando carga de stats"
      );
      return;
    }

    try {
      console.log("📊 Cargando estadísticas de juego...");
      setStatsLoaded(true); // ✅ Marcar como cargado ANTES de la operación async

      const savedStats = await AsyncStorage.getItem("gameStats");
      if (savedStats) {
        const stats: GameStats = JSON.parse(savedStats);

        // ✅ Verificar de nuevo antes de la operación Firebase
        const authCheck = auth.currentUser;
        if (!authCheck || authCheck.uid !== user.uid) {
          console.log(
            "⚠️ Usuario cambió durante la carga, cancelando actualización"
          );
          setStatsLoaded(false);
          return;
        }

        // Actualizar estadísticas en Firebase
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

        // ✅ Solo refrescar si realmente hay cambios
        await refreshUserProfile();
        console.log("✅ Estadísticas actualizadas");
      } else {
        console.log("📝 No hay estadísticas guardadas localmente");
      }
    } catch (error:any) {
      console.log(
        "⚠️ No se pudieron cargar las estadísticas:",
        error?.message || error
      );
      setStatsLoaded(false); // ✅ Reset en caso de error
    }
  };

  const handleUsernameEdit = () => {
    if (!user) return;
    setTempUsername(user.username);
    setShowUsernameEdit(true);
  };

  const handleSaveUsername = async () => {
    if (!tempUsername.trim()) {
      Alert.alert("Error", "Username cannot be empty");
      return;
    }

    setIsProcessing(true);
    try {
      await FirebaseService.updateUsername(tempUsername.trim());
      await refreshUserProfile();
      setShowUsernameEdit(false);
      Alert.alert("Success", "Username updated successfully!");
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to update username");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEmailEdit = () => {
    if (!user) return;
    setTempEmail(user.email || "");
    setTempPassword("");
    setAuthMode(user.email ? "login" : "register");
    setShowEmailEdit(true);
  };

  const handleSaveEmail = async () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!tempEmail || !emailRegex.test(tempEmail)) {
      Alert.alert("Invalid Email", "Please enter a valid email address.");
      return;
    }

    if (!tempPassword) {
      Alert.alert("Error", "Password is required");
      return;
    }

    setIsProcessing(true);
    try {
      if (authMode === "register") {
        await FirebaseService.registerWithEmail(tempEmail, tempPassword);
        Alert.alert("Success", "Account linked successfully!");
      } else {
        await FirebaseService.signInWithEmail(tempEmail, tempPassword);
        Alert.alert("Success", "Signed in successfully!");
      }

      await refreshUserProfile();
      setShowEmailEdit(false);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Authentication failed");
    } finally {
      setIsProcessing(false);
    }
  };

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
              // ✅ Opción B: Limpiar TODO
              await FirebaseService.signOutAndClearAll();
              setStatsLoaded(false);
              await refreshUserProfile();
              Alert.alert(
                "Success",
                "Signed out successfully. All local data cleared."
              );
            } catch (error: any) {
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
    setTempCreed(user.creed);
    setTempDenomination(user.denomination);
    setShowReligiousInfo(true);
  };

  const handleSaveReligiousInfo = async () => {
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

  // ✅ RETURN CONDICIONAL AL FINAL
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
          style={[styles.editButton, isProcessing && styles.disabledButton]}
          onPress={handleUsernameEdit}
          disabled={isProcessing}
        >
          <Text style={styles.editButtonText}>✏️ Edit Name</Text>
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
              <Text style={styles.linkButtonText}>📧 Connect with Email</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.buttonGroup}>
            {user.linkedWithEmail && (
              <Pressable
                style={[
                  styles.linkButton,
                  isProcessing && styles.disabledButton,
                ]}
                onPress={handleEmailEdit}
                disabled={isProcessing}
              >
                <Text style={styles.linkButtonText}>🔄 Change Email</Text>
              </Pressable>
            )}
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
            <TextInput
              style={styles.textInput}
              value={tempUsername}
              onChangeText={setTempUsername}
              placeholder="Enter username"
              maxLength={20}
              editable={!isProcessing}
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

      {/* Email/Auth Modal */}
      <Modal visible={showEmailEdit} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>
              {user?.linkedWithEmail
                ? "Sign In"
                : authMode === "register"
                ? "Link Account"
                : "Sign In"}
            </Text>

            {!user?.linkedWithEmail && (
              <View style={styles.authModeToggle}>
                <Pressable
                  style={[
                    styles.toggleButton,
                    authMode === "register" && styles.activeToggle,
                  ]}
                  onPress={() => setAuthMode("register")}
                >
                  <Text
                    style={[
                      styles.toggleText,
                      authMode === "register" && styles.activeToggleText,
                    ]}
                  >
                    Link Account
                  </Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.toggleButton,
                    authMode === "login" && styles.activeToggle,
                  ]}
                  onPress={() => setAuthMode("login")}
                >
                  <Text
                    style={[
                      styles.toggleText,
                      authMode === "login" && styles.activeToggleText,
                    ]}
                  >
                    Sign In
                  </Text>
                </Pressable>
              </View>
            )}

            <TextInput
              style={styles.textInput}
              value={tempEmail}
              onChangeText={setTempEmail}
              placeholder="Enter email address"
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!isProcessing}
            />
            <TextInput
              style={styles.textInput}
              value={tempPassword}
              onChangeText={setTempPassword}
              placeholder="Enter password"
              secureTextEntry
              editable={!isProcessing}
            />
            <View style={styles.modalButtons}>
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
                  styles.saveButton,
                  isProcessing && styles.disabledButton,
                ]}
                onPress={handleSaveEmail}
                disabled={isProcessing}
              >
                <Text style={styles.saveButtonText}>
                  {isProcessing
                    ? "Processing..."
                    : authMode === "register"
                    ? "Link"
                    : "Sign In"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
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
              <Text style={styles.label}>Creed:</Text>
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

              <Text style={styles.label}>Denomination:</Text>
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

            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowReligiousInfo(false)}
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
                onPress={handleSaveReligiousInfo}
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
  googleButton: {
    backgroundColor: "#db4437",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: "center",
  },
  googleButtonText: {
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
  },
  modal: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 25,
    width: "90%",
    maxHeight: "80%",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 20,
    textAlign: "center",
  },
  authModeToggle: {
    flexDirection: "row",
    marginBottom: 20,
    backgroundColor: "#f0f0f0",
    borderRadius: 10,
    padding: 4,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 6,
  },
  activeToggle: {
    backgroundColor: "#2D4B8E",
  },
  toggleText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "bold",
  },
  activeToggleText: {
    color: "#fff",
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    marginBottom: 20,
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
