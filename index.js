import { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, REST, Routes, Events } from "discord.js";
import { QuickDB } from "quick.db";
import dotenv from "dotenv";
dotenv.config();

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const db = new QuickDB();

const LOGS = "1471187137595441152";

// Comandos do bot
const comandos = [
  { name: "painel", description: "Abrir painel" },
  { name: "partida", description: "Ganhar recompensa" }
];

// Registrar comandos no servidor
const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);
(async () => {
  await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID), { body: comandos });
})();

// Funções de saldo e remover coins
async function saldo(id) { return (await db.get(`coins_${id}`)) || 0; }
async function removerCoins(id, valor) { const atual = await saldo(id); if(atual < valor) return false; await db.sub(`coins_${id}`, valor); return true; }

// Comandos de chat
client.on(Events.InteractionCreate, async i => {
  try {
    if(i.isChatInputCommand()){
      // Painel
      if(i.commandName==="painel"){
        const e = new EmbedBuilder().setTitle("ORG TK").setDescription("Sistema de farm");
        const r = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("perfil").setLabel("Perfil").setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId("ranking").setLabel("Ranking").setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId("loja").setLabel("Loja").setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId("inventario").setLabel("Inventario").setStyle(ButtonStyle.Secondary)
        );
        return i.reply({embeds:[e],components:[r]});
      }

      // Partida
      if(i.commandName==="partida"){
        let coins = Math.floor(Math.random()*10)+1;
        const vip = await db.get(`vip_${i.user.id}`);
        if(vip && vip > Date.now()) coins *= 2;
        const xp = Math.floor(Math.random()*50)+10;
        await db.add(`coins_${i.user.id}`, coins);
        await db.add(`xp_${i.user.id}`, xp);
        const canal = client.channels.cache.get(LOGS);
        canal?.send(`${i.user.tag} ganhou ${coins} coins e ${xp} xp`);
        return i.reply(`+${coins} coins | +${xp} XP`);
      }
    }

    // Botões
    if(i.isButton()){
      const canal = client.channels.cache.get(LOGS);

      // Perfil
      if(i.customId==="perfil"){
        const coins = await saldo(i.user.id);
        const xp = (await db.get(`xp_${i.user.id}`)) || 0;
        const e = new EmbedBuilder().setTitle("Perfil").setDescription(`Coins: ${coins}\nXP: ${xp}`);
        return i.reply({embeds:[e],ephemeral:true});
      }

      // Ranking XP e Coins
      if(i.customId==="ranking"){
        const all = await db.all();
        const usersXP = all.filter(x=>x.id.startsWith("xp_")).sort((a,b)=>b.value-a.value).slice(0,10);
        const usersCoins = all.filter(x=>x.id.startsWith("coins_")).sort((a,b)=>b.value-a.value).slice(0,10);
        let descXP="", descCoins="";
        usersXP.forEach((u,index)=>descXP+=`${index+1}. <@${u.id.replace("xp_","")}> - ${u.value} XP\n`);
        usersCoins.forEach((u,index)=>descCoins+=`${index+1}. <@${u.id.replace("coins_","")}> - ${u.value} Coins\n`);
        const e = new EmbedBuilder().setTitle("Ranking XP & Coins").setDescription(`XP:\n${descXP||"Sem dados"}\nCoins:\n${descCoins||"Sem dados"}`);
        return i.reply({embeds:[e],ephemeral:true});
      }

      // Inventario
      if(i.customId==="inventario"){
        const inv = (await db.get(`inv_${i.user.id}`))||[];
        const e = new EmbedBuilder().setTitle("Inventario").setDescription(inv.length?inv.join("\n"):"Vazio");
        return i.reply({embeds:[e],ephemeral:true});
      }

      // Loja
      if(i.customId==="loja"){
        const e = new EmbedBuilder().setTitle("Loja").setDescription(
          "VIP 7D - 10 coins\nVIP 30D - 50 coins\nCG Mira abusiva - 45 coins\nCG Rei da TK - 45 coins\nCaixa misteriosa"
        );
        const r1 = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("vip7").setLabel("VIP 7D").setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId("vip30").setLabel("VIP 30D").setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId("mira").setLabel("CG Mira abusiva").setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId("rei").setLabel("CG Rei da TK").setStyle(ButtonStyle.Primary)
        );
        const r2 = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("caixa").setLabel("Caixa misteriosa").setStyle(ButtonStyle.Secondary)
        );
        return i.reply({embeds:[e],components:[r1,r2],ephemeral:true});
      }

      // VIP 7D
      if(i.customId==="vip7"){
        if(!(await removerCoins(i.user.id,10))) return i.reply({content:"Sem coins",ephemeral:true});
        await db.set(`vip_${i.user.id}`, Date.now()+604800000);
        canal?.send(`${i.user.tag} comprou VIP 7D`);
        return i.reply({content:"Comprado",ephemeral:true});
      }

      // VIP 30D
      if(i.customId==="vip30"){
        if(!(await removerCoins(i.user.id,50))) return i.reply({content:"Sem coins",ephemeral:true});
        await db.set(`vip_${i.user.id}`, Date.now()+2592000000);
        canal?.send(`${i.user.tag} comprou VIP 30D`);
        return i.reply({content:"Comprado",ephemeral:true});
      }

      // CG Mira
      if(i.customId==="mira"){
        if(!(await removerCoins(i.user.id,45))) return i.reply({content:"Sem coins",ephemeral:true});
        await db.push(`inv_${i.user.id}`,"Mira abusiva");
        canal?.send(`${i.user.tag} comprou Mira abusiva`);
        return i.reply({content:"Adicionado",ephemeral:true});
      }

      // CG Rei
      if(i.customId==="rei"){
        if(!(await removerCoins(i.user.id,45))) return i.reply({content:"Sem coins",ephemeral:true});
        await db.push(`inv_${i.user.id}`,"Rei da TK");
        canal?.send(`${i.user.tag} comprou Rei da TK`);
        return i.reply({content:"Adicionado",ephemeral:true});
      }

      // Caixa misteriosa
      if(i.customId==="caixa"){
        const s=Math.random()*100;
        let premio="Nada";
        if(s<=50){ premio="300 XP"; await db.add(`xp_${i.user.id}`,300); }
        else if(s<=75){ premio="600 XP"; await db.add(`xp_${i.user.id}`,600); }
        else if(s<=85){ premio="100 Dimas"; await db.add(`coins_${i.user.id}`,100); }
        else if(s<=90){ premio="Passe Booya"; await db.push(`inv_${i.user.id}`,"Passe Booya"); }
        else if(s<=91){ premio="Sala paga"; await db.push(`inv_${i.user.id}`,"Sala paga"); }
        canal?.send(`${i.user.tag} abriu caixa e ganhou ${premio}`);
        return i.reply({content:premio,ephemeral:true});
      }
    }

  } catch(e){ console.error(e); }
});

client.once(Events.ClientReady, ()=>console.log("Bot online"));
client.login(process.env.TOKEN);