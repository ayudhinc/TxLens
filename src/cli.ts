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
import {
  scoreTransactions,
  filterByScore,
  filterByTags,
  ScoredTransaction,
} from './utils/interestingRules';
import { Connection } from '@solana/web3.js';
import { displayLogo } from './utils/logo';
import chalk from 'chalk';

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

  // Display logo when running without arguments or with help
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    displayLogo();
  }

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
    .option('--limit <number>', 'Number of transactions to fetch', '20')
    .option('--min-score <number>', 'Minimum interest score (default: 5)', '5')
    .option('--tag <tags...>', 'Filter by specific tags (whale_move, new_token, nft_mint, defi, etc)')
    .option('--successful', 'Only show successful transactions', false)
    .option('--failed', 'Only show failed transactions', false)
    .option('--random', 'Pick a random transaction and decode it', false)
    .option('--decode-top', 'Decode the most interesting transaction', false)
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

        // Filter based on basic criteria
        const filtered = filterInterestingTransactions(transactions, {
          onlySuccessful: options.successful,
          onlyFailed: options.failed,
        });

        if (filtered.length === 0) {
          console.log('No transactions match the specified criteria.');
          process.exit(0);
        }

        console.log(`Analyzing ${filtered.length} transactions...\n`);

        // Parse and score all transactions
        const rpcClient = new RpcClient(rpcEndpoint);
        const decoders = [new TokenProgramDecoder(), new SystemProgramDecoder()];
        const parser = new TransactionParser(decoders);

        const parsedTransactions = [];
        for (const txInfo of filtered) {
          try {
            const rawTx = await rpcClient.getTransaction(txInfo.signature);
            const parsed = parser.parse(rawTx);
            parsedTransactions.push(parsed);
          } catch (error) {
            // Skip transactions that fail to parse
            continue;
          }
        }

        // Score transactions
        let scored = scoreTransactions(parsedTransactions);

        // Apply filters
        const minScore = parseInt(options.minScore, 10);
        scored = filterByScore(scored, minScore);

        if (options.tag && options.tag.length > 0) {
          scored = filterByTags(scored, options.tag);
        }

        if (scored.length === 0) {
          console.log('No interesting transactions found matching criteria.');
          console.log('Try lowering --min-score or removing tag filters.');
          process.exit(0);
        }

        // If decode-top flag is set, decode the most interesting transaction
        if (options.decodeTop) {
          const top = scored[0];
          console.log(chalk.bold(`\nMost Interesting Transaction (Score: ${top.totalScore}):`));
          console.log(chalk.dim(`Tags: ${top.tags.join(', ')}`));
          console.log(chalk.dim(`Reasons: ${top.reasons.join(', ')}\n`));

          const formatter = options.json
            ? new JsonFormatter()
            : new HumanReadableFormatter();
          const controller = new TransactionController(rpcClient, parser, formatter);

          const output = await controller.processTransaction(top.transaction.signature);
          console.log(output);
          process.exit(0);
        }

        // If random flag is set, pick one and decode it
        if (options.random) {
          const randomIndex = Math.floor(Math.random() * scored.length);
          const randomTx = scored[randomIndex];

          console.log(chalk.bold(`\nRandom Transaction (Score: ${randomTx.totalScore}):`));
          console.log(chalk.dim(`Tags: ${randomTx.tags.join(', ')}`));
          console.log(chalk.dim(`Reasons: ${randomTx.reasons.join(', ')}\n`));

          const formatter = options.json
            ? new JsonFormatter()
            : new HumanReadableFormatter();
          const controller = new TransactionController(rpcClient, parser, formatter);

          const output = await controller.processTransaction(randomTx.transaction.signature);
          console.log(output);
          process.exit(0);
        }

        // List scored transactions
        if (options.json) {
          console.log(JSON.stringify(scored, null, 2));
        } else {
          console.log(chalk.bold(`Found ${scored.length} interesting transaction(s):\n`));

          scored.slice(0, 10).forEach((s, index) => {
            const tx = s.transaction;
            const status = tx.status === 'success' ? chalk.green('✓ Success') : chalk.red('✗ Failed');
            const time = tx.blockTime ? tx.blockTime.toISOString() : 'Unknown';

            console.log(chalk.bold(`${index + 1}. ${tx.signature}`));
            console.log(`   Score: ${chalk.yellow(s.totalScore.toString())} | Tags: ${chalk.cyan(s.tags.join(', '))}`);
            console.log(`   ${s.reasons.join(' | ')}`);
            console.log(`   Status: ${status} | Time: ${time}`);
            console.log();
          });

          if (scored.length > 10) {
            console.log(chalk.dim(`... and ${scored.length - 10} more\n`));
          }

          console.log(chalk.dim(`\nTo decode a transaction, run:`));
          console.log(chalk.dim(`  txlens decode <signature>`));
          console.log(chalk.dim(`\nTo decode the most interesting transaction:`));
          console.log(chalk.dim(`  txlens find --decode-top`));
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
