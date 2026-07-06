import QRCode from "qrcode";

export interface IQrPayload {
  registrationId: string;
  eventId: string;
  timestamp: number;
}

export class QrService {
  async generateTicketQrCode(payload: IQrPayload): Promise<string> {
    // QR payload dùng JSON để staff/check-in service có thể parse rõ ràng.
    const qrText = JSON.stringify(payload);
    return QRCode.toDataURL(qrText, {
      errorCorrectionLevel: "M",
      margin: 2,
      width: 320,
    });
  }
}

export const qrService = new QrService();
