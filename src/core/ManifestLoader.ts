import Ajv from 'ajv';

export class ManifestLoader {

    private readonly ajv = new Ajv( { allErrors: true, strict: true } );

    public async load ( path: string ) : Promise< any > {}

}
