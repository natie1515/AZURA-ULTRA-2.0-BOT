const axios = require("axios");
const yts = require("yt-search");
const fs = require("fs");
const path = require("path");
const ffmpeg = require("fluent-ffmpeg");
const { promisify } = require("util");
const { pipeline } = require("stream");
const streamPipe = promisify(pipeline);

// Tareas pendientes indexadas por previewMessageId
const pending = {};

module.exports = async (msg, { conn, text }) => {
  const subID = (conn.user.id || "").split(":")[0] + "@s.whatsapp.net";
  const pref = (() => {
    try {
      const p = JSON.parse(fs.readFileSync("prefixes.json", "utf8"));
      return p[subID] || ".";
    } catch {
      return ".";
    }
  })();

  if (!text) {
    return conn.sendMessage(
      msg.key.remoteJid,
      { text: `✳️ Usa:\n${pref}playpro <término>\nEj: *${pref}playpro* bad bunny diles` },
      { quoted: msg }
    );
  }

  // Muestra reacción de carga
  await conn.sendMessage(msg.key.remoteJid, {
    react: { text: "⏳", key: msg.key }
  });

  // Busca en YouTube
  const res = await yts(text);
  const video = res.videos[0];
  if (!video) {
    return conn.sendMessage(
      msg.key.remoteJid,
      { text: "❌ Sin resultados." },
      { quoted: msg }
    );
  }

  const { url: videoUrl, title, timestamp: duration, views, author } = video;
  const viewsFmt = views.toLocaleString();
  const caption = `
╔═══════════════╗
║✦ 𝘼𝙕𝙐𝙍𝘼 𝙐𝗹𝘁𝗋𝗮 2.0 BOT✦
╚═══════════════╝
📀 Info del video:
╭───────────────╮
├ 🎼 Título: ${title}
├ ⏱️ Duración: ${duration}
├ 👁️ Vistas: ${viewsFmt}
├ 👤 Autor: ${author}
└ 🔗 Link: ${videoUrl}
╰───────────────╯
📥 Opciones de Descarga:
┣ 👍 Audio MP3     (Audio / 1)
┣ ❤️ Video MP4     (Video / 2)
┣ 📄 Audio Doc     (Audiodoc / 4)
┗ 📁 Video Doc     (Videodoc / 3)

📦 Otras opciones si usas termux o no estás en Sky Ultra Plus:
┣ 🎵 ${pref}play5 ${text}
┣ 🎥 ${pref}play6 ${text}
┗ ⚠️ ${pref}ff

═════════════════════
𖥔 Azura Ultra 𖥔
═════════════════════`.trim();

  // Envía preview con miniatura
  const preview = await conn.sendMessage(
    msg.key.remoteJid,
    { image: { url: video.thumbnail }, caption },
    { quoted: msg }
  );

  // Guarda tarea pendiente
  pending[preview.key.id] = {
    chatId: msg.key.remoteJid,
    video,
    previewMsg: preview,
    done: { audio: false, video: false, audioDoc: false, videoDoc: false }
  };

  // Confirmación
  await conn.sendMessage(msg.key.remoteJid, {
    react: { text: "✅", key: msg.key }
  });

  // Listener único
  if (!conn._playproListener) {
    conn._playproListener = true;
    conn.ev.on("messages.upsert", async (ev) => {
      for (const m of ev.messages) {
        // Reacciones
        if (m.message?.reactionMessage) {
          const { key: reactKey, text: emoji } = m.message.reactionMessage;
          const job = pending[reactKey.id];
          if (job) await handleChoice(conn, job, emoji);
        }
        // Respuestas citadas
        const ext = m.message?.extendedTextMessage;
        if (ext?.contextInfo?.stanzaId) {
          const quotedId = ext.contextInfo.stanzaId;
          const job = pending[quotedId];
          if (job) {
            const body = (ext.text || "").trim().toLowerCase();
            await handleChoice(conn, job, body);
          }
        }
      }
    });
  }
};

