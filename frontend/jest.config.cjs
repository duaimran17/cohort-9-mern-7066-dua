module.exports = {
  testEnvironment: 'jsdom',

  // Only look for tests under src/
  roots: ['<rootDir>/src'],

  // Inject @testing-library/jest-dom matchers (toBeInTheDocument, etc.)
  setupFilesAfterEnv: ['@testing-library/jest-dom'],

  // Run babel-jest over all .js/.jsx files (needed because package.json has "type":"module")
  transform: {
    '^.+\\.jsx?$': 'babel-jest',
  },

  // By default Jest skips ALL node_modules. We punch holes for ESM-only packages
  // that must be transformed so Babel can turn them into CJS for the test runtime.
  transformIgnorePatterns: [
    '/node_modules/(?!(lucide-react)/)',
  ],

  // Stub out CSS/asset imports so Jest never tries to parse them
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': '<rootDir>/src/test/__mocks__/styleMock.js',
    '\\.(png|jpg|jpeg|gif|svg|webp)$': '<rootDir>/src/test/__mocks__/fileMock.js',
  },

  // Test file discovery — only pick up files in src/test/
  testMatch: ['<rootDir>/src/test/**/*.test.{js,jsx}'],
};
