import { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder, REST, Routes, Events } from "discord.js";
import { QuickDB } from "quick.db";

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const db = new QuickDB();

const LOGS = process.env.LOGS;

const comandos = [
  new SlashCommandBuilder().setName("painel").setDescription("Abrir painel"),
  new SlashCommandBuilder().setName("partida").setDescription("Ganhar recompensa")
].map(x => x.toJSON());

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

(async () => {
  try {
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: comandos }
    );
    console.log("Comandos registrados");
  } catch (e) {
    console.error("Erro ao registrar comandos", e);
  }
})();

async function saldo(id) {
  try { return (await db.get(`coins_${id}`)) || 0; }
  catch { return 0; }
}

async function removerCoins(id, valor) {
  try {
    const atual = await saldo(id);
    if (atual < valor) return false;
    await db.sub(`coins_${id}`, valor);
    return true;
  } catch { return false; }
}

client.on(Events.InteractionCreate, async i => {
  try {
    if (i.isChatInputCommand()) {

      if (i.commandName === "painel") {
        const e = new EmbedBuilder()
          .setTitle("ORG TK")
          .setDescription("Sistema de farm");

        const r = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("perfil").setLabel("Perfil").setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId("ranking_xp").setLabel("Ranking XP").setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId("ranking_coins").setLabel("Ranking Coins").setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId("loja").setLabel("Loja").setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId("inventario").setLabel("Inventário").setStyle(ButtonStyle.Secondary)
        );

        return i.reply({ embeds: [e], components: [r] });
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

        return i.reply(`+${coins} Coins | +${xp} XP`);
      }

    }

    if (i.isButton()) {
      const canal = client.channels.cache.get(LOGS);

      if (i.customId === "perfil") {
        const coins = await saldo(i.user.id);
        const xp = (await db.get(`xp_${i.user.id}`)) || 0;

        const e = new EmbedBuilder()
          .setTitle("Perfil")
          .setDescription(`Coins: ${coins}\nXP: ${xp}`);

        return i.reply({ embeds: [e], ephemeral: true });
      }

      if (i.customId === "ranking_xp") {
        const all = await db.all();
        const users = all.filter(x => x.id.startsWith("xp_"))
          .sort((a, b) => b.value - a.value)
          .slice(0, 10);

        let desc = "";
        users.forEach((u, idx) => {
          const id = u.id.replace("xp_", "");
          desc += `${idx + 1}. <@${id}> - ${u.value} XP\n`;
        });

        const e = new EmbedBuilder().setTitle("Ranking XP").setDescription(desc || "Sem dados");

        return i.reply({ embeds: [e], ephemeral: true });
      }

      if (i.customId === "ranking_coins") {
        const all = await db.all();
        const users = all.filter(x => x.id.startsWith("coins_"))
          .sort((a, b) => b.value - a.value)
          .slice(0, 10);

        let desc = "";
        users.forEach((u, idx) => {
          const id = u.id.replace("coins_", "");
          desc += `${idx + 1}. <@${id}> - ${u.value} Coins\n`;
        });

        const e = new EmbedBuilder().setTitle("Ranking Coins").setDescription(desc || "Sem dados");

        return i.reply({ embeds: [e], ephemeral: true });
      }

      if (i.customId === "loja") {
        const e = new EmbedBuilder()
          .setTitle("Loja")
          .setDescription(
            "VIP 7D - 10 Coins\nVIP 30D - 50 Coins\nCG Mira abusiva - 45 Coins\nCG Rei da TK - 45 Coins\nCaixa Misteriosa - Aleatório"
          );

        const r1 = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("vip7").setLabel("VIP 7D").setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId("vip30").setLabel("VIP 30D").setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId("mira").setLabel("CG Mira abusiva").setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId("rei").setLabel("CG Rei da TK").setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId("caixa").setLabel("Caixa Misteriosa").setStyle(ButtonStyle.Secondary)
        );

        return i.reply({ embeds: [e], components: [r1], ephemeral: true });
      }

      // Compras Loja
      if (i.customId === "vip7") {
        if (!(await removerCoins(i.user.id, 10))) return i.reply({ content: "Sem coins", ephemeral: true });
        await db.set(`vip_${i.user.id}`, Date.now() + 7 * 24 * 60 * 60 * 1000);
        canal?.send(`${i.user.tag} comprou VIP 7D`);
        return i.reply({ content: "Comprado VIP 7D", ephemeral: true });
      }

      if (i.customId === "vip30") {
        if (!(await removerCoins(i.user.id, 50))) return i.reply({ content: "Sem coins", ephemeral: true });
        await db.set(`vip_${i.user.id}`, Date.now() + 30 * 24 * 60 * 60 * 1000);
        canal?.send(`${i.user.tag} comprou VIP 30D`);
        return i.reply({ content: "Comprado VIP 30D", ephemeral: true });
      }

      if (i.customId === "mira") {
        if (!(await removerCoins(i.user.id, 45))) return i.reply({ content: "Sem coins", ephemeral: true });
        await db.push(`inv_${i.user.id}`, "CG Mira abusiva");
        canal?.send(`${i.user.tag} comprou CG Mira abusiva`);
        return i.reply({ content: "Adicionado ao inventário", ephemeral: true });
      }

      if (i.customId === "rei") {
        if (!(await removerCoins(i.user.id, 45))) return i.reply({ content: "Sem coins", ephemeral: true });
        await db.push(`inv_${i.user.id}`, "CG Rei da TK");
        canal?.send(`${i.user.tag} comprou CG Rei da TK`);
        return i.reply({ content: "Adicionado ao inventário", ephemeral: true });
      }

      if (i.customId === "caixa") {
        const s = Math.random() * 100;
        let premio = "Nada";

        if (s <= 50) { premio = "300 XP"; await db.add(`xp_${i.user.id}`, 300); }
        else if (s <= 75) { premio = "600 XP"; await db.add(`xp_${i.user.id}`, 600); }
        else if (s <= 85) { premio = "100 Coins"; await db.add(`coins_${i.user.id}`, 100); }
        else if (s <= 90) { premio = "Passe Booya"; await db.push(`inv_${i.user.id}`, "Passe Booya"); }
        else if (s <= 91) { premio = "Sala paga"; await db.push(`inv_${i.user.id}`, "Sala paga"); }

        canal?.send(`${i.user.tag} abriu caixa e ganhou ${premio}`);
        return i.reply({ content: `Você ganhou: ${premio}`, ephemeral: true });
      }

      if (i.customId === "inventario") {
        const inv = (await db.get(`inv_${i.user.id}`)) || [];
        const e = new EmbedBuilder()
          .setTitle("Inventário")
          .setDescription(inv.length ? inv.join("\n") : "Vazio");
        return i.reply({ embeds: [e], ephemeral: true });
      }

    }
  } catch (e) {
    console.error(e);
  }
});

client.once(Events.ClientReady, () => {
  console.log("Bot online");
});

client.login(process.env.TOKEN);