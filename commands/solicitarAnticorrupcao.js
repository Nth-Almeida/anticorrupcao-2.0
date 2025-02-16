const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const AntiCorrupcao = require('../data/schema');
const getRG = require('../utils/getRG'); // Função para extrair o RG

module.exports = {
    name: 'anticorrupcao',
    description: 'Solicitar Anti-Corrupção',
    async execute(message) {
        // Verificar se o usuário tem permissão de admin
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply({ content: '⚠️ Você não tem permissão para usar este comando.', ephemeral: true });
        }

        // Enviar a primeira mensagem ao usuário que executou o comando
        await message.reply({ content: '✅ Você tem permissão para solicitar a análise de anti-corrupção. Agora, clique no botão abaixo para enviar a solicitação.', ephemeral: true });

        // Obter a foto do servidor
        const serverIcon = message.guild.iconURL({ format: 'png', dynamic: true });

        // Criar a embed com a informação sobre a solicitação
        const embed = new EmbedBuilder()
            .setColor(0x006400) // Verde escuro
            .setTitle('<a:oi:1326926064693280849> Solicitação de Anti-Corrupção')
            .setDescription('<a:alerta:1340377326084558911> **Revise os requisitos abaixo e clique no botão para solicitar a análise.**\n\n**Certifique-se de atender a todos os critérios antes de solicitar.**')
            .addFields(
                { name: '<a:setagd:1340379055442235494> Requisitos', value: 'Para solicitar a tag "anti-corrupção", é necessário cumprir os seguintes critérios:', inline: false },
                { name: '<a:setagd:1340379055442235494> Atividade', value: 'É obrigatório ter, no mínimo, 8 dias de atividade contínua na polícia antes de solicitar o "anti-corrupção".', inline: false },
                { name: '<a:setagd:1340379055442235494> Promoção', value: 'A tag "anti-corrupção" é obrigatória para promoção dentro da corporação.', inline: false },
                { name: '<a:setagd:1340379055442235494> Proibições', value: 'É proibido realizar revistas e transferir itens ao próprio inventário ("Caixa 2").', inline: false },
                { name: '<a:setagd:1340379055442235494> Conduta', value: 'É proibido coletar itens do chão, aceitar itens de terceiros ou armazenar itens ilegais.', inline: false },
                { name: '<a:setagd:1340379055442235494> Procedimento', value: 'Use sempre o comando `/apreender` para confiscar itens de forma legal.', inline: false }
            )
            .setThumbnail(serverIcon)
            .setFooter({ text: '🤖 Copyright ® 2024 Nathan ✅ ' })
            .setTimestamp();

        // Criar botão de solicitação
        const anticorrupcaoButton = new ButtonBuilder()
            .setCustomId('solicitar_anticorrupcao')
            .setLabel('Solicitar Anti-Corrupção')
            .setStyle(ButtonStyle.Success)
            .setEmoji('<:621f624404744433aaae3da642f760fd:1340369787196543027>'); 

        const row = new ActionRowBuilder().addComponents(anticorrupcaoButton);

        // Enviar a mensagem com a embed e o botão
        await message.channel.send({ embeds: [embed], components: [row] });
    },

    // Lidar com a interação do botão
    async interaction(interaction) {
        const { member } = interaction;
        
        // Verificar se a interação é para a solicitação de anti-corrupção
        if (interaction.customId === 'solicitar_anticorrupcao') {
            const userEntry = await AntiCorrupcao.findOne({ userId: member.id });

            // Verifica se o usuário já tem registro no banco de dados
            if (userEntry) {
                // Lógica de validação de tempo de serviço (mínimo 8 dias)
                const dataIngressou = new Date(userEntry.dateJoined);
                const diasDeAtividade = Math.floor((new Date() - dataIngressou) / (1000 * 60 * 60 * 24));

                if (diasDeAtividade < 8) {
                    return interaction.reply({ content: '⚠️ Você precisa ter no mínimo **8 dias de atividade** na polícia para solicitar a tag "anti-corrupção".', ephemeral: true });
                }

                // Atualizando o status de solicitação de anti-corrupção
                userEntry.anticorrupcaoSolicitado = true;
                await userEntry.save();

                // Enviar DM para o usuário informando a solicitação registrada
                try {
                    await member.send({ content: '✅ Sua solicitação de anti-corrupção foi registrada com sucesso! Aguarde a análise.' });
                } catch (error) {
                    console.error('Erro ao enviar DM para o usuário:', error);
                }

                return interaction.reply({ content: '✅ Sua solicitação de anti-corrupção foi registrada com sucesso!', ephemeral: true });
            } else {
                return interaction.reply({ content: '⚠️ Erro: Usuário não encontrado no banco de dados.', ephemeral: true });
            }
        }
    }
};
