/** @type {import('jest').Config} */
export default {
  preset: "ts-jest",
  transform: { "^.+\\.tsx?$": ["ts-jest", { tsconfig: { module: "CommonJS", moduleResolution: "node" } }] },
  testEnvironment: "node",
  testMatch: ["**/?(*.)+(spec|test).ts?(x)"],
  moduleFileExtensions: ["ts", "tsx", "js", "json", "node"],
  coverageDirectory: "coverage",
  collectCoverage: true,
  roots: ["<rootDir>/src"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^chalk$": "<rootDir>/__mocks__/chalk.ts",
  },
};
