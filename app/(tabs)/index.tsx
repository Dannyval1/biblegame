import SettingsModal from "@/components/SettingsModal";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Link } from "expo-router";
import React, { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

export default function HomeScreen() {
  const [settingsVisible, setSettingsVisible] = useState(false);

  return (
    <ThemedView style={styles.container}>
      <View style={styles.content}>
        <ThemedText type="title" style={styles.title}>
          Biblia Trivia Game
        </ThemedText>
        <ThemedText style={styles.subtitle}>
          ¡Pon a prueba tu conocimiento bíblico!
        </ThemedText>

        <Link href="/quiz" asChild>
          <Pressable style={styles.button}>
            <ThemedText style={styles.buttonText}>Jugar</ThemedText>
          </Pressable>
        </Link>
        <Link href="/" asChild>
          <Pressable style={styles.button}>
            <ThemedText style={styles.buttonText}>Ranking</ThemedText>
          </Pressable>
        </Link>
        <Link href="/profile" asChild>
          <Pressable style={styles.button}>
            <ThemedText style={styles.buttonText}>Perfil</ThemedText>
          </Pressable>
        </Link>
        <Pressable
          style={styles.button}
          onPress={() => setSettingsVisible(true)}
        >
          <ThemedText style={styles.buttonText}>Configuración</ThemedText>
        </Pressable>

        <View style={styles.statsContainer}>
          <ThemedText style={styles.statsText}>
            📖 Preguntas del Antiguo y Nuevo Testamento
          </ThemedText>
          <ThemedText style={styles.statsText}>
            ⏱️ Tiempo por pregunta
          </ThemedText>
          <ThemedText style={styles.statsText}>
            🎯 Múltiples niveles de dificultad
          </ThemedText>
        </View>
      </View>
      <SettingsModal
        visible={settingsVisible}
        onClose={() => setSettingsVisible(false)}
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
    marginBottom: 40,
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
  },
  statsText: {
    fontSize: 16,
    marginBottom: 8,
    color: "#777",
  },
});
