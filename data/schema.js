const mongoose = require('mongoose');  // Importando mongoose

const antiCorrupcaoSchema = new mongoose.Schema({
    userId: { 
        type: String, 
        required: true 
    },
    rg: { 
        type: String, 
        required: false  // Campo opcional
    },
    dateJoined: { 
        type: Date, 
        required: true 
    },
    status: { 
        type: String, 
        enum: ['Indefinido', 'Pendente', 'Aprovado', 'Negado', 'Convertido', 'Removido'], 
        default: 'Indefinido' 
    },
    images: [{ 
        url: { 
            type: String, 
            required: true 
        }, 
        description: { 
            type: String, 
            required: false  // Descrição opcional para a imagem
        },
        uploadedAt: { 
            type: Date, 
            default: Date.now  // Data de upload da imagem
        }
    }],
    totalAprovado: { 
        type: Number, 
        default: 0 
    },
    totalNegado: { 
        type: Number, 
        default: 0 
    },
    totalConvertido: { 
        type: Number, 
        default: 0 
    },
    history: [{
        status: { 
            type: String, 
            required: true 
        },
        changedBy: { 
            type: String, 
            required: true 
        },
        date: { 
            type: Date, 
            required: true 
        }
    }]
}, { timestamps: true });  // Adicionando timestamps para createdAt e updatedAt

module.exports = mongoose.model('AntiCorrupcao', antiCorrupcaoSchema);
