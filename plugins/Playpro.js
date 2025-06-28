/*  plugins2/playpro.js  —  audio / vídeo con reacción 👍 / ❤️  */

const axios  = require("axios");
const yts    = require("yt-search");
const fs     = require("fs");
const path   = require("path");
const ffmpeg = require("fluent-ffmpeg");
const { promisify } = require("util");
const { pipeline }  = require("stream");
const streamPipe    = promisify(pipeline);

const pending = {};   // { msgID : { chatId, query, info } }

module.exports = async (msg, { conn, text }) => {
  /* ── prefijo personalizado ── */
  const rawID = conn.user?.id || "";
  const subID = rawID.split(":")[0] + "@s.whatsapp.net";
  const pref  = (() => {
    try {
      const pf = JSON.parse(fs.readFileSync("prefixes.json","utf8"));
      return pf[subID] || ".";
    } catch { return "."; }
  })();

  if (!text) {
    return conn.sendMessage(msg.key.remoteJid,{
      text:`✳️ Usa el comando correctamente:\n\nEjemplo: *${pref}playpro* bad bunny diles`
    },{quoted:msg});
  }

  await conn.sendMessage(msg.key.remoteJid,{ react:{text:"⏳",key:msg.key} });

  /* ── búsqueda YouTube ── */
  let video;
  try {
    const res = await yts(text);
    video = res.videos[0];
  } catch(e){}

  if (!video) {
    return conn.sendMessage(msg.key.remoteJid,
      { text:"❌ No se encontró resultado." }, { quoted:msg });
  }

  const caption = `
╔═══════════════╗
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

  /* guarda en memoria para la reacción */
  pending[preview.key.id] = {
    chatId : msg.key.remoteJid,
    query  : text,
    info   : video
  };

  await conn.sendMessage(msg.key.remoteJid,{ react:{text:"✅",key:msg.key} });
};

/* ───────────────── evento de reacciones ───────────────── */
module.exports.init = conn => {
  conn.ev.on("messages.reaction", async ev => {
    const { key, text } = ev[0].reaction;
    const job = pending[key.id];
    if (!job) return;                       // reacción a otro mensaje
    delete pending[key.id];                 // solo una vez

    try {
      if (text === "👍") {          /* -------- AUDIO -------- */
        await sendAudio(conn, job);
      } else if (text === "❤️") {   /* -------- VIDEO -------- */
        await sendVideo(conn, job);
      }
    } catch(err){
      await conn.sendMessage(job.chatId,
        { text:`❌ Error: ${err.message}` });
    }
  });
};

/* ===== helpers ======================================================== */
async function sendVideo(conn, { chatId, info }) {
  /* intenta 720/480/360 */
  const qualities = ["720p","480p","360p"];
  let url = null, title = info.title;
  for (const q of qualities) {
    try {
      const api = `https://api.neoxr.eu/api/youtube?url=${encodeURIComponent(info.url)}&type=video&quality=${q}&apikey=russellxz`;
      const r = await axios.get(api);
      if (r.data?.status && r.data.data?.url) { url = r.data.data.url; break; }
    } catch { }
  }
  if (!url) throw new Error("No se pudo obtener el video");

  const tmp = path.join(__dirname,"../tmp");
  if (!fs.existsSync(tmp)) fs.mkdirSync(tmp);
  const file = path.join(tmp,Date.now()+"_vid.mp4");
  await streamPipe((await axios.get(url,{responseType:"stream"})).data,
                   fs.createWriteStream(file));

  await conn.sendMessage(chatId,{
    video: fs.readFileSync(file),
    mimetype:"video/mp4",
    fileName: title+".mp4",
    caption:"🎬 Video solicitado."
  });
  fs.unlinkSync(file);
}

async function sendAudio(conn,{ chatId, info }) {
  const api = `https://api.neoxr.eu/api/youtube?url=${encodeURIComponent(info.url)}&type=audio&quality=128kbps&apikey=russellxz`;
  const r   = await axios.get(api);
  if (!r.data?.status || !r.data.data?.url) throw new Error("No se pudo obtener el audio");

  const tmp = path.join(__dirname,"../tmp");
  if (!fs.existsSync(tmp)) fs.mkdirSync(tmp);
  const raw  = path.join(tmp,Date.now()+"_raw.m4a");
  const mp3  = path.join(tmp,Date.now()+"_final.mp3");
  await streamPipe((await axios.get(r.data.data.url,{responseType:"stream"})).data,
                   fs.createWriteStream(raw));

  await new Promise((ok,err)=>{
    ffmpeg(raw).audioCodec("libmp3lame").audioBitrate("128k").format("mp3")
      .save(mp3).on("end",ok).on("error",err);
  });

  await conn.sendMessage(chatId,{
    audio: fs.readFileSync(mp3),
    mimetype:"audio/mpeg",
    fileName: info.title+".mp3"
  });
  fs.unlinkSync(raw); fs.unlinkSync(mp3);
}

/* ============== registro del comando ============== */
module.exports.command = ["playpro"];
