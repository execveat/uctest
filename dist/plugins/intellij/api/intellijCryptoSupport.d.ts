import { Hash, Hmac } from 'crypto';
import { CryptoSupport, Digest, DigestBuilder, HmacInitializer, HmacSupport } from './stubs';
export declare class IntellijCryptoSupport implements CryptoSupport {
    constructor();
    sha1(): DigestBuilder;
    sha256(): DigestBuilder;
    sha384(): DigestBuilder;
    sha512(): DigestBuilder;
    md5(): DigestBuilder;
    hmac: HmacSupport;
}
export declare class IntellijDigestBuilder implements DigestBuilder {
    private readonly hash;
    constructor(hash: Hash | Hmac);
    updateWithText(textInput: string, encoding?: string | undefined): DigestBuilder;
    updateWithHex(hexInput: string): DigestBuilder;
    updateWithBase64(base64Input: string, urlSafe?: boolean | undefined): DigestBuilder;
    digest(): Digest;
}
/**
 * Object containing bytes of digest
 */
export declare class IntellijDigest implements Digest {
    private readonly hash;
    constructor(hash: Hash | Hmac);
    /**
     * Returns bytes encoded as 16-radix HEX string
     */
    toHex(): string;
    /**
     * Returns bytes encoded as Base64 string
     * @param urlSafe if true, will be used url-safe variant of Base64. By default, false
     */
    toBase64(urlSafe?: boolean): string;
}
export declare class IntellijHmacSupport implements HmacSupport {
    sha1(): HmacInitializer;
    sha256(): HmacInitializer;
    sha384(): HmacInitializer;
    sha512(): HmacInitializer;
    md5(): HmacInitializer;
}
export declare class IntellijHmacInitializer implements HmacInitializer {
    private readonly algorithm;
    constructor(algorithm: string);
    withTextSecret(textSecret: string, encoding?: string | undefined): DigestBuilder;
    withHexSecret(hexSecret: string): DigestBuilder;
    withBase64Secret(base64Secret: string, urlSafe?: string | undefined): DigestBuilder;
}
