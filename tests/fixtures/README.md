# Test Fixtures

This directory contains test data and fixtures used across the test suite.

## Structure

```
fixtures/
├── transactions/     # Sample transaction data
├── responses/        # Mock RPC responses
└── expected/         # Expected output snapshots
```

## Usage

```typescript
import { readFileSync } from 'fs';
import { join } from 'path';

// Load a fixture
const fixture = JSON.parse(
  readFileSync(join(__dirname, '../fixtures/transactions/sample.json'), 'utf-8')
);
```

## Adding Fixtures

When adding new fixtures:

1. Use descriptive filenames (e.g., `nft-mint-transaction.json`)
2. Include comments or metadata explaining the fixture
3. Keep fixtures minimal - only include necessary data
4. Organize by category (transactions, responses, etc.)

## Fixture Categories

### Transactions
Real or realistic Solana transaction data for testing decoders and parsers.

### Responses
Mock RPC responses for testing without network calls.

### Expected
Expected output for snapshot testing and validation.
