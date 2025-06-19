import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { 
  ProgressBar, 
  LessonProgressBar, 
  SimpleProgressBar, 
  DetailedProgressBar 
} from '@/components/common/ProgressBar';

export const ProgressBarExamples: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>ProgressBar Component Examples</Text>

      {/* 1. Basic Lesson Progress (Philosophical theme) */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>1. Lesson Progress (Philosophical)</Text>
        <LessonProgressBar 
          progress={0.75} 
          height={10}
          milestone={0.5}
          showPercentage={true}
        />
      </View>

      {/* 2. Simple Progress Bar */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>2. Simple Progress</Text>
        <SimpleProgressBar 
          progress={0.4} 
          height={6}
          progressColors={['#10B981', '#34D399']}
        />
      </View>

      {/* 3. Detailed Progress with Custom Styling */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>3. Detailed Progress</Text>
        <DetailedProgressBar 
          progress={0.9} 
          height={12}
          progressColors={['#F59E0B', '#FBBF24']}
          trackColor="#1F2937"
          milestone={0.8}
        />
      </View>

      {/* 4. Custom Philosophical Progress */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>4. Custom Philosophical</Text>
        <ProgressBar 
          progress={1.0} 
          height={8}
          philosophical={true}
          showIcon={true}
          showPercentage={true}
          progressColors={['#8B5CF6', '#A78BFA', '#C4B5FD']}
          milestone={0.75}
          duration={1500}
        />
      </View>

      {/* 5. Reading Progress */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>5. Reading Progress</Text>
        <ProgressBar 
          progress={0.3} 
          height={4}
          trackColor="#374151"
          progressColors={['#6366F1', '#8B5CF6']}
          animated={true}
          borderRadius={2}
        />
      </View>

      {/* 6. Quiz Progress */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>6. Quiz Progress</Text>
        <ProgressBar 
          progress={0.6} 
          height={8}
          showPercentage={true}
          showIcon={true}
          progressColors={['#EF4444', '#F87171', '#FCA5A5']}
          milestone={0.5}
          philosophical={false}
        />
      </View>

      {/* 7. Level Progress */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>7. Level Progress</Text>
        <ProgressBar 
          progress={0.85} 
          height={14}
          showPercentage={true}
          showIcon={true}
          progressColors={['#FBBF24', '#F59E0B', '#D97706']}
          trackColor="#1F2937"
          textColor="#F59E0B"
          borderRadius={7}
          philosophical={true}
          milestone={0.8}
        />
      </View>

      {/* 8. Minimalist Progress */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>8. Minimalist</Text>
        <ProgressBar 
          progress={0.2} 
          height={2}
          animated={false}
          progressColors={['#D1D5DB']}
          trackColor="#374151"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#111827',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#F3F4F6',
    marginBottom: 32,
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#D1D5DB',
    marginBottom: 12,
  },
});