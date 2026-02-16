import 'dotenv/config';
import { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, REST, Routes, Events } from "discord.js";
import { QuickDB } from "quick.db";

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const db = new QuickDB();

const LOGS = process.env.LOGS;

// Comandos
const comandos = [
  { name: "painel", description: "Abrir painel" },
  { name: "partida", description: "Ganhar recompensa" }
];

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);
(async () => {
  try {
    await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID), { body: comandos });
    console.log("Comandos registrados");
  } catch(e) { console.error(e); }
})();

// Funções de coins
async function saldo(id) {
  return (await db.get(`coins_${id}`)) || 0;
}

async function removerCoins(id, valor) {
  const atual = await saldo(id);
  if (atual < valor) return false;
  await db.sub(`coins_${id}`, valor);
  return true;
}

// Comandos do bot
client.on(Events.InteractionCreate, async i => {
  if (i.isChatInputCommand()) {

    if (i.commandName === "painel") {
      const e = new EmbedBuilder()
        .setTitle("ORG TK")
        .setDescription("Sistema de farm");

      const r = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("perfil").setLabel("Perfil").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId("ranking").setLabel("Ranking XP").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId("ranking_coins").setLabel("Ranking Coins").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId("loja").setLabel("Loja").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId("inventario").setLabel("Inventario").setStyle(ButtonStyle.Secondary)
      );

      await i.reply({ embeds: [e], components: [r] });
    }

    if (i.commandName === "partida") {
      let coins = Math.floor(Math.random() * 10) + 1;
      const vip = await db.get(`vip_${i.user.id}`);
      if (vip && vip > Date.now()) coins *= 2;

      const xp = Math.floor(Math.random() * 50) + 10;
      await db.add(`coins_${i.user.id}`, coins);
      await db.add(`xp_${i.user.id}`, xp);

      const canal = client.channels.cache.get(LOGS);
      canal?.send(`${i.user.tag} ganhou ${coins} coins e ${xp} XP`);

      await i.reply(`+${coins} coins | +${xp} XP`);
    }
  }

  // Botões
  if (i.isButton()) {
    const canal = client.channels.cache.get(LOGS);

    if (i.customId === "perfil") {
      const coins = await saldo(i.user.id);
      const xp = (await db.get(`xp_${i.user.id}`)) || 0;
      const e = new EmbedBuilder().setTitle("Perfil").setDescription(`Coins: ${coins}\nXP: ${xp}`);
      return i.reply({ embeds: [e], ephemeral: true });
    }

    if (i.customId === "ranking") {
      const all = await db.all();
      const users = all.filter(x => x.id.startsWith("xp_")).sort((a,b)=>b.value-a.value).slice(0,10);
      let desc = "";
      for (let x=0;x<users.length;x++){
        const id = users[x].id.replace("xp_","");
        desc += `${x+1}. <@${id}> - ${users[x].value} XP\n`;
      }
      const e = new EmbedBuilder().setTitle("Ranking XP").setDescription(desc || "Sem dados");
      return i.reply({ embeds: [e], ephemeral: true });
    }

    if (i.customId === "ranking_coins") {
      const all = await db.all();
      const users = all.filter(x => x.id.startsWith("coins_")).sort((a,b)=>b.value-a.value).slice(0,10);
      let desc = "";
      for (let x=0;x<users.length;x++){
        const id = users[x].id.replace("coins_","");
        desc += `${x+1}. <@${id}> - ${users[x].value} Coins\n`;
      }
      const e = new EmbedBuilder().setTitle("Ranking Coins").setDescription(desc || "Sem dados");
      return i.reply({ embeds: [e], ephemeral: true });
    }

    if (i.customId === "inventario") {
      const inv = (await db.get(`inv_${i.user.id}`)) || [];
      const e = new EmbedBuilder().setTitle("Inventario").setDescription(inv.length ? inv.join("\n") : "Vazio");
      return i.reply({ embeds: [e], ephemeral: true });
    }

    if (i.customId === "loja") {
      const e = new EmbedBuilder().setTitle("Loja").setDescription(
        "VIP 7D - 10 coins\nVIP 30D - 50 coins\nCG Mira abusiva - 45 coins\nCG Rei da TK - 45 coins"
      );
      const r = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("vip7").setLabel("VIP 7D").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId("vip30").setLabel("VIP 30D").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId("mira").setLabel("CG Mira abusiva").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId("rei").setLabel("CG Rei da TK").setStyle(ButtonStyle.Primary)
      );
      return i.reply({ embeds: [e], components: [r], ephemeral: true });
    }

    // Compras
    if (i.customId === "vip7") {
      if (!(await removerCoins(i.user.id, 10))) return i.reply({ content: "Sem coins", ephemeral: true });
      await db.set(`vip_${i.user.id}`, Date.now() + 604800000);
      canal?.send(`${i.user.tag} comprou VIP 7D`);
      return i.reply({ content: "Comprado", ephemeral: true });
    }

    if (i.customId === "vip30") {
      if (!(await removerCoins(i.user.id, 50))) return i.reply({ content: "Sem coins", ephemeral: true });
      await db.set(`vip_${i.user.id}`, Date.now() + 2592000000);
      canal?.send(`${i.user.tag} comprou VIP 30D`);
      return i.reply({ content: "Comprado", ephemeral: true });
    }

    if (i.customId === "mira") {
      if (!(await removerCoins(i.user.id, 45))) return i.reply({ content: "Sem coins", ephemeral: true });
      await db.push(`inv_${i.user.id}`, "Mira abusiva");
      canal?.send(`${i.user.tag} comprou Mira abusiva`);
      return i.reply({ content: "Adicionado", ephemeral: true });
    }

    if (i.customId === "rei") {
      if (!(await removerCoins(i.user.id, 45))) return i.reply({ content: "Sem coins", ephemeral: true });
      await db.push(`inv_${i.user.id}`, "Rei da TK");
      canal?.send(`${i.user.tag} comprou Rei da TK`);
      return i.reply({ content: "Adicionado", ephemeral: true });
    }
  }
});

client.once(Events.ClientReady, () => console.log("Bot online"));

client.login(process.env.TOKEN);