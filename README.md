```
▀█▀ ▀▄▀ █░░ █▀▀ █▄░█ █▀
░█░ █░█ █▄▄ ██▄ █░▀█ ▄█
```

# TxLens

A command-line tool that decodes and explains Solana transactions in human-readable format.

## Overview

TxLens helps developers understand what's happening in Solana transactions by breaking down complex transaction data into clear, readable information. It fetches transaction data from the Solana blockchain, parses program instructions, and displays everything in an easy-to-understand format.

## Features

- 🔍 **Decode Transactions** - Convert transaction signatures into human-readable format
- 💰 **Account Changes** - Show balance differences and identify fee payers
- 🪙 **Token Transfers** - Display SPL token transfers with proper decimals
- 📝 **Program Interactions** - Decode instructions from Token Program, System Program, and more
- ⚡ **Compute & Fees** - Show compute units consumed and transaction fees
- 🎨 **Color-Coded Output** - Better readability with terminal colors
- 🔎 **Transaction Discovery** - Find interesting transactions from popular programs
- � ***Smart Scoring System** - Pluggable rules engine to identify interesting transactions
- 🏷️ **Tag-Based Filtering** - Filter by whale moves, new tokens, NFT mints, DeFi, and more
- 🌐 **Custom RPC Support** - Use any Solana RPC endpoint
- 📄 **JSON Output** - Machine-readable format for integration with other tools
- 🔗 **Versioned Transactions** - Full support for address lookup tables

## Installation

### From npm (Recommended)

```bash
# Install globally
npm install -g txlens

# Verify installation
txlens --version
```

### From Source

```bash
# Clone the repository
git clone https://github.com/ayudhinc/TxLens.git
cd TxLens

# Install dependencies
pnpm install

# Build the project
pnpm run build

# Link globally (optional)
npm link
```

### Development

```bash
# Run directly with ts-node (development)
pnpm exec ts-node src/cli.ts <command>

# Or after building
node dist/cli.js <command>
```

## Usage

### Decode a Specific Transaction

```bash
# Decode a transaction by signature
txlens decode <transaction-signature>

# Use with custom RPC endpoint
txlens decode <transaction-signature> --rpc https://api.mainnet-beta.solana.com

# Output as JSON
txlens decode <transaction-signature> --json
```

### Find Interesting Transactions

The `find` command uses a smart scoring system to identify interesting transactions based on multiple criteria.

```bash
# Find recent transactions from Jupiter aggregator
txlens find --program jupiter --limit 10

# Find transactions from a specific address
txlens find --address <solana-address> --limit 10

# Find only high-scoring transactions (minimum score of 10)
txlens find --program token --min-score 10

# Filter by specific tags
txlens find --program jupiter --tag whale_move defi

# Decode the most interesting transaction automatically
txlens find --program orca --decode-top

# Pick a random interesting transaction and decode it
txlens find --program token --random

# Find only successful transactions
txlens find --program orca --successful

# Find only failed transactions (potential bugs/attacks)
txlens find --program raydium --failed

# Available programs: jupiter, orca, raydium, solend, token
```

#### Interest Scoring System

Transactions are automatically scored based on these criteria:

- **Whale Moves** (score: 4-10) - Large SOL movements (>10, >50, >100 SOL)
- **New Tokens** (score: 8) - Token mint creation
- **NFT Mints** (score: 6) - NFT creation (0 decimals)
- **High Compute** (score: 5-7) - Complex transactions (>1M compute units or >80% usage)
- **High Fees** (score: 6) - Expensive transactions (>0.01 SOL)
- **DeFi Interactions** (score: 5) - Jupiter, Orca, Raydium, Solend, Serum
- **Multi-Token Transfers** (score: 3-6) - Transactions with many token movements
- **Complex Multi-Program** (score: 4-7) - Transactions using many programs
- **Failed Transactions** (score: 5) - Potential attacks or bugs

Tags: `whale_move`, `large_move`, `medium_move`, `new_token`, `nft_mint`, `high_compute`, `compute_intensive`, `high_fee`, `defi`, `token_transfer`, `multi_token`, `complex`, `multi_program`, `failed`

### Command Options

#### `decode` command
- `<signature>` - Transaction signature to decode (required)
- `--rpc <url>` - Custom RPC endpoint URL (default: mainnet)
- `--json` - Output in JSON format
- `--debug` - Enable debug mode with detailed error information

