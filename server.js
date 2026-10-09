require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const QRCode = require('qrcode');
const db = require('./db');
const emailService = require('./emailService');

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure uploads directory exists (local dev fallback, safe on serverless)
const uploadsDir = path.join(__dirname, 'uploads');
try {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
} catch (e) {
  // Read-only filesystem in serverless environments like Vercel
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
// API ENDPOINTS (Mounted on both /api and root for serverless compatibility)
// --------------------------------------------------------------------------
const apiRouter = express.Router();

// Register User
apiRouter.post('/auth/register', async (req, res) => {
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

    // Send Welcome Email Notification (fire & forget, does not block response)
    const appUrl = `${req.protocol}://${req.get('host')}`;
    emailService.sendWelcomeEmail({
      email: user.email,
      username: user.username,
      appUrl
    }).catch(err => console.warn('Welcome email notice:', err.message));

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
apiRouter.post('/auth/login', async (req, res) => {
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
apiRouter.post('/auth/logout', requireAuth, (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader ? authHeader.replace('Bearer ', '') : null;
  if (token) db.deleteSession(token);
  res.json({ message: 'Logged out successfully.' });
});

// Step 1: Request Password Reset Code (Sends email verification OTP)
apiRouter.post('/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Please enter your registered email address.' });
    }

    const { code, user } = await db.createPasswordResetCode(email);

    // Send Password Reset OTP email
    await emailService.sendPasswordResetOtpEmail({
      email: user.email,
      username: user.username,
      code
    });

    res.json({
      message: `A 6-digit verification code has been sent to ${user.email}. Please check your inbox.`,
      email: user.email
    });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Failed to process password reset request.' });
  }
});

// Step 2: Verify Email Code and Set New Password
apiRouter.post('/auth/reset-password', async (req, res) => {
  try {
    const { email, code, newPassword, username } = req.body;

    let user;
    if (code) {
      // Standard email verification code flow
      user = await db.verifyAndResetPassword(email, code, newPassword);
    } else {
      // Fallback for legacy
      user = await db.resetUserPassword(email, username, newPassword);
    }

    const token = db.createSession(user.id);
    const card = await db.getCardByUserId(user.id);

    // Send confirmation email
    const appUrl = `${req.protocol}://${req.get('host')}`;
    emailService.sendPasswordChangedEmail({
      email: user.email,
      username: user.username,
      appUrl
    }).catch(err => console.warn('Password changed email notice:', err.message));

    res.json({
      message: 'Password reset successfully! You are now logged in.',
      token,
      user: { id: user.id, email: user.email, username: user.username },
      card
    });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Password reset failed.' });
  }
});

// Change Password for Authenticated User (Dashboard Settings)
apiRouter.post('/auth/change-password', requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    await db.changeUserPassword(req.user.id, currentPassword, newPassword);
    res.json({ message: 'Password updated successfully!' });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Failed to update password.' });
  }
});


// Get Current User & Card Details (returns all user cards)
apiRouter.get('/me', requireAuth, async (req, res) => {
  try {
    const cards = await db.getCardsByUserId(req.user.id);
    const activeCard = cards.length > 0 ? cards[0] : null;
    res.json({
      user: { id: req.user.id, email: req.user.email, username: req.user.username },
      cards,
      card: activeCard
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get All Cards Belonging to Authenticated User
apiRouter.get('/cards', requireAuth, async (req, res) => {
  try {
    const cards = await db.getCardsByUserId(req.user.id);
    res.json({ cards });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create Another Card for Another Event or Conference
apiRouter.post('/cards', requireAuth, async (req, res) => {
  try {
    const {
      username,
      editionMark,
      roleTitle,
      fullName,
      positioningStatement,
      capabilities,
      brandSubmark,
      photoUrl,
      email,
      phone,
      whatsapp,
      linkedinUrl,
      portfolioUrl,
      theme,
      copyFromCardId
    } = req.body;

    let initialData = {};

    if (copyFromCardId) {
      const sourceCard = await db.getCardById(copyFromCardId);
      if (sourceCard && sourceCard.userId === req.user.id) {
        initialData = {
          fullName: sourceCard.fullName,
          roleTitle: sourceCard.roleTitle,
          positioningStatement: sourceCard.positioningStatement,
          capabilities: sourceCard.capabilities,
          photoUrl: sourceCard.photoUrl,
          email: sourceCard.email,
          phone: sourceCard.phone,
          whatsapp: sourceCard.whatsapp,
          linkedinUrl: sourceCard.linkedinUrl,
          portfolioUrl: sourceCard.portfolioUrl,
          theme: sourceCard.theme
        };
      }
    }

    if (fullName) initialData.fullName = fullName;
    if (roleTitle) initialData.roleTitle = roleTitle;
    if (positioningStatement) initialData.positioningStatement = positioningStatement;
    if (capabilities) initialData.capabilities = capabilities;
    if (editionMark) initialData.editionMark = editionMark;
    if (brandSubmark) initialData.brandSubmark = brandSubmark;
    if (photoUrl) initialData.photoUrl = photoUrl;
    if (email) initialData.email = email;
    if (phone) initialData.phone = phone;
    if (whatsapp) initialData.whatsapp = whatsapp;
    if (linkedinUrl) initialData.linkedinUrl = linkedinUrl;
    if (portfolioUrl) initialData.portfolioUrl = portfolioUrl;
    if (theme) initialData.theme = theme;

    initialData.username = username;

    const newCard = await db.createCardForUser(req.user.id, initialData);
    const allCards = await db.getCardsByUserId(req.user.id);

    res.json({
      message: 'New conference card created successfully! 🎉',
      card: newCard,
      cards: allCards
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete a Specific Conference Card (requires user to maintain at least 1 card)
apiRouter.delete('/cards/:cardId', requireAuth, async (req, res) => {
  try {
    const cardId = req.params.cardId;
    await db.deleteCard(cardId, req.user.id);
    const remainingCards = await db.getCardsByUserId(req.user.id);
    res.json({
      message: 'Card deleted successfully.',
      cards: remainingCards,
      activeCard: remainingCards[0] || null
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update Card Details & Photo Upload (supports specific cardId)
apiRouter.post('/card', requireAuth, upload.single('photo'), async (req, res) => {
  try {
    const {
      cardId,
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

    const updatedCard = await db.updateCard(req.user.id, updates, cardId || null);
    res.json({ message: 'Card updated successfully!', card: updatedCard });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Fetch Public Card Data by Username
apiRouter.get('/cards/:username', async (req, res) => {
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

// Dynamic SVG QR Code Generator (Instant, high-resolution vector QR for phone scanning)
apiRouter.get('/qr', async (req, res) => {
  try {
    const text = (req.query.data || req.query.url || '').trim();
    if (!text) {
      return res.status(400).send('Missing QR data');
    }
    const svg = await QRCode.toString(text, {
      type: 'svg',
      margin: 1,
      color: { dark: '#111827', light: '#ffffff' }
    });
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(svg);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

// Mount API router
app.use('/api', apiRouter);
app.use(apiRouter);

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
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Fallback to landing page
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start listener only if run directly (allows serverless import by Vercel)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Meetme Digital Card Platform live at http://localhost:${PORT}`);
    console.log(`👉 Test custom user card: http://localhost:${PORT}/c/dokitoor`);
  });
}

module.exports = app;
