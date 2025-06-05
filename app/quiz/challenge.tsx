import questionsData from "@/app/data/questions.json";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import Timer from "@/components/Timer";
import { useSettings } from "@/hooks/useSettings";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
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

interface ChallengeLevel {
  id: number;
  name: string;
  category: string;
  questions: number;
  reward: number;
  unlocked: boolean;
}

// Primero necesitamos ver qué categorías existen en tus preguntas
// Temporalmente vamos a usar todas las preguntas para cada nivel
const CHALLENGE_LEVELS: ChallengeLevel[] = [
  { id: 1, name: "Antiguo Testamento", category: "", questions: 20, reward: 50, unlocked: true },
  { id: 2, name: "Nuevo Testamento", category: "", questions: 25, reward: 60, unlocked: false },
  { id: 3, name: "Profetas", category: "", questions: 30, reward: 70, unlocked: false },
  { id: 4, name: "Parábolas de Jesús", category: "", questions: 35, reward: 80, unlocked: false },
  { id: 5, name: "Milagros", category: "", questions: 40, reward: 90, unlocked: false },
];

export default function ChallengeScreen() {
  const { settings, isLoading: settingsLoading } = useSettings();
  const [currentLevel, setCurrentLevel] = useState<ChallengeLevel>(CHALLENGE_LEVELS[0]);
  const [questions, setQuestions] = useState<ShuffledQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [lives, setLives] = useState(3);
  const [score, setScore] = useState(0);
  const [gameEnded, setGameEnded] = useState(false);
  const [showLevelSelect, setShowLevelSelect] = useState(true);
  const [levels, setLevels] = useState<ChallengeLevel[]>(CHALLENGE_LEVELS);

  const gameEndedRef = useRef(false);

  // Load unlocked levels on mount
  useEffect(() => {
    loadUnlockedLevels();
  }, []);

  const loadUnlockedLevels = async () => {
    try {
      const unlockedData = await AsyncStorage.getItem('challengeLevelsUnlocked');
      if (unlockedData) {
        const unlockedLevels = JSON.parse(unlockedData);
        const updatedLevels = CHALLENGE_LEVELS.map(level => ({
          ...level,
          unlocked: unlockedLevels.includes(level.id) || level.id === 1
        }));
        setLevels(updatedLevels);
      }
    } catch (error) {
      console.error('Error loading unlocked levels:', error);
    }
  };

  const unlockNextLevel = async (completedLevelId: number) => {
    try {
      const unlockedData = await AsyncStorage.getItem('challengeLevelsUnlocked');
      let unlockedLevels = unlockedData ? JSON.parse(unlockedData) : [1];
      
      if (completedLevelId < CHALLENGE_LEVELS.length && !unlockedLevels.includes(completedLevelId + 1)) {
        unlockedLevels.push(completedLevelId + 1);
        await AsyncStorage.setItem('challengeLevelsUnlocked', JSON.stringify(unlockedLevels));
        
        const updatedLevels = levels.map(level => ({
          ...level,
          unlocked: unlockedLevels.includes(level.id)
        }));
        setLevels(updatedLevels);
      }
    } catch (error) {
      console.error('Error unlocking next level:', error);
    }
  };

  const startLevel = (level: ChallengeLevel) => {
    setCurrentLevel(level);
    setShowLevelSelect(false);
    setLives(3);
    setScore(0);
    setGameEnded(false);
    gameEndedRef.current = false;
    loadQuestions(level);
  };

  const shuffleQuestionOptions = (question: Question): ShuffledQuestion => {
    const originalCorrectAnswer = question.options[question.correctAnswer];
    const optionsWithIndices = question.options.map((option, index) => ({ option, originalIndex: index }));
    const shuffledOptionsWithIndices = [...optionsWithIndices].sort(() => 0.5 - Math.random());
    const shuffledOptions = shuffledOptionsWithIndices.map(item => item.option);
    const newCorrectAnswer = shuffledOptions.findIndex(option => option === originalCorrectAnswer);

    return { ...question, shuffledOptions, newCorrectAnswer };
  };

  const loadQuestions = (level: ChallengeLevel) => {
    // Por ahora usar todas las preguntas sin filtrar por categoría
    // Más adelante puedes ajustar según las categorías reales de tu JSON
    let filteredQuestions = questionsData;
    
    if (settings.difficulty && settings.difficulty !== "Mixed") {
      filteredQuestions = filteredQuestions.filter(q => q.difficulty === settings.difficulty);
    }

    console.log(`Level: ${level.name}, Total questions: ${filteredQuestions.length}`);

    // Si no hay preguntas después del filtro, usar todas
    if (filteredQuestions.length === 0) {
      filteredQuestions = questionsData;
      console.log(`No questions found, using all: ${filteredQuestions.length}`);
    }

    // Shuffle and take required number of questions
    const shuffled = [...filteredQuestions].sort(() => 0.5 - Math.random());
    const selectedQuestions = shuffled.slice(0, Math.min(level.questions, shuffled.length));
    const questionsWithShuffledOptions = selectedQuestions.map(shuffleQuestionOptions);

    console.log(`Final questions loaded: ${questionsWithShuffledOptions.length}`);
    setQuestions(questionsWithShuffledOptions);
    setCurrentQuestionIndex(0);
    setIsLoading(false);
  };

  const handleAnswer = (answerIndex: number) => {
    if (gameEndedRef.current || !questions[currentQuestionIndex]) return;

    setSelectedAnswer(answerIndex);
    setShowResult(true);

    const isCorrect = answerIndex === questions[currentQuestionIndex].newCorrectAnswer;
    
    if (isCorrect) {
      setScore(score + 1);
    } else {
      setLives(lives - 1);
    }

    setTimeout(() => {
      if (!gameEndedRef.current) {
        // Check if level complete
        if (currentQuestionIndex + 1 >= questions.length) {
          endLevel(true); // Level completed
        } else if (lives <= 1 && !isCorrect) {
          endLevel(false); // Game over
        } else {
          // Continue to next question
          setCurrentQuestionIndex(currentQuestionIndex + 1);
          setSelectedAnswer(null);
          setShowResult(false);
        }
      }
    }, 1500);
  };

  const handleTimeUp = () => {
    if (gameEndedRef.current) return;
    setShowResult(true);
    setSelectedAnswer(-1);
    setLives(lives - 1);

    setTimeout(() => {
      if (!gameEndedRef.current) {
        if (lives <= 1) {
          endLevel(false);
        } else {
          setCurrentQuestionIndex(currentQuestionIndex + 1);
          setSelectedAnswer(null);
          setShowResult(false);
        }
      }
    }, 1500);
  };

  const endLevel = async (completed: boolean) => {
    if (gameEndedRef.current) return;
    gameEndedRef.current = true;
    setGameEnded(true);

    // Calculate final score as percentage
    const percentage = Math.round((score / questions.length) * 100);
    const isPerfect = percentage === 100;

    // Save stats and award gold if perfect
    if (isPerfect && completed) {
      await awardGold(currentLevel.reward);
      await unlockNextLevel(currentLevel.id);
      await saveLevelBadge(currentLevel.id);
    }

    // Show appropriate alert
    if (completed && isPerfect) {
      Alert.alert(
        "🏆 Level Complete!",
        `Perfect! You earned ${currentLevel.reward} gold and unlocked the next level!`,
        [
          { text: "Continue", onPress: () => setShowLevelSelect(true) }
        ]
      );
    } else if (completed) {
      Alert.alert(
        "Level Complete",
        `You completed ${percentage}% of questions correctly. You need 100% to unlock the next level.`,
        [
          { text: "Try Again", onPress: () => startLevel(currentLevel) },
          { text: "Level Select", onPress: () => setShowLevelSelect(true) }
        ]
      );
    } else {
      Alert.alert(
        "💀 Game Over!",
        `You lost all lives. Would you like to continue?`,
        [
          { text: "Watch Ad & Continue", onPress: () => reviveWithAd() },
          { text: "Pay 300 Gold", onPress: () => reviveWithGold() },
          { text: "Give Up", onPress: () => setShowLevelSelect(true) }
        ]
      );
    }
  };

  const reviveWithAd = () => {
    // TODO: Implement ad watching
    console.log("Watching ad...");
    setLives(1);
    setSelectedAnswer(null);
    setShowResult(false);
    gameEndedRef.current = false;
    setGameEnded(false);
  };

  const reviveWithGold = async () => {
    // TODO: Implement gold spending
    console.log("Spending 300 gold...");
    setLives(1);
    setSelectedAnswer(null);
    setShowResult(false);
    gameEndedRef.current = false;
    setGameEnded(false);
  };

  const awardGold = async (amount: number) => {
    try {
      const currentGold = await AsyncStorage.getItem('userGold');
      const newGold = (currentGold ? parseInt(currentGold) : 0) + amount;
      await AsyncStorage.setItem('userGold', newGold.toString());
    } catch (error) {
      console.error('Error awarding gold:', error);
    }
  };

  const saveLevelBadge = async (levelId: number) => {
    try {
      const badgesData = await AsyncStorage.getItem('levelBadges');
      let badges = badgesData ? JSON.parse(badgesData) : [];
      if (!badges.includes(levelId)) {
        badges.push(levelId);
        await AsyncStorage.setItem('levelBadges', JSON.stringify(badges));
      }
    } catch (error) {
      console.error('Error saving badge:', error);
    }
  };

  const getButtonStyle = (index: number) => {
    if (!showResult) return styles.optionButton;
    if (index === questions[currentQuestionIndex]?.newCorrectAnswer) {
      return [styles.optionButton, styles.correctAnswer];
    }
    if (index === selectedAnswer && index !== questions[currentQuestionIndex]?.newCorrectAnswer) {
      return [styles.optionButton, styles.wrongAnswer];
    }
    return [styles.optionButton, styles.disabledButton];
  };

  if (settingsLoading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ThemedText>Loading settings...</ThemedText>
      </ThemedView>
    );
  }

  if (isLoading && !showLevelSelect) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ThemedText>Loading questions...</ThemedText>
        <ThemedText style={{marginTop: 10}}>Level: {currentLevel.name}</ThemedText>
        <ThemedText style={{marginTop: 5}}>Questions loaded: {questions.length}</ThemedText>
      </ThemedView>
    );
  }

  // Level selection screen
  if (showLevelSelect) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText style={styles.title}>Choose Your Challenge</ThemedText>
        
        {levels.map((level) => (
          <Pressable
            key={level.id}
            style={[
              styles.levelCard,
              !level.unlocked && styles.lockedLevel
            ]}
            onPress={() => level.unlocked && startLevel(level)}
            disabled={!level.unlocked}
          >
            <View style={styles.levelHeader}>
              <ThemedText style={styles.levelTitle}>
                {level.unlocked ? '🔓' : '🔒'} Level {level.id}
              </ThemedText>
              <ThemedText style={styles.goldReward}>
                {level.reward} 🪙
              </ThemedText>
            </View>
            <ThemedText style={styles.levelName}>{level.name}</ThemedText>
            <ThemedText style={styles.levelInfo}>
              {level.questions} questions • 15 seconds each
            </ThemedText>
            {!level.unlocked && (
              <ThemedText style={styles.unlockText}>
                Complete previous level with 100% to unlock
              </ThemedText>
            )}
          </Pressable>
        ))}

        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <ThemedText style={styles.backButtonText}>Back</ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  // Game screen
  const currentQuestion = questions[currentQuestionIndex];
  if (!currentQuestion) return null;

  return (
    <ThemedView style={styles.container}>
      {/* Game Status */}
      <View style={styles.gameHeader}>
        <ThemedText style={styles.levelIndicator}>
          {currentLevel.name} - Level {currentLevel.id}
        </ThemedText>
        <View style={styles.livesContainer}>
          {[...Array(3)].map((_, i) => (
            <ThemedText key={i} style={styles.heart}>
              {i < lives ? "❤️" : "🖤"}
            </ThemedText>
          ))}
        </View>
      </View>

      {/* Progress */}
      <View style={styles.progressContainer}>
        <ThemedText style={styles.progress}>
          Question {currentQuestionIndex + 1} of {questions.length}
        </ThemedText>
        <Timer
          seconds={15}
          onTimeUp={handleTimeUp}
          isActive={!showResult && !gameEnded}
          key={`${currentQuestionIndex}-${lives}`}
        />
      </View>

      <ThemedText style={styles.score}>Score: {score}/{questions.length}</ThemedText>

      <ThemedText style={styles.category}>{currentQuestion.category}</ThemedText>

      <View style={styles.questionContainer}>
        <ThemedText style={styles.question}>{currentQuestion.question}</ThemedText>
      </View>

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

      <Pressable style={styles.exitButton} onPress={() => setShowLevelSelect(true)}>
        <ThemedText style={styles.exitButtonText}>Exit to Level Select</ThemedText>
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
  title: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
  },
  levelCard: {
    backgroundColor: "#f8f9fa",
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    borderWidth: 2,
    borderColor: "transparent",
  },
  lockedLevel: {
    opacity: 0.6,
    backgroundColor: "#f0f0f0",
  },
  levelHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  levelTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2D4B8E",
  },
  goldReward: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFD700",
  },
  levelName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 5,
  },
  levelInfo: {
    fontSize: 14,
    color: "#666",
  },
  unlockText: {
    fontSize: 12,
    color: "#999",
    fontStyle: "italic",
    marginTop: 5,
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
  levelIndicator: {
    fontSize: 16,
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
  backButton: {
    backgroundColor: "#2D4B8E",
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
  },
  backButtonText: {
    color: "#FFFFFF",
    textAlign: "center",
    fontSize: 16,
    fontWeight: "bold",
  },
});
