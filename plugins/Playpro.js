/*  plugins2/playpro.js  —  descarga audio (👍) o vídeo (❤️) con reacción */

const axios  = require("axios");
const yts    = require("yt-search");
const fs     = require("fs");
const path   = require("path");
const ffmpeg = require("fluent-ffmpeg");
const { promisify } = require("util");
const { pipeline }  = require("stream");
const streamPipe    = promisify(pipeline);

const pending = {};   // { msgId : { chatId, video, previewMsg, done:{audio,video} } }

/* ────── COMANDO ────── */
module.exports = async (msg, { conn, text }) => {
  /* prefijo personalizado */
  const subID = (conn.user.id || "").split(":")[0] + "@s.whatsapp.net";
  const pref  = (() => {
    try {
      const pf = JSON.parse(fs.readFileSync("prefixes.json","utf8"));
      return pf[subID] || ".";
    } catch { return "."; }
  })();

  if (!text) {
    return conn.sendMessage(msg.key.remoteJid,
      { text:`✳️ Usa:\n${pref}playpro <término>\nEj: *${pref}playpro* bad bunny diles` },
      { quoted: msg });
  }

  await conn.sendMessage(msg.key.remoteJid,{ react:{ text:"⏳", key:msg.key } });

  /* Búsqueda YT */
  const res   = await yts(text);
  const video = res.videos[0];
  if (!video)
    return conn.sendMessage(msg.key.remoteJid,
      { text:"❌ Sin resultados." }, { quoted:msg });

  const caption =
`╔═══════════════╗
✦ 𝗔𝘇𝘂𝗿𝗮 𝗨𝗹𝘁𝗿𝗮 2.0 ✦
╚═══════════════╝

🎼 *${video.title}*
⏱️ ${video.timestamp}   👤 ${video.author.name}
👁️ ${video.views.toLocaleString()} vistas

👍 = Audio MP3   |   ❤️ = Video MP4`;

  /* mensaje de previsualización */
  const preview = await conn.sendMessage(msg.key.remoteJid,{
    image:{ url: video.thumbnail },
    caption
  },{ quoted:msg });

  /* — guarda contexto — */
  pending[preview.key.id] = {
    chatId    : msg.key.remoteJid,
    video,
    previewMsg: preview,        // mensaje que recibirá la reacción
    done      : { audio:false, video:false }
  };

  await conn.sendMessage(msg.key.remoteJid,{ react:{ text:"✅", key:msg.key } });

  /* Listener (solo se instala una vez) */
  if (!conn._playproListener) {
    conn._playproListener = true;
    conn.ev.on("messages.upsert", async ({ messages }) => {
      for (const m of messages) {
        if (!m.message?.reactionMessage) continue;

        const { key, text:emoji } = m.message.reactionMessage;
        const job = pending[key.id];
        if (!job) continue;

        try {
          if (emoji === "👍" && !job.done.audio) {
            job.done.audio = true;
            await conn.sendMessage(job.chatId,
              { text:"⏳ Descargando audio…", quoted: job.previewMsg });
            await sendAudio(conn, job);
          } else if (emoji === "❤️" && !job.done.video) {
            job.done.video = true;
            await conn.sendMessage(job.chatId,
              { text:"⏳ Descargando vídeo…", quoted: job.previewMsg });
            await sendVideo(conn, job);
          }
          if (job.done.audio && job.done.video) delete pending[key.id];
        } catch (e) {
          await conn.sendMessage(job.chatId,
            { text:`❌ Error: ${e.message}`, quoted: job.previewMsg });
        }
      }
    });
  }
};

/* ─────────── Descarga VIDEO ─────────── */
async function sendVideo(conn,{ chatId, video, previewMsg }) {
  const qList = ["720p","480p","360p"];
  let url=null;
  for (const q of qList) {
    try {
      const api = `https://api.neoxr.eu/api/youtube?url=${encodeURIComponent(video.url)}&type=video&quality=${q}&apikey=russellxz`;
      const r   = await axios.get(api);
      if (r.data?.status && r.data.data?.url){ url = r.data.data.url; break; }
    } catch{}
  }
  if (!url) throw new Error("Fuente de vídeo no disponible");

  const tmp  = path.join(__dirname,"../tmp");
  if (!fs.existsSync(tmp)) fs.mkdirSync(tmp);
  const file = path.join(tmp, Date.now()+"_video.mp4");
  await streamPipe((await axios.get(url,{responseType:"stream"})).data,
                   fs.createWriteStream(file));

  await conn.sendMessage(chatId,{
    video: fs.readFileSync(file),
    mimetype:"video/mp4",
    fileName: video.title+".mp4",
    caption:"🎬 Video listo."
  },{ quoted: previewMsg });
  fs.unlinkSync(file);
}

/* ─────────── Descarga AUDIO ─────────── */
async function sendAudio(conn,{ chatId, video, previewMsg }) {
  const api = `https://api.neoxr.eu/api/youtube?url=${encodeURIComponent(video.url)}&type=audio&quality=128kbps&apikey=russellxz`;
  const r   = await axios.get(api);
  if (!r.data?.status || !r.data.data?.url) throw new Error("Fuente de audio no disponible");

  const tmp   = path.join(__dirname,"../tmp");
  if (!fs.existsSync(tmp)) fs.mkdirSync(tmp);
  const raw   = path.join(tmp, Date.now()+"_raw.m4a");
  const final = path.join(tmp, Date.now()+"_audio.mp3");
  await streamPipe((await axios.get(r.data.data.url,{responseType:"stream"})).data,
                   fs.createWriteStream(raw));

  await new Promise((ok,err)=>{
    ffmpeg(raw).audioCodec("libmp3lame").audioBitrate("128k").format("mp3")
      .save(final).on("end",ok).on("error",err);
  });

  await conn.sendMessage(chatId,{
    audio: fs.readFileSync(final),
    mimetype:"audio/mpeg",
    fileName: video.title+".mp3"
  },{ quoted: previewMsg });

  fs.unlinkSync(raw); fs.unlinkSync(final);
}

/* ───────── Registro ───────── */
module.exports.command = ["playpro"];
