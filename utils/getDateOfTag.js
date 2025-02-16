const AntiCorrupcao = require('../data/schema');

module.exports = async function getDateOfTag(member) {
    const userId = member.id;
    const userEntry = await AntiCorrupcao.findOne({ userId });

    if (userEntry && userEntry.dateJoined) {
        // Formata a data para o formato brasileiro (pt-BR)
        const formattedDate = new Date(userEntry.dateJoined).toLocaleDateString('pt-BR');
        return formattedDate;
    } else {
        return 'Data não encontrada';
    }
};
