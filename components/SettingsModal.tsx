import { useAudioManager } from '@/hooks/useAudioManager';
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
  soundEffects: boolean;
}

const DEFAULT_SETTINGS: Settings = {
  difficulty: 'Mixed',
  soundEffects: true,
};

export default function SettingsModal({ visible, onClose }: SettingsModalProps) {
  const [difficulty, setDifficulty] = useState(DEFAULT_SETTINGS.difficulty);
  const [soundEffects, setSoundEffects] = useState(DEFAULT_SETTINGS.soundEffects);
  const [isLoading, setIsLoading] = useState(false);

  const { 
    updateSoundEffects: updateAudioManagerSfx 
  } = useAudioManager();

  // Cargar configuraciones cuando se abre el modal
  useEffect(() => {
    if (visible) {
      loadSettings();
    }
  }, [visible]);

  // Función para cargar configuraciones desde AsyncStorage
  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const savedSettings = await AsyncStorage.getItem('gameSettings');
      
      if (savedSettings) {
        const settings: Settings = JSON.parse(savedSettings);
        console.log('📱 Settings cargados desde AsyncStorage:', settings);
        
        setDifficulty(settings.difficulty || DEFAULT_SETTINGS.difficulty);
        setSoundEffects(settings.soundEffects ?? DEFAULT_SETTINGS.soundEffects);
      } else {
        console.log('📱 No hay settings guardados, usando defaults');
        // Si no hay settings guardados, guardar los defaults
        await saveSettings(DEFAULT_SETTINGS);
        setDifficulty(DEFAULT_SETTINGS.difficulty);
        setSoundEffects(DEFAULT_SETTINGS.soundEffects);
      }
    } catch (error) {
      console.error('❌ Error loading settings:', error);
      // En caso de error, usar defaults
      setDifficulty(DEFAULT_SETTINGS.difficulty);
      setSoundEffects(DEFAULT_SETTINGS.soundEffects);
    } finally {
      setIsLoading(false);
    }
  };

  // Función para guardar configuraciones en AsyncStorage
  const saveSettings = async (newSettings: Settings) => {
    try {
      console.log('💾 Guardando settings:', newSettings);
      await AsyncStorage.setItem('gameSettings', JSON.stringify(newSettings));
      
      // Verificar que se guardó correctamente
      const saved = await AsyncStorage.getItem('gameSettings');
      const parsedSaved = saved ? JSON.parse(saved) : null;
      console.log('✅ Settings guardados y verificados:', parsedSaved);
      
    } catch (error) {
      console.error('❌ Error saving settings:', error);
    }
  };

  // Función para actualizar dificultad
  const updateDifficulty = async (value: string) => {
    console.log(`🎯 Actualizando dificultad a: ${value}`);
    
    setDifficulty(value);
    
    const newSettings: Settings = {
      difficulty: value,
      soundEffects,
    };
    
    await saveSettings(newSettings);
  };

  // Función para actualizar efectos de sonido
  const updateSoundEffects = async (value: boolean) => {
    console.log(`🔊 Usuario cambió efectos de sonido a: ${value}`);
    
    // Actualizar estado local inmediatamente
    setSoundEffects(value);
    
    // Actualizar AudioManager inmediatamente
    updateAudioManagerSfx(value);
    
    // Guardar en AsyncStorage
    const newSettings: Settings = {
      difficulty,
      soundEffects: value,
    };
    
    await saveSettings(newSettings);
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

            {/* Mostrar loading mientras carga */}
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Loading settings...</Text>
              </View>
            ) : (
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
            )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  debugContainer: {
    marginTop: 10,
    padding: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
  },
  debugText: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
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
