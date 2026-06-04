import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

/** Minimal valid JPEG (1x1) for upload tests. */
const JPEG_BASE64 =
  "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDAREAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAb/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=";

const dir = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(dir, "kyc-sample.jpg");
if (!fs.existsSync(out)) {
  fs.writeFileSync(out, Buffer.from(JPEG_BASE64, "base64"));
}
export const kycSamplePath = out;
