import GameModeModal, { GameMode } from '@/components/GameModeModal';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

export default function QuizMainScreen() {
  const [modalVisible, setModalVisible] = useState(false);

  const handleModeSelect = (mode: GameMode) => {
    // Navigate to specific mode screen
    switch (mode) {
      case 'challenge':
        router.push('/quiz/challenge');
        break;
      case 'timeAttack':
        router.push('/quiz/time-attack');
        break;
      default:
        console.log('Mode not implemented yet:', mode);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText style={styles.title}>Biblical Trivia</ThemedText>
      
      <Pressable 
        style={styles.playButton} 
        onPress={() => setModalVisible(true)}
      >
        <ThemedText style={styles.playButtonText}>Start Game</ThemedText>
      </Pressable>

      <GameModeModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSelectMode={handleModeSelect}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 40,
    textAlign: 'center',
  },
  playButton: {
    backgroundColor: '#2D4B8E',
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 10,
  },
  playButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
