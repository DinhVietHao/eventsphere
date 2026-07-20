import multer from "multer";
import path from "path";
import fs from "fs";
import { Request } from "express";

// ─── Avatar ────────────────────────────────────────────────────────────────

const AVATAR_DIR = path.join(process.cwd(), "public", "uploads", "avatars");
if (!fs.existsSync(AVATAR_DIR)) fs.mkdirSync(AVATAR_DIR, { recursive: true });

const avatarStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, AVATAR_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `avatar_${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`;
    cb(null, uniqueName);
  },
});

const imageFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
) => {
  const allowed = [".jpg", ".jpeg", ".png", ".webp"];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error("Chi chap nhan file anh: jpg, jpeg, png, webp"));
  }
};

export const uploadAvatar = multer({
  storage: avatarStorage,
  fileFilter: imageFilter,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
}).single("avatar");

// ─── Event Banner ──────────────────────────────────────────────────────────

const BANNER_DIR = path.join(process.cwd(), "public", "uploads", "banners");
if (!fs.existsSync(BANNER_DIR)) fs.mkdirSync(BANNER_DIR, { recursive: true });

const bannerStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, BANNER_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `banner_${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`;
    cb(null, uniqueName);
  },
});

export const uploadEventBanner = multer({
  storage: bannerStorage,
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB cho banner
}).single("banner");

/**
 * Lấy URL public của banner sau khi upload.
 * Trả về undefined nếu không có file (giữ nguyên banner cũ).
 */
export function getEventBannerUrl(
  file: Express.Multer.File | undefined,
): string | undefined {
  if (!file) return undefined;
  return `/uploads/banners/${file.filename}`;
}
