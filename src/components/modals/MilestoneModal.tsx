import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LottieView from 'lottie-react-native';
import { ProgressionMilestone } from '@/services/user-progression.service';

const { width, height } = Dimensions.get('window');

interface MilestoneModalProps {
  visible: boolean;
  milestone: ProgressionMilestone | null;
  onClose: () => void;
}

export const MilestoneModal: React.FC<MilestoneModalProps> = ({
  visible,
  milestone,
  onClose,
}) => {
  if (!milestone) return null;

  const formatRewards = (rewards: Record<string, any>) => {
    const rewardTexts: string[] = [];
    
    if (rewards.experience) {
      rewardTexts.push(`${rewards.experience} XP`);
    }
    if (rewards.gachaTickets) {
      rewardTexts.push(`${rewards.gachaTickets} biletów`);
    }
    if (rewards.philosopherId) {
      rewardTexts.push('Nowy filozof!');
    }
    
    return rewardTexts.length > 0 ? rewardTexts.join(', ') : 'Specjalna nagroda';
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <LinearGradient
            colors={['#6366F1', '#8B5CF6', '#A855F7']}
            style={styles.gradient}
          >
            {/* Celebration Animation - Simple fallback */}
            <View style={styles.animationContainer}>
              <View style={styles.celebrationCircle}>
                <Text style={styles.celebrationEmoji}>🎉</Text>
              </View>
            </View>

            {/* Trophy Icon */}
            <View style={styles.iconContainer}>
              <Ionicons name="trophy" size={48} color="#FFD700" />
            </View>

            {/* Content */}
            <View style={styles.content}>
              <Text style={styles.title}>Kamień milowy!</Text>
              <Text style={styles.milestoneName}>{milestone.name}</Text>
              <Text style={styles.description}>{milestone.description}</Text>
              
              <View style={styles.divider} />
              
              <Text style={styles.rewardMessage}>{milestone.reward.message}</Text>
              
              <View style={styles.rewardsContainer}>
                <Text style={styles.rewardsLabel}>Nagrody:</Text>
                <Text style={styles.rewardsText}>
                  {formatRewards(milestone.reward.rewards)}
                </Text>
              </View>
            </View>

            {/* Close Button */}
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>Fantastyczne!</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: width * 0.9,
    maxWidth: 380,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  gradient: {
    padding: 24,
    alignItems: 'center',
  },
  animationContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  animation: {
    width: 200,
    height: 200,
  },
  celebrationCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  celebrationEmoji: {
    fontSize: 48,
  },
  iconContainer: {
    marginBottom: 16,
    zIndex: 2,
  },
  content: {
    alignItems: 'center',
    zIndex: 2,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  milestoneName: {
    fontSize: 22,
    fontWeight: '600',
    color: '#FFD700',
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#E2E8F0',
    textAlign: 'center',
    marginBottom: 20,
  },
  divider: {
    width: '80%',
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginBottom: 16,
  },
  rewardMessage: {
    fontSize: 16,
    color: '#F1F5F9',
    textAlign: 'center',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  rewardsContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    minWidth: '80%',
  },
  rewardsLabel: {
    fontSize: 14,
    color: '#CBD5E1',
    textAlign: 'center',
    marginBottom: 4,
  },
  rewardsText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFD700',
    textAlign: 'center',
  },
  closeButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});