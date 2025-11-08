import bs58 from 'bs58';

/**
 * Shortens a Solana address to display first 4 and last 4 characters
 * @param address - The full Solana address
 * @returns Shortened address in format "abcd...wxyz"
 */
export function shortenAddress(address: string): string {
  if (!address || address.length < 8) {
    return address;
  }
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

/**
 * Validates if a string is a valid Solana transaction signature
 * @param signature - The signature string to validate
 * @returns true if valid base58 format and correct length, false otherwise
 */
export function isValidSignature(signature: string): boolean {
  if (!signature || typeof signature !== 'string') {
    return false;
  }

  // Solana signatures are 88 characters in base58 format
  if (signature.length !== 88) {
    return false;
  }

  try {
    // Attempt to decode as base58
    const decoded = bs58.decode(signature);
    // Solana signatures are 64 bytes when decoded
    return decoded.length === 64;
  } catch (error) {
    // If decoding fails, it's not valid base58
    return false;
  }
}
