const path = require("path");
const fs = require("fs");
const pino = require("pino");
const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  DisconnectReason,
  downloadContentFromMessage,
} = require("@whiskeysockets/baileys");
const { Boom } = require("@hapi/boom");

function loadSubPlugins() {
  const out = [];
  const dir = path.join(__dirname, "plugins2");
  if (!fs.existsSync(dir)) {
    return out;
  }
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".js"))) {
    try {
      const plugin = require(path.join(dir, file));
      if (plugin?.command) {
        out.push(plugin);
      }
    } catch (e) {
      console.error(`Error cargando plugin ${file}:`, e);
    }
  }
  return out;
}

async function handleSubCommand(sock, msg, command, args) {
  const plugins = loadSubPlugins();
  const plugin = plugins.find(
    (p) => Array.isArray(p.command) && p.command.includes(command.toLowerCase()),
  );
  if (plugin) {
    msg.usedPrefix = msg.usedPrefix || ".";
    return plugin(msg, { conn: sock, text: args.join(" "), args, command });
  }
}

class SubBot {
  constructor(sessionPath) {
    this.sessionPath = sessionPath;
    this.id = path.basename(sessionPath);
    this.socket = null;
    this.status = "pending";
    this.retries = 0;
    this.logger = pino({ level: "silent" });
  }

