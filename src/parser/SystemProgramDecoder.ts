import { RawInstruction } from '../rpc/types';
import { InstructionDecoder, DecodedInstruction } from './InstructionDecoder';
import bs58 from 'bs58';

const SYSTEM_PROGRAM_ID = '11111111111111111111111111111111';

/**
 * Decoder for System Program instructions
 */
export class SystemProgramDecoder implements InstructionDecoder {
  canDecode(programId: string): boolean {
    return programId === SYSTEM_PROGRAM_ID;
  }

  decode(
    instruction: RawInstruction,
    accountKeys: string[] | Array<{ pubkey: string; signer: boolean; writable: boolean }>
  ): DecodedInstruction {
    try {
      const data = bs58.decode(instruction.data);
      const instructionType = this.readU32(data, 0);

      const getAccount = (index: number): string => {
        const accountIndex = instruction.accounts[index];
        return typeof accountKeys[accountIndex] === 'string'
          ? (accountKeys[accountIndex] as string)
          : (accountKeys[accountIndex] as any).pubkey;
      };

      switch (instructionType) {
        case 0: // CreateAccount
          return {
            type: 'CreateAccount',
            params: {
              from: getAccount(0),
              to: getAccount(1),
              lamports: this.readU64(data, 4),
              space: this.readU64(data, 12),
              owner: this.readPubkey(data, 20),
            },
          };

        case 2: // Transfer
          return {
            type: 'Transfer',
            params: {
              from: getAccount(0),
              to: getAccount(1),
              lamports: this.readU64(data, 4),
            },
          };

        case 8: // Allocate
          return {
            type: 'Allocate',
            params: {
              account: getAccount(0),
              space: this.readU64(data, 4),
            },
          };

        case 1: // Assign
          return {
            type: 'Assign',
            params: {
              account: getAccount(0),
              owner: this.readPubkey(data, 4),
            },
          };

        case 3: // CreateAccountWithSeed
          return {
            type: 'CreateAccountWithSeed',
            params: {
              from: getAccount(0),
              to: getAccount(1),
            },
          };

        case 4: // AdvanceNonceAccount
          return {
            type: 'AdvanceNonceAccount',
            params: {
              nonce: getAccount(0),
              authority: getAccount(2),
            },
          };

        case 5: // WithdrawNonceAccount
          return {
            type: 'WithdrawNonceAccount',
            params: {
              nonce: getAccount(0),
              to: getAccount(1),
              authority: getAccount(4),
              lamports: this.readU64(data, 4),
            },
          };

        case 6: // InitializeNonceAccount
          return {
            type: 'InitializeNonceAccount',
            params: {
              nonce: getAccount(0),
              authority: this.readPubkey(data, 4),
            },
          };

        case 7: // AuthorizeNonceAccount
          return {
            type: 'AuthorizeNonceAccount',
            params: {
              nonce: getAccount(0),
              authority: getAccount(1),
            },
          };

        default:
          return {
            type: 'Unknown System Instruction',
            params: { instructionType },
          };
      }
    } catch (error) {
      return {
        type: 'Unknown System Instruction',
        params: { error: 'Failed to decode' },
      };
    }
  }

  /**
   * Read a 32-bit unsigned integer from buffer (little-endian)
   */
  private readU32(buffer: Uint8Array, offset: number): number {
    return (
      buffer[offset] +
      buffer[offset + 1] * 256 +
      buffer[offset + 2] * 65536 +
      buffer[offset + 3] * 16777216
    );
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

  /**
   * Read a public key (32 bytes) from buffer and convert to base58
   */
  private readPubkey(buffer: Uint8Array, offset: number): string {
    const pubkeyBytes = buffer.slice(offset, offset + 32);
    return bs58.encode(pubkeyBytes);
  }
}
