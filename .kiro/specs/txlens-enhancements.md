---
title: TxLens Enhancement Suite
status: draft
created: 2025-11-17
---

# TxLens Enhancement Suite

## Overview

This spec outlines a comprehensive enhancement plan for TxLens, a production-ready Solana transaction decoder CLI. The enhancements focus on expanding decoder support, implementing intelligent transaction scoring, adding real-time monitoring capabilities, comprehensive testing, and transaction simulation support.

## Goals

1. **Expand Program Decoder Support** - Add decoders for Metaplex, Serum, and Pump.fun programs
2. **ML-Based Transaction Scoring** - Implement intelligent scoring beyond rule-based detection
3. **Real-Time Monitoring** - Add live transaction monitoring with filtering and alerts
4. **Comprehensive Testing** - Create unit, integration, and end-to-end tests
5. **Transaction Simulation** - Add ability to simulate transactions before execution

## Non-Goals

- Building a web UI (CLI-focused)
- Supporting non-Solana blockchains
- Creating a hosted service

## Current Architecture

```
TxLens/
├── src/
│   ├── cli.ts                    # CLI entry point
│   ├── controller/               # Transaction orchestration
│   ├── rpc/                      # RPC client and types
│   ├── parser/                   # Transaction parser and decoders
│   │   ├── TransactionParser.ts
│   │   ├── InstructionDecoder.ts
│   │   ├── TokenProgramDecoder.ts
│   │   └── SystemProgramDecoder.ts
│   ├── formatter/                # Output formatters
│   └── utils/                    # Utilities and rules
│       ├── interestingRules.ts   # Current rule-based scoring
│       └── knownPrograms.ts
```

## Design

### 1. Program Decoders

#### 1.1 Metaplex Decoder

**Purpose**: Decode NFT-related instructions from Metaplex programs (Token Metadata, Candy Machine, Auction House)

**Programs to Support**:
- Token Metadata Program: `metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s`
- Candy Machine v3: `CndyV3LdqHUfDLmE5naZjVN8rBZz4tqhdefbAnjHG3JR`
- Auction House: `hausS13jsjafwWwGqZTUQRmWyvyxn9EQpqMwV1PBBmk`

**Key Instructions to Decode**:
- CreateMetadataAccountV3
- UpdateMetadataAccountV2
- MintNewEditionFromMasterEditionViaToken
- CreateMasterEditionV3
- VerifyCollection
- SetAndVerifyCollection
- MintV2 (Candy Machine)
- Buy (Auction House)
- ExecuteSale (Auction House)

**Implementation**:
```typescript
// src/parser/decoders/MetaplexDecoder.ts
export class MetaplexDecoder implements InstructionDecoder {
  canDecode(programId: string): boolean;
  decode(instruction: RawInstruction, accountKeys: string[]): DecodedInstruction;
  
  private decodeTokenMetadata(data: Buffer): DecodedInstruction;
  private decodeCandyMachine(data: Buffer): DecodedInstruction;
  private decodeAuctionHouse(data: Buffer): DecodedInstruction;
}
```

#### 1.2 Serum Decoder

**Purpose**: Decode DEX instructions from Serum/OpenBook

**Program ID**: `9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin`

**Key Instructions**:
- NewOrderV3
- CancelOrderV2
- SettleFunds
- InitOpenOrders
- ConsumeEvents

**Implementation**:
```typescript
// src/parser/decoders/SerumDecoder.ts
export class SerumDecoder implements InstructionDecoder {
  canDecode(programId: string): boolean;
  decode(instruction: RawInstruction, accountKeys: string[]): DecodedInstruction;
  
  private decodeNewOrder(data: Buffer): DecodedInstruction;
  private decodeCancelOrder(data: Buffer): DecodedInstruction;
  private decodeSettleFunds(data: Buffer): DecodedInstruction;
}
```

#### 1.3 Pump.fun Decoder

**Purpose**: Decode instructions from Pump.fun token launcher

**Program ID**: `6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P` (verify current)

**Key Instructions**:
- Create
- Buy
- Sell
- Initialize

**Implementation**:
```typescript
// src/parser/decoders/PumpFunDecoder.ts
export class PumpFunDecoder implements InstructionDecoder {
  canDecode(programId: string): boolean;
  decode(instruction: RawInstruction, accountKeys: string[]): DecodedInstruction;
  
  private decodeCreate(data: Buffer): DecodedInstruction;
  private decodeBuy(data: Buffer): DecodedInstruction;
  private decodeSell(data: Buffer): DecodedInstruction;
}
```

