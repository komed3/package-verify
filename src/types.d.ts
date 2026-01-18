export type VerifyPkgPolicyLevel = 'error' | 'warn' | 'ignore';

export interface VerifyPkgOptions {
    manifestPath: string;
    cwd?: string;
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
        defaultSeverity: VerifyPkgPolicyLevel;
        failOnWarnings?: boolean;
        unexpectedFiles?: VerifyPkgPolicyLevel;
        on?: {
            missingExpected?: VerifyPkgPolicyLevel;
            emptyPattern?: VerifyPkgPolicyLevel;
            deriveFailure?: VerifyPkgPolicyLevel;
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
        defaultSeverity: VerifyPkgPolicyLevel;
        failOnWarnings: boolean;
        unexpectedFiles: VerifyPkgPolicyLevel;
        on: {
            missingExpected: VerifyPkgPolicyLevel;
            emptyPattern: VerifyPkgPolicyLevel;
            deriveFailure: VerifyPkgPolicyLevel;
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
    severity?: VerifyPkgPolicyLevel;
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

export interface VerifyPkgCheckSummary {
    errors: number;
    warnings: number;
}

export interface VerifyPkgResult {
    files: VerifyPkgCheckFile[];
    patterns: VerifyPkgCheckPattern[];
    atLeastOne: VerifyPkgCheckAtLeastOne[];
    derive: VerifyPkgCheckDerive[];
    summary: VerifyPkgCheckSummary;
}
