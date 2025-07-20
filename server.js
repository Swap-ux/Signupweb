const jwt = require('jsonwebtoken');
require('dotenv').config();
const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const sgMail = require('@sendgrid/mail');


sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname)));

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✔️ MongoDB connected'))
  .catch(err => {
    console.error('❌ MongoDB error:', err);
  });

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  resetToken: String,
  resetTokenExp: Date
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
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'All fields are required.' });
    }
    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hash });
    res.status(201).json({ message: 'Registered!', userId: user._id });
  } catch (err) {
    if (err.code === 11000) {
      res.status(400).json({ error: 'Email already used.' });
    } else {
      res.status(400).json({ error: err.message });
    }
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'All fields are required.' });
    }
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

app.post('/api/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required.' });
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
    
      return res.json({ message: 'If an account with that email exists, a password reset link has been sent.' });
    }

   

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetToken = resetToken;
    user.resetTokenExp = Date.now() + 3600000; // 1 hour expiration
    await user.save();

    const clientURL = process.env.CLIENT_URL || 'http://localhost:3000';
    const resetURL = `${clientURL}/reset-password?token=${resetToken}`;

    const emailHTML = `
      <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0;">
        <div style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border: 1px solid #dddddd; padding: 40px;">
          <h2 style="text-align: center; color: #333333; font-weight: 500;">Password Reset Request</h2>
          <p style="font-size: 16px; color: #555555;">Hello ${user.name},</p>
          <p style="font-size: 16px; color: #555555;">You requested a password reset for your account. Click the button below to reset your password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetURL}" style="background-color: #007bff; color: white; padding: 14px 28px; text-decoration: none; border-radius: 5px; font-size: 16px; display: inline-block;">Reset Password</a>
          </div>
          <p style="font-size: 16px; color: #555555;">If you didn't request this, please ignore this email. This link will expire in 1 hour.</p>
          <p style="font-size: 16px; color: #555555;">Best regards,<br>Swap.co Team</p>
        </div>
      </body>
    `;

    const msg = {
      to: user.email,
      from: 'Swapnildeka14@gmail.com',
      subject: 'Password Reset Request',
      html: emailHTML,
    };

    sgMail.send(msg);

    console.log(`Reset link sent via SendGrid: ${resetURL}`);
    res.json({ message: 'Password reset email sent successfully.' });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Failed to send reset email.' });
  }
});


app.get('/api/reset-password/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const user = await User.findOne({
      resetToken: token,
      resetTokenExp: { $gt: Date.now() }
    });
    if (!user) return res.status(400).json({ error: 'Invalid or expired token.' });
    res.json({ message: 'Token is valid.', userId: user._id });
  } catch (err) {
    res.status(500).json({ error: 'Token verification failed.' });
  }
});

app.post('/api/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) return res.status(400).json({ error: 'Token and new password required.' });

    const user = await User.findOne({
      resetToken: token,
      resetTokenExp: { $gt: Date.now() }
    });
    if (!user) return res.status(400).json({ error: 'Invalid or expired token.' });

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetToken = undefined;
    user.resetTokenExp = undefined;
    await user.save();
    res.json({ message: 'Password reset successful.' });
  } catch (err) {
    res.status(500).json({ error: 'Password reset failed.' });
  }
});

app.get('/api/dashboard', authenticate, (req, res) => {
  res.json({ message: `Welcome back, ${req.user.name}!` });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';


const server = app.listen(PORT, HOST, () => {
  console.log(`🚀 Server running at http://${HOST}:${PORT}`);
});
