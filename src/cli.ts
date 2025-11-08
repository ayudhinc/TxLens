#!/usr/bin/env node

import { Command } from 'commander';
import { RpcClient } from './rpc/RpcClient';
import { TransactionParser } from './parser/TransactionParser';
import { TokenProgramDecoder } from './parser/TokenProgramDecoder';
import { SystemProgramDecoder } from './parser/SystemProgramDecoder';
import { HumanReadableFormatter } from './formatter/HumanReadableFormatter';
import { JsonFormatter } from './formatter/JsonFormatter';
import { TransactionController } from './controller/TransactionController';
import { isValidSignature } from './utils/addressFormatter';
import {
  getRecentTransactions,
  filterInterestingTransactions,
  getRandomTransaction,
  INTERESTING_ADDRESSES,
} from './utils/transactionFinder';
import { Connection } from '@solana/web3.js';

const DEFAULT_RPC_ENDPOINT = 'https://api.mainnet-beta.solana.com';

interface CLIOptions {
  rpc?: string;
  json?: boolean;
}

/**
 * Main CLI entry point
 */
async function main() {
  const program = new Command();

  program
    .name('txlens')
    .description('Decode and explain Solana blockchain transactions')
    .version('1.0.0');

  // Main decode command
  program
    .command('decode')
    .description('Decode a specific transaction by signature')
    .argument('<signature>', 'Transaction signature to decode')
    .option('--rpc <url>', 'Custom RPC endpoint URL', DEFAULT_RPC_ENDPOINT)
    .option('--json', 'Output in JSON format', false)
    .action(async (signature: string, options: CLIOptions) => {
      try {
        // Validate signature format
        if (!isValidSignature(signature)) {
          console.error('Error: Invalid transaction signature format');
          console.error('Signature must be 88 characters in base58 format');
          process.exit(1);
        }

        // Validate RPC URL format
        const rpcEndpoint = options.rpc || DEFAULT_RPC_ENDPOINT;
        try {
          new URL(rpcEndpoint);
        } catch {
          console.error('Error: Invalid RPC URL format');
          process.exit(1);
        }

        // Initialize components
        const rpcClient = new RpcClient(rpcEndpoint);

        // Validate RPC connection
        const isConnected = await rpcClient.validateConnection();
        if (!isConnected) {
          console.error('Error: Failed to connect to RPC endpoint');
          console.error(`Endpoint: ${rpcEndpoint}`);
          process.exit(1);
        }

        // Create parser with decoders
        const decoders = [new TokenProgramDecoder(), new SystemProgramDecoder()];
        const parser = new TransactionParser(decoders);

        // Select formatter based on output format
        const formatter = options.json
          ? new JsonFormatter()
          : new HumanReadableFormatter();

        // Create controller and process transaction
        const controller = new TransactionController(rpcClient, parser, formatter);
        const output = await controller.processTransaction(signature);

        // Output result
        console.log(output);
        process.exit(0);
      } catch (error) {
        if (error instanceof Error) {
          if (error.message.includes('Transaction not found')) {
            console.error('Error: Transaction not found on the blockchain');
            console.error(`Signature: ${signature}`);
          } else if (error.message.includes('Failed to fetch transaction')) {
            console.error('Error: Failed to fetch transaction from RPC');
            console.error(error.message);
          } else {
            console.error('Error:', error.message);
          }
        } else {
          console.error('Error: An unknown error occurred');
        }
        process.exit(1);
      }
    });

  // Find command - discover interesting transactions
  program
    .command('find')
    .description('Find interesting transactions from known programs/addresses')
    .option('--rpc <url>', 'Custom RPC endpoint URL', DEFAULT_RPC_ENDPOINT)
    .option('--address <address>', 'Specific address to query')
    .option('--program <name>', 'Known program name (jupiter, orca, raydium, solend, token)')
    .option('--limit <number>', 'Number of transactions to fetch', '10')
    .option('--successful', 'Only show successful transactions', false)
    .option('--failed', 'Only show failed transactions', false)
    .option('--random', 'Pick a random transaction and decode it', false)
    .option('--json', 'Output in JSON format', false)
    .action(async (options: any) => {
      try {
        const rpcEndpoint = options.rpc || DEFAULT_RPC_ENDPOINT;
        const connection = new Connection(rpcEndpoint, 'confirmed');

        // Determine which address to query
        let targetAddress: string;
        if (options.address) {
          targetAddress = options.address;
        } else if (options.program) {
          const programMap: Record<string, string> = {
            jupiter: INTERESTING_ADDRESSES.JUPITER,
            orca: INTERESTING_ADDRESSES.ORCA_WHIRLPOOL,
            raydium: INTERESTING_ADDRESSES.RAYDIUM,
            solend: INTERESTING_ADDRESSES.SOLEND,
            token: INTERESTING_ADDRESSES.TOKEN_PROGRAM,
          };
          targetAddress = programMap[options.program.toLowerCase()];
          if (!targetAddress) {
            console.error(`Unknown program: ${options.program}`);
            console.error('Available programs: jupiter, orca, raydium, solend, token');
            process.exit(1);
          }
        } else {
          // Default to Jupiter for interesting DeFi transactions
          targetAddress = INTERESTING_ADDRESSES.JUPITER;
          console.log('No address specified, using Jupiter aggregator...\n');
        }

        const limit = parseInt(options.limit, 10);
        console.log(`Fetching ${limit} recent transactions for ${targetAddress}...\n`);

        // Fetch transactions
        const transactions = await getRecentTransactions(connection, targetAddress, limit);

        if (transactions.length === 0) {
          console.log('No transactions found.');
          process.exit(0);
        }

        // Filter based on criteria
        const filtered = filterInterestingTransactions(transactions, {
          onlySuccessful: options.successful,
          onlyFailed: options.failed,
        });

        if (filtered.length === 0) {
          console.log('No transactions match the specified criteria.');
          process.exit(0);
        }

        // If random flag is set, pick one and decode it
        if (options.random) {
          const randomTx = getRandomTransaction(filtered);
          if (!randomTx) {
            console.log('No transactions available.');
            process.exit(0);
          }

          console.log(`Selected random transaction: ${randomTx.signature}\n`);

          // Decode the transaction
          const rpcClient = new RpcClient(rpcEndpoint);
          const decoders = [new TokenProgramDecoder(), new SystemProgramDecoder()];
          const parser = new TransactionParser(decoders);
          const formatter = options.json
            ? new JsonFormatter()
            : new HumanReadableFormatter();
          const controller = new TransactionController(rpcClient, parser, formatter);

          const output = await controller.processTransaction(randomTx.signature);
          console.log(output);
        } else {
          // List transactions
          console.log(`Found ${filtered.length} transaction(s):\n`);
          filtered.forEach((tx, index) => {
            const status = tx.err ? '✗ Failed' : '✓ Success';
            const time = tx.blockTime
              ? new Date(tx.blockTime * 1000).toISOString()
              : 'Unknown';
            console.log(`${index + 1}. ${tx.signature}`);
            console.log(`   Status: ${status}`);
            console.log(`   Time: ${time}`);
            console.log(`   Slot: ${tx.slot}`);
            console.log();
          });

          console.log(`\nTo decode a transaction, run:`);
          console.log(`  txlens decode <signature>`);
        }

        process.exit(0);
      } catch (error) {
        if (error instanceof Error) {
          console.error('Error:', error.message);
        } else {
          console.error('Error: An unknown error occurred');
        }
        process.exit(1);
      }
    });

  // Default command for backward compatibility
  program
    .argument('[signature]', 'Transaction signature to decode')
    .option('--rpc <url>', 'Custom RPC endpoint URL', DEFAULT_RPC_ENDPOINT)
    .option('--json', 'Output in JSON format', false)
    .action(async (signature: string | undefined, options: CLIOptions) => {
      if (!signature) {
        program.help();
        return;
      }

      try {
        // Validate signature format
        if (!isValidSignature(signature)) {
          console.error('Error: Invalid transaction signature format');
          console.error('Signature must be 88 characters in base58 format');
          process.exit(1);
        }

        // Validate RPC URL format
        const rpcEndpoint = options.rpc || DEFAULT_RPC_ENDPOINT;
        try {
          new URL(rpcEndpoint);
        } catch {
          console.error('Error: Invalid RPC URL format');
          process.exit(1);
        }

        // Initialize components
        const rpcClient = new RpcClient(rpcEndpoint);

        // Validate RPC connection
        const isConnected = await rpcClient.validateConnection();
        if (!isConnected) {
          console.error('Error: Failed to connect to RPC endpoint');
          console.error(`Endpoint: ${rpcEndpoint}`);
          process.exit(1);
        }

        // Create parser with decoders
        const decoders = [new TokenProgramDecoder(), new SystemProgramDecoder()];
        const parser = new TransactionParser(decoders);

        // Select formatter based on output format
        const formatter = options.json
          ? new JsonFormatter()
          : new HumanReadableFormatter();

        // Create controller and process transaction
        const controller = new TransactionController(rpcClient, parser, formatter);
        const output = await controller.processTransaction(signature);

        // Output result
        console.log(output);
        process.exit(0);
      } catch (error) {
        if (error instanceof Error) {
          if (error.message.includes('Transaction not found')) {
            console.error('Error: Transaction not found on the blockchain');
            console.error(`Signature: ${signature}`);
          } else if (error.message.includes('Failed to fetch transaction')) {
            console.error('Error: Failed to fetch transaction from RPC');
            console.error(error.message);
          } else {
            console.error('Error:', error.message);
          }
        } else {
          console.error('Error: An unknown error occurred');
        }
        process.exit(1);
      }
    });

  await program.parseAsync(process.argv);
}

// Run CLI
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
