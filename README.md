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
