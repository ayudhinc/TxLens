# Design Document

## Overview

This design document outlines the technical architecture and implementation approach for enhancing TxLens with expanded decoder support, ML-based transaction scoring, real-time monitoring, and transaction simulation capabilities. The design maintains the existing modular architecture while adding new components that integrate seamlessly with the current codebase.

### Current Architecture

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

### Design Principles

1. **Modularity**: Each enhancement is a self-contained module with clear interfaces
2. **Backward Compatibility**: Existing functionality remains unchanged
3. **Graceful Degradation**: Features fail gracefully when dependencies are unavailable
4. **Performance**: Optimize for low latency and high throughput
5. **Extensibility**: Easy to add new decoders, features, and integrations

## Architecture

### High-Level Component Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         CLI Layer                            │
│  (decode, find, monitor, simulate commands)                  │
└────────────┬────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────┐
│                    Controller Layer                          │
│  (TransactionController, MonitorController)                  │
└────────┬────────────────────────────────┬───────────────────┘
         │                                │
         ▼                                ▼
┌──────────────────┐            ┌──────────────────────┐
│  Parser Layer    │            │   Monitor Layer      │
│  - Decoders      │            │   - WebSocket        │
│  - Parser        │            │   - Alert Manager    │
└────────┬─────────┘            └──────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────┐
│                    Scoring Layer                              │
│  - Rule-based Scorer                                          │
│  - ML Scorer (Feature Extractor + Model)                      │
│  - Hybrid Scorer                                              │
└────────┬─────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────┐
│                    Simulator Layer                            │
│  - Transaction Simulator                                      │
│  - Simulation Analyzer                                        │
└──────────────────────────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────────────────┐
│                      RPC Layer                                │
│  (Connection to Solana blockchain)                            │
└──────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. Program Decoders

#### 1.1 Decoder Interface

All decoders implement a common interface for consistency:

```typescript
interface InstructionDecoder {
  canDecode(programId: string): boolean;
  decode(instruction: RawInstruction, accountKeys: string[]): DecodedInstruction;
}

interface DecodedInstruction {
  programId: string;
  programName: string;
  instructionName: string;
  data: Record<string, any>;
  accounts: Array<{ name: string; address: string; writable: boolean; signer: boolean }>;
}
```

#### 1.2 Metaplex Decoder

**Supported Programs**:
- Token Metadata: `metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s`
- Candy Machine v3: `CndyV3LdqHUfDLmE5naZjVN8rBZz4tqhdefbAnjHG3JR`
- Auction House: `hausS13jsjafwWwGqZTUQRmWyvyxn9EQpqMwV1PBBmk`

**Implementation Strategy**:

- Use instruction discriminators (first 8 bytes) to identify instruction types
- Leverage @metaplex-foundation/mpl-token-metadata for IDL definitions
- Decode common instructions: CreateMetadataAccountV3, UpdateMetadataAccountV2, MintNewEditionFromMasterEditionViaToken, CreateMasterEditionV3, VerifyCollection, SetAndVerifyCollection
- For Candy Machine: MintV2, Initialize, Update
- For Auction House: Buy, ExecuteSale, Sell

```typescript
export class MetaplexDecoder implements InstructionDecoder {
  private readonly PROGRAM_IDS = {
    TOKEN_METADATA: 'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s',
    CANDY_MACHINE: 'CndyV3LdqHUfDLmE5naZjVN8rBZz4tqhdefbAnjHG3JR',
    AUCTION_HOUSE: 'hausS13jsjafwWwGqZTUQRmWyvyxn9EQpqMwV1PBBmk'
  };

  canDecode(programId: string): boolean {
    return Object.values(this.PROGRAM_IDS).includes(programId);
  }

  decode(instruction: RawInstruction, accountKeys: string[]): DecodedInstruction {
    const discriminator = instruction.data.slice(0, 8);
    
    if (instruction.programId === this.PROGRAM_IDS.TOKEN_METADATA) {
      return this.decodeTokenMetadata(discriminator, instruction.data, accountKeys);
    } else if (instruction.programId === this.PROGRAM_IDS.CANDY_MACHINE) {
      return this.decodeCandyMachine(discriminator, instruction.data, accountKeys);
    } else if (instruction.programId === this.PROGRAM_IDS.AUCTION_HOUSE) {
      return this.decodeAuctionHouse(discriminator, instruction.data, accountKeys);
    }
    
    throw new Error('Unsupported Metaplex program');
  }

  private decodeTokenMetadata(discriminator: Buffer, data: Buffer, accountKeys: string[]): DecodedInstruction {
    // Implementation details
  }
}
```

