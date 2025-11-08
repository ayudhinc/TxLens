/**
 * Registry of well-known Solana program IDs and their human-readable names
 */
export const KNOWN_PROGRAMS: Record<string, string> = {
  // Core Programs
  '11111111111111111111111111111111': 'System Program',
  'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA': 'Token Program',
  'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb': 'Token-2022 Program',
  'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL': 'Associated Token Program',
  
  // Common DeFi Programs
  'So1endDq2YkqhipRh3WViPa8hdiSpxWy6z3Z6tMCpAo': 'Solend',
  '9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin': 'Serum DEX v3',
  'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4': 'Jupiter Aggregator',
  'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc': 'Orca Whirlpool',
  'CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK': 'Raydium CLMM',
  
  // Staking Programs
  'Stake11111111111111111111111111111111111111': 'Stake Program',
  'Vote111111111111111111111111111111111111111': 'Vote Program',
  
  // Other Core Programs
  'Config1111111111111111111111111111111111111': 'Config Program',
  'BPFLoaderUpgradeab1e11111111111111111111111': 'BPF Upgradeable Loader',
  'BPFLoader2111111111111111111111111111111111': 'BPF Loader',
  'ComputeBudget111111111111111111111111111111': 'Compute Budget Program',
  'AddressLookupTab1e1111111111111111111111111': 'Address Lookup Table Program',
  
  // Metaplex Programs
  'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s': 'Metaplex Token Metadata',
  'p1exdMJcjVao65QdewkaZRUnU6VPSXhus9n2GzWfh98': 'Metaplex',
  'cndy3Z4yapfJBmL3ShUp5exZKqR3z33thTzeNMm2gRZ': 'Candy Machine v2',
};

/**
 * Looks up a program name by its program ID
 * @param programId - The Solana program ID (public key as string)
 * @returns The human-readable program name, or undefined if not found
 */
export function getProgramName(programId: string): string | undefined {
  return KNOWN_PROGRAMS[programId];
}
