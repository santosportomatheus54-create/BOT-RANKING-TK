import { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder, REST, Routes, Events } from "discord.js";
import fs from "fs";

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const LOGS = "1471187137595441152"; // canal de logs
const DATA_FILE = "./data.json"; // arquivo de armazenamento

// Função para ler dados
function getData() {
  if (!fs.existsSync(DATA_FILE)) return {};
  return JSON.parse(fs.readFileSync(DATA_FILE));
}

// Função para salvar dados
function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// Função para pegar saldo
function saldo(id) {
  const data = getData();
  return data[`coins_${id}`] || 0;
}

// Adicionar coins
function addCoins(id, valor) {
  const data = getData();
  data[`coins_${id}`] = (data[`coins_${id}`] || 0) + valor;
  saveData(data);
}

// Adicionar XP
function addXP(id, valor) {
  const data = getData();
  data[`xp_${id}`] = (data[`xp_${id}`] || 0) + valor;
  saveData(data);
}

// Remover coins
function removerCoins(id, valor) {
  const data = getData();
  const atual = data[`coins_${id}`] || 0;
  if (atual < valor) return false;
  data[`coins_${id}`] = atual - valor;
  saveData(data);
  return true;
}

// Adicionar item inventário
function addInv(id, item) {
  const data = getData();
  if (!data[`inv_${id}`]) data[`inv_${id}`] = [];
  data[`inv_${id}`].push(item);
  saveData(data);
}

// Registro de comandos
const comandos = [
  new SlashCommandBuilder()
    .setName("painel")
    .setDescription("Abrir painel"),
  new SlashCommandBuilder()
    .setName("partida")
    .setDescription("Dar coins e XP para um player")
    .addUserOption(option =>
      option.setName("player")
        .setDescription("Escolha o player")
        .setRequired(true)
    )
].map(x => x.toJSON());

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);
(async () => {
  try {
    await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID), { body: comandos });
    console.log("Comandos registrados");
  } catch (e) {
    console.error("Erro comandos", e);
  }
})();

