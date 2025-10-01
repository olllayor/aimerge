# Changelog

## [0.3.0] - 2025-01-10

### Added

#### 🎯 Conflict Classification System
- Automatic categorization of conflicts into: trivial, semantic, logic-collision, or unknown
- Smart detection of whitespace-only conflicts, comment changes, and import reordering
- Identifies dangerous logic collisions (return values, control flow, function redefinitions)
- Auto-resolution of trivial conflicts without AI (optional, enabled by default)
- CLI flag `--auto-resolve-trivial` / `--no-auto-resolve-trivial` to control behavior

#### 🔬 AST-Based Context Extraction
- Language-aware parsing for TypeScript, JavaScript, and Python
- Extracts function signatures, class definitions, and symbol usage
- Provides semantic code scope instead of raw line numbers
- Identifies surrounding functions and imports for better AI context
- Graceful fallback to line-based context if AST parsing fails

#### 📊 Confidence Scoring System
- Multi-factor scoring (0-100%) for every AI resolution
- Six independent factors: classification, length, structure, syntax, preservation, confusion markers
- Clear confidence levels: High (≥85%), Medium (60-84%), Low (<60%)
- Detailed reasoning displayed for each score
- Automatic interactive review trigger for low confidence or dangerous conflicts
- CLI flag `--min-confidence <0-1>` to set custom thresholds

#### 🎨 Enhanced User Interface
- Conflict classification displayed for each conflict (TRIVIAL/SEMANTIC/LOGIC-COLLISION)
- Confidence scores with color-coded indicators (✅ ⚡ ❌)
- Warning messages for dangerous conflicts
- Auto-resolution notifications
- Summary statistics including auto-resolved count

#### 🧪 Comprehensive Testing
- 16 tests for conflict classifier
- 9 tests for confidence scorer
- All 34 tests passing (previously 25)
- Type-safe implementation with no `any` types

### Changed
- Parser now attaches classification and AST context to conflicts during parsing
- Resolver returns both resolution and confidence score
- Resolution statistics now include `autoResolved` count
- UI summary displays auto-resolved conflicts separately
- Package description updated to reflect new capabilities

### Fixed
- None (this is a pure feature addition release)

### Documentation
- Updated README with feature descriptions
- Added FEATURES.md with comprehensive implementation details
- Documented new CLI flags
- Added usage examples for classification and confidence scoring

---

## [0.2.4] - Previous Release

### Fixed
- String replacement bug (only replaced first occurrence)
- Empty AI response validation
- Regex state management (global flag issue)
- Enhanced API error handling

### Added
- Retry logic with exponential backoff
- Structured logging system
- Enhanced prompts to prevent context duplication

---

## [0.1.x] - Initial Releases

### Added
- OpenRouter integration
- Interactive conflict resolution
- AI-powered merge suggestions
- Configuration management
- Model caching
