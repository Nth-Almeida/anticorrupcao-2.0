const mongoose = require('mongoose'); // Importando o mongoose

// Conecta ao MongoDB usando a URI fornecida no arquivo .env
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Conectado ao MongoDB'))
    .catch(err => {
        console.error('Erro ao conectar ao MongoDB', err);
        process.exit(1); // Encerra o processo se a conexão falhar
    });

// Exporta a instância do Mongoose para que possa ser usada em outras partes do projeto
module.exports = mongoose;
