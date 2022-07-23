module.exports = {
  clearMocks: true,
  collectCoverage: false,
  collectCoverageFrom: ["**/src/*"],
  coverageDirectory: "coverage",
  globals: { "ts-jest": { tsConfig: "tsconfig.json" } },
  reporters: [
    "default",
    [
      "jest-junit",
      {
        suiteName: "@tknf/irestore-safe",
        outputDirectory: "junit",
        usePathForSuiteName: "true",
        classNameTemplate: "{classname}",
        titleTemplate: "{title}"
      }
    ]
  ],
  testMatch: ["**/__tests__/**/*.test.[jt]s?(x)"],
  transform: { "^.+\\.(ts)$": "ts-jest" }
};