#### 1.3 Serum Decoder

**Supported Program**: OpenBook/Serum DEX v3 (`9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin`)

**Implementation Strategy**:
- Use @project-serum/serum library for instruction layouts
- Decode key instructions: NewOrderV3, CancelOrderV2, SettleFunds, InitOpenOrders, ConsumeEvents
- Extract order details: side (buy/sell), price, quantity, order type

```typescript
export class SerumDecoder implements InstructionDecoder {
  private readonly PROGRAM_ID = '9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin';

  canDecode(programId: string): boolean {
    return programId === this.PROGRAM_ID;
  }

  decode(instruction: RawInstruction, accountKeys: string[]): DecodedInstruction {
    const instructionType = this.getInstructionType(instruction.data);
    
    switch (instructionType) {
      case 'NewOrderV3':
        return this.decodeNewOrder(instruction.data, accountKeys);
      case 'CancelOrderV2':
        return this.decodeCancelOrder(instruction.data, accountKeys);
      case 'SettleFunds':
        return this.decodeSettleFunds(instruction.data, accountKeys);
      default:
        return this.decodeGeneric(instructionType, instruction.data, accountKeys);
    }
  }
}
```

#### 1.4 Pump.fun Decoder

**Supported Program**: Pump.fun token launcher (program ID to be verified)

**Implementation Strategy**:
- Reverse engineer instruction formats from on-chain transactions
- Decode: Create, Buy, Sell, Initialize instructions
- Extract token details, pricing curves, and transaction amounts

```typescript
export class PumpFunDecoder implements InstructionDecoder {
  private readonly PROGRAM_ID = '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P';

  canDecode(programId: string): boolean {
    return programId === this.PROGRAM_ID;
  }

  decode(instruction: RawInstruction, accountKeys: string[]): DecodedInstruction {
    // Implementation based on observed transaction patterns
  }
}
```

#### 1.5 Decoder Registry

A centralized registry manages all decoders with priority ordering:

```typescript
export class DecoderRegistry {
  private decoders: InstructionDecoder[] = [];

  register(decoder: InstructionDecoder, priority: number = 0): void {
    this.decoders.push({ decoder, priority });
    this.decoders.sort((a, b) => b.priority - a.priority);
  }

  findDecoder(programId: string): InstructionDecoder | null {
    return this.decoders.find(d => d.decoder.canDecode(programId))?.decoder || null;
  }
}
```

### 2. ML-Based Transaction Scoring


#### 2.1 Architecture Overview

The ML scoring system uses a hybrid approach combining rule-based and machine learning models:

```
Transaction → Feature Extraction → ML Model → Score (0-20)
                     ↓
              Rule-based Score → Hybrid Combination → Final Score + Confidence
```

#### 2.2 Feature Extraction

**Feature Categories**:

1. **Complexity Metrics**:
   - Number of programs involved
   - Number of accounts accessed
   - Number of instructions
   - Unique program count
   - Instruction diversity (entropy)

2. **Value Metrics**:
   - Total SOL moved
   - Number of token transfers
   - Estimated USD value (using price oracles)
   - Largest single transfer amount

3. **Temporal Features**:
   - Hour of day (0-23)
   - Day of week (0-6)
   - Time since last similar transaction

4. **Pattern Features** (boolean):
   - Has NFT mint
   - Has token mint
   - Has DEX interaction
   - Has lending protocol interaction
   - Has governance interaction

5. **Network Metrics**:
   - Compute units used
   - Compute percentage of limit
   - Transaction fee in SOL
   - Priority fee

