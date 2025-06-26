import fs from "fs";
import path from "path";
import axios from "axios";

export async function downloadFile(fileUrl: string): Promise<string> {
  const fileName = path.basename(new URL(fileUrl).pathname);
  const outputPath = path.join("tmp", fileName);
  fs.mkdirSync("tmp", { recursive: true });
  const response = await axios.get(fileUrl, { responseType: "arraybuffer" });
  fs.writeFileSync(outputPath, response.data);
  return outputPath;
}