  async connect() {
    this.status = "connecting";
    try {
      const { state, saveCreds } = await useMultiFileAuthState(this.sessionPath);
      const { version } = await fetchLatestBaileysVersion();
      this.socket = makeWASocket({
        version,
        logger: this.logger,
        auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, this.logger) },
        printQRInTerminal: false,
        browser: ["Azura-Subbot", "Chrome", "2.0"],
        syncFullHistory: false,
      });
      this.socket.ev.on("creds.update", saveCreds);
      this.attachEvents();
    } catch (e) {
      console.error(`[SubBot ${this.id}] Fallo al iniciar la conexión:`, e);
      this.cleanup();
      SubBotManager.removeSubBot(this.sessionPath, true); // Eliminar si falla al conectar
    }
  }

  attachEvents() {
    this.socket.ev.on("connection.update", this.handleConnectionUpdate.bind(this));
    this.socket.ev.on("messages.upsert", this.handleMessageUpsert.bind(this));
    this.socket.ev.on("group-participants.update", this.handleGroupParticipantsUpdate.bind(this));
  }

  async handleConnectionUpdate(update) {
    const { connection, lastDisconnect } = update;

    if (connection === "open") {
      this.status = "open";
      this.retries = 0;
      console.log(`✔️ Subbot ${this.id.split("@")[0]} online.`);

      const ownerJid = `${this.socket.user.id.split(":")[0]}@s.whatsapp.net`;
      try {
        await this.socket.sendMessage(ownerJid, {
          text: "✨ ¡Hola! Bienvenido al sistema de SubBots Premium de Azura Ultra 2.0 ✨\n\n✅ Estado: tu SubBot ya está *en línea y conectado*.\nA continuación, algunas cosas importantes que debes saber para comenzar:\n\n📌 *IMPORTANTE*:\n🧠 Por defecto, el bot **solo se responde a sí mismo** en el chat privado.\nSi deseas que funcione en grupos, haz lo siguiente:\n\n🔹 Ve al grupo donde lo quieras usar.\n🔹 Escribe el comando: \`.addgrupo\`\n🔹 ¡Listo! Ahora el bot responderá a todos los miembros de ese grupo.\n\n👤 ¿Quieres que el bot también le responda a otras personas en privado?\n\n🔸 Usa el comando: \`.addlista número\`\n  Ejemplo: \`.addlista 5491123456789\`\n🔸 O responde (cita) un mensaje de la persona y escribe: \`.addlista\`\n🔸 Esto autorizará al bot a responderle directamente en su chat privado.\n\n🔧 ¿Deseas personalizar el símbolo o letra para activar los comandos?\n\n🔸 Usa: \`.setprefix\` seguido del nuevo prefijo que quieras usar.\n  Ejemplo: \`.setprefix ✨\`\n🔸 Una vez cambiado, deberás usar ese prefijo para todos los comandos.\n  (Por ejemplo, si pusiste \`✨\`, ahora escribirías \`✨menu\` en lugar de \`.menu\`)\n\n📖 Para ver la lista completa de comandos disponibles, simplemente escribe:\n\`.menu\` o \`.help\`\n\n🚀 ¡Disfruta del poder de Azura Ultra 2.0 y automatiza tu experiencia como nunca antes!",
        });
      } catch (e) {
        console.error(
          `[SubBot ${this.id}] No se pudo enviar el mensaje de bienvenida a sí mismo:`,
          e,
        );
      }
    }

    if (connection === "close") {
      const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
      this.status = "closed";
      this.cleanup();

      const fatalCodes = [
        DisconnectReason.badSession,
        DisconnectReason.loggedOut,
        DisconnectReason.forbidden,
      ];

      if (fatalCodes.includes(reason)) {
        console.log(
          `[SubBot ${this.id}] Desconectado por razón fatal (${reason}). Eliminando sesión.`,
        );
        SubBotManager.removeSubBot(this.sessionPath, true);
      } else if (reason === DisconnectReason.restartRequired) {
        console.log(`[SubBot ${this.id}] Requiere reinicio, reconectando...`);
        this.connect();
      } else {
        console.log(
          `[SubBot ${this.id}] Desconexión inesperada (${reason}). Intentando reconectar...`,
        );
        this.retries++;
        setTimeout(() => this.connect(), 5000 * this.retries);
      }
    }
  }

  async handleMessageUpsert(msg) {
    const m = msg.messages[0];
    if (!m || !m.message) {
      return;
    }

    try {
      const from = m.key.remoteJid;
      const isGroup = from.endsWith("@g.us");
      const isFromSelf = m.key.fromMe;
      const senderJid = m.key.participant || from;
      const senderNum = senderJid.split("@")[0];
      const rawID = this.socket.user?.id || "";
      const subbotID = `${rawID.split(":")[0]}@s.whatsapp.net`;
      const messageText =
        m.message?.conversation ||
        m.message?.extendedTextMessage?.text ||
        m.message?.imageMessage?.caption ||
        m.message?.videoMessage?.caption ||
        "";

      try {
        const botID = this.socket.user.id.split(":")[0] + "@s.whatsapp.net";
        const cfgFile = "./activossu.json";
        const cfg = fs.existsSync(cfgFile) ? JSON.parse(fs.readFileSync(cfgFile, "utf8")) : {};
        const adGroup = cfg.antidelete?.[botID]?.[from] === true;
        const adPriv = cfg.antideletepri?.[botID] === true;
        if ((isGroup && adGroup) || (!isGroup && adPriv)) {
          const store = isGroup ? "./gruposu.json" : "./prisu.json";
          if (!fs.existsSync(store)) {
            fs.writeFileSync(store, "{}");
          }
          const type = Object.keys(m.message || {})[0];
          const content = m.message[type];
          const msgId = m.key.id;
          const senderId = m.key.participant || (m.key.fromMe ? botID : m.key.remoteJid);
          const bigMedia = [
            "imageMessage",
            "videoMessage",
            "audioMessage",
            "documentMessage",
            "stickerMessage",
          ];
          const sizeOk = !bigMedia.includes(type) || (content.fileLength ?? 0) <= 8 * 1024 * 1024;
          if (sizeOk) {
            const reg = { chatId: from, sender: senderId, type, timestamp: Date.now() };
            const save64 = async (medType, data) => {
              const stream = await downloadContentFromMessage(data, medType.replace("Message", ""));
              let buff = Buffer.alloc(0);
              for await (const ch of stream) {
                buff = Buffer.concat([buff, ch]);
              }
              reg.media = buff.toString("base64");
              reg.mimetype = data.mimetype;
            };
            if (m.message?.viewOnceMessageV2) {
              const inner = m.message.viewOnceMessageV2.message;
              const iType = Object.keys(inner)[0];
              await save64(iType, inner[iType]);
              reg.type = iType;
            } else if (bigMedia.includes(type)) {
              await save64(type, content);
            } else {
              reg.text = m.message.conversation || m.message.extendedTextMessage?.text || "";
            }
            const db = JSON.parse(fs.readFileSync(store, "utf8"));
            db[msgId] = reg;
            fs.writeFileSync(store, JSON.stringify(db, null, 2));
          }
        }
      } catch (e) {
        console.error("❌ Antidelete-save:", e);
      }

      if (m.message?.protocolMessage?.type === 0) {
        try {
          const delId = m.message.protocolMessage.key.id;
          const whoDel = m.message.protocolMessage.key.participant || senderJid;
          const botID = `${this.socket.user.id.split(":")[0]}@s.whatsapp.net`;
          const cfgFile = "./activossu.json";
          const cfg = fs.existsSync(cfgFile) ? JSON.parse(fs.readFileSync(cfgFile, "utf8")) : {};
          const adGroup = cfg.antidelete?.[botID]?.[from] === true;
          const adPriv = cfg.antideletepri?.[botID] === true;
          if ((isGroup && !adGroup) || (!isGroup && !adPriv)) {
            return;
          }

          const store = isGroup ? "./gruposu.json" : "./prisu.json";
          if (!fs.existsSync(store)) {
            return;
          }

          const db = JSON.parse(fs.readFileSync(store, "utf8"));
          const dat = db[delId];
          if (!dat) {
            return;
          }

          if (isGroup) {
            const grp = await this.socket.groupMetadata(from);
            const adm = grp.participants.find((p) => p.id === whoDel)?.admin;
            if (adm) {
              return;
            }
          }

          const mention = [`${whoDel.split("@")[0]}@s.whatsapp.net`];
          if (dat.media) {
            const buf = Buffer.from(dat.media, "base64");
            const tp = dat.type.replace("Message", "");
            const opts = { [tp]: buf, mimetype: dat.mimetype, quoted: m };
            const sent = await this.socket.sendMessage(from, opts);
            const caption =
              tp === "sticker"
                ? "📌 El sticker fue eliminado por @"
                : tp === "audio"
                  ? "🎧 El audio fue eliminado por @"
                  : "📦 Mensaje eliminado por @";
            await this.socket.sendMessage(from, {
              text: `${caption}${whoDel.split("@")[0]}`,
              mentions: mention,
              quoted: sent,
            });
          } else if (dat.text) {
            await this.socket.sendMessage(
              from,
              {
                text: `📝 *Mensaje eliminado:* ${dat.text}\n👤 *Usuario:* @${whoDel.split("@")[0]}`,
                mentions: mention,
              },
              { quoted: m },
            );
          }
        } catch (e) {
          console.error("❌ Antidelete-restore:", e);
        }
      }

      if (isGroup && !isFromSelf) {
        const activossubPath = path.resolve("./activossubbots.json");
        let dataActivados = {};
        if (fs.existsSync(activossubPath)) {
          dataActivados = JSON.parse(fs.readFileSync(activossubPath, "utf-8"));
        }
        const subbotUserID = this.socket.user?.id || "";
        const antilinkActivo = dataActivados.antilink?.[subbotUserID]?.[from];
        const contieneLinkWhatsApp = /https:\/\/chat\.whatsapp\.com\//i.test(messageText);
        if (antilinkActivo && contieneLinkWhatsApp) {
          try {
            const metadata = await this.socket.groupMetadata(from);
            const participant = metadata.participants.find((p) => p.id === senderJid);
            const isAdmin = participant?.admin === "admin" || participant?.admin === "superadmin";
            const isOwner = global.owner.some((o) => o[0] === senderNum);
            if (!isAdmin && !isOwner) {
              await this.socket.sendMessage(from, { delete: m.key });
              await this.socket.sendMessage(from, {
                text: `⚠️ @${senderNum} envió un enlace de grupo de WhatsApp y fue eliminado.`,
                mentions: [senderJid],
              });
              await this.socket.groupParticipantsUpdate(from, [senderJid], "remove");
            }
          } catch (err) {
            console.error("❌ Error procesando antilink:", err);
          }
        }
      }

      if (isGroup && !isFromSelf) {
        try {
          const activossubPath = path.resolve("./activossubbots.json");
          if (fs.existsSync(activossubPath)) {
            const dataActivados = JSON.parse(fs.readFileSync(activossubPath, "utf-8"));
            const subbotUserID = this.socket.user?.id || "";
            const modoAdminsActivo = dataActivados.modoadmins?.[subbotUserID]?.[from];
            if (modoAdminsActivo) {
              const metadata = await this.socket.groupMetadata(from);
              const participante = metadata.participants.find((p) => p.id === senderJid);
              const isAdmin =
                participante?.admin === "admin" || participante?.admin === "superadmin";
              const botNum = subbotUserID.split(":")[0].replace(/[^0-9]/g, "");
              const isBot = botNum === senderNum;
              const isOwner = global.owner.some(([id]) => id === senderNum);
              if (!isAdmin && !isOwner && !isBot) {
                return;
              }
            }
          }
        } catch (err) {
          console.error("❌ Error en verificación de modo admins:", err);
          return;
        }
      }

      if (isGroup) {
        try {
          const grupoPath = path.resolve("./grupo.json");
          const messageTextForAuth =
            m.message?.conversation ||
            m.message?.extendedTextMessage?.text ||
            m.message?.imageMessage?.caption ||
            m.message?.videoMessage?.caption ||
            "";
          const prefixPath = path.resolve("./prefixes.json");
          let dataPrefijos = {};
          if (fs.existsSync(prefixPath)) {
            dataPrefijos = JSON.parse(fs.readFileSync(prefixPath, "utf-8"));
          }
          const customPrefix = dataPrefijos[subbotID];
          const allowedPrefixesAuth = customPrefix ? [customPrefix] : [".", "#"];
          const usedPrefixAuth = allowedPrefixesAuth.find((p) => messageTextForAuth.startsWith(p));
          if (usedPrefixAuth) {
            const bodyAuth = messageTextForAuth.slice(usedPrefixAuth.length).trim();
            const commandAuth = bodyAuth.split(" ")[0].toLowerCase();
            const allowedCommands = ["addgrupo"];
            let dataGrupos = {};
            if (fs.existsSync(grupoPath)) {
              dataGrupos = JSON.parse(fs.readFileSync(grupoPath, "utf-8"));
            }
            const gruposPermitidos = Array.isArray(dataGrupos[subbotID])
              ? dataGrupos[subbotID]
              : [];
            const botNum = rawID.split(":")[0].replace(/[^0-9]/g, "");
            if (
              senderNum !== botNum &&
              !gruposPermitidos.includes(from) &&
              !allowedCommands.includes(commandAuth)
            ) {
              return;
            }
          } else {
            return;
          }
        } catch (err) {
          console.error("❌ Error en verificación de grupo autorizado:", err);
          return;
        }
      }

      if (!isGroup) {
        const isFromSelfAuth = m.key.fromMe;
        if (!isFromSelfAuth) {
          const listaPath = path.join(__dirname, "listasubots.json");
          let dataPriv = {};
          try {
            if (fs.existsSync(listaPath)) {
              dataPriv = JSON.parse(fs.readFileSync(listaPath, "utf-8"));
            }
          } catch (e) {
            console.error("❌ Error leyendo listasubots.json:", e);
          }
          const listaPermitidos = Array.isArray(dataPriv[subbotID]) ? dataPriv[subbotID] : [];
          if (
            !listaPermitidos.includes(senderNum) &&
            !global.owner.some(([id]) => id === senderNum)
          ) {
            return;
          }
        }
      }

      const prefixPath = path.join(__dirname, "prefixes.json");
      let dataPrefijos = {};
      if (fs.existsSync(prefixPath)) {
        dataPrefijos = JSON.parse(fs.readFileSync(prefixPath, "utf-8"));
      }
      const customPrefix = dataPrefijos[subbotID];
      const allowedPrefixes = customPrefix ? [customPrefix] : [".", "#"];
      const usedPrefix = allowedPrefixes.find((p) => messageText.startsWith(p));
      if (!usedPrefix) {
        return;
      }

      const body = messageText.slice(usedPrefix.length).trim();
      const command = body.split(" ")[0].toLowerCase();
      const args = body.split(" ").slice(1);
      await handleSubCommand(this.socket, m, command, args);
    } catch (err) {
      console.error(`[SubBot ${this.id}] Error en messages.upsert:`, err);
    }
  }

  async handleGroupParticipantsUpdate(update) {
    try {
      if (!update.id.endsWith("@g.us") || !["add", "remove"].includes(update.action)) {
        return;
      }
      const filePath = path.join(__dirname, "activossubbots.json");
      if (!fs.existsSync(filePath)) {
        return;
      }
      const activos = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      if (!activos.welcome?.[this.socket.user.id]?.[update.id]) {
        return;
      }

      const welcomeTexts = [
        "🎉 ¡Bienvenido(a)! Gracias por unirte al grupo.",
        "👋 ¡Hola! Qué bueno tenerte con nosotros.",
        "🌟 ¡Saludos! Esperamos que la pases genial aquí.",
        "🚀 ¡Bienvenido(a)! Disfruta y participa activamente.",
        "✨ ¡Qué alegría verte por aquí! Pásala bien.",
      ];
      const farewellTexts = [
        "👋 ¡Adiós! Esperamos verte pronto de nuevo.",
        "😢 Se ha ido un miembro del grupo, ¡suerte!",
        "📤 Gracias por estar con nosotros, hasta luego.",
        "🔚 Un miembro se ha retirado. ¡Buena suerte!",
        "💨 ¡Chao! Esperamos que hayas disfrutado del grupo.",
      ];
      const texts = update.action === "add" ? welcomeTexts : farewellTexts;
      const mensajeAleatorio = () => texts[Math.floor(Math.random() * texts.length)];

      for (const participant of update.participants) {
        const mention = `@${participant.split("@")[0]}`;
        const mensaje = mensajeAleatorio();
        try {
          const profilePic = await this.socket.profilePictureUrl(participant, "image");
          await this.socket.sendMessage(update.id, {
            image: { url: profilePic },
            caption: `👋 ${mention}\n\n${mensaje}`,
            mentions: [participant],
          });
        } catch {
          await this.socket.sendMessage(update.id, {
            text: `👋 ${mention}\n\n${mensaje}`,
            mentions: [participant],
          });
        }
      }
    } catch (err) {
      console.error(`[SubBot ${this.id}] Error en bienvenida/despedida:`, err);
    }
  }
  cleanup() {
    if (this.socket) {
      this.socket.ev.removeAllListeners();
      this.socket.end(undefined);
      this.socket = null;
    }
  }

  destroy() {
    this.cleanup();
    if (fs.existsSync(this.sessionPath)) {
      fs.rmSync(this.sessionPath, { recursive: true, force: true });
    }
  }
}

