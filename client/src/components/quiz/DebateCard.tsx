//import { AIService } from 'server/src/services/ai.service';
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
} from 'react-native';
import { DebatePhilosopher } from '../../hooks/selectedPhilosophers';
import { Philosopher, Rarity } from '../../../../shared/types/database.types';

//const { width, height } = Dimensions.get('window');

// Mock struktur
interface DebateArgument {
  id: string;
  text: string;
  philosophical_basis: string;
  strength_against: string[];
  weakness_against: string[];
  school_bonus: string[];
  conviction_power: number;
}

interface DebateTopic {
  id: string;
  title: string;
  context: string;
  question: string;
  schools_involved: string[];
}

interface DebateCardProps {
  topic: DebateTopic;
  userPhilosophers: DebatePhilosopher[];
  opponentPhilosophers: DebatePhilosopher[];
  onDebateComplete: (result: DebateResult) => void;
}

interface DebateResult {
  winner: 'user' | 'opponent';
  totalRounds: number;
  conviction_score: number;
  learning_insights: string[];
  philosophical_growth: { concept: string; understanding: number }[];
}

interface DebateState {
  currentRound: number;
  maxRounds: number;
  userConviction: number;
  opponentConviction: number;
  currentSpeaker: 'user' | 'opponent';
  selectedArgument: DebateArgument | null;
  availableArguments: DebateArgument[];
  debateHistory: Array<{
    round: number;
    speaker: 'user' | 'opponent';
    argument: DebateArgument;
    effectiveness: number;
    audience_reaction: 'convinced' | 'neutral' | 'skeptical';
  }>;
}

