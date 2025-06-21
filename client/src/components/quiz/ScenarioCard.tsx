import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { Question } from '../../../../shared/types/database.types';
import LottieView from 'lottie-react-native';

const { width } = Dimensions.get('window');

interface ScenarioCardProps {
  scenario: Question;
  onChoice: (questionId: string, choices: string[]) => void;
  philosopherContext?: {
    philosopherId: string;
    multiplier: number;
  };
}

interface ConsequencePreview {
  immediate: string;
  longTerm: string;
  ethicalImplication: string;
  philosophicalPerspective: {
    school: string;
    viewpoint: string;
  };
}

export default function ScenarioCard({
  scenario,
  onChoice,
  philosopherContext,
}: ScenarioCardProps) {
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [showConsequences, setShowConsequences] = useState(false);
  const [expandedPerspective, setExpandedPerspective] = useState<string | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(width)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Mock
  const consequences: Record<string, ConsequencePreview> = {
    [scenario.options[0]]: {
      immediate: "Natychmiastowe uratowanie pięciu osób",
      longTerm: "Potencjalne osłabienie moralnej zasady nienaruszalności życia",
      ethicalImplication: "Utylitarystyczne podejście maksymalizujące dobro",
      philosophicalPerspective: {
        school: "Utylitaryzm",
        viewpoint: "Największe dobro dla największej liczby osób uzasadnia działanie",
      },
    },
    [scenario.options[1]]: {
      immediate: "Zachowanie moralnej integralności",
      longTerm: "Utrzymanie uniwersalnej zasady niedziałania przeciwko jednostce",
      ethicalImplication: "Deontologiczne przestrzeganie obowiązku moralnego",
      philosophicalPerspective: {
        school: "Etyka Kantowska",
        viewpoint: "Imperatyw kategoryczny zabrania traktowania człowieka jako środka",
      },
    },
  };

  useEffect(() => {
    // Entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    // Pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const handleChoiceSelect = (choice: string) => {
    setSelectedChoice(choice);
    setShowConsequences(true);

    // Ujawnienie konsekwencji
    Animated.spring(fadeAnim, {
      toValue: 0.8,
      tension: 50,
      friction: 8,
      useNativeDriver: true,
    }).start();
  };

  const handleConfirmChoice = () => {
    if (!selectedChoice) return;
    onChoice(scenario.id, [selectedChoice]);
  };

  const renderPhilosophicalPerspectives = () => {
    return (
      <View style={styles.perspectivesContainer}>
        <Text style={styles.perspectivesTitle}>Perspektywy filozoficzne</Text>
        
        {Object.entries(consequences).map(([choice, consequence]) => (
          <TouchableOpacity
            key={choice}
            style={[
              styles.perspectiveCard,
              expandedPerspective === choice && styles.expandedPerspectiveCard,
            ]}
            onPress={() => setExpandedPerspective(
              expandedPerspective === choice ? null : choice
            )}
            activeOpacity={0.8}
          >
            <View style={styles.perspectiveHeader}>
              <MaterialCommunityIcons 
                name="school" 
                size={20} 
                color="#A78BFA" 
              />
              <Text style={styles.schoolName}>
                {consequence.philosophicalPerspective.school}
              </Text>
              <Ionicons 
                name={expandedPerspective === choice ? "chevron-up" : "chevron-down"} 
                size={20} 
                color="#94A3B8" 
              />
            </View>
            
            {expandedPerspective === choice && (
              <Animated.View style={styles.perspectiveContent}>
                <Text style={styles.perspectiveText}>
                  {consequence.philosophicalPerspective.viewpoint}
                </Text>
                <View style={styles.implicationCard}>
                  <Ionicons name="warning" size={16} color="#F59E0B" />
                  <Text style={styles.implicationText}>
                    {consequence.ethicalImplication}
                  </Text>
                </View>
              </Animated.View>
            )}
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ translateX: slideAnim }],
        },
      ]}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Scenario Header */}
        <View style={styles.scenarioHeader}>
          <LinearGradient
            colors={['rgba(139, 92, 246, 0.1)', 'rgba(167, 139, 250, 0.1)']}
            style={styles.headerGradient}
          >
            <MaterialCommunityIcons name="thought-bubble" size={32} color="#A78BFA" />
            <Text style={styles.scenarioType}>Dylemat etyczny</Text>
          </LinearGradient>
        </View>

        {/* Scenario Opis */}
        <Animated.View 
          style={[
            styles.scenarioCard,
            { transform: [{ scale: pulseAnim }] }
          ]}
        >
          <Text style={styles.scenarioText}>{scenario.text}</Text>
          
          {/* Wizualna reprezentacja konsekwencji */}
          <View style={styles.visualDilemma}>
            <LottieView
              source={require('@/assets/animations/stars.json')}
              autoPlay
              loop
              style={styles.dilemmaAnimation}
            />
          </View>
        </Animated.View>

        {/* Wybory */}
        <View style={styles.choicesContainer}>
          <Text style={styles.choicesTitle}>Co zrobisz?</Text>
          
          {scenario.options.map((option, index) => (
            <TouchableOpacity
              key={option}
              style={[
                styles.choiceCard,
                selectedChoice === option && styles.selectedChoiceCard,
              ]}
              onPress={() => handleChoiceSelect(option)}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={
                  selectedChoice === option
                    ? ['rgba(99, 102, 241, 0.1)', 'rgba(139, 92, 246, 0.1)']
                    : ['transparent', 'transparent']
                }
                style={styles.choiceGradient}
              >
                <View style={styles.choiceHeader}>
                  <Text style={styles.choiceNumber}>Opcja {index + 1}</Text>
                  {selectedChoice === option && (
                    <Ionicons name="checkmark-circle" size={20} color="#6366F1" />
                  )}
                </View>
                <Text style={styles.choiceText}>{option}</Text>
                
                {/* Pokaż preview konsekwencji */}
                {selectedChoice === option && showConsequences && (
                  <Animated.View style={styles.consequencePreview}>
                    <View style={styles.consequenceItem}>
                      <Ionicons name="flash" size={16} color="#F59E0B" />
                      <Text style={styles.consequenceLabel}>Natychmiast:</Text>
                      <Text style={styles.consequenceText}>
                        {consequences[option].immediate}
                      </Text>
                    </View>
                    <View style={styles.consequenceItem}>
                      <Ionicons name="time" size={16} color="#8B5CF6" />
                      <Text style={styles.consequenceLabel}>Długoterminowo:</Text>
                      <Text style={styles.consequenceText}>
                        {consequences[option].longTerm}
                      </Text>
                    </View>
                  </Animated.View>
                )}
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>

        {/* Perspektywy filozoficzne */}
        {renderPhilosophicalPerspectives()}

        {/* Philosopher Helper */}
        {philosopherContext && (
          <View style={styles.philosopherHelper}>
            <LinearGradient
              colors={['rgba(251, 191, 36, 0.1)', 'rgba(245, 158, 11, 0.1)']}
              style={styles.helperGradient}
            >
              <Ionicons name="bulb" size={20} color="#F59E0B" />
              <Text style={styles.helperText}>
                Twój filozof może pomóc ci przemyśleć ten dylemat z perspektywy {philosopherContext.philosopherId}
              </Text>
            </LinearGradient>
          </View>
        )}

        {/* Confirm Button */}
        {selectedChoice && (
          <TouchableOpacity
            style={styles.confirmButton}
            onPress={handleConfirmChoice}
          >
            <LinearGradient
              colors={['#6366F1', '#8B5CF6']}
              style={styles.confirmGradient}
            >
              <Text style={styles.confirmText}>Potwierdź wybór</Text>
              <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>
        )}
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scenarioHeader: {
    marginBottom: 20,
  },
  headerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    justifyContent: 'center',
  },
  scenarioType: {
    fontSize: 18,
    fontWeight: '600',
    color: '#A78BFA',
    marginLeft: 12,
  },
  scenarioCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#334155',
  },
  scenarioText: {
    fontSize: 16,
    color: '#F3F4F6',
    lineHeight: 26,
    marginBottom: 16,
  },
  visualDilemma: {
    alignItems: 'center',
    marginTop: 12,
  },
  dilemmaAnimation: {
    width: 150,
    height: 150,
  },
  choicesContainer: {
    marginBottom: 24,
  },
  choicesTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#F3F4F6',
    marginBottom: 16,
  },
  choiceCard: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  selectedChoiceCard: {
    transform: [{ scale: 1.02 }],
  },
  choiceGradient: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#334155',
  },
  choiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  choiceNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94A3B8',
  },
  choiceText: {
    fontSize: 16,
    color: '#E2E8F0',
    lineHeight: 24,
  },
  consequencePreview: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  consequenceItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  consequenceLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
    marginLeft: 8,
    marginRight: 4,
  },
  consequenceText: {
    fontSize: 12,
    color: '#CBD5E1',
    flex: 1,
  },
  perspectivesContainer: {
    marginBottom: 24,
  },
  perspectivesTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F3F4F6',
    marginBottom: 16,
  },
  perspectiveCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
    overflow: 'hidden',
  },
  expandedPerspectiveCard: {
    borderColor: '#A78BFA',
  },
  perspectiveHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  schoolName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#E2E8F0',
    flex: 1,
    marginLeft: 12,
  },
  perspectiveContent: {
    padding: 16,
    paddingTop: 0,
  },
  perspectiveText: {
    fontSize: 14,
    color: '#CBD5E1',
    lineHeight: 22,
    marginBottom: 12,
  },
  implicationCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F59E0B10',
    padding: 12,
    borderRadius: 8,
  },
  implicationText: {
    fontSize: 13,
    color: '#FEF3C7',
    marginLeft: 8,
    flex: 1,
  },
  philosopherHelper: {
    marginBottom: 24,
  },
  helperGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
  },
  helperText: {
    fontSize: 14,
    color: '#FEF3C7',
    marginLeft: 12,
    flex: 1,
  },
  confirmButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 24,
  },
  confirmGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  confirmText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});