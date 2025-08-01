// models/Dog.js
const mongoose = require('mongoose');
const dogSchema = new mongoose.Schema({
    name: { type: String, required: true },
    breed: { type: String, required: true },
    age: { type: Number, required: true },
    gender: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true },
    availableCount: { type: Number, required: true, min: 0 },
    imageUrl: { type: String, required: true },
    careInstructions: {
        food: { type: String, required: true },
        exercise: { type: String, required: true },
        grooming: { type: String, required: true },
        specialNeeds: { type: String }
    }
});
module.exports = mongoose.model('Dog', dogSchema);