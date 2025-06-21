import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import LottieView from 'lottie-react-native';
import { ProgressionReward } from '../../../../server/src/services/user-progression.service';

interface RewardsModalProps {
  visible: boolean;
  rewards: ProgressionReward[];
  onClose: () => void;
}

export function RewardsModal({ visible, rewards, onClose }: RewardsModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
    >
      <View style={styles.overlay}>
        <View style={styles.content}>
          <LottieView
            source={require('@/assets/animations/celebration.json')}
            autoPlay
            loop={false}
            style={styles.animation}
          />
          
          <Text style={styles.title}>Rewards Earned!</Text>
          
          {rewards.map((reward, index) => (
            <View key={index} style={styles.rewardItem}>
              <Text style={styles.rewardMessage}>{reward.message}</Text>
              <View style={styles.rewardDetails}>
                {reward.rewards.gachaTickets && (
                  <Text style={styles.rewardText}>
                    🎫 {reward.rewards.gachaTickets} Bilety
                  </Text>
                )}
                {reward.rewards.experience && (
                  <Text style={styles.rewardText}>
                    ⭐ {reward.rewards.experience} XP
                  </Text>
                )}
              </View>
            </View>
          ))}
          
          <TouchableOpacity 
            style={styles.button} 
            onPress={onClose}
          >
            <Text style={styles.buttonText}>Świetnie!</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    backgroundColor: '#1F2937',
    borderRadius: 20,
    padding: 24,
    width: '85%',
    alignItems: 'center',
  },
  animation: {
    width: 150,
    height: 150,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#F3F4F6',
    marginBottom: 16,
  },
  rewardItem: {
    width: '100%',
    marginBottom: 16,
  },
  rewardMessage: {
    fontSize: 16,
    color: '#D1D5DB',
    textAlign: 'center',
    marginBottom: 8,
  },
  rewardDetails: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  rewardText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FCD34D',
  },
  button: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});