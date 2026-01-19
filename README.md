# package-verify

Verify published package contents against an explicit manifest.

`package-verify` is a **read-only verification tool** that checks whether the contents of a package directory match an explicitly defined manifest.
It is intended to be used **before publishing** (locally or in CI) to ensure that only the expected build outputs are included.

The tool never modifies files and never generates content.

## Installation

```bash
npm install --save-dev package-verify
```

## Basic Usage

```bash
npx verify-pkg
```

With no arguments, the CLI looks for a manifest file named `verify.manifest.json` in the current working directory.

## CLI Options

```bash
verify-pkg [options]
```

| Option | Description |
| ------ | ----------- |
| `--version`, `-v` | Print version and exit |
| `--manifest=path` | Path to the manifest file (default: `verify.manifest.json`) |
| `--cwd=path` | Working directory to verify (default: `process cwd`) |
| `--verbose` | Print some logging information during verification |
| `--dry-run` | Run checks without setting a non-zero exit code |
| `--fail-on-warn` | Treat warnings as errors |
| `--report=path` | Write the full verification result as JSON |

Example:

```bash
verify-pkg --verbose --fail-on-warn --report=verify-report.json
```

## Exit Codes

| Condition | Exit code |
| --------- | --------- |
| No errors (and no warnings if `--fail-on-warn` is set) | `0` |
| Errors found | `1` |
| Warnings found with `--fail-on-warn` | `1` |

This behavior makes the tool CI-friendly by default.

## Manifest File

The manifest describes what the package is expected to contain after build.

Default filename:

```bash
verify.manifest.json
```

The file is validated against the official JSON schema:

```bash
schema/package-verify.schema.json
```

Minimal Manifest Example:

```json
{
  "meta": {
    "manifestVersion": 1
  },
  "context": {
    "packageRoot": "."
  },
  "policy": {
    "defaultSeverity": "error",
    "unexpectedFiles": "warn",
    "on": {
      "missingExpected": "error",
      "emptyPattern": "warn"
    }
  },
  "expect": {
    "files": [
      "dist/index.js",
      "dist/index.d.ts",
      "package.json",
      "README.md"
    ]
  }
}
```

### `policy`

Controls how violations are classified.

```json
"policy": {
  "defaultSeverity": "error",
  "unexpectedFiles": "warn",
  "on": {
    "missingExpected": "error",
    "emptyPattern": "warn",
    "deriveFailure": "warn"
  }
}
```

| Field | Meaning |
| ----- | ------- |
| `defaultSeverity` | Fallback severity |
| `unexpectedFiles` | Severity for files not covered by expect |
| `on.missingExpected` | Missing file from `expect.files` |
| `on.emptyPattern` | Pattern matched nothing |
| `on.deriveFailure` | Derivation errors |

Valid severities: `error`, `warn` and `ignore`.

### `expect`

Defines what must exist in the package.

#### `files`

Explicit file paths (relative to `packageRoot`) that must exist.

```json
"files": [
  "dist/index.js",
  "dist/index.d.ts"
]
```

#### `patterns`

Glob patterns that must match at least one file.

```json
"patterns": [
  "dist/**/*.js",
  "dist/**/*.d.ts"
]
```

#### `atLeastOne`

Groups of alternative files where at least one per group must exist.

```json
"atLeastOne": [
  [ "README.md", "README.txt" ],
  [ "LICENSE", "LICENSE.md" ]
]
```

### `derive` (optional)

Allows deriving expected targets from source files.

**Typical use case:**  
verify that build outputs exist for a given source structure.

```json
"derive": {
  "sources": {
    "root": "src",
    "include": "*.ts",
    "exclude": [ "**/*.test.ts" ]
  },
  "rules": [
    {
      "match": [ "**/*.ts" ],
      "mode": "esm"
    }
  ],
  "targets": {
    "esm": [
      "dist/**/*.js",
      "dist/**/*.d.ts"
    ]
  }
}
```

Source files are identified under `derive.sources.root` according to the specified `include` and `exclude` patterns.
Rules are applied to map source files to target groups.
Targets, used as templates, define what files must exist for each target group.

If derivation fails, `policy.on.deriveFailure` is applied.

## CI Example (GitHub Actions)

```yaml
- name: Verify package contents
  run: npx verify-pkg --fail-on-warn
```

## JSON Report

```bash
verify-pkg --report=verify-report.json
```

Writes the full verification result (files, patterns, derive checks, summary) as JSON.

## License

MIT © 2026 komed3 (Paul Köhler)
