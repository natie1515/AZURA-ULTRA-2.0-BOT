const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { tmpdir } = require('os');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const Crypto = require('crypto');

const tempFolder = path.join(__dirname, '../tmp/');
if (!fs.existsSync(tempFolder)) fs.mkdirSync(tempFolder, { recursive: true });

const handler = async (msg, { conn, args, usedPrefix, command }) => {
    const rawID = conn.user?.id || "";
    const subbotID = rawID.split(":")[0] + "@s.whatsapp.net";

    // Obtener prefijo del subbot
    const prefixPath = path.resolve("prefixes.json");
    let prefixes = {};
    if (fs.existsSync(prefixPath)) {
        prefixes = JSON.parse(fs.readFileSync(prefixPath, "utf-8"));
    }
    const usedPrefix = prefixes[subbotID] || ".";

    try {
        if (!args[0] || !args[0].includes('+')) {
            return await conn.sendMessage(msg.key.remoteJid, {
                text: `✳️ *Uso correcto:* ${usedPrefix}${command} <emoji1>+<emoji2>\n\n📌 *Ejemplo:* ${usedPrefix}${command} 😊+😡\n📌 *Ejemplo:* ${usedPrefix}${command} 😘+🥰`
            }, { quoted: msg });
        }

        await conn.sendMessage(msg.key.remoteJid, {
            react: { text: '⏳', key: msg.key }
        });

        const [emoji1, emoji2] = args[0].split('+');
        const encodedEmojis = encodeURIComponent(`${emoji1}_${emoji2}`);
        const apiUrl = `https://api.neoxr.eu/api/emoji?q=${encodedEmojis}&apikey=russellxz`;

        const response = await axios.get(apiUrl);
        if (!response.data.status || !response.data.data.url) {
            throw new Error('No se pudo generar la combinación de emojis');
        }

        const imageUrl = response.data.data.url;
        const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        const imageBuffer = Buffer.from(imageResponse.data, 'binary');

        // Convertir a sticker
        const tmpIn = path.join(tempFolder, `${Crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.png`);
        fs.writeFileSync(tmpIn, imageBuffer);

        const metadata = {
            packname: `✨ Mezcla de Emojis ✨`,
            author: `🤖 ${conn.user.name || 'Azura Ultra 2.0 Subbot'}`,
            categories: [emoji1, emoji2]
        };

        const sticker = await writeExifImg(imageBuffer, metadata);

        await conn.sendMessage(msg.key.remoteJid, {
            sticker: { url: sticker }
        }, { quoted: msg });

        fs.unlinkSync(tmpIn);
        if (fs.existsSync(sticker)) fs.unlinkSync(sticker);

        await conn.sendMessage(msg.key.remoteJid, {
            react: { text: '✅', key: msg.key }
        });

    } catch (err) {
        console.error('❌ Error en mixemoji:', err);
        await conn.sendMessage(msg.key.remoteJid, {
            text: `❌ *Error:* ${err.message || 'No se pudo crear el sticker de emojis combinados'}`
        }, { quoted: msg });

        await conn.sendMessage(msg.key.remoteJid, {
            react: { text: '❌', key: msg.key }
        });
    }
};

// Funciones auxiliares para stickers (las mismas que en el comando 's')
async function writeExifImg(media, metadata) {
    const wMedia = await imageToWebp(media);
    return await addExif(wMedia, metadata);
}

async function imageToWebp(media) {
    const tmpIn = path.join(tempFolder, `${Crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.jpg`);
    const tmpOut = path.join(tempFolder, `${Crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.webp`);
    fs.writeFileSync(tmpIn, media);

    await new Promise((resolve, reject) => {
        ffmpeg(tmpIn)
            .on('error', reject)
            .on('end', resolve)
            .addOutputOptions([
                "-vcodec", "libwebp",
                "-vf", "scale='min(320,iw)':min'(320,ih)':force_original_aspect_ratio=decrease,fps=15,pad=320:320:-1:-1:color=white@0.0,split[a][b];[a]palettegen=reserve_transparent=on:transparency_color=ffffff[p];[b][p]paletteuse"
            ])
            .toFormat('webp')
            .save(tmpOut);
    });

    const buff = fs.readFileSync(tmpOut);
    fs.unlinkSync(tmpIn);
    fs.unlinkSync(tmpOut);
    return buff;
}

async function addExif(webpBuffer, metadata) {
    const tmpIn = path.join(tempFolder, `${Crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.webp`);
    const tmpOut = path.join(tempFolder, `${Crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.webp`);
    fs.writeFileSync(tmpIn, webpBuffer);

    const json = {
        "sticker-pack-id": "emoji-mix-pack",
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

handler.command = ['mixemoji', 'emojimix', 'mezclaemoji'];
handler.help = ['mixemoji <emoji1+emoji2>'];
module.exports = handler;
