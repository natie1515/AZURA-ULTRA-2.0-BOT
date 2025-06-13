const yts = require('yt-search');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { pipeline } = require('stream');
const { promisify } = require('util');
const ffmpeg = require('fluent-ffmpeg');
const streamPipeline = promisify(pipeline);

const handler = async (msg, { conn, text }) => {
    const formatVideo = ['240', '360', '480', '720'];

    const ddownr = {
        download: async (url, format) => {
            if (!formatVideo.includes(format)) throw new Error('Formato de video no soportado.');

            const config = {
                method: 'GET',
                url: `https://p.oceansaver.in/ajax/download.php?format=${format}&url=${encodeURIComponent(url)}&api=dfcb6d76f2f6a9894gjkege8a4ab232222`,
                headers: { 'User-Agent': 'Mozilla/5.0' }
            };

            const response = await axios.request(config);
            if (response.data && response.data.success) {
                const { id, title, info } = response.data;
                const downloadUrl = await ddownr.cekProgress(id);
                return {
                    title,
                    downloadUrl,
                    thumbnail: info.image,
                    uploader: info.author,
                    duration: info.duration,
                    views: info.views,
                    video_url: info.video_url
                };
            } else {
                throw new Error('No se pudo obtener la información del video.');
            }
        },
        cekProgress: async (id) => {
            const config = {
                method: 'GET',
                url: `https://p.oceansaver.in/ajax/progress.php?id=${id}`,
                headers: { 'User-Agent': 'Mozilla/5.0' }
            };

            while (true) {
                const response = await axios.request(config);
                if (response.data?.success && response.data.progress === 1000) {
                    return response.data.download_url;
                }
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        }
    };

    if (!text) {
        return await conn.sendMessage(msg.key.remoteJid, {
            text: `✳️ Usa el comando correctamente:\n\n📌 Ejemplo: *${global.prefix}play6* La Factoria - Perdoname`
        }, { quoted: msg });
    }

    await conn.sendMessage(msg.key.remoteJid, {
        react: { text: '⏳', key: msg.key }
    });

    try {
        const search = await yts(text);
        if (!search.videos || search.videos.length === 0) throw new Error('No se encontraron resultados.');

        const video = search.videos[0];
        const { title, url, timestamp, views, author, thumbnail } = video;

        // ⛔️ Limitante de 10 minutos
        const durParts = timestamp.split(':').map(Number);
        const minutes = durParts.length === 3 ? durParts[0] * 60 + durParts[1] : durParts[0];
        if (minutes > 10) {
            return await conn.sendMessage(msg.key.remoteJid, {
                text: `⛔ El video dura más de *10 minutos* (duración: ${timestamp}).\nPor favor, intenta con uno más corto, mi rey 😘.`
            }, { quoted: msg });
        }

        let quality = '360';
        if (minutes <= 3) quality = '720';
        else if (minutes <= 5) quality = '480';

        const infoMessage = `
╭───『 *🎬 Información del Video* 』───╮
├ 📌 *Título:* ${title}
├ ⏱️ *Duración:* ${timestamp}
├ 👁️ *Vistas:* ${views.toLocaleString()}
├ 👤 *Autor:* ${author.name}
├ 🔗 *Enlace:* ${url}
╰────────────────────────────╯

🎧 _Opciones de descarga disponibles:_
▸ 🎵 Audio: *${global.prefix}play ${text}*
▸ 🎵 Spotify: *${global.prefix}play3 ${text}*
▸ 🎥 Video: *${global.prefix}play2 ${text}* | *${global.prefix}play6 ${text}*

⏳ *Procesando tu descarga...*
`;

        await conn.sendMessage(msg.key.remoteJid, {
            image: { url: thumbnail },
            caption: infoMessage
        }, { quoted: msg });

        const { downloadUrl } = await ddownr.download(url, quality);

        const tmpDir = path.join(__dirname, '../tmp');
        if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);
        const rawPath = path.join(tmpDir, `${Date.now()}_raw.mp4`);
        const finalPath = path.join(tmpDir, `${Date.now()}_compressed.mp4`);

        const videoRes = await axios.get(downloadUrl, {
            responseType: 'stream',
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });

        await streamPipeline(videoRes.data, fs.createWriteStream(rawPath));

        let crf = 26;
        let bVideo = '600k';
        let bAudio = '128k';
        if (minutes <= 2) {
            crf = 24; bVideo = '800k';
        } else if (minutes > 5) {
            crf = 28; bVideo = '400k'; bAudio = '96k';
        }

        await new Promise((resolve, reject) => {
            ffmpeg(rawPath)
                .videoCodec('libx264')
                .audioCodec('aac')
                .outputOptions([
                    '-preset', 'veryfast',
                    `-crf`, `${crf}`,
                    `-b:v`, bVideo,
                    `-b:a`, bAudio,
                    '-movflags', '+faststart'
                ])
                .on('end', resolve)
                .on('error', reject)
                .save(finalPath);
        });

        const finalText = `✅ *Aquí tienes tu video en calidad ${quality}p.*\n\n🎉 ¡Gracias por usar el bot!`;

        await conn.sendMessage(msg.key.remoteJid, {
            video: fs.readFileSync(finalPath),
            mimetype: 'video/mp4',
            fileName: `${title}.mp4`,
            caption: finalText
        }, { quoted: msg });

        fs.unlinkSync(rawPath);
        fs.unlinkSync(finalPath);

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

handler.command = ['play6', 'ytv'];
handler.tags = ['downloader'];
handler.help = [
    'play6 <búsqueda> - Descarga video de YouTube con calidad automática'
];
module.exports = handler;
