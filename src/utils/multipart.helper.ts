import { FastifyRequest } from "fastify";

export interface ParsedMultipartData {
  fields: Record<string, string>;
  files: Map<string, { buffer: Buffer; filename: string }>;
}

export async function parseMultipartData(
  req: FastifyRequest,
): Promise<ParsedMultipartData> {
  const fields: Record<string, string> = {};
  const files = new Map<string, { buffer: Buffer; filename: string }>();

  const parts = req.parts();

  for await (const part of parts) {
    if (part.type === "file") {
      const chunks: Buffer[] = [];
      for await (const chunk of part.file) {
        chunks.push(chunk);
      }
      files.set(part.fieldname, {
        buffer: Buffer.concat(chunks),
        filename: part.filename || "",
      });
    } else {
      fields[part.fieldname] = part.value as string;
    }
  }

  return { fields, files };
}
