# uctest - HTTP Test Runner for Unsafe Code Lab

> A streamlined HTTP test runner forked from [httpyac](https://github.com/AnWeber/httpyac), optimized for security testing education.

## Installation

```shell
# In your project
npm install github:execveat/uctest

# Or globally
npm install -g github:execveat/uctest
```

## Usage

```shell
uctest [@tag...] [:name...] [path...] [options]
```

### Positional Arguments

- `@tag` - Filter by tag (AND logic with multiple tags)
- `:name` - Filter by @name (OR logic with multiple names)
- `path` - Target specific directory or glob pattern

### Key Options

| Option | Description |
|--------|-------------|
| `-a, --all` | Run ALL tests (ignore default @ci tag filter) |
| `-B, --no-bail` | Run all tests even after failure (default: stop on first) |
| `-r, --resume` | Resume from last failed request |
| `--jsonl` | Stream JSON lines output (for CI/CD) |
| `-v, --verbose` | Make the operation more talkative |

### Examples

```shell
uctest                    # Run @ci tests, bail on first failure
uctest @v301              # Run tests tagged 'v301'
uctest @v301 @ci          # Run tests with BOTH tags (AND logic)
uctest :checkout          # Run test named 'checkout'
uctest orders/refund      # Run tests in specific path
uctest -B                 # Run all @ci tests without stopping
uctest -r                 # Resume from last failure
uctest -a spec/v301       # Run ALL tests in path (no tag filter)
```

## Differences from httpyac

uctest is a focused fork that removes features unused in HTTP API testing:

| Removed | Reason |
|---------|--------|
| MQTT, gRPC, AMQP, WebSocket, EventSource | Non-HTTP protocols |
| GraphQL plugin | Not used in spec tests |
| OAuth2 flows & CLI | Specs use Basic auth |
| XML/XPath assertions | JSON-only responses |
| JUnit XML output | Using JSONL instead |

### CLI Changes

- **Bail by default**: Tests stop on first failure (use `-B` to override)
- **`@tag` syntax**: Tags are positional with `@` prefix
- **`:name` syntax**: Names are positional with `:` prefix
- **Default `@ci` tag**: Runs `@ci` tagged tests by default
- **State file**: `.uctest-state` for resume functionality

## Attribution

uctest is a fork of [httpyac](https://github.com/AnWeber/httpyac) by AnWeber, licensed under MIT.

Key changes from upstream:
- Removed ~7,000 LOC of unused protocol plugins
- Reduced bundle from 223kb to 156kb (-30%)
- Simplified CLI for test runner use case
- Added uctest-specific defaults (bail, @ci tag)

## License

[MIT License](LICENSE) - Same as httpyac
