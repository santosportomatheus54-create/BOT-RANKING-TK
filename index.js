import { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, Events } from "discord.js";
import fs from "fs";

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// Variáveis (coloque no Railway → Settings → Variables)
const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;
const LOGS_CHANNEL = process.env.LOGS_CHANNEL;

// Arquivo JSON para armazenar dados
const dbFile = "./database.json";
let dbData = {};
if (fs.existsSync(dbFile)) dbData = JSON.parse(fs.readFileSync(dbFile).toString());

function saveDB() {
  fs.writeFileSync(dbFile, JSON.stringify(dbData, null, 2));
}

// --- FUNÇÕES ---
function getCoins(id) { return dbData[`coins_${id}`] || 0; }
function addCoins(id, valor) { dbData[`coins_${id}`] = getCoins(id) + valor; saveDB(); }
function removeCoins(id, valor) { const atual = getCoins(id); if (atual < valor) return false; dbData[`coins_${id}`] = atual - valor; saveDB(); return true; }

function getXP(id) { return dbData[`xp_${id}`] || 0; }
function addXP(id, valor) { dbData[`xp_${id}`] = getXP(id) + valor; saveDB(); }

function addItem(id, item) { if (!dbData[`inv_${id}`]) dbData[`inv_${id}`] = []; dbData[`inv_${id}`].push(item); saveDB(); }
function getInventory(id) { return dbData[`inv_${id}`] || []; }

function setVIP(id, ms) { dbData[`vip_${id}`] = Date.now() + ms; saveDB(); }
function isVIP(id) { return dbData[`vip_${id}`] && dbData[`vip_${id}`] > Date.now(); }

// --- INTERAÇÕES ---
client.on(Events.InteractionCreate, async interaction => {
  try {
    const canal = client.channels.cache.get(LOGS_CHANNEL);

    // --- Comandos ---
    if (interaction.isChatInputCommand()) {
      // Painel
      if (interaction.commandName === "painel") {
        const embed = new EmbedBuilder().setTitle("ORG TK").setDescription("Sistema de farm");
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("perfil").setLabel("Perfil").setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId("ranking_xp").setLabel("Ranking XP").setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId("ranking_coins").setLabel("Ranking Coins").setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId("loja").setLabel("Loja").setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId("inventario").setLabel("Inventário").setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId("caixa").setLabel("Caixa Misteriosa").setStyle(ButtonStyle.Danger)
        );
        return interaction.reply({ embeds: [embed], components: [row] });
      }

      // Partida
      if (interaction.commandName === "partida") {
        let coins = Math.floor(Math.random() * 10) + 1;
        if (isVIP(interaction.user.id)) coins *= 2;
        const xp = Math.floor(Math.random() * 50) + 10;

        addCoins(interaction.user.id, coins);
        addXP(interaction.user.id, xp);

        canal?.send(`${interaction.user.tag} ganhou ${coins} coins e ${xp} XP`);
        return interaction.reply(`+${coins} coins | +${xp} XP`);
      }
    }

    // --- Botões ---
    if (interaction.isButton()) {

      // Perfil
      if (interaction.customId === "perfil") {
        const embed = new EmbedBuilder()
          .setTitle("Perfil")
          .setDescription(`Coins: ${getCoins(interaction.user.id)}\nXP: ${getXP(interaction.user.id)}\nVIP: ${isVIP(interaction.user.id) ? "Ativo" : "Inativo"}`);
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      // Ranking XP
      if (interaction.customId === "ranking_xp") {
        const users = Object.entries(dbData)
          .filter(([k]) => k.startsWith("xp_"))
          .map(([k,v]) => [k.replace("xp_",""), v])
          .sort((a,b)=>b[1]-a[1])
          .slice(0,10);
        let desc = "";
        users.forEach(([id,xp],i)=>desc+=`${i+1}. <@${id}> - ${xp} XP\n`);
        return interaction.reply({ embeds:[new EmbedBuilder().setTitle("Ranking XP").setDescription(desc||"Sem dados")], ephemeral:true });
      }

      // Ranking Coins
      if (interaction.customId === "ranking_coins") {
        const users = Object.entries(dbData)
          .filter(([k]) => k.startsWith("coins_"))
          .map(([k,v]) => [k.replace("coins_",""), v])
          .sort((a,b)=>b[1]-a[1])
          .slice(0,10);
        let desc = "";
        users.forEach(([id,coins],i)=>desc+=`${i+1}. <@${id}> - ${coins} coins\n`);
        return interaction.reply({ embeds:[new EmbedBuilder().setTitle("Ranking Coins").setDescription(desc||"Sem dados")], ephemeral:true });
      }

      // Inventário
      if (interaction.customId === "inventario") {
        const inv = getInventory(interaction.user.id);
        return interaction.reply({ embeds:[new EmbedBuilder().setTitle("Inventário").setDescription(inv.length ? inv.join("\n") : "Vazio")], ephemeral:true });
      }

      // Loja
      if (interaction.customId === "loja") {
        const embed = new EmbedBuilder()
          .setTitle("Loja")
          .setDescription("VIP 7D - 10 coins\nVIP 30D - 50 coins\nCG Mira abusiva - 45 coins\nCG Rei da TK - 45 coins");
        return interaction.reply({ embeds:[embed], ephemeral:true });
      }

      // Caixa Misteriosa
      if (interaction.customId === "caixa") {
        const chance = Math.random()*100;
        let premio = "Nada";

        if(chance <= 50){ addXP(interaction.user.id,300); premio="300 XP"; }
        else if(chance<=75){ addXP(interaction.user.id,600); premio="600 XP"; }
        else if(chance<=85){ addCoins(interaction.user.id,100); premio="100 Coins"; }
        else if(chance<=90){ addItem(interaction.user.id,"Passe Booya"); premio="Passe Booya"; }
        else if(chance<=95){ addItem(interaction.user.id,"Sala paga"); premio="Sala paga"; }
        else { addCoins(interaction.user.id,500); premio="500 Coins (Sorte Grande!)"; }

        canal?.send(`${interaction.user.tag} abriu caixa e ganhou ${premio}`);
        return interaction.reply({ content:`Você ganhou: ${premio}`, ephemeral:true });
      }

    }

  } catch(e) { console.error(e); }
});

client.once(Events.ClientReady, ()=>console.log("Bot online"));
client.login(TOKEN);