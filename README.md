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
- 🌐 **Custom RPC Support** - Use any Solana RPC endpoint
- 📄 **JSON Output** - Machine-readable format for integration with other tools
- 🔗 **Versioned Transactions** - Full support for address lookup tables

## Installation

### From Source

```bash
# Clone the repository
git clone <repository-url>
cd TxLens

# Install dependencies
pnpm install

# Build the project
pnpm run build

# Link globally (optional)
npm link
```

### Using the CLI

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

```bash
# Find recent transactions from Jupiter aggregator
txlens find --program jupiter --limit 5

# Find transactions from a specific address
txlens find --address <solana-address> --limit 10

# Find only successful transactions
txlens find --program orca --successful

# Find only failed transactions
txlens find --program raydium --failed

# Pick a random transaction and decode it automatically
txlens find --program token --random

# Available programs: jupiter, orca, raydium, solend, token
```

### Command Options

#### `decode` command
- `<signature>` - Transaction signature to decode (required)
- `--rpc <url>` - Custom RPC endpoint URL (default: mainnet)
- `--json` - Output in JSON format

#### `find` command
- `--program <name>` - Query known program (jupiter, orca, raydium, solend, token)
- `--address <address>` - Query specific Solana address
- `--limit <number>` - Number of transactions to fetch (default: 10)
- `--successful` - Only show successful transactions
- `--failed` - Only show failed transactions
- `--random` - Pick and decode a random transaction
- `--rpc <url>` - Custom RPC endpoint URL
- `--json` - Output in JSON format

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
- Improve error messages and handling
- Add more filtering options for transaction discovery
- Enhance output formatting
- Write tests
- Improve documentation

Please feel free to submit a Pull Request.

## Roadmap

- [ ] Add more program decoders (Metaplex, Serum, etc.)
- [ ] Support for transaction simulation
- [ ] Interactive mode for exploring transactions
- [ ] Export to different formats (CSV, HTML)
- [ ] Transaction comparison tool
- [ ] Performance metrics and analytics

## License

MIT

## Acknowledgments

Built with:
- [@solana/web3.js](https://github.com/solana-labs/solana-web3.js) - Solana JavaScript SDK
- [Commander.js](https://github.com/tj/commander.js) - CLI framework
- [Chalk](https://github.com/chalk/chalk) - Terminal styling
- [bs58](https://github.com/cryptocoinjs/bs58) - Base58 encoding/decoding
