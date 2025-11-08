# Implementation Plan

- [x] 1. Set up project structure and dependencies
  - Initialize Node.js/TypeScript project with package.json
  - Install core dependencies: @solana/web3.js, commander, chalk, bs58
  - Configure TypeScript with tsconfig.json for Node.js CLI
  - Set up build scripts and entry point configuration
  - Create src directory structure: cli, controller, rpc, parser, formatter, utils
  - _Requirements: All requirements depend on proper project setup_

- [x] 2. Implement utility modules
  - _Requirements: 1.1, 2.2, 3.2, 6.4, 7.1_

- [x] 2.1 Create address formatter utility
  - Implement shortenAddress function to display first 4 and last 4 characters
  - Implement isValidSignature function to validate base58 format and length
  - _Requirements: 1.2, 2.2_

- [x] 2.2 Create amount formatter utility
  - Implement lamportsToSol function with proper decimal conversion
  - Implement formatTokenAmount function with configurable decimals
  - _Requirements: 2.3, 3.2, 5.3, 5.4_

- [x] 2.3 Create known programs registry
  - Define KNOWN_PROGRAMS constant with Token Program, System Program, and common program IDs
  - Implement getProgramName function to lookup program names
  - _Requirements: 4.2_

- [x] 3. Implement RPC client layer
  - _Requirements: 1.1, 1.3, 6.1, 6.2, 6.3, 6.5_

- [x] 3.1 Create RpcClient class
  - Implement constructor accepting RPC endpoint URL
  - Implement getTransaction method using @solana/web3.js Connection
  - Configure getTransaction to use maxSupportedTransactionVersion
  - Implement validateConnection method to test RPC endpoint
  - Add error handling for network failures and invalid responses
  - _Requirements: 1.1, 1.3, 6.1, 6.2, 6.3, 6.5_

- [x] 3.2 Define RawTransaction interface
  - Create TypeScript interface matching Solana RPC transaction response structure
  - Include slot, blockTime, transaction message, signatures, and meta fields
  - _Requirements: 1.1, 5.5, 9.1_

- [x] 4. Implement transaction parser
  - _Requirements: 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3, 4.4, 5.1, 5.2, 5.3, 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 4.1 Define ParsedTransaction and related interfaces
  - Create ParsedTransaction interface with all output fields
  - Define AccountChange, TokenTransfer, and ProgramInteraction interfaces
  - _Requirements: 1.4, 2.1, 3.1, 4.1, 5.1_

- [x] 4.2 Implement TransactionParser class
  - Implement parse method to transform RawTransaction to ParsedTransaction
  - Extract transaction signature, status, slot, and blockTime
  - Calculate account balance changes from preBalances and postBalances
  - Identify fee payer as first signer with negative balance
  - Parse token transfers from preTokenBalances and postTokenBalances
  - Extract compute units and fee from transaction meta
  - Handle null/missing fields gracefully
  - _Requirements: 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 5.1, 5.2, 5.3, 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 4.3 Implement instruction parsing in TransactionParser
  - Extract program interactions from transaction instructions
  - Map program IDs to known program names
  - Pass instructions to InstructionDecoder for detailed decoding
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 5. Implement instruction decoders
  - _Requirements: 4.3, 4.4, 4.5_

- [x] 5.1 Create InstructionDecoder interface and base implementation
  - Define InstructionDecoder interface with canDecode and decode methods
  - Create DecodedInstruction interface for decoder output
  - _Requirements: 4.3, 4.5_

- [x] 5.2 Implement TokenProgramDecoder
  - Implement canDecode to identify Token Program instructions
  - Decode Transfer, TransferChecked, MintTo, Burn instructions
  - Extract token amounts, source, and destination accounts
  - _Requirements: 3.4, 4.3, 4.4_

- [x] 5.3 Implement SystemProgramDecoder
  - Implement canDecode to identify System Program instructions
  - Decode Transfer, CreateAccount, Allocate instructions
  - Extract relevant parameters from instruction data
  - _Requirements: 4.3, 4.4, 4.5_

- [x] 5.4 Create decoder registry in TransactionParser
  - Register TokenProgramDecoder and SystemProgramDecoder
  - Implement fallback for unknown program instructions
  - _Requirements: 4.3, 4.5_

- [ ] 6. Implement output formatters
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ] 6.1 Create OutputFormatter interface
  - Define format method signature
  - _Requirements: 7.1, 7.2_

- [ ] 6.2 Implement HumanReadableFormatter
  - Implement format method to create structured text output
  - Display transaction signature, status, block, and timestamp sections
  - Format account changes with shortened addresses and SOL amounts
  - Display token transfers with symbols and formatted amounts
  - Show program interactions with numbered list
  - Display compute units and fee information
  - Apply color coding using chalk for status, balances, and sections
  - Detect terminal color support and disable colors when not supported
  - _Requirements: 1.4, 1.5, 2.2, 2.3, 2.4, 3.2, 3.3, 4.2, 4.3, 5.1, 5.2, 5.4, 8.1, 8.2, 8.3, 8.4, 8.5, 9.2, 9.3_

