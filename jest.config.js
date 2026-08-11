module.exports = {
    preset: 'ts-jest',
    rootDir: './',
    testRegex: '(/test/.*\\.(test|spec))\\.[tj]sx?$',
    moduleFileExtensions: [
        "ts",
        "tsx",
        "js",
        "jsx"
    ],
    moduleNameMapper: {
        '^@APP/(.*)$': '<rootDir>/src/douban/$1'
    },
    collectCoverageFrom: [
        "**/baseTs/upperFirst.ts",
        "**/baseTs/camelCase.ts",
        "!**/node_modules/**",
        "!**/vendor/**"
    ]
}
