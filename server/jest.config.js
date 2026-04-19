module.exports = {
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/__tests__/setup.js'],
  testMatch: ['<rootDir>/__tests__/**/*.test.js'],
  testPathIgnorePatterns: ['/node_modules/'],
  testTimeout: 15000,
  detectOpenHandles: false,
  forceExit: true,
  verbose: true,
};
