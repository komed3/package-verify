export type VerifyPkgSeverity = 'error' | 'warn' | 'ignore';

export interface VerifyPkgOptions {
    manifestPath: string;
    cwd?: string;
    failOnWarnings?: boolean;
    verbose?: boolean;
}

export interface VerifyPkgManifest {
    meta: {
        manifestVersion: 1;
    };
    context: {
        packageRoot: string;
    };
    policy: {
        defaultSeverity: VerifyPkgSeverity;
        unexpectedFiles?: VerifyPkgSeverity;
        on?: {
            missingExpected?: VerifyPkgSeverity;
            emptyPattern?: VerifyPkgSeverity;
            deriveFailure?: VerifyPkgSeverity;
        };
    };
    expect: {
        files?: string[];
        patterns?: string[];
        atLeastOne?: string[][];
    };
    derive?: {
        sources: {
            root: string;
            include: string;
            exclude?: string[];
        };
        rules: Array< {
            match?: string[];
            default?: boolean;
            mode: string;
        } >;
        targets: Record< string, string[] >;
    };
}

export interface VerifyPkgNormalized {
    packageRoot: string;
    policy: {
        defaultSeverity: VerifyPkgSeverity;
        unexpectedFiles: VerifyPkgSeverity;
        on: {
            missingExpected: VerifyPkgSeverity;
            emptyPattern: VerifyPkgSeverity;
            deriveFailure: VerifyPkgSeverity;
        };
    };
    expect: {
        files: { relative: string; absolute: string }[];
        patterns: { base: string; pattern: string, regex: RegExp }[];
        atLeastOne: { relative: string; absolute: string }[][];
    };
    derive?: {
        sources: {
            root: string;
            include: string;
            exclude: string[];
        };
        rules: { match: string[]; default: boolean; mode: string }[];
        targets: Record< string, string[] >;
    };
}

export interface VerifyPkgCheckFile {
    relative: string;
    absolute: string;
    exists: boolean;
    severity?: VerifyPkgSeverity;
}

export interface VerifyPkgCheckPattern {
    base: string;
    pattern: string;
    regex: RegExp;
    exists: boolean;
    matches: string[];
}

export interface VerifyPkgCheckAtLeastOne {
    group: VerifyPkgCheckFile[];
    valid: boolean;
}

export interface VerifyPkgCheckDerive {
    mode: string;
    target: string;
    absolute: string;
    exists: boolean;
}

export interface VerifyPkgCheckUnexpected {
    relative: string;
    absolute: string;
    severity: VerifyPkgSeverity;
}

export interface VerifyPkgCheckSummary {
    errors: number;
    warnings: number;
}

export interface VerifyPkgResult {
    files: VerifyPkgCheckFile[];
    patterns: VerifyPkgCheckPattern[];
    atLeastOne: VerifyPkgCheckAtLeastOne[];
    derive: VerifyPkgCheckDerive[];
    unexpected: VerifyPkgCheckUnexpected[];
    summary: VerifyPkgCheckSummary;
}
