import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const publicDirectory = fileURLToPath(new URL("../public/", import.meta.url));
const source = path.join(publicDirectory, "logo.png");
const iconsDirectory = path.join(publicDirectory, "icons");
await mkdir(iconsDirectory, { recursive: true });

await sharp(source).webp({ quality: 90 }).toFile(path.join(publicDirectory, "logo.webp"));
for (const size of [16, 32, 48, 180, 192, 512]) {
  const filename = size === 180 ? "apple-touch-icon.png" : `icon-${size}.png`;
  await sharp(source).resize(size, size).png().toFile(path.join(iconsDirectory, filename));
}

// Keep the complete circular logo inside the maskable icon's central safe area.
await sharp(source)
  .resize(408, 408)
  .extend({ top: 52, bottom: 52, left: 52, right: 52, background: "#2e1b10" })
  .png()
  .toFile(path.join(iconsDirectory, "icon-maskable-512.png"));

await sharp(source)
  .resize(1200, 630, { fit: "contain", background: "#2e1b10" })
  .jpeg({ quality: 90 })
  .toFile(path.join(publicDirectory, "social-card.jpg"));

// ICO supports PNG image entries, including multiple sizes in the same file.
const sizes = [16, 32, 48];
const images = await Promise.all(sizes.map((size) => sharp(source).resize(size, size).png().toBuffer()));
const header = Buffer.alloc(6 + sizes.length * 16);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(sizes.length, 4);
let offset = header.length;
for (const [index, size] of sizes.entries()) {
  const entry = 6 + index * 16;
  header[entry] = size;
  header[entry + 1] = size;
  header.writeUInt16LE(1, entry + 4);
  header.writeUInt16LE(32, entry + 6);
  header.writeUInt32LE(images[index].length, entry + 8);
  header.writeUInt32LE(offset, entry + 12);
  offset += images[index].length;
}
await writeFile(path.join(publicDirectory, "favicon.ico"), Buffer.concat([header, ...images]));
console.log("Logo, favicon, ícones do aplicativo e imagem de compartilhamento gerados.");
