import { Connection, VersionedTransactionResponse } from '@solana/web3.js';
import { RawTransaction } from './types';

/**
 * RPC Client for fetching Solana transaction data
 */
export class RpcClient {
  private connection: Connection;

  constructor(endpoint: string) {
    this.connection = new Connection(endpoint, 'confirmed');
  }

  /**
   * Validates that the RPC endpoint is reachable and responds to Solana RPC methods
   * @returns true if connection is valid, false otherwise
   */
  async validateConnection(): Promise<boolean> {
    try {
      await this.connection.getVersion();
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Fetches transaction data from the Solana blockchain
   * @param signature - Transaction signature to fetch
   * @returns Raw transaction data
   * @throws Error if transaction not found or network error occurs
   */
  async getTransaction(signature: string): Promise<RawTransaction> {
    try {
      const response = await this.connection.getTransaction(signature, {
        maxSupportedTransactionVersion: 0,
        commitment: 'confirmed',
      });

      if (!response) {
        throw new Error('Transaction not found');
      }

      return this.transformResponse(response, signature);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('Transaction not found')) {
          throw error;
        }
        throw new Error(`Failed to fetch transaction: ${error.message}`);
      }
      throw new Error('Failed to fetch transaction: Unknown error');
    }
  }

  /**
   * Transforms Solana web3.js response to our RawTransaction format
   */
  private transformResponse(
    response: VersionedTransactionResponse,
    signature: string
  ): RawTransaction {
    const { slot, blockTime, transaction, meta } = response;

    // Extract account keys - handle both versioned and legacy transactions
    const accountKeys = transaction.message.getAccountKeys().keySegments().flat();
    const accountKeysArray = accountKeys.map((key) => key.toBase58());

    // Extract instructions
    const instructions = transaction.message.compiledInstructions.map((ix) => ({
      programIdIndex: ix.programIdIndex,
      accounts: Array.from(ix.accountKeyIndexes),
      data: ix.data.toString(),
    }));

    return {
      slot,
      blockTime: blockTime ?? null,
      transaction: {
        message: {
          accountKeys: accountKeysArray,
          instructions,
          recentBlockhash: transaction.message.recentBlockhash,
        },
        signatures: transaction.signatures,
      },
      meta: meta
        ? {
            err: meta.err,
            fee: meta.fee,
            preBalances: meta.preBalances,
            postBalances: meta.postBalances,
            preTokenBalances: (meta.preTokenBalances || []) as any,
            postTokenBalances: (meta.postTokenBalances || []) as any,
            logMessages: meta.logMessages || [],
            computeUnitsConsumed: meta.computeUnitsConsumed,
          }
        : null,
    };
  }
}
