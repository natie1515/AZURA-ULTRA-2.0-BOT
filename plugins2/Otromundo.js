const fs = require("fs");

module.exports = async (msg, { conn }) => {
    try {
        const rpgFile = "./rpg.json";
        const userId = msg.key.participant || msg.key.remoteJid;
        const cooldownTime = 6 * 60 * 1000; // 6 minutos

        // 🌌 Reacción antes de procesar
        await conn.sendMessage(msg.key.remoteJid, {
            react: { text: "🌌", key: msg.key }
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
                text: `❌ *No tienes personajes para entrenar en el Otro Mundo.*\n📜 Usa \`${global.prefix}tiendaper\` para comprar uno.`
            }, { quoted: msg });
        }

        let personaje = usuario.personajes[0]; // Primer personaje como principal

        // 🚑 Verificar si el personaje tiene 0 de vida
        if (personaje.vida <= 0) {
            return conn.sendMessage(msg.key.remoteJid, {
                text: `🚑 *¡${personaje.nombre} no puede entrenar en el Otro Mundo, está sin vida!*\n📜 Usa \`${global.prefix}bolasdeldragon\` para revivirlo.`
            }, { quoted: msg });
        }

        // 🕒 Verificar cooldown
        let tiempoActual = Date.now();
        if (personaje.cooldowns?.otromundo && tiempoActual - personaje.cooldowns.otromundo < cooldownTime) {
            let tiempoRestante = ((personaje.cooldowns.otromundo + cooldownTime - tiempoActual) / (60 * 1000)).toFixed(1);
            return conn.sendMessage(msg.key.remoteJid, {
                text: `⏳ *Debes esperar ${tiempoRestante} minutos antes de volver a entrenar en el Otro Mundo.*`
            }, { quoted: msg });
        }

        // 🎖️ Generar recompensas aleatorias
        let diamantesGanados = Math.floor(Math.random() * 500) + 1; // 1 a 500
        let xpGanada = Math.floor(Math.random() * (2000 - 500 + 1)) + 500; // 500 a 2000

        // 💰 Incrementar experiencia y diamantes
        usuario.diamantes += diamantesGanados;
        personaje.experiencia += xpGanada;

        // ❤️ Reducir vida entre 5 y 20 puntos
        let vidaPerdida = Math.floor(Math.random() * (20 - 5 + 1)) + 5;
        mascota.vida = Math.max(0, personaje.vida - vidaPerdida);

        // 🕒 Guardar cooldown
        if (!personaje.cooldowns) personaje.cooldowns = {};
        personaje.cooldowns.otromundo = tiempoActual;

        // 🌌 Mensajes de recompensa
        const textos = [
            `🌌 *${personaje.nombre} entrenó con los dioses del Otro Mundo y aumentó su poder.*\n💎 *${diamantesGanados} Diamantes obtenidos*\n✨ *${xpGanada} XP ganados*`,
            `🔥 *Después de un duro entrenamiento en el Más Allá, ${personaje.nombre} regresó más fuerte.*\n💎 *${diamantesGanados} Diamantes obtenidos*\n✨ *${xpGanada} XP ganados*`,
            `👁️‍🗨️ *${personaje.nombre} alcanzó una nueva comprensión del ki mientras entrenaba en el Otro Mundo.*\n💎 *${diamantesGanados} Diamantes obtenidos*\n✨ *${xpGanada} XP ganados*`,
            `⚡ *Con la guía de los maestros celestiales, ${personaje.nombre} aumentó su energía vital.*\n💎 *${diamantesGanados} Diamantes obtenidos*\n✨ *${xpGanada} XP ganados*`,
            `🔮 *${personaje.nombre} perfeccionó su técnica en el Otro Mundo, elevando su poder al máximo.*\n💎 *${diamantesGanados} Diamantes obtenidos*\n✨ *${xpGanada} XP ganados*`,
            `💥 *Después de un entrenamiento extremo en el Otro Mundo, ${personaje.nombre} dominó nuevas habilidades.*\n💎 *${diamantesGanados} Diamantes obtenidos*\n✨ *${xpGanada} XP ganados*`
        ];

        await conn.sendMessage(msg.key.remoteJid, {
            text: textos[Math.floor(Math.random() * textos.length)]
        }, { quoted: msg });

        // 📊 Manejar la subida de nivel correctamente
        let xpMaxNivel = personaje.nivel === 1 ? 1000 : personaje.nivel * 1500;
        const rangos = [
            { nivel: 1, rango: "🌟 Principiante" },
            { nivel: 10, rango: "⚔️ Guerrero Espiritual" },
            { nivel: 20, rango: "🔥 Maestro del Más Allá" },
            { nivel: 30, rango: "👑 Dominador de Dimensiones" },
            { nivel: 40, rango: "🌀 Señor del Ki Divino" },
            { nivel: 50, rango: "💀 Rey del Otro Mundo" },
            { nivel: 60, rango: "🚀 Dios de las Dimensiones" },
            { nivel: 70, rango: "🔱 Entidad Suprema" }
        ];

        while (personaje.experiencia >= xpMaxNivel && personaje.nivel < 70) {
            personaje.experiencia -= xpMaxNivel;
            personaje.nivel += 1;
            xpMaxNivel = personaje.nivel * 1500;
            personaje.xpMax = xpMaxNivel;
            personaje.rango = rangos.reduce(
                (acc, cur) => (personaje.nivel >= cur.nivel ? cur.rango : acc),
                personaje.rango
            );

            await conn.sendMessage(msg.key.remoteJid, {
                text: `🎉 *¡${personaje.nombre} ha subido al nivel ${personaje.nivel}! 🏆*\n🏅 *Nuevo Rango:* ${personaje.rango}`
            }, { quoted: msg });
        }

        // 🌟 Mejorar habilidades con 30% de probabilidad
        let habilidades = Object.keys(personaje.habilidades);
        if (habilidades.length > 0 && Math.random() < 0.3) {
            let habilidadSubida = habilidades[Math.floor(Math.random() * habilidades.length)];
            personaje.habilidades[habilidadSubida] += 1;

            await conn.sendMessage(msg.key.remoteJid, {
                text: `🌟 *¡${personaje.nombre} ha mejorado su habilidad!* 🎯\n🔹 *${habilidadSubida}: Nivel ${personaje.habilidades[habilidadSubida]}*`
            }, { quoted: msg });
        }

        // 📂 Guardar cambios en el archivo
        fs.writeFileSync(rpgFile, JSON.stringify(rpgData, null, 2));

        // ✅ Reacción de confirmación después de ejecutar
        await conn.sendMessage(msg.key.remoteJid, {
            react: { text: "✅", key: msg.key }
        });

    } catch (error) {
        console.error("❌ Error en el comando .otromundo:", error);
        await conn.sendMessage(msg.key.remoteJid, {
            text: "❌ *Ocurrió un error al entrenar en el Otro Mundo. Inténtalo de nuevo.*"
        }, { quoted: msg });
    }
};

module.exports.command = ["otromundo"];
