require('dotenv').config();
const { Client, GatewayIntentBits, Collection, PermissionsBitField, AuditLogEvent } = require('discord.js');
const fs = require('fs');
const path = require('path');
const mongoose = require('./utils/mongoClient');
const cron = require('node-cron');
const AntiCorrupcao = require('./data/schema');



// Conectando ao MongoDB antes de iniciar o bot
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
    .then(() => console.log('Conectado ao MongoDB'))
    .catch(err => {
        console.error('Erro ao conectar ao MongoDB', err);
        process.exit(1); // Encerra o processo se a conexão falhar
    });

// Prefixo para comandos
const prefix = '!';

// Criação do cliente do bot
const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMembers, 
        GatewayIntentBits.MessageContent, 
        GatewayIntentBits.GuildMessages,
    ],
});

// Verifica se o bot tem a permissão de ver registros de auditoria
client.once('ready', async () => {
    const guild = client.guilds.cache.get(process.env.SERVER_ID);

    if (!guild) {
        console.error('Servidor não encontrado!');
        return;
    }

    const botMember = await guild.members.fetch(client.user.id);

    if (!botMember.permissions.has(PermissionsBitField.Flags.ViewAuditLog)) {
        console.error('Bot não tem permissão para ver registros de auditoria.');
    } else {
        console.log('Bot tem permissão para ver registros de auditoria.');
    }

    console.log(`${client.user.tag} está online e pronto para uso!`);
});

// Listener de mensagens para comandos com prefixo
client.on('messageCreate', async (message) => {
    if (!message.content.startsWith(prefix) || message.author.bot) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    const command = client.commands.get(commandName);
    if (!command) {
        return message.reply("Comando não encontrado!");
    }

    try {
        await command.execute(message, args);
    } catch (error) {
        console.error(error);
        message.reply('Ocorreu um erro ao executar este comando!');
    }
});

// Carregando eventos e comandos
client.commands = new Collection();
const eventsPath = path.join(__dirname, 'events');
const commandFiles = fs.readdirSync(path.join(__dirname, 'commands')).filter(file => file.endsWith('.js'));

for (const file of fs.readdirSync(eventsPath)) {
    const event = require(`${eventsPath}/${file}`);
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args, client));
    } else {
        client.on(event.name, (...args) => event.execute(...args, client));
    }
}

commandFiles.forEach(file => {
    const command = require(`${path.join(__dirname, 'commands')}/${file}`);
    if ('name' in command && 'execute' in command) {
        client.commands.set(command.name, command);
    } else {
        console.log(`[WARNING] The command at ${file} is missing a required "name" or "execute" property.`);
    }
});

// Evento para capturar quando uma tag é atribuída e registrar a data no banco de dados
client.on('guildMemberUpdate', async (oldMember, newMember) => {
    const tagRoleId = process.env.TAG_CONTA_DIAS_ROLE_ID;

    // Verificar se o membro recebeu a tag
    const hadRoleBefore = oldMember.roles.cache.has(tagRoleId);
    const hasRoleNow = newMember.roles.cache.has(tagRoleId);

    if (!hadRoleBefore && hasRoleNow) {
        console.log(`Tag atribuída ao membro: ${newMember.user.tag}`);

        const guild = newMember.guild;
        try {
            const fetchedLogs = await guild.fetchAuditLogs({
                limit: 1,
                type: AuditLogEvent.MemberRoleUpdate, // Corrigido para o tipo correto
            });

            const roleLog = fetchedLogs.entries.find(
                entry =>
                    entry.target.id === newMember.id &&
                    entry.changes.some(change => change.key === '$add' && change.new.includes(tagRoleId))
            );

            if (roleLog) {
                const date = roleLog.createdAt; // Usa a data correta da atribuição
                const userId = newMember.id;

                let userEntry = await AntiCorrupcao.findOne({ userId });

                if (userEntry) {
                    console.log(`Usuário já existe no banco, atualizando a data de ingresso.`);
                    userEntry.dateJoined = date;
                    await userEntry.save();
                } else {
                    console.log(`Usuário não encontrado no banco, criando uma nova entrada.`);
                    userEntry = new AntiCorrupcao({
                        userId,
                        dateJoined: date,
                        status: 'Indefinido',
                    });
                    await userEntry.save();
                }

                console.log(`Data de ingresso registrada para ${newMember.user.tag}: ${date}`);
            } else {
                console.log('Log de auditoria para a atribuição da tag não encontrado.');
            }
        } catch (error) {
            console.error(`Erro ao acessar os registros de auditoria: ${error.message}`);
        }
    }
});

// Cron job para remover as tags no primeiro dia de cada mês (sem remover TAG_CONTA_DIAS_ROLE_ID)
cron.schedule('0 0 1 * *', async () => {
    try {
        console.log('Iniciando remoção de tags no primeiro dia do mês...');

        const guild = client.guilds.cache.get(process.env.SERVER_ID);
        if (!guild) {
            return console.log('Servidor não encontrado!');
        }

        const antiCorrupcaoRole = guild.roles.cache.get(process.env.ANTI_CORRUPCAO_ROLE_ID);
        const corrupcaoAtivaRole = guild.roles.cache.get(process.env.CORRUPCAO_ATIVA_ROLE_ID);

        if (!antiCorrupcaoRole || !corrupcaoAtivaRole) {
            return console.log('Uma ou mais tags não foram encontradas!');
        }

        let removedMembers = 0;
        guild.members.cache.forEach(member => {
            if (member.roles.cache.has(antiCorrupcaoRole.id)) {
                member.roles.remove(antiCorrupcaoRole);
                removedMembers++;
                console.log(`Removida a tag Anti-Corrupção de ${member.user.tag}`);
            }
            if (member.roles.cache.has(corrupcaoAtivaRole.id)) {
                member.roles.remove(corrupcaoAtivaRole);
                removedMembers++;
                console.log(`Removida a tag Corrupção Ativa de ${member.user.tag}`);
            }
        });

        await AntiCorrupcao.updateMany({}, { status: 'Removido' });

        console.log(`Tags de Anti-Corrupção e Corrupção Ativa removidas de ${removedMembers} membros.`);
    } catch (error) {
        console.error('Erro no cron job:', error);
    }
});

// Login do bot (isso deve ocorrer depois de todas as configurações e conexões estarem prontas)
client.login(process.env.TOKEN);
