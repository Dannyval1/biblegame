import { useAudioManager } from "@/hooks/useAudioManager";
import { useFocusEffect } from "@react-navigation/native";
import { Platform } from "react-native";

import GameModeModal, { GameMode } from "@/components/GameModeModal";
import SettingsModal from "@/components/SettingsModal";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useAuth } from "@/hooks/useAuth";
import { router } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

export default function HomeScreen() {
  // 🔧 Ref para controlar el log (solo una vez)
  const hasLoggedMount = useRef(false);

  // ✅ TODOS LOS HOOKS AL PRINCIPIO
  const { updateActiveScreen } = useAudioManager();
  const { user } = useAuth(); // ✅ Obtener user para mostrar bienvenida
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [gameModeVisible, setGameModeVisible] = useState(false);

  // 🔧 Log optimizado - solo al montar el componente
  React.useEffect(() => {
    if (__DEV__ && !hasLoggedMount.current) {
      console.log(`🏠 HomeScreen montado en ${Platform.OS}`);
      if (user) {
        console.log(`👋 Bienvenido de vuelta, ${user.username}!`);
      }
      hasLoggedMount.current = true;
    }
  }, []); // Sin dependencias = solo se ejecuta al montar

  // 🔧 Log cuando el usuario cambia (solo si es relevante)
  React.useEffect(() => {
    if (__DEV__ && user && hasLoggedMount.current) {
      console.log(`👤 Usuario cargado en Home: ${user.username}`);
    }
  }, [user?.username]); // Solo cuando cambia el username

  useFocusEffect(
    useCallback(() => {
      updateActiveScreen("home");
      return () => {};
    }, [updateActiveScreen])
  );

  const handlePlayPress = () => {
    setGameModeVisible(true);
  };

  const handleGameModeSelect = (mode: GameMode) => {
    // Navigate to specific mode screen
    switch (mode) {
      case "challenge":
        router.push("/quiz/challenge");
        break;
      case "timeAttack":
        router.push("/quiz/time-attack");
        break;
      default:
        console.log("Mode not implemented yet:", mode);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.content}>
        <ThemedText type="title" style={styles.title}>
          Bible Trivia Game
        </ThemedText>
        
        {/* 👤 Mostrar bienvenida personalizada si hay usuario */}
        {user && (
          <ThemedText style={styles.welcomeText}>
            Welcome back, {user.username}! 👋
          </ThemedText>
        )}
        
        <ThemedText style={styles.subtitle}>
          Test your biblical knowledge!
        </ThemedText>

        <Pressable style={styles.button} onPress={handlePlayPress}>
          <ThemedText style={styles.buttonText}>Play</ThemedText>
        </Pressable>

        <Pressable style={styles.button} onPress={() => router.push("/ranking")}>
          <ThemedText style={styles.buttonText}>Ranking</ThemedText>
        </Pressable>

        <Pressable
          style={styles.button}
          onPress={() => router.push("/profile")}
        >
          <ThemedText style={styles.buttonText}>Profile</ThemedText>
        </Pressable>

        <Pressable
          style={styles.button}
          onPress={() => setSettingsVisible(true)}
        >
          <ThemedText style={styles.buttonText}>Settings</ThemedText>
        </Pressable>

        <View style={styles.statsContainer}>
          <ThemedText style={styles.statsText}>
            📖 Old & New Testament Questions
          </ThemedText>
          <ThemedText style={styles.statsText}>
            🎮 Multiple Game Modes
          </ThemedText>
          <ThemedText style={styles.statsText}>
            🎯 Multiple Difficulty Levels
          </ThemedText>
        </View>
      </View>

      {/* Settings Modal */}
      <SettingsModal
        visible={settingsVisible}
        onClose={() => setSettingsVisible(false)}
      />

      {/* Game Mode Selection Modal */}
      <GameModeModal
        visible={gameModeVisible}
        onClose={() => setGameModeVisible(false)}
        onSelectMode={handleGameModeSelect}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
  },
  welcomeText: {
    fontSize: 16,
    marginBottom: 10,
    color: "#2D4B8E",
    textAlign: "center",
    fontWeight: "500",
  },
  subtitle: {
    fontSize: 18,
    marginBottom: 40,
    color: "#666",
    textAlign: "center",
  },
  button: {
    backgroundColor: "#2D4B8E",
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 25,
    marginBottom: 15,
    width: 250,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
  },
  statsContainer: {
    alignItems: "center",
    marginTop: 30,
  },
  statsText: {
    fontSize: 16,
    marginBottom: 8,
    color: "#777",
  },
});
