import { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, Events } from "discord.js";
import { readFileSync, writeFileSync, existsSync } from "fs";

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// ID do canal de logs
const LOGS = "1471187137595441152";

// Arquivo de dados
const dbFile = "database.json";

// ---------------- Banco ----------------
let dbData = {};
if (existsSync(dbFile)) {
  dbData = JSON.parse(readFileSync(dbFile));
}

function saveDB() {
  writeFileSync(dbFile, JSON.stringify(dbData, null, 2));
}

function key(userId, type) {
  return `${type}_${userId}`;
}

async function saldo(userId) {
  return dbData[key(userId, "coins")] || 0;
}

async function removerCoins(userId, amount) {
  const atual = await saldo(userId);
  if (atual < amount) return false;
  dbData[key(userId, "coins")] = atual - amount;
  saveDB();
  return true;
}

function addCoins(userId, amount) {
  dbData[key(userId, "coins")] = (dbData[key(userId, "coins")] || 0) + amount;
  saveDB();
}

function addXP(userId, amount) {
  dbData[key(userId, "xp")] = (dbData[key(userId, "xp")] || 0) + amount;
  saveDB();
}

function addItem(userId, item) {
  dbData[key(userId, "inv")] = dbData[key(userId, "inv")] || [];
  dbData[key(userId, "inv")].push(item);
  saveDB();
}

function setVIP(userId, duration) {
  dbData[key(userId, "vip")] = Date.now() + duration;
  saveDB();
}

function getVIP(userId) {
  return dbData[key(userId, "vip")] || 0;
}

// Delay
function delay(ms) {
  return new Promise(res => setTimeout(res, ms));
}

// ---------------- Eventos ----------------
client.on(Events.InteractionCreate, async i => {
  try {
    if (i.isChatInputCommand()) {
      // Painel
      const embedPainel = new EmbedBuilder().setTitle("Painel").setDescription("Sistema de farm");
      const rowPainel = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("perfil").setLabel("").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId("ranking").setLabel("").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId("loja").setLabel("").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId("inventario").setLabel("").setStyle(ButtonStyle.Secondary)
      );

      await delay(2000);
      await i.reply({ embeds: [embedPainel], components: [rowPainel] });
    }

    if (i.commandName === "partida") {
      let coins = Math.floor(Math.random() * 10) + 1;
      if (getVIP(i.user.id) > Date.now()) coins *= 2;
      const xp = Math.floor(Math.random() * 50) + 10;

      addCoins(i.user.id, coins);
      addXP(i.user.id, xp);

      const canal = client.channels.cache.get(LOGS);
      canal?.send(`${i.user.tag} ganhou ${coins} coins e ${xp} XP`);

      await delay(2000);
      await i.reply(`+${coins} coins | +${xp} XP`);
    }
  } catch (e) { console.error(e); }
});

client.on(Events.InteractionCreate, async i => {
  try {
    if (!i.isButton()) return;
    const canal = client.channels.cache.get(LOGS);

    // Perfil
    if (i.customId === "perfil") {
      const coins = await saldo(i.user.id);
      const xp = dbData[key(i.user.id, "xp")] || 0;
      const embed = new EmbedBuilder().setTitle("").setDescription(`${coins} | ${xp}`);
      await delay(2000);
      return i.reply({ embeds: [embed], ephemeral: true });
    }

    // Ranking
    if (i.customId === "ranking") {
      const users = Object.entries(dbData)
        .filter(([k]) => k.startsWith("xp_"))
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

      let desc = "";
      for (let x = 0; x < users.length; x++) {
        const id = users[x][0].replace("xp_", "");
        desc += `${x + 1}. <@${id}> - ${users[x][1]} XP\n`;
      }

      const embed = new EmbedBuilder().setTitle("").setDescription(desc || "");
      await delay(2000);
      return i.reply({ embeds: [embed], ephemeral: true });
    }

    // Inventário
    if (i.customId === "inventario") {
      const inv = dbData[key(i.user.id, "inv")] || [];
      const embed = new EmbedBuilder().setTitle("").setDescription(inv.length ? inv.join("\n") : "");
      await delay(2000);
      return i.reply({ embeds: [embed], ephemeral: true });
    }

    // Loja (genérica)
    if (i.customId === "loja") {
      await delay(2000);
      return i.reply({ content: "", ephemeral: true });
    }

  } catch (e) { console.error(e); }
});

client.once(Events.ClientReady, () => {
  console.log("Bot online");
});

client.login(process.env.TOKEN);
