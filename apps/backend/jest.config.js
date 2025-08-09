/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@shared(.*)$': '<rootDir>/../../packages/shared/src$1'
  }
};