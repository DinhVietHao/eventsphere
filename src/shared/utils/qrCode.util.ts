import QRCode from "qrcode";

export interface IQrPayload {
    registrationId: string;
    eventId: string;
    timestamp: number;
}

export async function generateTicketQrCode(
    payload: IQrPayload,
): Promise<string> {
    return QRCode.toDataURL(JSON.stringify(payload), {
        errorCorrectionLevel: "M",
        margin: 2,
        width: 320,
    });
}