- [ ] 6.3 Implement JsonFormatter
  - Implement format method to serialize ParsedTransaction to JSON
  - Use JSON.stringify with pretty printing
  - Ensure all fields are included without color codes
  - Handle serialization errors
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ] 7. Implement transaction controller
  - _Requirements: All requirements flow through controller_

- [ ] 7.1 Create TransactionController class
  - Implement constructor accepting RpcClient, TransactionParser, and OutputFormatter
  - Implement processTransaction method to orchestrate the pipeline
  - Fetch transaction using RpcClient
  - Parse transaction using TransactionParser
  - Format output using OutputFormatter
  - Handle and propagate errors with context
  - _Requirements: All requirements_

- [ ] 8. Implement CLI layer
  - _Requirements: 1.1, 1.2, 6.1, 6.2, 6.4, 7.1_

- [ ] 8.1 Create CLI argument parser
  - Use commander to define CLI interface
  - Accept transaction signature as required positional argument
  - Define --rpc optional flag for custom RPC endpoint
  - Define --json optional flag for JSON output
  - Validate signature format using utility function
  - Validate RPC URL format if provided
  - Display usage information for invalid input
  - _Requirements: 1.1, 1.2, 6.1, 6.2, 6.4, 7.1_

- [ ] 8.2 Implement main CLI entry point
  - Parse CLI arguments
  - Set default RPC endpoint if not provided
  - Instantiate RpcClient with endpoint
  - Validate RPC connection
  - Instantiate TransactionParser
  - Select OutputFormatter based on --json flag
  - Instantiate TransactionController
  - Call processTransaction and output result
  - Handle errors and display user-friendly messages
  - Exit with appropriate status codes
  - _Requirements: 1.1, 1.2, 1.3, 6.1, 6.2, 6.3, 6.5, 7.1_

- [ ] 8.3 Create executable entry point
  - Create bin/txlens.js shebang script
  - Configure package.json bin field
  - Set up proper file permissions for execution
  - _Requirements: All requirements_

- [ ] 9. Implement error handling
  - _Requirements: 1.2, 1.3, 6.3, 6.4, 7.5, 9.4_

- [ ] 9.1 Create TxLensError class
  - Define custom error class with code and details fields
  - Define ErrorCode enum for all error types
  - _Requirements: 1.2, 1.3, 6.3, 6.4, 7.5_

- [ ] 9.2 Add error handling throughout application
  - Wrap RPC calls with try-catch and throw TxLensError
  - Handle parsing errors with appropriate error codes
  - Handle formatting errors with fallback behavior
  - Add error context at each layer
  - _Requirements: 1.2, 1.3, 6.3, 7.5, 9.4_

- [ ] 9.3 Implement user-friendly error display
  - Create error message formatter
  - Include helpful suggestions for common errors
  - Display error details in debug mode
  - _Requirements: 1.2, 1.3, 6.3, 6.4_

- [ ] 10. Add package configuration and build setup
  - Configure package.json with name, version, description, bin, scripts
  - Add build script using TypeScript compiler
  - Add start script for development
  - Configure files field for npm package
  - Add repository, keywords, and license fields
  - _Requirements: All requirements_

- [ ]* 11. Create unit tests
  - _Requirements: All requirements_

- [ ]* 11.1 Write tests for utility modules
  - Test address shortening and signature validation
  - Test amount formatting with various inputs
  - Test known programs registry lookup
  - _Requirements: 1.2, 2.2, 3.2, 4.2_

- [ ]* 11.2 Write tests for RpcClient
  - Mock @solana/web3.js Connection
  - Test successful transaction fetch
  - Test error handling for network failures
  - Test connection validation
  - _Requirements: 1.1, 1.3, 6.3, 6.5_

- [ ]* 11.3 Write tests for TransactionParser
  - Test balance change calculation with mock data
  - Test fee payer identification
  - Test token transfer parsing
  - Test compute units extraction
  - Test handling of null/missing fields
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 5.1, 5.2_

- [ ]* 11.4 Write tests for instruction decoders
  - Test TokenProgramDecoder with various instruction types
  - Test SystemProgramDecoder with various instruction types
  - Test fallback for unknown instructions
  - _Requirements: 4.3, 4.4, 4.5_

- [ ]* 11.5 Write tests for output formatters
  - Test HumanReadableFormatter output structure
  - Test color code application and disabling
  - Test JsonFormatter serialization
  - Test address shortening in output
  - _Requirements: 2.2, 7.1, 7.2, 7.3, 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ]* 11.6 Write integration tests
  - Test end-to-end flow with mock RPC response
  - Test CLI argument parsing and routing
  - Test error propagation through layers
  - _Requirements: All requirements_
