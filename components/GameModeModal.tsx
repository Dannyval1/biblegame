// components/GameModeModal.tsx
import React from 'react';
import {
    Modal,
    Pressable,
    SafeAreaView,
    StyleSheet,
    Text,
    View,
} from 'react-native';

export type GameMode = 'challenge' | 'timeAttack';

interface GameModeModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectMode: (mode: GameMode) => void;
}

export default function GameModeModal({ 
  visible, 
  onClose, 
  onSelectMode 
}: GameModeModalProps) {
  const handleModeSelect = (mode: GameMode) => {
    onSelectMode(mode);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.container}>
            <View style={styles.header}>
              <Text style={styles.title}>Choose Game Mode</Text>
              <Pressable style={styles.closeButton} onPress={onClose}>
                <Text style={styles.closeX}>×</Text>
              </Pressable>
            </View>

            <View style={styles.content}>
              {/* Challenge Mode */}
              <Pressable
                style={styles.modeCard}
                onPress={() => handleModeSelect('challenge')}
              >
                <View style={styles.modeIcon}>
                  <Text style={styles.iconText}>🛡️</Text>
                </View>
                <View style={styles.modeInfo}>
                  <Text style={styles.modeTitle}>Challenge Mode</Text>
                  <Text style={styles.modeSubtitle}>3 lives • Get as far as you can</Text>
                  <Text style={styles.modeDescription}>
                    Answer correctly to advance. Lose all lives and it's game over!
                  </Text>
                  <View style={styles.modeFeatures}>
                    <Text style={styles.featureText}>• Watch ads to continue</Text>
                    <Text style={styles.featureText}>• 15 seconds per question</Text>
                    <Text style={styles.featureText}>• Earn achievements</Text>
                  </View>
                </View>
              </Pressable>

              {/* Time Attack Mode */}
              <Pressable
                style={styles.modeCard}
                onPress={() => handleModeSelect('timeAttack')}
              >
                <View style={styles.modeIcon}>
                  <Text style={styles.iconText}>⚡</Text>
                </View>
                <View style={styles.modeInfo}>
                  <Text style={styles.modeTitle}>Time Attack</Text>
                  <Text style={styles.modeSubtitle}>1 minute • Strategic answering</Text>
                  <Text style={styles.modeDescription}>
                    Answer questions strategically - time penalties!
                  </Text>
                  <View style={styles.modeFeatures}>
                    <Text style={styles.featureText}>• 1 minute timer</Text>
                    <Text style={styles.featureText}>• -3s penalty after 30s</Text>
                    <Text style={styles.featureText}>• +3s for 5 correct streak</Text>
                  </View>
                </View>
              </Pressable>
            </View>
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
    maxHeight: '80%',
  },
  container: {
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
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
    padding: 20,
  },
  modeCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    borderWidth: 2,
    borderColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  modeIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  iconText: {
    fontSize: 30,
  },
  modeInfo: {
    flex: 1,
  },
  modeTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2D4B8E',
    marginBottom: 5,
  },
  modeSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 10,
  },
  modeDescription: {
    fontSize: 14,
    color: '#333',
    marginBottom: 12,
    lineHeight: 20,
  },
  modeFeatures: {
    marginTop: 8,
  },
  featureText: {
    fontSize: 13,
    color: '#555',
    marginBottom: 4,
  },
});
