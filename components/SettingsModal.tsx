// components/SettingsModal.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import {
    Linking,
    Modal,
    Pressable,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Switch,
    Text,
    View
} from 'react-native';

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

interface Settings {
  difficulty: string;
  timePerQuestion: number;
  questionsPerSession: number;
  backgroundMusic: boolean;
  soundEffects: boolean;
}

const DEFAULT_SETTINGS: Settings = {
  difficulty: 'Mixto',
  timePerQuestion: 15,
  questionsPerSession: 10,
  backgroundMusic: true,
  soundEffects: true,
};

export default function SettingsModal({ visible, onClose }: SettingsModalProps) {
  const [difficulty, setDifficulty] = useState(DEFAULT_SETTINGS.difficulty);
  const [timePerQuestion, setTimePerQuestion] = useState(DEFAULT_SETTINGS.timePerQuestion);
  const [questionsPerSession, setQuestionsPerSession] = useState(DEFAULT_SETTINGS.questionsPerSession);
  const [backgroundMusic, setBackgroundMusic] = useState(DEFAULT_SETTINGS.backgroundMusic);
  const [soundEffects, setSoundEffects] = useState(DEFAULT_SETTINGS.soundEffects);

  // Cargar configuraciones cuando se abre el modal
  useEffect(() => {
    if (visible) {
      loadSettings();
    }
  }, [visible]);

  // Función para cargar configuraciones desde AsyncStorage
  const loadSettings = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem('gameSettings');
      if (savedSettings) {
        const settings: Settings = JSON.parse(savedSettings);
        setDifficulty(settings.difficulty);
        setTimePerQuestion(settings.timePerQuestion);
        setQuestionsPerSession(settings.questionsPerSession);
        setBackgroundMusic(settings.backgroundMusic);
        setSoundEffects(settings.soundEffects);
        console.log('Configuraciones cargadas:', settings);
      }
    } catch (error) {
      console.error('Error al cargar configuraciones:', error);
    }
  };

  const saveSettings = async (newSettings: Settings) => {
    try {
      await AsyncStorage.setItem('gameSettings', JSON.stringify(newSettings));
      console.log('Configuraciones guardadas:', newSettings);
    } catch (error) {
      console.error('Error al guardar configuraciones:', error);
    }
  };

  const updateDifficulty = (value: string) => {
    setDifficulty(value);
    const newSettings: Settings = {
      difficulty: value,
      timePerQuestion,
      questionsPerSession,
      backgroundMusic,
      soundEffects,
    };
    saveSettings(newSettings);
  };

  const updateTimePerQuestion = (value: number) => {
    setTimePerQuestion(value);
    const newSettings: Settings = {
      difficulty,
      timePerQuestion: value,
      questionsPerSession,
      backgroundMusic,
      soundEffects,
    };
    saveSettings(newSettings);
  };

  const updateQuestionsPerSession = (value: number) => {
    setQuestionsPerSession(value);
    const newSettings: Settings = {
      difficulty,
      timePerQuestion,
      questionsPerSession: value,
      backgroundMusic,
      soundEffects,
    };
    saveSettings(newSettings);
  };

  const updateBackgroundMusic = (value: boolean) => {
    setBackgroundMusic(value);
    const newSettings: Settings = {
      difficulty,
      timePerQuestion,
      questionsPerSession,
      backgroundMusic: value,
      soundEffects,
    };
    saveSettings(newSettings);
  };

  const updateSoundEffects = (value: boolean) => {
    setSoundEffects(value);
    const newSettings: Settings = {
      difficulty,
      timePerQuestion,
      questionsPerSession,
      backgroundMusic,
      soundEffects: value,
    };
    saveSettings(newSettings);
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <StatusBar barStyle="light-content" />
      <View style={styles.overlay}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Configuración</Text>
              <Pressable style={styles.closeButton} onPress={onClose}>
                <Text style={styles.closeX}>Guardar</Text>
              </Pressable>
            </View>

            <ScrollView style={styles.content}>
              {/* Quiz Section */}
              <View style={styles.section}>
                
                <View style={styles.row}>
                  <Text style={styles.label}>Dificultad</Text>
                  <Text style={styles.value}>{difficulty}</Text>
                </View>
                <View style={styles.options}>
                  {['Fácil', 'Medio', 'Difícil', 'Mixto'].map((option) => (
                    <Pressable
                      key={option}
                      style={[styles.option, difficulty === option && styles.optionSelected]}
                      onPress={() => updateDifficulty(option)}
                    >
                      <Text style={[styles.optionText, difficulty === option && styles.optionTextSelected]}>
                        {option}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <View style={styles.row}>
                  <Text style={styles.label}>Tiempo por pregunta</Text>
                  <Text style={styles.value}>{timePerQuestion}s</Text>
                </View>
                <View style={styles.options}>
                  {[10, 15, 20, 30].map((time) => (
                    <Pressable
                      key={time}
                      style={[styles.option, timePerQuestion === time && styles.optionSelected]}
                      onPress={() => updateTimePerQuestion(time)}
                    >
                      <Text style={[styles.optionText, timePerQuestion === time && styles.optionTextSelected]}>
                        {time}s
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <View style={styles.row}>
                  <Text style={styles.label}>Preguntas por sesión</Text>
                  <Text style={styles.value}>{questionsPerSession}</Text>
                </View>
                <View style={styles.options}>
                  {[5, 10, 15, 20].map((count) => (
                    <Pressable
                      key={count}
                      style={[styles.option, questionsPerSession === count && styles.optionSelected]}
                      onPress={() => updateQuestionsPerSession(count)}
                    >
                      <Text style={[styles.optionText, questionsPerSession === count && styles.optionTextSelected]}>
                        {count}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Audio Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Audio y Sonido</Text>
                
                <View style={styles.row}>
                  <Text style={styles.label}>Música de fondo</Text>
                  <Switch
                    value={backgroundMusic}
                    onValueChange={updateBackgroundMusic}
                    trackColor={{ false: '#767577', true: '#2D4B8E' }}
                    thumbColor={backgroundMusic ? '#fff' : '#f4f3f4'}
                  />
                </View>

                <View style={styles.row}>
                  <Text style={styles.label}>Efectos de sonido</Text>
                  <Switch
                    value={soundEffects}
                    onValueChange={updateSoundEffects}
                    trackColor={{ false: '#767577', true: '#2D4B8E' }}
                    thumbColor={soundEffects ? '#fff' : '#f4f3f4'}
                  />
                </View>
              </View>

              {/* Support Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Soporte</Text>
                <Pressable 
                  style={styles.supportButton}
                  onPress={() => {
                    const email = 'soporte@bibliquiz.com';
                    const subject = 'Reporte de problema - BibliQuiz';
                    const body = 'Describe tu problema aquí...';
                    Linking.openURL(`mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
                  }}
                >
                  <Text style={styles.supportButtonText}>Informar problema</Text>
                </Pressable>
              </View>

              {/* About Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Acerca de</Text>
                <View style={styles.row}>
                  <Text style={styles.label}>Versión</Text>
                  <Text style={styles.value}>1.0.0</Text>
                </View>
              </View>
            </ScrollView>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  safeArea: {
    width: '90%',
    height: '80%',
  },
  container: {
    backgroundColor: '#fff',
    borderRadius: 20,
    flex: 1,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
  },
  closeButton: {
    width: 100,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeX: {
    fontSize: 20,
    color: '#333',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D4B8E',
    marginBottom: 15,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  label: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  value: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2D4B8E',
  },
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
    marginBottom: 15,
  },
  option: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 10,
    marginBottom: 10,
  },
  optionSelected: {
    backgroundColor: '#2D4B8E',
  },
  optionText: {
    fontSize: 14,
    color: '#333',
  },
  optionTextSelected: {
    color: '#fff',
    fontWeight: 'bold',
  },
  supportButton: {
    backgroundColor: '#2D4B8E',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  supportButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
