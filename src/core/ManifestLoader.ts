import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import Ajv from 'ajv';

export class ManifestLoader {

    private readonly ajv = new Ajv( { allErrors: true, strict: true } );

    public async load ( path: string ) : Promise< any > {
        const raw = await readFile( join( process.cwd(), path ), 'utf8' );
        const manifest = JSON.parse( raw );
    }

}
