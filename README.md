# package-verify

Verify published package contents against an explicit manifest.

`package-verify` is a **read-only verification tool** that checks whether the contents of a package directory match an explicitly defined manifest.
It is intended to be used **before publishing** (locally or in CI) to ensure that only the expected build outputs are included.

The tool never modifies files and never generates content.

## Installation

```bash
npm install --save-dev package-verify
```

### Basic Usage

```bash
npx verify-pkg
```

With no arguments, the CLI looks for a manifest file named `verify.manifest.json` in the current working directory.
