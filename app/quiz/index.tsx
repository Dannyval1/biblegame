import questionsData from "@/app/data/questions.json";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import Timer from "@/components/Timer";
import { useSettings } from "@/hooks/useSettings";
import {
  BaseGameMode,
  ChallengeMode,
  createGameMode,
  GameMode,
  SurvivalMode,
  TimeAttackMode,
} from "@/types/gameModes";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";

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

export default function QuizScreen() {
  const params = useLocalSearchParams();
  const gameMode = (params.mode as GameMode) || "challenge";

  const { settings, isLoading: settingsLoading } = useSettings();
  const [questions, setQuestions] = useState<ShuffledQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [timerKey, setTimerKey] = useState(0);

  // Game mode instance
  const [gameModeInstance, setGameModeInstance] = useState<BaseGameMode | null>(
    null
  );

  // Ref to track if game has ended to prevent multiple alerts
  const gameEndedRef = useRef(false);
  const intervalRef = useRef<number | null>(null);

  // Initialize game mode
  useEffect(() => {
    const instance = createGameMode(gameMode);
    instance.onGameStart();
    setGameModeInstance(instance);
    gameEndedRef.current = false; // Reset game ended flag
  }, [gameMode]);

  // Time Attack timer effect
  useEffect(() => {
  let intervalId: NodeJS.Timeout | number;
  
  const checkGameEnd = () => {
    if (gameModeInstance?.getGameState().isGameOver && !gameEndedRef.current) {
      endGame();
    }
  };

  if (gameModeInstance instanceof TimeAttackMode && !isLoading) {
    intervalId = setInterval(() => {
      const stillRunning = gameModeInstance.tick();
      setTimerKey(prev => prev + 1); // Forzar renderizado
      
      if (!stillRunning) {
        checkGameEnd();
        clearInterval(intervalId);
      }
    }, 1000);
  }

  return () => {
    if (intervalId) clearInterval(intervalId);
  };
}, [gameModeInstance, isLoading, timerKey]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  // Función para aleatorizar las opciones de una pregunta
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

    return {
      ...question,
      shuffledOptions,
      newCorrectAnswer,
    };
  };

  // Cargar preguntas al inicializar
  useEffect(() => {
    if (!settingsLoading && gameModeInstance) {
      loadQuestions();
    }
  }, [settingsLoading, settings, gameModeInstance]);

  const loadQuestions = () => {
    // Filtrar preguntas según dificultad
    let filteredQuestions = questionsData;

    if (settings.difficulty && settings.difficulty !== "Mixed") {
      filteredQuestions = questionsData.filter(
        (q) => q.difficulty === settings.difficulty
      );
    }

    const shuffled = [...filteredQuestions].sort(() => 0.5 - Math.random());

    // Preparar un número adecuado de preguntas según el modo
    const questionsToLoad =
      gameModeInstance!.getConfig().questionsToLoad || 100;
    const selectedQuestions = shuffled.slice(
      0,
      Math.min(questionsToLoad, shuffled.length)
    );

    const questionsWithShuffledOptions = selectedQuestions.map((question) =>
      shuffleQuestionOptions(question)
    );

    setQuestions(questionsWithShuffledOptions);
    setIsLoading(false);
  };

  const saveGameStats = async (finalScore: number, mode: GameMode) => {
    try {
      const savedStats = await AsyncStorage.getItem("gameStats");
      const currentStats = savedStats
        ? JSON.parse(savedStats)
        : {
            gamesPlayed: 0,
            totalQuestions: 0,
            correctAnswers: 0,
            currentStreak: 0,
            bestStreak: 0,
            challengeBest: 0,
            timeAttackBest: 0,
            survivalBest: 0,
          };

      const newStats = {
        ...currentStats,
        gamesPlayed: currentStats.gamesPlayed + 1,
        totalQuestions: currentStats.totalQuestions + finalScore,
        correctAnswers: currentStats.correctAnswers + finalScore,
      };

      // Update mode-specific records
      const modeKey = `${mode}Best` as keyof typeof newStats;
      if (typeof newStats[modeKey] === "number") {
        newStats[modeKey] = Math.max(newStats[modeKey] as number, finalScore);
      }

      await AsyncStorage.setItem("gameStats", JSON.stringify(newStats));
    } catch (error) {
      console.error("Error saving game stats:", error);
    }
  };

  const endGame = async () => {
    // Prevent multiple executions
    if (gameEndedRef.current) return;
    gameEndedRef.current = true;

    const gameState = gameModeInstance!.getGameState();
    await saveGameStats(gameState.score, gameMode);

    // Create appropriate alert based on game mode
    const config = gameModeInstance!.getConfig();
    let title = "Game Over!";
    let message = `You scored ${gameState.score} points!`;
    let buttons: any[] = [
      { text: "Back to Home", onPress: () => router.replace("/") },
    ];

    if (gameModeInstance instanceof TimeAttackMode) {
      title = "⏰ Time's Up!";
      message = `You answered ${gameState.score} questions correctly!\n\nGreat job on your speed run!`;
      buttons.unshift({
        text: "Play Again",
        onPress: () => {
          // Reset game ended flag
          gameEndedRef.current = false;
          // Reset and restart
          const newInstance = createGameMode(gameMode);
          newInstance.onGameStart();
          setGameModeInstance(newInstance);
          setCurrentQuestionIndex(0);
          setTimerKey(timerKey + 1);
          loadQuestions();
          setSelectedAnswer(null);
          setShowResult(false);
        },
      });
    } else if (
      gameModeInstance instanceof ChallengeMode &&
      gameState.showContinueOption
    ) {
      title = "💀 Game Over!";
      message = `You reached question ${
        currentQuestionIndex + 1
      } before losing all lives.\n\nWould you like to continue watching an ad?`;
      buttons.unshift({
        text: "Watch Ad & Continue",
        onPress: () => {
          gameEndedRef.current = false; // Reset flag for continuation
          (gameModeInstance as ChallengeMode).revive();
          setShowResult(false);
          setSelectedAnswer(null);
        },
      });
    }

    Alert.alert(title, message, buttons);
  };

  const currentQuestion = questions[currentQuestionIndex];

  const handleAnswer = (answerIndex: number) => {
    if (!gameModeInstance || !currentQuestion || gameEndedRef.current) return;

    setSelectedAnswer(answerIndex);
    setShowResult(true);

    const isCorrect = answerIndex === currentQuestion.newCorrectAnswer;
    const result = { isCorrect, timeTaken: 0 };

    // Let the game mode handle the logic but don't use its index
    const newState = isCorrect
      ? gameModeInstance.onCorrectAnswer(result)
      : gameModeInstance.onIncorrectAnswer(result);

    // Check if game over
    if (newState.isGameOver && !gameEndedRef.current) {
      setTimeout(() => {
        endGame();
      }, 1500);
      return;
    }

    // Continue to next question using OUR index
    setTimeout(() => {
      if (
        !gameEndedRef.current &&
        currentQuestionIndex + 1 < questions.length
      ) {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
        setSelectedAnswer(null);
        setShowResult(false);
        setTimerKey(timerKey + 1);
      } else if (!gameEndedRef.current) {
        // Run out of questions
        endGame();
      }
    }, 1500);
  };

  const handleTimeUp = () => {
    if (!gameModeInstance || gameEndedRef.current) return;

    const newState = gameModeInstance.onTimeUp();
    setShowResult(true);
    setSelectedAnswer(-1);

    if (newState.isGameOver && !gameEndedRef.current) {
      setTimeout(() => {
        endGame();
      }, 1500);
      return;
    }

    setTimeout(() => {
      if (
        !gameEndedRef.current &&
        currentQuestionIndex + 1 < questions.length
      ) {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
        setSelectedAnswer(null);
        setShowResult(false);
        setTimerKey(timerKey + 1);
      } else if (!gameEndedRef.current) {
        endGame();
      }
    }, 1500);
  };

  const getButtonStyle = (index: number) => {
    if (!showResult) return styles.optionButton;

    if (index === currentQuestion.newCorrectAnswer) {
      return [styles.optionButton, styles.correctAnswer];
    }

    if (
      index === selectedAnswer &&
      index !== currentQuestion.newCorrectAnswer
    ) {
      return [styles.optionButton, styles.wrongAnswer];
    }

    return [styles.optionButton, styles.disabledButton];
  };

  const renderGameStatus = () => {
    if (!gameModeInstance) return null;

    const status = gameModeInstance.getGameStatus();
    const config = gameModeInstance.getConfig();

    return (
      <View style={styles.gameModeHeader}>
        <ThemedText style={styles.gameModeText}>
          {config.icon} {config.name}
        </ThemedText>

        {gameModeInstance instanceof ChallengeMode && (
          <View style={styles.livesContainer}>
            {[...Array(3)].map((_, i) => (
              <ThemedText key={i} style={styles.heart}>
                {i < status.lives ? "❤️" : "🖤"}
              </ThemedText>
            ))}
          </View>
        )}

        {gameModeInstance instanceof TimeAttackMode && (
          <View style={styles.timeAttackContainer}>
            <ThemedText
              style={[
                styles.timeAttackTimer,
                Math.max(0, status.timeRemaining) <= 10 && styles.criticalTime,
              ]}
            >
              ⏱️ {Math.floor(Math.max(0, status.timeRemaining) / 60)}:
              {(Math.max(0, status.timeRemaining) % 60)
                .toString()
                .padStart(2, "0")}
            </ThemedText>
            <View style={styles.streakContainer}>
              <ThemedText style={styles.streakIndicator}>
                🔥 Streak: {status.correctStreak}/3
              </ThemedText>
              {status.correctStreak === 2 && (
                <ThemedText style={styles.nextBonusText}>
                  Next correct: +3s!
                </ThemedText>
              )}
            </View>
          </View>
        )}

        {gameModeInstance instanceof SurvivalMode && (
          <ThemedText style={styles.survivalStatus}>
            🔥 Strikes: {status.consecutiveWrong}/3
          </ThemedText>
        )}
      </View>
    );
  };

  if (settingsLoading || isLoading || !currentQuestion || !gameModeInstance) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ThemedText>Loading questions...</ThemedText>
      </ThemedView>
    );
  }

  const gameState = gameModeInstance.getGameState();

  return (
    <ThemedView style={styles.container}>
      {renderGameStatus()}

      <View style={styles.progressContainer}>
        <ThemedText style={styles.progress}>
          Question {currentQuestionIndex + 1}
        </ThemedText>

        {gameModeInstance.shouldShowTimer() && (
          <Timer
            key={timerKey}
            seconds={gameModeInstance.getTimerSeconds()!}
            onTimeUp={handleTimeUp}
            isActive={!showResult && !gameEndedRef.current}
          />
        )}
      </View>

      <ThemedText style={styles.score}>Score: {gameState.score}</ThemedText>

      <ThemedText style={styles.category}>
        {currentQuestion.category}
      </ThemedText>

      <View style={styles.questionContainer}>
        <ThemedText style={styles.question}>
          {currentQuestion.question}
        </ThemedText>
      </View>

      <View style={styles.optionsContainer}>
        {currentQuestion.shuffledOptions.map((option, index) => (
          <Pressable
            key={index}
            style={getButtonStyle(index)}
            onPress={() => handleAnswer(index)}
            disabled={showResult || gameEndedRef.current}
          >
            <ThemedText style={styles.optionText}>{option}</ThemedText>
          </Pressable>
        ))}
      </View>

      <Pressable style={styles.exitButton} onPress={() => router.replace("/")}>
        <ThemedText style={styles.exitButtonText}>Exit Game</ThemedText>
      </Pressable>
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
  gameModeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
    padding: 15,
    backgroundColor: "#f8f9fa",
    borderRadius: 10,
  },
  gameModeText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2D4B8E",
  },
  livesContainer: {
    flexDirection: "row",
  },
  heart: {
    fontSize: 20,
    marginLeft: 5,
  },
  timeAttackTimer: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#DC3545",
  },
  criticalTime: {
    color: "#FF0000",
    fontSize: 20,
  },
  timeAttackContainer: {
    alignItems: "flex-end",
  },
  streakContainer: {
    alignItems: "flex-end",
    marginTop: 4,
  },
  streakIndicator: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#28a745",
  },
  nextBonusText: {
    fontSize: 12,
    color: "#007bff",
    fontStyle: "italic",
    marginTop: 2,
  },
  penaltyText: {
    fontSize: 12,
    color: "#FF6B35",
    fontStyle: "italic",
  },
  survivalStatus: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FF6B35",
  },
  progressContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  progress: {
    fontSize: 16,
  },
  score: {
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
  },
  category: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 10,
  },
  questionContainer: {
    marginBottom: 30,
  },
  question: {
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
  },
  optionsContainer: {
    flex: 1,
  },
  optionButton: {
    padding: 15,
    marginVertical: 8,
    borderRadius: 10,
    backgroundColor: "#E5E5E5",
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
  },
  exitButton: {
    backgroundColor: "#666",
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
  },
  exitButtonText: {
    color: "#FFFFFF",
    textAlign: "center",
    fontSize: 16,
  },
});
