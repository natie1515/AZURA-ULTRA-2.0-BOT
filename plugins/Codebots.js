/*  serbot.js  – versión con correcciones 2025-06-17
   · crea la carpeta de sesión antes de leer credenciales
   · rid limpio (sin :device / símbolos)
   · inicia el sub-bot definitivo tras el primer creds.update
   · cierra el socket temporal para evitar connectionReplaced
*/

const fs   = require("fs");
const path = require("path");
const { Boom } = require("@hapi/boom");
const pino  = require("pino");
const QRCode = require("qrcode");
const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  DisconnectReason
} = require("@whiskeysockets/baileys");

/* función que levanta el sub-bot definitivo */
const { iniciarSubbot } = require("../indexsubbots");

const MAX_SUBBOTS = 100;

const handler = async (msg, { conn, command }) => {
  const usarPairingCode = ["sercode", "code"].includes(command);
  let   sentCodeMessage = false;

  const sleep = ms => new Promise(r => setTimeout(r, ms));

  async function serbot() {
    try {
      const number      = msg.key?.participant || msg.key.remoteJid;
      const sessionDir  = path.join(__dirname, "../subbots");
      const sessionPath = path.join(sessionDir, number);

      /* crea carpeta ./subbots y subcarpeta del usuario */
      if (!fs.existsSync(sessionDir))  fs.mkdirSync(sessionDir, { recursive:true });
      if (!fs.existsSync(sessionPath)) fs.mkdirSync(sessionPath,{ recursive:true });

      /* número limpio para requestPairingCode */
      const rid = (number.includes("@") ? number.split("@")[0] : number)
                  .split(":")[0]
                  .replace(/\D/g, "");

      /* ── límite de 100 sub-bots ───────────────────── */
      const totalSubs = fs.readdirSync(sessionDir)
        .filter(d => fs.existsSync(path.join(sessionDir,d,"creds.json")));
      if (totalSubs.length >= MAX_SUBBOTS) {
        await conn.sendMessage(msg.key.remoteJid, {
          text:`🚫 Límite alcanzado: ${totalSubs.length}/${MAX_SUBBOTS} sesiones activas.`
        }, { quoted:msg });
        return;
      }
      await conn.sendMessage(msg.key.remoteJid,{
        text:`ℹ️ Quedan ${MAX_SUBBOTS-totalSubs.length} espacios disponibles.`
      },{quoted:msg});

      await conn.sendMessage(msg.key.remoteJid,{ react:{text:"⌛",key:msg.key} });

      /* ── socket temporal para QR / código ─────────── */
      const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
      const { version }          = await fetchLatestBaileysVersion();
      const logger               = pino({ level:"silent" });

      const socky = makeWASocket({
        version,
        logger,
        auth:{
          creds: state.creds,
          keys : makeCacheableSignalKeyStore(state.keys, logger)
        },
        printQRInTerminal: !usarPairingCode,
        browser: ["Windows", "Chrome"]
      });

      /* primer creds.update ⇒ crea sub-bot definitivo y cierra temporal */
      let firstSave = true;
      socky.ev.on("creds.update", async () => {
        await saveCreds();
        if (firstSave){
          firstSave = false;
          try { await iniciarSubbot(sessionPath); } catch(e){ console.error(e); }
          try { socky.end(); } catch {}
        }
      });

      /* conexión / QR */
      socky.ev.on("connection.update", async ({ qr, connection, lastDisconnect }) => {
        if (qr && !sentCodeMessage) {
          if (usarPairingCode) {
            const code = await socky.requestPairingCode(rid);
            await conn.sendMessage(msg.key.remoteJid,{
              video:{url:"https://cdn.russellxz.click/b0cbbbd3.mp4"},
              caption:"🔐 *Código generado:*\nAbre WhatsApp > Vincular dispositivo y pega el siguiente código:",
              gifPlayback:true
            },{quoted:msg});
            await sleep(1000);
            await conn.sendMessage(msg.key.remoteJid,{ text:"```"+code+"```"},{quoted:msg});
          } else {
            const qrBuf = await QRCode.toBuffer(qr);
            await conn.sendMessage(msg.key.remoteJid,{
              image:qrBuf,
              caption:"📲 Escanea el QR desde *WhatsApp > Vincular dispositivo*."
            },{quoted:msg});
          }
          sentCodeMessage = true;
        }

        if (connection === "open") {
          await conn.sendMessage(msg.key.remoteJid,{
            text:`✅ Sub-bot conectado.\nUsa ${global.prefix}help para ver comandos.`
          },{quoted:msg});
          await conn.sendMessage(msg.key.remoteJid,{ react:{text:"🔁",key:msg.key}});
        }

        if (connection === "close") {
          const code = new Boom(lastDisconnect?.error)?.output.statusCode ||
                       lastDisconnect?.error?.output?.statusCode;
          if (code === DisconnectReason.connectionReplaced) return; // normal
          if ([401,DisconnectReason.badSession,DisconnectReason.loggedOut].includes(code)){
            if (fs.existsSync(sessionPath)) fs.rmSync(sessionPath,{recursive:true,force:true});
          }
        }
      });

    } catch (e) {
      console.error("❌ Error en serbot:", e);
      await conn.sendMessage(msg.key.remoteJid,
        { text:`❌ Error: ${e.message}` }, { quoted:msg });
    }
  }

  await serbot();
};

handler.command = ["sercode","code","jadibot","serbot","qr"];
handler.tags    = ["owner"];
handler.help    = ["serbot","code"];

module.exports  = handler;
