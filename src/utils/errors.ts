/**
 * Error codes for TxLens application
 */
export enum ErrorCode {
  // Input validation errors
  INVALID_SIGNATURE = 'INVALID_SIGNATURE',
  INVALID_RPC_URL = 'INVALID_RPC_URL',
  MISSING_REQUIRED_ARGUMENT = 'MISSING_REQUIRED_ARGUMENT',
  
  // Network errors
  RPC_CONNECTION_FAILED = 'RPC_CONNECTION_FAILED',
  RPC_TIMEOUT = 'RPC_TIMEOUT',
  RPC_RATE_LIMITED = 'RPC_RATE_LIMITED',
  
  // Data errors
  TRANSACTION_NOT_FOUND = 'TRANSACTION_NOT_FOUND',
  INCOMPLETE_TRANSACTION_DATA = 'INCOMPLETE_TRANSACTION_DATA',
  UNSUPPORTED_TRANSACTION_VERSION = 'UNSUPPORTED_TRANSACTION_VERSION',
  
  // Processing errors
  PARSING_FAILED = 'PARSING_FAILED',
  INSTRUCTION_DECODE_FAILED = 'INSTRUCTION_DECODE_FAILED',
  INVALID_BALANCE_DATA = 'INVALID_BALANCE_DATA',
  TIMESTAMP_PARSING_ERROR = 'TIMESTAMP_PARSING_ERROR',
  
  // Output errors
  JSON_SERIALIZATION_FAILED = 'JSON_SERIALIZATION_FAILED',
  FORMATTING_FAILED = 'FORMATTING_FAILED',
  
  // General errors
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * Custom error class for TxLens application
 */
export class TxLensError extends Error {
  public readonly code: ErrorCode;
  public readonly details?: any;

  constructor(message: string, code: ErrorCode, details?: any) {
    super(message);
    this.name = 'TxLensError';
    this.code = code;
    this.details = details;

    // Maintains proper stack trace for where error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, TxLensError);
    }
  }

  /**
   * Returns a formatted error message with code and details
   */
  toFormattedString(): string {
    let formatted = `[${this.code}] ${this.message}`;
    
    if (this.details) {
      formatted += `\nDetails: ${JSON.stringify(this.details, null, 2)}`;
    }
    
    return formatted;
  }

  /**
   * Checks if an error is a TxLensError
   */
  static isTxLensError(error: any): error is TxLensError {
    return error instanceof TxLensError;
  }
}
