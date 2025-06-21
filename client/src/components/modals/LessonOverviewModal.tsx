import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { LessonWithId } from 'shared/types/database.types';

interface LessonOverviewModalProps {
  visible: boolean;
  lesson: LessonWithId;
  currentSectionIndex: number;
  completedSections: number[];
  onClose: () => void;
  onSectionSelect: (index: number) => void;
}

export const LessonOverviewModal: React.FC<LessonOverviewModalProps> = ({
  visible,
  lesson,
  currentSectionIndex,
  completedSections,
  onClose,
  onSectionSelect,
}) => {
  const sections = lesson.content.sections.sort((a, b) => a.order - b.order);

  const getSectionIcon = (type: string) => {
    switch (type) {
      case 'text': return 'document-text';
      case 'video': return 'play-circle';
      case 'interactive': return 'bulb';
      default: return 'document';
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Przegląd Lekcji</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color="#F3F4F6" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          <View style={styles.lessonInfo}>
            <Text style={styles.lessonTitle}>{lesson.title}</Text>
            <Text style={styles.lessonDescription}>{lesson.description}</Text>
            
            <View style={styles.metadata}>
              <View style={styles.metadataItem}>
                <Ionicons name="time" size={16} color="#9CA3AF" />
                <Text style={styles.metadataText}>{lesson.estimatedTime} min</Text>
              </View>
              <View style={styles.metadataItem}>
                <Ionicons name="layers" size={16} color="#9CA3AF" />
                <Text style={styles.metadataText}>{sections.length} sekcji</Text>
              </View>
            </View>

            <View style={styles.concepts}>
              <Text style={styles.conceptsTitle}>Koncepcje Filozoficzne:</Text>
              <View style={styles.conceptsList}>
                {lesson.philosophicalConcepts.map((concept, index) => (
                  <View key={index} style={styles.conceptBadge}>
                    <Text style={styles.conceptText}>{concept}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          <View style={styles.sectionsContainer}>
            <Text style={styles.sectionsTitle}>Sekcje</Text>
            {sections.map((section, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.sectionItem,
                  index === currentSectionIndex && styles.currentSection,
                  completedSections.includes(index) && styles.completedSection,
                ]}
                onPress={() => {
                  onSectionSelect(index);
                  onClose();
                }}
              >
                <View style={styles.sectionLeft}>
                  <View style={styles.sectionNumber}>
                    <Text style={styles.sectionNumberText}>{index + 1}</Text>
                  </View>
                  <View style={styles.sectionInfo}>
                    <Text style={styles.sectionType}>
                      {section.type.charAt(0).toUpperCase() + section.type.slice(1)}
                    </Text>
                    <Text style={styles.sectionContent} numberOfLines={2}>
                      {section.content.substring(0, 50)}...
                    </Text>
                  </View>
                </View>
                <View style={styles.sectionRight}>
                  <Ionicons 
                    name={getSectionIcon(section.type)} 
                    size={20} 
                    color="#9CA3AF" 
                  />
                  {completedSections.includes(index) && (
                    <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#F3F4F6',
  },
  content: {
    flex: 1,
  },
  lessonInfo: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  lessonTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#F3F4F6',
    marginBottom: 8,
  },
  lessonDescription: {
    fontSize: 16,
    color: '#D1D5DB',
    lineHeight: 24,
    marginBottom: 16,
  },
  metadata: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 16,
  },
  metadataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metadataText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  concepts: {
    marginTop: 8,
  },
  conceptsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F3F4F6',
    marginBottom: 8,
  },
  conceptsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  conceptBadge: {
    backgroundColor: '#374151',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  conceptText: {
    fontSize: 12,
    color: '#D1D5DB',
  },
  sectionsContainer: {
    padding: 20,
  },
  sectionsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F3F4F6',
    marginBottom: 16,
  },
  sectionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  currentSection: {
    borderColor: '#6366F1',
    backgroundColor: '#1E1B4B',
  },
  completedSection: {
    borderColor: '#10B981',
    backgroundColor: '#064E3B',
  },
  sectionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sectionNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sectionNumberText: {
    color: '#F3F4F6',
    fontSize: 14,
    fontWeight: '600',
  },
  sectionInfo: {
    flex: 1,
  },
  sectionType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F3F4F6',
    marginBottom: 2,
  },
  sectionContent: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  sectionRight: {
    alignItems: 'center',
    gap: 4,
  },
});