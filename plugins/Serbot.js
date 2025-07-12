const path = require("path");
const fs = require("fs");
const pino = require("pino");
const QRCode = require("qrcode");
const { Boom } = require("@hapi/boom");
const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  DisconnectReason,
} = require("@whiskeysockets/baileys");
const { SubBotManager } = require("../indexsubbots");

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const handler = async (msg, { conn, command }) => {
  const usePairingCode = ["sercode", "code"].includes(command);
  const sessionId = msg.key?.participant || msg.key.remoteJid;

  if (!sessionId) {
    return conn.sendMessage(
      msg.key.remoteJid,
      { text: "❌ No se pudo determinar tu número de sesión." },
      { quoted: msg },
    );
  }

  const sessionPath = path.join(__dirname, "../subbots", sessionId);

  if (SubBotManager.getSubBot(sessionPath)) {
    return conn.sendMessage(
      msg.key.remoteJid,
      {
        text: "ℹ️ Ya tienes una sesión de subbot activa.\nUsa `.delbots` para borrarla antes de crear una nueva.",
      },
      { quoted: msg },
    );
  }

  const subbotDirs = fs.existsSync(SubBotManager.sessionBaseDir)
    ? fs
        .readdirSync(SubBotManager.sessionBaseDir)
        .filter((d) => fs.existsSync(path.join(SubBotManager.sessionBaseDir, d, "creds.json")))
    : [];

  if (subbotDirs.length >= SubBotManager.MAX_SUBBOTS) {
    return conn.sendMessage(
      msg.key.remoteJid,
      {
        text: `🚫 *Límite alcanzado:* existen ${subbotDirs.length}/${SubBotManager.MAX_SUBBOTS} sesiones activas.`,
      },
      { quoted: msg },
    );
  }

  await conn.sendMessage(msg.key.remoteJid, {
    text: `⏳ Iniciando el proceso de conexión...\nQuedan *${
      SubBotManager.MAX_SUBBOTS - subbotDirs.length
    }* espacios disponibles.`,
    quoted: msg,
  });

  try {
    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
    const { version } = await fetchLatestBaileysVersion();
    const logger = pino({ level: "silent" });

    const tempSock = makeWASocket({
      version,
      logger,
      auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, logger) },
      printQRInTerminal: !usePairingCode,
      browser: ["Azura-Auth", "Chrome", "1.0"],
    });

    tempSock.ev.on("creds.update", saveCreds);

    tempSock.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect, qr } = update;

      const rid = sessionId.split("@")[0];

      if (qr && !usePairingCode) {
        const qrImage = await QRCode.toBuffer(qr);
        await conn.sendMessage(
          msg.key.remoteJid,
          {
            image: qrImage,
            caption: "📲 Escanea este QR para conectar tu sub-bot. Expira en 45 segundos.",
          },
          { quoted: msg },
        );
      }

      if (usePairingCode && !tempSock.authState.creds.registered) {
        try {
          await sleep(1500);
          const code = await tempSock.requestPairingCode(rid);
          await conn.sendMessage(
            msg.key.remoteJid,
            { text: `🔐 Tu código de vinculación es: \n\n\`\`\`${code}\`\`\`` },
            { quoted: msg },
          );
        } catch (e) {
          console.error("Error solicitando código de pareo:", e);
          await conn.sendMessage(
            msg.key.remoteJid,
            { text: "❌ Error al generar el código. Intenta de nuevo." },
            { quoted: msg },
          );
          tempSock.end();
        }
      }

      if (connection === "open") {
        await conn.sendMessage(
          msg.key.remoteJid,
          {
            text: "✅ ¡Autenticación exitosa!\n\nCerrando conexión temporal y transfiriendo al gestor principal...",
          },
          { quoted: msg },
        );

        await tempSock.end();

        SubBotManager.createSubBot(sessionId);

        await conn.sendMessage(msg.key.remoteJid, { react: { text: "✅", key: msg.key } });
      }

      if (connection === "close") {
        const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
        if (reason !== DisconnectReason.loggedOut && !SubBotManager.getSubBot(sessionPath)) {
          await conn.sendMessage(
            msg.key.remoteJid,
            { text: `⚠️ Conexión fallida (Razón: ${reason}). Por favor, intenta de nuevo.` },
            { quoted: msg },
          );
          if (fs.existsSync(sessionPath)) {
            fs.rmSync(sessionPath, { recursive: true, force: true });
          }
        }
      }
    });
  } catch (e) {
    console.error("Error en el proceso de serbot:", e);
    await conn.sendMessage(
      msg.key.remoteJid,
      { text: `❌ *Error inesperado:* ${e.message}` },
      { quoted: msg },
    );
    if (fs.existsSync(sessionPath)) {
      fs.rmSync(sessionPath, { recursive: true, force: true });
    }
  }
};

handler.command = ["sercode", "code", "jadibot", "serbot", "qr"];
handler.tags = ["owner"];
handler.help = ["serbot", "code"];

module.exports = handler;
