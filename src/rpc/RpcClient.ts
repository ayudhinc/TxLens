import { Connection, VersionedTransactionResponse } from '@solana/web3.js';
import { RawTransaction } from './types';
import { TxLensError, ErrorCode } from '../utils/errors';

/**
 * RPC Client for fetching Solana transaction data
 */
export class RpcClient {
  private connection: Connection;

  constructor(endpoint: string) {
    // Validate URL format
    try {
      new URL(endpoint);
    } catch {
      throw new TxLensError(
        'Invalid RPC endpoint URL format',
        ErrorCode.INVALID_RPC_URL,
        { endpoint }
      );
    }

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
      throw new TxLensError(
        'Failed to connect to RPC endpoint',
        ErrorCode.RPC_CONNECTION_FAILED,
        { 
          originalError: error instanceof Error ? error.message : String(error),
          endpoint: this.connection.rpcEndpoint
        }
      );
    }
  }

  /**
   * Fetches transaction data from the Solana blockchain
   * @param signature - Transaction signature to fetch
   * @returns Raw transaction data
   * @throws TxLensError if transaction not found or network error occurs
   */
  async getTransaction(signature: string): Promise<RawTransaction> {
    try {
      const response = await this.connection.getTransaction(signature, {
        maxSupportedTransactionVersion: 0,
        commitment: 'confirmed',
      });

      if (!response) {
        throw new TxLensError(
          'Transaction not found on the blockchain',
          ErrorCode.TRANSACTION_NOT_FOUND,
          { signature }
        );
      }

      return this.transformResponse(response, signature);
    } catch (error) {
      // Re-throw TxLensError as-is
      if (TxLensError.isTxLensError(error)) {
        throw error;
      }

      // Handle network errors
      if (error instanceof Error) {
        if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
          throw new TxLensError(
            'Request to RPC endpoint timed out',
            ErrorCode.RPC_TIMEOUT,
            { signature, originalError: error.message }
          );
        }

        if (error.message.includes('429') || error.message.includes('rate limit')) {
          throw new TxLensError(
            'RPC endpoint rate limit exceeded',
            ErrorCode.RPC_RATE_LIMITED,
            { signature, originalError: error.message }
          );
        }

        throw new TxLensError(
          'Failed to fetch transaction from RPC',
          ErrorCode.RPC_CONNECTION_FAILED,
          { signature, originalError: error.message }
        );
      }

      throw new TxLensError(
        'Unknown error occurred while fetching transaction',
        ErrorCode.UNKNOWN_ERROR,
        { signature }
      );
    }
  }

  /**
   * Transforms Solana web3.js response to our RawTransaction format
   */
  private transformResponse(
    response: VersionedTransactionResponse,
    signature: string
  ): RawTransaction {
    try {
      const { slot, blockTime, transaction, meta } = response;

      // Check for incomplete transaction data
      if (!meta) {
        throw new TxLensError(
          'Transaction metadata is missing',
          ErrorCode.INCOMPLETE_TRANSACTION_DATA,
          { signature }
        );
      }

      // Extract account keys - handle both versioned and legacy transactions
      // For versioned transactions with address lookup tables, we need the loaded addresses from meta
      const accountKeys = transaction.message.getAccountKeys({
        accountKeysFromLookups: meta?.loadedAddresses,
      });
      const accountKeysArray = accountKeys.keySegments().flat().map((key) => key.toBase58());

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
        meta: {
          err: meta.err,
          fee: meta.fee,
          preBalances: meta.preBalances,
          postBalances: meta.postBalances,
          preTokenBalances: (meta.preTokenBalances || []) as any,
          postTokenBalances: (meta.postTokenBalances || []) as any,
          logMessages: meta.logMessages || [],
          computeUnitsConsumed: meta.computeUnitsConsumed,
        },
      };
    } catch (error) {
      // Re-throw TxLensError as-is
      if (TxLensError.isTxLensError(error)) {
        throw error;
      }

      throw new TxLensError(
        'Failed to transform transaction response',
        ErrorCode.PARSING_FAILED,
        { signature, originalError: error instanceof Error ? error.message : String(error) }
      );
    }
  }
}
