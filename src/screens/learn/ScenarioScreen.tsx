import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import { useAtom } from 'jotai';
import { currentUserAtom } from '@/store/atoms';
import DatabaseService from '@/services/firebase/database.service';
import { Question } from '@/types/database.types';
import { RouteProp } from '@react-navigation/native';
import { LearnStackParamList } from '@/navigation/types';

type ScenarioScreenRouteProp = RouteProp<LearnStackParamList, 'ScenarioScreen'>;

interface ScenarioChoice {
  text: string;
  philosophicalPerspective?: {
    school: string;
    viewpoint: string;
  };
  ethicalImplication?: string;
}

const ScenarioScreen: React.FC = () => {
  const route = useRoute<ScenarioScreenRouteProp>();
  const navigation = useNavigation();
  const { scenarioId } = route.params;
  const [user] = useAtom(currentUserAtom);
  
  const [scenario, setScenario] = useState<Question | null>(null);
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [showPerspectives, setShowPerspectives] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadScenario();
  }, [scenarioId]);

  const loadScenario = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (scenarioId === 'daily') {
        // Generate a daily scenario
        setScenario(generateDailyScenario());
      } else {
        // Try to fetch from database (when you have scenario storage)
        // const scenarioData = await DatabaseService.getScenario(scenarioId);
        // For now, use a mock scenario
        setScenario(generateMockScenario());
      }
    } catch (err) {
      console.error('Error loading scenario:', err);
      setError('Nie udało się załadować scenariusza');
    } finally {
      setLoading(false);
    }
  };

  const generateDailyScenario = (): Question => {
    const scenarios = [
      {
        id: 'daily-trolley',
        text: "Jesteś świadkiem sytuacji: tramwaj wymknął się spod kontroli i pędzi w stronę pięciu pracowników na torach. Możesz przestawić zwrotnicę, kierując tramwaj na boczny tor, gdzie znajduje się jeden pracownik. Wszyscy pracownicy są nieświadomi niebezpieczeństwa i nie mogą się sami uratować.",
        options: [
          "Przestawię zwrotnicę, ratując pięć osób kosztem jednej",
          "Nie zrobię nic, pozwalając wydarzeniom przebiegać naturalnie", 
          "Spróbuję ostrzec wszystkich pracowników"
        ],
        explanation: "To klasyczny dylemat wagonika, który testuje nasze intuicje moralne dotyczące aktywnego vs. pasywnego działania w sytuacjach etycznych.",
        philosophicalContext: "Ten scenariusz ilustruje konflikt między etyką konsekwencjalistyczną (ratowanie większej liczby osób) a etyką deontologiczną (zakaz aktywnego krzywdzenia niewinnych).",
        points: 10
      },
      {
        id: 'daily-cave',
        text: "Odkrywasz, że twoje dotychczasowe przekonania o rzeczywistości mogą być złudzeniem. Masz wybór: pozostać w komfortowym świecie swoich obecnych przekonań czy dążyć do prawdy, która może być bolesna i zmieniać wszystko, co znasz.",
        options: [
          "Wybieram poszukiwanie prawdy, bez względu na konsekwencje",
          "Pozostaję w komfortowym świecie swoich przekonań",
          "Szukam równowagi między prawdą a komfortem psychicznym"
        ],
        explanation: "Inspirowane Platońską alegorią jaskini - dylematem między ignorancją a oświeceniem.",
        philosophicalContext: "Ten wybór dotyczy epistemologii i wartości prawdy w porównaniu z komfortem psychicznym.",
        points: 10
      }
    ];
    
    const randomScenario = scenarios[Math.floor(Math.random() * scenarios.length)];
    
    return {
      ...randomScenario,
      type: 'scenario',
      correctAnswers: [], // Scenarios don't have "correct" answers
    };
  };

  const generateMockScenario = (): Question => {
    return {
      id: 'mock-scenario',
      text: "Jesteś filozofem w starożytnej Grecji. Otrzymujesz propozycję nauczania młodych arystokratów za znaczną opłatą, ale warunkiem jest uczenie tylko tego, co sprzyja ich poglądom politycznym, nawet jeśli nie jest to prawda. Co robisz?",
      type: 'scenario',
      options: [
        "Przyjmuję ofertę - pieniądze pozwolą mi kontynuować badania filozoficzne",
        "Odmawiam - prawda jest ważniejsza niż korzyści materialne",
        "Negocjuję warunki, próbując znaleźć kompromis",
        "Przyjmuję, ale potajemnie uczę prawdy"
      ],
      correctAnswers: [],
      explanation: "Ten dylemat pokazuje napięcie między pragmatyzmem a ideałami filozoficznymi.",
      philosophicalContext: "Scenariusz nawiązuje do debaty między sofistami a Sokratesem o naturze prawdy i roli filozofa w społeczeństwie.",
      points: 15
    };
  };

  const getChoicePerspective = (choice: string): ScenarioChoice => {
    // This would ideally come from your database or be generated
    // For demo purposes, return mock perspectives
    const perspectives: Record<string, ScenarioChoice> = {
      "Przestawię zwrotnicę, ratując pięć osób kosztem jednej": {
        text: choice,
        philosophicalPerspective: {
          school: "Utylitaryzm",
          viewpoint: "Maksymalizacja dobra dla największej liczby osób jest najważniejsza. Ratowanie pięciu osób kosztem jednej to oczywisty wybór."
        },
        ethicalImplication: "Akceptujesz odpowiedzialność za bezpośrednie działanie powodujące śmierć."
      },
      "Nie zrobię nic, pozwalając wydarzeniom przebiegać naturalnie": {
        text: choice,
        philosophicalPerspective: {
          school: "Etyka Kantowska", 
          viewpoint: "Nie wolno traktować człowieka tylko jako środka do celu. Aktywne zabijanie jednej osoby dla ratowania innych jest moralnie niedopuszczalne."
        },
        ethicalImplication: "Zachowujesz czystość moralną, ale ponosisz część odpowiedzialności za bierne przyzwolenie."
      }
    };
    
    return perspectives[choice] || { text: choice };
  };

  const handleChoiceSelect = (choice: string) => {
    setSelectedChoice(choice);
    setShowPerspectives(true);
  };

  const handleCompleteScenario = () => {
    if (!selectedChoice) {
      Alert.alert("Wybierz opcję", "Musisz wybrać jedną z opcji przed zakończeniem scenariusza.");
      return;
    }

    // Here you would typically save the user's choice and any insights
    Alert.alert(
      "Scenariusz ukończony!",
      "Twój wybór został zapisany. Każda decyzja pokazuje różne aspekty myślenia filozoficznego.",
      [
        {
          text: "Kontynuuj",
          onPress: () => navigation.goBack()
        }
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.loadingText}>Ładowanie scenariusza...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !scenario) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
          <Text style={styles.errorText}>{error || 'Scenariusz nie został znaleziony'}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.retryText}>Wróć</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <LinearGradient
            colors={['rgba(139, 92, 246, 0.1)', 'rgba(167, 139, 250, 0.05)']}
            style={styles.headerGradient}
          >
            <MaterialCommunityIcons name="drama-masks" size={32} color="#8B5CF6" />
            <Text style={styles.headerTitle}>Dylemat Filozoficzny</Text>
            <Text style={styles.headerSubtitle}>Sprawdź swoje wartości</Text>
          </LinearGradient>
        </View>

        {/* Scenario Description */}
        <View style={styles.scenarioCard}>
          <Text style={styles.scenarioText}>{scenario.text}</Text>
          
          {scenario.philosophicalContext && (
            <View style={styles.contextCard}>
              <View style={styles.contextHeader}>
                <Ionicons name="library-outline" size={20} color="#F59E0B" />
                <Text style={styles.contextTitle}>Kontekst filozoficzny</Text>
              </View>
              <Text style={styles.contextText}>{scenario.philosophicalContext}</Text>
            </View>
          )}
        </View>

        {/* Choices */}
        <View style={styles.choicesSection}>
          <Text style={styles.choicesTitle}>Co zrobisz?</Text>
          
          {scenario.options.map((option, index) => (
            <TouchableOpacity
              key={option}
              style={[
                styles.choiceCard,
                selectedChoice === option && styles.selectedChoiceCard,
              ]}
              onPress={() => handleChoiceSelect(option)}
            >
              <View style={styles.choiceContent}>
                <View style={styles.choiceNumber}>
                  <Text style={styles.choiceNumberText}>{index + 1}</Text>
                </View>
                <Text style={[
                  styles.choiceText,
                  selectedChoice === option && styles.selectedChoiceText
                ]}>
                  {option}
                </Text>
                {selectedChoice === option && (
                  <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Philosophical Perspective */}
        {showPerspectives && selectedChoice && (
          <View style={styles.perspectiveSection}>
            <Text style={styles.perspectiveTitle}>Perspektywa filozoficzna</Text>
            
            {(() => {
              const perspective = getChoicePerspective(selectedChoice);
              return (
                <View style={styles.perspectiveCard}>
                  {perspective.philosophicalPerspective && (
                    <>
                      <View style={styles.schoolHeader}>
                        <MaterialCommunityIcons name="school" size={20} color="#8B5CF6" />
                        <Text style={styles.schoolName}>
                          {perspective.philosophicalPerspective.school}
                        </Text>
                      </View>
                      <Text style={styles.viewpointText}>
                        {perspective.philosophicalPerspective.viewpoint}
                      </Text>
                    </>
                  )}
                  
                  {perspective.ethicalImplication && (
                    <View style={styles.implicationCard}>
                      <Ionicons name="warning" size={16} color="#F59E0B" />
                      <Text style={styles.implicationText}>
                        <Text style={styles.implicationLabel}>Implikacje: </Text>
                        {perspective.ethicalImplication}
                      </Text>
                    </View>
                  )}
                </View>
              );
            })()}
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Action Button */}
      <View style={styles.actionContainer}>
        <TouchableOpacity 
          style={[
            styles.completeButton,
            !selectedChoice && styles.disabledButton
          ]}
          onPress={handleCompleteScenario}
          disabled={!selectedChoice}
        >
          <Text style={[
            styles.completeButtonText,
            !selectedChoice && styles.disabledButtonText
          ]}>
            {selectedChoice ? 'Zakończ scenariusz' : 'Wybierz odpowiedź'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    color: '#94A3B8',
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    gap: 16,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 16,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    margin: 20,
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  headerGradient: {
    padding: 24,
    alignItems: 'center',
  },
  headerTitle: {
    color: '#F3F4F6',
    fontSize: 24,
    fontWeight: '700',
    marginTop: 12,
  },
  headerSubtitle: {
    color: '#9CA3AF',
    fontSize: 14,
    marginTop: 4,
  },
  scenarioCard: {
    backgroundColor: '#1F2937',
    margin: 20,
    marginTop: 0,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#374151',
  },
  scenarioText: {
    color: '#F3F4F6',
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 16,
  },
  contextCard: {
    backgroundColor: '#374151',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  contextHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  contextTitle: {
    color: '#F3F4F6',
    fontSize: 14,
    fontWeight: '600',
  },
  contextText: {
    color: '#D1D5DB',
    fontSize: 14,
    lineHeight: 20,
  },
  choicesSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  choicesTitle: {
    color: '#F3F4F6',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
  choiceCard: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  selectedChoiceCard: {
    borderColor: '#10B981',
    backgroundColor: '#1F2937',
  },
  choiceContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  choiceNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
  },
  choiceNumberText: {
    color: '#D1D5DB',
    fontSize: 12,
    fontWeight: '600',
  },
  choiceText: {
    color: '#D1D5DB',
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  selectedChoiceText: {
    color: '#F3F4F6',
    fontWeight: '500',
  },
  perspectiveSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  perspectiveTitle: {
    color: '#F3F4F6',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  perspectiveCard: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#8B5CF6',
  },
  schoolHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  schoolName: {
    color: '#8B5CF6',
    fontSize: 16,
    fontWeight: '600',
  },
  viewpointText: {
    color: '#D1D5DB',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  implicationCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#374151',
    borderRadius: 8,
    padding: 12,
  },
  implicationText: {
    color: '#D1D5DB',
    fontSize: 12,
    lineHeight: 16,
    flex: 1,
  },
  implicationLabel: {
    fontWeight: '600',
    color: '#F59E0B',
  },
  bottomPadding: {
    height: 20,
  },
  actionContainer: {
    padding: 20,
    paddingTop: 16,
    backgroundColor: '#1F2937',
    borderTopWidth: 1,
    borderTopColor: '#374151',
  },
  completeButton: {
    backgroundColor: '#6366F1',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#374151',
  },
  completeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButtonText: {
    color: '#9CA3AF',
  },
});

export default ScenarioScreen;