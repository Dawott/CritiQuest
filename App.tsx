import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider as JotaiProvider } from 'jotai';
import MainNavigator from '@/navigation/MainNavigator';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <JotaiProvider>
          <NavigationContainer>
            <MainNavigator />
          </NavigationContainer>
        </JotaiProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

/*import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';

const { width } = Dimensions.get('window');

const App = () => {
  const [currentView, setCurrentView] = useState('home');
  const [userLevel, setUserLevel] = useState(3);
  const [userXP, setUserXP] = useState(1250);
  const [completedCases, setCompletedCases] = useState(7);

  const philosophers = [
    { id: 1, name: 'Sokrates', rarity: 'Legendary', unlocked: true },
    { id: 2, name: 'Arystoteles', rarity: 'Epic', unlocked: true },
    { id: 3, name: 'Kant', rarity: 'Epic', unlocked: true },
    { id: 4, name: 'Nietzsche', rarity: 'Rare', unlocked: false },
    { id: 5, name: 'Kartezjusz', rarity: 'Common', unlocked: true },
  ];

  const casestudies = [
    {
      id: 1,
      title: 'Problem Wagonika',
      difficulty: 'Początkujący',
      topic: 'Etyka',
      completed: true,
      xp: 150,
    },
    {
      id: 2,
      title: 'Statek Tezeusza',
      difficulty: 'Średniozaawansowany',
      topic: 'Ontologia',
      completed: true,
      xp: 200,
    },
    {
      id: 3,
      title: 'Alegoria Jaskini',
      difficulty: 'Zaawansowany',
      topic: 'Epistemologia',
      completed: false,
      xp: 300,
    },
  ];

  const Navigation = () => (
    <View style={styles.navigation}>
      <TouchableOpacity
        style={[styles.navButton, currentView === 'home' && styles.activeNav]}
        onPress={() => setCurrentView('home')}
      >
        <Text style={styles.navText}>Główna</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.navButton, currentView === 'learn' && styles.activeNav]}
        onPress={() => setCurrentView('learn')}
      >
        <Text style={styles.navText}>Ucz się</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.navButton, currentView === 'collection' && styles.activeNav]}
        onPress={() => setCurrentView('collection')}
      >
        <Text style={styles.navText}>Kolekcja</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.navButton, currentView === 'profile' && styles.activeNav]}
        onPress={() => setCurrentView('profile')}
      >
        <Text style={styles.navText}>Profil</Text>
      </TouchableOpacity>
    </View>
  );

  const HomeView = () => (
    <ScrollView style={styles.content}>
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>CritiQuest</Text>
        <Text style={styles.heroSubtitle}>
          Opanuj Myślenie Krytyczne za pomocą Filozofii
        </Text>
        <Text style={styles.heroDescription}>
          Odkrywaj filozoficzne dylematy, zbieraj legendarnych myślicieli i rozwijaj swoje umiejętności rozumowania!
        </Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{userLevel}</Text>
          <Text style={styles.statLabel}>Level</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{userXP}</Text>
          <Text style={styles.statLabel}>Punkty doświadczenia</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{completedCases}</Text>
          <Text style={styles.statLabel}>Rozwiązane Przypadki</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => setCurrentView('learn')}
      >
        <Text style={styles.primaryButtonText}>Zacznij Naukę</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  const LearnView = () => (
    <ScrollView style={styles.content}>
      <Text style={styles.sectionTitle}>Case Studies</Text>
      <Text style={styles.sectionSubtitle}>Interaktywne scenariusze filozoficzne rzucające wyzwanie twojemu myśleniu</Text>

      {casestudies.map((case_study) => (
        <TouchableOpacity key={case_study.id} style={styles.caseCard}>
          <View style={styles.caseHeader}>
            <Text style={styles.caseTitle}>{case_study.title}</Text>
            <View style={[
              styles.difficultyBadge,
              case_study.difficulty === 'Beginner' && styles.beginnerBadge,
              case_study.difficulty === 'Intermediate' && styles.intermediateBadge,
              case_study.difficulty === 'Advanced' && styles.advancedBadge,
            ]}>
              <Text style={styles.badgeText}>{case_study.difficulty}</Text>
            </View>
          </View>
          <Text style={styles.caseTopic}>Temat: {case_study.topic}</Text>
          <Text style={styles.caseXP}>Nagroda: {case_study.xp} XP</Text>
          {case_study.completed && (
            <Text style={styles.completedText}>✓ Skończono</Text>
          )}
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const CollectionView = () => (
    <ScrollView style={styles.content}>
      <Text style={styles.sectionTitle}>Kolekcja Filozofów</Text>
      <Text style={styles.sectionSubtitle}>Zbierz legendarnych myślicieli i odblokuj ich mądrość</Text>

      <View style={styles.philosophersGrid}>
        {philosophers.map((philosopher) => (
          <View
            key={philosopher.id}
            style={[
              styles.philosopherCard,
              !philosopher.unlocked && styles.lockedCard,
            ]}
          >
            <View style={styles.philosopherAvatar}>
              <Text style={styles.avatarText}>
                {philosopher.name.substring(0, 2).toUpperCase()}
              </Text>
            </View>
            <Text style={styles.philosopherName}>{philosopher.name}</Text>
            <View style={[
              styles.rarityBadge,
              philosopher.rarity === 'Legendary' && styles.legendaryBadge,
              philosopher.rarity === 'Epic' && styles.epicBadge,
              philosopher.rarity === 'Rare' && styles.rareBadge,
              philosopher.rarity === 'Common' && styles.commonBadge,
            ]}>
              <Text style={styles.rarityText}>{philosopher.rarity}</Text>
            </View>
            {!philosopher.unlocked && (
              <Text style={styles.lockedText}>🔒</Text>
            )}
          </View>
        ))}
      </View>

      <TouchableOpacity style={styles.gachaButton}>
        <Text style={styles.gachaButtonText}>🎲 Przyzwij Filozofa (1 bilet)</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  const ProfileView = () => (
    <ScrollView style={styles.content}>
      <Text style={styles.sectionTitle}>Twój Postęp</Text>
      
      <View style={styles.profileHeader}>
        <View style={styles.profileAvatar}>
          <Text style={styles.profileAvatarText}>DC</Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>Demo Critic</Text>
          <Text style={styles.profileLevel}>Level {userLevel} Filozofa</Text>
        </View>
      </View>

      <View style={styles.progressSection}>
        <Text style={styles.progressTitle}>Postęp Poziomu</Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: '65%' }]} />
        </View>
        <Text style={styles.progressText}>{userXP}/2000 XP do poziomu {userLevel + 1}</Text>
      </View>

      <View style={styles.achievementsSection}>
        <Text style={styles.achievementsTitle}>Ostatnie Osiągnięcia</Text>
        <View style={styles.achievement}>
          <Text style={styles.achievementIcon}>🏆</Text>
          <View>
            <Text style={styles.achievementName}>Pierwsze Kroki</Text>
            <Text style={styles.achievementDesc}>Ukończ swoje pierwsze studium przypadku</Text>
          </View>
        </View>
        <View style={styles.achievement}>
          <Text style={styles.achievementIcon}>🧠</Text>
          <View>
            <Text style={styles.achievementName}>Głębokie Myślenie</Text>
            <Text style={styles.achievementDesc}>Rozwiąż 5 case studies</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );

  const renderCurrentView = () => {
    switch (currentView) {
      case 'learn':
        return <LearnView />;
      case 'collection':
        return <CollectionView />;
      case 'profile':
        return <ProfileView />;
      default:
        return <HomeView />;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>CritiQuest</Text>
        <Text style={styles.headerSubtitle}>Web Demo</Text>
      </View>
      
      <Navigation />
      
      {renderCurrentView()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#2c3e50',
    padding: 20,
    paddingTop: 40,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#bdc3c7',
    marginTop: 4,
  },
  navigation: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e8ed',
  },
  navButton: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
  },
  activeNav: {
    borderBottomWidth: 3,
    borderBottomColor: '#3498db',
  },
  navText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  hero: {
    alignItems: 'center',
    marginBottom: 30,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2c3e50',
    textAlign: 'center',
    marginBottom: 10,
  },
  heroSubtitle: {
    fontSize: 18,
    color: '#3498db',
    textAlign: 'center',
    marginBottom: 15,
  },
  heroDescription: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 300,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 30,
  },
  statCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  statLabel: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 5,
  },
  primaryButton: {
    backgroundColor: '#3498db',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 10,
  },
  sectionSubtitle: {
    fontSize: 16,
    color: '#7f8c8d',
    marginBottom: 20,
  },
  caseCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    marginBottom: 15,
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  caseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  caseTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    flex: 1,
  },
  difficultyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  beginnerBadge: {
    backgroundColor: '#2ecc71',
  },
  intermediateBadge: {
    backgroundColor: '#f39c12',
  },
  advancedBadge: {
    backgroundColor: '#e74c3c',
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  caseTopic: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 5,
  },
  caseXP: {
    fontSize: 14,
    color: '#3498db',
    fontWeight: '600',
  },
  completedText: {
    fontSize: 14,
    color: '#2ecc71',
    fontWeight: 'bold',
    marginTop: 10,
  },
  philosophersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  philosopherCard: {
    backgroundColor: 'white',
    width: (width - 60) / 2,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 15,
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  lockedCard: {
    opacity: 0.5,
  },
  philosopherAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#3498db',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatarText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  philosopherName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 5,
  },
  rarityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  legendaryBadge: {
    backgroundColor: '#9b59b6',
  },
  epicBadge: {
    backgroundColor: '#e74c3c',
  },
  rareBadge: {
    backgroundColor: '#f39c12',
  },
  commonBadge: {
    backgroundColor: '#95a5a6',
  },
  rarityText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  lockedText: {
    fontSize: 20,
    marginTop: 5,
  },
  gachaButton: {
    backgroundColor: '#9b59b6',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  gachaButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    marginBottom: 20,
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  profileAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#3498db',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
  },
  profileAvatarText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  profileLevel: {
    fontSize: 16,
    color: '#7f8c8d',
    marginTop: 5,
  },
  progressSection: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    marginBottom: 20,
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 15,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#ecf0f1',
    borderRadius: 4,
    marginBottom: 10,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3498db',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  achievementsSection: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  achievementsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 15,
  },
  achievement: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  achievementIcon: {
    fontSize: 24,
    marginRight: 15,
  },
  achievementName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  achievementDesc: {
    fontSize: 14,
    color: '#7f8c8d',
  },
});

export default App;*/