### 2. ML-Based Transaction Scoring

#### 2.1 Architecture

**Approach**: Hybrid system combining rule-based and ML-based scoring

```
Transaction → Rule-Based Scoring → Feature Extraction → ML Model → Final Score
                     ↓                                      ↓
              Quick filtering                        Nuanced scoring
```

#### 2.2 Feature Engineering

**Features to Extract**:
- Transaction complexity metrics (programs, accounts, instructions)
- Value metrics (SOL moved, token amounts, USD value)
- Temporal features (time of day, day of week)
- Program interaction patterns
- Historical patterns (similar transactions)
- Network metrics (compute units, fees)

**Implementation**:
```typescript
// src/ml/FeatureExtractor.ts
export interface TransactionFeatures {
  // Complexity
  numPrograms: number;
  numAccounts: number;
  numInstructions: number;
  uniqueProgramCount: number;
  
  // Value
  totalSolMoved: number;
  totalTokenTransfers: number;
  estimatedUsdValue: number;
  
  // Temporal
  hourOfDay: number;
  dayOfWeek: number;
  
  // Patterns
  hasNftMint: boolean;
  hasTokenMint: boolean;
  hasDexInteraction: boolean;
  hasLendingInteraction: boolean;
  
  // Network
  computeUnitsUsed: number;
  computePercentage: number;
  feeInSol: number;
}

export class FeatureExtractor {
  extract(tx: ParsedTransaction): TransactionFeatures;
}
```

#### 2.3 ML Model

**Model Type**: Gradient Boosting (XGBoost or LightGBM) for interpretability

**Training Data Sources**:
- Historical "interesting" transactions (manually labeled)
- High-value transactions from known wallets
- Failed transactions (potential exploits)
- Popular program interactions

**Implementation**:
```typescript
// src/ml/TransactionScorer.ts
export class MLTransactionScorer {
  private model: any; // XGBoost/LightGBM model
  private featureExtractor: FeatureExtractor;
  
  constructor(modelPath?: string);
  
  score(tx: ParsedTransaction): number;
  scoreWithExplanation(tx: ParsedTransaction): {
    score: number;
    topFeatures: Array<{ feature: string; contribution: number }>;
  };
  
  // For training
  train(transactions: LabeledTransaction[]): void;
  saveModel(path: string): void;
}
```

#### 2.4 Hybrid Scoring System

```typescript
// src/utils/hybridScoring.ts
export class HybridScorer {
  private ruleScorer: typeof scoreTransaction;
  private mlScorer: MLTransactionScorer;
  
  score(tx: ParsedTransaction): {
    ruleScore: number;
    mlScore: number;
    finalScore: number;
    confidence: number;
  };
}
```

### 3. Real-Time Monitoring

#### 3.1 Monitor Command

**CLI Interface**:
```bash
# Monitor all transactions from a program
txlens monitor --program jupiter

# Monitor specific address
txlens monitor --address <wallet-address>

# Monitor with filters
txlens monitor --program orca --min-score 10 --tag whale_move

# Monitor with alerts
txlens monitor --program token --alert-score 15 --alert-webhook https://...

# Monitor multiple sources
txlens monitor --program jupiter,orca,raydium --min-score 8
```

#### 3.2 Architecture

```
WebSocket Connection → Transaction Stream → Filter → Score → Display/Alert
                            ↓
                    Signature Queue
                            ↓
                    Batch Fetch Details
                            ↓
                    Parse & Score
                            ↓
                    Output/Alert
```

#### 3.3 Implementation

```typescript
// src/monitor/TransactionMonitor.ts
export interface MonitorConfig {
  programs?: string[];
  addresses?: string[];
  minScore?: number;
  tags?: string[];
  alertScore?: number;
  alertWebhook?: string;
  outputFormat?: 'human' | 'json';
  batchSize?: number;
  pollInterval?: number;
}

export class TransactionMonitor {
  private connection: Connection;
  private config: MonitorConfig;
  private signatureQueue: string[];
  private isRunning: boolean;
  
  constructor(config: MonitorConfig, rpcUrl?: string);
  
  async start(): Promise<void>;
  stop(): void;
  
  private async subscribeToProgram(programId: string): Promise<void>;
  private async subscribeToAddress(address: string): Promise<void>;
  private async processBatch(): Promise<void>;
  private async sendAlert(tx: ScoredTransaction): Promise<void>;
}
```