// Función para manejar elección de descarga
async function handleChoice(conn, job, choice) {
  const { chatId, video, previewMsg, done } = job;
  try {
    if ((choice === "👍" || choice === "audio" || choice === "1") && !done.audio) {
      done.audio = true;
      await conn.sendMessage(chatId, { text: "⏳ Descargando audio…", quoted: previewMsg });
      await sendAudio(conn, job, false);

    } else if ((choice === "❤️" || choice === "video" || choice === "2") && !done.video) {
      done.video = true;
      await conn.sendMessage(chatId, { text: "⏳ Descargando vídeo…", quoted: previewMsg });
      await sendVideo(conn, job, false);

    } else if ((choice === "📄" || choice === "audiodoc" || choice === "4") && !done.audioDoc) {
      done.audioDoc = true;
      await conn.sendMessage(chatId, { text: "⏳ Descargando audio (documento)…", quoted: previewMsg });
      await sendAudio(conn, job, true);

    } else if ((choice === "📁" || choice === "videodoc" || choice === "3") && !done.videoDoc) {
      done.videoDoc = true;
      await conn.sendMessage(chatId, { text: "⏳ Descargando vídeo (documento)…", quoted: previewMsg });
      await sendVideo(conn, job, true);

    } else return;

    // Limpieza si todo completo
    if (Object.values(done).every(v => v)) {
      delete pending[previewMsg.key.id];
    }

  } catch (e) {
    await conn.sendMessage(chatId, { text: `❌ Error: ${e.message}`, quoted: previewMsg });
  }
}

// Descargar y enviar vídeo
async function sendVideo(conn, job, asDocument = false) {
  const { chatId, video, previewMsg } = job;
  const qualities = ["720p", "480p", "360p"];
  let url = null;
  for (const q of qualities) {
    try {
      const api = `https://api.neoxr.eu/api/youtube?url=${encodeURIComponent(video.url)}&type=video&quality=${q}&apikey=russellxz`;
      const r = await axios.get(api);
      if (r.data?.status && r.data.data?.url) {
        url = r.data.data.url;
        break;
      }
    } catch {}
  }
  if (!url) throw new Error("No se pudo obtener el video");

  const tmp = path.join(__dirname, "../tmp");
  if (!fs.existsSync(tmp)) fs.mkdirSync(tmp);
  const file = path.join(tmp, Date.now() + "_vid.mp4");

  await streamPipe((await axios.get(url, { responseType: "stream" })).data,
    fs.createWriteStream(file)
  );

  await conn.sendMessage(
    chatId,
    {
      [asDocument ? "document" : "video"]: fs.readFileSync(file),
      mimetype: "video/mp4",
      fileName: `${video.title}.mp4`,
      caption: asDocument ? undefined : "🎬 Video listo."
    },
    { quoted: previewMsg }
  );

  fs.unlinkSync(file);
}

// Descargar y enviar audio
async function sendAudio(conn, job, asDocument = false) {
  const { chatId, video, previewMsg } = job;
  const api = `https://api.neoxr.eu/api/youtube?url=${encodeURIComponent(video.url)}&type=audio&quality=128kbps&apikey=russellxz`;
  const r = await axios.get(api);
  if (!r.data?.status || !r.data.data?.url) throw new Error("No se pudo obtener el audio");

  const tmp = path.join(__dirname, "../tmp");
  if (!fs.existsSync(tmp)) fs.mkdirSync(tmp);
  const raw = path.join(tmp, Date.now() + "_raw.m4a");
  const final = path.join(tmp, Date.now() + "_audio.mp3");

  await streamPipe((await axios.get(r.data.data.url, { responseType: "stream" })).data,
    fs.createWriteStream(raw)
  );

  await new Promise((resolve, reject) => {
    ffmpeg(raw)
      .audioCodec("libmp3lame")
      .audioBitrate("128k")
      .format("mp3")
      .save(final)
      .on("end", resolve)
      .on("error", reject);
  });

  await conn.sendMessage(
    chatId,
    {
      [asDocument ? "document" : "audio"]: fs.readFileSync(final),
      mimetype: "audio/mpeg",
      fileName: `${video.title}.mp3`,
      ...(asDocument ? {} : { ptt: false }),
      caption: asDocument ? undefined : "🎧 Audio listo."
    },
    { quoted: previewMsg }
  );

  fs.unlinkSync(raw);
  fs.unlinkSync(final);
}

module.exports.command = ["playpro"];
