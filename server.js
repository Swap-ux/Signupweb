// File: server.js
const jwt       = require('jsonwebtoken');
require('dotenv').config();

const path      = require('path');
const express   = require('express');
const mongoose  = require('mongoose');
const bcrypt    = require('bcrypt');

const app = express();

// ── Middleware ─────────────────────
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// ── MongoDB Connection ─────────────────────
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser:    true,
  useUnifiedTopology: true
})
.then(() => console.log('✔️ MongoDB connected'))
.catch(err => console.error('❌ MongoDB error:', err));

// ── User Model ─────────────────────
const userSchema = new mongoose.Schema({
  name:     { type: String, required: true },
  email:    { type: String, required: true, unique: true },
  password: { type: String, required: true }
});
const User = mongoose.model('User', userSchema);

// ── Auth Middleware ─────────────────────
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ message: 'No token provided.' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;  // { userId, name, iat, exp }
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
}

// ── Register ─────────────────────
app.post('/api/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hash });
    return res.status(201).json({ message: 'Registered!', userId: user._id });
  } catch (err) {
    if (err.code === 11000) {
      // Duplicate email
      return res.status(400).json({ error: 'Email already used.' });
    }
    return res.status(400).json({ error: err.message });
  }
});

// ── Login ─────────────────────
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    // ✅ Generate JWT
    const token = jwt.sign(
      { userId: user._id, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    return res.status(200).json({
      message: 'Login successful!',
      token,            
      userId: user._id,
      name: user.name
    });
  } catch (err) {
    return res.status(500).json({ message: 'Login error', error: err.message });
  }
});

// ── Example Protected Route ─────────────────────
app.get('/api/dashboard', authenticate, (req, res) => {
  res.json({ message: `Welcome back, ${req.user.name}!` });
});

// ── Start Server ─────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));


