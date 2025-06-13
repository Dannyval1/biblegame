import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { ActivityIndicator, StyleSheet } from "react-native";
import "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useAuth } from "@/hooks/useAuth";
import { useColorScheme } from "@/hooks/useColorScheme";

export default function RootLayout() {
  const colorScheme = useColorScheme();
  
  // 🔐 Auth hook - maneja autenticación global
  const { user, loading, isAuthenticated, initialized } = useAuth();
  
  // 🧹 Cleanup hook - limpieza automática cada 4 horas
  // const { manualCleanup } = useCleanup();
  
  // 📝 Cargar fuentes
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  // 🔧 Para testing en desarrollo
  React.useEffect(() => {
    if (__DEV__) {
      console.log('🏗️ RootLayout cargado');
      console.log('👤 Usuario:', user?.username || 'No autenticado');
      console.log('🔐 Autenticado:', isAuthenticated);
      console.log('⚙️ Inicializado:', initialized);
      console.log('🔤 Fuentes cargadas:', loaded);
    }
  }, [user, isAuthenticated, initialized, loaded]);

  // 🔧 Función de testing para cleanup
  // const handleTestCleanup = async () => {
  //   if (__DEV__) {
  //     console.log('🔧 Testing cleanup desde RootLayout...');
  //     try {
  //       const result:any = await manualCleanup();
  //       console.log('✅ Cleanup result:', result);
  //       alert(`Cleanup completado: ${result.deletedCount} usuarios eliminados`);
  //     } catch (error:any) {
  //       console.error('❌ Cleanup error:', error);
  //       alert(`Error en cleanup: ${error.message}`);
  //     }
  //   }
  // };

  // ⏳ Esperar a que las fuentes se carguen
  if (!loaded) {
    // Async font loading only occurs in development.
    return null;
  }

  // ⏳ Pantalla de carga mientras Firebase se inicializa
  if (loading || !initialized) {
    return (
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <ThemedView style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2D4B8E" />
          <ThemedText style={styles.loadingText}>
            Initializing Firebase...
          </ThemedText>
          {__DEV__ && (
            <ThemedText style={styles.debugText}>
              Loading: {loading ? 'true' : 'false'} | 
              Initialized: {initialized ? 'true' : 'false'}
            </ThemedText>
          )}
        </ThemedView>
        <StatusBar style="auto" />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="quiz"
          options={{
            title: "Biblical Trivia",
            headerTitleAlign: "center",
            headerBackTitle: "Home",
          }}
        />
        <Stack.Screen
          name="profile"
          options={{
            title: "",
            headerTitleAlign: "center",
            headerBackTitle: "Home",
          }}
        />
        <Stack.Screen name="+not-found" />
      </Stack>
      
      {/* 🔧 Botón de testing para desarrollo */}
      {/* {__DEV__ && (
        <View style={styles.debugContainer}>
          <TouchableOpacity 
            style={styles.debugButton}
            onPress={handleTestCleanup}
          >
            <ThemedText style={styles.debugButtonText}>🧹</ThemedText>
          </TouchableOpacity>
        </View>
      )} */}
      
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  debugText: {
    marginTop: 10,
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
  debugContainer: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 1000,
  },
  debugButton: {
    backgroundColor: 'red',
    padding: 8,
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  debugButtonText: {
    color: 'white',
    fontSize: 16,
  },
});