const DebateCard: React.FC<DebateCardProps> = ({
  topic,
  userPhilosophers,
  opponentPhilosophers,
  onDebateComplete,
}) => {
  const [debateState, setDebateState] = useState<DebateState>({
    currentRound: 1,
    maxRounds: 5,
    userConviction: 50,
    opponentConviction: 50,
    currentSpeaker: 'user',
    selectedArgument: null,
    availableArguments: [],
    debateHistory: [],
  });

  const [showArgumentSelection, setShowArgumentSelection] = useState(false);
  const [animatingBattle, setAnimatingBattle] = useState(false);
  const [showPhilosophyInsight, setShowPhilosophyInsight] = useState(false);

  // Animacje
  const userConvictionAnim = useRef(new Animated.Value(50)).current;
  const opponentConvictionAnim = useRef(new Animated.Value(50)).current;
  const battleFlashAnim = useRef(new Animated.Value(0)).current;
  const philosopherShakeAnim = useRef(new Animated.Value(0)).current;

const getDebateStats = (philosopher: DebatePhilosopher) => {
    return {
      logic: philosopher.baseStats.logic,
      ethics: philosopher.baseStats.ethics,
      metaphysics: philosopher.baseStats.metaphysics,
      epistemology: philosopher.baseStats.epistemology,
      rhetoric: philosopher.rhetoric || Math.round((philosopher.baseStats.language + philosopher.baseStats.social) / 2),
    };
  };

  const getAvatar = (philosopher: DebatePhilosopher) => {
    return philosopher.avatar || '🏛️';
  };

  const getSignatureArgument = (philosopher: DebatePhilosopher) => {
    return philosopher.signature_argument || philosopher.specialAbility.name || 'Philosophical argument';
  };

//TBD - AI service
/*
 const generateArguments = async (
  topic: DebateTopic,
  userPhilosophers: Philosopher[],
  difficulty: DifficultyLevel
) => {
  return AIService.generatePhilosophicalArguments({
    topic: topic.question,
    schools: userPhilosophers.map(p => p.school),
    difficulty,
    historical_context: topic.context
  });
};*/

  // Mock debata
  const mockArguments: DebateArgument[] = [
    {
      id: 'utilitarian_1',
      text: "Należy działać tak, aby zmaksymalizować szczęście największej liczby ludzi. To jedyne racjonalne kryterium moralności.",
      philosophical_basis: "Utylitaryzm Benthama - zasada użyteczności",
      strength_against: ['deontologia', 'egotyzm'],
      weakness_against: ['etyka_cnót', 'egzystencjalizm'],
      school_bonus: ['utylitaryzm', 'konsekwencjalizm'],
      conviction_power: 15,
    },
    {
      id: 'deontological_1', 
      text: "Niektóre działania są z natury słuszne lub niesłuszne, niezależnie od konsekwencji. Imperatyw kategoryczny nie może być złamany.",
      philosophical_basis: "Etyka obowiązku Kanta",
      strength_against: ['utylitaryzm', 'relatywizm'],
      weakness_against: ['pragmatyzm', 'utylitaryzm'],
      school_bonus: ['deontologia', 'idealizm_niemiecki'],
      conviction_power: 18,
    },
    {
      id: 'virtue_ethics_1',
      text: "Zamiast skupiać się na działaniach, powinniśmy rozwijać cnoty charakteru. Człowiek cnotliwy naturalnie postąpi słusznie.",
      philosophical_basis: "Etyka cnót Arystotelesa",
      strength_against: ['nihilizm', 'relatywizm'],
      weakness_against: ['utylitaryzm', 'deontologia'],
      school_bonus: ['arystotelizm', 'etyka_cnót'],
      conviction_power: 12,
    },
  ];

  useEffect(() => {
    // Inicjalizuj bazując na posiadanych filozofach
    setDebateState(prev => ({
      ...prev,
      availableArguments: mockArguments.filter(arg => 
        userPhilosophers.some(phil => arg.school_bonus.includes(phil.school.toLowerCase()))
      ),
    }));
  }, [userPhilosophers]);

  const handleArgumentSelect = (argument: DebateArgument) => {
    setDebateState(prev => ({ ...prev, selectedArgument: argument }));
    setShowArgumentSelection(false);
    executeDebateRound(argument);
  };

  const executeDebateRound = async (userArgument: DebateArgument) => {
    setAnimatingBattle(true);

    // Kalkulacja argumentu
    const opponentPhil = opponentPhilosophers[0];
    const userPhil = userPhilosophers[0];
    
    // Matchup szkół
    let effectiveness = userArgument.conviction_power;
    
    // bonus za pasujące szkoły
    if (userArgument.school_bonus.includes(userPhil.school.toLowerCase())) {
      effectiveness += 5;
    }
    
    // Kontrargument
    if (userArgument.strength_against.includes(opponentPhil.school.toLowerCase())) {
      effectiveness += 8;
    }
    if (userArgument.weakness_against.includes(opponentPhil.school.toLowerCase())) {
      effectiveness -= 6;
    }

    const userStats = getDebateStats(userPhil);
    effectiveness += Math.round(userStats.rhetoric / 10);
    
    // Dodaj losowość
    effectiveness += Math.random() * 10 - 5;
    
    const convictionChange = Math.max(-15, Math.min(15, effectiveness - 12));
    
    // Battle effecty
    Animated.sequence([
      Animated.timing(battleFlashAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: false,
      }),
      Animated.timing(battleFlashAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }),
    ]).start();

    // Crit
    if (convictionChange > 5) {
      Animated.sequence([
        Animated.timing(philosopherShakeAnim, {
          toValue: 10,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(philosopherShakeAnim, {
          toValue: -10,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(philosopherShakeAnim, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
    }

    // Przekonanie - update wyników
    const newUserConviction = Math.max(0, Math.min(100, debateState.userConviction + convictionChange));
    const newOpponentConviction = Math.max(0, Math.min(100, debateState.opponentConviction - convictionChange));
    
    // Animacja przekonania
    Animated.parallel([
      Animated.timing(userConvictionAnim, {
        toValue: newUserConviction,
        duration: 1000,
        useNativeDriver: false,
      }),
      Animated.timing(opponentConvictionAnim, {
        toValue: newOpponentConviction,
        duration: 1000,
        useNativeDriver: false,
      }),
    ]).start();

    // Generuj kontrargument
    const counterArgument = generateCounterArgument(userArgument, opponentPhil);
    
    // Update state
    setDebateState(prev => ({
      ...prev,
      currentRound: prev.currentRound + 1,
      userConviction: newUserConviction,
      opponentConviction: newOpponentConviction,
      currentSpeaker: 'opponent',
      debateHistory: [
        ...prev.debateHistory,
        {
          round: prev.currentRound,
          speaker: 'user',
          argument: userArgument,
          effectiveness: convictionChange,
          audience_reaction: convictionChange > 5 ? 'convinced' : convictionChange < -5 ? 'skeptical' : 'neutral',
        },
      ],
    }));

    setTimeout(() => {
      setAnimatingBattle(false);
      setShowPhilosophyInsight(true);
      
      // Pokaż insight
      setTimeout(() => {
        setShowPhilosophyInsight(false);
        
        // Sprawdź czy zakończyć debatę
        if (debateState.currentRound >= debateState.maxRounds || 
            newUserConviction <= 0 || newOpponentConviction <= 0) {
          endDebate(newUserConviction, newOpponentConviction);
        } else {
          // Kontynuuj do następnej rundy
          setDebateState(prev => ({ ...prev, currentSpeaker: 'user' }));
        }
      }, 3000);
    }, 1500);
  };

  const generateCounterArgument = (userArg: DebateArgument, opponent: Philosopher): DebateArgument => {
    // Mock
    const counterArgs = {
      'utilitarian_1': "Ale czy rzeczywiście można zmierzyć i porównać szczęście różnych ludzi? Utylitaryzm prowadzi do tyranii większości!",
      'deontological_1': "Te 'absolutne' zasady są zbyt sztywne dla złożoności rzeczywistego świata. Czy Kant pozwoliłby skłamać, żeby uratować niewinne życie?",
      'virtue_ethics_1': "Ale któż ustali, jakie cnoty są właściwe? Różne kultury cenią różne cechy - to prowadzi do relatywizmu moralnego.",
    };

    return {
      id: `counter_${userArg.id}`,
      text: counterArgs[userArg.id as keyof typeof counterArgs] || "Twój argument ma fundamentalne błędy logiczne...",
      philosophical_basis: `Krytyka z perspektywy ${opponent.school}`,
      strength_against: userArg.school_bonus,
      weakness_against: [],
      school_bonus: [opponent.school.toLowerCase()],
      conviction_power: 14,
    };
  };

  const endDebate = (finalUserScore: number, finalOpponentScore: number) => {
    const result: DebateResult = {
      winner: finalUserScore > finalOpponentScore ? 'user' : 'opponent',
      totalRounds: debateState.currentRound,
      conviction_score: finalUserScore,
      learning_insights: [
        "Poznałeś różnice między etyką konsekwencjalistyczną a deontologiczną",
        "Zrozumiałeś, jak argumenty filozoficzne mogą się wzajemnie zwalczać",
        "Doświadczyłeś siły retoryki w filozoficznej debacie",
      ],
      philosophical_growth: [
        { concept: "Argumentacja etyczna", understanding: 15 },
        { concept: "Szkoły filozoficzne", understanding: 10 },
      ],
    };
    
    onDebateComplete(result);
  };

  const renderPhilosopher = (philosopher: DebatePhilosopher, isUser: boolean, conviction: number) => (
    <Animated.View 
      style={[
        styles.philosopherContainer,
        { transform: [{ translateX: isUser ? 0 : philosopherShakeAnim }] }
      ]}
    >
      <View style={[styles.philosopherAvatar, styles[`${philosopher.rarity}Border`]]}>
        <Text style={styles.philosopherEmoji}>{philosopher.avatar || '🏛️'}</Text>
      </View>
      <Text style={styles.philosopherName}>{philosopher.name}</Text>
      <Text style={styles.philosopherSchool}>{philosopher.school}</Text>
      
      {/* Conviction Bar */}
      <View style={styles.convictionContainer}>
        <Text style={styles.convictionLabel}>Przekonanie publiczności</Text>
        <View style={styles.convictionBar}>
          <Animated.View 
            style={[
              styles.convictionFill,
              { 
                width: isUser 
                  ? userConvictionAnim.interpolate({
                      inputRange: [0, 100],
                      outputRange: ['0%', '100%'],
                      extrapolate: 'clamp',
                    })
                  : opponentConvictionAnim.interpolate({
                      inputRange: [0, 100],
                      outputRange: ['0%', '100%'],
                      extrapolate: 'clamp',
                    }),
                backgroundColor: isUser ? '#10B981' : '#EF4444',
              }
            ]} 
          />
        </View>
        <Text style={styles.convictionValue}>{Math.round(conviction)}%</Text>
      </View>
    </Animated.View>
  );

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Topic Header */}
        <View style={styles.topicContainer}>
          <Text style={styles.topicTitle}>{topic.title}</Text>
          <Text style={styles.topicQuestion}>{topic.question}</Text>
          <Text style={styles.topicContext}>{topic.context}</Text>
        </View>

        {/* Battle Arena */}
        <Animated.View 
          style={[
            styles.battleArena,
            {
              backgroundColor: battleFlashAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['rgba(31, 41, 55, 1)', 'rgba(99, 102, 241, 0.3)'],
              }),
            },
          ]}
        >
          <View style={styles.philosophersRow}>
            {userPhilosophers.length > 0 && renderPhilosopher(userPhilosophers[0], true, debateState.userConviction)}
            
            <View style={styles.vsContainer}>
              <Text style={styles.vsText}>VS</Text>
              <Text style={styles.roundText}>Runda {debateState.currentRound}/{debateState.maxRounds}</Text>
            </View>
            
            {opponentPhilosophers.length > 0 && renderPhilosopher(opponentPhilosophers[0], false, debateState.opponentConviction)}
          </View>
        </Animated.View>

        {/* Tura */}
        {!animatingBattle && (
          <View style={styles.turnIndicator}>
            <Text style={styles.turnText}>
              {debateState.currentSpeaker === 'user' 
                ? "Twoja kolej! Wybierz argument:" 
                : "Przeciwnik przygotowuje odpowiedź..."}
            </Text>
          </View>
        )}

        {/* Wybór Argumentu */}
        {debateState.currentSpeaker === 'user' && !animatingBattle && (
          <View style={styles.argumentsContainer}>
            <Text style={styles.argumentsTitle}>Dostępne argumenty:</Text>
            {debateState.availableArguments.map((argument) => (
              <TouchableOpacity
                key={argument.id}
                style={styles.argumentCard}
                onPress={() => handleArgumentSelect(argument)}
                activeOpacity={0.8}
              >
                <View style={styles.argumentHeader}>
                  <Text style={styles.argumentBasis}>{argument.philosophical_basis}</Text>
                  <View style={styles.powerBadge}>
                    <Text style={styles.powerText}>⚡{argument.conviction_power}</Text>
                  </View>
                </View>
                <Text style={styles.argumentText}>{argument.text}</Text>
                <View style={styles.argumentFooter}>
                  <Text style={styles.strengthText}>
                    Skuteczne przeciwko: {argument.strength_against.join(', ')}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Insight Modal */}
        {showPhilosophyInsight && (
          <View style={styles.insightOverlay}>
            <View style={styles.insightCard}>
              <Text style={styles.insightTitle}>💡 Filozoficzny wgląd</Text>
              <Text style={styles.insightText}>
                Ten argument reprezentuje konflikt między {userPhilosophers[0].school} a {opponentPhilosophers[0].school}.
                Każda szkoła ma swoje mocne i słabe strony w różnych kontekstach etycznych.
              </Text>
            </View>
          </View>
        )}

        {/* Historia debat */}
        {debateState.debateHistory.length > 0 && (
          <View style={styles.historyContainer}>
            <Text style={styles.historyTitle}>Historia debaty:</Text>
            {debateState.debateHistory.map((entry, index) => (
              <View key={index} style={styles.historyEntry}>
                <View style={styles.historyHeader}>
                  <Text style={styles.historyRound}>Runda {entry.round}</Text>
                  <Text style={[
                    styles.historyReaction,
                    entry.audience_reaction === 'convinced' && styles.positive,
                    entry.audience_reaction === 'skeptical' && styles.negative,
                  ]}>
                    {entry.audience_reaction === 'convinced' ? '👏' : 
                     entry.audience_reaction === 'skeptical' ? '🤔' : '😐'}
                  </Text>
                </View>
                <Text style={styles.historyArgument}>{entry.argument.text}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  topicContainer: {
    padding: 20,
    backgroundColor: '#1E293B',
    marginBottom: 16,
    borderRadius: 12,
    margin: 16,
  },
  topicTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F3F4F6',
    marginBottom: 8,
  },
  topicQuestion: {
    fontSize: 16,
    color: '#A78BFA',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  topicContext: {
    fontSize: 14,
    color: '#9CA3AF',
    lineHeight: 20,
  },
  battleArena: {
    margin: 16,
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#6366F1',
  },
  philosophersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  philosopherContainer: {
    alignItems: 'center',
    flex: 1,
  },
  philosopherAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    marginBottom: 8,
  },
  commonBorder: { borderColor: '#9CA3AF' },
  rareBorder: { borderColor: '#60A5FA' },
  epicBorder: { borderColor: '#A78BFA' },
  legendaryBorder: { borderColor: '#FCD34D' },
  philosopherEmoji: {
    fontSize: 40,
  },
  philosopherName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F3F4F6',
    textAlign: 'center',
  },
  philosopherSchool: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 12,
  },
  convictionContainer: {
    width: '100%',
    alignItems: 'center',
  },
  convictionLabel: {
    fontSize: 10,
    color: '#6B7280',
    marginBottom: 4,
  },
  convictionBar: {
    width: '100%',
    height: 8,
    backgroundColor: '#374151',
    borderRadius: 4,
    overflow: 'hidden',
  },
  convictionFill: {
    height: '100%',
    borderRadius: 4,
  },
  convictionValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F3F4F6',
    marginTop: 4,
  },
  vsContainer: {
    alignItems: 'center',
    marginHorizontal: 20,
  },
  vsText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#EF4444',
  },
  roundText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
  turnIndicator: {
    margin: 16,
    padding: 16,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    alignItems: 'center',
  },
  turnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6366F1',
  },
  argumentsContainer: {
    margin: 16,
  },
  argumentsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F3F4F6',
    marginBottom: 12,
  },
  argumentCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  argumentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  argumentBasis: {
    fontSize: 12,
    color: '#A78BFA',
    fontWeight: '500',
    flex: 1,
  },
  powerBadge: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  powerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  argumentText: {
    fontSize: 14,
    color: '#E5E7EB',
    lineHeight: 20,
    marginBottom: 8,
  },
  argumentFooter: {},
  strengthText: {
    fontSize: 12,
    color: '#10B981',
  },
  insightOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  insightCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 24,
    borderWidth: 2,
    borderColor: '#A78BFA',
  },
  insightTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#A78BFA',
    marginBottom: 12,
    textAlign: 'center',
  },
  insightText: {
    fontSize: 14,
    color: '#E5E7EB',
    lineHeight: 22,
    textAlign: 'center',
  },
  historyContainer: {
    margin: 16,
    padding: 16,
    backgroundColor: '#1E293B',
    borderRadius: 12,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F3F4F6',
    marginBottom: 12,
  },
  historyEntry: {
    backgroundColor: '#0F172A',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  historyRound: {
    fontSize: 12,
    color: '#6B7280',
  },
  historyReaction: {
    fontSize: 16,
  },
  positive: {},
  negative: {},
  historyArgument: {
    fontSize: 12,
    color: '#9CA3AF',
    lineHeight: 16,
  },
});

export default DebateCard;