import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { Alert, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import GameScreen from './GameScreen';

export default function App() {
  const [screen, setScreen] = useState('home'); // 'home' or 'game'

  const handleStartGame = () => {
    setScreen('game');
  };

  const handleInstructions = () => {
    Alert.alert(
      'How to Play',
      'Move your ship to dodge enemies.\nShoot to destroy enemy ships.\nSurvive as long as you can!'
    );
  };

  if (screen === 'game') {
    return <GameScreen />;
  }

  return (
    <LinearGradient colors={['#05070f', '#0a0e27', '#141b3d']} style={styles.container}>
      <StatusBar barStyle="light-content" />

      <Text style={styles.rocket}>🚀</Text>

      <Text style={styles.title}>Galaxy Defender</Text>
      <Text style={styles.subtitle}>Protect the Galaxy. Destroy Enemy Ships.</Text>

      <View style={styles.scoreCard}>
        <Text style={styles.scoreLabel}>HIGH SCORE</Text>
        <Text style={styles.scoreValue}>0</Text>
      </View>

      <TouchableOpacity style={styles.startButton} onPress={handleStartGame} activeOpacity={0.8}>
        <Text style={styles.startButtonText}>Start Game</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.instructionsButton} onPress={handleInstructions} activeOpacity={0.8}>
        <Text style={styles.instructionsButtonText}>Instructions</Text>
      </TouchableOpacity>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  rocket: {
    fontSize: 60,
    marginBottom: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 1,
    textShadowColor: '#4dabf7',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 15,
  },
  subtitle: {
    fontSize: 13,
    color: '#8b96ab',
    marginTop: 8,
    marginBottom: 30,
    textAlign: 'center',
  },
  scoreCard: {
    backgroundColor: '#141b3d',
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 50,
    alignItems: 'center',
    marginBottom: 40,
    borderWidth: 1,
    borderColor: '#2a3a63',
    shadowColor: '#4dabf7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  scoreLabel: {
    color: '#6c7a94',
    fontSize: 12,
    letterSpacing: 2,
    marginBottom: 4,
  },
  scoreValue: {
    color: '#4dabf7',
    fontSize: 34,
    fontWeight: '900',
  },
  startButton: {
    backgroundColor: '#4dabf7',
    paddingVertical: 16,
    paddingHorizontal: 60,
    borderRadius: 30,
    marginBottom: 16,
    shadowColor: '#4dabf7',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 15,
    elevation: 8,
  },
  startButtonText: {
    color: '#05070f',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
  },
  instructionsButton: {
    paddingVertical: 14,
    paddingHorizontal: 50,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: '#3d4a6b',
  },
  instructionsButtonText: {
    color: '#a5b1c2',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 1,
  },
});