import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ScrollView,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { Question } from 'shared/types/database.types';
import LottieView from 'lottie-react-native';

interface QuestionCardProps {
  question: Question;
  onAnswer: (questionId: string, answers: string[]) => void;
  showHint: boolean;
  philosopherBonus?: {
    philosopherId: string;
    multiplier: number;
  };
}

export default function QuestionCard({
  question,
  onAnswer,
  showHint,
  philosopherBonus,
}: QuestionCardProps) {
  const [selectedAnswers, setSelectedAnswers] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [animatedValues] = useState(
    question.options.map(() => new Animated.Value(0))
  );
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const correctAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entrance animation
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 50,
      friction: 8,
      useNativeDriver: true,
    }).start();

    // Stagger option animations
    const animations = animatedValues.map((anim, index) =>
      Animated.timing(anim, {
        toValue: 1,
        duration: 300,
        delay: index * 100,
        useNativeDriver: true,
      })
    );
    Animated.stagger(100, animations).start();
  }, [question]);

  const handleOptionPress = (option: string) => {
    if (submitted) return;

    if (question.type === 'single') {
      setSelectedAnswers([option]);
    } else {
      setSelectedAnswers(prev =>
        prev.includes(option)
          ? prev.filter(a => a !== option)
          : [...prev, option]
      );
    }

    // Bounce animation
    const index = question.options.indexOf(option);
    Animated.sequence([
      Animated.timing(animatedValues[index], {
        toValue: 1.1,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(animatedValues[index], {
        toValue: 1,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleSubmit = () => {
    if (selectedAnswers.length === 0) return;

    setSubmitted(true);
    const isCorrect = 
      selectedAnswers.sort().join(',') === 
      question.correctAnswers.sort().join(',');

    if (isCorrect) {
      // Success animation
      Animated.spring(correctAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }).start();
    } else {
      setShowExplanation(true);
    }

    onAnswer(question.id, selectedAnswers);
  };

  const renderOption = (option: string, index: number) => {
    const isSelected = selectedAnswers.includes(option);
    const isCorrect = question.correctAnswers.includes(option);
    const isWrong = submitted && isSelected && !isCorrect;

    return (
      <Animated.View
        key={option}
        style={[
          styles.optionContainer,
          {
            opacity: animatedValues[index],
            transform: [
              {
                translateX: animatedValues[index].interpolate({
                  inputRange: [0, 1],
                  outputRange: [-50, 0],
                }),
              },
              { scale: animatedValues[index] },
            ],
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.option,
            isSelected && styles.selectedOption,
            submitted && isCorrect && styles.correctOption,
            isWrong && styles.wrongOption,
          ]}
          onPress={() => handleOptionPress(option)}
          disabled={submitted}
          activeOpacity={0.8}
        >
          <View style={styles.optionContent}>
            <View style={styles.optionCheckbox}>
              {isSelected && (
                <Ionicons
                  name={question.type === 'single' ? 'radio-button-on' : 'checkbox'}
                  size={24}
                  color={isWrong ? '#EF4444' : '#6366F1'}
                />
              )}
              {!isSelected && (
                <Ionicons
                  name={question.type === 'single' ? 'radio-button-off' : 'square-outline'}
                  size={24}
                  color="#64748B"
                />
              )}
            </View>
            <Text style={[
              styles.optionText,
              isSelected && styles.selectedOptionText,
              submitted && isCorrect && styles.correctOptionText,
              isWrong && styles.wrongOptionText,
            ]}>
              {option}
            </Text>
            {submitted && isCorrect && (
              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
            )}
            {isWrong && (
              <Ionicons name="close-circle" size={20} color="#EF4444" />
            )}
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Question Header */}
        <View style={styles.questionHeader}>
          <View style={styles.questionTypeBadge}>
            <MaterialCommunityIcons
              name={question.type === 'scenario' ? 'thought-bubble' : 'help-circle'}
              size={16}
              color="#8B5CF6"
            />
            <Text style={styles.questionType}>
              {question.type === 'single' ? 'Wybierz jedną' : 'Wybierz wszystkie poprawne'}
            </Text>
          </View>
          <Text style={styles.points}>{question.points} pkt</Text>
        </View>

        {/* Context */}
        {question.philosophicalContext && (
          <View style={styles.contextCard}>
            <Ionicons name="school" size={16} color="#A78BFA" />
            <Text style={styles.contextText}>{question.philosophicalContext}</Text>
          </View>
        )}

        {/* Question Text */}
        <Text style={styles.questionText}>{question.text}</Text>

        {/* Hint */}
        {showHint && philosopherBonus && (
          <LinearGradient
            colors={['rgba(99, 102, 241, 0.1)', 'rgba(139, 92, 246, 0.1)']}
            style={styles.hintCard}
          >
            <Ionicons name="bulb" size={20} color="#8B5CF6" />
            <Text style={styles.hintText}>
              Wskazówka od filozofa: Rozważ perspektywę {philosopherBonus.philosopherId}
            </Text>
          </LinearGradient>
        )}

        {/* Opcje */}
        <View style={styles.optionsContainer}>
          {question.options.map((option, index) => renderOption(option, index))}
        </View>

        {/* Submit */}
        {!submitted && (
          <TouchableOpacity
            style={[
              styles.submitButton,
              selectedAnswers.length === 0 && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={selectedAnswers.length === 0}
          >
            <LinearGradient
              colors={
                selectedAnswers.length > 0
                  ? ['#6366F1', '#8B5CF6']
                  : ['#4B5563', '#6B7280']
              }
              style={styles.submitGradient}
            >
              <Text style={styles.submitText}>Sprawdź odpowiedź</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* Wyjaśnienie */}
        {showExplanation && (
          <Animated.View
            style={[
              styles.explanationCard,
              {
                opacity: correctAnim,
                transform: [
                  {
                    translateY: correctAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.explanationHeader}>
              <Ionicons name="information-circle" size={20} color="#F59E0B" />
              <Text style={styles.explanationTitle}>Wyjaśnienie</Text>
            </View>
            <Text style={styles.explanationText}>{question.explanation}</Text>
          </Animated.View>
        )}

        {/* Success Animation */}
        {submitted && selectedAnswers.sort().join(',') === question.correctAnswers.sort().join(',') && (
          <View style={styles.successContainer}>
            <LottieView
              source={require('@/assets/animations/magic-orb.json')}
              autoPlay
              loop={false}
              style={styles.successAnimation}
            />
            <Text style={styles.successText}>Świetna odpowiedź!</Text>
          </View>
        )}
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  questionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  questionTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8B5CF620',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  questionType: {
    fontSize: 12,
    color: '#8B5CF6',
    marginLeft: 6,
    fontWeight: '500',
  },
  points: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F3F4F6',
  },
  contextCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#1E293B',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  contextText: {
    fontSize: 14,
    color: '#CBD5E1',
    marginLeft: 8,
    flex: 1,
    lineHeight: 20,
  },
  questionText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F3F4F6',
    lineHeight: 28,
    marginBottom: 24,
  },
  hintCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
  },
  hintText: {
    fontSize: 14,
    color: '#E0E7FF',
    marginLeft: 12,
    flex: 1,
  },
  optionsContainer: {
    marginBottom: 24,
  },
  optionContainer: {
    marginBottom: 12,
  },
  option: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  selectedOption: {
    borderColor: '#6366F1',
    backgroundColor: '#6366F110',
  },
  correctOption: {
    borderColor: '#10B981',
    backgroundColor: '#10B98110',
  },
  wrongOption: {
    borderColor: '#EF4444',
    backgroundColor: '#EF444410',
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  optionCheckbox: {
    marginRight: 12,
  },
  optionText: {
    fontSize: 16,
    color: '#D1D5DB',
    flex: 1,
    lineHeight: 24,
  },
  selectedOptionText: {
    color: '#F3F4F6',
    fontWeight: '500',
  },
  correctOptionText: {
    color: '#10B981',
  },
  wrongOptionText: {
    color: '#EF4444',
  },
  submitButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 24,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  explanationCard: {
    backgroundColor: '#F59E0B10',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#F59E0B30',
  },
  explanationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  explanationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F59E0B',
    marginLeft: 8,
  },
  explanationText: {
    fontSize: 14,
    color: '#FEF3C7',
    lineHeight: 22,
  },
  successContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  successAnimation: {
    width: 100,
    height: 100,
  },
  successText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#10B981',
    marginTop: 12,
  },
});