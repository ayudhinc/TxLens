import { RawInstruction } from '../rpc/types';

/**
 * Decoded instruction information
 */
export interface DecodedInstruction {
  type: string;
  params: Record<string, any>;
}

/**
 * Interface for instruction decoders
 */
export interface InstructionDecoder {
  /**
   * Check if this decoder can decode instructions for the given program
   */
  canDecode(programId: string): boolean;

  /**
   * Decode an instruction
   */
  decode(
    instruction: RawInstruction,
    accountKeys: string[] | Array<{ pubkey: string; signer: boolean; writable: boolean }>
  ): DecodedInstruction;
}
