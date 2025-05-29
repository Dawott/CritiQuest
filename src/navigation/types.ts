export type RootStackParamList = {
  // Auth Flow
  Auth: undefined;
  Login: undefined;
  Register: undefined;
  
  // Main App Flow
  MainTabs: undefined;
  
  // Modal
  PhilosopherDetail: { philosopherId: string };
  QuizScreen: { quizId: string; lessonId?: string };
  GachaAnimation: { pullResults: string[] };
};

export type MainTabParamList = {
  Home: undefined;
  Nauka: undefined;
  Wyrocznia: undefined;
  Gimnazjon: undefined;
  Profil: undefined;
};

export type LearnStackParamList = {
  LearnHome: undefined;
  LessonDetail: { lessonId: string };
  StageSelect: { stage: string };
  ScenarioScreen: { scenarioId: string };
};

export type CollectionStackParamList = {
  CollectionHome: undefined;
  PhilosopherList: { filter?: 'owned' | 'all' };
  TeamBuilder: undefined;
};
