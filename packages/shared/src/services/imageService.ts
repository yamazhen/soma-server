import { v2 as cloudinary } from "cloudinary";
import { serverEnv } from "../config/env.js";
import multer from "multer";
import sharp from "sharp";

export const configureCloudinary = () => {
  cloudinary.config({
    cloud_name: serverEnv.CLOUDINARY_CLOUD_NAME,
    api_key: serverEnv.CLOUDINARY_API_KEY,
    api_secret: serverEnv.CLOUDINARY_API_SECRET,
  });
};

const storage = multer.memoryStorage();

export const createImageUpload = (maxSize: number = 5 * 1024 * 1024) => {
  return multer({
    storage,
    limits: { fileSize: maxSize },
    fileFilter: (_req, file, cb) => {
      if (file.mimetype.startsWith("image/")) {
        cb(null, true);
      } else {
        cb(new Error("Only image files are allowed."));
      }
    },
  });
};

export const uploadImageToCloudinary = async (
  buffer: Buffer,
  folder: string,
  publicId?: string,
  transformation?: any,
): Promise<{ url: string; publicId: string; secureUrl: string }> => {
  try {
    const proccessedBuffer = await sharp(buffer)
      .resize(400, 400, { fit: "cover" })
      .jpeg({ quality: 85 })
      .toBuffer();

    const uploadOptions: any = {
      folder,
      transformation: transformation || [
        { width: 400, height: 400, crop: "fill", gravity: "face" },
        { quality: "auto", fetch_format: "auto" },
      ],
      overwrite: true,
      resource_type: "image",
    };

    if (publicId) {
      uploadOptions.public_id = publicId;
    }

    const result = await cloudinary.uploader.upload(
      `data:image/jpeg;base64,${proccessedBuffer.toString("base64")}`,
      uploadOptions,
    );

    return {
      url: result.url,
      publicId: result.public_id,
      secureUrl: result.secure_url,
    };
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    throw new Error("Failed to upload image");
  }
};

export const deleteImageFromCloudinary = async (publicId: string) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error("Error deleting image from Cloudinary:", error);
    throw error;
  }
};

export const getOptimizedImageUrl = (
  publicId: string,
  options?: {
    width?: number;
    height?: number;
    quality?: string;
  },
) => {
  return cloudinary.url(publicId, {
    width: options?.width || 400,
    height: options?.height || 400,
    crop: "fill",
    gravity: "face",
    quality: options?.quality || "auto",
    fetch_format: "auto",
  });
};

export const extractPublicIdFromUrl = (url: string): string | null => {
  try {
    const matches = url.match(/\/v\d+\/(.+)\.(jpg|jpeg|png|webp|gif)$/);
    return matches?.[1] ?? null;
  } catch {
    return null;
  }
};
