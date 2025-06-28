const axios = require("axios");
const yts = require("yt-search");
const fs = require("fs");
const path = require("path");
const ffmpeg = require("fluent-ffmpeg");
const { promisify } = require("util");
const { pipeline } = require("stream");
const streamPipe = promisify(pipeline);

const pending = {}; // msgId => { chatId, video, userMsg, done }

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
    return conn.sendMessage(msg.key.remoteJid, {
      text: `✳️ Usa:\n${pref}playpro <término>\nEj: *${pref}playpro* bad bunny diles`,
    }, { quoted: msg });
  }

  await conn.sendMessage(msg.key.remoteJid, {
    react: { text: "⏳", key: msg.key }
  });

  const res = await yts(text);
  const video = res.videos[0];
  if (!video) {
    return conn.sendMessage(msg.key.remoteJid, {
      text: "❌ Sin resultados.",
    }, { quoted: msg });
  }

  const videoUrl = video.url;
  const title = video.title;
  const duration = video.timestamp;
  const views = video.views.toLocaleString();
  const author = video.author.name;

  const caption = `
╔═══════════════╗
║✦ 𝘼𝙕𝙐𝙍𝘼 𝙐𝗹𝘁𝗋𝗮 2.0 BOT✦
╚═══════════════╝
📀 𝙄𝗻𝗳𝗼 𝗱𝗲𝗹 𝘃𝗶𝗱𝗲𝗼:
╭───────────────╮
├ 🎼 Título: ${title}
├ ⏱️ Duración: ${duration}
├ 👁️ Vistas: ${views}
├ 👤 Autor: ${author}
└ 🔗 Link: ${videoUrl}
╰───────────────╯
📥 *Opciones de Descarga:*
┣ 👍 Audio MP3
┣ ❤️ Video MP4
┣ 📄 Audio (Documento)
┗ 📁 Video (Documento)

📦 Otras opciones si usas termux o no estás en Sky Ultra Plus:
┣ 🎵 ${global.prefix}play5 ${text}
┣ 🎥 ${global.prefix}play6 ${text}
┗ ⚠️ ${global.prefix}ff
═════════════════════
𖥔 Azura Ultra 𖥔
═════════════════════`.trim();

  const preview = await conn.sendMessage(msg.key.remoteJid, {
    image: { url: video.thumbnail },
    caption
  }, { quoted: msg });

  pending[preview.key.id] = {
    chatId: msg.key.remoteJid,
    video,
    userMsg: msg,
    done: {
      audio: false,
      video: false,
      audioDoc: false,
      videoDoc: false
    }
  };

  await conn.sendMessage(msg.key.remoteJid, {
    react: { text: "✅", key: msg.key }
  });

  if (!conn._playproListener) {
    conn._playproListener = true;
    conn.ev.on("messages.upsert", async ev => {
      for (const m of ev.messages) {
        if (!m.message?.reactionMessage) continue;

        const { key, text: emoji } = m.message.reactionMessage;
        const job = pending[key.id];
        if (!job) continue;

        try {
          if (emoji === "👍" && !job.done.audio) {
            job.done.audio = true;
            await conn.sendMessage(job.chatId, {
              text: "⏳ Descargando audio…", quoted: job.userMsg
            });
            await sendAudio(conn, job, false);
          } else if (emoji === "❤️" && !job.done.video) {
            job.done.video = true;
            await conn.sendMessage(job.chatId, {
              text: "⏳ Descargando vídeo…", quoted: job.userMsg
            });
            await sendVideo(conn, job, false);
          } else if (emoji === "📄" && !job.done.audioDoc) {
            job.done.audioDoc = true;
            await conn.sendMessage(job.chatId, {
              text: "⏳ Descargando audio (documento)…", quoted: job.userMsg
            });
            await sendAudio(conn, job, true);
          } else if (emoji === "📁" && !job.done.videoDoc) {
            job.done.videoDoc = true;
            await conn.sendMessage(job.chatId, {
              text: "⏳ Descargando vídeo (documento)…", quoted: job.userMsg
            });
            await sendVideo(conn, job, true);
          }

          if (Object.values(job.done).every(v => v)) {
            delete pending[key.id];
          }
        } catch (e) {
          await conn.sendMessage(job.chatId, {
            text: `❌ Error: ${e.message}`,
            quoted: job.userMsg
          });
        }
      }
    });
  }
};

async function sendVideo(conn, { chatId, video, userMsg }, asDocument = false) {
  const qList = ["720p", "480p", "360p"];
  let url = null;
  for (const q of qList) {
    try {
      const api = `https://api.neoxr.eu/api/youtube?url=${encodeURIComponent(video.url)}&type=video&quality=${q}&apikey=russellxz`;
      const r = await axios.get(api);
      if (r.data?.status && r.data.data?.url) {
        url = r.data.data.url;
        break;
      }
    } catch { }
  }
  if (!url) throw new Error("No se pudo obtener el video");

  const tmp = path.join(__dirname, "../tmp");
  if (!fs.existsSync(tmp)) fs.mkdirSync(tmp);
  const file = path.join(tmp, Date.now() + "_vid.mp4");

  await streamPipe((await axios.get(url, { responseType: "stream" })).data,
    fs.createWriteStream(file));

  await conn.sendMessage(chatId, {
    [asDocument ? "document" : "video"]: fs.readFileSync(file),
    mimetype: "video/mp4",
    fileName: video.title + ".mp4",
    caption: asDocument ? undefined : "🎬 Video listo."
  }, { quoted: userMsg });

  fs.unlinkSync(file);
}

async function sendAudio(conn, { chatId, video, userMsg }, asDocument = false) {
  const api = `https://api.neoxr.eu/api/youtube?url=${encodeURIComponent(video.url)}&type=audio&quality=128kbps&apikey=russellxz`;
  const r = await axios.get(api);
  if (!r.data?.status || !r.data.data?.url) throw new Error("No se pudo obtener el audio");

  const tmp = path.join(__dirname, "../tmp");
  if (!fs.existsSync(tmp)) fs.mkdirSync(tmp);
  const raw = path.join(tmp, Date.now() + "_raw.m4a");
  const final = path.join(tmp, Date.now() + "_audio.mp3");

  await streamPipe((await axios.get(r.data.data.url, { responseType: "stream" })).data,
    fs.createWriteStream(raw));

  await new Promise((ok, err) => {
    ffmpeg(raw).audioCodec("libmp3lame").audioBitrate("128k").format("mp3")
      .save(final).on("end", ok).on("error", err);
  });

  await conn.sendMessage(chatId, {
    [asDocument ? "document" : "audio"]: fs.readFileSync(final),
    mimetype: "audio/mpeg",
    fileName: video.title + ".mp3",
    ...(asDocument ? {} : { ptt: false }),
    caption: asDocument ? undefined : "🎧 Audio listo."
  }, { quoted: userMsg });

  fs.unlinkSync(raw);
  fs.unlinkSync(final);
}

module.exports.command = ["playpro"];