```typescript
export interface TransactionFeatures {
  // Complexity (5 features)
  numPrograms: number;
  numAccounts: number;
  numInstructions: number;
  uniqueProgramCount: number;
  instructionDiversity: number;
  
  // Value (4 features)
  totalSolMoved: number;
  totalTokenTransfers: number;
  estimatedUsdValue: number;
  largestTransferAmount: number;
  
  // Temporal (3 features)
  hourOfDay: number;
  dayOfWeek: number;
  timeSinceLastSimilar: number;
  
  // Patterns (5 features)
  hasNftMint: number;  // 0 or 1
  hasTokenMint: number;
  hasDexInteraction: number;
  hasLendingInteraction: number;
  hasGovernanceInteraction: number;
  
  // Network (4 features)
  computeUnitsUsed: number;
  computePercentage: number;
  feeInSol: number;
  priorityFee: number;
}

export class FeatureExtractor {
  extract(tx: ParsedTransaction): TransactionFeatures {
    return {
      numPrograms: this.countPrograms(tx),
      numAccounts: tx.accountKeys.length,
      numInstructions: tx.instructions.length,
      uniqueProgramCount: this.countUniquePrograms(tx),
      instructionDiversity: this.calculateEntropy(tx),
      totalSolMoved: this.calculateSolMoved(tx),
      totalTokenTransfers: this.countTokenTransfers(tx),
      estimatedUsdValue: this.estimateUsdValue(tx),
      largestTransferAmount: this.findLargestTransfer(tx),
      hourOfDay: new Date(tx.blockTime * 1000).getHours(),
      dayOfWeek: new Date(tx.blockTime * 1000).getDay(),
      timeSinceLastSimilar: 0, // Requires historical tracking
      hasNftMint: this.detectNftMint(tx) ? 1 : 0,
      hasTokenMint: this.detectTokenMint(tx) ? 1 : 0,
      hasDexInteraction: this.detectDexInteraction(tx) ? 1 : 0,
      hasLendingInteraction: this.detectLendingInteraction(tx) ? 1 : 0,
      hasGovernanceInteraction: this.detectGovernanceInteraction(tx) ? 1 : 0,
      computeUnitsUsed: tx.meta?.computeUnitsConsumed || 0,
      computePercentage: (tx.meta?.computeUnitsConsumed || 0) / 1400000,
      feeInSol: (tx.meta?.fee || 0) / 1e9,
      priorityFee: this.extractPriorityFee(tx)
    };
  }
}
```


#### 2.3 ML Model

**Model Selection**: Gradient Boosting (XGBoost or LightGBM)

**Rationale**:
- Excellent performance on tabular data
- Built-in feature importance
- Fast inference
- Handles missing values well
- Interpretable results

**Alternative**: If native dependencies are problematic, use TensorFlow.js with a simple neural network

```typescript
export class MLTransactionScorer {
  private model: any;
  private featureExtractor: FeatureExtractor;
  private modelLoaded: boolean = false;

  constructor(modelPath?: string) {
    this.featureExtractor = new FeatureExtractor();
    this.loadModel(modelPath || this.getDefaultModelPath());
  }

  async loadModel(path: string): Promise<void> {
    try {
      // Load pre-trained model from JSON
      const modelData = await fs.readFile(path, 'utf-8');
      this.model = JSON.parse(modelData);
      this.modelLoaded = true;
    } catch (error) {
      console.warn('Failed to load ML model, will use rule-based scoring');
      this.modelLoaded = false;
    }
  }

  score(tx: ParsedTransaction): number {
    if (!this.modelLoaded) {
      throw new Error('Model not loaded');
    }

    const features = this.featureExtractor.extract(tx);
    const featureVector = this.featuresToVector(features);
    const rawScore = this.model.predict(featureVector);
    
    // Normalize to 0-20 range
    return Math.max(0, Math.min(20, rawScore));
  }

  scoreWithExplanation(tx: ParsedTransaction): {
    score: number;
    topFeatures: Array<{ feature: string; contribution: number }>;
  } {
    const features = this.featureExtractor.extract(tx);
    const score = this.score(tx);
    
    // Calculate SHAP values or feature importance
    const contributions = this.calculateFeatureContributions(features);
    const topFeatures = contributions
      .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
      .slice(0, 5);

    return { score, topFeatures };
  }

  private featuresToVector(features: TransactionFeatures): number[] {
    return [
      features.numPrograms,
      features.numAccounts,
      features.numInstructions,
      features.uniqueProgramCount,
      features.instructionDiversity,
      features.totalSolMoved,
      features.totalTokenTransfers,
      features.estimatedUsdValue,
      features.largestTransferAmount,
      features.hourOfDay,
      features.dayOfWeek,
      features.timeSinceLastSimilar,
      features.hasNftMint,
      features.hasTokenMint,
      features.hasDexInteraction,
      features.hasLendingInteraction,
      features.hasGovernanceInteraction,
      features.computeUnitsUsed,
      features.computePercentage,
      features.feeInSol,
      features.priorityFee
    ];
  }
}
```