#### `find` command
- `--program <name>` - Query known program (jupiter, orca, raydium, solend, token)
- `--address <address>` - Query specific Solana address
- `--limit <number>` - Number of transactions to fetch (default: 20)
- `--min-score <number>` - Minimum interest score threshold (default: 5)
- `--tag <tags...>` - Filter by specific tags (whale_move, new_token, nft_mint, defi, etc)
- `--successful` - Only show successful transactions
- `--failed` - Only show failed transactions
- `--decode-top` - Automatically decode the most interesting transaction
- `--random` - Pick and decode a random interesting transaction
- `--rpc <url>` - Custom RPC endpoint URL
- `--json` - Output in JSON format
- `--debug` - Enable debug mode with detailed error information

## Troubleshooting

### Debug Mode

TxLens provides detailed error information in debug mode to help diagnose issues:

```bash
# Enable debug mode with --debug flag
txlens decode <signature> --debug

# Or set environment variable
DEBUG=true txlens decode <signature>
TXLENS_DEBUG=1 txlens decode <signature>
```

Debug mode displays:
- Full error stack traces
- Detailed error context and parameters
- Internal error codes
- Additional diagnostic information

### Common Errors

#### Invalid Signature Format
```
Error [INVALID_SIGNATURE]: Invalid transaction signature format

Tip: Transaction signatures are 88 characters in base58 format
Example: 5VERv8NMvzbJMEkV8xnrLkEaWRtSz9CosKDYjCJjBRnbJLgp8uirBgmQpjKhoR4tjF3ZpRzrFmBV6UjKdiSZkQUW
```

#### RPC Connection Failed
```
Error [RPC_CONNECTION_FAILED]: Failed to connect to RPC endpoint

Tip: Check your internet connection and RPC endpoint
Try using a different RPC endpoint with --rpc flag
```

#### Transaction Not Found
```
Error [TRANSACTION_NOT_FOUND]: Transaction not found on the blockchain

Tip: Verify the transaction signature is correct
Check the transaction on Solana Explorer: https://explorer.solana.com
```

#### Rate Limited
```
Error [RPC_RATE_LIMITED]: RPC endpoint rate limit exceeded

Tip: You have exceeded the rate limit for this RPC endpoint
Wait a moment and try again, or use a different endpoint
```

### Getting Help

If you encounter issues:

1. **Enable debug mode** to see detailed error information
2. **Check the error code** and follow the suggested tips
3. **Try a different RPC endpoint** if you're having connection issues
4. **Verify the transaction signature** on Solana Explorer
5. **Open an issue** on GitHub with debug output if the problem persists

## Example Output

### Human-Readable Format

```
=== Transaction Details ===

Signature: 2MbAQZJicE8q3TUyCTWsGZMojSgeTzqCgMNfNNYnpRFRjUPrifjWPVw1HcrHavEt6qszThXd19p8keP7aXMA91HX
Status: ✓ Success
Block: 378824854
Time: 2025-11-08T23:06:40.000Z

Account Changes:

  DC85...Maju: -0.016294598 SOL (fee payer)
  3EYQ...kebr: +0.016287598 SOL

Token Transfers:

  1. ErY8...RAea
     Amount: 7371.680785
     From: unknown
     To: 6tgC...Lyfe
  2. So11...1112
     Amount: 0.016287598
     From: unknown
     To: 3EYQ...kebr

Program Interactions:

  1. Compute Budget Program
     Instruction: Unknown
  2. Token Program
     Instruction: Transfer
     source: 6tgC...Lyfe
     destination: EG4J...1MLL
     authority: DC85...Maju
     amount: 7371680785

Compute & Fees:

  Compute Units: 77,141 / 200,000 (38.6%)
  Fee: 0.000007 SOL
```

### JSON Format

```json
{
  "signature": "2MbAQ...",
  "status": "success",
  "slot": 378824854,
  "blockTime": "2025-11-08T23:06:40.000Z",
  "accountChanges": [
    {
      "address": "DC85...Maju",
      "balanceChange": -16294598,
      "isFeePayer": true
    }
  ],
  "tokenTransfers": [...],
  "programInteractions": [...],
  "computeUnits": {
    "used": 77141,
    "limit": 200000
  },
  "fee": 7000
}
```

### Scored Transaction Output

When using `find` command, transactions are scored and tagged:

