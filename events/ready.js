module.exports = {
    name: 'ready',
    once: true,
    execute(client) {
        console.log(`Bot está online como ${client.user.tag}`);
        console.log(`Estou presente em ${client.guilds.cache.size} servidores!`);
        console.log(`Com ${client.users.cache.size} usuários registrados!`);
    },
};
