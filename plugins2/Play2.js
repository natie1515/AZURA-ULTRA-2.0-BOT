const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const { pipeline } = require('stream');
const streamPipeline = promisify(pipeline);

const handler = async (msg, { conn, text }) => {
  const rawID = conn.user?.id || "";
  const subbotID = rawID.split(":")[0] + "@s.whatsapp.net";

  const prefixPath = path.resolve("prefixes.json");
  let prefixes = {};
  if (fs.existsSync(prefixPath)) {
    prefixes = JSON.parse(fs.readFileSync(prefixPath, "utf-8"));
  }

  const usedPrefix = prefixes[subbotID] || ".";

  if (!text) {
    return await conn.sendMessage(msg.key.remoteJid, {
      text: `✳️ Usa el comando correctamente:\n\n📌 Ejemplo: *${usedPrefix}play2* La Factoría - Perdoname`
    }, { quoted: msg });
  }

  await conn.sendMessage(msg.key.remoteJid, {
    react: { text: '⏳', key: msg.key }
  });

  try {
    const searchUrl = `https://api.neoxr.eu/api/video?q=${encodeURIComponent(text)}&apikey=russellxz`;
    const searchRes = await axios.get(searchUrl);
    const videoInfo = searchRes.data;

    if (!videoInfo || !videoInfo.data?.url) throw new Error('No se pudo encontrar el video');

    const title = videoInfo.title || 'video';
    const thumbnail = videoInfo.thumbnail;
    const duration = videoInfo.fduration || '0:00';
    const views = videoInfo.views || 'N/A';
    const author = videoInfo.channel || 'Desconocido';
    const videoLink = `https://www.youtube.com/watch?v=${videoInfo.id}`;

    // Validar duración (opcional)
    const durParts = duration.split(':').map(Number).reverse();
    const durMins = (durParts[0] || 0) / 60 + (durParts[1] || 0) + (durParts[2] || 0) * 60;
    if (durMins > 10) {
      return await conn.sendMessage(msg.key.remoteJid, {
        text: `❌ *Duración excedida:*\nEste video dura más de *10 minutos* (${duration}).\nPor favor elige otro más corto.`
      }, { quoted: msg });
    }

    const captionPreview = `

   ✦ AZURA ULTRA 2.0 𝗦𝘂𝗯𝗯𝗼𝘁 ✦

📀 *Info del video:*  
❀ 🎼 *Título:* ${title}
❀ ⏱️ *Duración:* ${duration}
❀ 👁️ *Vistas:* ${views}
❀ 👤 *Autor:* ${author}
❀ 🔗 *Link:* ${videoLink}

📥 *Opciones:*  
❀ 🎵 _${usedPrefix}play1 ${text}_
❀ 🎥 _${usedPrefix}play6 ${text}_
❀ ⚠️ *¿No se reproduce?* Usa _${usedPrefix}ff_

⏳ Procesando video...
═════════════════════`;

    await conn.sendMessage(msg.key.remoteJid, {
      image: { url: thumbnail },
      caption: captionPreview
    }, { quoted: msg });

    // Descarga directa del video sin probar calidades
    const apiUrl = `https://api.neoxr.eu/api/youtube?url=${encodeURIComponent(videoLink)}&type=video&quality=360p&apikey=russellxz`;
    const res = await axios.get(apiUrl);
    const json = res.data;

    if (!json.status || !json.data?.url) throw new Error('No se pudo obtener el enlace del video');

    const tmpDir = path.join(__dirname, '../tmp');
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);
    const filePath = path.join(tmpDir, `${Date.now()}_video.mp4`);

    const resDownload = await axios.get(json.data.url, {
      responseType: 'stream',
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    await streamPipeline(resDownload.data, fs.createWriteStream(filePath));

    const stats = fs.statSync(filePath);
    if (!stats || stats.size < 100000) {
      fs.unlinkSync(filePath);
      throw new Error('El video descargado está vacío o incompleto');
    }

    await conn.sendMessage(msg.key.remoteJid, {
      video: fs.readFileSync(filePath),
      mimetype: 'video/mp4',
      fileName: `${title}.mp4`,
      caption: `🎬 Aquí tiene su video en calidad estándar.\n\n© Azura ultra 2.0 Subbot`
    }, { quoted: msg });

    fs.unlinkSync(filePath);

    await conn.sendMessage(msg.key.remoteJid, {
      react: { text: '✅', key: msg.key }
    });

  } catch (err) {
    console.error(err);
    await conn.sendMessage(msg.key.remoteJid, {
      text: `❌ *Error:* ${err.message}`
    }, { quoted: msg });

    await conn.sendMessage(msg.key.remoteJid, {
      react: { text: '❌', key: msg.key }
    });
  }
};

handler.command = ['play2'];
module.exports = handler;
