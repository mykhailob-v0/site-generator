# Log Verbosity Control

## Overview
The HTML Generator now supports configurable log verbosity levels to control how much detail is shown in the console output. This improves the developer experience by reducing noise and showing only relevant information.

## Log Levels

### minimal (Default)
- **Description**: Only show errors and critical warnings
- **Best for**: Production use, clean output, focus on results
- **Shows**: Errors, warnings, progress bars, final results
- **Hides**: Operation details, performance metrics, API call logs

### standard
- **Description**: Show errors, warnings and key operation info
- **Best for**: Normal development, monitoring key operations
- **Shows**: Everything from minimal + key operation status
- **Hides**: Detailed performance metrics, verbose API logs

### detailed
- **Description**: Show all operations with timing and metrics
- **Best for**: Debugging performance, detailed monitoring
- **Shows**: Everything from standard + timing metrics, operation details
- **Hides**: Low-level debug traces

### debug
- **Description**: Show everything including debug traces
- **Best for**: Development, troubleshooting, full visibility
- **Shows**: All possible log information including debug traces

## Usage

### CLI
```bash
# Minimal logging (default)
node cli-api.js generate --primary-keyword "Example" --log-level "minimal" ...

# Standard logging
node cli-api.js generate --primary-keyword "Example" --log-level "standard" ...

# Detailed logging
node cli-api.js generate --primary-keyword "Example" --log-level "detailed" ...

# Debug logging
node cli-api.js generate --primary-keyword "Example" --log-level "debug" ...
```

### API
```javascript
const generatorAPI = new GeneratorAPI();

const result = await generatorAPI.generate({
  primaryKeyword: "Example",
  brandName: "Brand",
  canonicalUrl: "https://example.com",
  hreflangUrls: {"tr": "https://example.com"},
  logLevel: "minimal" // or "standard", "detailed", "debug"
}, onProgress);
```

### Input Processor
```javascript
const { InputProcessor } = require('./services/input/input-processor.service');
const processor = new InputProcessor();

const processedInput = processor.process({
  primaryKeyword: "Example",
  // ... other params
  logLevel: "detailed"
});
```

## Implementation Details

### Log Level Manager
- Located in `src/utils/log-levels.js`
- Singleton instance `logLevelManager` manages current level
- Provides methods to check if specific log types should be shown

### Service Integration
- All services extend `BaseService` which respects log levels
- Log level is set during validation phase
- Performance and operation logs are filtered based on current level

### Default Behavior
- **Default level**: `minimal` for better user experience
- **Error/Warning logs**: Always shown regardless of level
- **Progress indicators**: Always shown for user feedback
- **Operation details**: Only shown when explicitly requested

## Benefits

1. **Cleaner Output**: Reduces noise in console output
2. **Better UX**: Developers see only what they need
3. **Flexible Debugging**: Easy to increase verbosity when needed
4. **Performance**: Reduced logging overhead in production
5. **Maintainability**: Centralized logging control

## Migration

The log level feature is backward compatible:
- Existing code without `logLevel` parameter defaults to `minimal`
- All existing log statements continue to work
- No breaking changes to API or CLI interfaces

## Examples

### Before (verbose logging always on):
```
00:46:02 [info]: ValidationService initialized
00:46:02 [info]: Operation: validateGenerationParams
00:46:02 [info]: API call made to OpenAI
00:46:02 [info]: Performance metrics: validation completed in 150ms
...hundreds of lines...
```

### After (minimal logging):
```
[██░░░░░░░░░░░░░░░░░░] 10% - Validating input parameters
[█████░░░░░░░░░░░░░░░] 25% - Generating website structure
✅ Generation completed successfully!
```

### After (detailed logging):
```
Log level set to: detailed
[██░░░░░░░░░░░░░░░░░░] 10% - Validating input parameters
00:46:02 [info]: Operation: validateGenerationParams completed in 150ms
00:46:02 [verbose]: Performance metrics: {duration: 150, averageTime: 145}
[█████░░░░░░░░░░░░░░░] 25% - Generating website structure
00:46:03 [verbose]: API call made to OpenAI GPT-5 (tokens: {prompt: 1200, completion: 800})
✅ Generation completed successfully!
```
