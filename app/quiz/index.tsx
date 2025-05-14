import questionsData from '@/app/data/questions.json';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import Timer from '@/components/Timer';
import { useSettings } from '@/hooks/useSettings';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

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
  const { settings, isLoading: settingsLoading } = useSettings();
  const [questions, setQuestions] = useState<ShuffledQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [timerKey, setTimerKey] = useState(0);

  // Función para aleatorizar las opciones de una pregunta
  const shuffleQuestionOptions = (question: Question): ShuffledQuestion => {
    const originalCorrectAnswer = question.options[question.correctAnswer];
    
    // Crear un array de opciones con índices
    const optionsWithIndices = question.options.map((option, index) => ({
      option,
      originalIndex: index,
    }));
    
    // Aleatorizar las opciones
    const shuffledOptionsWithIndices = [...optionsWithIndices].sort(() => 0.5 - Math.random());
    
    // Extraer solo las opciones aleatorizadas
    const shuffledOptions = shuffledOptionsWithIndices.map(item => item.option);
    
    // Encontrar la nueva posición de la respuesta correcta
    const newCorrectAnswer = shuffledOptions.findIndex(option => option === originalCorrectAnswer);
    
    return {
      ...question,
      shuffledOptions,
      newCorrectAnswer,
    };
  };

  // Cargar preguntas al inicializar
  useEffect(() => {
    if (!settingsLoading) {
      loadQuestions();
    }
  }, [settingsLoading, settings]);

  const loadQuestions = () => {
    // Filtrar preguntas según dificultad
    let filteredQuestions = questionsData;
    
    if (settings.difficulty !== 'Mixto') {
      filteredQuestions = questionsData.filter(q => q.difficulty === settings.difficulty);
    }
    
    // Seleccionar preguntas según configuración
    const shuffled = [...filteredQuestions].sort(() => 0.5 - Math.random());
    const selectedQuestions = shuffled.slice(0, settings.questionsPerSession);
    
    // Aleatorizar las opciones de cada pregunta
    const questionsWithShuffledOptions = selectedQuestions.map(question => shuffleQuestionOptions(question));
    
    setQuestions(questionsWithShuffledOptions);
    setIsLoading(false);
  };

  // Función para guardar estadísticas del juego
  const saveGameStats = async (finalScore: number, totalQuestions: number) => {
    try {
      const savedStats = await AsyncStorage.getItem('gameStats');
      const currentStats = savedStats ? JSON.parse(savedStats) : {
        gamesPlayed: 0,
        totalQuestions: 0,
        correctAnswers: 0,
        currentStreak: 0,
        bestStreak: 0,
      };

      // Determinar si el juego fue perfecto (todas las respuestas correctas)
      const isPerfectGame = finalScore === totalQuestions;
      
      const newStats = {
        gamesPlayed: currentStats.gamesPlayed + 1,
        totalQuestions: currentStats.totalQuestions + totalQuestions,
        correctAnswers: currentStats.correctAnswers + finalScore,
        currentStreak: isPerfectGame ? currentStats.currentStreak + 1 : 0,
        bestStreak: Math.max(
          currentStats.bestStreak, 
          isPerfectGame ? currentStats.currentStreak + 1 : currentStats.currentStreak
        ),
      };

      await AsyncStorage.setItem('gameStats', JSON.stringify(newStats));
      console.log('Game stats saved:', newStats);
    } catch (error) {
      console.error('Error saving game stats:', error);
    }
  };

  const currentQuestion = questions[currentQuestionIndex];

  const handleAnswer = async (answerIndex: number) => {
    setSelectedAnswer(answerIndex);
    setShowResult(true);

    // Verificar si es correcta usando el nuevo índice
    if (answerIndex === currentQuestion.newCorrectAnswer) {
      setScore(score + 1);
    }

    // Esperar un poco antes de continuar
    setTimeout(async () => {
      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
        setSelectedAnswer(null);
        setShowResult(false);
        setTimerKey(timerKey + 1); // Reiniciar timer para la nueva pregunta
      } else {
        // Quiz terminado
        const finalScore = score + (answerIndex === currentQuestion.newCorrectAnswer ? 1 : 0);
        
        // Guardar estadísticas antes de mostrar el resultado
        await saveGameStats(finalScore, questions.length);
        
        Alert.alert(
          'Quiz Completed',
          `Your score: ${finalScore}/${questions.length}`,
          [
            { 
              text: 'Back to Home', 
              onPress: () => router.replace('/')
            }
          ]
        );
      }
    }, 1500);
  };

  const handleTimeUp = async () => {
    console.log('Time up!');
    // Manejar cuando se acaba el tiempo (mismo comportamiento que respuesta incorrecta)
    setShowResult(true);
    setSelectedAnswer(-1); // -1 indica que no se seleccionó ninguna respuesta
    
    setTimeout(async () => {
      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
        setSelectedAnswer(null);
        setShowResult(false);
        setTimerKey(timerKey + 1);
      } else {
        // Quiz terminado por tiempo
        await saveGameStats(score, questions.length);
        
        Alert.alert(
          'Quiz Completed',
          `Your score: ${score}/${questions.length}`,
          [
            { 
              text: 'Back to Home', 
              onPress: () => router.replace('/')
            }
          ]
        );
      }
    }, 1500);
  };

  const getButtonStyle = (index: number) => {
    if (!showResult) return styles.optionButton;
    
    // Usar el nuevo índice de respuesta correcta
    if (index === currentQuestion.newCorrectAnswer) {
      return [styles.optionButton, styles.correctAnswer];
    }
    
    if (index === selectedAnswer && index !== currentQuestion.newCorrectAnswer) {
      return [styles.optionButton, styles.wrongAnswer];
    }
    
    return [styles.optionButton, styles.disabledButton];
  };

  if (settingsLoading || isLoading || !currentQuestion) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ThemedText>Loading questions...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      {/* Progreso y Timer */}
      <View style={styles.progressContainer}>
        <ThemedText style={styles.progress}>
          Question {currentQuestionIndex + 1} of {questions.length}
        </ThemedText>
        
        {/* Timer Component - AHORA USA LA CONFIGURACIÓN */}
        <Timer 
          key={timerKey} 
          seconds={settings.timePerQuestion} // USA EL TIEMPO CONFIGURADO
          onTimeUp={handleTimeUp}
          isActive={!showResult}
        />
      </View>
      
      <ThemedText style={styles.score}>
        Score: {score}
      </ThemedText>

      {/* Categoría */}
      <ThemedText style={styles.category}>
        {currentQuestion.category}
      </ThemedText>

      {/* Pregunta */}
      <View style={styles.questionContainer}>
        <ThemedText style={styles.question}>
          {currentQuestion.question}
        </ThemedText>
      </View>

      {/* Opciones - AHORA USA LAS OPCIONES ALEATORIZADAS */}
      <View style={styles.optionsContainer}>
        {currentQuestion.shuffledOptions.map((option, index) => (
          <Pressable
            key={index}
            style={getButtonStyle(index)}
            onPress={() => handleAnswer(index)}
            disabled={showResult}
          >
            <ThemedText style={styles.optionText}>
              {option}
            </ThemedText>
          </Pressable>
        ))}
      </View>

      {/* Botón de salir */}
      <Pressable 
        style={styles.exitButton}
        onPress={() => router.replace('/')}
      >
        <ThemedText style={styles.exitButtonText}>
          Exit Quiz
        </ThemedText>
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  progress: {
    fontSize: 16,
  },
  score: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
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
    fontWeight: 'bold',
    textAlign: 'center',
  },
  optionsContainer: {
    flex: 1,
  },
  optionButton: {
    padding: 15,
    marginVertical: 8,
    borderRadius: 10,
    backgroundColor: '#E5E5E5',
  },
  correctAnswer: {
    backgroundColor: '#28a745',
  },
  wrongAnswer: {
    backgroundColor: '#dc3545',
  },
  disabledButton: {
    backgroundColor: '#f0f0f0',
    opacity: 0.6,
  },
  optionText: {
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '500',
  },
  exitButton: {
    backgroundColor: '#666',
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
  },
  exitButtonText: {
    color: '#FFFFFF',
    textAlign: 'center',
    fontSize: 16,
  },
});
