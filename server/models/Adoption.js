const mongoose = require('mongoose');
const adoptionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    dogId: { type: mongoose.Schema.Types.ObjectId, ref: 'Dog', required: true },
    adoptionDate: { type: Date, default: Date.now },
    customerDetails: {
        name: { type: String, required: true },
        address: { type: String, required: true },
        phone: { type: String, required: true },
        email: { type: String, required: true }
    },
    status: { type: String, enum: ['pending', 'completed', 'cancelled'], default: 'pending' }
});
module.exports = mongoose.model('Adoption', adoptionSchema);