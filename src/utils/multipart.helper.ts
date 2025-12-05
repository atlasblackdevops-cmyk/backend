import { FastifyRequest } from "fastify";

export interface ParsedMultipartData {
  fields: Record<string, string | string[]>;
  files: Map<
    string,
    | { buffer: Buffer; filename: string }
    | Array<{ buffer: Buffer; filename: string }>
  >;
}

/**
 * Parses multipart form data from Fastify request.
 * Handles multiple files with the same fieldname by collecting them into arrays.
 * Single files remain as single objects, multiple files become arrays.
 */
export async function parseMultipartData(
  req: FastifyRequest,
): Promise<ParsedMultipartData> {
  const fields: Record<string, string | string[]> = {};
  const files = new Map<
    string,
    | { buffer: Buffer; filename: string }
    | Array<{ buffer: Buffer; filename: string }>
  >();
  const fileCounts = new Map<string, number>();
  const fieldCounts = new Map<string, number>();

  const parts = req.parts();

  for await (const part of parts) {
    if (part.type === "file") {
      const chunks: Buffer[] = [];
      for await (const chunk of part.file) {
        chunks.push(chunk);
      }

      const fileData = {
        buffer: Buffer.concat(chunks),
        filename: part.filename || "",
      };

      const existingFile = files.get(part.fieldname);
      const count = fileCounts.get(part.fieldname) || 0;

      if (existingFile) {
        // If it's already an array, push to it
        if (Array.isArray(existingFile)) {
          existingFile.push(fileData);
        } else {
          // Convert single file to array
          files.set(part.fieldname, [existingFile, fileData]);
        }
        fileCounts.set(part.fieldname, count + 1);
      } else {
        // First file for this fieldname
        files.set(part.fieldname, fileData);
        fileCounts.set(part.fieldname, 1);
      }
    } else {
      // Handle multiple fields with the same name
      const existingField = fields[part.fieldname];
      const count = fieldCounts.get(part.fieldname) || 0;
      const value = part.value as string;

      if (existingField) {
        // If it's already an array, push to it
        if (Array.isArray(existingField)) {
          existingField.push(value);
        } else {
          // Convert single value to array
          fields[part.fieldname] = [existingField, value];
        }
        fieldCounts.set(part.fieldname, count + 1);
      } else {
        // First value for this fieldname
        fields[part.fieldname] = value;
        fieldCounts.set(part.fieldname, 1);
      }
    }
  }

  return { fields, files };
}

/**
 * Helper function to safely extract a string value from a multipart field.
 * If the field is an array, returns the first value.
 * If the field is a string, returns it directly.
 * If the field is undefined, returns undefined.
 */
export function getFieldValue(
  field: string | string[] | undefined,
): string | undefined {
  if (!field) return undefined;
  return Array.isArray(field) ? field[0] : field;
}
