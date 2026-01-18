import { VerifyPkgNormalized } from '../types';

export class PackageVerifier {

    constructor (
        private readonly manifest: VerifyPkgNormalized,
        private readonly verbose: boolean
    ) {}

}
