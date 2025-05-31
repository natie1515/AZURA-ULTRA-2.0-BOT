const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const stream = require('stream');
const finished = promisify(stream.finished);

const handler = async (msg, { conn, text, command }) => {
  const chatId = msg.key.remoteJid;

  if (!text) {
    return await conn.sendMessage(chatId, {
      text: `✳️ Ejemplo de uso:\n📌 *${global.prefix + command}* https://fb.watch/ncowLHMp-x/`
    }, { quoted: msg });
  }

  if (!text.match(/(www\.facebook\.com|fb\.watch)/gi)) {
    return await conn.sendMessage(chatId, {
      text: `❌ *Enlace de Facebook inválido.*\n\n📌 Ejemplo:\n${global.prefix + command} https://fb.watch/ncowLHMp-x/`
    }, { quoted: msg });
  }

  await conn.sendMessage(chatId, {
    react: { text: '⏳', key: msg.key }
  });

  try {
    const res = await axios.get(`https://api.dorratz.com/fbvideo?url=${encodeURIComponent(text)}`);
    const results = res.data;

    if (!results || results.length === 0) {
      return await conn.sendMessage(chatId, {
        text: "❌ No se pudo obtener el video."
      }, { quoted: msg });
    }

    const videoUrl = results[0].url;

    // ✅ Asegurarse que existe carpeta ./tmp
    const tmpDir = path.join(__dirname, 'tmp');
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }

    const fileName = `fb_video_${Date.now()}.mp4`;
    const filePath = path.join(tmpDir, fileName);

    const writer = fs.createWriteStream(filePath);
    const response = await axios.get(videoUrl, { responseType: 'stream' });
    response.data.pipe(writer);
    await finished(writer);

    // Validar peso en MB
    const stats = fs.statSync(filePath);
    const fileSizeMB = stats.size / (1024 * 1024); // Convertir a MB

    if (fileSizeMB > 500) {
      fs.unlinkSync(filePath); // borrar para liberar espacio
      return await conn.sendMessage(chatId, {
        text: `❌ *El archivo pesa ${fileSizeMB.toFixed(2)}MB y excede el límite de 500MB.*`
      }, { quoted: msg });
    }

    const caption = `📄 *Resoluciones disponibles:*\n${results.map(r => `- ${r.resolution}`).join('\n')}\n\n📥 *Video descargado como documento (720p)*\n🍧 *API:* api.dorratz.com\n\n───────\n© Azura Ultra & Cortana`;

    await conn.sendMessage(chatId, {
      document: fs.readFileSync(filePath),
      mimetype: 'video/mp4',
      fileName: 'facebook_video.mp4',
      caption
    }, { quoted: msg });

    fs.unlinkSync(filePath); // limpiar después de enviar

    await conn.sendMessage(chatId, {
      react: { text: '✅', key: msg.key }
    });

  } catch (err) {
    console.error("❌ Error en fbdoc:", err);
    await conn.sendMessage(chatId, {
      text: "❌ Ocurrió un error al procesar el enlace de Facebook."
    }, { quoted: msg });
  }
};

handler.command = ["fbdoc", "facebookdoc"];
module.exports = handler;
