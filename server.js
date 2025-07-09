
const jwt      = require('jsonwebtoken');
require('dotenv').config();

const path     = require('path');
const express  = require('express');
const mongoose = require('mongoose');
const bcrypt   = require('bcrypt');

const app = express();


app.use(express.json());
app.use(express.static(path.join(__dirname)));


const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';


const server = app.listen(PORT, HOST, () => {
  console.log(`🚀 Server running at http://${HOST}:${PORT}`);
});


server.keepAliveTimeout = 120000;   
server.headersTimeout   = 120000;  


mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✔️ MongoDB connected'))
  .catch(err => {
    console.error('❌ MongoDB error:', err);
   
  });


const userSchema = new mongoose.Schema({
  name:     { type: String, required: true },
  email:    { type: String, required: true, unique: true },
  password: { type: String, required: true }
});
const User = mongoose.model('User', userSchema);


function authenticate(req, res, next) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  if (!token) return res.status(401).json({ message: 'No token provided.' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ message: 'Invalid or expired token.' });
  }
}


app.post('/api/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hash });
    res.status(201).json({ message: 'Registered!', userId: user._1 });
  } catch (err) {
    if (err.code === 11000) res.status(400).json({ error: 'Email already used.' });
    else res.status(400).json({ error: err.message });
  }
});


app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !await bcrypt.compare(password, user.password)) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }
    const token = jwt.sign(
      { userId: user._id, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    res.json({ message: 'Login successful!', token, userId: user._id, name: user.name });
  } catch (err) {
    res.status(500).json({ message: 'Login error', error: err.message });
  }
});


app.get('/api/dashboard', authenticate, (req, res) => {
  res.json({ message: `Welcome back, ${req.user.name}!` });
});
