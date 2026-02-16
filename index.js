import { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, Events } from "discord.js";
import fs from "fs/promises";

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const LOGS = "1471187137595441152"; // coloque o ID do canal de logs
const filePath = "./database.json"; // banco local

// Funções para ler/escrever no JSON
async function readDB() {
  try { return JSON.parse(await fs.readFile(filePath, "utf8")); } 
  catch { return {}; }
}
async function writeDB(data) { await fs.writeFile(filePath, JSON.stringify(data, null, 2)); }

async function saldo(id) { const db = await readDB(); return db[`coins_${id}`] || 0; }
async function removerCoins(id, valor) { const db = await readDB(); if((db[`coins_${id}`]||0)<valor) return false; db[`coins_${id}`]-=valor; await writeDB(db); return true; }
async function adicionarCoins(id, valor){ const db = await readDB(); db[`coins_${id}`]=(db[`coins_${id}`]||0)+valor; await writeDB(db); }
async function adicionarXP(id, valor){ const db = await readDB(); db[`xp_${id}`]=(db[`xp_${id}`]||0)+valor; await writeDB(db); }
async function adicionarInv(id, item){ const db = await readDB(); db[`inv_${id}`]=db[`inv_${id}`]||[]; db[`inv_${id}`].push(item); await writeDB(db); }
async function adicionarVIP(id, tempo){ const db = await readDB(); db[`vip_${id}`]=Date.now()+tempo; await writeDB(db); }

function delay(ms){ return new Promise(res=>setTimeout(res, ms)); }

// Interações
client.on(Events.InteractionCreate, async i => {
  try {
    await delay(2000);

    if(i.isChatInputCommand()){
      if(i.commandName==="painel"){
        const e=new EmbedBuilder().setTitle("ORG TK").setDescription("Sistema de farm");
        const row=new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("perfil").setLabel("Perfil").setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId("ranking").setLabel("Ranking").setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId("loja").setLabel("Loja").setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId("inventario").setLabel("Inventario").setStyle(ButtonStyle.Secondary)
        );
        return i.reply({embeds:[e],components:[row]});
      }
      if(i.commandName==="partida"){
        let coins=Math.floor(Math.random()*10)+1;
        const db=await readDB();
        if(db[`vip_${i.user.id}`] && db[`vip_${i.user.id}`]>Date.now()) coins*=2;
        const xp=Math.floor(Math.random()*50)+10;
        await adicionarCoins(i.user.id,coins);
        await adicionarXP(i.user.id,xp);
        const canal=client.channels.cache.get(LOGS);
        canal?.send(`${i.user.tag} ganhou ${coins} coins e ${xp} XP`);
        return i.reply(`+${coins} coins | +${xp} XP`);
      }
    }

    if(i.isButton()){
      const canal=client.channels.cache.get(LOGS);
      const db=await readDB();

      if(i.customId==="perfil"){
        const coins=await saldo(i.user.id);
        const xp=db[`xp_${i.user.id}`]||0;
        return i.reply({embeds:[new EmbedBuilder().setTitle("Perfil").setDescription(`Coins: ${coins}\nXP: ${xp}`)],ephemeral:true});
      }

      if(i.customId==="ranking"){
        const users=Object.entries(db).filter(([k,v])=>k.startsWith("xp_")).sort((a,b)=>b[1]-a[1]).slice(0,10);
        let desc="";
        users.forEach(([k,v],i)=>desc+=`${i+1}. <@${k.replace("xp_","")}> - ${v} XP\n`);
        return i.reply({embeds:[new EmbedBuilder().setTitle("Ranking").setDescription(desc||"Sem dados")],ephemeral:true});
      }

      if(i.customId==="inventario"){
        const inv=db[`inv_${i.user.id}`]||[];
        return i.reply({embeds:[new EmbedBuilder().setTitle("Inventario").setDescription(inv.length?inv.join("\n"):"Vazio")],ephemeral:true});
      }

      if(i.customId==="loja"){
        const e=new EmbedBuilder().setTitle("Loja").setDescription(
          "VIP 7D - 10 coins\nVIP 30D - 50 coins\nCG Mira abusiva - 45 coins\nCG Rei da TK - 45 coins"
        );
        const row=new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("vip7").setLabel("VIP 7D").setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId("vip30").setLabel("VIP 30D").setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId("mira").setLabel("CG Mira abusiva").setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId("rei").setLabel("CG Rei da TK").setStyle(ButtonStyle.Primary)
        );
        return i.reply({embeds:[e],components:[row],ephemeral:true});
      }

      // Comprar itens
      if(i.customId==="vip7"){ if(!await removerCoins(i.user.id,10)) return i.reply({content:"Sem coins",ephemeral:true}); await adicionarVIP(i.user.id,604800000); canal?.send(`${i.user.tag} comprou VIP 7D`); return i.reply({content:"Comprado",ephemeral:true}); }
      if(i.customId==="vip30"){ if(!await removerCoins(i.user.id,50)) return i.reply({content:"Sem coins",ephemeral:true}); await adicionarVIP(i.user.id,2592000000); canal?.send(`${i.user.tag} comprou VIP 30D`); return i.reply({content:"Comprado",ephemeral:true}); }
      if(i.customId==="mira"){ if(!await removerCoins(i.user.id,45)) return i.reply({content:"Sem coins",ephemeral:true}); await adicionarInv(i.user.id,"Mira abusiva"); canal?.send(`${i.user.tag} comprou Mira abusiva`); return i.reply({content:"Adicionado",ephemeral:true}); }
      if(i.customId==="rei"){ if(!await removerCoins(i.user.id,45)) return i.reply({content:"Sem coins",ephemeral:true}); await adicionarInv(i.user.id,"Rei da TK"); canal?.send(`${i.user.tag} comprou Rei da TK`); return i.reply({content:"Adicionado",ephemeral:true}); }
    }

  } catch(e){ console.error(e); }
});

client.once(Events.ClientReady,()=>console.log("Bot online"));

// Token via variável do Railway
client.login(process.env.TOKEN);
