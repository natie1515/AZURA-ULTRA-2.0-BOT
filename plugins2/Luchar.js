const fs = require("fs");

module.exports = async (msg, { conn }) => {
    try {
        const rpgFile = "./rpg.json";
        const userId = msg.key.participant || msg.key.remoteJid;
        const cooldownTime = 5 * 60 * 1000; // 5 minutos

        // ⚔️ Reacción antes de procesar
        await conn.sendMessage(msg.key.remoteJid, {
            react: { text: "⚔️", key: msg.key }
        });

        // 📂 Verificar si el archivo existe
        if (!fs.existsSync(rpgFile)) {
            return conn.sendMessage(msg.key.remoteJid, {
                text: "❌ *Los datos del RPG no están disponibles.*"
            }, { quoted: msg });
        }

        // 📥 Cargar datos del usuario
        let rpgData = JSON.parse(fs.readFileSync(rpgFile, "utf-8"));

        // ❌ Verificar si el usuario está registrado
        if (!rpgData.usuarios[userId]) {
            return conn.sendMessage(msg.key.remoteJid, {
                text: `❌ *No tienes una cuenta registrada en el gremio Azura Ultra.*\n📜 Usa \`${global.prefix}rpg <nombre> <edad>\` para registrarte.`
            }, { quoted: msg });
        }

        let usuario = rpgData.usuarios[userId];

        // ❌ Verificar si el usuario tiene personajes
        if (!usuario.personajes || usuario.personajes.length === 0) {
            return conn.sendMessage(msg.key.remoteJid, {
                text: `❌ *No tienes personajes para luchar.*\n📜 Usa \`${global.prefix}tiendaper\` para comprar uno.`
            }, { quoted: msg });
        }

        let personaje = usuario.personajes[0]; // Primer personaje como principal

        // 🚑 Verificar si el personaje tiene 0 de vida
        if (personaje.vida <= 0) {
            return conn.sendMessage(msg.key.remoteJid, {
                text: `🚑 *¡No puedes luchar!*\n\n🔴 *${personaje.nombre} tiene 0 de vida.*\n📜 Usa \`${global.prefix}bolasdeldragon\` para curarlo.`
            }, { quoted: msg });
        }

        // 🕒 Verificar cooldown
        let now = Date.now();
        if (personaje.cooldowns?.luchar && now - personaje.cooldowns.luchar < cooldownTime) {
            let mins = ((personaje.cooldowns.luchar + cooldownTime - now) / (60 * 1000)).toFixed(1);
            return conn.sendMessage(msg.key.remoteJid, {
                text: `⏳ *Debes esperar ${mins} minutos antes de volver a luchar.*`
            }, { quoted: msg });
        }

        // 🎖️ Generar recompensas aleatorias
        let diamonds = Math.floor(Math.random() * 500) + 1;
        let xp = Math.floor(Math.random() * (2000 - 500 + 1)) + 500;

        // 💰 Incrementar experiencia y diamantes
        usuario.diamantes += diamonds;
        personaje.experiencia += xp;

        // ❤️ Reducir vida entre 5 y 20 puntos
        let lost = Math.floor(Math.random() * (20 - 5 + 1)) + 5;
        personaje.vida = Math.max(0, personaje.vida - lost);

        // 🕒 Guardar cooldown
        personaje.cooldowns = personaje.cooldowns || {};
        personaje.cooldowns.luchar = now;

        // ⚔️ Mensajes de recompensa
        const texts = [
            `⚔️ *${personaje.nombre} peleó y ganó experiencia.*\n💎 *${diamonds} Diamantes obtenidos*\n✨ *${xp} XP ganados*`,
            `🔥 *${personaje.nombre} venció a un enemigo y se hizo más fuerte.*\n💎 *${diamonds} Diamantes obtenidos*\n✨ *${xp} XP ganados*`,
            `🛡️ *${personaje.nombre} se defendió con éxito en la batalla.*\n💎 *${diamonds} Diamantes obtenidos*\n✨ *${xp} XP ganados*`,
            `⚡ *${personaje.nombre} aprendió nuevas técnicas en el combate.*\n💎 *${diamonds} Diamantes obtenidos*\n✨ *${xp} XP ganados*`
        ];

        await conn.sendMessage(msg.key.remoteJid, {
            text: texts[Math.floor(Math.random() * texts.length)]
        }, { quoted: msg });

        // 📊 Manejar la subida de nivel correctamente
        let xpMax = personaje.nivel === 1 ? 1000 : personaje.nivel * 1500;
        const ranks = [
            { lvl: 1, tag: "🌟 Principiante" },
            { lvl: 10, tag: "⚔️ Guerrero" },
            { lvl: 20, tag: "🔥 Maestro de Batalla" },
            { lvl: 30, tag: "👑 Líder Supremo" },
            { lvl: 40, tag: "🌀 Legendario" },
            { lvl: 50, tag: "💀 Dios de la Guerra" },
            { lvl: 60, tag: "🚀 Titán de la Arena" },
            { lvl: 70, tag: "🔱 Inmortal" }
        ];

        while (personaje.experiencia >= xpMax && personaje.nivel < 70) {
            personaje.experiencia -= xpMax;
            personaje.nivel++;
            xpMax = personaje.nivel * 1500;
            personaje.xpMax = xpMax;
            personaje.rango = ranks.reduce(
                (a, c) => (personaje.nivel >= c.lvl ? c.tag : a),
                personaje.rango
            );

            await conn.sendMessage(msg.key.remoteJid, {
                text: `🎉 *¡${personaje.nombre} ha subido al nivel ${personaje.nivel}! 🏆*\n🏅 *Nuevo Rango:* ${personaje.rango}`
            }, { quoted: msg });
        }

        // 🌟 Mejorar habilidades con 30% de probabilidad
        let skills = Object.keys(personaje.habilidades);
        if (skills.length && Math.random() < 0.3) {
            let skill = skills[Math.floor(Math.random() * skills.length)];
            personaje.habilidades[skill] += 1;
            await conn.sendMessage(msg.key.remoteJid, {
                text: `🌟 *¡${personaje.nombre} ha mejorado su habilidad!* 🎯\n🔹 *${skill}: Nivel ${personaje.habilidades[skill]}*`
            }, { quoted: msg });
        }

        // 📂 Guardar cambios
        fs.writeFileSync(rpgFile, JSON.stringify(rpgData, null, 2));

        // ✅ Confirmación
        await conn.sendMessage(msg.key.remoteJid, {
            react: { text: "✅", key: msg.key }
        });

    } catch (e) {
        console.error("❌ Error en el comando .luchar:", e);
        await conn.sendMessage(msg.key.remoteJid, {
            text: "❌ *Ocurrió un error al luchar. Inténtalo de nuevo.*"
        }, { quoted: msg });
    }
};

module.exports.command = ["luchar"];