#### 3.4 Alert System

```typescript
// src/monitor/AlertManager.ts
export interface Alert {
  transaction: ScoredTransaction;
  timestamp: Date;
  reason: string;
}

export class AlertManager {
  async sendWebhook(alert: Alert, webhookUrl: string): Promise<void>;
  async sendDiscord(alert: Alert, webhookUrl: string): Promise<void>;
  async sendTelegram(alert: Alert, botToken: string, chatId: string): Promise<void>;
  
  formatAlert(alert: Alert): string;
}
```

### 4. Comprehensive Testing

#### 4.1 Test Structure

```
tests/
├── unit/
│   ├── parser/
│   │   ├── TransactionParser.test.ts
│   │   ├── TokenProgramDecoder.test.ts
│   │   ├── SystemProgramDecoder.test.ts
│   │   ├── MetaplexDecoder.test.ts
│   │   ├── SerumDecoder.test.ts
│   │   └── PumpFunDecoder.test.ts
│   ├── utils/
│   │   ├── interestingRules.test.ts
│   │   └── knownPrograms.test.ts
│   ├── formatter/
│   │   ├── HumanReadableFormatter.test.ts
│   │   └── JsonFormatter.test.ts
│   └── ml/
│       ├── FeatureExtractor.test.ts
│       └── MLTransactionScorer.test.ts
├── integration/
│   ├── decode.test.ts
│   ├── find.test.ts
│   ├── monitor.test.ts
│   └── simulate.test.ts
├── e2e/
│   ├── cli.test.ts
│   └── realTransactions.test.ts
└── fixtures/
    ├── transactions/
    │   ├── jupiter-swap.json
    │   ├── nft-mint.json
    │   ├── token-transfer.json
    │   └── ...
    └── expected/
        └── ...
```

#### 4.2 Testing Framework

**Tools**:
- Jest or Vitest for test runner
- Mock RPC responses for unit tests
- Real transaction fixtures for integration tests
- Snapshot testing for output formats

**Implementation**:
```typescript
// tests/unit/parser/TransactionParser.test.ts
describe('TransactionParser', () => {
  describe('parse', () => {
    it('should parse basic SOL transfer', () => {
      const rawTx = loadFixture('sol-transfer.json');
      const parser = new TransactionParser();
      const result = parser.parse(rawTx);
      
      expect(result.status).toBe('success');
      expect(result.accountChanges).toHaveLength(2);
      expect(result.accountChanges[0].balanceChange).toBeLessThan(0);
    });
    
    it('should handle failed transactions', () => {
      const rawTx = loadFixture('failed-tx.json');
      const parser = new TransactionParser();
      const result = parser.parse(rawTx);
      
      expect(result.status).toBe('failed');
    });
  });
});
```

#### 4.3 Test Coverage Goals

- Unit tests: >80% coverage
- Integration tests: All major commands
- E2E tests: Critical user flows
- Decoder tests: All supported instructions

### 5. Transaction Simulation

#### 5.1 Simulate Command

**CLI Interface**:
```bash
# Simulate a transaction before sending
txlens simulate --from <keypair> --to <address> --amount 1.5

# Simulate token transfer
txlens simulate --token-transfer --mint <mint> --from <keypair> --to <address> --amount 100

# Simulate from unsigned transaction
txlens simulate --transaction <base64-tx>

# Simulate with custom compute budget
txlens simulate --transaction <base64-tx> --compute-units 400000

# Show detailed simulation results
txlens simulate --transaction <base64-tx> --verbose
```

#### 5.2 Implementation

```typescript
// src/simulator/TransactionSimulator.ts
export interface SimulationResult {
  success: boolean;
  error?: string;
  logs: string[];
  accountChanges: AccountChange[];
  tokenTransfers: TokenTransfer[];
  computeUnitsConsumed: number;
  estimatedFee: number;
  warnings: string[];
}

export class TransactionSimulator {
  private connection: Connection;
  
  constructor(rpcUrl?: string);
  
  async simulate(transaction: Transaction | VersionedTransaction): Promise<SimulationResult>;
  async simulateTransfer(params: TransferParams): Promise<SimulationResult>;
  async simulateTokenTransfer(params: TokenTransferParams): Promise<SimulationResult>;
  
  private parseSimulationResponse(response: any): SimulationResult;
  private generateWarnings(result: SimulationResult): string[];
}
```

