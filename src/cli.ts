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
    .version('1.0.0')
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

  await program.parseAsync(process.argv);
}

// Run CLI
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
