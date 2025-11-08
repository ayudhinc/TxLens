/**
 * Raw instruction data from Solana RPC
 */
export interface RawInstruction {
  programIdIndex: number;
  accounts: number[];
  data: string;
}

/**
 * Token balance information
 */
export interface TokenBalance {
  accountIndex: number;
  mint: string;
  owner?: string;
  programId?: string;
  uiTokenAmount: {
    amount: string;
    decimals: number;
    uiAmount: number | null;
    uiAmountString?: string;
  };
}

/**
 * Raw transaction response from Solana RPC
 */
export interface RawTransaction {
  slot: number;
  blockTime: number | null;
  transaction: {
    message: {
      accountKeys: Array<{ pubkey: string; signer: boolean; writable: boolean }> | string[];
      instructions: RawInstruction[];
      recentBlockhash: string;
    };
    signatures: string[];
  };
  meta: {
    err: any | null;
    fee: number;
    preBalances: number[];
    postBalances: number[];
    preTokenBalances: TokenBalance[];
    postTokenBalances: TokenBalance[];
    logMessages: string[];
    computeUnitsConsumed?: number;
  } | null;
}
