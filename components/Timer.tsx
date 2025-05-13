// components/Timer.tsx
import React, { useEffect, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

interface TimerProps {
  seconds: number;
  onTimeUp: () => void;
  isActive: boolean;
}

export default function Timer({ seconds, onTimeUp, isActive }: TimerProps) {
  const [timeLeft, setTimeLeft] = useState(seconds);
  const [animatedValue] = useState(new Animated.Value(1));

  useEffect(() => {
    setTimeLeft(seconds);
    animatedValue.setValue(1);
  }, [seconds]);

  useEffect(() => {
    if (!isActive) return;
    
    if (timeLeft <= 0) {
      onTimeUp();
      return;
    }

    const timerId = setTimeout(() => {
      setTimeLeft(timeLeft - 1);
      
      // Animar el progreso del círculo
      const progress = (timeLeft - 1) / seconds;
      Animated.timing(animatedValue, {
        toValue: progress,
        duration: 100,
        useNativeDriver: false,
      }).start();
      
    }, 1000);

    return () => clearTimeout(timerId);
  }, [timeLeft, onTimeUp, isActive, seconds, animatedValue]);

  // Determinar color según tiempo restante
  const getTimerColor = () => {
    const percentage = timeLeft / seconds;
    if (percentage > 0.6) return '#28a745'; // Verde
    if (percentage > 0.3) return '#ffc107'; // Amarillo
    return '#dc3545'; // Rojo
  };

  // Animar el círculo de progreso
  const circumference = 2 * Math.PI * 30; // radio de 30
  const strokeDashoffset = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
  });

  return (
    <View style={styles.container}>
      <View style={styles.timerCircle}>
        {/* Círculo de fondo */}
        <View style={styles.circleBackground} />
        
        {/* Círculo de progreso animado */}
        <Animated.View
          style={[
            styles.circleProgress,
            {
              transform: [{ rotate: '-90deg' }],
            },
          ]}
        >
          <Animated.View
            style={[
              styles.progressRing,
              {
                borderColor: getTimerColor(),
                borderWidth: 4,
                borderRadius: 32,
                width: 64,
                height: 64,
                transform: [{ rotate: '90deg' }],
              },
            ]}
          />
        </Animated.View>
        
        {/* Número del tiempo */}
        <Text style={[styles.timerText, { color: getTimerColor() }]}>
          {timeLeft}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerCircle: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  circleBackground: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f0f0f0',
    borderWidth: 4,
    borderColor: '#e0e0e0',
  },
  circleProgress: {
    position: 'absolute',
    width: 64,
    height: 64,
  },
  progressRing: {
    position: 'absolute',
  },
  timerText: {
    fontSize: 24,
    fontWeight: 'bold',
    position: 'absolute',
  },
});