import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LessonSection } from 'shared/types/database.types';

interface TextContentProps {
  section: LessonSection;
  onComplete?: () => void;
}

export const TextContent: React.FC<TextContentProps> = ({ section, onComplete }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.content}>{section.content}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#1F2937',
    borderRadius: 12,
    marginBottom: 16,
  },
  content: {
    fontSize: 16,
    lineHeight: 24,
    color: '#F3F4F6',
  },
});