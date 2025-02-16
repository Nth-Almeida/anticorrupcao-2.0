module.exports = function getRG(displayName) {
    try {
        const match = displayName.match(/\| (\d+)$/); // Captura o número após "| "
        return match ? match[1] : null; // Retorna o número ou null se não encontrado
    } catch (error) {
        console.error('Erro ao obter RG:', error);
        return null;
    }
};
