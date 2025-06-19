// Aktywność
export interface RecentActivity {
  id: string;
  type: 'lesson_complete' | 'quiz_complete' | 'level_up' | 'achievement_unlock' | 'milestone_reached' | 'streak_update' | 'philosopher_unlock';
  title: string;
  description?: string;
  timestamp: number;
  icon: string;
  color: string;
  metadata?: {
    lessonId?: string;
    quizId?: string;
    achievementId?: string;
    milestoneId?: string;
    philosopherId?: string;
    experience?: number;
    score?: number;
    streak?: number;
  };
}

// Helper do konwersji ProgressionEvent na RecentActivity
export const formatActivityFromEvent = (event: any): RecentActivity => {
  const getActivityConfig = (type: string, data: any) => {
    switch (type) {
      case 'lesson_complete':
        return {
          icon: 'book',
          color: '#10B981',
          title: `Ukończono: ${data.lessonId || 'Lekcja'}`,
        };
      case 'quiz_complete':
        return {
          icon: 'help-circle',
          color: '#6366F1',
          title: `Quiz zaliczony: ${data.score || 0}%`,
        };
      case 'level_up':
        return {
          icon: 'trending-up',
          color: '#F59E0B',
          title: `Awansowano na poziom ${data.level || '?'}!`,
        };
      case 'achievement_unlock':
        return {
          icon: 'trophy',
          color: '#EF4444',
          title: `Osiągnięcie: ${data.achievementId || 'Nowe osiągnięcie'}`,
        };
      case 'milestone_reached':
        return {
          icon: 'star',
          color: '#8B5CF6',
          title: `Kamień milowy: ${data.milestoneId || 'Nowy kamień milowy'}`,
        };
      case 'streak_update':
        return {
          icon: 'flash',
          color: '#F97316',
          title: `Seria: ${data.streak || 0} dni`,
        };
      case 'philosopher_unlock':
        return {
          icon: 'people',
          color: '#8B5CF6',
          title: `Odblokowano: ${data.philosopherId || 'Nowy filozof'}`,
        };
      default:
        return {
          icon: 'information-circle',
          color: '#64748B',
          title: 'Nieznana aktywność',
        };
    }
  };

  const config = getActivityConfig(event.type, event.data || {});
  
  return {
    id: event.id || `activity_${Date.now()}`,
    type: event.type,
    title: config.title,
    description: event.description,
    timestamp: event.timestamp || Date.now(),
    icon: config.icon,
    color: config.color,
    metadata: event.data,
  };
};

// Helper do formatu daty z timestamp
export const formatActivityTime = (timestamp: number): string => {
  const now = Date.now();
  const diff = now - timestamp;
  
  // <1 minuta
  if (diff < 60000) {
    return 'Przed chwilą';
  }
  
  // poniżej 1 godziny
  if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000);
    return `${minutes} min temu`;
  }
  
  // poniżej dnia
  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000);
    return `${hours} godz. temu`;
  }
  
  // poniżej tygodnia
  if (diff < 604800000) {
    const days = Math.floor(diff / 86400000);
    return `${days} dni temu`;
  }
  
  // ponad tydzień
  return new Date(timestamp).toLocaleDateString('pl-PL', {
    day: 'numeric',
    month: 'short'
  });
};
