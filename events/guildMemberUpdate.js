const AntiCorrupcao = require('../data/schema'); // Certifique-se de que o caminho está correto

module.exports = {
    name: 'guildMemberUpdate',
    async execute(oldMember, newMember, client) {
        const tagRoleId = process.env.TAG_CONTA_DIAS_ROLE_ID; // ID da role de ingresso

        // Verificar se o membro recebeu a tag
        const hadRoleBefore = oldMember.roles.cache.has(tagRoleId);
        const hasRoleNow = newMember.roles.cache.has(tagRoleId);

        if (!hadRoleBefore && hasRoleNow) {
            const userId = newMember.id;
            console.log(`Verificando o usuário ${newMember.user.tag} para registro de ingresso.`);

            // Captura a data e hora ajustada para o fuso horário de Brasília
            const dateJoined = new Date();
            const dateJoinedFormatted = new Date(dateJoined.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));

            // Buscar se o usuário já existe no banco
            let userEntry = await AntiCorrupcao.findOne({ userId });

            if (!userEntry) {
                console.log(`Usuário não encontrado no banco, registrando primeira entrada.`);

                userEntry = new AntiCorrupcao({
                    userId,
                    dateJoined: dateJoinedFormatted, // Salva a data ajustada para o fuso de Brasília
                    rg: null, // O RG será atualizado posteriormente, quando solicitado
                    status: 'Indefinido',
                    history: [],
                });

                await userEntry.save();
                console.log(`Data de ingresso registrada para ${newMember.user.tag}: ${dateJoinedFormatted}`);
            } else {
                console.log(`Usuário ${newMember.user.tag} já possui data de ingresso registrada: ${userEntry.dateJoined}`);
            }
        }
    },
};
