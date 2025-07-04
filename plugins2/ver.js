// plugins/ver.js
const fs = require("fs");
const path = require("path");

module.exports = async (msg, { conn }) => {
  try {
    // obtener contexto de mensaje citado
    const context = msg.message?.extendedTextMessage?.contextInfo;
    const quotedMsg = context?.quotedMessage;
    if (!context?.stanzaId || !quotedMsg) {
      return conn.sendMessage(
        msg.key.remoteJid,
        { text: "❌ *Error:* Debes responder a una imagen, vídeo o nota de voz para reenviarla." },
        { quoted: msg }
      );
    }

    // desempaquetar viewOnce / ephemeral
    const unwrap = node => {
      while (
        node?.viewOnceMessage?.message ||
        node?.viewOnceMessageV2?.message ||
        node?.viewOnceMessageV2Extension?.message ||
        node?.ephemeralMessage?.message
      ) {
        node =
          node.viewOnceMessage?.message ||
          node.viewOnceMessageV2?.message ||
          node.viewOnceMessageV2Extension?.message ||
          node.ephemeralMessage?.message ||
          node;
      }
      return node;
    };
    const inner = unwrap(quotedMsg);

    // detectar tipo de medio
    let mediaType, mediaNode;
    if (inner.imageMessage) {
      mediaType = "image"; mediaNode = inner.imageMessage;
    } else if (inner.videoMessage) {
      mediaType = "video"; mediaNode = inner.videoMessage;
    } else if (inner.audioMessage || inner.voiceMessage || inner.pttMessage) {
      mediaType = "audio";
      mediaNode = inner.audioMessage || inner.voiceMessage || inner.pttMessage;
    } else {
      return conn.sendMessage(
        msg.key.remoteJid,
        { text: "❌ *Error:* El mensaje citado no contiene un archivo compatible." },
        { quoted: msg }
      );
    }

    // reacción de carga
    await conn.sendMessage(msg.key.remoteJid, {
      react: { text: "⏳", key: msg.key }
    });

    // crear carpeta temporal
    const tmpDir = path.join(__dirname, "../tmp");
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);

    // descargar stream usando el método de conn
    if (typeof conn.downloadContentFromMessage !== "function") {
      throw new Error("El método downloadContentFromMessage no está disponible en 'conn'.");
    }
    const stream = await conn.downloadContentFromMessage(mediaNode, mediaType);
    let buffer = Buffer.alloc(0);
    for await (const chunk of stream) {
      buffer = Buffer.concat([buffer, chunk]);
    }
    if (!buffer.length) {
      return conn.sendMessage(
        msg.key.remoteJid,
        { text: "❌ *Error:* No se pudo descargar el archivo. Intenta de nuevo." },
        { quoted: msg }
      );
    }

    // preparar opciones de envío
    const credit = "> 🔓 Recuperado por:\n`Azura Ultra`";
    const opts = { mimetype: mediaNode.mimetype };
    if (mediaType === "image") {
      opts.image = buffer;
      opts.caption = credit;
    } else if (mediaType === "video") {
      opts.video = buffer;
      opts.caption = credit;
    } else {
      opts.audio = buffer;
      opts.ptt = mediaNode.ptt ?? true;
      if (mediaNode.seconds) opts.seconds = mediaNode.seconds;
    }

    // enviar medio citado al usuario original
    await conn.sendMessage(msg.key.remoteJid, opts, { quoted: msg });

    // si es audio, enviar crédito aparte (evita que se convierta a PTT)
    if (mediaType === "audio") {
      await conn.sendMessage(
        msg.key.remoteJid,
        { text: credit },
        { quoted: msg }
      );
    }

    // confirmación final
    await conn.sendMessage(msg.key.remoteJid, {
      react: { text: "✅", key: msg.key }
    });

  } catch (err) {
    console.error("❌ Error en comando ver:", err);
    await conn.sendMessage(
      msg.key.remoteJid,
      { text: "❌ *Error:* Hubo un problema al procesar el archivo." },
      { quoted: msg }
    );
  }
};

module.exports.command = ["ver"];
