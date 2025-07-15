const fs = require("fs");
const path = require("path");
const axios = require("axios");
const Crypto = require("crypto");
const ffmpeg = require("fluent-ffmpeg");
const webp = require("node-webpmux");

const tempFolder = path.join(__dirname, "../tmp/");
if (!fs.existsSync(tempFolder)) fs.mkdirSync(tempFolder, { recursive: true });

const handler = async (msg, { conn, args, text }) => {
  const emoji = text?.trim();

  const rawID = conn.user?.id || "";
  const subbotID = rawID.split(":")[0] + "@s.whatsapp.net";

  const prefixPath = path.resolve("prefixes.json");
  let prefixes = {};
  if (fs.existsSync(prefixPath)) {
    prefixes = JSON.parse(fs.readFileSync(prefixPath, "utf-8"));
  }
  const usedPrefix = prefixes[subbotID] || ".";

  if (!emoji || !emoji.match(/\p{Emoji}/u)) {
    return await conn.sendMessage(msg.key.remoteJid, {
      text: `❗ *Envía un emoji para animarlo como sticker.*\n\n📌 *Ejemplo:* \`${usedPrefix}aniemoji 😎\``
    }, { quoted: msg });
  }

  try {
    await conn.sendMessage(msg.key.remoteJid, {
      react: { text: "🕒", key: msg.key }
    });

    const { data } = await axios.get(`https://api.neoxr.eu/api/emojito?q=${encodeURIComponent(emoji)}&apikey=russellxz`);
    if (!data.status || !data.data?.url) {
      return await conn.sendMessage(msg.key.remoteJid, {
        text: "❌ *No se pudo generar el emoji animado. Intenta con otro.*"
      }, { quoted: msg });
    }

    const mediaRes = await axios.get(data.data.url, { responseType: "arraybuffer" });
    const buffer = Buffer.from(mediaRes.data);

    const senderName = msg.pushName || "Usuario";
    const now = new Date();
    const fechaCreacion = `📅 ${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()} 🕒 ${now.getHours()}:${now.getMinutes()}`;

    const metadata = {
      packname: `🎭 Emoji Animado de: ${senderName}`,
      author: `🤖 Azura Ultra\n🛠️ Russell xz 💻\n${fechaCreacion}`,
      categories: [emoji]
    };

    const final = await writeExifImg(buffer, metadata);

    await conn.sendMessage(msg.key.remoteJid, {
      sticker: { url: final }
    }, { quoted: msg });

    await conn.sendMessage(msg.key.remoteJid, {
      react: { text: "✅", key: msg.key }
    });

  } catch (err) {
    console.error("❌ Error en aniemoji:", err);
    await conn.sendMessage(msg.key.remoteJid, {
      text: "❌ *Error procesando el emoji animado.*"
    }, { quoted: msg });

    await conn.sendMessage(msg.key.remoteJid, {
      react: { text: "❌", key: msg.key }
    });
  }
};

handler.command = ["aniemoji"];
handler.tags = ["sticker", "emoji"];
handler.help = ["aniemoji 😎"];
module.exports = handler;

/* === FUNCIONES DE CONVERSIÓN DE STICKERS CON EXIF === */

function randomFileName(ext) {
  return `${Crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.${ext}`;
}

async function imageToWebp(media) {
  const tmpIn = path.join(tempFolder, randomFileName("jpg"));
  const tmpOut = path.join(tempFolder, randomFileName("webp"));
  fs.writeFileSync(tmpIn, media);

  await new Promise((resolve, reject) => {
    ffmpeg(tmpIn)
      .on("error", reject)
      .on("end", resolve)
      .addOutputOptions([
        "-vcodec", "libwebp",
        "-vf", "scale='min(320,iw)':min'(320,ih)':force_original_aspect_ratio=decrease,fps=15,pad=320:320:-1:-1:color=white@0.0,split[a][b];[a]palettegen=reserve_transparent=on:transparency_color=ffffff[p];[b][p]paletteuse"
      ])
      .toFormat("webp")
      .save(tmpOut);
  });

  const buff = fs.readFileSync(tmpOut);
  fs.unlinkSync(tmpIn);
  fs.unlinkSync(tmpOut);
  return buff;
}

async function writeExifImg(media, metadata) {
  const wMedia = await imageToWebp(media);
  return await addExif(wMedia, metadata);
}

async function addExif(webpBuffer, metadata) {
  const tmpIn = path.join(tempFolder, randomFileName("webp"));
  const tmpOut = path.join(tempFolder, randomFileName("webp"));
  fs.writeFileSync(tmpIn, webpBuffer);

  const json = {
    "sticker-pack-id": "azura-aniemoji",
    "sticker-pack-name": metadata.packname,
    "sticker-pack-publisher": metadata.author,
    "emojis": metadata.categories || [""]
  };

  const exifAttr = Buffer.from([
    0x49, 0x49, 0x2A, 0x00,
    0x08, 0x00, 0x00, 0x00,
    0x01, 0x00, 0x41, 0x57,
    0x07, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x16, 0x00,
    0x00, 0x00
  ]);

  const jsonBuff = Buffer.from(JSON.stringify(json), "utf-8");
  const exif = Buffer.concat([exifAttr, jsonBuff]);
  exif.writeUIntLE(jsonBuff.length, 14, 4);

  const img = new webp.Image();
  await img.load(tmpIn);
  img.exif = exif;
  await img.save(tmpOut);
  fs.unlinkSync(tmpIn);
  return tmpOut;
}
