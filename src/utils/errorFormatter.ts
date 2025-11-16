import chalk from 'chalk';
import { TxLensError, ErrorCode } from './errors';

/**
 * Options for error formatting
 */
export interface ErrorFormatterOptions {
  /** Whether to display detailed error information */
  debug?: boolean;
  /** Whether to use color output */
  useColors?: boolean;
}

/**
 * Error message formatter for user-friendly error display
 */
export class ErrorFormatter {
  private debug: boolean;
  private useColors: boolean;

  constructor(options: ErrorFormatterOptions = {}) {
    this.debug = options.debug || process.env.DEBUG === 'true' || process.env.TXLENS_DEBUG === '1';
    this.useColors = options.useColors ?? (process.stdout.isTTY || false);
  }

  /**
   * Format an error for display
   */
  format(error: unknown): string {
    if (TxLensError.isTxLensError(error)) {
      return this.formatTxLensError(error);
    }

    if (error instanceof Error) {
      return this.formatGenericError(error);
    }

    return this.formatUnknownError(error);
  }

  /**
   * Format a TxLensError with helpful suggestions
   */
  private formatTxLensError(error: TxLensError): string {
    const lines: string[] = [];

    // Error header
    lines.push(this.colorize(`Error [${error.code}]:`, 'red', true) + ' ' + error.message);

    // Add helpful suggestion based on error code
    const suggestion = this.getSuggestion(error.code);
    if (suggestion) {
      lines.push('');
      lines.push(this.colorize(suggestion, 'dim'));
    }

    // Add debug information if enabled
    if (this.debug && error.details) {
      lines.push('');
      lines.push(this.colorize('Debug Details:', 'yellow'));
      lines.push(JSON.stringify(error.details, null, 2));
    }

    // Add stack trace in debug mode
    if (this.debug && error.stack) {
      lines.push('');
      lines.push(this.colorize('Stack Trace:', 'yellow'));
      lines.push(this.colorize(error.stack, 'dim'));
    }

    return lines.join('\n');
  }

  /**
   * Format a generic Error
   */
  private formatGenericError(error: Error): string {
    const lines: string[] = [];

    lines.push(this.colorize('Error:', 'red', true) + ' ' + error.message);

    if (this.debug && error.stack) {
      lines.push('');
      lines.push(this.colorize('Stack Trace:', 'yellow'));
      lines.push(this.colorize(error.stack, 'dim'));
    }

    return lines.join('\n');
  }

  /**
   * Format an unknown error
   */
  private formatUnknownError(error: unknown): string {
    const lines: string[] = [];

    lines.push(this.colorize('Error:', 'red', true) + ' An unknown error occurred');

    if (this.debug) {
      lines.push('');
      lines.push(this.colorize('Debug Details:', 'yellow'));
      lines.push(String(error));
    }

    return lines.join('\n');
  }

  /**
   * Get helpful suggestion for an error code
   */
  private getSuggestion(code: ErrorCode): string | null {
    const suggestions: Record<ErrorCode, string> = {
      [ErrorCode.INVALID_SIGNATURE]: 
        'Tip: Transaction signatures are 88 characters in base58 format\n' +
        'Example: 5VERv8NMvzbJMEkV8xnrLkEaWRtSz9CosKDYjCJjBRnbJLgp8uirBgmQpjKhoR4tjF3ZpRzrFmBV6UjKdiSZkQUW',

      [ErrorCode.INVALID_RPC_URL]:
        'Tip: RPC URL must be a valid HTTP/HTTPS URL\n' +
        'Example: https://api.mainnet-beta.solana.com',

      [ErrorCode.MISSING_REQUIRED_ARGUMENT]:
        'Tip: Check the command usage with --help flag',

      [ErrorCode.RPC_CONNECTION_FAILED]:
        'Tip: Check your internet connection and RPC endpoint\n' +
        'Try using a different RPC endpoint with --rpc flag',

      [ErrorCode.RPC_TIMEOUT]:
        'Tip: The RPC endpoint is slow or unresponsive\n' +
        'Try again or use a different RPC endpoint',

      [ErrorCode.RPC_RATE_LIMITED]:
        'Tip: You have exceeded the rate limit for this RPC endpoint\n' +
        'Wait a moment and try again, or use a different endpoint',

      [ErrorCode.TRANSACTION_NOT_FOUND]:
        'Tip: Verify the transaction signature is correct\n' +
        'Check the transaction on Solana Explorer: https://explorer.solana.com',

      [ErrorCode.INCOMPLETE_TRANSACTION_DATA]:
        'Tip: The transaction data from RPC is incomplete\n' +
        'This may be a temporary issue - try again in a moment',

      [ErrorCode.UNSUPPORTED_TRANSACTION_VERSION]:
        'Tip: This transaction uses an unsupported version format\n' +
        'Please report this issue with the transaction signature',

      [ErrorCode.PARSING_FAILED]:
        'Tip: Failed to parse transaction data\n' +
        'This may indicate corrupted or unexpected data format',

      [ErrorCode.INSTRUCTION_DECODE_FAILED]:
        'Tip: Failed to decode program instruction\n' +
        'The transaction will still display with generic instruction info',

      [ErrorCode.INVALID_BALANCE_DATA]:
        'Tip: Transaction balance data is invalid or corrupted\n' +
        'Try fetching the transaction again',

      [ErrorCode.TIMESTAMP_PARSING_ERROR]:
        'Tip: Failed to parse transaction timestamp\n' +
        'The transaction will display with "Unknown" timestamp',

      [ErrorCode.JSON_SERIALIZATION_FAILED]:
        'Tip: Failed to convert transaction to JSON format\n' +
        'Try without --json flag for human-readable output',

      [ErrorCode.FORMATTING_FAILED]:
        'Tip: Failed to format transaction output\n' +
        'Try using --json flag for raw JSON output',

      [ErrorCode.UNKNOWN_ERROR]:
        'Tip: An unexpected error occurred\n' +
        'Run with DEBUG=true environment variable for more details',
    };

    return suggestions[code] || null;
  }

  /**
   * Apply color to text if colors are enabled
   */
  private colorize(text: string, color: string, bold: boolean = false): string {
    if (!this.useColors) {
      return text;
    }

    if (bold) {
      switch (color) {
        case 'red':
          return chalk.bold.red(text);
        case 'yellow':
          return chalk.bold.yellow(text);
        case 'green':
          return chalk.bold.green(text);
        case 'cyan':
          return chalk.bold.cyan(text);
        case 'dim':
          return chalk.bold.dim(text);
        default:
          return chalk.bold(text);
      }
    }

    switch (color) {
      case 'red':
        return chalk.red(text);
      case 'yellow':
        return chalk.yellow(text);
      case 'green':
        return chalk.green(text);
      case 'cyan':
        return chalk.cyan(text);
      case 'dim':
        return chalk.dim(text);
      default:
        return text;
    }
  }
}

/**
 * Create a default error formatter instance
 */
export function createErrorFormatter(options?: ErrorFormatterOptions): ErrorFormatter {
  return new ErrorFormatter(options);
}
