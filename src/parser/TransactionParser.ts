import { RawTransaction, RawInstruction } from '../rpc/types';
import {
  ParsedTransaction,
  AccountChange,
  TokenTransfer,
  ProgramInteraction,
} from './types';
import { getProgramName } from '../utils/knownPrograms';
import { InstructionDecoder } from './InstructionDecoder';

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
    const { slot, blockTime, transaction, meta } = rawTransaction;

    // Extract basic transaction info
    const signature = transaction.signatures[0];
    const status = meta?.err ? 'failed' : 'success';
    const blockTimeDate = blockTime ? new Date(blockTime * 1000) : null;

    // Parse account changes
    const accountChanges = this.parseAccountChanges(
      transaction.message.accountKeys,
      meta?.preBalances || [],
      meta?.postBalances || []
    );

    // Parse token transfers
    const tokenTransfers = this.parseTokenTransfers(
      transaction.message.accountKeys,
      meta?.preTokenBalances || [],
      meta?.postTokenBalances || []
    );

    // Parse program interactions
    const programInteractions = this.parseProgramInteractions(
      transaction.message.accountKeys,
      transaction.message.instructions
    );

    // Extract compute units
    const computeUnits = {
      used: meta?.computeUnitsConsumed || 0,
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
      fee: meta?.fee || 0,
    };
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
      const programId = typeof accountKeys[instruction.programIdIndex] === 'string'
        ? (accountKeys[instruction.programIdIndex] as string)
        : (accountKeys[instruction.programIdIndex] as any).pubkey;

      const programName = getProgramName(programId);

      // Try to decode instruction using registered decoders
      let decoded = null;
      for (const decoder of this.decoders) {
        if (decoder.canDecode(programId)) {
          decoded = decoder.decode(instruction, accountKeys);
          break;
        }
      }

      interactions.push({
        programId,
        programName,
        instructionType: decoded?.type || 'Unknown',
        details: decoded?.params || {},
      });
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

    for (let i = 0; i < preBalances.length; i++) {
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
