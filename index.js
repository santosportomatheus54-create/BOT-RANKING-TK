import { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder, REST, Routes, Events } from "discord.js";
import fs from "fs";

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// ---- Banco simples em JSON ----
const DB_FILE = "./data.json";
let dbData = {};
if (fs.existsSync(DB_FILE)) {
  dbData = JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
}
function saveDB() { fs.writeFileSync(DB_FILE, JSON.stringify(dbData, null, 2)); }

function getCoins(id) { return dbData[`coins_${id}`] || 0; }
function addCoins(id, amount) { dbData[`coins_${id}`] = getCoins(id) + amount; saveDB(); }
function addXP(id, amount) { dbData[`xp_${id}`] = (dbData[`xp_${id}`] || 0) + amount; saveDB(); }
function addWins(id) { dbData[`wins_${id}`] = (dbData[`wins_${id}`] || 0) + 1; saveDB(); }
function addLosses(id) { dbData[`losses_${id}`] = (dbData[`losses_${id}`] || 0) + 1; saveDB(); }
function addSteak(id, amount) { dbData[`steak_${id}`] = (dbData[`steak_${id}`] || 0) + amount; saveDB(); }

function removeCoins(id, amount) {
  if (getCoins(id) < amount) return false;
  dbData[`coins_${id}`] -= amount;
  saveDB();
  return true;
}
function pushItem(id, item) { 
  if (!dbData[`inv_${id}`]) dbData[`inv_${id}`] = [];
  dbData[`inv_${id}`].push(item);
  saveDB();
}

// ---- Logs ----
const LOGS = "1471187137595441152";

// ---- Comandos ----
const comandos = [
  new SlashCommandBuilder()
    .setName("painel")
    .setDescription("Abrir painel do ORG TK"),
  new SlashCommandBuilder()
    .setName("partida")
    .setDescription("Dar coins e XP para um player")
    .addUserOption(opt => opt.setName("player").setDescription("Escolha o player").setRequired(true))
].map(x => x.toJSON());

// ---- Registrar comandos ----
const rest = new REST({ version: "10" });
(async () => {
  try {
    await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID), { body: comandos });
    console.log("Comandos registrados!");
  } catch(e) { console.error("Erro ao registrar comandos:", e); }
})();

// ---- Comandos ----
client.on(Events.InteractionCreate, async i => {
  if (!i.isChatInputCommand()) return;

  if (i.commandName === "painel") {
    const embed = new EmbedBuilder()
      .setTitle("🌟 ORG TK – Divirta-se e Fature Coins! 🌟")
      .setDescription("Entre no universo de ORG TK, o bot que transforma seu Discord em um mundo de aventuras e recompensas!\n\n🎮 Partidas emocionantes\n💰 Ranking de Coins e XP\n🛒 Loja completa\n🎒 Inventário personalizado\n📊 Painel interativo")
      .setColor("#FFD700");

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("perfil").setLabel("Perfil").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("ranking").setLabel("Ranking").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("loja").setLabel("Loja").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId("inventario").setLabel("Inventário").setStyle(ButtonStyle.Secondary)
    );

    await i.reply({ embeds: [embed], components: [row] });
  }

  if (i.commandName === "partida") {
    const player = i.options.getUser("player");
    if (!player) return i.reply("Usuário inválido!");

    let coins = Math.floor(Math.random() * 10) + 1;
    let xp = Math.floor(Math.random() * 50) + 10;

    addCoins(player.id, coins);
    addXP(player.id, xp);

    // Adiciona vitórias para exemplo
    addWins(player.id);
    addSteak(player.id, 1); // adiciona 1 steak por partida

    const canal = client.channels.cache.get(LOGS);
    canal?.send(`<@${player.id}> ganhou ${coins} coins, ${xp} XP, e 1 Steak!`);

    await i.reply(`+${coins} coins | +${xp} XP | +1 Steak para <@${player.id}>`);
  }
});

// ---- Botões ----
client.on(Events.InteractionCreate, async i => {
  if (!i.isButton()) return;
  const canal = client.channels.cache.get(LOGS);

  if (i.customId === "perfil") {
    const coins = getCoins(i.user.id);
    const xp = dbData[`xp_${i.user.id}`] || 0;
    const wins = dbData[`wins_${i.user.id}`] || 0;
    const losses = dbData[`losses_${i.user.id}`] || 0;
    const steak = dbData[`steak_${i.user.id}`] || 0;

    const embed = new EmbedBuilder()
      .setTitle("Perfil")
      .setDescription(`Coins: ${coins}\nXP: ${xp}\nVitórias: ${wins}\nDerrotas: ${losses}\nSteak: ${steak}`)
      .setColor("#00FFFF");

    return i.reply({ embeds: [embed], ephemeral: true });
  }

  if (i.customId === "ranking") {
    const allXP = Object.entries(dbData).filter(([k, v]) => k.startsWith("xp_"));
    const allCoins = Object.entries(dbData).filter(([k, v]) => k.startsWith("coins_"));

    const topXP = allXP.sort((a,b)=>b[1]-a[1]).slice(0,10);
    const topCoins = allCoins.sort((a,b)=>b[1]-a[1]).slice(0,10);

    let desc = "**Top XP:**\n";
    topXP.forEach(([k,v], idx) => desc += `${idx+1}. <@${k.replace("xp_","")}> - ${v} XP\n`);
    desc += "\n**Top Coins:**\n";
    topCoins.forEach(([k,v], idx) => desc += `${idx+1}. <@${k.replace("coins_","")}> - ${v} Coins\n`);

    const embed = new EmbedBuilder().setTitle("Ranking").setDescription(desc).setColor("#FFA500");
    return i.reply({ embeds: [embed], ephemeral: true });
  }

  if (i.customId === "loja") {
    const embed = new EmbedBuilder()
      .setTitle("Loja")
      .setDescription(
        "VIP 7D - 10 coins\nVIP 30D - 50 coins\nCG Mira abusiva - 45 coins\nCG Rei da TK - 45 coins\nCaixa Misteriosa - 100 coins"
      )
      .setColor("#00FF00");
    return i.reply({ embeds: [embed], ephemeral: true });
  }

  if (i.customId === "inventario") {
    const inv = dbData[`inv_${i.user.id}`] || [];
    const embed = new EmbedBuilder()
      .setTitle("Inventário")
      .setDescription(inv.length ? inv.join("\n") : "Vazio")
      .setColor("#FF00FF");
    return i.reply({ embeds: [embed], ephemeral: true });
  }

  if (i.customId === "caixa") {
    if (!removeCoins(i.user.id, 100)) return i.reply({ content: "Sem coins!", ephemeral: true });

    const r = Math.random() * 100;
    let premio = "Nada";
    if (r <= 50) { premio = "300 XP"; addXP(i.user.id, 300); }
    else if (r <= 75) { premio = "600 XP"; addXP(i.user.id, 600); }
    else if (r <= 85) { premio = "100 Coins"; addCoins(i.user.id, 100); }
    else if (r <= 90) { premio = "Passe Booya"; pushItem(i.user.id, "Passe Booya"); }
    else if (r <= 91) { premio = "Sala paga"; pushItem(i.user.id, "Sala paga"); }

    canal?.send(`<@${i.user.id}> abriu Caixa Misteriosa e ganhou ${premio}`);
    return i.reply({ content: `Você ganhou: ${premio}`, ephemeral: true });
  }
});

// ---- Bot pronto ----
client.once(Events.ClientReady, () => console.log("Bot online!"));
client.login(process.env.TOKEN);