#### 2.4 Hybrid Scoring System

Combines rule-based and ML scores with configurable weights:

```typescript
export class HybridScorer {
  private ruleScorer: typeof scoreTransaction;
  private mlScorer: MLTransactionScorer;
  private mlWeight: number = 0.7;
  private ruleWeight: number = 0.3;

  constructor(mlScorer: MLTransactionScorer) {
    this.mlScorer = mlScorer;
  }

  score(tx: ParsedTransaction): {
    ruleScore: number;
    mlScore: number;
    finalScore: number;
    confidence: number;
  } {
    const ruleScore = this.ruleScorer(tx);
    
    let mlScore = 0;
    let confidence = 1.0;
    
    try {
      mlScore = this.mlScorer.score(tx);
    } catch (error) {
      // Fall back to rule-based only
      mlScore = ruleScore;
      confidence = 0.5;
    }

    const finalScore = (mlScore * this.mlWeight) + (ruleScore * this.ruleWeight);

    return { ruleScore, mlScore, finalScore, confidence };
  }
}
```


### 3. Real-Time Monitoring

#### 3.1 Monitor Architecture

```
WebSocket Subscription → Signature Stream → Batch Fetcher → Parser → Scorer → Filter → Display/Alert
         ↓                                                                              ↓
    Reconnection Logic                                                          Alert Manager
```

#### 3.2 Transaction Monitor

```typescript
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
  successfulOnly?: boolean;
  failedOnly?: boolean;
}

export class TransactionMonitor {
  private connection: Connection;
  private config: MonitorConfig;
  private signatureQueue: string[] = [];
  private isRunning: boolean = false;
  private subscriptionIds: number[] = [];
  private stats: MonitorStats;

  constructor(config: MonitorConfig, rpcUrl?: string) {
    this.config = config;
    this.connection = new Connection(rpcUrl || 'https://api.mainnet-beta.solana.com');
    this.stats = { totalTx: 0, alertsSent: 0, avgScore: 0, txPerSecond: 0 };
  }

  async start(): Promise<void> {
    this.isRunning = true;
    
    // Subscribe to programs
    if (this.config.programs) {
      for (const program of this.config.programs) {
        await this.subscribeToProgram(program);
      }
    }

    // Subscribe to addresses
    if (this.config.addresses) {
      for (const address of this.config.addresses) {
        await this.subscribeToAddress(address);
      }
    }

    // Start processing loop
    this.processingLoop();
    
    // Start stats display loop
    this.statsLoop();
  }

  stop(): void {
    this.isRunning = false;
    
    // Unsubscribe from all
    for (const id of this.subscriptionIds) {
      this.connection.removeAccountChangeListener(id);
    }
    
    this.subscriptionIds = [];
  }

  private async subscribeToProgram(programId: string): Promise<void> {
    const pubkey = new PublicKey(programId);
    
    const subscriptionId = this.connection.onLogs(
      pubkey,
      (logs, context) => {
        this.signatureQueue.push(logs.signature);
      },
      'confirmed'
    );
    
    this.subscriptionIds.push(subscriptionId);
  }

  private async subscribeToAddress(address: string): Promise<void> {
    const pubkey = new PublicKey(address);
    
    const subscriptionId = this.connection.onLogs(
      pubkey,
      (logs, context) => {
        this.signatureQueue.push(logs.signature);
      },
      'confirmed'
    );
    
    this.subscriptionIds.push(subscriptionId);
  }

  private async processingLoop(): Promise<void> {
    while (this.isRunning) {
      if (this.signatureQueue.length > 0) {
        await this.processBatch();
      }
      
      await new Promise(resolve => setTimeout(resolve, this.config.pollInterval || 1000));
    }
  }

  private async processBatch(): Promise<void> {
    const batchSize = this.config.batchSize || 10;
    const signatures = this.signatureQueue.splice(0, batchSize);
    
    try {
      const transactions = await this.connection.getParsedTransactions(signatures, {
        maxSupportedTransactionVersion: 0
      });

      for (const tx of transactions) {
        if (!tx) continue;
        
        await this.processTransaction(tx);
      }
    } catch (error) {
      console.error('Error processing batch:', error);
    }
  }

  private async processTransaction(tx: any): Promise<void> {
    // Parse transaction
    const parsed = parseTransaction(tx);
    
    // Apply filters
    if (!this.matchesFilters(parsed)) {
      return;
    }

    // Score transaction
    const score = scoreTransaction(parsed);
    
    // Update stats
    this.updateStats(score);

    // Display
    this.displayTransaction(parsed, score);

    // Check for alerts
    if (this.config.alertScore && score >= this.config.alertScore) {
      await this.sendAlert(parsed, score);
    }
  }

  private matchesFilters(tx: ParsedTransaction): boolean {
    if (this.config.successfulOnly && tx.status !== 'success') return false;
    if (this.config.failedOnly && tx.status !== 'failed') return false;
    // Additional filter logic
    return true;
  }
}
```


