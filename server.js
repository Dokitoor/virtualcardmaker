const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, 'portrait_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8) + ext);
  }
});

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
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader ? authHeader.replace('Bearer ', '') : req.query.token;
  const user = db.getUserBySession(token);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized. Please log in.' });
  }
  req.user = user;
  next();
}

// --------------------------------------------------------------------------
// API ENDPOINTS
// --------------------------------------------------------------------------

// Register User
app.post('/api/auth/register', (req, res) => {
  const { email, username, password } = req.body;

  if (!email || !username || !password) {
    return res.status(400).json({ error: 'Email, username, and password are required.' });
  }

  const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
  if (!cleanUsername || cleanUsername.length < 3) {
    return res.status(400).json({ error: 'Username must be at least 3 alphanumeric characters.' });
  }

  if (db.findUserByEmail(email)) {
    return res.status(400).json({ error: 'Email is already registered.' });
  }

  if (db.findUserByUsername(cleanUsername)) {
    return res.status(400).json({ error: 'Username is already taken. Please choose another.' });
  }

  const { user, card } = db.createUser(email, cleanUsername, password);
  const token = db.createSession(user.id);

  res.json({
    message: 'Account created successfully!',
    token,
    user: { id: user.id, email: user.email, username: user.username },
    card
  });
});

// Login User
app.post('/api/auth/login', (req, res) => {
  const identifier = (req.body.email || req.body.username || req.body.identifier || '').trim();
  const password = req.body.password;

  if (!identifier || !password) {
    return res.status(400).json({ error: 'Email or Username and password are required.' });
  }

  const user = db.findUserByIdentifier(identifier);
  if (!user || user.passwordHash !== db.hashPassword(password)) {
    return res.status(401).json({ error: 'Invalid email/username or password.' });
  }

  const token = db.createSession(user.id);
  const card = db.getCardByUserId(user.id);

  res.json({
    message: 'Logged in successfully!',
    token,
    user: { id: user.id, email: user.email, username: user.username },
    card
  });
});

// Logout User
app.post('/api/auth/logout', requireAuth, (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader ? authHeader.replace('Bearer ', '') : null;
  if (token) db.deleteSession(token);
  res.json({ message: 'Logged out successfully.' });
});

// Get Current User & Card Details
app.get('/api/me', requireAuth, (req, res) => {
  const card = db.getCardByUserId(req.user.id);
  res.json({
    user: { id: req.user.id, email: req.user.email, username: req.user.username },
    card
  });
});

// Update Card Details & Photo Upload
app.post('/api/card', requireAuth, upload.single('photo'), (req, res) => {
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
      updates.photoUrl = '/uploads/' + req.file.filename;
    } else if (req.body.photoUrl) {
      updates.photoUrl = req.body.photoUrl;
    }

    const updatedCard = db.updateCard(req.user.id, updates);
    res.json({ message: 'Card updated successfully!', card: updatedCard });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Fetch Public Card Data by Username
app.get('/api/cards/:username', (req, res) => {
  const username = req.params.username;
  const card = db.getCardByUsername(username);

  if (!card) {
    return res.status(404).json({ error: `Card not found for username "${username}".` });
  }

  res.json({ card });
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

app.listen(PORT, () => {
  console.log(`🚀 Meetme Digital Card Platform live at http://localhost:${PORT}`);
  console.log(`👉 Test custom user card: http://localhost:${PORT}/c/dokitoor`);
});
