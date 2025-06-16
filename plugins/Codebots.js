const fs = require('fs');
const path = require('path');
const { Boom } = require('@hapi/boom');
const pino = require('pino');
const QRCode = require('qrcode');
const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  DisconnectReason
} = require('@whiskeysockets/baileys');

const { iniciarSubbot } = require('../indexsubbots');

const MAX_SUBBOTS = 100;

/* Convierte JID → solo dígitos (quita :device, @s.whatsapp.net, etc.) */
const jidToPhone = jid =>
  (jid.includes('@') ? jid.split('@')[0] : jid)
    .split(':')[0]
    .replace(/\D/g, '');

const handler = async (msg, { conn, command }) => {
  const usarPairingCode = ["sercode", "code"].includes(command);
  let sentCodeMessage = false;

  const sleep = ms => new Promise(r => setTimeout(r, ms));

  async function serbot() {
    try {
      const rawJid      = msg.key?.participant || msg.key.remoteJid;
      const sessionDir  = path.join(__dirname, "../subbots");
      const sessionPath = path.join(sessionDir, rawJid);
      const rid         = jidToPhone(rawJid);

      /* ─── Límite de sub-bots ──────────────────────────── */
      if (!fs.existsSync(sessionDir)) fs.mkdirSync(sessionDir, { recursive: true });
      const total = fs.readdirSync(sessionDir)
        .filter(d => fs.existsSync(path.join(sessionDir, d, "creds.json")));
      if (total.length >= MAX_SUBBOTS) {
        await conn.sendMessage(msg.key.remoteJid, {
          text: `🚫 Límite alcanzado: ${total.length}/${MAX_SUBBOTS} sub-bots activos.`
        }, { quoted: msg });
        return;
      }
      await conn.sendMessage(msg.key.remoteJid, {
        text: `ℹ️ Espacios libres: ${MAX_SUBBOTS - total.length}`,
        quoted: msg
      });

      await conn.sendMessage(msg.key.remoteJid, { react: { text: '⌛', key: msg.key } });

      /* ─── Socket temporal para generar QR / código ─────── */
      const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
      const { version }          = await fetchLatestBaileysVersion();
      const logger               = pino({ level: "silent" });

      const socky = makeWASocket({
        version,
        logger,
        auth: {
          creds: state.creds,
          keys: makeCacheableSignalKeyStore(state.keys, logger)
        },
        printQRInTerminal: !usarPairingCode,
        browser: ['Windows', 'Chrome']
      });

      let reconnectionAttempts = 0;
      const maxReconnectionAttempts = 3;

      socky.ev.on("connection.update", async ({ qr, connection, lastDisconnect }) => {
        if (qr && !sentCodeMessage) {
          if (usarPairingCode) {
            const code = await socky.requestPairingCode(rid);
            await conn.sendMessage(msg.key.remoteJid, {
              video: { url: "https://cdn.russellxz.click/b0cbbbd3.mp4" },
              caption: "🔐 *Código generado:*\nAbre WhatsApp > Vincular dispositivo y pega el siguiente código:",
              gifPlayback: true
            }, { quoted: msg });
            await sleep(1000);
            await conn.sendMessage(msg.key.remoteJid, { text: "```" + code + "```" }, { quoted: msg });
          } else {
            const qrImage = await QRCode.toBuffer(qr);
            await conn.sendMessage(msg.key.remoteJid, {
              image: qrImage,
              caption: `📲 Escanea este código QR desde *WhatsApp > Vincular dispositivo*.`
            }, { quoted: msg });
          }
          sentCodeMessage = true;
        }

        switch (connection) {
          case "open":
            /* Bienvenida */
            await conn.sendMessage(msg.key.remoteJid, {
              text: `╭───〔 *🤖 SUBBOT CONECTADO* 〕───╮
│
│ ✅ *Bienvenido a Azura Ultra 2.0*
│ Usa ${global.prefix}help o ${global.prefix}menu
│ para ver comandos.
│
╰────✦ *Sky Ultra Plus* ✦────╯`
            }, { quoted: msg });

            /* 1️⃣ Arranca el socket definitivo */
            try { await iniciarSubbot(sessionPath); } catch (e) { console.error(e); }

            /* 2️⃣ Cierra el socket temporal para evitar conflictos */
            try { socky.end(); } catch {}

            break;

          case "close": {
            const reason = new Boom(lastDisconnect?.error)?.output.statusCode ||
                           lastDisconnect?.error?.output?.statusCode;

            /* Ignore connectionReplaced (ya se lanzó el socket definitivo) */
            if (reason === DisconnectReason.connectionReplaced) return;

            const msgErr = DisconnectReason[reason] || `Código desconocido: ${reason}`;

            const eliminarSesion = () => {
              if (fs.existsSync(sessionPath)) fs.rmSync(sessionPath, { recursive: true, force: true });
            };

            switch (reason) {
              case 401:
              case DisconnectReason.badSession:
              case DisconnectReason.loggedOut:
                await conn.sendMessage(msg.key.remoteJid, {
                  text: `⚠️ Sesión eliminada.\n${msgErr}\nReintenta con ${global.prefix}serbot`
                }, { quoted: msg });
                eliminarSesion();
                break;

              case DisconnectReason.restartRequired:
                if (reconnectionAttempts++ < maxReconnectionAttempts) {
                  await sleep(3000);
                  return serbot();
                }
                await conn.sendMessage(msg.key.remoteJid, { text: `⚠️ Reintentos fallidos.` }, { quoted: msg });
                break;

              default:
                await conn.sendMessage(msg.key.remoteJid, {
                  text: `⚠️ Problema de conexión: ${msgErr}\nIntentando reconectar…`
                }, { quoted: msg });
                break;
            }
            break;
          }
        }
      });

      socky.ev.on("creds.update", saveCreds);

    } catch (e) {
      console.error("❌ Error en serbot:", e);
      await conn.sendMessage(msg.key.remoteJid, { text: `❌ Error: ${e.message}` }, { quoted: msg });
    }
  }

  await serbot();
};

handler.command = ["sercode", "code", "jadibot", "serbot", "qr"];
handler.tags    = ["owner"];
handler.help    = ["serbot", "code"];
module.exports  = handler;
