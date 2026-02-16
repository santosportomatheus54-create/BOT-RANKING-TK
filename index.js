import { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, Events } from "discord.js";
import fs from "fs";

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// Canal de logs
const LOGS = "1471187137595441152";

// Caminho do banco local
const dbPath = "./database.json";

// Função para ler o banco
function lerDB() {
  if (!fs.existsSync(dbPath)) fs.writeFileSync(dbPath, JSON.stringify({}));
  return JSON.parse(fs.readFileSync(dbPath));
}

// Função para salvar no banco
function salvarDB(data) {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

// Funções de moedas, XP e inventário
async function saldo(id) {
  const db = lerDB();
  return db[id]?.coins || 0;
}

async function adicionarCoins(id, valor) {
  const db = lerDB();
  if (!db[id]) db[id] = {};
  db[id].coins = (db[id].coins || 0) + valor;
  salvarDB(db);
}

async function removerCoins(id, valor) {
  const db = lerDB();
  if (!db[id] || (db[id].coins||0) < valor) return false;
  db[id].coins -= valor;
  salvarDB(db);
  return true;
}

async function adicionarXP(id, valor) {
  const db = lerDB();
  if (!db[id]) db[id] = {};
  db[id].xp = (db[id].xp || 0) + valor;
  salvarDB(db);
}

async function adicionarInv(id, item) {
  const db = lerDB();
  if (!db[id]) db[id] = {};
  if (!db[id].inv) db[id].inv = [];
  db[id].inv.push(item);
  salvarDB(db);
}

// Evento de interação de comando
client.on(Events.InteractionCreate, async i => {
  if (!i.isChatInputCommand()) return;

  // PAINEL
  if (i.commandName === "painel") {
    const embed = new EmbedBuilder()
      .setTitle("🌟 ORG TK")
      .setDescription("Bem-vindo ao sistema de farm! Clique nos botões abaixo para interagir.")
      .setColor("#00FFAA");

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("perfil").setLabel("Perfil").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("ranking").setLabel("Ranking XP").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("rankingCoins").setLabel("Ranking Coins").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("loja").setLabel("Loja").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId("inventario").setLabel("Inventário").setStyle(ButtonStyle.Secondary)
    );

    return i.reply({ embeds: [embed], components: [row] });
  }

  // PARTIDA
  if (i.commandName === "partida") {
    let coins = Math.floor(Math.random() * 10) + 1;
    let xp = Math.floor(Math.random() * 50) + 10;

    const db = lerDB();
    if (db[i.user.id]?.vip && db[i.user.id].vip > Date.now()) coins *= 2;

    await adicionarCoins(i.user.id, coins);
    await adicionarXP(i.user.id, xp);

    const canal = client.channels.cache.get(LOGS);
    canal?.send(`${i.user.tag} ganhou ${coins} coins e ${xp} XP na partida`);

    return i.reply(`🎮 Você ganhou **${coins} coins** e **${xp} XP**!`);
  }
});

