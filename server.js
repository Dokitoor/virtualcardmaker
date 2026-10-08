require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure uploads directory exists (local dev fallback)
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer Storage: Memory storage keeps buffer in RAM for cloud upload (Vercel-compatible)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static assets
app.use('/assets', express.static(path.join(__dirname, 'public', 'assets')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use('/uploads', express.static(uploadsDir));
app.use('/public', express.static(path.join(__dirname, 'public'), { index: false }));
app.use(express.static(path.join(__dirname, 'public'), { index: false }));
app.use(express.static(__dirname, { index: false }));

// Helper middleware: Auth Check
async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader ? authHeader.replace('Bearer ', '') : req.query.token;
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized. Please log in.' });
    }
    const user = await db.getUserBySession(token);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized. Please log in.' });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(500).json({ error: 'Authentication error: ' + err.message });
  }
}

// --------------------------------------------------------------------------
// API ENDPOINTS
// --------------------------------------------------------------------------

// Register User
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, username, password } = req.body;

    if (!email || !username || !password) {
      return res.status(400).json({ error: 'Email, username, and password are required.' });
    }

    const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
    if (!cleanUsername || cleanUsername.length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 alphanumeric characters.' });
    }

    const existingEmail = await db.findUserByEmail(email);
    if (existingEmail) {
      return res.status(400).json({ error: 'Email is already registered.' });
    }

    const existingUser = await db.findUserByUsername(cleanUsername);
    if (existingUser) {
      return res.status(400).json({ error: 'Username is already taken. Please choose another.' });
    }

    const { user, card } = await db.createUser(email, cleanUsername, password);
    const token = db.createSession(user.id);

    res.json({
      message: 'Account created successfully!',
      token,
      user: { id: user.id, email: user.email, username: user.username },
      card
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Registration failed' });
  }
});

// Login User
app.post('/api/auth/login', async (req, res) => {
  try {
    const identifier = (req.body.email || req.body.username || req.body.identifier || '').trim();
    const password = req.body.password;

    if (!identifier || !password) {
      return res.status(400).json({ error: 'Email or Username and password are required.' });
    }

    const user = await db.findUserByIdentifier(identifier);
    if (!user || user.passwordHash !== db.hashPassword(password)) {
      return res.status(401).json({ error: 'Invalid email/username or password.' });
    }

    const token = db.createSession(user.id);
    const card = await db.getCardByUserId(user.id);

    res.json({
      message: 'Logged in successfully!',
      token,
      user: { id: user.id, email: user.email, username: user.username },
      card
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Login failed' });
  }
});

// Logout User
app.post('/api/auth/logout', requireAuth, (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader ? authHeader.replace('Bearer ', '') : null;
  if (token) db.deleteSession(token);
  res.json({ message: 'Logged out successfully.' });
});

// Get Current User & Card Details
app.get('/api/me', requireAuth, async (req, res) => {
  try {
    const card = await db.getCardByUserId(req.user.id);
    res.json({
      user: { id: req.user.id, email: req.user.email, username: req.user.username },
      card
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update Card Details & Photo Upload
app.post('/api/card', requireAuth, upload.single('photo'), async (req, res) => {
  try {
    const {
      fullName,
      roleTitle,
      positioningStatement,
      capabilities,
      editionMark,
      brandSubmark,
      email,
      phone,
      whatsapp,
      linkedinUrl,
      portfolioUrl,
      theme
    } = req.body;

    const updates = {};
    if (fullName !== undefined) updates.fullName = fullName;
    if (roleTitle !== undefined) updates.roleTitle = roleTitle;
    if (positioningStatement !== undefined) updates.positioningStatement = positioningStatement;
    if (editionMark !== undefined) updates.editionMark = editionMark;
    if (brandSubmark !== undefined) updates.brandSubmark = brandSubmark;
    if (email !== undefined) updates.email = email;
    if (phone !== undefined) updates.phone = phone;
    if (whatsapp !== undefined) updates.whatsapp = whatsapp;
    if (linkedinUrl !== undefined) updates.linkedinUrl = linkedinUrl;
    if (portfolioUrl !== undefined) updates.portfolioUrl = portfolioUrl;
    if (theme !== undefined) updates.theme = theme;

    if (capabilities) {
      try {
        updates.capabilities = typeof capabilities === 'string' ? JSON.parse(capabilities) : capabilities;
      } catch {
        updates.capabilities = capabilities.split(',').map(s => s.trim()).filter(Boolean);
      }
    }

    if (req.file) {
      // 1. Try uploading buffer directly to Supabase Storage CDN (public avatars bucket)
      const cloudUrl = await db.uploadPhotoToStorage(req.file.buffer, req.file.originalname, req.file.mimetype);
      if (cloudUrl) {
        updates.photoUrl = cloudUrl;
      } else {
        // 2. Fallback to local disk storage if cloud upload isn't available
        const ext = path.extname(req.file.originalname).toLowerCase() || '.jpg';
        const filename = 'portrait_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8) + ext;
        try {
          fs.writeFileSync(path.join(uploadsDir, filename), req.file.buffer);
          updates.photoUrl = '/uploads/' + filename;
        } catch (e) {
          console.warn('Could not save photo to disk:', e.message);
        }
      }
    } else if (req.body.photoUrl) {
      updates.photoUrl = req.body.photoUrl;
    }

    const updatedCard = await db.updateCard(req.user.id, updates);
    res.json({ message: 'Card updated successfully!', card: updatedCard });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Fetch Public Card Data by Username
app.get('/api/cards/:username', async (req, res) => {
  try {
    const username = req.params.username;
    const card = await db.getCardByUsername(username);

    if (!card) {
      return res.status(404).json({ error: `Card not found for username "${username}".` });
    }

    res.json({ card });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --------------------------------------------------------------------------
// HTML PAGE ROUTING
// --------------------------------------------------------------------------

// Custom Vanity URL for Card: /c/:username
app.get('/c/:username', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'card.html'));
});

// Dashboard
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// Login / Register Portal
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Root: Platform Landing Page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'landing.html'));
});

// Fallback to landing page
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'landing.html'));
});

// Start listener only if run directly (allows serverless import by Vercel)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Meetme Digital Card Platform live at http://localhost:${PORT}`);
    console.log(`👉 Test custom user card: http://localhost:${PORT}/c/dokitoor`);
  });
}

module.exports = app;
