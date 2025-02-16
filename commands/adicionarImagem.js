// interactions/adicionarImagem.js
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const AntiCorrupcao = require('../data/schema');

module.exports = {
    name: 'adicionar_imagem', // Nome do comando
    async execute(interaction, client) {
        const { member, message } = interaction;
        const imagesChannel = client.channels.cache.get(process.env.IMAGES_CHANNEL_ID);

        // Enviar resposta inicial
        await interaction.reply({ content: '📷 Envie até 10 imagens. Digite `cancelar` para abortar.', ephemeral: true });

        // Filtro para coletar mensagens com anexos ou o comando 'cancelar'
        const filter = msg => msg.attachments.size > 0 || msg.content.toLowerCase() === 'cancelar';
        const collector = interaction.channel.createMessageCollector({ filter, max: 10, time: 60000 });

        // Evento quando uma mensagem é coletada
        collector.on('collect', async msg => {
            // Se o usuário digitar 'cancelar', para a coleta e envia uma mensagem de cancelamento
            if (msg.content.toLowerCase() === 'cancelar') {
                collector.stop('cancelled');
                return await msg.reply({ content: '📸 O envio de imagens foi cancelado.', ephemeral: true });
            }

            const imageUrls = msg.attachments.map(att => att.url); // Pega as URLs das imagens enviadas
            const userEntry = await AntiCorrupcao.findOne({ userId: member.id });

            // Verifica se o usuário tem um registro no banco de dados
            if (userEntry) {
                userEntry.images = []; // Apaga as imagens antigas
                userEntry.images.push(...imageUrls.map(url => ({ url, description: 'Imagem enviada', uploadedAt: new Date() })));
                await userEntry.save();

                // Criação do Embed com informações sobre o usuário
                const infoEmbed = new EmbedBuilder()
                    .setColor(0x2ECC71)
                    .setTitle('📷 **Registro de Imagens**')
                    .setDescription(`**QRA:** ${member.displayName}\n**RG:** ${userEntry.rg || 'Não informado'}\n**Data de Ingresso:** ${new Date(userEntry.dateJoined).toLocaleDateString('pt-BR')}`)
                    .setFooter({ text: 'Imagens enviadas em', iconURL: client.user.displayAvatarURL({ dynamic: true }) })
                    .setTimestamp();

                // Envia as imagens para o canal de imagens, se configurado
                if (imagesChannel) {
                    await imagesChannel.send({ embeds: [infoEmbed] });
                    imageUrls.forEach(async url => {
                        await imagesChannel.send({ content: url });
                    });
                }

                // Atualiza os botões do message com opções de aprovação, negação ou reversão
                const fetchedMessage = await interaction.channel.messages.fetch(message.id);
                const updatedButtons = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('aprovar_anticorrupcao').setLabel('✅ Aprovar').setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId('negar_anticorrupcao').setLabel('❌ Negar').setStyle(ButtonStyle.Danger).setDisabled(false),
                    new ButtonBuilder().setCustomId('reverter_imagens').setLabel('🔄 Reverter').setStyle(ButtonStyle.Secondary)
                );

                await fetchedMessage.edit({ components: [updatedButtons] });

                // Deleta a mensagem do usuário após 9 segundos
                setTimeout(() => {
                    msg.delete().catch(console.error);
                }, 9000);
            } else {
                await msg.reply({ content: '⚠️ Erro: Usuário não encontrado no banco de dados.', ephemeral: true });
            }
        });

        // Evento quando o coletor é finalizado
        collector.on('end', (collected, reason) => {
            if (reason === 'cancelled') {
                console.log('Envio de imagens cancelado.');
            } else if (collected.size === 0) {
                console.log('Nenhuma imagem foi enviada.');
            }
        });
    },
};
