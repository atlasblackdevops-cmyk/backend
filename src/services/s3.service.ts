import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Injectable } from "@nestjs/common";
import { randomUUID } from "crypto";
import * as path from "path";
import { S3Config } from "../config/s3.config";

@Injectable()
export class S3Service {
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly region: string;

  constructor(private readonly s3Config: S3Config) {
    const region = s3Config.region;
    const accessKeyId = s3Config.accessKeyId;
    const secretAccessKey = s3Config.secretAccessKey;
    const bucketName = s3Config.bucketName;

    if (!region || !accessKeyId || !secretAccessKey || !bucketName) {
      throw new Error(
        "AWS S3 configuration is missing. Check AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_S3_BUCKET_NAME in your .env file.",
      );
    }

    this.region = region.trim();
    this.bucketName = bucketName.trim();

    this.s3Client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: accessKeyId.trim(),
        secretAccessKey: secretAccessKey.trim(),
      },
    });
  }

  /**
   * Uploads a file to S3 and returns only the key (path) instead of full URL.
   * This allows for better flexibility and security (using presigned URLs).
   * @param file - File buffer to upload
   * @param originalFilename - Original filename to extract extension
   * @param folder - S3 folder/path prefix (default: "uploads")
   * @returns The S3 key (e.g., "farm-logos/fe21a6b7-4cb6-45d4-ae99-ed8017925a49.webp")
   */
  async uploadFile(
    file: Buffer,
    originalFilename: string,
    folder = "uploads",
  ): Promise<string> {
    const extension = path.extname(originalFilename);
    const key = `${folder}/${randomUUID()}${extension}`;

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: file,
      ContentType: this.getContentType(extension),
    });

    await this.s3Client.send(command);

    // Return only the key, not the full URL
    return key;
  }

  /**
   * Deletes a file from S3 using its key.
   * @param key - S3 key (path) of the file to delete (e.g., "farm-logos/uuid.webp")
   */
  async deleteFile(key: string): Promise<void> {
    if (!key) {
      throw new Error("S3 key is required for deletion");
    }

    const command = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    await this.s3Client.send(command);
  }

  /**
   * Generates a presigned URL for secure, time-limited access to an S3 object.
   * This allows private S3 objects to be accessed without making them public.
   * @param key - S3 key (path) of the file (e.g., "farm-logos/uuid.webp")
   * @param expiresIn - URL expiration time in seconds (default: 1 hour)
   * @returns Presigned URL that can be used to access the file, or null if key is empty
   */
  async getPresignedUrl(
    key: string | null | undefined,
    expiresIn = 3600,
  ): Promise<string | null> {
    if (!key) {
      return null;
    }

    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      return await getSignedUrl(this.s3Client, command, { expiresIn });
    } catch (error) {
      console.error("Error generating presigned URL:", error);
      return null;
    }
  }

  /**
   * Attaches presigned URLs to specified fields in an object.
   * Useful for transforming entities before returning them to clients.
   * @param obj - Object to transform
   * @param fields - Array of field names that contain S3 keys
   * @param expiresIn - URL expiration time in seconds (default: 1 hour)
   * @returns New object with presigned URLs in specified fields
   */
  async attachPresignedUrls<T extends Record<string, any>>(
    obj: T,
    fields: (keyof T)[],
    expiresIn = 3600,
  ): Promise<T> {
    const result = { ...obj };

    for (const field of fields) {
      const key = obj[field];
      if (key) {
        result[field] = (await this.getPresignedUrl(
          key as string,
          expiresIn,
        )) as T[keyof T];
      }
    }

    return result;
  }

  /**
   * Attaches presigned URLs to specified fields in an array of objects.
   * @param objects - Array of objects to transform
   * @param fields - Array of field names that contain S3 keys
   * @param expiresIn - URL expiration time in seconds (default: 1 hour)
   * @returns Array of objects with presigned URLs in specified fields
   */
  async attachPresignedUrlsToMany<T extends Record<string, any>>(
    objects: T[],
    fields: (keyof T)[],
    expiresIn = 3600,
  ): Promise<T[]> {
    return Promise.all(
      objects.map((obj) => this.attachPresignedUrls(obj, fields, expiresIn)),
    );
  }

  /**
   * Downloads an image from a URL and uploads it to S3.
   * Useful for importing images from external sources (e.g., Google profile pictures).
   * @param imageUrl - URL of the image to download
   * @param folder - S3 folder/path prefix (default: "profile-pictures")
   * @returns The S3 key (e.g., "profile-pictures/fe21a6b7-4cb6-45d4-ae99-ed8017925a49.jpg")
   */
  async uploadFromUrl(
    imageUrl: string,
    folder = "profile-pictures",
  ): Promise<string> {
    if (!imageUrl) {
      throw new Error("Image URL is required");
    }

    try {
      // Fetch the image from the URL
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(
          `Failed to download image: ${response.status} ${response.statusText}`,
        );
      }

      // Get the image buffer
      const imageBuffer = Buffer.from(await response.arrayBuffer());

      // Determine file extension from URL or Content-Type
      let extension = ".jpg"; // default
      const contentType = response.headers.get("content-type");
      if (contentType) {
        if (contentType.includes("png")) extension = ".png";
        else if (contentType.includes("gif")) extension = ".gif";
        else if (contentType.includes("webp")) extension = ".webp";
        else if (contentType.includes("jpeg") || contentType.includes("jpg"))
          extension = ".jpg";
      } else {
        // Try to extract from URL
        const urlPath = new URL(imageUrl).pathname;
        const urlExt = path.extname(urlPath);
        if (urlExt) extension = urlExt;
      }

      // Generate unique key
      const key = `${folder}/${randomUUID()}${extension}`;

      // Upload to S3
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: imageBuffer,
        ContentType: this.getContentType(extension),
      });

      await this.s3Client.send(command);

      return key;
    } catch (error) {
      throw new Error(
        `Failed to upload image from URL: ${error.message || "Unknown error"}`,
      );
    }
  }

  private getContentType(extension: string): string {
    const contentTypes: Record<string, string> = {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".gif": "image/gif",
      ".webp": "image/webp",
      ".svg": "image/svg+xml",
      ".pdf": "application/pdf",
    };

    return contentTypes[extension.toLowerCase()] || "application/octet-stream";
  }
}
