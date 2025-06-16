const path = require("path");
const fs   = require("fs");
const pino = require("pino");
const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
} = require("@whiskeysockets/baileys");

/* ─── Manejo global de errores ─────────────────────────────── */
process.on("uncaughtException",  err => console.error("❌ Excepción no atrapada:", err));
process.on("unhandledRejection", err => console.error("❌ Promesa rechazada sin manejar:", err));

/* ─── Registro de sockets activos para evitar duplicados ───── */
global.subBots = global.subBots || {};

/* ─── Utilidades de plugins ────────────────────────────────── */
function loadSubPlugins() {
  const plugins   = [];
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
  const subPlugins  = loadSubPlugins();          // recarga en caliente
  const lowerCmd    = command.toLowerCase();
  const text        = args.join(" ");
  const plugin      = subPlugins.find(p => p.command.includes(lowerCmd));

  if (plugin) {
    return plugin(msg, {
      conn: sock,
      text,
      args,
      command: lowerCmd,
      usedPrefix: ".",                           // prefijo por defecto
    });
  }
}

/* ─── Arranque de UN sub-bot ───────────────────────────────── */
async function iniciarSubbot(sessionPath) {
  if (global.subBots[sessionPath]) return;       // ya está activo

  const dir = path.basename(sessionPath);        // solo el nombre

  let reconnectionTimer = null;

  try {
    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
    const { version }         = await fetchLatestBaileysVersion();

    const subSock = makeWASocket({
      version,
      logger: pino({ level: "silent" }),
      auth: {
        creds: state.creds,
        keys:  makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" })),
      },
      browser: ["Cortana Subbot", "Firefox", "2.0"],
    });

    global.subBots[sessionPath] = subSock;       // registra socket
    subSock.ev.on("creds.update", saveCreds);

    /* ── Conexión / Reconexión ─────────────────────────────── */
    subSock.ev.on("connection.update", async ({ connection, lastDisconnect }) => {
      if (connection === "open") {
        console.log(`✅ Subbot ${dir} conectado.`);
        if (reconnectionTimer) { clearTimeout(reconnectionTimer); reconnectionTimer = null; }
      }

      if (connection === "close") {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        console.log(`❌ Subbot ${dir} desconectado (status: ${statusCode}). Esperando 20 s para eliminar sesión…`);

        reconnectionTimer = setTimeout(() => {
          if (fs.existsSync(sessionPath)) {
            fs.rmSync(sessionPath, { recursive: true, force: true });
            console.log(`🗑️ Subbot ${dir} eliminado por desconexión prolongada.`);
          }
        }, 20_000);

        /* Limpia registro y re-intenta a los 5 s  */
        delete global.subBots[sessionPath];
        setTimeout(() => iniciarSubbot(sessionPath), 5_000);
      }
    });

    /* ── Núcleo de mensajes ───────────────────────────────── */
    subSock.ev.on("messages.upsert", async msg => {
      try {
        const m = msg.messages[0];
        if (!m || !m.message) return;

        const rawID   = subSock.user?.id || "";
        const subbotID = rawID.split(":")[0] + "@s.whatsapp.net";

        /* Prefijos personalizados */
        const prefixPath = path.join(__dirname, "prefixes.json");
        let dataPrefijos = {};
        if (fs.existsSync(prefixPath)) {
          dataPrefijos = JSON.parse(fs.readFileSync(prefixPath, "utf8"));
        }

        const messageText =
          m.message?.conversation ||
          m.message?.extendedTextMessage?.text ||
          m.message?.imageMessage?.caption ||
          m.message?.videoMessage?.caption ||
          "";

        const customPrefix     = dataPrefijos[subbotID];
        const allowedPrefixes  = customPrefix ? [customPrefix] : [".", "#"];
        const usedPrefix       = allowedPrefixes.find(p => messageText.startsWith(p));
        if (!usedPrefix) return;

        const body     = messageText.slice(usedPrefix.length).trim();
        const command  = body.split(" ")[0].toLowerCase();
        const args     = body.split(" ").slice(1);

        await handleSubCommand(subSock, m, command, args)
          .catch(err => console.error("❌ Error ejecutando comando del subbot:", err));
      } catch (err) {
        console.error("❌ Error interno en messages.upsert:", err);
      }
    });

  } catch (err) {
    console.error(`❌ Error cargando subbot ${dir}:`, err);
  }
}

/* ─── Escaneo inicial de la carpeta ./subbots ─────────────── */
async function cargarSubbots() {
  const subbotFolder = path.resolve(__dirname, "subbots");
  if (!fs.existsSync(subbotFolder)) {
    fs.mkdirSync(subbotFolder, { recursive: true });
    console.log("📁 Carpeta ./subbots creada automáticamente.");
  }

  const subDirs = fs.readdirSync(subbotFolder)
    .filter(d => fs.existsSync(path.join(subbotFolder, d, "creds.json")));

  console.log(`🤖 Cargando ${subDirs.length} subbot(s) conectados…`);

  for (const dir of subDirs) {
    const sessionPath = path.join(subbotFolder, dir);
    await iniciarSubbot(sessionPath);
  }
}

/* ─── Ejecución automática al iniciar el proceso ──────────── */
cargarSubbots();

/* ─── Exportaciones para el bot principal ─────────────────── */
module.exports = { cargarSubbots, iniciarSubbot };
