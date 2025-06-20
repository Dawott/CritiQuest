module.exports = {
  preset: 'react-native',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  testRegex: '(/__tests__/.*|\\.(test|spec))\\.(ts|tsx|js)$',
  testPathIgnorePatterns: ['\\.snap$', '<rootDir>/node_modules/'],
  transformIgnorePatterns: [
    'node_modules/(?!(@react-native|react-native|react-native-vector-icons|react-native-gesture-handler|react-native-safe-area-context|react-native-linear-gradient|lottie-react-native|@react-navigation)/)',
  ],
 // setupFilesAfterEnv: ['<rootDir>/jest.setup.js'], // Uncommented this line
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    "^react-native$": "<rootDir>/node_modules/react-native",
    // Mock image imports
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$': 'identity-obj-proxy',
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/index.tsx',
    '!src/serviceWorker.ts',
  ],
  //testEnvironment: 'jsdom',
  //setupFiles: ['<rootDir>/node_modules/react-native-gesture-handler/jestSetup.js'],
};