import { VerifyPkgManifest } from '../types';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import Ajv from 'ajv';

import schema from '../../schema/package-verify.schema.json';

export class ManifestLoader {

    private static readonly ajv = new Ajv ( { allErrors: true, strict: true } );

    public static async verify ( manifest: any ) : Promise< true | Error > {
        const validate = await this.ajv.compileAsync( schema );

        if ( ! validate( manifest ) ) return new Error (
            `Invalid manifest:\n${ this.ajv.errorsText( validate.errors, { separator: '\n' } ) }`
        );

        return true;
    }

    public static async load ( path: string ) : Promise< VerifyPkgManifest > {
        const raw = await readFile( join( process.cwd(), path ), 'utf8' );
        const manifest = JSON.parse( raw );

        const verify = await this.verify( manifest );
        if ( verify instanceof Error ) throw verify;

        return manifest;
    }

}