#### 3.3 Alert Manager

```typescript
export interface Alert {
  transaction: ParsedTransaction;
  score: number;
  timestamp: Date;
  reason: string;
}

export class AlertManager {
  private lastAlertTime: Map<string, number> = new Map();
  private readonly RATE_LIMIT_MS = 6000; // 10 alerts per minute max

  async sendAlert(alert: Alert, destinations: AlertDestination[]): Promise<void> {
    // Rate limiting
    const now = Date.now();
    for (const dest of destinations) {
      const key = `${dest.type}:${dest.url}`;
      const lastTime = this.lastAlertTime.get(key) || 0;
      
      if (now - lastTime < this.RATE_LIMIT_MS) {
        continue; // Skip this destination due to rate limit
      }

      try {
        await this.sendToDestination(alert, dest);
        this.lastAlertTime.set(key, now);
      } catch (error) {
        console.error(`Failed to send alert to ${dest.type}:`, error);
      }
    }
  }

  private async sendToDestination(alert: Alert, dest: AlertDestination): Promise<void> {
    switch (dest.type) {
      case 'webhook':
        await this.sendWebhook(alert, dest.url);
        break;
      case 'discord':
        await this.sendDiscord(alert, dest.url);
        break;
      case 'telegram':
        await this.sendTelegram(alert, dest.botToken!, dest.chatId!);
        break;
    }
  }

  async sendWebhook(alert: Alert, webhookUrl: string): Promise<void> {
    const payload = {
      signature: alert.transaction.signature,
      score: alert.score,
      timestamp: alert.timestamp.toISOString(),
      reason: alert.reason,
      transaction: alert.transaction
    };

    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  }

  async sendDiscord(alert: Alert, webhookUrl: string): Promise<void> {
    const embed = {
      title: '🚨 High-Score Transaction Alert',
      description: alert.reason,
      color: this.getColorForScore(alert.score),
      fields: [
        { name: 'Signature', value: `\`${alert.transaction.signature}\`` },
        { name: 'Score', value: alert.score.toString(), inline: true },
        { name: 'Status', value: alert.transaction.status, inline: true },
        { name: 'Programs', value: alert.transaction.programs.join(', ') }
      ],
      timestamp: alert.timestamp.toISOString()
    };

    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [embed] })
    });
  }

  async sendTelegram(alert: Alert, botToken: string, chatId: string): Promise<void> {
    const message = this.formatTelegramMessage(alert);
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown'
      })
    });
  }

  private formatTelegramMessage(alert: Alert): string {
    return `
🚨 *High-Score Transaction Alert*

*Score:* ${alert.score}
*Signature:* \`${alert.transaction.signature}\`
*Status:* ${alert.transaction.status}
*Programs:* ${alert.transaction.programs.join(', ')}
*Reason:* ${alert.reason}

*Time:* ${alert.timestamp.toISOString()}
    `.trim();
  }

  private getColorForScore(score: number): number {
    if (score >= 15) return 0xFF0000; // Red
    if (score >= 10) return 0xFFA500; // Orange
    return 0xFFFF00; // Yellow
  }
}
```

### 4. Transaction Simulation

#### 4.1 Simulator Architecture

```typescript
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

  constructor(rpcUrl?: string) {
    this.connection = new Connection(rpcUrl || 'https://api.mainnet-beta.solana.com');
  }

  async simulate(transaction: Transaction | VersionedTransaction): Promise<SimulationResult> {
    try {
      const response = await this.connection.simulateTransaction(transaction, {
        sigVerify: false,
        commitment: 'confirmed'
      });

      return this.parseSimulationResponse(response);
    } catch (error) {
      return {
        success: false,
        error: error.message,
        logs: [],
        accountChanges: [],
        tokenTransfers: [],
        computeUnitsConsumed: 0,
        estimatedFee: 0,
        warnings: []
      };
    }
  }

  async simulateTransfer(params: {
    from: Keypair;
    to: PublicKey;
    amount: number;
  }): Promise<SimulationResult> {
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: params.from.publicKey,
        toPubkey: params.to,
        lamports: params.amount * 1e9
      })
    );

    transaction.recentBlockhash = (await this.connection.getLatestBlockhash()).blockhash;
    transaction.feePayer = params.from.publicKey;

    return this.simulate(transaction);
  }

  async simulateTokenTransfer(params: {
    mint: PublicKey;
    from: Keypair;
    to: PublicKey;
    amount: number;
  }): Promise<SimulationResult> {
    // Build token transfer transaction
    // Simulate and return results
  }

  private parseSimulationResponse(response: any): SimulationResult {
    const { value } = response;
    
    if (value.err) {
      return {
        success: false,
        error: JSON.stringify(value.err),
        logs: value.logs || [],
        accountChanges: [],
        tokenTransfers: [],
        computeUnitsConsumed: value.unitsConsumed || 0,
        estimatedFee: 0,
        warnings: []
      };
    }

    const accountChanges = this.extractAccountChanges(value.accounts);
    const tokenTransfers = this.extractTokenTransfers(value.logs);
    const warnings = this.generateWarnings(value);

    return {
      success: true,
      logs: value.logs || [],
      accountChanges,
      tokenTransfers,
      computeUnitsConsumed: value.unitsConsumed || 0,
      estimatedFee: 5000, // Base fee estimate
      warnings
    };
  }

  private generateWarnings(simulationValue: any): string[] {
    const warnings: string[] = [];
    
    const computeUsed = simulationValue.unitsConsumed || 0;
    const computeLimit = 1400000;
    
    if (computeUsed > computeLimit * 0.8) {
      warnings.push(`High compute usage: ${computeUsed}/${computeLimit} (${(computeUsed/computeLimit*100).toFixed(1)}%)`);
    }

    return warnings;
  }
}
```


#### 4.2 Simulation Analyzer

```typescript
export class SimulationAnalyzer {
  analyze(result: SimulationResult): {
    isOptimal: boolean;
    suggestions: string[];
    risks: string[];
  } {
    const suggestions: string[] = [];
    const risks: string[] = [];
    let isOptimal = true;

    // Check compute efficiency
    if (result.computeUnitsConsumed > 1400000 * 0.8) {
      isOptimal = false;
      suggestions.push('Consider optimizing compute usage or splitting into multiple transactions');
    }

    // Check fee optimization
    if (result.estimatedFee > 0.01 * 1e9) {
      suggestions.push('High transaction fee detected. Consider adjusting priority fees.');
    }

    // Detect potential issues
    if (!result.success) {
      risks.push(`Transaction will fail: ${result.error}`);
      isOptimal = false;
    }

    // Check for suspicious patterns in logs
    const suspiciousPatterns = ['insufficient', 'overflow', 'underflow'];
    for (const log of result.logs) {
      for (const pattern of suspiciousPatterns) {
        if (log.toLowerCase().includes(pattern)) {
          risks.push(`Potential issue detected in logs: ${pattern}`);
        }
      }
    }

    return { isOptimal, suggestions, risks };
  }
}
```

## Data Models

### ParsedTransaction

```typescript
interface ParsedTransaction {
  signature: string;
  blockTime: number;
  slot: number;
  status: 'success' | 'failed';
  fee: number;
  accountKeys: string[];
  instructions: DecodedInstruction[];
  programs: string[];
  accountChanges: AccountChange[];
  tokenTransfers: TokenTransfer[];
  meta: {
    computeUnitsConsumed?: number;
    fee: number;
    err: any;
  };
}
```

### AccountChange

```typescript
interface AccountChange {
  address: string;
  balanceChange: number;
  preBalance: number;
  postBalance: number;
}
```

### TokenTransfer

```typescript
interface TokenTransfer {
  mint: string;
  from: string;
  to: string;
  amount: number;
  decimals: number;
}
```

## Error Handling

### Error Categories

1. **Network Errors**: RPC connection failures, timeouts
2. **Parsing Errors**: Malformed transaction data
3. **Decoder Errors**: Unknown instruction formats
4. **ML Errors**: Model loading or inference failures

### Error Handling Strategy

```typescript
class TxLensError extends Error {
  constructor(
    message: string,
    public category: 'network' | 'parsing' | 'decoder' | 'ml',
    public recoverable: boolean = true
  ) {
    super(message);
  }
}

