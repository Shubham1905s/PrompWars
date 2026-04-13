const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const otpGenerator = require('otp-generator');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Schemas
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  name: String,
  role: { type: String, default: 'attendee' }, // attendee, manager, staff
  isVerified: { type: Boolean, default: false }
});

const otpSchema = new mongoose.Schema({
  email: String,
  otp: String,
  createdAt: { type: Date, default: Date.now, index: { expires: 300 } } // Expiry in 5 mins
});

const User = mongoose.model('User', userSchema);
const OTP = mongoose.model('OTP', otpSchema);

// Email Transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Routes
app.post('/api/auth/send-otp', async (req, res) => {
  const { email, name } = req.body;
  if (!email) return res.status(400).json({ message: 'Email is required' });

  const otp = otpGenerator.generate(6, { upperCaseAlphabets: false, specialChars: false, lowerCaseAlphabets: false });
  
  try {
    // Save/Update OTP in DB
    await OTP.findOneAndUpdate({ email }, { otp }, { upsert: true, new: true });

    // Send Email
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'VenueSync - Your Verification Code',
      html: `
        <div style="font-family: sans-serif; padding: 20px; background: #020617; color: #f8fafc; border-radius: 10px;">
          <h2 style="color: #3b82f6;">Welcome to VenueSync</h2>
          <p>Your verification code for logging into the Stadium Management Platform is:</p>
          <div style="font-size: 32px; font-weight: 900; letter-spacing: 5px; color: #3b82f6; margin: 20px 0;">${otp}</div>
          <p style="color: #94a3b8; font-size: 12px;">This code expires in 5 minutes.</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    
    // Ensure user exists
    let user = await User.findOne({ email });
    const isOwner = email === 'shubhammirashi303@gmail.com';
    if (!user) {
      user = new User({ email, name: name || email.split('@')[0], role: isOwner ? 'manager' : 'attendee' });
      await user.save();
    } else if (isOwner && user.role !== 'manager') {
      user.role = 'manager';
      await user.save();
    }

    res.status(200).json({ message: 'OTP sent successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error sending OTP' });
  }
});

app.post('/api/auth/verify-otp', async (req, res) => {
  const { email, otp } = req.body;
  
  try {
    const otpRecord = await OTP.findOne({ email, otp });
    if (!otpRecord) return res.status(400).json({ message: 'Invalid or expired OTP' });

    const user = await User.findOne({ email });
    user.isVerified = true;
    await user.save();

    const token = jwt.sign({ id: user._id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: '24h' });
    
    // Delete OTP after verification
    await OTP.deleteOne({ email });

    res.status(200).json({ token, user: { id: user._id, email: user.email, name: user.name, role: user.role } });
  } catch (error) {
    res.status(500).json({ message: 'Verification error' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