// Evento de botões
client.on(Events.InteractionCreate, async i => {
  if (!i.isButton()) return;
  const canal = client.channels.cache.get(LOGS);

  // PERFIL
  if (i.customId === "perfil") {
    const coins = await saldo(i.user.id);
    const db = lerDB();
    const xp = db[i.user.id]?.xp || 0;
    const embed = new EmbedBuilder()
      .setTitle("📊 Perfil")
      .setDescription(`Coins: **${coins}**\nXP: **${xp}**`)
      .setColor("#FFD700");
    return i.reply({ embeds: [embed], ephemeral: true });
  }

  // RANKING XP
  if (i.customId === "ranking") {
    const db = lerDB();
    const ranking = Object.entries(db)
      .filter(([_,v]) => v.xp)
      .sort((a,b) => b[1].xp - a[1].xp)
      .slice(0,10);

    let desc = ranking.map(([id,v],idx)=> `${idx+1}. <@${id}> - ${v.xp} XP`).join("\n") || "Sem dados";
    const embed = new EmbedBuilder()
      .setTitle("🏆 Ranking XP")
      .setDescription(desc)
      .setColor("#FF00FF");
    return i.reply({ embeds: [embed], ephemeral: true });
  }

  // RANKING COINS
  if (i.customId === "rankingCoins") {
    const db = lerDB();
    const ranking = Object.entries(db)
      .filter(([_,v]) => v.coins)
      .sort((a,b) => b[1].coins - a[1].coins)
      .slice(0,10);

    let desc = ranking.map(([id,v],idx)=> `${idx+1}. <@${id}> - ${v.coins} Coins`).join("\n") || "Sem dados";
    const embed = new EmbedBuilder()
      .setTitle("💰 Ranking Coins")
      .setDescription(desc)
      .setColor("#00FFFF");
    return i.reply({ embeds: [embed], ephemeral: true });
  }

  // INVENTÁRIO
  if (i.customId === "inventario") {
    const db = lerDB();
    const inv = db[i.user.id]?.inv || [];
    const embed = new EmbedBuilder()
      .setTitle("🎒 Inventário")
      .setDescription(inv.length ? inv.join("\n") : "Vazio")
      .setColor("#FFA500");
    return i.reply({ embeds: [embed], ephemeral: true });
  }

  // LOJA
  if (i.customId === "loja") {
    const embed = new EmbedBuilder()
      .setTitle("🛒 Loja ORG TK")
      .setDescription(
        "**Itens disponíveis:**\n" +
        "VIP 7D - 10 coins\n" +
        "VIP 30D - 50 coins\n" +
        "CG Mira abusiva - 45 coins\n" +
        "CG Rei da TK - 45 coins\n" +
        "Caixa Misteriosa - 100 coins"
      )
      .setColor("#00FFAA");

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("vip7").setLabel("VIP 7D").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId("vip30").setLabel("VIP 30D").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId("mira").setLabel("CG Mira abusiva").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("rei").setLabel("CG Rei da TK").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("caixa").setLabel("Caixa Misteriosa").setStyle(ButtonStyle.Danger)
    );

    return i.reply({ embeds: [embed], components: [row], ephemeral: true });
  }

  // VIP 7D
  if(i.customId==="vip7"){
    if(!(await removerCoins(i.user.id,10))) return i.reply({content:"Sem coins!", ephemeral:true});
    await new Promise(r=>setTimeout(r,2000)); // delay 2s
    const db = lerDB();
    db[i.user.id].vip = Date.now() + 7*24*60*60*1000;
    salvarDB(db);
    canal?.send(`${i.user.tag} comprou VIP 7D`);
    return i.reply({content:"✅ VIP 7D comprado!", ephemeral:true});
  }

  // VIP 30D
  if(i.customId==="vip30"){
    if(!(await removerCoins(i.user.id,50))) return i.reply({content:"Sem coins!", ephemeral:true});
    await new Promise(r=>setTimeout(r,2000));
    const db = lerDB();
    db[i.user.id].vip = Date.now() + 30*24*60*60*1000;
    salvarDB(db);
    canal?.send(`${i.user.tag} comprou VIP 30D`);
    return i.reply({content:"✅ VIP 30D comprado!", ephemeral:true});
  }

  // CG Mira abusiva
  if(i.customId==="mira"){
    if(!(await removerCoins(i.user.id,45))) return i.reply({content:"Sem coins!", ephemeral:true});
    await new Promise(r=>setTimeout(r,2000));
    await adicionarInv(i.user.id,"CG Mira abusiva");
    canal?.send(`${i.user.tag} comprou CG Mira abusiva`);
    return i.reply({content:"✅ Item adicionado ao inventário!", ephemeral:true});
  }

  // CG Rei da TK
  if(i.customId==="rei"){
    if(!(await removerCoins(i.user.id,45))) return i.reply({content:"Sem coins!", ephemeral:true});
    await new Promise(r=>setTimeout(r,2000));
    await adicionarInv(i.user.id,"CG Rei da TK");
    canal?.send(`${i.user.tag} comprou CG Rei da TK`);
    return i.reply({content:"✅ Item adicionado ao inventário!", ephemeral:true});
  }

  // Caixa Misteriosa
  if(i.customId==="caixa"){
    if(!(await removerCoins(i.user.id,100))) return i.reply({content:"Sem coins!", ephemeral:true});
    await new Promise(r=>setTimeout(r,2000));

    const premios = [
      {nome:"300 XP", func:async()=> await adicionarXP(i.user.id,300)},
      {nome:"600 XP", func:async()=> await adicionarXP(i.user.id,600)},
      {nome:"Passe Booya", func:async()=> await adicionarInv(i.user.id,"Passe Booya")},
      {nome:"Sala paga", func:async()=> await adicionarInv(i.user.id,"Sala paga")},
      {nome:"Item secreto", func:async()=> await adicionarInv(i.user.id,"Item secreto")}
    ];

    const premio = premios[Math.floor(Math.random()*premios.length)];
    await premio.func();

    canal?.send(`${i.user.tag} comprou uma caixa misteriosa e ganhou: ${premio.nome}`);
    return i.reply({content:`🎁 Você ganhou: ${premio.nome}`, ephemeral:true});
  }
});

client.once(Events.ClientReady, ()=>console.log("Bot online"));
client.login(process.env.TOKEN);
