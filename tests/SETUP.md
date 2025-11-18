# Test Infrastructure Setup Guide

This document describes the testing infrastructure for TxLens.

## Overview

TxLens uses **Vitest** as its testing framework with the following features:
- TypeScript support out of the box
- Fast execution with ESM support
- Built-in coverage reporting with v8
- Watch mode for development
- UI mode for interactive testing

## Installation

All testing dependencies are already installed. If you need to reinstall:

```bash
pnpm install
```

## Configuration

### Vitest Configuration (`vitest.config.ts`)

The configuration includes:
- **Environment**: Node.js
- **Coverage Provider**: v8 (fast and accurate)
- **Coverage Threshold**: 80% for lines, functions, branches, and statements
- **Test Files**: `tests/**/*.test.ts` and `tests/**/*.spec.ts`
- **Coverage Reporters**: text, json, html, lcov

### Package Scripts

```json
{
  "test": "vitest --run",           // Run tests once
  "test:watch": "vitest",            // Run tests in watch mode
  "test:coverage": "vitest --run --coverage",  // Run with coverage
  "test:ui": "vitest --ui"           // Run with UI
}
```

## Directory Structure

```
tests/
├── unit/              # Unit tests for individual components
│   └── setup.test.ts  # Sample test file
├── integration/       # Integration tests
├── e2e/              # End-to-end tests
├── fixtures/         # Test data and fixtures
│   └── README.md     # Fixtures documentation
├── README.md         # Test suite documentation
└── SETUP.md          # This file
```

## Running Tests

### Basic Commands

```bash
# Run all tests once
pnpm test

# Run tests in watch mode (auto-rerun on file changes)
pnpm test:watch

# Run tests with coverage report
pnpm test:coverage

# Run tests with interactive UI
pnpm test:ui
```

### Advanced Usage

```bash
# Run specific test file
pnpm test tests/unit/setup.test.ts

# Run tests matching a pattern
pnpm test --grep "Parser"

# Run tests with verbose output
pnpm test --reporter=verbose

# Update snapshots
pnpm test -u
```

## Coverage Reports

After running `pnpm test:coverage`, coverage reports are generated in:
- `coverage/` directory (HTML report)
- Console output (text summary)
- `coverage/lcov.info` (for CI/CD integration)

### Viewing HTML Coverage Report

```bash
# After running coverage
# Open coverage/index.html in your browser
```

### Coverage Thresholds

The project requires minimum 80% coverage for:
- Lines
- Functions
- Branches
- Statements

Tests will fail if coverage drops below these thresholds.

## CI/CD Integration

### GitHub Actions

The project includes a GitHub Actions workflow (`.github/workflows/test.yml`) that:
1. Runs on push to `main` or `develop` branches
2. Runs on pull requests to `main` or `develop`
3. Tests on Node.js 18.x and 20.x
4. Executes type checking
5. Runs all tests
6. Generates coverage reports
7. Uploads coverage to Codecov

### Workflow Steps

```yaml
- Install dependencies
- Type check
- Run tests
- Run tests with coverage
- Upload coverage reports
```

## Writing Tests

### Basic Test Example

```typescript
import { describe, it, expect } from 'vitest';

describe('MyComponent', () => {
  it('should do something', () => {
    const result = myFunction('input');
    expect(result).toBe('expected');
  });
});
```

### Async Test Example

```typescript
it('should handle async operations', async () => {
  const result = await asyncFunction();
  expect(result).toBeDefined();
});
```

### Using Mocks

```typescript
import { vi } from 'vitest';

const mockFn = vi.fn();
mockFn.mockReturnValue('mocked');

// Or mock a module
vi.mock('./module', () => ({
  default: vi.fn(),
}));
```

### Using Fixtures

```typescript
import { readFileSync } from 'fs';
import { join } from 'path';

const fixture = JSON.parse(
  readFileSync(
    join(__dirname, '../fixtures/transactions/sample.json'),
    'utf-8'
  )
);
```

## Best Practices

1. **Test Naming**: Use descriptive names that explain what is being tested
   ```typescript
   it('should decode a token transfer instruction correctly', () => {})
   ```

2. **Arrange-Act-Assert**: Structure tests clearly
   ```typescript
   // Arrange
   const input = createTestInput();
   
   // Act
   const result = functionUnderTest(input);
   
   // Assert
   expect(result).toEqual(expected);
   ```

3. **Test Independence**: Each test should be independent
   - Don't rely on test execution order
   - Clean up after tests if needed

4. **Focus on Behavior**: Test what the code does, not how it does it

5. **Minimal Tests**: Focus on core functionality, avoid over-testing edge cases

6. **Use Fixtures**: Reuse test data across tests

## Troubleshooting

### Tests Not Running

```bash
# Clear cache and retry
pnpm test --no-cache
```

### Coverage Not Generated

```bash
# Ensure coverage dependencies are installed
pnpm install --dev @vitest/coverage-v8
```

### TypeScript Errors

```bash
# Run type check separately
pnpm typecheck
```

### Watch Mode Issues

```bash
# Try running tests once first
pnpm test

# Then start watch mode
pnpm test:watch
```

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Vitest API Reference](https://vitest.dev/api/)
- [Coverage Configuration](https://vitest.dev/config/#coverage)
- [GitHub Actions](https://docs.github.com/en/actions)

## Next Steps

1. Write unit tests for existing components (parsers, decoders, formatters)
2. Add integration tests for CLI commands
3. Create E2E tests for complete workflows
4. Collect transaction fixtures for decoder testing
5. Maintain 80%+ code coverage as new features are added
