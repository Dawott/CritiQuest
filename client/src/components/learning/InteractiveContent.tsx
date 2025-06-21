import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput } from 'react-native';
import { LessonSection } from 'shared/types/database.types';

interface InteractiveContentProps {
  section: LessonSection;
  onComplete?: () => void;
}

interface InteractiveData {
  type: 'choice' | 'reflection' | 'thought_experiment';
  question: string;
  options?: string[];
  correctAnswer?: number;
  reflection?: {
    prompt: string;
    minWords: number;
  };
}

export const InteractiveContent: React.FC<InteractiveContentProps> = ({ 
  section, 
  onComplete 
}) => {
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [reflectionText, setReflectionText] = useState('');

  // Parse interactive content (assuming JSON format)
  const interactiveData: InteractiveData = JSON.parse(section.content);

  const handleChoice = (optionIndex: number) => {
    setSelectedOption(optionIndex);
    setShowResult(true);
    
    setTimeout(() => {
      onComplete?.();
    }, 2000);
  };

  const renderChoiceContent = () => (
    <View style={styles.choiceContainer}>
      <Text style={styles.question}>{interactiveData.question}</Text>
      {interactiveData.options?.map((option, index) => (
        <TouchableOpacity
          key={index}
          style={[
            styles.option,
            selectedOption === index && styles.selectedOption,
            showResult && index === interactiveData.correctAnswer && styles.correctOption,
          ]}
          onPress={() => handleChoice(index)}
          disabled={showResult}
        >
          <Text style={styles.optionText}>{option}</Text>
        </TouchableOpacity>
      ))}
      {showResult && (
        <Text style={styles.resultText}>
          {selectedOption === interactiveData.correctAnswer
            ? 'Świetnie! Doskonały popis krytycznego myślenia!'
            : 'Ciekawa perspektywa! Spójrz z tej strony...'}
        </Text>
      )}
    </View>
  );

  const renderReflectionContent = () => (
    <View style={styles.reflectionContainer}>
      <Text style={styles.question}>{interactiveData.reflection?.prompt}</Text>
      <TextInput
        style={styles.textInput}
        multiline
        value={reflectionText}
        onChangeText={setReflectionText}
        placeholder="Share your thoughts..."
        placeholderTextColor="#9CA3AF"
      />
      <TouchableOpacity
        style={[
          styles.submitButton,
          reflectionText.split(' ').length >= (interactiveData.reflection?.minWords || 10) 
            && styles.submitButtonActive
        ]}
        onPress={onComplete}
        disabled={reflectionText.split(' ').length < (interactiveData.reflection?.minWords || 10)}
      >
        <Text style={styles.submitButtonText}>Continue</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {interactiveData.type === 'choice' && renderChoiceContent()}
      {interactiveData.type === 'reflection' && renderReflectionContent()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  choiceContainer: {
    gap: 12,
  },
  question: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F3F4F6',
    marginBottom: 16,
  },
  option: {
    backgroundColor: '#374151',
    padding: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedOption: {
    borderColor: '#6366F1',
    backgroundColor: '#1E1B4B',
  },
  correctOption: {
    borderColor: '#10B981',
    backgroundColor: '#064E3B',
  },
  optionText: {
    color: '#F3F4F6',
    fontSize: 16,
  },
  resultText: {
    fontSize: 16,
    color: '#10B981',
    textAlign: 'center',
    marginTop: 12,
  },
  reflectionContainer: {
    gap: 16,
  },
  textInput: {
    backgroundColor: '#374151',
    color: '#F3F4F6',
    padding: 16,
    borderRadius: 8,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#4B5563',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonActive: {
    backgroundColor: '#6366F1',
  },
  submitButtonText: {
    color: '#F3F4F6',
    fontSize: 16,
    fontWeight: '600',
  },
});