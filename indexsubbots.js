const path  = require("path");
const fs    = require("fs");
const pino  = require("pino");
const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  DisconnectReason        // ← NUEVO
} = require("@whiskeysockets/baileys");
const { Boom } = require("@hapi/boom");         // ← NUEVO

/* ─── Manejo global de errores ─────────────────────────────── */
process.on("uncaughtException",  err => console.error("❌ Excepción no atrapada:", err));
process.on("unhandledRejection", err => console.error("❌ Promesa rechazada sin manejar:", err));

/* ─── Registro de sockets activos ──────────────────────────── */
global.subBots = global.subBots || {};

/* ─── Helpers de plugins ──────────────────────────────────── */
function loadSubPlugins() {
  const plugins   = [];
  const pluginDir = path.join(__dirname, "plugins2");
  if (!fs.existsSync(pluginDir)) return plugins;

  const files = fs.readdirSync(pluginDir).filter(f => f.endsWith(".js"));
  for (const file of files) {
    delete require.cache[path.join(pluginDir, file)];     // hot-reload
    const plugin = require(path.join(pluginDir, file));
    if (plugin && plugin.command) plugins.push(plugin);
  }
  return plugins;
}

async function handleSubCommand(sock, msg, command, args) {
  const subPlugins = loadSubPlugins();
  const plugin     = subPlugins.find(p => p.command.includes(command.toLowerCase()));
  if (plugin) {
    return plugin(msg, {
      conn: sock,
      text: args.join(" "),
      args,
      command,
      usedPrefix: ".",
    });
  }
}

/* ─── Arranque de UN sub-bot ───────────────────────────────── */
async function iniciarSubbot(sessionPath) {
  if (global.subBots[sessionPath]) return;       // ya activo

  const dir = path.basename(sessionPath);
  let reconTimer = null;

  try {
    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
    const { version }          = await fetchLatestBaileysVersion();

    const subSock = makeWASocket({
      version,
      logger: pino({ level: "silent" }),
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" })),
      },
      browser: ["Cortana Subbot", "Firefox", "2.0"],
    });

    global.subBots[sessionPath] = subSock;
    subSock.ev.on("creds.update", saveCreds);

    /* ── Conexión / Reconexión – Lógica ajustada ─────────── */
    subSock.ev.on("connection.update", ({ connection, lastDisconnect }) => {
      if (connection === "open") {
        console.log(`✅ Subbot ${dir} conectado.`);
        if (reconTimer) { clearTimeout(reconTimer); reconTimer = null; }
        return;
      }

      if (connection === "close") {
        /* Código de cierre */
        const reasonCode = new Boom(lastDisconnect?.error)?.output.statusCode ||
                           lastDisconnect?.error?.output?.statusCode;
        const readable   = DisconnectReason[reasonCode] || `Desconocido (${reasonCode})`;
        console.log(`⚠️  ${dir} desconectado ⇒ ${readable}`);

        /* Borrar SOLO si es cierre definitivo */
        const cierreDefinitivo = [
          DisconnectReason.loggedOut,
          DisconnectReason.badSession,
          401
        ].includes(reasonCode);

        if (cierreDefinitivo) {
          console.log(`🗑️  Eliminando sesión de ${dir} (cierre definitivo).`);
          if (fs.existsSync(sessionPath)) fs.rmSync(sessionPath, { recursive: true, force: true });
          delete global.subBots[sessionPath];
          return;
        }

        /* Caso contrario: reconectar sin borrar credenciales */
        if (!reconTimer) {
          reconTimer = setTimeout(() => {
            console.log(`🔄 Reintentando conexión de ${dir}…`);
            delete global.subBots[sessionPath];
            iniciarSubbot(sessionPath);
          }, 5_000);
        }
      }
    });

    /* ── Mensajes ────────────────────────────────────────── */
    subSock.ev.on("messages.upsert", async payload => {
      try {
        const m = payload.messages[0];
        if (!m || !m.message) return;

        const rawID     = subSock.user?.id || "";
        const subbotID  = rawID.split(":")[0] + "@s.whatsapp.net";
        const txt =
          m.message?.conversation ||
          m.message?.extendedTextMessage?.text ||
          m.message?.imageMessage?.caption ||
          m.message?.videoMessage?.caption ||
          "";

        /* Prefijos */
        let prefijos = {};
        const pf = path.join(__dirname, "prefixes.json");
        if (fs.existsSync(pf)) prefijos = JSON.parse(fs.readFileSync(pf, "utf8"));

        const allowed = prefijos[subbotID] ? [prefijos[subbotID]] : [".", "#"];
        const used    = allowed.find(p => txt.startsWith(p));
        if (!used) return;

        const body     = txt.slice(used.length).trim();
        const [cmd, ...args] = body.split(/\s+/);

        await handleSubCommand(subSock, m, cmd, args)
          .catch(err => console.error("❌ Error en plugin:", err));
      } catch (err) {
        console.error("❌ Error interno en messages.upsert:", err);
      }
    });

  } catch (err) {
    console.error(`❌ Error iniciando ${dir}:`, err);
  }
}

/* ─── Carga inicial ───────────────────────────────────────── */
async function cargarSubbots() {
  const base = path.resolve(__dirname, "subbots");
  if (!fs.existsSync(base)) fs.mkdirSync(base, { recursive: true });

  const dirs = fs.readdirSync(base).filter(d =>
    fs.existsSync(path.join(base, d, "creds.json"))
  );
  console.log(`🤖 Inicializando ${dirs.length} sub-bot(s)…`);
  for (const d of dirs) await iniciarSubbot(path.join(base, d));
}

cargarSubbots();

/* ─── Exportaciones ───────────────────────────────────────── */
module.exports = { cargarSubbots, iniciarSubbot };
