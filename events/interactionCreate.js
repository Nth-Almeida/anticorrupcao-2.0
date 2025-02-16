const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const AntiCorrupcao = require('../data/schema');
const getRG = require('../utils/getRG');

// Função para enviar a mensagem privada
const sendPrivateMessage = async (member, embed) => {
    try {
        await member.send({ embeds: [embed] });
        console.log(`Mensagem enviada para ${member.user.tag}`);
    } catch (error) {
        console.error(`Erro ao enviar a mensagem para ${member.user.tag}: ${error}`);
        // Verifica se o erro é devido ao bloqueio de DMs
        if (error.code === 50007) {
            await member.send({ content: 'Não consegui enviar a mensagem privada porque você desativou DMs de servidores.' });
        }
    }
};

module.exports = {
    name: 'interactionCreate',
    async execute(interaction, client) {
        if (!interaction.isButton()) return;

        const { customId, member, message } = interaction;
        const antiCorrupcaoRole = interaction.guild.roles.cache.get(process.env.ANTI_CORRUPCAO_ROLE_ID);
        const corrupcaoAtivaRole = interaction.guild.roles.cache.get(process.env.CORRUPCAO_ATIVA_ROLE_ID);
        const imagesChannel = client.channels.cache.get(process.env.IMAGES_CHANNEL_ID);
        const logChannel = client.channels.cache.get(process.env.LOG_CHANNEL_ID);

        if (!imagesChannel) {
            console.error('⚠️ Canal de imagens não encontrado. Verifique a variável de ambiente IMAGES_CHANNEL_ID.');
            return;
        }

        const sendLog = async (content, embed) => {
            if (logChannel) {
                await logChannel.send({ content, embeds: [embed] });
            } else {
                console.error('⚠️ Canal de log não configurado corretamente.');
            }
        };

        const fetchUserEntry = async (userId) => {
            let userEntry = await AntiCorrupcao.findOne({ userId });
            if (!userEntry) {
                userEntry = new AntiCorrupcao({ userId, rg: getRG(member.displayName), dateJoined: new Date(), status: 'Indefinido', images: [] });
                await userEntry.save();
            }
            return userEntry;
        };

        if (customId === 'solicitar_anticorrupcao') {
            const userId = member.id;
            const userEntry = await fetchUserEntry(userId);
            const rg = userEntry.rg;

            if (member.roles.cache.has(antiCorrupcaoRole?.id)) {
                return interaction.reply({ content: '⚠️ Você já possui a tag de Anti-Corrupção.', ephemeral: true });
            }

            if (member.roles.cache.has(corrupcaoAtivaRole?.id)) {
                return interaction.reply({ content: '⚠️ Você possui a tag de Corrupção Ativa. Procure um responsável.', ephemeral: true });
            }

            const embed = new EmbedBuilder()
            .setColor(0x006400)
            .setTitle('<:SEGURAN:1294053822875832351>  **Solicitação de Anti-Corrupção** <:SEGURAN:1294053822875832351> ')
            .addFields(
                { name: '<:memb:1294053962403680266>  QRA:', value: `<:memb:1294053962403680266>  ${member.toString()}`, inline: true },
                { name: '<:f53dd9705e7b42bcae10a58f24e6f87b:1340393091840086148>  **RG**', value: `<:f53dd9705e7b42bcae10a58f24e6f87b:1340393091840086148>  ${rg || '⚠️ **RG não encontrado**'}`, inline: true },
                { 
                    name: '<a:e3555151a6744dabba2ab8d21ac74880:1340393876388839526>  **Data de Ingresso**', 
                    value: `<a:e3555151a6744dabba2ab8d21ac74880:1340393876388839526>  **${new Date(userEntry.dateJoined).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}**\n\n<:99495a5ae26f4b31a90e8849c359690b:1340396325069656075> [Log](https://logs.fusionhost.com.br/login)`, 
                    inline: false 
                }
            )
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 1024 }))
            .setFooter({ text: 'Solicitação enviada', iconURL: client.user.displayAvatarURL({ dynamic: true }) })
            .setTimestamp();
        
            const buttons = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('aprovar_anticorrupcao')
                    .setLabel('Aprovar')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('<a:check1:1310031380020727870>'), // Emoji animado para Aprovar
                new ButtonBuilder()
                    .setCustomId('negar_anticorrupcao')
                    .setLabel('Negar')
                    .setStyle(ButtonStyle.Danger)
                    .setDisabled(true)
                    .setEmoji('<a:emojiNovos3:1310034777767673927>'), // Emoji animado para Negar
                new ButtonBuilder()
                    .setCustomId('adicionar_imagem')
                    .setLabel('Adicionar Imagem')
                    .setStyle(ButtonStyle.Secondary) // Você pode tentar Primary também
                    .setEmoji('<a:GhostFaceCamera:1340385391144075317>') // Emoji animado para Adicionar Imagem
            );                

            await logChannel.send({ content: `${member} fez uma solicitação de Anti-Corrupção!`, embeds: [embed], components: [buttons] });
            await interaction.reply({ content: '🚀 Sua solicitação foi enviada para análise.', ephemeral: true });
        }

        if (customId === 'adicionar_imagem') {
            await interaction.reply({ content: '📷 Envie até 10 imagens. Digite `cancelar` para abortar.', ephemeral: true });

            const filter = msg => msg.attachments.size > 0 || msg.content.toLowerCase() === 'cancelar';
            const collector = interaction.channel.createMessageCollector({ filter, max: 10, time: 60000 });

            collector.on('collect', async msg => {
                if (msg.content.toLowerCase() === 'cancelar') {
                    collector.stop('cancelled');
                    return await msg.reply({ content: '📸 O envio de imagens foi cancelado.', ephemeral: true });
                }

                const imageUrls = msg.attachments.map(att => att.url);
                const userEntry = await AntiCorrupcao.findOne({ userId: member.id });

                if (userEntry) {
                    userEntry.images = []; // Apaga as imagens antigas
                    userEntry.images.push(...imageUrls.map(url => ({ url, description: 'Imagem enviada', uploadedAt: new Date() })));
                    await userEntry.save();

                    const infoEmbed = new EmbedBuilder()
                    .setColor(0x2ECC71)
                    .setTitle('<:PASTA:1294053776872833054>  Registro <:PASTA:1294053776872833054>') 
                    .setDescription(
                        `<:memb:1294053962403680266> **QRA:** ${member.displayName}\n` +
                        `<:f53dd9705e7b42bcae10a58f24e6f87b:1340393091840086148> **RG:** ${userEntry.rg || '⚠️ Não informado'}\n` +
                        `<a:e3555151a6744dabba2ab8d21ac74880:1340393876388839526> **Data de Ingresso:** **${new Date(userEntry.dateJoined).toLocaleString('pt-BR')}**`
                    )
                    .addFields(
                        { name: 'Aprovado por:', value: `${interaction.user.tag} (${interaction.user.username})`, inline: true }
                    )
                    .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 512 }))
                    .setFooter({ text: '📂 Imagens enviadas em', iconURL: client.user.displayAvatarURL({ dynamic: true }) })
                    .setTimestamp();
                
                    if (imagesChannel) {
                        await imagesChannel.send({ embeds: [infoEmbed] });
                        imageUrls.forEach(async url => {
                            await imagesChannel.send({ content: url });
                        });
                    }

                    const fetchedMessage = await interaction.channel.messages.fetch(message.id);
                    const updatedButtons = new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId('aprovar_anticorrupcao').setLabel('✅ Aprovar').setStyle(ButtonStyle.Success),
                        new ButtonBuilder().setCustomId('negar_anticorrupcao').setLabel('❌ Negar').setStyle(ButtonStyle.Danger).setDisabled(false),
                        new ButtonBuilder().setCustomId('adicionar_imagem').setLabel('🖼️ Adicionar Imagem').setStyle(ButtonStyle.Secondary)
                    );
                    await fetchedMessage.edit({ components: [updatedButtons] });

                    setTimeout(() => {
                        collector.stop('timeout');
                    }, 60000);
                }
            });
        }

        if (customId === 'negar_anticorrupcao') {
            await member.roles.add(corrupcaoAtivaRole);
            await member.roles.remove(antiCorrupcaoRole);
            await interaction.reply({ content: '❌ Sua solicitação de Anti-Corrupção foi negada. A tag de Corrupção Ativa foi atribuída.', ephemeral: true });
        }

        if (customId === 'aprovar_anticorrupcao') {
            await member.roles.add(antiCorrupcaoRole);
            await member.roles.remove(corrupcaoAtivaRole);
            await interaction.reply({ content: '✅ Sua solicitação de Anti-Corrupção foi aprovada. A tag foi atribuída.', ephemeral: true });
        }
    },
};
