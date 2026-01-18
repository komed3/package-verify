#!/usr/bin/env node

const { main } = require( '../dist/cli.js' );

main().catch( err => {
    console.error( err );
    process.exitCode = 1;
} );
