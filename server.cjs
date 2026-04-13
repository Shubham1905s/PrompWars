const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const otpGenerator = require('otp-generator');
require('dotenv').config();

const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

app.use(express.json());
app.use(cors());

// --- WEBSOCKET LOGIC ---
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('lockSeat', (data) => {
    // Broadcast to all other clients that a seat is locked
    socket.broadcast.emit('seatLocked', data);
  });

  socket.on('unlockSeat', (seatId) => {
    socket.broadcast.emit('seatUnlocked', seatId);
  });

  socket.on('placeOrder', (order) => {
    // Notify vendors/managers about new food order
    io.emit('newOrder', order);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

// Broadcast dummy crowd updates every 5 seconds to simulate Heatmap Engine
setInterval(() => {
  const gateUpdates = [
    { area: 'Gate 2 Entrance', waitMinutes: 15 + Math.floor(Math.random() * 10) },
    { area: 'Main Concourse', waitMinutes: 5 + Math.floor(Math.random() * 5) }
  ];
  io.emit('crowdUpdate', gateUpdates);
}, 5000);

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

const bcrypt = require('bcryptjs');

// Schemas
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String }, // Optional for now if we want to support social later
  name: String,
  role: { type: String, default: 'attendee' }, 
  isVerified: { type: Boolean, default: false }
});

const User = mongoose.model('User', userSchema);

const otpSchema = new mongoose.Schema({
  email: String,
  otp: String,
  createdAt: { type: Date, default: Date.now, index: { expires: 300 } } 
});

const OTP = mongoose.model('OTP', otpSchema);

// Email Transporter (same as before)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Routes
// 1. Check if user exists
app.post('/api/auth/check-email', async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    res.status(200).json({ exists: !!user });
  } catch (error) {
    res.status(500).json({ message: 'Error checking email' });
  }
});

// 2. Signup - Send OTP
app.post('/api/auth/signup-otp', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email is required' });

  const otp = otpGenerator.generate(6, { upperCaseAlphabets: false, specialChars: false, lowerCaseAlphabets: false });
  
  try {
    // Check if already exists
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: 'User already exists' });

    await OTP.findOneAndUpdate({ email }, { otp }, { upsert: true, new: true });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'VenueSync - Complete Your Registration',
      html: `
        <div style="font-family: sans-serif; padding: 20px; background: #020617; color: #f8fafc; border-radius: 10px;">
          <h2 style="color: #3b82f6;">Welcome to VenueSync</h2>
          <p>Please use the following code to verify your new account:</p>
          <div style="font-size: 32px; font-weight: 900; letter-spacing: 5px; color: #3b82f6; margin: 20px 0;">${otp}</div>
          <p style="color: #94a3b8; font-size: 12px;">This code expires in 5 minutes.</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: 'OTP sent successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error sending OTP' });
  }
});

// 3. Verify Signup & Create User
app.post('/api/auth/verify-signup', async (req, res) => {
  const { email, otp, password, name } = req.body;
  
  try {
    const otpRecord = await OTP.findOne({ email, otp });
    if (!otpRecord) return res.status(400).json({ message: 'Invalid or expired OTP' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const isOwner = email === 'shubhammirashi303@gmail.com';
    
    const user = new User({ 
      email, 
      password: hashedPassword, 
      name: name || email.split('@')[0],
      role: isOwner ? 'manager' : 'attendee',
      isVerified: true
    });
    
    await user.save();
    await OTP.deleteOne({ email });

    const token = jwt.sign({ id: user._id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: '24h' });
    res.status(201).json({ token, user: { id: user._id, email: user.email, name: user.name, role: user.role } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Signup error' });
  }
});

// 4. Login - Direct with Password
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

    // Update role check for shubham
    if (email === 'shubhammirashi303@gmail.com' && user.role !== 'manager') {
       user.role = 'manager';
       await user.save();
    }

    const token = jwt.sign({ id: user._id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: '24h' });
    res.status(200).json({ token, user: { id: user._id, email: user.email, name: user.name, role: user.role } });
  } catch (error) {
    res.status(500).json({ message: 'Login error' });
  }
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
