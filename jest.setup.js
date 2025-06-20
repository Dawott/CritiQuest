import 'react-native-gesture-handler/jestSetup';

// Mock React Native modules
jest.mock('react-native-vector-icons/Ionicons', () => 'Ionicons');
jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'MaterialCommunityIcons');
jest.mock('react-native-linear-gradient', () => 'LinearGradient');
jest.mock('lottie-react-native', () => 'LottieView');
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }) => children,
  SafeAreaView: ({ children }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

// Mock React Navigation
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  NavigationContainer: ({ children }) => children,
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    reset: jest.fn(),
  }),
  useRoute: () => ({
    params: {},
  }),
  useFocusEffect: () => {},
}));

jest.mock('@react-navigation/bottom-tabs', () => ({
  createBottomTabNavigator: () => ({
    Navigator: ({ children }) => children,
    Screen: ({ children }) => children,
  }),
}));

jest.mock('@react-navigation/native-stack', () => ({
  createNativeStackNavigator: () => ({
    Navigator: ({ children }) => children,
    Screen: ({ children }) => children,
  }),
}));

// Mock Firebase
jest.mock('@react-native-firebase/app', () => ({
  initializeApp: jest.fn(),
}));

jest.mock('@react-native-firebase/auth', () => ({
  __esModule: true,
  default: () => ({
    currentUser: null,
    signInWithEmailAndPassword: jest.fn(),
    createUserWithEmailAndPassword: jest.fn(),
    signOut: jest.fn(),
    onAuthStateChanged: jest.fn(),
  }),
}));

jest.mock('@react-native-firebase/database', () => ({
  __esModule: true,
  default: () => ({
    ref: jest.fn(() => ({
      on: jest.fn(),
      off: jest.fn(),
      once: jest.fn(() => Promise.resolve({ val: () => null })),
      set: jest.fn(() => Promise.resolve()),
      update: jest.fn(() => Promise.resolve()),
      remove: jest.fn(() => Promise.resolve()),
    })),
  }),
}));

// Mock services
jest.mock('@/services/firebase/auth.service', () => ({
  __esModule: true,
  default: {
    currentUser: null,
    signIn: jest.fn(),
    signUp: jest.fn(),
    signOut: jest.fn(),
    onAuthStateChanged: jest.fn(),
  },
}));

jest.mock('@/services/firebase/database.service', () => ({
  __esModule: true,
  default: {
    getUser: jest.fn(),
    updateUser: jest.fn(),
    getAllPhilosophers: jest.fn(() => Promise.resolve({})),
    getPhilosopher: jest.fn(),
  },
}));

// Mock hooks
jest.mock('@/hooks/useAuthState', () => ({
  useAuthState: () => ({
    user: null,
    loading: false,
  }),
}));

jest.mock('@/hooks/useNavigation', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    reset: jest.fn(),
  }),
}));

jest.mock('@/hooks/useUser', () => ({
  useUser: () => ({
    user: null,
    loading: false,
  }),
}));

jest.mock('@/hooks/useProgression', () => ({
  useProgression: () => ({
    updateStreak: jest.fn(),
    checkMilestones: jest.fn(),
  }),
  useProgressionDisplay: () => ({
    upcomingMilestones: [],
    recentActivity: [],
  }),
}));

// Mock Jotai atoms
jest.mock('@/store/atoms', () => ({
  currentUserAtom: jest.fn(),
  isLoadingAtom: jest.fn(),
}));

// Mock Jotai
jest.mock('jotai', () => ({
  atom: jest.fn(),
  useAtom: jest.fn(() => [null, jest.fn()]),
  useAtomValue: jest.fn(() => false),
  Provider: ({ children }) => children,
}));

// Mock gesture handler
jest.mock('react-native-gesture-handler', () => ({
  GestureHandlerRootView: ({ children }) => children,
  PanGestureHandler: ({ children }) => children,
  State: {},
  gestureHandlerRootHOC: (component) => component,
}));

// Mock other dependencies
jest.mock('react-native-config', () => ({
  API_URL: 'http://localhost:3000',
}));

// Silence warnings
const originalConsoleWarn = console.warn;
console.warn = (...args) => {
  if (
    typeof args[0] === 'string' &&
    args[0].includes('componentWillReceiveProps')
  ) {
    return;
  }
  originalConsoleWarn(...args);
};

// Mock native modules that might not be available in test environment
jest.mock('react-native/Libraries/EventEmitter/NativeEventEmitter');
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');