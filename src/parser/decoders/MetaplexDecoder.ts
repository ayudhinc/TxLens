import { RawInstruction } from '../../rpc/types';
import { InstructionDecoder, DecodedInstruction } from '../InstructionDecoder';
import bs58 from 'bs58';

/**
 * Metaplex program IDs
 */
export const METAPLEX_PROGRAM_IDS = {
  TOKEN_METADATA: 'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s',
  CANDY_MACHINE_V3: 'CndyV3LdqHUfDLmE5naZjVN8rBZz4tqhdefbAnjHG3JR',
  AUCTION_HOUSE: 'hausS13jsjafwWwGqZTUQRmWyvyxn9EQpqMwV1PBBmk',
} as const;

/**
 * Decoder for Metaplex program instructions
 * Supports Token Metadata, Candy Machine v3, and Auction House programs
 */
export class MetaplexDecoder implements InstructionDecoder {
  /**
   * Check if this decoder can handle the given program ID
   */
  canDecode(programId: string): boolean {
    return Object.values(METAPLEX_PROGRAM_IDS).includes(programId as any);
  }

  /**
   * Decode a Metaplex instruction
   */
  decode(
    instruction: RawInstruction,
    accountKeys: string[] | Array<{ pubkey: string; signer: boolean; writable: boolean }>
  ): DecodedInstruction {
    try {
      const data = bs58.decode(instruction.data);
      
      // Get program ID from account keys
      const programId = this.getAccount(instruction.programIdIndex, accountKeys);

      // Route to appropriate decoder based on program
      if (programId === METAPLEX_PROGRAM_IDS.TOKEN_METADATA) {
        return this.decodeTokenMetadata(instruction, data, accountKeys);
      } else if (programId === METAPLEX_PROGRAM_IDS.CANDY_MACHINE_V3) {
        return this.decodeCandyMachine(instruction, data, accountKeys);
      } else if (programId === METAPLEX_PROGRAM_IDS.AUCTION_HOUSE) {
        return this.decodeAuctionHouse(instruction, data, accountKeys);
      }

      return {
        type: 'Unknown Metaplex Instruction',
        params: { programId },
      };
    } catch (error) {
      return {
        type: 'Unknown Metaplex Instruction',
        params: { 
          error: error instanceof Error ? error.message : 'Failed to decode',
        },
      };
    }
  }

  /**
   * Decode Token Metadata program instructions
   */
  private decodeTokenMetadata(
    instruction: RawInstruction,
    data: Uint8Array,
    accountKeys: string[] | Array<{ pubkey: string; signer: boolean; writable: boolean }>
  ): DecodedInstruction {
    // Extract discriminator (first 8 bytes for anchor-style instructions)
    const discriminator = data.slice(0, 8);
    const discriminatorHex = Buffer.from(discriminator).toString('hex');

    // Common Token Metadata instruction discriminators
    // These will be implemented in task 2.2
    const DISCRIMINATORS: Record<string, string> = {
      // Will be populated with actual discriminators in next task
    };

    return {
      type: 'Token Metadata Instruction',
      params: {
        discriminator: discriminatorHex,
        accounts: this.extractAccounts(instruction, accountKeys),
      },
    };
  }

  /**
   * Decode Candy Machine v3 instructions
   */
  private decodeCandyMachine(
    instruction: RawInstruction,
    data: Uint8Array,
    accountKeys: string[] | Array<{ pubkey: string; signer: boolean; writable: boolean }>
  ): DecodedInstruction {
    const discriminator = data.slice(0, 8);
    const discriminatorHex = Buffer.from(discriminator).toString('hex');

    return {
      type: 'Candy Machine Instruction',
      params: {
        discriminator: discriminatorHex,
        accounts: this.extractAccounts(instruction, accountKeys),
      },
    };
  }

  /**
   * Decode Auction House instructions
   */
  private decodeAuctionHouse(
    instruction: RawInstruction,
    data: Uint8Array,
    accountKeys: string[] | Array<{ pubkey: string; signer: boolean; writable: boolean }>
  ): DecodedInstruction {
    const discriminator = data.slice(0, 8);
    const discriminatorHex = Buffer.from(discriminator).toString('hex');

    return {
      type: 'Auction House Instruction',
      params: {
        discriminator: discriminatorHex,
        accounts: this.extractAccounts(instruction, accountKeys),
      },
    };
  }

  /**
   * Extract account addresses from instruction
   */
  private extractAccounts(
    instruction: RawInstruction,
    accountKeys: string[] | Array<{ pubkey: string; signer: boolean; writable: boolean }>
  ): string[] {
    return instruction.accounts.map(accountIndex => 
      this.getAccount(accountIndex, accountKeys)
    );
  }

  /**
   * Get account address by index
   */
  private getAccount(
    index: number,
    accountKeys: string[] | Array<{ pubkey: string; signer: boolean; writable: boolean }>
  ): string {
    return typeof accountKeys[index] === 'string'
      ? (accountKeys[index] as string)
      : (accountKeys[index] as any).pubkey;
  }
}
