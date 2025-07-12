const path = require("path");
const fs = require("fs");
const pino = require("pino");
const QRCode = require("qrcode");
const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  DisconnectReason,
  downloadContentFromMessage,
} = require("@whiskeysockets/baileys");
const { Boom } = require("@hapi/boom");

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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
  constructor(sessionPath, options = {}) {
    this.sessionPath = sessionPath;
    this.id = path.basename(sessionPath);
    this.options = { isNew: false, ...options };
    this.mainConn = this.options.mainConn;
    this.initialMsg = this.options.initialMsg;
    this.socket = null;
    this.status = "pending";
    this.retries = 0;
    this.sentCode = false;
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
        printQRInTerminal: !this.options.usePairingCode && !this.mainConn,
        browser: ["Azura-Subbot", "Chrome", "2.0"],
        syncFullHistory: false,
      });
      this.socket.ev.on("creds.update", saveCreds);
      this.attachEvents();
    } catch {
      this.cleanup();
      SubBotManager.removeSubBot(this.sessionPath, true);
    }
  }

  attachEvents() {
    this.socket.ev.on("connection.update", this.handleConnectionUpdate.bind(this));
    this.socket.ev.on("messages.upsert", this.handleMessageUpsert.bind(this));
    this.socket.ev.on("group-participants.update", this.handleGroupParticipantsUpdate.bind(this));
  }

  async handleConnectionUpdate(update) {
    const { connection, lastDisconnect, qr } = update;
    const isNewCreation = this.options.isNew && this.mainConn;

    if (isNewCreation && qr && !this.sentCode) {
      this.sentCode = true;
      try {
        if (this.options.usePairingCode) {
          const code = await this.socket.requestPairingCode(this.id.split("@")[0]);
          await this.mainConn.sendMessage(
            this.initialMsg.key.remoteJid,
            {
              video: { url: "https://cdn.russellxz.click/b0cbbbd3.mp4" },
              caption:
                "🔐 *Código generado:*\nAbre WhatsApp > Vincular dispositivo y pega el siguiente código:",
              gifPlayback: true,
            },
            { quoted: this.initialMsg },
          );
          await sleep(1000);
          await this.mainConn.sendMessage(
            this.initialMsg.key.remoteJid,
            { text: `\`\`\`${code}\`\`\`` },
            { quoted: this.initialMsg },
          );
        } else {
          const qrImage = await QRCode.toBuffer(qr);
          await this.mainConn.sendMessage(
            this.initialMsg.key.remoteJid,
            {
              image: qrImage,
              caption:
                "📲 Escanea este código QR desde *WhatsApp > Vincular dispositivo* para conectarte como sub-bot.",
            },
            { quoted: this.initialMsg },
          );
        }
      } catch {
        SubBotManager.removeSubBot(this.sessionPath, true);
      }
    }

    if (connection === "open") {
      this.status = "open";
      this.retries = 0;
      if (!isNewCreation) {
        console.log(`✔️ Subbot ${this.id.split("@")[0]} online.`);
      } else {
        const ownerJid = `${this.socket.user.id.split(":")[0]}@s.whatsapp.net`;
        await this.mainConn.sendMessage(
          this.initialMsg.key.remoteJid,
          {
            text: "🤖 𝙎𝙐𝘽𝘽𝙊𝙏 𝘾𝙊𝙉𝙀𝘾𝙏𝘼𝘿𝙊 - AZURA ULTRA 2.0\n\n✅ 𝘽𝙞𝙚𝙣𝙫𝙚𝙣𝙞𝙙𝙤 𝙖𝙡 𝙨𝙞𝙨𝙩𝙚𝙢𝙖 𝙥𝙧𝙚𝙢𝙞𝙪𝙢 𝙙𝙚 AZURA ULTRA 2.0 𝘽𝙊𝙏 \n🛰️ 𝙏𝙪 𝙨𝙪𝙗𝙗𝙤т 𝙮𝙖 𝙚𝙨𝙩á 𝙚𝙣 𝙡í𝙣𝙚𝙖 𝙮 𝙤𝙥𝙚𝙧𝙖𝙩𝙞𝙫𝙤.\n\n📩 *𝙄𝙈𝙋𝙊𝙍𝙏𝘼𝙉𝙏𝙀* \n𝙍𝙚𝙫𝙞𝙨𝙖 𝙩𝙪 𝙢𝙚𝙣𝙨𝙖𝙟𝙚 𝙥𝙧𝙞𝙫𝙖𝙙𝙤. \n𝘼𝙝í 𝙚𝙣𝙘𝙤𝙣𝙩𝙧𝙖𝙧á𝙨 𝙞𝙣𝙨𝙩𝙧𝙪𝙘𝙘𝙞𝙤𝙣𝙚𝙨 𝙘𝙡𝙖𝙧𝙖𝙨 𝙙𝙚 𝙪𝙨𝙤. \n*Si no entiendes es porque la inteligencia te intenta alcanzar, pero tú eres más rápido que ella.* \n_𝙊 𝙨𝙚𝙖... 𝙚𝙧𝙚𝙨 𝙪𝙣 𝙗𝙤𝙗𝙤 UN TREMENDO ESTÚPIDO_ 🤖💀\n\n🛠️ 𝘾𝙤𝙢𝙖𝙣𝙙𝙤𝙨 𝙗á𝙨𝙞𝙘𝙤𝙨: \n• \`help\` → 𝘼𝙮𝙪𝙙𝙖 𝙜𝙚𝙣𝙚𝙧𝙖𝙡 \n• \`menu\` → 𝙇𝙞𝙨𝙩𝙖 𝙙𝙚 𝙘𝙤𝙢𝙖𝙣𝙙𝙤𝙨\n\nℹ️ 𝙈𝙤𝙙𝙤 𝙖𝙘𝙩𝙪𝙖𝙡: 𝙋𝙍𝙄𝙑𝘼𝘿𝙊 \n☑️ 𝙎ó𝙡𝙤 𝙩ú 𝙥𝙪𝙚𝙙𝙚𝙨 𝙪𝙨𝙖𝙧𝙡𝙤 𝙥𝙤𝙧 𝙖𝙝𝙤𝙧𝙖.\n🤡 *mira tu privado para que sepas\ncomo hacer que otros puedan usarlo* 🤡\n\n✨ *𝘾𝙖𝙢𝙗𝙞𝙖𝙧 𝙥𝙧𝙚𝙛𝙞𝙟𝙤:* \nUsa: \`.setprefix ✨\` \nDespués deberás usar ese nuevo prefijo para activar comandos. \n(𝙀𝙟: \`✨menu\`)\n\n🧹 *𝘽𝙤𝙧𝙧𝙖𝙧 𝙩𝙪 𝙨𝙚𝙨𝙞ó𝙣:* \n• \`.delbots\` \n• Solicita un nuevo código con: \`.code\` o \`.sercode\`\n\n💎 *BY 𝙎𝙠𝙮 𝙐𝙡𝙩𝙧𝙖 𝙋𝙡𝙪𝙨* 💎",
          },
          { quoted: this.initialMsg },
        );
        await this.mainConn.sendMessage(this.initialMsg.key.remoteJid, {
          react: { text: "✅", key: this.initialMsg.key },
        });
        await this.socket.sendMessage(ownerJid, {
          text: "✨ ¡Hola! Bienvenido al sistema de SubBots Premium de Azura Ultra 2.0 ✨\n\n✅ Estado: tu SubBot ya está *en línea y conectado*.\nA continuación, algunas cosas importantes que debes saber para comenzar:\n\n📌 *IMPORTANTE*:\n🧠 Por defecto, el bot **solo se responde a sí mismo** en el chat privado.\nSi deseas que funcione en grupos, haz lo siguiente:\n\n🔹 Ve al grupo donde lo quieras usar.\n🔹 Escribe el comando: \`.addgrupo\`\n🔹 ¡Listo! Ahora el bot responderá a todos los miembros de ese grupo.\n\n👤 ¿Quieres que el bot también le responda a otras personas en privado?\n\n🔸 Usa el comando: \`.addlista número\`\n  Ejemplo: \`.addlista 5491123456789\`\n🔸 O responde (cita) un mensaje de la persona y escribe: \`.addlista\`\n🔸 Esto autorizará al bot a responderle directamente en su chat privado.\n\n🔧 ¿Deseas personalizar el símbolo o letra para activar los comandos?\n\n🔸 Usa: \`.setprefix\` seguido del nuevo prefijo que quieras usar.\n  Ejemplo: \`.setprefix ✨\`\n🔸 Una vez cambiado, deberás usar ese prefijo para todos los comandos.\n  (Por ejemplo, si pusiste \`✨\`, ahora escribirías \`✨menu\` en lugar de \`.menu\`)\n\n📖 Para ver la lista completa de comandos disponibles, simplemente escribe:\n\`.menu\` o \`.help\`\n\n🚀 ¡Disfruta del poder de Azura Ultra 2.0 y automatiza tu experiencia como nunca antes!",
        });
      }
    }

    if (connection === "close") {
      const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
      const wasConnected = this.status === "open";
      this.status = "closed";

      this.cleanup();

      const fatalCodes = [
        DisconnectReason.badSession,
        DisconnectReason.loggedOut,
        DisconnectReason.forbidden,
      ];

      if (fatalCodes.includes(reason)) {
        if (isNewCreation && !wasConnected) {
          await this.mainConn.sendMessage(
            this.initialMsg.key.remoteJid,
            {
              text: `⚠️ *Sesión eliminada.*\nCausa: ${reason}.\nUsa \`.sercode\` para volver a conectar.`,
            },
            { quoted: this.initialMsg },
          );
        }
        SubBotManager.removeSubBot(this.sessionPath, true);
      } else if (reason === DisconnectReason.restartRequired) {
        this.connect();
      } else {
        if (isNewCreation && !wasConnected) {
          await this.mainConn.sendMessage(
            this.initialMsg.key.remoteJid,
            {
              text: `╭───〔 *⚠️ SUBBOT* 〕───╮\n│\n│⚠️ *Problema de conexión:* ${reason}\n│ Intentando reconectar...\n│\n│ 🔄 Si sigues en problemas, ejecuta:\n│ .delbots\n│ para eliminar tu sesión y conecta de nuevo con:\n│ .sercode / .code\n│\n╰────✦ *Sky Ultra Plus* ✦────╯`,
            },
            { quoted: this.initialMsg },
          );
        }
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

  createSubBot(sessionId, options = {}) {
    const sessionPath = path.join(this.sessionBaseDir, sessionId);
    if (this.subBots.has(sessionPath)) {
      if (options.mainConn) {
        options.mainConn.sendMessage(
          options.initialMsg.key.remoteJid,
          {
            text: "ℹ️ Ese subbot ya existe. usa: `.delbots` para borrar tu sesión actual y vuelve a pedir codigo con:(.code o .sercode)",
          },
          { quoted: options.initialMsg },
        );
      }
      return;
    }
    if (!fs.existsSync(this.sessionBaseDir)) {
      fs.mkdirSync(this.sessionBaseDir, { recursive: true });
    }
    const subbotDirs = fs
      .readdirSync(this.sessionBaseDir)
      .filter((d) => fs.existsSync(path.join(this.sessionBaseDir, d, "creds.json")));
    if (subbotDirs.length >= this.MAX_SUBBOTS) {
      if (options.mainConn) {
        options.mainConn.sendMessage(
          options.initialMsg.key.remoteJid,
          {
            text: `🚫 *Límite alcanzado:* existen ${subbotDirs.length}/${this.MAX_SUBBOTS} sesiones activas.`,
          },
          { quoted: options.initialMsg },
        );
      }
      return;
    }

    const restantes = this.MAX_SUBBOTS - subbotDirs.length;
    if (options.mainConn) {
      options.mainConn.sendMessage(
        options.initialMsg.key.remoteJid,
        { text: `ℹ️ Quedan *${restantes}* espacios disponibles.` },
        { quoted: options.initialMsg },
      );
    }

    const subBot = new SubBot(sessionPath, options);
    this.subBots.set(sessionPath, subBot);
    subBot.connect();
  },

  removeSubBot(sessionPath, deleteFiles = false) {
    const subBot = this.subBots.get(sessionPath);
    if (subBot) {
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
    sessionDirs.forEach((dir) => this.createSubBot(dir, { isNew: false }));
  },
};

module.exports = { SubBotManager };
