import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const App = () => {
  console.log('App component is rendering!');
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>🎉 CritiQuest Web Test</Text>
      <Text style={styles.subtitle}>If you see this, React Native Web is working!</Text>
      <View style={styles.box}>
        <Text style={styles.boxText}>This is a test box</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  box: {
    backgroundColor: '#007AFF',
    padding: 20,
    borderRadius: 10,
    marginTop: 20,
  },
  boxText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default App;