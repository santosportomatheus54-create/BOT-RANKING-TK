import { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, Events } from "discord.js";
import fs from "fs/promises";

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const LOGS = "1471187137595441152"; // canal de logs

// Simulando "banco" JSON
const DB_FILE = "./data.json";
async function getDB() {
  try {
    const data = await fs.readFile(DB_FILE, "utf8");
    return JSON.parse(data);
  } catch {
    return {};
  }
}
async function saveDB(db) {
  await fs.writeFile(DB_FILE, JSON.stringify(db, null, 2));
}

async function saldo(id) {
  const db = await getDB();
  return db[`coins_${id}`] || 0;
}

async function removerCoins(id, valor) {
  const db = await getDB();
  const atual = db[`coins_${id}`] || 0;
  if (atual < valor) return false;
  db[`coins_${id}`] = atual - valor;
  await saveDB(db);
  return true;
}

async function adicionarCoins(id, valor) {
  const db = await getDB();
  db[`coins_${id}`] = (db[`coins_${id}`] || 0) + valor;
  await saveDB(db);
}

// Delay helper
const delay = ms => new Promise(res => setTimeout(res, ms));

client.on(Events.InteractionCreate, async i => {
  try {
    // Painel
    if (i.isChatInputCommand() && i.commandName === "painel") {
      const e = new EmbedBuilder()
        .setTitle("🌟 ORG TK – Divirta-se e Fature Coins! 🌟")
        .setDescription(
          "Entre no universo de ORG TK, o bot que transforma seu Discord em um verdadeiro mundo de aventuras e recompensas! 🏆\n\n" +
          "🎮 Partidas emocionantes: Ganhe moedas e XP a cada jogo!\n" +
          "💰 Ranking duplo: Compare seu desempenho com amigos – Coins e XP.\n" +
          "🛒 Loja completa: VIPs, armas especiais e a misteriosa Caixa de Prêmios!\n" +
          "🎒 Inventário personalizado: Guarde seus itens e conquistas.\n" +
          "📊 Painel interativo: Tudo organizado em botões bonitos e fáceis de usar.\n\n" +
          "Entre na ORG TK e mostre que você é o melhor farmador do servidor! 🚀"
        )
        .setColor("#00FFFF");

      const r = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("perfil").setLabel("Perfil").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId("ranking").setLabel("Ranking").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId("loja").setLabel("Loja").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId("inventario").setLabel("Inventário").setStyle(ButtonStyle.Secondary)
      );

      return i.reply({ embeds: [e], components: [r] });
    }

    // Partida
    if (i.isChatInputCommand() && i.commandName === "partida") {
      await delay(2000); // delay de 2s
      const coins = Math.floor(Math.random() * 10) + 1;
      const xp = Math.floor(Math.random() * 50) + 10;

      const db = await getDB();
      db[`coins_${i.user.id}`] = (db[`coins_${i.user.id}`] || 0) + coins;
      db[`xp_${i.user.id}`] = (db[`xp_${i.user.id}`] || 0) + xp;
      await saveDB(db);

      const canal = client.channels.cache.get(LOGS);
      canal?.send(`${i.user.tag} ganhou ${coins} coins e ${xp} XP`);

      return i.reply(`+${coins} coins | +${xp} XP`);
    }

    // Botões
    if (!i.isButton()) return;
    await delay(2000); // delay de 2s

    const canal = client.channels.cache.get(LOGS);
    const db = await getDB();

    // Perfil
    if (i.customId === "perfil") {
      const coins = db[`coins_${i.user.id}`] || 0;
      const xp = db[`xp_${i.user.id}`] || 0;
      const e = new EmbedBuilder()
        .setTitle(`${i.user.username} - Perfil`)
        .setDescription(`💰 Coins: ${coins}\n⭐ XP: ${xp}`)
        .setColor("#FFD700");
      return i.reply({ embeds: [e], ephemeral: true });
    }

    // Ranking
    if (i.customId === "ranking") {
      const xpUsers = Object.entries(db).filter(([k]) => k.startsWith("xp_"));
      const coinUsers = Object.entries(db).filter(([k]) => k.startsWith("coins_"));

      const topXP = xpUsers.sort((a, b) => b[1] - a[1]).slice(0, 10);
      const topCoins = coinUsers.sort((a, b) => b[1] - a[1]).slice(0, 10);

      let desc = "**Ranking XP:**\n";
      topXP.forEach(([k, v], i) => { desc += `${i + 1}. <@${k.replace("xp_", "")}> - ${v} XP\n`; });
      desc += "\n**Ranking Coins:**\n";
      topCoins.forEach(([k, v], i) => { desc += `${i + 1}. <@${k.replace("coins_", "")}> - ${v} Coins\n`; });

      const e = new EmbedBuilder()
        .setTitle("🏆 Rankings ORG TK")
        .setDescription(desc)
        .setColor("#00FF00");

      return i.reply({ embeds: [e], ephemeral: true });
    }

    // Inventário
    if (i.customId === "inventario") {
      const inv = db[`inv_${i.user.id}`] || [];
      const e = new EmbedBuilder()
        .setTitle("Inventário")
        .setDescription(inv.length ? inv.join("\n") : "Vazio")
        .setColor("#FF69B4");
      return i.reply({ embeds: [e], ephemeral: true });
    }

    // Loja
    if (i.customId === "loja") {
      const e = new EmbedBuilder()
        .setTitle("🛒 Loja ORG TK")
        .setDescription(
          "💎 VIP 7D - 10 coins\n" +
          "💎 VIP 30D - 50 coins\n" +
          "⚡ CG Mira Abusiva - 45 coins\n" +
          "⚡ CG Rei da TK - 45 coins\n" +
          "🎁 Caixa Misteriosa - 100 coins"
        )
        .setColor("#1E90FF");

      const r = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("vip7").setLabel("VIP 7D").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId("vip30").setLabel("VIP 30D").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId("mira").setLabel("CG Mira Abusiva").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId("rei").setLabel("CG Rei da TK").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId("caixa").setLabel("Caixa Misteriosa").setStyle(ButtonStyle.Secondary)
      );

      return i.reply({ embeds: [e], components: [r], ephemeral: true });
    }

    // Comprar VIP 7D
    if (i.customId === "vip7") {
      if (!(await removerCoins(i.user.id, 10))) return i.reply({ content: "Sem coins", ephemeral: true });
      db[`vip_${i.user.id}`] = Date.now() + 604800000;
      await saveDB(db);
      canal?.send(`${i.user.tag} comprou VIP 7D`);
      return i.reply({ content: "VIP 7D comprado!", ephemeral: true });
    }

    // Comprar VIP 30D
    if (i.customId === "vip30") {
      if (!(await removerCoins(i.user.id, 50))) return i.reply({ content: "Sem coins", ephemeral: true });
      db[`vip_${i.user.id}`] = Date.now() + 2592000000;
      await saveDB(db);
      canal?.send(`${i.user.tag} comprou VIP 30D`);
      return i.reply({ content: "VIP 30D comprado!", ephemeral: true });
    }

    // CG Mira
    if (i.customId === "mira") {
      if (!(await removerCoins(i.user.id, 45))) return i.reply({ content: "Sem coins", ephemeral: true });
      db[`inv_${i.user.id}`] = [...(db[`inv_${i.user.id}`] || []), "Mira Abusiva"];
      await saveDB(db);
      canal?.send(`${i.user.tag} comprou Mira Abusiva`);
      return i.reply({ content: "Mira Abusiva adicionada ao inventário!", ephemeral: true });
    }

    // CG Rei
    if (i.customId === "rei") {
      if (!(await removerCoins(i.user.id, 45))) return i.reply({ content: "Sem coins", ephemeral: true });
      db[`inv_${i.user.id}`] = [...(db[`inv_${i.user.id}`] || []), "Rei da TK"];
      await saveDB(db);
      canal?.send(`${i.user.tag} comprou Rei da TK`);
      return i.reply({ content: "Rei da TK adicionado ao inventário!", ephemeral: true });
    }

    // Caixa Misteriosa
    if (i.customId === "caixa") {
      if (!(await removerCoins(i.user.id, 100))) return i.reply({ content: "Sem coins", ephemeral: true });

      const s = Math.random() * 100;
      let premio = "Nada";

      if (s <= 50) {
        premio = "300 XP";
        db[`xp_${i.user.id}`] = (db[`xp_${i.user.id}`] || 0) + 300;
      } else if (s <= 75) {
        premio = "600 XP";
        db[`xp_${i.user.id}`] = (db[`xp_${i.user.id}`] || 0) + 600;
      } else if (s <= 85) {
        premio = "Passe Booya";
        db[`inv_${i.user.id}`] = [...(db[`inv_${i.user.id}`] || []), "Passe Booya"];
      } else if (s <= 91) {
        premio = "Sala Paga";
        db[`inv_${i.user.id}`] = [...(db[`inv_${i.user.id}`] || []), "Sala Paga"];
      }

      await saveDB(db);
      canal?.send(`${i.user.tag} abriu a Caixa Misteriosa e ganhou ${premio}`);
      return i.reply({ content: `Você ganhou: ${premio}!`, ephemeral: true });
    }

  } catch (e) {
    console.error(e);
  }
});

client.once(Events.ClientReady, () => {
  console.log("Bot online");
});

client.login(process.env.TOKEN);
