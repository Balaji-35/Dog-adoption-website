const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// Config from .env
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;
const MONGODB_URI = process.env.MONGODB_URI;

// Middleware
app.use(express.json());
app.use(cors({
    origin: '*', // Update this in production for security
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
}));

// MongoDB connection
async function connectToDatabase() {
    try {
        await mongoose.connect(MONGODB_URI, {
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000
        });
        console.log('✅ Connected to MongoDB');
    } catch (err) {
        console.error('❌ MongoDB connection error:', err.message);
        process.exit(1);
    }
}

// Models
const User = require('./models/User');
const Dog = require('./models/Dog');
const Adoption = require('./models/Adoption');

// Auth middleware
const authenticate = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Authentication required' });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({ message: 'Invalid token' });
    }
};

// Routes
app.post('/api/register', async (req, res) => {
    try {
        const { username, password, email } = req.body;
        if (!username || !password || !email) {
            return res.status(400).json({ success: false, message: 'All fields are required' });
        }

        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'Username already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({ username, password: hashedPassword, email });
        await user.save();

        res.status(201).json({ success: true, message: 'User registered successfully' });
    } catch (err) {
        console.error('Registration error:', err);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });
        if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid credentials' });

        const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '1h' });
        res.json({ success: true, token });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Login failed' });
    }
});

app.get('/api/stats', authenticate, async (req, res) => {
    try {
        const dogsAvailable = await Dog.aggregate([{ $group: { _id: null, total: { $sum: "$availableCount" } } }]);
        const customersCount = await User.countDocuments();
        const dogsAdopted = await Adoption.countDocuments({ status: 'completed' });
        res.json({
            dogsAvailable: dogsAvailable[0]?.total || 0,
            customersCount,
            dogsAdopted
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching statistics' });
    }
});

app.get('/api/dogs', authenticate, async (req, res) => {
    try {
        const dogs = await Dog.find({ availableCount: { $gt: 0 } });
        res.json(dogs);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching dogs' });
    }
});

app.get('/api/dogs/:id', authenticate, async (req, res) => {
    try {
        const dog = await Dog.findById(req.params.id);
        if (!dog) return res.status(404).json({ message: 'Dog not found' });
        res.json(dog);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching dog' });
    }
});

app.post('/api/adoptions', authenticate, async (req, res) => {
    try {
        const { fullName, email, phone, address, dogId } = req.body;
        const dog = await Dog.findById(dogId);
        if (!dog || dog.availableCount <= 0) {
            return res.status(400).json({ success: false, message: 'Dog not available for adoption' });
        }

        const adoption = new Adoption({
            userId: req.user.userId,
            dogId,
            adoptionDate: new Date(),
            customerDetails: { name: fullName, address, phone, email },
            status: 'pending'
        });

        await adoption.save();

        res.json({ success: true, dogName: dog.name, price: dog.price });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Adoption request failed' });
    }
});

app.post('/api/adoptions/:dogId/complete', authenticate, async (req, res) => {
    try {
        const { dogId } = req.params;
        const adoption = await Adoption.findOne({ userId: req.user.userId, dogId, status: 'pending' });
        if (!adoption) {
            return res.status(400).json({ success: false, message: 'No pending adoption found' });
        }

        const dog = await Dog.findById(dogId);
        dog.availableCount -= 1;
        await dog.save();

        adoption.status = 'completed';
        await adoption.save();

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to complete adoption' });
    }
});

app.get('/api/health', (req, res) => {
    res.json({ success: true, message: 'Server is healthy' });
});

// Serve frontend from /client folder
app.use(express.static(path.join(__dirname, '../client')));
app.get( /^\/(?!api).*/ , (req, res) => {
    res.sendFile(path.join(__dirname, '../client/login.html'));
});

// Start server
async function startServer() {
    await connectToDatabase();
    app.listen(PORT, () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
}
startServer();
