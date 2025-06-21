import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

interface ActivityItemProps {
  icon: string;
  title: string;
  time: string;
  color: string;
}

export function ActivityItem({ icon, title, time, color }: ActivityItemProps) {
  return (
    <View style={styles.activityItem}>
      <View style={[styles.activityIcon, { backgroundColor: `${color}20` }]}>
        <Ionicons name={icon as any} size={16} color={color} />
      </View>
      <View style={styles.activityContent}>
        <Text style={styles.activityTitle}>{title}</Text>
        <Text style={styles.activityTime}>{time}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#F3F4F6',
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 12,
    color: '#64748B',
  },
});