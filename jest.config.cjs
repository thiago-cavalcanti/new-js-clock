/** @type {import('ts-jest').JestConfigWithTsJest} **/
module.exports = {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: "jsdom",
  extensionsToTreatAsEsm: ['.ts'],
  transform: {
    "^.+\\.tsx?$": ["ts-jest", {
      useESM: true,
      tsconfig: {
        lib: ["ES2017", "DOM"],
        target: "ES2017",
        module: "ESNext",
        moduleResolution: "bundler",
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true
      }
    }],
  },
  testMatch: ["**/tests/**/*.test.ts"],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  moduleFileExtensions: ["ts", "js"],
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/**/*.d.ts"
  ],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov", "html"]
};
