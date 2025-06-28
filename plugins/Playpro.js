/*  plugins2/playpro.js  —  descarga audio (👍) o vídeo (❤️) con reacción  */

const axios  = require("axios");
const yts    = require("yt-search");
const fs     = require("fs");
const path   = require("path");
const ffmpeg = require("fluent-ffmpeg");
const { promisify } = require("util");
const { pipeline }  = require("stream");
const streamPipe    = promisify(pipeline);

const pending = {};   // { msgID : { chatId, video } }

/* ────────────────  COMANDO  ─────────────────────────── */
module.exports = async (msg, { conn, text }) => {
  /* prefijo personalizado */
  const subID = (conn.user?.id || "").split(":")[0] + "@s.whatsapp.net";
  const pref  = (() => {
    try {
      const pf = JSON.parse(fs.readFileSync("prefixes.json", "utf8"));
      return pf[subID] || ".";
    } catch { return "."; }
  })();

  if (!text) {
    return conn.sendMessage(msg.key.remoteJid,
      { text:`✳️ Usa:\n${pref}playpro <término>\nEj: *${pref}playpro* bad bunny diles` },
      { quoted: msg });
  }

  await conn.sendMessage(msg.key.remoteJid, { react:{ text:"⏳", key:msg.key } });

  /* búsqueda en YouTube */
  const list = await yts(text);
  const video = list.videos[0];
  if (!video) return conn.sendMessage(msg.key.remoteJid,
      { text:"❌ Sin resultados." }, { quoted:msg });

  const caption =
`╔═══════════════╗
✦ 𝗔𝘇𝘂𝗿𝗮 𝗨𝗹𝘁𝗿𝗮 2.0 𝗦𝘂𝗯𝗯𝗼𝘁 ✦
╚═══════════════╝

🎼 *${video.title}*
⏱️ ${video.timestamp}   👤 ${video.author.name}
👁️ ${video.views.toLocaleString()} vistas

👍 = Audio MP3   |   ❤️ = Video MP4`;

  const preview = await conn.sendMessage(msg.key.remoteJid,{
    image:{ url: video.thumbnail },
    caption
  },{ quoted:msg });

  /* guarda petición a la espera de reacción */
  pending[preview.key.id] = { chatId: msg.key.remoteJid, video };
  await conn.sendMessage(msg.key.remoteJid,{ react:{ text:"✅", key:msg.key } });
};

/* ───────────  LISTENER GLOBAL DE REACCIONES  ────────── */
module.exports.init = conn => {
  conn.ev.on("messages.reaction", async reactions => {
    for (const r of reactions) {
      const job = pending[r.key.id];
      if (!job) continue;               // reacción a otro mensaje
      delete pending[r.key.id];         // evita descargas duplicadas

      try {
        if (r.text === "👍")      await sendAudio(conn, job);
        else if (r.text === "❤️") await sendVideo(conn, job);
      } catch (e) {
        await conn.sendMessage(job.chatId,
          { text:`❌ Error: ${e.message}` });
      }
    }
  });
};

/* ───────────  DESCARGA DE VÍDEO  ─────────── */
async function sendVideo(conn,{ chatId, video }) {
  const qualities = ["720p","480p","360p"];
  let url = null;
  for (const q of qualities) {
    try {
      const api = `https://api.neoxr.eu/api/youtube?url=${encodeURIComponent(video.url)}&type=video&quality=${q}&apikey=russellxz`;
      const r   = await axios.get(api);
      if (r.data?.status && r.data.data?.url) { url = r.data.data.url; break; }
    } catch {}
  }
  if (!url) throw new Error("No se pudo obtener el video");

  const tmp  = path.join(__dirname,"../tmp");
  if (!fs.existsSync(tmp)) fs.mkdirSync(tmp);
  const file = path.join(tmp, Date.now()+"_video.mp4");
  await streamPipe((await axios.get(url,{ responseType:"stream" })).data,
                   fs.createWriteStream(file));

  await conn.sendMessage(chatId,{
    video: fs.readFileSync(file),
    mimetype:"video/mp4",
    fileName: video.title+".mp4",
    caption: "🎬 Video listo."
  });
  fs.unlinkSync(file);
}

/* ───────────  DESCARGA DE AUDIO  ─────────── */
async function sendAudio(conn,{ chatId, video }) {
  const api = `https://api.neoxr.eu/api/youtube?url=${encodeURIComponent(video.url)}&type=audio&quality=128kbps&apikey=russellxz`;
  const r   = await axios.get(api);
  if (!r.data?.status || !r.data.data?.url) throw new Error("No se pudo obtener el audio");

  const tmp   = path.join(__dirname,"../tmp");
  if (!fs.existsSync(tmp)) fs.mkdirSync(tmp);
  const raw   = path.join(tmp, Date.now()+"_raw.m4a");
  const final = path.join(tmp, Date.now()+"_final.mp3");
  await streamPipe((await axios.get(r.data.data.url,{ responseType:"stream" })).data,
                   fs.createWriteStream(raw));

  await new Promise((ok,err)=>{
    ffmpeg(raw).audioCodec("libmp3lame").audioBitrate("128k").format("mp3")
      .save(final).on("end",ok).on("error",err);
  });

  await conn.sendMessage(chatId,{
    audio: fs.readFileSync(final),
    mimetype:"audio/mpeg",
    fileName: video.title+".mp3"
  });
  fs.unlinkSync(raw); fs.unlinkSync(final);
}

/* ───────────────  REGISTRO  ─────────────── */
module.exports.command = ["playpro"];
