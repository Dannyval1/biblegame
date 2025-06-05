import AsyncStorage from "@react-native-async-storage/async-storage";
import { Audio } from "expo-av";
import { useEffect, useRef, useState } from "react";

export const useAudioManager = () => {
  const [activeScreen, setActiveScreen] = useState<
    "home" | "profile" | "settings" | "game" | null
  >(null);

  const [soundEffectsEnabled, setSoundEffectsEnabled] = useState(true);
  const [audioReady, setAudioReady] = useState(false);

  // Referencias para los sonidos
  const correctAnswerSound = useRef<Audio.Sound | null>(null);
  const streakSound = useRef<Audio.Sound | null>(null);
  const wrongSound = useRef<Audio.Sound | null>(null);
  const timerSound = useRef<Audio.Sound | null>(null);
  const finalTimerSound = useRef<Audio.Sound | null>(null);

  // Estado para controlar el cronómetro
  const [isTimerPlaying, setIsTimerPlaying] = useState(false);
  const [isFinalTimer, setIsFinalTimer] = useState(false);

  // ✅ Nueva referencia para rastrear si estamos desmontando
  const isUnmounting = useRef(false);

  const updateActiveScreen = (
    screen: "home" | "profile" | "settings" | "game"
  ) => {
    console.log(`🔄 Pantalla activa actualizada a: ${screen}`);
    setActiveScreen(screen);

    if (screen === "game") {
      console.log("🎮 Pantalla game: Modo juego activado");
    } else {
      console.log(`🏠 Pantalla ${screen}: Fuera del modo juego`);
      stopGameTimerSounds();
    }
  };

  useEffect(() => {
    initializeAudio();

    return () => {
      // ✅ Marcar que estamos desmontando
      isUnmounting.current = true;

      // Limpiar al desmontar
      stopGameTimerSounds();
      unloadAllSounds();
    };
  }, []);

  const initializeAudio = async () => {
    try {
      // Configuración de audio para permitir múltiples sonidos
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: false,
        interruptionModeIOS: 1, // Audio.INTERRUPTION_MODE_IOS_MIX_WITH_OTHERS
        interruptionModeAndroid: 1, // Audio.INTERRUPTION_MODE_ANDROID_DO_NOT_MIX
      });

      await loadAudioSettings();
      await loadSounds();
    } catch (error) {
      console.error("❌ Error inicializando audio:", error);
    }
  };

  const loadAudioSettings = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem("gameSettings");
      if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        setSoundEffectsEnabled(settings.soundEffects ?? true);
      } else {
        setSoundEffectsEnabled(true);
      }
    } catch (error) {
      console.error("❌ Error cargando configuraciones de audio:", error);
    }
  };

  const loadSounds = async () => {
    try {
      console.log("🎼 === CARGANDO SONIDOS ===");

      // Cargar efectos de sonido
      await loadSound(
        correctAnswerSound,
        require("../assets/audio/sfx/correct_answer.wav")
      );
      await loadSound(
        streakSound,
        require("../assets/audio/sfx/correct_chime.mp3")
      );
      await loadSound(
        wrongSound,
        require("../assets/audio/sfx/wrong_buzzer_1.mp3")
      );

      // Cargar sonidos de cronómetro
      await loadSound(
        timerSound,
        require("../assets/audio/sfx/cronometro.wav")
      );
      await loadSound(
        finalTimerSound,
        require("../assets/audio/sfx/final_sound_timer.mp3")
      );

      setAudioReady(true);
      console.log("🎉 Sonidos cargados correctamente");
    } catch (error) {
      console.error("❌ Error cargando sonidos:", error);
    }
  };

  const loadSound = async (
    soundRef: React.MutableRefObject<Audio.Sound | null>,
    source: any
  ) => {
    try {
      const { sound } = await Audio.Sound.createAsync(
        source,
        { shouldPlay: false },
        null,
        true // mixWithOthers
      );
      soundRef.current = sound;
    } catch (error) {
      console.error(`❌ Error cargando sonido: ${source}`, error);
    }
  };

  // ✅ FUNCIÓN MEJORADA PARA DETENER SONIDOS DE CRONÓMETRO
  const stopGameTimerSounds = async () => {
    if (isUnmounting.current) return;

    console.log("🔇 Deteniendo cronómetro...");

    try {
      // Detener cronómetro normal con verificación de estado
      if (timerSound.current) {
        try {
          const status = await timerSound.current.getStatusAsync();
          if (status.isLoaded && status.isPlaying) {
            await timerSound.current.stopAsync();
          }
        } catch (error) {
          console.warn("⚠️ Advertencia al detener cronómetro normal:", error);
        }
      }

      // Detener sonido final con verificación de estado
      if (finalTimerSound.current) {
        try {
          const status = await finalTimerSound.current.getStatusAsync();
          if (status.isLoaded && status.isPlaying) {
            await finalTimerSound.current.stopAsync();
          }
        } catch (error) {
          console.warn("⚠️ Advertencia al detener cronómetro final:", error);
        }
      }

      setIsTimerPlaying(false);
      setIsFinalTimer(false);
    } catch (error) {
      console.error("❌ Error general deteniendo cronómetro:", error);
    }
  };

  // ✅ FUNCIÓN MEJORADA PARA CAMBIAR A TIMER FINAL
  const switchToFinalTimer = async () => {
    if (!soundEffectsEnabled) return;

    console.log("⚠️ Cambiando a sonido final...");

    try {
      // Detener cronómetro normal con manejo seguro
      if (timerSound.current) {
        try {
          const status = await timerSound.current.getStatusAsync();
          if (status.isLoaded && status.isPlaying) {
            await timerSound.current.stopAsync();
          }
        } catch (error) {
          console.warn(
            "⚠️ Advertencia al detener cronómetro para cambio:",
            error
          );
        }
      }

      // Iniciar sonido final
      if (finalTimerSound.current) {
        try {
          await finalTimerSound.current.setPositionAsync(0);
          await finalTimerSound.current.setIsLoopingAsync(true);
          await finalTimerSound.current.setVolumeAsync(0.6);
          await finalTimerSound.current.playAsync();
          setIsTimerPlaying(true);
          setIsFinalTimer(true);
        } catch (error) {
          console.error("❌ Error iniciando sonido final:", error);
        }
      }
    } catch (error) {
      console.error("❌ Error general cambiando a sonido final:", error);
    }
  };

  // ✅ FUNCIÓN MEJORADA PARA INICIAR CRONÓMETRO
  const startGameTimerSound = async () => {
    if (!soundEffectsEnabled) return;

    console.log("⏰ Iniciando cronómetro...");

    try {
      // Detener sonido final si está sonando
      if (finalTimerSound.current) {
        try {
          const status = await finalTimerSound.current.getStatusAsync();
          if (status.isLoaded && status.isPlaying) {
            await finalTimerSound.current.stopAsync();
          }
        } catch (error) {
          console.warn(
            "⚠️ Advertencia al detener sonido final para inicio:",
            error
          );
        }
      }

      // Iniciar cronómetro normal
      if (timerSound.current) {
        try {
          await timerSound.current.setPositionAsync(0);
          await timerSound.current.setIsLoopingAsync(true);
          await timerSound.current.setVolumeAsync(0.4);
          await timerSound.current.playAsync();
          setIsTimerPlaying(true);
          setIsFinalTimer(false);
        } catch (error) {
          console.error("❌ Error iniciando cronómetro:", error);
        }
      }
    } catch (error) {
      console.error("❌ Error general iniciando cronómetro:", error);
    }
  };

  // ✅ FUNCIÓN MEJORADA PARA EFECTOS DE SONIDO
  const playSoundEffect = async (
    soundRef: React.MutableRefObject<Audio.Sound | null>
  ) => {
    if (!soundEffectsEnabled || !soundRef.current) return;

    try {
      // Verificar estado antes de reproducir
      const status = await soundRef.current.getStatusAsync();
      if (status.isLoaded) {
        // Usar replayAsync en lugar de playAsync para evitar errores
        await soundRef.current.replayAsync();
      }
    } catch (error) {
      console.warn("⚠️ Advertencia reproduciendo efecto:", error);
    }
  };

  const playCheckedAnswer = () => playSoundEffect(correctAnswerSound);
  const playStreakBonus = () => playSoundEffect(streakSound);
  const playWrongPenalty = () => playSoundEffect(wrongSound);

  // Actualizar configuraciones
  const updateSoundEffects = (enabled: boolean) => {
    setSoundEffectsEnabled(enabled);
    if (!enabled) stopGameTimerSounds();
  };

  // ✅ FUNCIÓN MEJORADA PARA DESCARGAR SONIDOS
  const unloadAllSounds = async () => {
    console.log("🔇 Descargando todos los sonidos...");

    const sounds = [
      { name: "correctAnswer", ref: correctAnswerSound },
      { name: "streak", ref: streakSound },
      { name: "wrong", ref: wrongSound },
      { name: "timer", ref: timerSound },
      { name: "finalTimer", ref: finalTimerSound },
    ];

    for (const { name, ref } of sounds) {
      if (ref.current) {
        try {
          // Verificar estado antes de descargar
          const status = await ref.current.getStatusAsync();
          if (status.isLoaded) {
            await ref.current.stopAsync();
            await ref.current.unloadAsync();
          }
          ref.current = null;
          console.log(`✅ Sonido ${name} descargado`);
        } catch (error: any) {
          // Manejar error específico "Seeking interrupted"
          if (error.message.includes("Seeking interrupted")) {
            console.warn(`⚠️ Descarga interrumpida para ${name}, ignorando...`);
          } else {
            console.warn(`⚠️ Error descargando sonido ${name}:`, error);
          }
        }
      }
    }
  };

  return {
    soundEffectsEnabled,
    audioReady,
    playStreakBonus,
    playWrongPenalty,
    playCheckedAnswer,
    updateSoundEffects,
    updateActiveScreen,
    startGameTimerSound,
    switchToFinalTimer,
    stopGameTimerSounds,
    isTimerPlaying,
    isFinalTimer,
  };
};
