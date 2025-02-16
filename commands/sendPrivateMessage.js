const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'sendPrivateMessage',
    async execute(member, status) {
        // Mensagem de aprovação
        if (status === 'Aprovado') {
            try {
                const embed = new EmbedBuilder()
                    .setColor(0x00FF00)
                    .setTitle('✅ Anti-Corrupção Aprovado!')
                    .setDescription('Parabéns! Seu pedido de Anti-Corrupção foi aprovado.');

                await member.send({ embeds: [embed] });
                console.log(`Mensagem de aprovação enviada para ${member.user.tag}`);
            } catch (error) {
                console.error(`Não foi possível enviar a mensagem para ${member.user.tag}: ${error}`);

                // Verifica se o erro é de bloqueio de mensagem privada
                if (error.code === 50007) {
                    const guild = member.guild;
                    const defaultChannel = guild.channels.cache.find(
                        (channel) => channel.type === 'GUILD_TEXT' && channel.permissionsFor(guild.me).has('SEND_MESSAGES')
                    );

                    if (defaultChannel) {
                        await defaultChannel.send(`Não consegui enviar a mensagem privada para ${member.user.tag} porque ele desativou mensagens diretas.`);
                    }
                }
            }
        }

        // Mensagem de negação
        else if (status === 'Negado') {
            try {
                const policeRoleId = process.env.POLICE_RESPONSIBLES_ROLE_ID; // ID da tag dos responsáveis de polícia

                // Verificar se o ID da role é válido
                const policeRole = member.guild.roles.cache.get(policeRoleId);
                let responsibles = 'Nenhum responsável encontrado.';

                if (policeRole) {
                    responsibles = policeRole.members.map(m => `<@${m.user.id}>`).join(', ');
                }

                const embed = new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setTitle('❌ Anti-Corrupção Negado!')
                    .setDescription('Seu pedido de Anti-Corrupção foi negado. Por favor, procure um dos responsáveis de polícia para maiores informações.')
                    .addFields({ name: 'Responsáveis:', value: responsibles });

                await member.send({ embeds: [embed] });
                console.log(`Mensagem de negação enviada para ${member.user.tag}`);
            } catch (error) {
                console.error(`Não foi possível enviar a mensagem para ${member.user.tag}: ${error}`);

                // Verifica se o erro é de bloqueio de mensagem privada
                if (error.code === 50007) {
                    const guild = member.guild;
                    const defaultChannel = guild.channels.cache.find(
                        (channel) => channel.type === 'GUILD_TEXT' && channel.permissionsFor(guild.me).has('SEND_MESSAGES')
                    );

                    if (defaultChannel) {
                        await defaultChannel.send(`Não consegui enviar a mensagem privada para ${member.user.tag} porque ele desativou mensagens diretas.`);
                    }
                }
            }
        }
    },
};
