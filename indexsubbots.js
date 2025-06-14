const path = require("path");
const fs = require("fs");
const pino = require("pino");
const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore
} = require("@whiskeysockets/baileys");

// 🔴 Manejo de errores globales para evitar que el proceso se caiga
process.on('uncaughtException', err => {
  console.error('❌ Excepción no atrapada:', err);
});
process.on('unhandledRejection', err => {
  console.error('❌ Promesa rechazada sin manejar:', err);
});

async function cargarSubbots() {
  const subbotFolder = "./subbots";

  if (!fs.existsSync(subbotFolder)) {
    fs.mkdirSync(subbotFolder, { recursive: true });
    console.log("📁 Carpeta ./subbots creada automáticamente.");
  }

  function loadSubPlugins() {
    const plugins = [];
    const pluginDir = path.join(__dirname, "plugins2");
    if (!fs.existsSync(pluginDir)) return plugins;
    const files = fs.readdirSync(pluginDir).filter(f => f.endsWith(".js"));
    for (const file of files) {
      const plugin = require(path.join(pluginDir, file));
      if (plugin && plugin.command) plugins.push(plugin);
    }
    return plugins;
  }

  async function handleSubCommand(sock, msg, command, args) {
    const subPlugins = loadSubPlugins();
    const lowerCommand = command.toLowerCase();
    const text = args.join(" ");
    const plugin = subPlugins.find(p => p.command.includes(lowerCommand));
    if (plugin) {
      return plugin(msg, {
        conn: sock,
        text,
        args,
        command: lowerCommand,
        usedPrefix: ".",
      });
    }
  }

  const subDirs = fs.readdirSync(subbotFolder).filter(d => fs.existsSync(`${subbotFolder}/${d}/creds.json`));
  console.log(`🤖 Cargando ${subDirs.length} subbot(s) conectados...`);

  for (const dir of subDirs) {
    const sessionPath = path.join(subbotFolder, dir);
    let reconnectionTimer = null;

    const iniciarSubbot = async () => {
      try {
        const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
        const { version } = await fetchLatestBaileysVersion();
        const subSock = makeWASocket({
          version,
          logger: pino({ level: "silent" }),
          auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" }))
          },
          browser: ["Cortana Subbot", "Firefox", "2.0"]
        });

        subSock.ev.on("creds.update", saveCreds);

        subSock.ev.on("connection.update", async ({ connection, lastDisconnect }) => {
          if (connection === "open") {
            console.log(`✅ Subbot ${dir} conectado.`);
            if (reconnectionTimer) {
              clearTimeout(reconnectionTimer);
              reconnectionTimer = null;
            }
          } else if (connection === "close") {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            console.log(`❌ Subbot ${dir} desconectado (status: ${statusCode}). Esperando 20 segundos antes de eliminar sesión...`);
            reconnectionTimer = setTimeout(() => {
              if (fs.existsSync(sessionPath)) {
                fs.rmSync(sessionPath, { recursive: true, force: true });
                console.log(`🗑️ Subbot ${dir} eliminado por desconexión prolongada.`);
              }
            }, 20_000);
            setTimeout(() => iniciarSubbot(), 5000);
          }
        });

        subSock.ev.on("messages.upsert", async msg => {
          try {
            const m = msg.messages[0];
            if (!m || !m.message) return;

            const from = m.key.remoteJid;
            const isGroup = from.endsWith("@g.us");
            const isFromSelf = m.key.fromMe;
            const senderJid = m.key.participant || from;
            const senderNum = senderJid.split("@")[0];
            const rawID = subSock.user?.id || "";
            const subbotID = rawID.split(":")[0] + "@s.whatsapp.net";

            const prefixPath = path.join(__dirname, "prefixes.json");
            let dataPrefijos = {};
            if (fs.existsSync(prefixPath)) {
              dataPrefijos = JSON.parse(fs.readFileSync(prefixPath, "utf-8"));
            }

            const messageText =
              m.message?.conversation ||
              m.message?.extendedTextMessage?.text ||
              m.message?.imageMessage?.caption ||
              m.message?.videoMessage?.caption ||
              "";

            const customPrefix = dataPrefijos[subbotID];
            const allowedPrefixes = customPrefix ? [customPrefix] : [".", "#"];
            const usedPrefix = allowedPrefixes.find(p => messageText.startsWith(p));
            if (!usedPrefix) return;

            const body = messageText.slice(usedPrefix.length).trim();
            const command = body.split(" ")[0].toLowerCase();
            const args = body.split(" ").slice(1);

            await handleSubCommand(subSock, m, command, args).catch(err => {
              console.error("❌ Error ejecutando comando del subbot:", err);
            });
          } catch (err) {
            console.error("❌ Error interno en mensajes.upsert:", err);
          }
        });

      } catch (err) {
        console.error(`❌ Error cargando subbot ${dir}:`, err);
      }
    };

    await iniciarSubbot();
  }
}

// Ejecutar automáticamente
cargarSubbots();

// Exportar para index.js
module.exports = { cargarSubbots };
