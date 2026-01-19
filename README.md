# package-verify

Verify published package contents against an explicit manifest.

`package-verify` is a **read-only verification tool** that checks whether the contents of a package directory match an explicitly defined manifest.
It is intended to be used **before publishing** (locally or in CI) to ensure that only the expected build outputs are included.

The tool never modifies files and never generates content.