#### 5.3 Simulation Analysis

```typescript
// src/simulator/SimulationAnalyzer.ts
export class SimulationAnalyzer {
  analyze(result: SimulationResult): {
    isOptimal: boolean;
    suggestions: string[];
    risks: string[];
  };
  
  private checkComputeEfficiency(result: SimulationResult): string[];
  private checkFeeOptimization(result: SimulationResult): string[];
  private detectPotentialIssues(result: SimulationResult): string[];
}
```

## Implementation Plan

### Phase 1: Program Decoders (Week 1-2)
- [ ] Implement MetaplexDecoder
- [ ] Implement SerumDecoder
- [ ] Implement PumpFunDecoder
- [ ] Add decoder registration system
- [ ] Update CLI to use new decoders
- [ ] Add decoder unit tests

### Phase 2: Testing Infrastructure (Week 2-3)
- [ ] Set up Jest/Vitest
- [ ] Create test fixtures from real transactions
- [ ] Write unit tests for existing code
- [ ] Write integration tests for CLI commands
- [ ] Set up CI/CD for automated testing
- [ ] Achieve >80% code coverage

### Phase 3: ML-Based Scoring (Week 3-5)
- [ ] Implement FeatureExtractor
- [ ] Collect and label training data
- [ ] Train initial ML model
- [ ] Implement MLTransactionScorer
- [ ] Create HybridScorer
- [ ] Add ML scoring to find command
- [ ] Write ML component tests

### Phase 4: Real-Time Monitoring (Week 5-6)
- [ ] Implement TransactionMonitor
- [ ] Add WebSocket subscription support
- [ ] Implement AlertManager
- [ ] Add monitor command to CLI
- [ ] Add webhook/Discord/Telegram alerts
- [ ] Write monitor integration tests

### Phase 5: Transaction Simulation (Week 6-7)
- [ ] Implement TransactionSimulator
- [ ] Implement SimulationAnalyzer
- [ ] Add simulate command to CLI
- [ ] Add simulation result formatting
- [ ] Write simulation tests
- [ ] Add simulation examples to docs

### Phase 6: Documentation & Polish (Week 7-8)
- [ ] Update README with new features
- [ ] Create usage examples for each feature
- [ ] Add troubleshooting guide
- [ ] Create video tutorials
- [ ] Performance optimization
- [ ] Final testing and bug fixes

## Dependencies

### New Dependencies
```json
{
  "dependencies": {
    "@metaplex-foundation/mpl-token-metadata": "^3.2.1",
    "@project-serum/serum": "^0.13.65",
    "ws": "^8.14.2"
  },
  "devDependencies": {
    "jest": "^29.7.0",
    "@types/jest": "^29.5.8",
    "ts-jest": "^29.1.1"
  },
  "optionalDependencies": {
    "xgboost-node": "^2.0.0"
  }
}
```

## Success Metrics

1. **Decoder Coverage**: Support for 3+ major program families (Metaplex, Serum, Pump.fun)
2. **Test Coverage**: >80% code coverage with comprehensive test suite
3. **ML Accuracy**: >85% precision on "interesting" transaction detection
4. **Monitor Performance**: Handle 100+ transactions/second with <1s latency
5. **Simulation Accuracy**: 95%+ match with actual transaction results
6. **User Adoption**: 100+ GitHub stars, 50+ npm downloads/week

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Program instruction formats change | High | Version detection, graceful degradation |
| ML model requires large training dataset | Medium | Start with rule-based, gradually improve |
| WebSocket connection instability | Medium | Implement reconnection logic, fallback to polling |
| RPC rate limiting during monitoring | High | Implement backoff, support multiple RPC endpoints |
| Simulation results differ from actual | Medium | Add warnings, show confidence levels |

## Future Enhancements

- Support for more programs (Marinade, Jito, etc.)
- Transaction builder with simulation preview
- Historical transaction analysis and patterns
- Integration with wallet providers
- GraphQL API for programmatic access
- Web dashboard for monitoring
- Mobile app for alerts

## References

- [Solana Web3.js Documentation](https://solana-labs.github.io/solana-web3.js/)
- [Metaplex Documentation](https://docs.metaplex.com/)
- [Serum DEX Documentation](https://docs.projectserum.com/)
- [Anchor IDL Specification](https://www.anchor-lang.com/docs/idl-spec)
