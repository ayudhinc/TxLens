# TxLens

A command-line tool that decodes and explains Solana transactions in human-readable format.

## Overview

TxLens helps developers understand what's happening in Solana transactions by breaking down complex transaction data into clear, readable information.

## Features

- 🔍 Decode transaction signatures into human-readable format
- 💰 Show account changes and balance differences
- 🪙 Display token transfers and amounts
- 📝 Explain program interactions and instruction data
- ⚡ Show compute units used and transaction fees
- 🎨 Color-coded output for better readability

## Installation

```bash
npm install -g txlens
```

## Usage

```bash
# Inspect a transaction by signature
txlens <transaction-signature>

# Use with custom RPC endpoint
txlens <transaction-signature> --rpc https://api.mainnet-beta.solana.com

# Output as JSON
txlens <transaction-signature> --json
```

## Example Output

```
Transaction: 5j7s...8k2p
Status: ✓ Success
Block: 234567890
Timestamp: 2025-11-07 10:30:45 UTC

Account Changes:
  • 9xQe...7k3L: -0.001 SOL (fee payer)
  • 4Nd8...2mP9: +10.5 USDC
  • 7Kp2...5nQ1: -10.5 USDC

Program Interactions:
  1. Token Program (TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA)
     → Transfer: 10.5 USDC

Compute Units: 12,450 / 200,000
Fee: 0.000005 SOL
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT
