# Implementation Plan

- [x] 1. Set up testing infrastructure
  - Create test directory structure with unit/, integration/, e2e/, and fixtures/ folders
  - Install and configure Jest or Vitest with TypeScript support
  - Set up code coverage reporting with 80% target
  - Add test scripts to package.json (test, test:watch, test:coverage)
  - Configure CI/CD pipeline (GitHub Actions) for automated testing
  - _Requirements: 6.1, 6.5_

- [ ] 2. Implement Metaplex decoder
- [x] 2.1 Create MetaplexDecoder class and basic structure
  - Create src/parser/decoders/MetaplexDecoder.ts file
  - Implement InstructionDecoder interface with canDecode() and decode() methods
  - Add Metaplex program IDs (Token Metadata, Candy Machine, Auction House) as constants
  - Register decoder in TransactionParser with appropriate priority
  - _Requirements: 1.1, 1.4_

- [ ] 2.2 Implement Token Metadata instruction decoders
  - Decode CreateMetadataAccountV3 instruction
  - Decode UpdateMetadataAccountV2 instruction
  - Decode MintNewEditionFromMasterEditionViaToken instruction
  - Decode CreateMasterEditionV3 instruction
  - Decode VerifyCollection and SetAndVerifyCollection instructions
  - Extract NFT metadata, creator info, and collection details
  - _Requirements: 1.1_

- [ ] 2.3 Implement Candy Machine and Auction House decoders
  - Decode Candy Machine MintV2 instruction
  - Decode Auction House Buy and ExecuteSale instructions
  - Extract pricing, buyer/seller info, and transaction amounts
  - _Requirements: 1.1_

- [ ]* 2.4 Create test fixtures and unit tests for Metaplex decoder
  - Collect real Metaplex transactions (NFT mints, sales, updates)
  - Create JSON fixtures in tests/fixtures/transactions/
  - Write unit tests verifying decoded output matches expected structure
  - Test error handling for malformed instructions
  - _Requirements: 1.1, 6.2_

- [ ] 3. Implement Serum decoder
- [ ] 3.1 Create SerumDecoder class
  - Create src/parser/decoders/SerumDecoder.ts file
  - Implement InstructionDecoder interface
  - Add Serum/OpenBook program ID constant
  - Register decoder in TransactionParser
  - _Requirements: 1.2, 1.4_

- [ ] 3.2 Implement Serum instruction decoders
  - Decode NewOrderV3 instruction (extract side, price, quantity, order type)
  - Decode CancelOrderV2 instruction
  - Decode SettleFunds instruction
  - Decode InitOpenOrders and ConsumeEvents instructions
  - _Requirements: 1.2_

- [ ]* 3.3 Create test fixtures and unit tests for Serum decoder
  - Collect real Serum DEX transactions
  - Create JSON fixtures for orders, cancellations, settlements
  - Write unit tests for each instruction type
  - _Requirements: 1.2, 6.2_

- [ ] 4. Implement Pump.fun decoder
- [ ] 4.1 Research and create PumpFunDecoder
  - Verify current Pump.fun program ID
  - Research instruction formats from on-chain transactions
  - Create src/parser/decoders/PumpFunDecoder.ts file
  - Implement InstructionDecoder interface
  - Register decoder in TransactionParser
  - _Requirements: 1.3, 1.4_

- [ ] 4.2 Implement Pump.fun instruction decoders
  - Decode Create instruction (token launch)
  - Decode Buy and Sell instructions
  - Decode Initialize instruction
  - Extract token details, pricing curves, and amounts
  - _Requirements: 1.3_

- [ ]* 4.3 Create test fixtures and unit tests for Pump.fun decoder
  - Collect real Pump.fun transactions
  - Create JSON fixtures
  - Write unit tests
  - _Requirements: 1.3, 6.2_

- [ ] 5. Implement ML-based transaction scoring
- [ ] 5.1 Create FeatureExtractor class
  - Create src/ml/FeatureExtractor.ts file
  - Implement extraction of complexity metrics (programs, accounts, instructions, diversity)
  - Implement extraction of value metrics (SOL moved, token transfers, USD estimates)
  - Implement extraction of temporal features (hour, day, time since similar)
  - Implement extraction of pattern features (NFT mint, token mint, DEX, lending, governance)
  - Implement extraction of network metrics (compute units, fees, priority fee)
  - Return TransactionFeatures interface with all 21 features
  - _Requirements: 2.1_

- [ ]* 5.2 Write unit tests for FeatureExtractor
  - Test feature extraction with known transactions
  - Verify all 21 features are extracted correctly
  - Test edge cases (empty transactions, missing data)
  - _Requirements: 2.1, 6.1_

- [ ] 5.3 Implement MLTransactionScorer class
  - Create src/ml/MLTransactionScorer.ts file
  - Implement model loading from JSON file
  - Implement score() method that extracts features and runs inference
  - Implement scoreWithExplanation() method with feature importance
  - Handle model loading failures gracefully
  - Normalize scores to 0-20 range
  - _Requirements: 2.2, 2.4_

- [ ] 5.4 Create HybridScorer class
  - Create src/ml/HybridScorer.ts file
  - Combine rule-based and ML scores with configurable weights (default 0.7 ML, 0.3 rule)
  - Return both individual scores and final combined score
  - Calculate confidence value based on ML availability
  - Implement fallback to rule-based scoring when ML fails
  - _Requirements: 2.3, 2.5_

- [ ]* 5.5 Collect training data and train initial ML model
  - Define labeling criteria for "interesting" transactions (0-10 scale)
  - Collect 1000+ diverse transaction samples (whale moves, NFTs, DeFi, exploits, normal)
  - Label transactions with scores
  - Split into train/validation/test sets (70/15/15)
  - Train XGBoost or LightGBM model
  - Evaluate model performance (precision, recall, F1)
  - Export trained model to JSON format
  - _Requirements: 2.2_

- [ ] 5.6 Integrate ML scoring into CLI
  - Add --use-ml flag to find command
  - Add --explain flag to show scoring breakdown with top features
  - Update output formatting to display ML score, rule score, and final score
  - Update documentation with ML scoring usage examples
  - _Requirements: 2.4, 7.1_

- [ ] 6. Implement real-time monitoring
- [ ] 6.1 Create TransactionMonitor core class
  - Create src/monitor/TransactionMonitor.ts file
  - Implement MonitorConfig interface with all configuration options
  - Implement WebSocket subscription to programs using connection.onLogs()
  - Implement WebSocket subscription to addresses
  - Implement signature queue management
  - Implement batch transaction fetching with configurable batch size
  - _Requirements: 3.1, 3.2_

- [ ] 6.2 Implement reconnection and error handling
  - Add WebSocket reconnection logic with exponential backoff (1s to 30s max)
  - Handle connection failures gracefully
  - Implement graceful shutdown on Ctrl+C
  - Clean up subscriptions on stop
  - _Requirements: 3.4, 9.5_

- [ ] 6.3 Implement filtering and scoring in monitor
  - Integrate transaction parsing and scoring into monitor pipeline
  - Implement real-time filtering by minimum score
  - Implement filtering by tags
  - Implement filtering by success/failure status
  - Only display transactions matching all filter criteria
  - _Requirements: 3.5_

- [ ] 6.4 Implement monitoring statistics
  - Track transactions per second, average score, alert count
  - Display real-time statistics updated every 5 seconds
  - Show cumulative stats (total transactions, alerts sent)
  - _Requirements: 3.6_

- [ ] 6.5 Create AlertManager class
  - Create src/monitor/AlertManager.ts file
  - Implement Alert interface with transaction, score, timestamp, reason
  - Implement rate limiting (max 10 alerts per minute per destination)
  - Format alert messages with signature, score, timestamp, key details
  - _Requirements: 4.1, 4.5_

- [ ] 6.6 Implement alert destinations
  - Implement webhook alerts with HTTP POST
  - Implement Discord webhook integration with embed formatting
  - Implement Telegram bot integration with formatted messages
  - Handle alert delivery failures gracefully
  - _Requirements: 4.2, 4.3, 4.4_

- [ ] 6.7 Add monitor command to CLI
  - Add monitor command with --program, --address, --min-score, --tag options
  - Add --alert-score and --alert-webhook options
  - Add --successful and --failed filtering options
  - Implement real-time output formatting (human and JSON)
  - Display statistics during monitoring
  - Handle Ctrl+C for graceful exit
  - _Requirements: 3.1, 3.5, 7.1, 7.5_

- [ ]* 6.8 Write integration tests for monitoring
  - Test monitor with mock WebSocket connections
  - Test filtering logic with various configurations
  - Test alert triggering and rate limiting
  - Test reconnection logic
  - _Requirements: 6.3_

- [ ] 7. Implement transaction simulation
- [ ] 7.1 Create TransactionSimulator class
  - Create src/simulator/TransactionSimulator.ts file
  - Implement simulate() method using connection.simulateTransaction()
  - Parse simulation responses into SimulationResult interface
  - Extract account balance changes from simulation
  - Extract token transfers from simulation logs
  - Calculate estimated fees
  - Handle simulation errors and extract error messages
  - _Requirements: 5.1, 5.2, 5.3_

- [ ] 7.2 Implement transaction builders
  - Implement simulateTransfer() for SOL transfers
  - Implement simulateTokenTransfer() for token transfers
  - Support custom compute budget and priority fees
  - Build transactions with proper recent blockhash and fee payer
  - _Requirements: 5.5, 5.6_

- [ ] 7.3 Create SimulationAnalyzer class
  - Create src/simulator/SimulationAnalyzer.ts file
  - Analyze compute efficiency (warn if >80% of limit)
  - Analyze fee optimization (warn if >0.01 SOL)
  - Detect potential issues from logs (insufficient balance, overflow, underflow)
  - Generate warnings and suggestions
  - Return isOptimal flag, suggestions array, and risks array
  - _Requirements: 5.4_

- [ ] 7.4 Add simulate command to CLI
  - Add simulate command with --from, --to, --amount options for SOL transfers
  - Add --token-transfer, --mint options for token transfers
  - Add --transaction option for base64-encoded transactions
  - Add --compute-units option for custom compute budget
  - Add --verbose flag for detailed output
  - Format and display simulation results (success, changes, fees, warnings)
  - _Requirements: 5.1, 5.5, 5.6, 7.1_

- [ ]* 7.5 Write unit tests for simulation
  - Test simulation parsing with mock RPC responses
  - Test transaction builders
  - Test SimulationAnalyzer with various scenarios
  - Test warning generation
  - _Requirements: 6.1_

- [ ] 8. Write comprehensive unit tests for existing code
- [ ] 8.1 Write tests for TransactionParser
  - Test basic transaction parsing
  - Test account change calculation
  - Test token transfer parsing
  - Test program interaction parsing
  - Test error handling for malformed data
  - Test edge cases (empty transactions, missing metadata)
  - _Requirements: 6.2_

- [ ] 8.2 Write tests for existing decoders
  - Test TokenProgramDecoder with various token instructions
  - Test SystemProgramDecoder with transfer and account creation
  - Test decoder error handling
  - _Requirements: 6.2_

- [ ] 8.3 Write tests for utils and formatters
  - Test interestingRules.ts scoring logic
  - Test individual rule evaluation and score aggregation
  - Test HumanReadableFormatter output
  - Test JsonFormatter output
  - Test error handling utilities
  - _Requirements: 6.2_

- [ ] 9. Write integration and E2E tests
- [ ] 9.1 Write integration tests for CLI commands
  - Test decode command with mock RPC
  - Test find command with mock RPC
  - Test end-to-end transaction processing pipeline
  - Test error scenarios and recovery
  - _Requirements: 6.3_

- [ ] 9.2 Write E2E tests with real data
  - Test CLI commands against Solana devnet
  - Test with real transaction signatures
  - Test output formatting (human and JSON)
  - Test error messages and help text
  - Use snapshot testing for CLI output
  - _Requirements: 6.4_

- [ ] 10. Performance optimization and polish
- [ ] 10.1 Implement performance optimizations
  - Add caching for decoded program IDs and instruction layouts
  - Implement connection pooling for RPC calls
  - Optimize batch processing in monitor
  - Profile and optimize hot paths
  - Test with high transaction volumes
  - _Requirements: 8.2, 8.3_

- [ ] 10.2 Implement configuration system
  - Support configuration file at ~/.txlens/config.json
  - Load and apply configuration on startup
  - Support command-line overrides for RPC URL
  - Support environment variables (SOLANA_RPC_URL, TXLENS_RPC_URL)
  - Support custom ML model path
  - _Requirements: 10.1, 10.2, 10.4, 10.5_

- [ ] 10.3 Improve error handling and reliability
  - Implement retry logic with exponential backoff for network errors (max 3 retries)
  - Handle malformed transaction data gracefully without crashing
  - Log decoder errors and continue processing
  - Implement graceful shutdown for all long-running operations
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ] 10.4 Update documentation
  - Update README.md with all new features (decoders, ML scoring, monitoring, simulation)
  - Create usage examples for each command
  - Add troubleshooting section
  - Document configuration options
  - Add FAQ section
  - Create examples/ directory with sample scripts
  - _Requirements: 7.1_

- [ ] 10.5 Final testing and release preparation
  - Run full test suite and verify 80% coverage
  - Test all CLI commands end-to-end
  - Test with various RPC endpoints (mainnet, devnet, custom)
  - Fix identified bugs
  - Update version number in package.json
  - Create CHANGELOG.md
  - Tag release in git
  - _Requirements: 6.1, 6.5, 7.2, 7.4_
