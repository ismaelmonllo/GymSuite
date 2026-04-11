const mongoose = require('mongoose');

const medicionSchema = new mongoose.Schema({
    cliente_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
    entrenador_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
    fecha: { type: Date, required: true, default: Date.now },
    // General
    peso: { type: Number },
    altura: { type: Number },
    porcentaje_grasa: { type: Number },
    // Perímetros
    cuello: { type: Number },
    hombros: { type: Number },
    pecho_ins: { type: Number },
    pecho_exp: { type: Number },
    cintura: { type: Number },
    cadera: { type: Number },
    muslo: { type: Number },
    gemelo: { type: Number },
    brazo: { type: Number },
    antebrazo: { type: Number },
    // Pliegues
    biceps: { type: Number },
    triceps: { type: Number },
    subescapular: { type: Number },
    cresta_iliaca: { type: Number },
    // Extra
    observaciones: { type: String }
});

module.exports = mongoose.model('Medicion', medicionSchema);