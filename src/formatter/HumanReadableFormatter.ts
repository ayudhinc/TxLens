import { ParsedTransaction } from '../parser/types';
import { OutputFormatter } from './OutputFormatter';
import { shortenAddress } from '../utils/addressFormatter';
import { lamportsToSol } from '../utils/amountFormatter';
import { TxLensError, ErrorCode } from '../utils/errors';
import chalk from 'chalk';

/**
 * Formats parsed transaction data in human-readable text format
 */
export class HumanReadableFormatter implements OutputFormatter {
  private useColors: boolean;

  constructor(useColors: boolean = process.stdout.isTTY || false) {
    this.useColors = useColors;
  }

  format(transaction: ParsedTransaction): string {
    try {
      const sections: string[] = [];

      // Transaction header
      sections.push(this.formatHeader(transaction));

      // Account changes
      if (transaction.accountChanges.length > 0) {
        sections.push(this.formatAccountChanges(transaction));
      }

      // Token transfers
      if (transaction.tokenTransfers.length > 0) {
        sections.push(this.formatTokenTransfers(transaction));
      }

      // Program interactions
      if (transaction.programInteractions.length > 0) {
        sections.push(this.formatProgramInteractions(transaction));
      }

      // Compute and fees
      sections.push(this.formatComputeAndFees(transaction));

      return sections.join('\n\n');
    } catch (error) {
      throw new TxLensError(
        'Failed to format transaction output',
        ErrorCode.FORMATTING_FAILED,
        { 
          signature: transaction.signature,
          originalError: error instanceof Error ? error.message : String(error)
        }
      );
    }
  }

  private formatHeader(transaction: ParsedTransaction): string {
    const lines: string[] = [];

    lines.push(this.colorize('=== Transaction Details ===', 'bold'));
    lines.push('');
    lines.push(`Signature: ${transaction.signature}`);

    const statusColor = transaction.status === 'success' ? 'green' : 'red';
    const statusText = transaction.status === 'success' ? '✓ Success' : '✗ Failed';
    lines.push(`Status: ${this.colorize(statusText, statusColor)}`);

    lines.push(`Block: ${transaction.slot}`);

    if (transaction.blockTime) {
      lines.push(`Time: ${transaction.blockTime.toISOString()}`);
    } else {
      lines.push(`Time: Unknown`);
    }

    return lines.join('\n');
  }

  private formatAccountChanges(transaction: ParsedTransaction): string {
    const lines: string[] = [];

    lines.push(this.colorize('Account Changes:', 'bold'));
    lines.push('');

    for (const change of transaction.accountChanges) {
      const address = shortenAddress(change.address);
      const solAmount = lamportsToSol(Math.abs(change.balanceChange));
      const sign = change.balanceChange >= 0 ? '+' : '-';
      const color = change.balanceChange >= 0 ? 'green' : 'red';

      let line = `  ${address}: ${this.colorize(sign + solAmount + ' SOL', color)}`;

      if (change.isFeePayer) {
        line += this.colorize(' (fee payer)', 'dim');
      }

      lines.push(line);
    }

    return lines.join('\n');
  }

  private formatTokenTransfers(transaction: ParsedTransaction): string {
    const lines: string[] = [];

    lines.push(this.colorize('Token Transfers:', 'bold'));
    lines.push('');

    for (let i = 0; i < transaction.tokenTransfers.length; i++) {
      const transfer = transaction.tokenTransfers[i];
      const amount = transfer.amount / Math.pow(10, transfer.decimals);

      lines.push(`  ${i + 1}. ${transfer.symbol || shortenAddress(transfer.mint)}`);
      lines.push(`     Amount: ${this.colorize(amount.toString(), 'cyan')}`);
      lines.push(`     From: ${shortenAddress(transfer.from)}`);
      lines.push(`     To: ${shortenAddress(transfer.to)}`);
    }

    return lines.join('\n');
  }

  private formatProgramInteractions(transaction: ParsedTransaction): string {
    const lines: string[] = [];

    lines.push(this.colorize('Program Interactions:', 'bold'));
    lines.push('');

    for (let i = 0; i < transaction.programInteractions.length; i++) {
      const interaction = transaction.programInteractions[i];
      const programName = interaction.programName || shortenAddress(interaction.programId);

      lines.push(`  ${i + 1}. ${this.colorize(programName, 'yellow')}`);
      lines.push(`     Instruction: ${interaction.instructionType}`);

      // Add details if available
      const detailKeys = Object.keys(interaction.details);
      if (detailKeys.length > 0) {
        for (const key of detailKeys) {
          const value = interaction.details[key];
          let displayValue = value;

          // Format addresses
          if (typeof value === 'string' && value.length > 32) {
            displayValue = shortenAddress(value);
          }

          lines.push(`     ${key}: ${displayValue}`);
        }
      }
    }

    return lines.join('\n');
  }

  private formatComputeAndFees(transaction: ParsedTransaction): string {
    const lines: string[] = [];

    lines.push(this.colorize('Compute & Fees:', 'bold'));
    lines.push('');

    const computePercent = ((transaction.computeUnits.used / transaction.computeUnits.limit) * 100).toFixed(1);
    lines.push(`  Compute Units: ${transaction.computeUnits.used.toLocaleString()} / ${transaction.computeUnits.limit.toLocaleString()} (${computePercent}%)`);

    const fee = lamportsToSol(transaction.fee);
    lines.push(`  Fee: ${fee} SOL`);

    return lines.join('\n');
  }

  private colorize(text: string, style: string): string {
    if (!this.useColors) {
      return text;
    }

    switch (style) {
      case 'bold':
        return chalk.bold(text);
      case 'green':
        return chalk.green(text);
      case 'red':
        return chalk.red(text);
      case 'yellow':
        return chalk.yellow(text);
      case 'cyan':
        return chalk.cyan(text);
      case 'dim':
        return chalk.dim(text);
      default:
        return text;
    }
  }
}