```
Found 1 interesting transaction(s):

1. 2aEvtk7dJoYjrUmLreoUQgrMypxCv6N24bydFhbAxr4Tu5uMwfxpdGa2ntKNSJr6x46JMgaE8PCpHZUeAFXf1XCp
   Score: 12 | Tags: defi, token_transfer, multi_program
   Interacts with Raydium CLMM | 3 token transfer(s) | 4 different programs
   Status: ✓ Success | Time: 2025-11-08T23:21:18.000Z
```

## Architecture

TxLens follows a layered architecture:

```
CLI Layer (argument parsing, command routing)
    ↓
Controller Layer (orchestrates the pipeline)
    ↓
RPC Client Layer (fetches transaction data)
    ↓
Parser Layer (decodes instructions, calculates changes)
    ↓
Formatter Layer (human-readable or JSON output)
```

### Key Components

- **RpcClient** - Fetches transaction data from Solana RPC
- **TransactionParser** - Transforms raw data into structured format
- **InstructionDecoders** - Decode program-specific instructions
  - TokenProgramDecoder - SPL Token Program instructions
  - SystemProgramDecoder - System Program instructions
- **OutputFormatters** - Format parsed data for display
  - HumanReadableFormatter - Color-coded terminal output
  - JsonFormatter - Machine-readable JSON output
- **TransactionController** - Orchestrates the entire pipeline
- **InterestingRules** - Pluggable scoring system for transaction discovery
  - Configurable rules with scores and tags
  - Aggregates multiple signals into overall interest score
  - Extensible for custom detection logic

## Supported Programs

TxLens can decode instructions from:

- **Token Program** - Transfer, TransferChecked, MintTo, Burn, CloseAccount, InitializeAccount
- **System Program** - Transfer, CreateAccount, Allocate, Assign, Nonce operations
- **Known Programs** - Jupiter, Orca, Raydium, Solend, and more (displays program names)

## Development

### Prerequisites

- Node.js 16+
- pnpm 8+

### Setup

```bash
# Install dependencies
pnpm install

# Run in development mode
pnpm exec ts-node src/cli.ts <command>

# Build
pnpm run build

# Run tests (when available)
pnpm test
```

### Project Structure

```
TxLens/
├── src/
│   ├── cli.ts                    # CLI entry point
│   ├── controller/               # Transaction controller
│   ├── rpc/                      # RPC client and types
│   ├── parser/                   # Transaction parser and decoders
│   ├── formatter/                # Output formatters
│   └── utils/                    # Utility functions
├── bin/
│   └── txlens.js                 # Executable entry point
├── dist/                         # Compiled JavaScript
└── package.json
```

## Contributing

Contributions are welcome! Here are some ways you can help:

- Add support for more program instruction decoders
- Create custom interesting transaction rules
- Improve error messages and handling
- Add more filtering options for transaction discovery
- Enhance output formatting
- Write tests
- Improve documentation

### Adding Custom Rules

You can easily add custom detection rules to the scoring system:

```typescript
// In src/utils/interestingRules.ts
const customRule: InterestingRule = (tx: NormalizedTx) => {
  // Your custom logic
  if (tx.totalSolMoved > 1000) {
    return {
      score: 15,
      tag: 'mega_whale',
      reason: 'Massive SOL movement detected'
    };
  }
  return false;
};

// Add to DEFAULT_RULES array
export const DEFAULT_RULES: InterestingRule[] = [
  customRule,
  // ... existing rules
];
```

Please feel free to submit a Pull Request.

## Roadmap

- [ ] Add more program decoders (Metaplex, Serum, etc.)
- [ ] Machine learning-based transaction scoring
- [ ] Real-time transaction monitoring and alerts
- [ ] Support for transaction simulation
- [ ] Interactive mode for exploring transactions
- [ ] Export to different formats (CSV, HTML)
- [ ] Transaction comparison tool
- [ ] Performance metrics and analytics
- [ ] Custom rule configuration via config file

## License

MIT

## Acknowledgments

Built with:
- [@solana/web3.js](https://github.com/solana-labs/solana-web3.js) - Solana JavaScript SDK
- [Commander.js](https://github.com/tj/commander.js) - CLI framework
- [Chalk](https://github.com/chalk/chalk) - Terminal styling
- [bs58](https://github.com/cryptocoinjs/bs58) - Base58 encoding/decoding
