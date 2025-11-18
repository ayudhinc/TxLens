# TxLens Test Suite

This directory contains the comprehensive test suite for TxLens.

## Directory Structure

```
tests/
├── unit/          # Unit tests for individual components
├── integration/   # Integration tests for component interactions
├── e2e/          # End-to-end tests for complete workflows
└── fixtures/     # Test data and fixtures
```

## Running Tests

```bash
# Run all tests once
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage report
pnpm test:coverage

# Run tests with UI
pnpm test:ui
```

## Coverage Goals

The test suite aims for 80% code coverage across:
- Lines
- Functions
- Branches
- Statements

## Test Types

### Unit Tests (`tests/unit/`)
Test individual functions, classes, and modules in isolation.

**Examples:**
- Parser logic
- Decoder implementations
- Utility functions
- Formatters

### Integration Tests (`tests/integration/`)
Test interactions between multiple components.

**Examples:**
- CLI command execution
- Parser + Decoder integration
- RPC client + Controller integration

### E2E Tests (`tests/e2e/`)
Test complete user workflows from start to finish.

**Examples:**
- Full CLI command execution with real data
- Transaction decoding pipeline
- Monitoring workflows

### Fixtures (`tests/fixtures/`)
Reusable test data including:
- Sample transactions
- Mock RPC responses
- Expected output snapshots

## Writing Tests

### Basic Test Structure

```typescript
import { describe, it, expect } from 'vitest';

describe('ComponentName', () => {
  it('should do something', () => {
    // Arrange
    const input = 'test';
    
    // Act
    const result = functionUnderTest(input);
    
    // Assert
    expect(result).toBe('expected');
  });
});
```

### Async Tests

```typescript
it('should handle async operations', async () => {
  const result = await asyncFunction();
  expect(result).toBeDefined();
});
```

### Mocking

```typescript
import { vi } from 'vitest';

const mockFn = vi.fn();
mockFn.mockReturnValue('mocked value');
```

## CI/CD

Tests run automatically on:
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop`

The CI pipeline:
1. Runs type checking
2. Executes all tests
3. Generates coverage reports
4. Uploads coverage to Codecov

## Best Practices

1. **Focus on core functionality** - Test the most important paths first
2. **Keep tests minimal** - Avoid over-testing edge cases
3. **Use descriptive names** - Test names should clearly describe what they test
4. **Arrange-Act-Assert** - Follow the AAA pattern for clarity
5. **Avoid test interdependence** - Each test should be independent
6. **Use fixtures** - Reuse test data across tests
7. **Test behavior, not implementation** - Focus on what, not how
