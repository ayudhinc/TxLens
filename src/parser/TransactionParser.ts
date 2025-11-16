import { RawTransaction, RawInstruction } from '../rpc/types';
import {
  ParsedTransaction,
  AccountChange,
  TokenTransfer,
  ProgramInteraction,
} from './types';
import { getProgramName } from '../utils/knownPrograms';
import { InstructionDecoder } from './InstructionDecoder';
import { TxLensError, ErrorCode } from '../utils/errors';

/**
 * Parses raw transaction data into structured, human-readable format
 */
export class TransactionParser {
  private decoders: InstructionDecoder[] = [];

  constructor(decoders: InstructionDecoder[] = []) {
    this.decoders = decoders;
  }

  /**
   * Parse raw transaction data into ParsedTransaction
   */
  parse(rawTransaction: RawTransaction): ParsedTransaction {
    try {
      const { slot, blockTime, transaction, meta } = rawTransaction;

      // Validate required data
      if (!meta) {
        throw new TxLensError(
          'Transaction metadata is required for parsing',
          ErrorCode.INCOMPLETE_TRANSACTION_DATA,
          { signature: transaction.signatures[0] }
        );
      }

      // Extract basic transaction info
      const signature = transaction.signatures[0];
      const status = meta.err ? 'failed' : 'success';
      
      // Parse block time with error handling
      let blockTimeDate: Date | null = null;
      if (blockTime) {
        try {
          blockTimeDate = new Date(blockTime * 1000);
          // Validate the date is valid
          if (isNaN(blockTimeDate.getTime())) {
            throw new Error('Invalid timestamp');
          }
        } catch (error) {
          throw new TxLensError(
            'Failed to parse transaction timestamp',
            ErrorCode.TIMESTAMP_PARSING_ERROR,
            { blockTime, signature }
          );
        }
      }

      // Parse account changes
      const accountChanges = this.parseAccountChanges(
        transaction.message.accountKeys,
        meta.preBalances || [],
        meta.postBalances || []
      );

      // Parse token transfers
      const tokenTransfers = this.parseTokenTransfers(
        transaction.message.accountKeys,
        meta.preTokenBalances || [],
        meta.postTokenBalances || []
      );

      // Parse program interactions
      const programInteractions = this.parseProgramInteractions(
        transaction.message.accountKeys,
        transaction.message.instructions
      );

      // Extract compute units
      const computeUnits = {
        used: meta.computeUnitsConsumed || 0,
        limit: 200000, // Default limit, can be overridden by ComputeBudget instruction
      };

      return {
        signature,
        status,
        slot,
        blockTime: blockTimeDate,
        accountChanges,
        tokenTransfers,
        programInteractions,
        computeUnits,
        fee: meta.fee || 0,
      };
    } catch (error) {
      // Re-throw TxLensError as-is
      if (TxLensError.isTxLensError(error)) {
        throw error;
      }

      throw new TxLensError(
        'Failed to parse transaction data',
        ErrorCode.PARSING_FAILED,
        { 
          signature: rawTransaction.transaction.signatures[0],
          originalError: error instanceof Error ? error.message : String(error)
        }
      );
    }
  }

  /**
   * Parse program interactions from instructions
   */
  private parseProgramInteractions(
    accountKeys: string[] | Array<{ pubkey: string; signer: boolean; writable: boolean }>,
    instructions: RawInstruction[]
  ): ProgramInteraction[] {
    const interactions: ProgramInteraction[] = [];

    for (const instruction of instructions) {
      try {
        const programId = typeof accountKeys[instruction.programIdIndex] === 'string'
          ? (accountKeys[instruction.programIdIndex] as string)
          : (accountKeys[instruction.programIdIndex] as any).pubkey;

        const programName = getProgramName(programId);

        // Try to decode instruction using registered decoders
        let decoded = null;
        for (const decoder of this.decoders) {
          try {
            if (decoder.canDecode(programId)) {
              decoded = decoder.decode(instruction, accountKeys);
              break;
            }
          } catch (error) {
            // If decoding fails, continue with next decoder or use generic format
            console.warn(`Failed to decode instruction for program ${programId}:`, error);
          }
        }

        interactions.push({
          programId,
          programName,
          instructionType: decoded?.type || 'Unknown',
          details: decoded?.params || {},
        });
      } catch (error) {
        // Log warning but continue processing other instructions
        console.warn('Failed to parse program interaction:', error);
      }
    }

    return interactions;
  }

  /**
   * Calculate account balance changes
   */
  private parseAccountChanges(
    accountKeys: string[] | Array<{ pubkey: string; signer: boolean; writable: boolean }>,
    preBalances: number[],
    postBalances: number[]
  ): AccountChange[] {
    const changes: AccountChange[] = [];

    // Validate balance arrays
    if (preBalances.length !== postBalances.length) {
      throw new TxLensError(
        'Balance data mismatch: preBalances and postBalances have different lengths',
        ErrorCode.INVALID_BALANCE_DATA,
        { preLength: preBalances.length, postLength: postBalances.length }
      );
    }

    for (let i = 0; i < preBalances.length; i++) {
      try {
        const balanceChange = postBalances[i] - preBalances[i];

        // Skip accounts with no balance change
        if (balanceChange === 0) {
          continue;
        }

        const address = typeof accountKeys[i] === 'string'
          ? (accountKeys[i] as string)
          : (accountKeys[i] as any).pubkey;

        changes.push({
          address,
          balanceChange,
          isFeePayer: i === 0 && balanceChange < 0, // First signer with negative balance
        });
      } catch (error) {
        // Log warning but continue processing other accounts
        console.warn(`Failed to parse balance change for account ${i}:`, error);
      }
    }

    return changes;
  }

  /**
   * Parse token transfers from pre/post token balances
   */
  private parseTokenTransfers(
    accountKeys: string[] | Array<{ pubkey: string; signer: boolean; writable: boolean }>,
    preTokenBalances: any[],
    postTokenBalances: any[]
  ): TokenTransfer[] {
    const transfers: TokenTransfer[] = [];
    const balanceMap = new Map<string, { pre: any; post: any }>();

    // Build a map of account -> {pre, post} balances
    for (const preBalance of preTokenBalances) {
      const key = `${preBalance.accountIndex}-${preBalance.mint}`;
      balanceMap.set(key, { pre: preBalance, post: null });
    }

    for (const postBalance of postTokenBalances) {
      const key = `${postBalance.accountIndex}-${postBalance.mint}`;
      const existing = balanceMap.get(key);
      if (existing) {
        existing.post = postBalance;
      } else {
        balanceMap.set(key, { pre: null, post: postBalance });
      }
    }

    // Calculate transfers
    for (const [key, { pre, post }] of balanceMap) {
      const preAmount = pre ? parseFloat(pre.uiTokenAmount.amount) : 0;
      const postAmount = post ? parseFloat(post.uiTokenAmount.amount) : 0;
      const change = postAmount - preAmount;

      if (change === 0) {
        continue;
      }

      const balance = post || pre;
      const accountIndex = balance.accountIndex;
      const address = typeof accountKeys[accountIndex] === 'string'
        ? (accountKeys[accountIndex] as string)
        : (accountKeys[accountIndex] as any).pubkey;

      transfers.push({
        mint: balance.mint,
        amount: Math.abs(change),
        decimals: balance.uiTokenAmount.decimals,
        from: change < 0 ? address : 'unknown',
        to: change > 0 ? address : 'unknown',
      });
    }

    return transfers;
  }
}
