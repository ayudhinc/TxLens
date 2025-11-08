import { RawInstruction } from '../rpc/types';
import { InstructionDecoder, DecodedInstruction } from './InstructionDecoder';
import bs58 from 'bs58';

const TOKEN_PROGRAM_ID = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
const TOKEN_2022_PROGRAM_ID = 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb';

/**
 * Decoder for SPL Token Program instructions
 */
export class TokenProgramDecoder implements InstructionDecoder {
  canDecode(programId: string): boolean {
    return programId === TOKEN_PROGRAM_ID || programId === TOKEN_2022_PROGRAM_ID;
  }

  decode(
    instruction: RawInstruction,
    accountKeys: string[] | Array<{ pubkey: string; signer: boolean; writable: boolean }>
  ): DecodedInstruction {
    try {
      const data = bs58.decode(instruction.data);
      const instructionType = data[0];

      const getAccount = (index: number): string => {
        const accountIndex = instruction.accounts[index];
        return typeof accountKeys[accountIndex] === 'string'
          ? (accountKeys[accountIndex] as string)
          : (accountKeys[accountIndex] as any).pubkey;
      };

      switch (instructionType) {
        case 3: // Transfer
          return {
            type: 'Transfer',
            params: {
              source: getAccount(0),
              destination: getAccount(1),
              authority: getAccount(2),
              amount: this.readU64(data, 1),
            },
          };

        case 12: // TransferChecked
          return {
            type: 'TransferChecked',
            params: {
              source: getAccount(0),
              mint: getAccount(1),
              destination: getAccount(2),
              authority: getAccount(3),
              amount: this.readU64(data, 1),
              decimals: data[9],
            },
          };

        case 7: // MintTo
          return {
            type: 'MintTo',
            params: {
              mint: getAccount(0),
              account: getAccount(1),
              authority: getAccount(2),
              amount: this.readU64(data, 1),
            },
          };

        case 8: // Burn
          return {
            type: 'Burn',
            params: {
              account: getAccount(0),
              mint: getAccount(1),
              authority: getAccount(2),
              amount: this.readU64(data, 1),
            },
          };

        case 9: // CloseAccount
          return {
            type: 'CloseAccount',
            params: {
              account: getAccount(0),
              destination: getAccount(1),
              authority: getAccount(2),
            },
          };

        case 1: // InitializeAccount
          return {
            type: 'InitializeAccount',
            params: {
              account: getAccount(0),
              mint: getAccount(1),
              owner: getAccount(2),
            },
          };

        case 0: // InitializeMint
          return {
            type: 'InitializeMint',
            params: {
              mint: getAccount(0),
              decimals: data[1],
            },
          };

        default:
          return {
            type: 'Unknown Token Instruction',
            params: { instructionType },
          };
      }
    } catch (error) {
      return {
        type: 'Unknown Token Instruction',
        params: { error: 'Failed to decode' },
      };
    }
  }

  /**
   * Read a 64-bit unsigned integer from buffer (little-endian)
   */
  private readU64(buffer: Uint8Array, offset: number): number {
    let value = 0;
    for (let i = 0; i < 8; i++) {
      value += buffer[offset + i] * Math.pow(2, 8 * i);
    }
    return value;
  }
}
