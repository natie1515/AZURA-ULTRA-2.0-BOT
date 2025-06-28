const axios = require("axios");
const yts = require("yt-search");
const fs = require("fs");
const path = require("path");
const ffmpeg = require("fluent-ffmpeg");
const { promisify } = require("util");
const { pipeline } = require("stream");
const streamPipe = promisify(pipeline);

const pending = {}; // previewMessageId => { chatId, video, commandMsg, previewMsg, done }

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
      {
        text: `✳️ Usa:\n${pref}playpro <término>\nEj: *${pref}playpro* bad bunny diles`,
      },
      { quoted: msg }
    );
  }

  // React to show “loading”
  await conn.sendMessage(msg.key.remoteJid, {
    react: { text: "⏳", key: msg.key },
  });

  // Search YouTube
  const res = await yts(text);
  const video = res.videos[0];
  if (!video) {
    return conn.sendMessage(
      msg.key.remoteJid,
      { text: "❌ Sin resultados." },
      { quoted: msg }
    );
  }

  // Build caption
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
┣ 👍 Audio MP3     (reacciona o responde: Audio / 1)
┣ ❤️ Video MP4     (reacciona o responde: Video / 2)
┣ 📄 Audio Doc     (reacciona o responde: Audiodoc / 4)
┗ 📁 Video Doc     (reacciona o responde: Videodoc / 3)

📦 Otras opciones si usas termux o no estás en Sky Ultra Plus:
┣ 🎵 ${pref}play5 ${text}
┣ 🎥 ${pref}play6 ${text}
┗ ⚠️ ${pref}ff

═════════════════════
𖥔 Azura Ultra 𖥔
═════════════════════`.trim();

  // Send preview
  const preview = await conn.sendMessage(
    msg.key.remoteJid,
    { image: { url: video.thumbnail }, caption },
    { quoted: msg }
  );

  // Store job
  pending[preview.key.id] = {
    chatId: msg.key.remoteJid,
    video,
    commandMsg: msg,
    previewMsg: preview,
    done: { audio: false, video: false, audioDoc: false, videoDoc: false },
  };

  // Confirm ready
  await conn.sendMessage(msg.key.remoteJid, {
    react: { text: "✅", key: msg.key },
  });

  // Set up single listener
  if (!conn._playproListener) {
    conn._playproListener = true;
    conn.ev.on("messages.upsert", async (ev) => {
      for (const m of ev.messages) {
        // Handle reactions
        if (m.message?.reactionMessage) {
          const { key: reactKey, text: emoji } = m.message.reactionMessage;
          const job = pending[reactKey.id];
          if (job) await handleChoice(conn, job, emoji, job.previewMsg);
        }

        // Handle quoted-text replies
        const ext = m.message?.extendedTextMessage;
        if (ext?.contextInfo?.stanzaId) {
          const quotedId = ext.contextInfo.stanzaId;
          const job = pending[quotedId];
          if (job) {
            const body = (ext.text || "").trim().toLowerCase();
            await handleChoice(conn, job, body, job.previewMsg);
          }
        }
      }
    });
  }
};

async function handleChoice(conn, job, choice, quotedMsg) {
  const { chatId, video } = job;
  try {
    switch (choice) {
      case "👍":
      case "audio":
      case "1":
        if (!job.done.audio) {
          job.done.audio = true;
          await conn.sendMessage(chatId, { text: "⏳ Descargando audio…", quoted: quotedMsg });
          await sendAudio(conn, job, false);
        }
        break;
      case "❤️":
      case "video":
      case "2":
        if (!job.done.video) {
          job.done.video = true;
          await conn.sendMessage(chatId, { text: "⏳ Descargando vídeo…", quoted: quotedMsg });
          await sendVideo(conn, job, false);
        }
        break;
      case "📄":
      case "audiodoc":
      case "4":
        if (!job.done.audioDoc) {
          job.done.audioDoc = true;
          await conn.sendMessage(chatId, { text: "⏳ Descargando audio (documento)…", quoted: quotedMsg });
          await sendAudio(conn, job, true);
        }
        break;
      case "📁":
      case "videodoc":
      case "3":
        if (!job.done.videoDoc) {
          job.done.videoDoc = true;
          await conn.sendMessage(chatId, { text: "⏳ Descargando vídeo (documento)…", quoted: quotedMsg });
          await sendVideo(conn, job, true);
        }
        break;
      default:
        return;
    }

    // Clean up if all done
    if (Object.values(job.done).every((v) => v)) {
      delete pending[quotedMsg.key.id ?? quotedMsg.id];
    }
  } catch (e) {
    await conn.sendMessage(chatId, {
      text: `❌ Error: ${e.message}`,
      quoted: quotedMsg,
    });
  }
}

async function sendVideo(conn, { chatId, video }, asDocument = false) {
  const qList = ["720p", "480p", "360p"];
  let url = null;
  for (const q of qList) {
    try {
      const api = `https://api.neoxr.eu/api/youtube?url=${encodeURIComponent(
        video.url
      )}&type=video&quality=${q}&apikey=russellxz`;
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

  await streamPipe(
    (await axios.get(url, { responseType: "stream" })).data,
    fs.createWriteStream(file)
  );

  await conn.sendMessage(
    chatId,
    {
      [asDocument ? "document" : "video"]: fs.readFileSync(file),
      mimetype: "video/mp4",
      fileName: `${video.title}.mp4`,
      caption: asDocument ? undefined : "🎬 Video listo.",
    },
    { quoted: quotedMsg }
  );

  fs.unlinkSync(file);
}

async function sendAudio(conn, { chatId, video }, asDocument = false) {
  const api = `https://api.neoxr.eu/api/youtube?url=${encodeURIComponent(
    video.url
  )}&type=audio&quality=128kbps&apikey=russellxz`;
  const r = await axios.get(api);
  if (!r.data?.status || !r.data.data?.url) throw new Error("No se pudo obtener el audio");

  const tmp = path.join(__dirname, "../tmp");
  if (!fs.existsSync(tmp)) fs.mkdirSync(tmp);
  const raw = path.join(tmp, Date.now() + "_raw.m4a");
  const final = path.join(tmp, Date.now() + "_audio.mp3");

  await streamPipe(
    (await axios.get(r.data.data.url, { responseType: "stream" })).data,
    fs.createWriteStream(raw)
  );

  await new Promise((ok, err) => {
    ffmpeg(raw)
      .audioCodec("libmp3lame")
      .audioBitrate("128k")
      .format("mp3")
      .save(final)
      .on("end", ok)
      .on("error", err);
  });

  await conn.sendMessage(
    chatId,
    {
      [asDocument ? "document" : "audio"]: fs.readFileSync(final),
      mimetype: "audio/mpeg",
      fileName: `${video.title}.mp3`,
      ...(asDocument ? {} : { ptt: false }),
      caption: asDocument ? undefined : "🎧 Audio listo.",
    },
    { quoted: quotedMsg }
  );

  fs.unlinkSync(raw);
  fs.unlinkSync(final);
}

module.exports.command = ["playpro"];
