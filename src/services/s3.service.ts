import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { Injectable } from "@nestjs/common";
import { randomUUID } from "crypto";
import * as path from "path";
import { S3Config } from "../config/s3.config";

@Injectable()
export class S3Service {
  private s3Client: S3Client;
  private bucketName: string;

  constructor(private readonly s3Config: S3Config) {
    this.s3Client = new S3Client({
      region: this.s3Config.region,
      credentials: {
        accessKeyId: this.s3Config.accessKeyId,
        secretAccessKey: this.s3Config.secretAccessKey,
      },
    });
    this.bucketName = this.s3Config.bucketName;
  }

  async uploadFile(
    file: Buffer,
    originalFilename: string,
    folder: string = "uploads",
  ): Promise<string> {
    const fileExtension = path.extname(originalFilename);
    const fileName = `${folder}/${randomUUID()}${fileExtension}`;

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: fileName,
      Body: file,
      ContentType: this.getContentType(fileExtension),
      // Note: ACL is deprecated in newer S3 buckets. Use bucket policy for public access instead.
      // ACL: "public-read",
    });

    await this.s3Client.send(command);

    // Return the public URL
    return `https://${this.bucketName}.s3.${this.s3Config.region}.amazonaws.com/${fileName}`;
  }

  async deleteFile(fileUrl: string): Promise<void> {
    // Extract key from URL
    const urlParts = fileUrl.split(".com/");
    if (urlParts.length < 2) {
      throw new Error("Invalid S3 file URL");
    }
    const key = urlParts[1];

    const command = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    await this.s3Client.send(command);
  }

  private getContentType(extension: string): string {
    const contentTypes: Record<string, string> = {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".gif": "image/gif",
      ".webp": "image/webp",
      ".svg": "image/svg+xml",
    };
    return contentTypes[extension.toLowerCase()] || "application/octet-stream";
  }
}
