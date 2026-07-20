import fs from "fs";
import path from "path";
import multer from "multer";
import { Request } from "express";

const EVENT_BANNER_DIR = path.join(process.cwd(), "public", "images", "event");
const EVENT_BANNER_URL_PREFIX = "/images/event";
const MAX_EVENT_BANNER_SIZE = 5 * 1024 * 1024;

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    fs.mkdirSync(EVENT_BANNER_DIR, { recursive: true });
    cb(null, EVENT_BANNER_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `event-banner-${unique}${ext}`);
  },
});

const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
) => {
  if (!file.mimetype.startsWith("image/")) {
    return cb(new Error("Banner sự kiện phải là file ảnh"));
  }
  cb(null, true);
};

export const uploadEventBanner = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_EVENT_BANNER_SIZE },
}).single("banner");

export const getEventBannerUrl = (
  file?: Express.Multer.File,
): string | undefined => {
  if (!file) return undefined;
  return `${EVENT_BANNER_URL_PREFIX}/${file.filename}`;
};
