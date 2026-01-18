import { VerifyPkgNormalized, VerifyPkgResult } from '../types';

export class PackageVerifier {

    constructor (
        private readonly manifest: VerifyPkgNormalized,
        private readonly verbose: boolean
    ) {}

    public async verify () : Promise< VerifyPkgResult > {
        return {};
    }

}