// Usage
try {
  const result = await decoder.decode(instruction);
} catch (error) {
  if (error instanceof TxLensError && error.recoverable) {
    // Log and continue
    console.warn(`Decoder error: ${error.message}`);
    return fallbackDecode(instruction);
  } else {
    // Fatal error
    throw error;
  }
}
```

### Retry Logic

```typescript
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  backoffMs: number = 1000
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, backoffMs * Math.pow(2, i)));
    }
  }
  throw new Error('Max retries exceeded');
}
```

## Testing Strategy

### Unit Tests

- Test each decoder independently with fixture data
- Test feature extraction with known transactions
- Test scoring algorithms with labeled data
- Test alert formatting and rate limiting
- Test simulation parsing logic

### Integration Tests

- Test full transaction parsing pipeline
- Test monitor with mock WebSocket
- Test CLI commands with mock RPC
- Test alert delivery to test endpoints

### End-to-End Tests

- Test against Solana devnet
- Test real transaction decoding
- Test monitoring with live data (short duration)
- Test simulation with real transactions

### Test Fixtures

Collect real transactions for testing:
- NFT mints from Metaplex
- DEX swaps from Serum
- Token launches from Pump.fun
- Complex multi-program transactions
- Failed transactions

## Performance Considerations

### Optimization Strategies

1. **Caching**: Cache decoded program IDs and instruction layouts
2. **Batch Processing**: Process multiple transactions in parallel
3. **Connection Pooling**: Reuse RPC connections
4. **Lazy Loading**: Load ML model only when needed
5. **Stream Processing**: Process monitor data as it arrives

### Performance Targets

- Single transaction decode: < 500ms
- Monitor throughput: 100+ tx/sec
- ML scoring: < 100ms per transaction
- Memory usage: < 500MB for 24h monitoring

## Security Considerations

1. **Input Validation**: Validate all user inputs (addresses, amounts, etc.)
2. **RPC Endpoint Security**: Support custom RPC endpoints with authentication
3. **Webhook Security**: Validate webhook URLs, implement timeouts
4. **Keypair Handling**: Never log or expose private keys
5. **Rate Limiting**: Implement rate limits for all external calls

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

## Configuration

### Configuration File Format

```json
{
  "rpcUrl": "https://api.mainnet-beta.solana.com",
  "mlModel": {
    "enabled": true,
    "path": "~/.txlens/model.json",
    "weight": 0.7
  },
  "monitor": {
    "batchSize": 10,
    "pollInterval": 1000,
    "maxQueueSize": 1000
  },
  "alerts": {
    "rateLimit": 10,
    "destinations": [
      {
        "type": "webhook",
        "url": "https://example.com/webhook"
      }
    ]
  }
}
```

## Future Enhancements

1. **Additional Decoders**: Marinade, Jito, Drift, Phoenix, Tensor
2. **Advanced ML**: Online learning, anomaly detection, clustering
3. **Web Dashboard**: Real-time monitoring UI
4. **GraphQL API**: Programmatic access to TxLens features
5. **Mobile Alerts**: Push notifications via mobile app
6. **Historical Analysis**: Pattern detection across historical data
7. **Transaction Builder**: GUI for constructing and simulating transactions
