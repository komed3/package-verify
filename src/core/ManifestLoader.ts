import { VerifyPkgManifest } from '../types';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import Ajv from 'ajv/dist/2020';

import schema from '../../schema/package-verify.schema.json';

export class ManifestLoader {

    private static readonly ajv = new Ajv ( { allErrors: true, strict: false } );
    private static readonly validate = ManifestLoader.ajv.compile( schema );

    public static verify ( manifest: unknown ) : void {
        if ( ! this.validate( manifest ) ) throw new Error ( `Invalid manifest:\n${
            this.ajv.errorsText( this.validate.errors, { separator: '\n' } )
        }` );
    }

    public static async load ( path: string ) : Promise< VerifyPkgManifest > {
        const raw = await readFile( resolve( process.cwd(), path ), 'utf8' );

        const manifest = JSON.parse( raw );
        this.verify( manifest );

        return manifest;
    }

}