const SubBotManager = {
  subBots: new Map(),
  sessionBaseDir: path.join(__dirname, "./subbots"),
  MAX_SUBBOTS: 200,

  createSubBot(sessionId) {
    const sessionPath = path.join(this.sessionBaseDir, sessionId);

    if (this.subBots.has(sessionPath)) {
      console.log(`[Manager] Intento de crear un subbot que ya está activo: ${sessionId}`);
      return;
    }

    if (!fs.existsSync(this.sessionBaseDir)) {
      fs.mkdirSync(this.sessionBaseDir, { recursive: true });
    }

    if (this.subBots.size >= this.MAX_SUBBOTS) {
      console.error("[Manager] Límite de SubBots alcanzado. No se puede crear uno nuevo.");
      return;
    }

    console.log(`[Manager] Creando y conectando subbot para la sesión: ${sessionId}`);
    const subBot = new SubBot(sessionPath);
    this.subBots.set(sessionPath, subBot);
    subBot.connect();
  },

  removeSubBot(sessionPath, deleteFiles = false) {
    const subBot = this.subBots.get(sessionPath);
    if (subBot) {
      console.log(`[Manager] Eliminando subbot: ${subBot.id}`);
      if (deleteFiles) {
        subBot.destroy();
      } else {
        subBot.cleanup();
      }
      this.subBots.delete(sessionPath);
    }
  },

  getSubBot(sessionPath) {
    return this.subBots.get(sessionPath);
  },

  listSubBots() {
    return Array.from(this.subBots.values());
  },

  loadExistingSubBots() {
    if (!fs.existsSync(this.sessionBaseDir)) {
      fs.mkdirSync(this.sessionBaseDir, { recursive: true });
    }
    const sessionDirs = fs
      .readdirSync(this.sessionBaseDir)
      .filter((dir) => fs.existsSync(path.join(this.sessionBaseDir, dir, "creds.json")));

    console.log(`[Manager] Cargando ${sessionDirs.length} sesiones existentes...`);
    sessionDirs.forEach((dir) => this.createSubBot(dir));
  },
};

module.exports = { SubBotManager };
