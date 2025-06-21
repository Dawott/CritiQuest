import React, { useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { PhilosopherCard } from '../../../client/src/components/philosophers/PhilosopherCard';
import { LessonCard } from '../../../client/src/components/learning/LessonCard';
import { Button } from '../../../client/src/components/common/Button';

type ComponentExample = {
  name: string;
  component: React.ReactNode;
};
export const DevMenu: React.FC = () => {
  const [selectedComponent, setSelectedComponent] = useState<string>('');

  const components: ComponentExample[] = [
    {
      name: 'PhilosopherCard - Common',
      component: (
        <PhilosopherCard
          philosopher={{
            name: 'Diogenes',
            era: 'Grecja Starożytna',
            school: 'Cynizm',
            rarity: 'common',
            baseStats: {
              logic: 60,
              wisdom: 70,
              rhetoric: 40,
              influence: 50,
              originality: 90,
              
            },
            description: 'Twórca szkoły cynicznej',
            imageUrl: './assets/Diogenes.jpg',
            quotes: ['Jestem obywatelem świata'],
            specialAbility: {
              name: 'Człowiek Platona',
              description: 'Obal pierwszą możliwą definicję',
              effect: '+20% do etyki, -50% do logiki',
            },
          }}
          isOwned={true}
          level={5}
        />
      ),
    },
    {
      name: 'PhilosopherCard - Legendary Locked',
      component: (
        <PhilosopherCard
          philosopher={{
            name: 'Sokrates',
            era: 'Grecja Starożytna',
            school: 'Sokratyzm',
            rarity: 'legendary',
            baseStats: {
              logic: 95,
              wisdom: 100,
              rhetoric: 85,
              influence: 98,
              originality: 70,              
            },
            description: 'Wie, że nic nie wie',
            imageUrl: './assets/Socrates.jpg',
            quotes: ['Οἶδα οὐδὲν εἰδώς'],
            specialAbility: {
              name: 'Metoda Sokratejska',
              description: 'Ujawnij prawdę',
              effect: '+50% do pytań w debatach',
            },
          }}
          isOwned={false}
        />
      ),
    },
    {
      name: 'LessonCard - Available',
      component: (
        <LessonCard
          lesson={{
            title: 'Wprowadzenie do Etyki',
            description: 'Zbadaj podstawy moralności i wartościowania etycznego',
            stage: 'introduction',
            order: 1,
            difficulty: 'beginner',
            estimatedTime: 15,
            philosophicalConcepts: ['Etyka', 'Moralność', 'Wartościowanie'],
            content: { sections: [] },
            quiz: 'quiz-001',
            rewards: {
              experience: 100,
              gachaTickets: 2,
            },
          }}
          progress={0}
          isLocked={false}
          onPress={() => console.log('Klik Lekcji')}
        />
      ),
    },
    {
      name: 'Warianty przycisków',
      component: (
        <View style={{ gap: 10 }}>
          <Button title="Primary Button" onPress={() => {}} variant="primary" />
          <Button title="Secondary Button" onPress={() => {}} variant="secondary" />
          <Button title="Disabled Button" onPress={() => {}} disabled />
        </View>
      ),
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Component Showcase</Text>
      <ScrollView style={styles.menu}>
        {components.map((comp) => (
          <TouchableOpacity
            key={comp.name}
            style={[
              styles.menuItem,
              selectedComponent === comp.name && styles.menuItemActive,
            ]}
            onPress={() => setSelectedComponent(comp.name)}
          >
            <Text style={styles.menuText}>{comp.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <View style={styles.preview}>
        {selectedComponent ? (
          components.find((c) => c.name === selectedComponent)?.component
        ) : (
          <Text style={styles.placeholder}>Select a component to preview</Text>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#F3F4F6',
    padding: 16,
    textAlign: 'center',
  },
  menu: {
    maxHeight: 200,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  menuItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
  },
  menuItemActive: {
    backgroundColor: '#1F2937',
  },
  menuText: {
    color: '#D1D5DB',
    fontSize: 16,
  },
  preview: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholder: {
    color: '#6B7280',
    fontSize: 16,
  },
});

export default DevMenu;