// Delay
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Eventos de interação
client.on(Events.InteractionCreate, async i => {
  try {
    if (i.isChatInputCommand()) {

      if (i.commandName === "painel") {
        const e = new EmbedBuilder()
          .setTitle("🌟 ORG TK – Divirta-se e Fature Coins! 🌟")
          .setDescription(
            "Entre no universo de ORG TK, o bot que transforma seu Discord em um verdadeiro mundo de aventuras e recompensas!\n\n" +
            "🎮 Partidas emocionantes: Ganhe moedas e XP a cada jogo!\n" +
            "💰 Ranking duplo: Compare seu desempenho com amigos – Coins e XP.\n" +
            "🛒 Loja completa: VIPs, armas especiais e a misteriosa Caixa de Prêmios!\n" +
            "🎒 Inventário personalizado: Guarde seus itens e conquistas.\n" +
            "📊 Painel interativo: Tudo organizado em botões bonitos e fáceis de usar.\n" +
            "Entre na ORG TK e mostre que você é o melhor farmador do servidor! 🚀"
          );

        const r = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("perfil").setLabel("Perfil").setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId("ranking").setLabel("Ranking").setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId("loja").setLabel("Loja").setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId("inventario").setLabel("Inventário").setStyle(ButtonStyle.Secondary)
        );

        await i.reply({ embeds: [e], components: [r] });
      }

      if (i.commandName === "partida") {
        const member = i.options.getUser("player");
        if (!member) return i.reply({ content: "Você precisa mencionar um player!", ephemeral: true });

        let coins = Math.floor(Math.random() * 10) + 1;

        const data = getData();
        const vip = data[`vip_${member.id}`];
        if (vip && vip > Date.now()) coins *= 2;

        const xp = Math.floor(Math.random() * 50) + 10;

        addCoins(member.id, coins);
        addXP(member.id, xp);

        const canal = client.channels.cache.get(LOGS);
        canal?.send(`${member.tag} ganhou ${coins} coins e ${xp} XP`);

        await delay(2000); // delay de 2 segundos
        await i.reply(`+${coins} coins | +${xp} XP para ${member.tag}`);
      }

    } else if (i.isButton()) {

      const canal = client.channels.cache.get(LOGS);

      if (i.customId === "perfil") {
        const coins = saldo(i.user.id);
        const xp = (getData()[`xp_${i.user.id}`]) || 0;

        const e = new EmbedBuilder()
          .setTitle("Perfil")
          .setDescription(`Coins: ${coins}\nXP: ${xp}`);

        return i.reply({ embeds: [e], ephemeral: true });
      }

      if (i.customId === "ranking") {
        const data = getData();
        const coinsRanking = Object.entries(data)
          .filter(([k]) => k.startsWith("coins_"))
          .map(([k, v]) => ({ id: k.replace("coins_", ""), coins: v }))
          .sort((a, b) => b.coins - a.coins)
          .slice(0, 10);

        const xpRanking = Object.entries(data)
          .filter(([k]) => k.startsWith("xp_"))
          .map(([k, v]) => ({ id: k.replace("xp_", ""), xp: v }))
          .sort((a, b) => b.xp - a.xp)
          .slice(0, 10);

        let desc = "**Ranking Coins:**\n";
        coinsRanking.forEach((u, idx) => { desc += `${idx + 1}. <@${u.id}> - ${u.coins} Coins\n`; });
        desc += "\n**Ranking XP:**\n";
        xpRanking.forEach((u, idx) => { desc += `${idx + 1}. <@${u.id}> - ${u.xp} XP\n`; });

        const e = new EmbedBuilder()
          .setTitle("Ranking")
          .setDescription(desc || "Sem dados");

        return i.reply({ embeds: [e], ephemeral: true });
      }

      if (i.customId === "loja") {
        const e = new EmbedBuilder()
          .setTitle("Loja")
          .setDescription(
            "VIP 7D - 10 coins\n" +
            "VIP 30D - 50 coins\n" +
            "CG Mira abusiva - 45 coins\n" +
            "CG Rei da TK - 45 coins\n" +
            "Caixa Misteriosa - 100 coins"
          );

        const r1 = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("vip7").setLabel("VIP 7D").setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId("vip30").setLabel("VIP 30D").setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId("mira").setLabel("CG Mira abusiva").setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId("rei").setLabel("CG Rei da TK").setStyle(ButtonStyle.Primary)
        );

        const r2 = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("caixa").setLabel("Caixa Misteriosa").setStyle(ButtonStyle.Secondary)
        );

        return i.reply({ embeds: [e], components: [r1, r2], ephemeral: true });
      }

      if (i.customId === "vip7") {
        if (!removerCoins(i.user.id, 10)) return i.reply({ content: "Sem coins", ephemeral: true });
        const data = getData();
        data[`vip_${i.user.id}`] = Date.now() + 604800000;
        saveData(data);
        canal?.send(`${i.user.tag} comprou VIP 7D`);
        return i.reply({ content: "Comprado", ephemeral: true });
      }

      if (i.customId === "vip30") {
        if (!removerCoins(i.user.id, 50)) return i.reply({ content: "Sem coins", ephemeral: true });
        const data = getData();
        data[`vip_${i.user.id}`] = Date.now() + 2592000000;
        saveData(data);
        canal?.send(`${i.user.tag} comprou VIP 30D`);
        return i.reply({ content: "Comprado", ephemeral: true });
      }

      if (i.customId === "mira") {
        if (!removerCoins(i.user.id, 45)) return i.reply({ content: "Sem coins", ephemeral: true });
        addInv(i.user.id, "Mira abusiva");
        canal?.send(`${i.user.tag} comprou Mira abusiva`);
        return i.reply({ content: "Adicionado", ephemeral: true });
      }

      if (i.customId === "rei") {
        if (!removerCoins(i.user.id, 45)) return i.reply({ content: "Sem coins", ephemeral: true });
        addInv(i.user.id, "Rei da TK");
        canal?.send(`${i.user.tag} comprou Rei da TK`);
        return i.reply({ content: "Adicionado", ephemeral: true });
      }

      if (i.customId === "caixa") {
        if (!removerCoins(i.user.id, 100)) return i.reply({ content: "Sem coins", ephemeral: true });

        const s = Math.random() * 100;
        let premio = "Nada";

        if (s <= 50) { premio = "300 XP"; addXP(i.user.id, 300); }
        else if (s <= 75) { premio = "600 XP"; addXP(i.user.id, 600); }
        else if (s <= 85) { premio = "Passe Booya"; addInv(i.user.id, "Passe Booya"); }
        else if (s <= 90) { premio = "Sala Paga"; addInv(i.user.id, "Sala Paga"); }

        canal?.send(`${i.user.tag} abriu Caixa Misteriosa e ganhou ${premio}`);
        return i.reply({ content: premio, ephemeral: true });
      }

      if (i.customId === "inventario") {
        const inv = getData()[`inv_${i.user.id}`] || [];
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

client.once(Events.ClientReady, () => console.log("Bot online"));

client.login(process.env.TOKEN);
