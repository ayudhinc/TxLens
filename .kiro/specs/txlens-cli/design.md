# TxLens Design Document

## Overview

TxLens is a Node.js-based command-line tool that fetches Solana transaction data via RPC and transforms it into human-readable output. The architecture follows a layered approach with clear separation between CLI handling, data fetching, transaction parsing, and output formatting.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         CLI Layer                            │
│  (Argument parsing, command routing, error handling)         │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                    Controller Layer                          │
│  (Orchestrates fetching, parsing, and formatting)            │
└──────────┬────────────────────────────┬─────────────────────┘
           │                            │
┌──────────▼────────────┐    ┌─────────▼──────────────────────┐
│   RPC Client Layer    │    │    Parser Layer                 │
│  (Solana blockchain   │    │  (Transaction decoding,         │
│   data fetching)      │    │   instruction parsing)          │
└───────────────────────┘    └─────────┬──────────────────────┘
                                       │
                            ┌──────────▼──────────────────────┐
                            │    Formatter Layer              │
                            │  (Human-readable & JSON output) │
                            └─────────────────────────────────┘
```

## Components and Interfaces

### 1. CLI Component (`src/cli.ts`)

**Responsibility:** Parse command-line arguments and route to appropriate handlers

**Interface:**
```typescript
interface CLIOptions {
  signature: string;
  rpc?: string;
  json?: boolean;
}

function parseCLI(args: string[]): CLIOptions;
function main(): Promise<void>;
```

**Key Behaviors:**
- Validates transaction signature format (base58, 88 characters)
- Provides default RPC endpoint if not specified
- Handles --rpc and --json flags
- Displays usage information for invalid input

### 2. Transaction Controller (`src/controller/TransactionController.ts`)

**Responsibility:** Orchestrate the flow from fetching to output

**Interface:**
```typescript
class TransactionController {
  constructor(rpcClient: RpcClient, parser: TransactionParser, formatter: OutputFormatter);
  
  async processTransaction(signature: string, options: ProcessOptions): Promise<void>;
}

interface ProcessOptions {
  outputFormat: 'human' | 'json';
}
```

**Key Behaviors:**
- Coordinates RPC client, parser, and formatter
- Handles errors at each stage
- Manages the overall transaction processing pipeline

### 3. RPC Client (`src/rpc/RpcClient.ts`)

**Responsibility:** Fetch transaction data from Solana blockchain

**Interface:**
```typescript
class RpcClient {
  constructor(endpoint: string);
  
  async getTransaction(signature: string): Promise<RawTransaction>;
  async validateConnection(): Promise<boolean>;
}

interface RawTransaction {
  slot: number;
  blockTime: number | null;
  transaction: {
    message: {
      accountKeys: string[];
      instructions: RawInstruction[];
      recentBlockhash: string;
    };
    signatures: string[];
  };
  meta: {
    err: any | null;
    fee: number;
    preBalances: number[];
    postBalances: number[];
    preTokenBalances: TokenBalance[];
    postTokenBalances: TokenBalance[];
    logMessages: string[];
    computeUnitsConsumed: number;
  };
}
```

**Key Behaviors:**
- Uses `@solana/web3.js` Connection class
- Calls `getTransaction` with maxSupportedTransactionVersion
- Validates RPC endpoint connectivity
- Handles network errors and timeouts

### 4. Transaction Parser (`src/parser/TransactionParser.ts`)

**Responsibility:** Transform raw transaction data into structured, decoded information

**Interface:**
```typescript
class TransactionParser {
  parse(rawTransaction: RawTransaction): ParsedTransaction;
}

interface ParsedTransaction {
  signature: string;
  status: 'success' | 'failed';
  slot: number;
  blockTime: Date | null;
  accountChanges: AccountChange[];
  tokenTransfers: TokenTransfer[];
  programInteractions: ProgramInteraction[];
  computeUnits: {
    used: number;
    limit: number;
  };
  fee: number;
}

interface AccountChange {
  address: string;
  balanceChange: number; // in lamports
  isFeeP: boolean;
}

interface TokenTransfer {
  mint: string;
  symbol?: string;
  amount: number;
  decimals: number;
  from: string;
  to: string;
}

interface ProgramInteraction {
  programId: string;
  programName?: string;
  instructionType: string;
  details: Record<string, any>;
}
```

**Key Behaviors:**
- Calculates balance changes from pre/post balances
- Identifies fee payer (first signer with negative balance)
- Parses token transfers from preTokenBalances and postTokenBalances
- Decodes known program instructions (Token Program, System Program)
- Extracts compute units from transaction metadata

### 5. Instruction Decoder (`src/parser/InstructionDecoder.ts`)

**Responsibility:** Decode program-specific instruction data

**Interface:**
```typescript
interface InstructionDecoder {
  canDecode(programId: string): boolean;
  decode(instruction: RawInstruction): DecodedInstruction;
}

interface DecodedInstruction {
  type: string;
  params: Record<string, any>;
}

class TokenProgramDecoder implements InstructionDecoder { }
class SystemProgramDecoder implements InstructionDecoder { }
```

**Key Behaviors:**
- Supports SPL Token Program instruction decoding
- Supports System Program instruction decoding
- Returns generic instruction info for unknown programs
- Uses instruction discriminators to identify instruction types

### 6. Output Formatter (`src/formatter/OutputFormatter.ts`)

**Responsibility:** Format parsed transaction data for display

**Interface:**
```typescript
interface OutputFormatter {
  format(transaction: ParsedTransaction): string;
}

class HumanReadableFormatter implements OutputFormatter {
  constructor(useColors: boolean);
  format(transaction: ParsedTransaction): string;
}

