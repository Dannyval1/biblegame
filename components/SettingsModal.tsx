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
  backgroundMusic: boolean;
  soundEffects: boolean;
}

const DEFAULT_SETTINGS: Settings = {
  difficulty: 'Mixed',
  backgroundMusic: true,
  soundEffects: true,
};

export default function SettingsModal({ visible, onClose }: SettingsModalProps) {
  const [difficulty, setDifficulty] = useState(DEFAULT_SETTINGS.difficulty);
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
        setBackgroundMusic(settings.backgroundMusic);
        setSoundEffects(settings.soundEffects);
        console.log('Settings loaded:', settings);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  // Función para guardar configuraciones en AsyncStorage
  const saveSettings = async (newSettings: Settings) => {
    try {
      await AsyncStorage.setItem('gameSettings', JSON.stringify(newSettings));
      console.log('Settings saved:', newSettings);
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  // Función para actualizar dificultad
  const updateDifficulty = (value: string) => {
    setDifficulty(value);
    const newSettings: Settings = {
      difficulty: value,
      backgroundMusic,
      soundEffects,
    };
    saveSettings(newSettings);
  };

  // Función para actualizar música de fondo
  const updateBackgroundMusic = (value: boolean) => {
    setBackgroundMusic(value);
    const newSettings: Settings = {
      difficulty,
      backgroundMusic: value,
      soundEffects,
    };
    saveSettings(newSettings);
  };

  // Función para actualizar efectos de sonido
  const updateSoundEffects = (value: boolean) => {
    setSoundEffects(value);
    const newSettings: Settings = {
      difficulty,
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
              <Text style={styles.title}>Settings</Text>
              <Pressable style={styles.closeButton} onPress={onClose}>
                <Text style={styles.closeX}>×</Text>
              </Pressable>
            </View>

            <ScrollView style={styles.content}>
              {/* Game Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Game</Text>
                
                <View style={styles.row}>
                  <Text style={styles.label}>Difficulty</Text>
                  <Text style={styles.value}>{difficulty}</Text>
                </View>
                <View style={styles.options}>
                  {['Easy', 'Medium', 'Hard', 'Mixed'].map((option) => (
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
              </View>

              {/* Audio Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Audio & Sound</Text>
                
                <View style={styles.row}>
                  <Text style={styles.label}>Background Music</Text>
                  <Switch
                    value={backgroundMusic}
                    onValueChange={updateBackgroundMusic}
                    trackColor={{ false: '#767577', true: '#2D4B8E' }}
                    thumbColor={backgroundMusic ? '#fff' : '#f4f3f4'}
                  />
                </View>

                <View style={styles.row}>
                  <Text style={styles.label}>Sound Effects</Text>
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
                <Text style={styles.sectionTitle}>Support</Text>
                <Pressable 
                  style={styles.supportButton}
                  onPress={() => {
                    const email = 'support@bibliquiz.com';
                    const subject = 'Bug Report - BibliQuiz';
                    const body = 'Describe your issue here...';
                    Linking.openURL(`mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
                  }}
                >
                  <Text style={styles.supportButtonText}>Report Issue</Text>
                </Pressable>
              </View>

              {/* About Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>About</Text>
                <View style={styles.row}>
                  <Text style={styles.label}>Version</Text>
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
    width: 32,
    height: 32,
    borderRadius: 16,
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
