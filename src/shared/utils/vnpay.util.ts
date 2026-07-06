import crypto from "crypto";
import qs from "qs";

function vnpEncode(value: unknown): string {
    return encodeURIComponent(String(value)).replace(/%20/g, "+");
}

export function sortObject(obj: Record<string, unknown>): Record<string, string> {
    const sorted: Record<string, string> = {};
    Object.keys(obj)
        .sort()
        .forEach((key) => {
            sorted[encodeURIComponent(key)] = vnpEncode(obj[key]);
        });

    return sorted;
}

export function createVNPaySecureHash(
    params: Record<string, string | number>,
    secretKey: string,
): string {
    const sortedParams = sortObject(params);
    const signData = qs.stringify(sortedParams, { encode: false });

    return crypto
        .createHmac("sha512", secretKey)
        .update(Buffer.from(signData, "utf-8"))
        .digest("hex");
}

export function buildVNPayQuery(params: Record<string, string | number>): string {
    return qs.stringify(sortObject(params), { encode: false });
}

export function verifyVNPaySecureHash(
    query: Record<string, string>,
    secretKey: string,
): boolean {
    const secureHash = query.vnp_SecureHash;

    const params: Record<string, string> = { ...query };
    delete params.vnp_SecureHash;
    delete params.vnp_SecureHashType;

    const signed = createVNPaySecureHash(params, secretKey);

    return signed === secureHash;
}
