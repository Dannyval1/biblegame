import questionsData from "@/app/data/questions.json";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useAudioManager } from "@/hooks/useAudioManager";
import { useSettings } from "@/hooks/useSettings";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { Alert, Animated, Pressable, StyleSheet, View } from "react-native";

interface Question {
  id: number;
  category: string;
  question: string;
  options: string[];
  correctAnswer: number;
  difficulty: string;
}

interface ShuffledQuestion extends Question {
  shuffledOptions: string[];
  newCorrectAnswer: number;
}

export default function TimeAttackScreen() {
  const {
    playStreakBonus,
    playWrongPenalty,
    playCheckedAnswer,
    updateSoundEffects,
    updateActiveScreen,
    audioReady, // ✅ IMPORTANTE: Necesitamos esto para saber cuándo iniciar el cronómetro
    startGameTimerSound,
    switchToFinalTimer,
    stopGameTimerSounds,
  } = useAudioManager();

  useEffect(() => {
    updateActiveScreen("game");

    return () => {
      updateActiveScreen("home");
      stopGameTimerSounds();
    };
  }, []);

  // Animation refs
  const timeAnimation = useRef(new Animated.Value(0)).current;
  const bonusAnimation = useRef(new Animated.Value(0)).current;

  // Otras refs
  const gameEndedRef = useRef(false);
  const intervalRef = useRef<NodeJS.Timeout | number | null>(null);
  const finalTimerStartedRef = useRef(false);
  const gameTimerStartedRef = useRef(false);

  // Settings y hooks
  const { settings, isLoading: settingsLoading } = useSettings();

  // State variables
  const [questions, setQuestions] = useState<ShuffledQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Game state
  const [timeRemaining, setTimeRemaining] = useState(60);
  const [score, setScore] = useState(0);
  const [points, setPoints] = useState(0);
  const [correctStreak, setCorrectStreak] = useState(0);
  const [gameEnded, setGameEnded] = useState(false);
  const [extensionUsed, setExtensionUsed] = useState(false);
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());

  useEffect(() => {
    if (!settingsLoading) {
      loadQuestions();
    }
  }, [settingsLoading]);

  useEffect(() => {
    if (settings?.soundEffects !== undefined && updateSoundEffects) {
      updateSoundEffects(settings.soundEffects);
    }
  }, [settings?.soundEffects]);

  useEffect(() => {
    if (!isLoading && questions.length > 0) {
      startGameTimer();

      if (audioReady && !gameTimerStartedRef.current) {
        gameTimerStartedRef.current = true;
        startGameTimerSound();
      }
    }
  }, [isLoading, questions, audioReady]);

  // ✅ NUEVO: Efecto para iniciar cronómetro cuando el audio se vuelve disponible
  useEffect(() => {
    if (
      audioReady &&
      !isLoading &&
      questions.length > 0 &&
      !gameTimerStartedRef.current
    ) {
      gameTimerStartedRef.current = true;
      startGameTimerSound();
    }
  }, [audioReady, isLoading, questions]);

  // ✅ CORREGIDO: Efecto para cambio de sonido final
  useEffect(() => {
    if (
      timeRemaining === 8 &&
      !finalTimerStartedRef.current &&
      !gameEnded &&
      audioReady
    ) {
      finalTimerStartedRef.current = true;
      switchToFinalTimer();
    }
  }, [timeRemaining, gameEnded, audioReady]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      stopGameTimerSounds();
    };
  }, []);

  const startGameTimer = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          endGame();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const shuffleQuestionOptions = (question: Question): ShuffledQuestion => {
    const originalCorrectAnswer = question.options[question.correctAnswer];
    const optionsWithIndices = question.options.map((option, index) => ({
      option,
      originalIndex: index,
    }));
    const shuffledOptionsWithIndices = [...optionsWithIndices].sort(
      () => 0.5 - Math.random()
    );
    const shuffledOptions = shuffledOptionsWithIndices.map(
      (item) => item.option
    );
    const newCorrectAnswer = shuffledOptions.findIndex(
      (option) => option === originalCorrectAnswer
    );

    return { ...question, shuffledOptions, newCorrectAnswer };
  };

  const loadQuestions = () => {
    let filteredQuestions = questionsData;

    if (settings.difficulty && settings.difficulty !== "Mixed") {
      filteredQuestions = questionsData.filter(
        (q) => q.difficulty === settings.difficulty
      );
    }

    const shuffled = [...filteredQuestions].sort(() => 0.5 - Math.random());
    const questionsWithShuffledOptions = shuffled.map(shuffleQuestionOptions);

    setQuestions(questionsWithShuffledOptions);
    setCurrentQuestionIndex(0);
    setQuestionStartTime(Date.now());
    setIsLoading(false);
  };

  const calculatePoints = (isCorrect: boolean, responseTime: number) => {
    if (!isCorrect) return 0;

    let points = 100;

    if (correctStreak >= 14) {
      points *= 2.0;
    } else if (correctStreak >= 9) {
      points *= 1.5;
    } else if (correctStreak >= 4) {
      points *= 1.2;
    }

    if (responseTime < 1500) {
      points += 100;
    } else if (responseTime < 3000) {
      points += 50;
    }

    return Math.round(points);
  };

  const showTimeAnimation = (isNegative: boolean = true) => {
    const animationValue = isNegative ? timeAnimation : bonusAnimation;

    animationValue.setValue(0);
    Animated.sequence([
      Animated.timing(animationValue, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(animationValue, {
        toValue: 0,
        duration: 700,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleAnswer = (answerIndex: number) => {
    if (gameEndedRef.current || gameEnded) return;

    const currentTime = Date.now();
    const responseTime = currentTime - questionStartTime;
    const isCorrect =
      answerIndex === questions[currentQuestionIndex]?.newCorrectAnswer;

    setSelectedAnswer(answerIndex);
    setShowResult(true);

    if (isCorrect) {
      setScore(score + 1);
      const newStreak = correctStreak + 1;
      setCorrectStreak(newStreak);

      const earnedPoints = calculatePoints(true, responseTime);
      setPoints(points + earnedPoints);

      if (newStreak % 3 === 0) {
        setTimeRemaining((prev) => {
          const newTime = prev + 5;
          // ✅ CORREGIDO: Si volvemos por encima de 8 segundos, reiniciar cronómetro
          if (newTime > 8 && finalTimerStartedRef.current && audioReady) {
            finalTimerStartedRef.current = false;
            startGameTimerSound();
          }
          return newTime;
        });
        setCorrectStreak(0);
        showTimeAnimation(false);
        playStreakBonus();
      } else {
        playCheckedAnswer();
      }
    } else {
      setCorrectStreak(0);
      setTimeRemaining((prev) => Math.max(0, prev - 3));
      showTimeAnimation(true);
      playWrongPenalty();
    }

    setTimeout(() => {
      if (
        !gameEndedRef.current &&
        currentQuestionIndex + 1 < questions.length
      ) {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
        setSelectedAnswer(null);
        setShowResult(false);
        setQuestionStartTime(Date.now());
      }
    }, 1500);
  };

  const endGame = async () => {
    if (gameEndedRef.current) return;
    gameEndedRef.current = true;
    setGameEnded(true);

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    stopGameTimerSounds();

    const goldEarned = score + 20;
    await awardGold(goldEarned);
    await saveGameStats();

    if (!extensionUsed && timeRemaining <= 0) {
      Alert.alert(
        "⏰ Time's Up!",
        `Score: ${score} questions\nPoints: ${points}\nGold earned: ${goldEarned}\n\nWould you like to continue for 30 more seconds?`,
        [
          { text: "Watch Ad (+30s)", onPress: () => extendWithAd() },
          { text: "Pay 300 Gold (+30s)", onPress: () => extendWithGold() },
          { text: "Finish Game", onPress: () => router.back() },
        ]
      );
    } else {
      Alert.alert(
        "🎯 Game Over!",
        `Final Score: ${score} questions\nTotal Points: ${points}\nGold earned: ${goldEarned}`,
        [
          { text: "Play Again", onPress: () => restartGame() },
          { text: "Back to Menu", onPress: () => router.back() },
        ]
      );
    }
  };

  const extendWithAd = () => {
    console.log("Watching ad for +30 seconds...");
    setExtensionUsed(true);
    setTimeRemaining(30);
    gameEndedRef.current = false;
    setGameEnded(false);
    setSelectedAnswer(null);
    setShowResult(false);
    setQuestionStartTime(Date.now());

    // ✅ CORREGIDO: Reiniciar estado de cronómetro
    finalTimerStartedRef.current = false;
    if (audioReady) {
      startGameTimerSound();
    }

    startGameTimer();
  };

  const extendWithGold = async () => {
    console.log("Spending 300 gold for +30 seconds...");
    setExtensionUsed(true);
    setTimeRemaining(30);
    gameEndedRef.current = false;
    setGameEnded(false);
    setSelectedAnswer(null);
    setShowResult(false);
    setQuestionStartTime(Date.now());

    // ✅ CORREGIDO: Reiniciar estado de cronómetro
    finalTimerStartedRef.current = false;
    if (audioReady) {
      startGameTimerSound();
    }

    startGameTimer();
  };

  const restartGame = () => {
    setScore(0);
    setPoints(0);
    setCorrectStreak(0);
    setTimeRemaining(60);
    setExtensionUsed(false);
    setGameEnded(false);
    gameEndedRef.current = false;
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setQuestionStartTime(Date.now());

    // ✅ CORREGIDO: Reiniciar referencias del cronómetro
    finalTimerStartedRef.current = false;
    gameTimerStartedRef.current = false;

    loadQuestions();
  };

  const awardGold = async (amount: number) => {
    try {
      const currentGold = await AsyncStorage.getItem("userGold");
      const newGold = (currentGold ? parseInt(currentGold) : 0) + amount;
      await AsyncStorage.setItem("userGold", newGold.toString());
    } catch (error) {
      console.error("Error awarding gold:", error);
    }
  };

  const saveGameStats = async () => {
    try {
      const savedStats = await AsyncStorage.getItem("timeAttackStats");
      const currentStats = savedStats
        ? JSON.parse(savedStats)
        : {
            gamesPlayed: 0,
            bestScore: 0,
            bestPoints: 0,
            totalGamesWithExtension: 0,
          };

      const newStats = {
        gamesPlayed: currentStats.gamesPlayed + 1,
        bestScore: Math.max(currentStats.bestScore, score),
        bestPoints: Math.max(currentStats.bestPoints, points),
        totalGamesWithExtension: extensionUsed
          ? currentStats.totalGamesWithExtension + 1
          : currentStats.totalGamesWithExtension,
      };

      await AsyncStorage.setItem("timeAttackStats", JSON.stringify(newStats));
    } catch (error) {
      console.error("Error saving game stats:", error);
    }
  };

  const getButtonStyle = (index: number) => {
    if (!showResult) return styles.optionButton;
    if (index === questions[currentQuestionIndex]?.newCorrectAnswer) {
      return [styles.optionButton, styles.correctAnswer];
    }
    if (
      index === selectedAnswer &&
      index !== questions[currentQuestionIndex]?.newCorrectAnswer
    ) {
      return [styles.optionButton, styles.wrongAnswer];
    }
    return [styles.optionButton, styles.disabledButton];
  };

  const getStreakText = () => {
    if (correctStreak >= 15) return `🔥 INSANE STREAK! x2.0`;
    if (correctStreak >= 10) return `🔥 GREAT STREAK! x1.5`;
    if (correctStreak >= 5) return `🔥 GOOD STREAK! x1.2`;
    if (correctStreak === 2)
      return `🔥 Streak: ${correctStreak}/3 (Next: +5s!)`;
    return `🔥 Streak: ${correctStreak}/3`;
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (settingsLoading || isLoading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ThemedText>Loading questions...</ThemedText>
      </ThemedView>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  if (!currentQuestion) return null;

  return (
    <ThemedView style={styles.container}>
      {/* Game Status */}
      <View style={styles.gameHeader}>
        <ThemedText style={styles.gameTitle}>⚡ Time Attack</ThemedText>
        <ThemedText
          style={[
            styles.timeDisplay,
            timeRemaining <= 10 && styles.criticalTime,
            timeRemaining <= 8 && styles.finalCountdown,
          ]}
        >
          ⏱️ {formatTime(timeRemaining)}
        </ThemedText>
      </View>

      {/* Score & Streak Info */}
      <View style={styles.scoreContainer}>
        <View style={styles.scoreSection}>
          <ThemedText style={styles.scoreLabel}>Score</ThemedText>
          <ThemedText style={styles.scoreValue}>{score}</ThemedText>
        </View>
        <View style={styles.scoreSection}>
          <ThemedText style={styles.scoreLabel}>Points</ThemedText>
          <ThemedText style={styles.scoreValue}>{points}</ThemedText>
        </View>
      </View>

      <View style={styles.streakContainer}>
        <ThemedText style={styles.streakText}>{getStreakText()}</ThemedText>
        {extensionUsed && (
          <ThemedText style={styles.extensionIndicator}>
            ⚠️ Extension Used (+30s)
          </ThemedText>
        )}
      </View>

      {/* Audio Status Indicator - Solo para debugging */}
      {!audioReady && (
        <View style={styles.debugContainer}>
          <ThemedText style={styles.debugText}>🔄 Audio cargando...</ThemedText>
        </View>
      )}

      {/* Question */}
      <ThemedText style={styles.questionNumber}>
        Question {currentQuestionIndex + 1}
      </ThemedText>

      <ThemedText style={styles.category}>
        {currentQuestion.category}
      </ThemedText>

      <View style={styles.questionContainer}>
        <ThemedText style={styles.question}>
          {currentQuestion.question}
        </ThemedText>
      </View>

      {/* Options */}
      <View style={styles.optionsContainer}>
        {currentQuestion.shuffledOptions.map((option, index) => (
          <Pressable
            key={index}
            style={getButtonStyle(index)}
            onPress={() => handleAnswer(index)}
            disabled={showResult || gameEnded}
          >
            <ThemedText style={styles.optionText}>{option}</ThemedText>
          </Pressable>
        ))}
      </View>

      {/* Animaciones de tiempo */}
      <Animated.View
        style={[
          styles.timeAnimationContainer,
          {
            opacity: timeAnimation,
            transform: [
              {
                scale: timeAnimation.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [0.5, 1.2, 1],
                }),
              },
              {
                translateY: timeAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -50],
                }),
              },
            ],
          },
        ]}
        pointerEvents="none"
      >
        <ThemedText style={styles.timeAnimationText}>-3</ThemedText>
      </Animated.View>

      <Animated.View
        style={[
          styles.bonusAnimationContainer,
          {
            opacity: bonusAnimation,
            transform: [
              {
                scale: bonusAnimation.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [0.5, 1.2, 1],
                }),
              },
              {
                translateY: bonusAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -50],
                }),
              },
            ],
          },
        ]}
        pointerEvents="none"
      >
        <ThemedText style={styles.bonusAnimationText}>+5</ThemedText>
      </Animated.View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  gameHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
    padding: 15,
    backgroundColor: "#f8f9fa",
    borderRadius: 10,
  },
  gameTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#2D4B8E",
  },
  timeDisplay: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#DC3545",
  },
  criticalTime: {
    color: "#FF0000",
    fontSize: 26,
  },
  finalCountdown: {
    color: "#FF0000",
    fontSize: 28,
    textShadowColor: "#FF0000",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  debugContainer: {
    backgroundColor: "#FFF3CD",
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
  },
  debugText: {
    color: "#856404",
    textAlign: "center",
    fontSize: 14,
  },
  scoreContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 15,
    padding: 15,
    backgroundColor: "#f8f9fa",
    borderRadius: 10,
  },
  scoreSection: {
    alignItems: "center",
  },
  scoreLabel: {
    fontSize: 14,
    color: "#666",
    marginBottom: 5,
  },
  scoreValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#2D4B8E",
  },
  streakContainer: {
    marginBottom: 20,
    alignItems: "center",
  },
  streakText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FF6B35",
    textAlign: "center",
  },
  extensionIndicator: {
    fontSize: 12,
    color: "#FFA500",
    fontStyle: "italic",
    marginTop: 5,
  },
  questionNumber: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 10,
  },
  category: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 10,
    textAlign: "center",
  },
  questionContainer: {
    marginBottom: 30,
    padding: 20,
    backgroundColor: "#f8f9fa",
    borderRadius: 10,
  },
  question: {
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 24,
  },
  optionsContainer: {
    flex: 1,
  },
  optionButton: {
    padding: 15,
    marginVertical: 6,
    borderRadius: 10,
    backgroundColor: "#E5E5E5",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  correctAnswer: {
    backgroundColor: "#28a745",
  },
  wrongAnswer: {
    backgroundColor: "#dc3545",
  },
  disabledButton: {
    backgroundColor: "#f0f0f0",
    opacity: 0.6,
  },
  optionText: {
    fontSize: 16,
    textAlign: "center",
    fontWeight: "500",
    color: "#333",
  },
  timeAnimationContainer: {
    position: "absolute",
    top: "50%",
    left: "50%",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: -50,
    marginTop: -80,
    zIndex: 999,
  },
  timeAnimationText: {
    fontSize: 60,
    fontWeight: "bold",
    color: "#FF0000",
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 3,
    textAlign: "center",
    includeFontPadding: false,
    padding: 0,
    lineHeight: 60,
  },
  bonusAnimationContainer: {
    position: "absolute",
    top: "50%",
    left: "50%",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: -50,
    marginTop: -80,
    zIndex: 999,
  },
  bonusAnimationText: {
    fontSize: 60,
    fontWeight: "bold",
    color: "#00FF00",
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 3,
    textAlign: "center",
    includeFontPadding: false,
    padding: 0,
    lineHeight: 60,
  },
});