class JsonFormatter implements OutputFormatter {
  format(transaction: ParsedTransaction): string;
}
```

**Key Behaviors:**
- HumanReadableFormatter creates structured text output with sections
- Applies color coding using chalk library when terminal supports it
- Shortens addresses to first 4 and last 4 characters
- Converts lamports to SOL with proper decimal places
- JsonFormatter serializes to pretty-printed JSON

### 7. Utility Modules

**Address Formatter (`src/utils/addressFormatter.ts`):**
```typescript
function shortenAddress(address: string): string; // Returns "abcd...wxyz"
function isValidSignature(signature: string): boolean;
```

**Amount Formatter (`src/utils/amountFormatter.ts`):**
```typescript
function lamportsToSol(lamports: number): string;
function formatTokenAmount(amount: number, decimals: number): string;
```

**Known Programs Registry (`src/utils/knownPrograms.ts`):**
```typescript
const KNOWN_PROGRAMS: Record<string, string> = {
  'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA': 'Token Program',
  '11111111111111111111111111111111': 'System Program',
  // ... more programs
};

function getProgramName(programId: string): string | undefined;
```

## Data Models

### Transaction Processing Flow

```
Raw RPC Response
      ↓
[RpcClient validates and returns RawTransaction]
      ↓
[TransactionParser processes]
      ↓
ParsedTransaction (structured data)
      ↓
[OutputFormatter formats]
      ↓
String output (human or JSON)
```

### Key Data Transformations

1. **Balance Changes:**
   - Input: `meta.preBalances[]` and `meta.postBalances[]`
   - Process: Calculate difference for each account
   - Output: `AccountChange[]` with lamport differences

2. **Token Transfers:**
   - Input: `meta.preTokenBalances[]` and `meta.postTokenBalances[]`
   - Process: Match by account and mint, calculate differences
   - Output: `TokenTransfer[]` with decoded amounts

3. **Program Interactions:**
   - Input: `transaction.message.instructions[]`
   - Process: Decode instruction data using program-specific decoders
   - Output: `ProgramInteraction[]` with human-readable descriptions

## Error Handling

### Error Categories

1. **Input Validation Errors:**
   - Invalid signature format
   - Malformed RPC URL
   - Missing required arguments

2. **Network Errors:**
   - RPC endpoint unreachable
   - Connection timeout
   - Rate limiting

3. **Data Errors:**
   - Transaction not found
   - Incomplete transaction data
   - Unsupported transaction version

4. **Processing Errors:**
   - Instruction decoding failure
   - Invalid balance data
   - Timestamp parsing errors

### Error Handling Strategy

```typescript
class TxLensError extends Error {
  constructor(
    message: string,
    public code: ErrorCode,
    public details?: any
  ) {
    super(message);
  }
}

enum ErrorCode {
  INVALID_SIGNATURE = 'INVALID_SIGNATURE',
  INVALID_RPC_URL = 'INVALID_RPC_URL',
  RPC_CONNECTION_FAILED = 'RPC_CONNECTION_FAILED',
  TRANSACTION_NOT_FOUND = 'TRANSACTION_NOT_FOUND',
  PARSING_FAILED = 'PARSING_FAILED',
}
```

**Error Display:**
- Human-readable error messages
- Exit with appropriate status codes
- Include helpful suggestions for common errors
- Log detailed errors in debug mode

## Testing Strategy

### Unit Tests

**RPC Client Tests:**
- Mock Solana Connection responses
- Test error handling for network failures
- Verify correct RPC method calls

**Parser Tests:**
- Test balance change calculations with known inputs
- Verify token transfer parsing
- Test instruction decoding for known programs
- Handle edge cases (empty transactions, failed transactions)

**Formatter Tests:**
- Verify human-readable output structure
- Test JSON serialization
- Verify color code application
- Test address shortening

**Utility Tests:**
- Test signature validation
- Test amount formatting
- Test address formatting

### Integration Tests

- End-to-end test with mock RPC responses
- Test complete flow from CLI input to formatted output
- Verify error propagation through layers

### Manual Testing

- Test against real Solana transactions on devnet/mainnet
- Verify output accuracy against Solana Explorer
- Test with various transaction types (simple transfers, complex DeFi)
- Test color output in different terminal environments

## Dependencies

**Core Dependencies:**
- `@solana/web3.js` - Solana RPC client and utilities
- `commander` or `yargs` - CLI argument parsing
- `chalk` - Terminal color output
- `bs58` - Base58 encoding/decoding for signature validation

**Development Dependencies:**
- `typescript` - Type safety
- `@types/node` - Node.js type definitions
- `vitest` or `jest` - Testing framework
- `ts-node` - TypeScript execution for development

## Configuration

**Default RPC Endpoints:**
```typescript
const DEFAULT_RPC_ENDPOINTS = {
  mainnet: 'https://api.mainnet-beta.solana.com',
  devnet: 'https://api.devnet.solana.com',
};
```

**Output Configuration:**
```typescript
const OUTPUT_CONFIG = {
  addressDisplayLength: 4, // Characters to show on each side
  maxInstructionsDisplay: 20, // Limit for very complex transactions
  colorEnabled: process.stdout.isTTY,
};
```

## Performance Considerations

- Single RPC call per transaction lookup
- Lazy loading of instruction decoders
- Efficient balance change calculation (O(n) where n = number of accounts)
- Stream-based output for large JSON responses
- Connection pooling for multiple transaction queries (future enhancement)

## Security Considerations

- Validate all user inputs (signature format, RPC URLs)
- Use HTTPS for RPC connections
- No storage of sensitive data
- Rate limiting awareness for public RPC endpoints
- Sanitize error messages to avoid leaking sensitive information
