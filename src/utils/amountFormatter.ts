/**
 * Converts lamports to SOL with proper decimal conversion
 * @param lamports - Amount in lamports (1 SOL = 1,000,000,000 lamports)
 * @returns Formatted SOL amount as string with up to 9 decimal places
 */
export function lamportsToSol(lamports: number): string {
  const LAMPORTS_PER_SOL = 1_000_000_000;
  const sol = lamports / LAMPORTS_PER_SOL;
  
  // Format with up to 9 decimal places, removing trailing zeros
  return sol.toFixed(9).replace(/\.?0+$/, '');
}

/**
 * Formats token amount with configurable decimals
 * @param amount - Raw token amount (in smallest unit)
 * @param decimals - Number of decimal places for the token
 * @returns Formatted token amount as string
 */
export function formatTokenAmount(amount: number, decimals: number): string {
  if (decimals === 0) {
    return amount.toString();
  }
  
  const divisor = Math.pow(10, decimals);
  const formattedAmount = amount / divisor;
  
  // Format with the specified decimals, removing trailing zeros
  return formattedAmount.toFixed(decimals).replace(/\.?0+$/, '');
}
