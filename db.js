require('dotenv').config();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const DB_PATH = path.join(__dirname, 'data', 'db.json');
const JWT_SECRET = process.env.JWT_SECRET || 'meetme_secret_salt_card_platform_2026';

// Initialize Supabase Client (uses environment variables, with project fallback for serverless)
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ypgowtcunpxwrkcvmhom.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlwZ293dGN1bnB4d3JrY3ZtaG9tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE0NjM3NTAsImV4cCI6MjEwNzAzOTc1MH0.OFxaoH53wXlqP7iDdBIBcxrDVIXIcnAAqxnqgKa7zZs';
let supabase = null;

if (SUPABASE_URL && SUPABASE_ANON_KEY) {
  try {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false }
    });
    console.log('⚡ Connected to Supabase Cloud Database & Storage');
  } catch (err) {
    console.warn('⚠️ Supabase initialization notice:', err.message);
  }
}

// Ensure local data directory exists for fallback (safe for read-only serverless filesystems)
try {
  const dataDir = path.join(__dirname, 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
} catch (e) {
  // Read-only filesystem in serverless environments like Vercel
}

function hashPassword(password) {
  return crypto.createHash('sha256').update(password + 'salt_card_platform_2026').digest('hex');
}

// Stateless HMAC Session Tokens (Survives serverless cold starts across Vercel instances)
function createSession(userId) {
  const payload = JSON.stringify({ userId, iat: Date.now() });
  const b64Payload = Buffer.from(payload).toString('base64url');
  const sig = crypto.createHmac('sha256', JWT_SECRET).update(b64Payload).digest('base64url');
  return `${b64Payload}.${sig}`;
}

async function getUserBySession(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [b64Payload, sig] = parts;
  const expectedSig = crypto.createHmac('sha256', JWT_SECRET).update(b64Payload).digest('base64url');
  if (sig !== expectedSig) return null;

  try {
    const payload = JSON.parse(Buffer.from(b64Payload, 'base64url').toString('utf8'));
    return await findUserById(payload.userId);
  } catch {
    return null;
  }
}

function deleteSession(token) {
  // Stateless tokens do not require server deletion
  return true;
}

// --------------------------------------------------------------------------
// LOCAL JSON DB FALLBACK HELPERS
// --------------------------------------------------------------------------
function loadLocalDB() {
  if (!fs.existsSync(DB_PATH)) return { users: [], cards: [], sessions: {} };
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
  } catch {
    return { users: [], cards: [], sessions: {} };
  }
}

function saveLocalDB(data) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Local DB write notice:', err.message);
  }
}

// --------------------------------------------------------------------------
// ROW MAPPERS FOR SUPABASE (Postgres snake_case <-> JS camelCase)
// --------------------------------------------------------------------------
function cardFromRow(row) {
  if (!row) return null;
  let capabilities = [];
  if (Array.isArray(row.capabilities)) {
    capabilities = row.capabilities;
  } else if (typeof row.capabilities === 'string') {
    try { capabilities = JSON.parse(row.capabilities); } catch { capabilities = []; }
  }

  return {
    id: row.id,
    userId: row.user_id,
    username: row.username,
    fullName: row.full_name || '',
    roleTitle: row.role_title || '',
    positioningStatement: row.positioning_statement || '',
    capabilities,
    editionMark: row.edition_mark || 'DIGITAL PASS 2026',
    brandSubmark: row.brand_submark || 'CARD—PASS',
    photoUrl: row.photo_url || '',
    email: row.email || '',
    phone: row.phone || '',
    whatsapp: row.whatsapp || '',
    linkedinUrl: row.linkedin_url || '',
    portfolioUrl: row.portfolio_url || '',
    theme: row.theme || 'terracotta',
    updatedAt: row.updated_at
  };
}

function cardToRow(userId, updates) {
  const row = { updated_at: new Date().toISOString() };
  if (updates.fullName !== undefined) row.full_name = updates.fullName;
  if (updates.roleTitle !== undefined) row.role_title = updates.roleTitle;
  if (updates.positioningStatement !== undefined) row.positioning_statement = updates.positioningStatement;
  if (updates.capabilities !== undefined) row.capabilities = updates.capabilities;
  if (updates.editionMark !== undefined) row.edition_mark = updates.editionMark;
  if (updates.brandSubmark !== undefined) row.brand_submark = updates.brandSubmark;
  if (updates.photoUrl !== undefined) row.photo_url = updates.photoUrl;
  if (updates.email !== undefined) row.email = updates.email;
  if (updates.phone !== undefined) row.phone = updates.phone;
  if (updates.whatsapp !== undefined) row.whatsapp = updates.whatsapp;
  if (updates.linkedinUrl !== undefined) row.linkedin_url = updates.linkedinUrl;
  if (updates.portfolioUrl !== undefined) row.portfolio_url = updates.portfolioUrl;
  if (updates.theme !== undefined) row.theme = updates.theme;
  return row;
}

// --------------------------------------------------------------------------
// DATABASE METHODS
// --------------------------------------------------------------------------

async function findUserByEmail(email) {
  if (!email) return null;
  const cleanEmail = email.trim().toLowerCase();

  if (supabase) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .ilike('email', cleanEmail)
      .maybeSingle();
    if (!error && data) {
      return {
        id: data.id,
        email: data.email,
        username: data.username,
        passwordHash: data.password_hash,
        createdAt: data.created_at
      };
    }
  }

  const db = loadLocalDB();
  return db.users.find(u => u.email.toLowerCase() === cleanEmail) || null;
}

async function findUserByUsername(username) {
  if (!username) return null;
  const clean = username.trim().toLowerCase();

  if (supabase) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .ilike('username', clean)
      .maybeSingle();
    if (!error && data) {
      return {
        id: data.id,
        email: data.email,
        username: data.username,
        passwordHash: data.password_hash,
        createdAt: data.created_at
      };
    }
  }

  const db = loadLocalDB();
  return db.users.find(u => u.username.toLowerCase() === clean) || null;
}

async function findUserByIdentifier(identifier) {
  if (!identifier) return null;
  const clean = identifier.trim().toLowerCase();

  if (supabase) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .or(`email.ilike.${clean},username.ilike.${clean}`)
      .maybeSingle();
    if (!error && data) {
      return {
        id: data.id,
        email: data.email,
        username: data.username,
        passwordHash: data.password_hash,
        createdAt: data.created_at
      };
    }
  }

  const db = loadLocalDB();
  return db.users.find(u => u.email.toLowerCase() === clean || u.username.toLowerCase() === clean) || null;
}

async function findUserById(id) {
  if (!id) return null;

  if (supabase) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (!error && data) {
      return {
        id: data.id,
        email: data.email,
        username: data.username,
        passwordHash: data.password_hash,
        createdAt: data.created_at
      };
    }
  }

  const db = loadLocalDB();
  return db.users.find(u => u.id === id) || null;
}

async function createUser(email, username, password) {
  const cleanEmail = email.trim().toLowerCase();
  const cleanUsername = username.trim().toLowerCase();
  const userId = 'usr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
  const cardId = 'card_' + Date.now();
  const passwordHash = hashPassword(password);
  const now = new Date().toISOString();

  const newUser = {
    id: userId,
    email: cleanEmail,
    username: cleanUsername,
    passwordHash,
    createdAt: now
  };

  const defaultCard = {
    id: cardId,
    userId,
    username: cleanUsername,
    fullName: '',
    roleTitle: '',
    positioningStatement: '',
    capabilities: [],
    editionMark: 'DIGITAL PASS 2026',
    brandSubmark: cleanUsername.toUpperCase() + '—PASS',
    photoUrl: '',
    email: cleanEmail,
    phone: '',
    whatsapp: '',
    linkedinUrl: '',
    portfolioUrl: '',
    theme: 'terracotta',
    updatedAt: now
  };

  if (supabase) {
    const { error: userError } = await supabase.from('users').insert({
      id: userId,
      email: cleanEmail,
      username: cleanUsername,
      password_hash: passwordHash,
      created_at: now
    });
    if (userError) throw new Error(userError.message);

    const { error: cardError } = await supabase.from('cards').insert({
      id: cardId,
      user_id: userId,
      username: cleanUsername,
      full_name: '',
      role_title: '',
      positioning_statement: '',
      capabilities: [],
      edition_mark: 'DIGITAL PASS 2026',
      brand_submark: cleanUsername.toUpperCase() + '—PASS',
      photo_url: '',
      email: cleanEmail,
      phone: '',
      whatsapp: '',
      linkedin_url: '',
      portfolio_url: '',
      theme: 'terracotta',
      updated_at: now
    });
    if (cardError) throw new Error(cardError.message);

    return { user: newUser, card: defaultCard };
  }

  // Local fallback
  const db = loadLocalDB();
  db.users.push(newUser);
  db.cards.push(defaultCard);
  saveLocalDB(db);
  return { user: newUser, card: defaultCard };
}

async function getCardByUsername(username) {
  if (!username) return null;
  const clean = username.trim().toLowerCase();

  if (supabase) {
    const { data, error } = await supabase
      .from('cards')
      .select('*')
      .ilike('username', clean)
      .maybeSingle();
    if (!error && data) return cardFromRow(data);
  }

  const db = loadLocalDB();
  return db.cards.find(c => c.username.toLowerCase() === clean) || null;
}

async function getCardByUserId(userId) {
  if (!userId) return null;

  if (supabase) {
    const { data, error } = await supabase
      .from('cards')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (!error && data) return cardFromRow(data);
  }

  const db = loadLocalDB();
  return db.cards.find(c => c.userId === userId) || null;
}

async function updateCard(userId, updates) {
  if (!userId) return null;

  if (supabase) {
    const rowUpdates = cardToRow(userId, updates);
    const { data, error } = await supabase
      .from('cards')
      .update(rowUpdates)
      .eq('user_id', userId)
      .select('*')
      .maybeSingle();
    if (!error && data) return cardFromRow(data);
  }

  // Local fallback
  const db = loadLocalDB();
  const cardIndex = db.cards.findIndex(c => c.userId === userId);
  if (cardIndex === -1) return null;

  db.cards[cardIndex] = {
    ...db.cards[cardIndex],
    ...updates,
    updatedAt: new Date().toISOString()
  };

  saveLocalDB(db);
  return db.cards[cardIndex];
}

// Upload portrait buffer directly to Supabase Storage (public 'avatars' bucket)
async function uploadPhotoToStorage(fileBuffer, originalName, mimeType) {
  if (!supabase) return null;
  const ext = path.extname(originalName).toLowerCase() || '.jpg';
  const fileName = `portrait_${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`;

  const { data, error } = await supabase.storage
    .from('avatars')
    .upload(fileName, fileBuffer, {
      contentType: mimeType || 'image/jpeg',
      upsert: true
    });

  if (error) {
    console.warn('Supabase storage upload error:', error.message);
    return null;
  }

  const { data: publicUrlData } = supabase.storage
    .from('avatars')
    .getPublicUrl(fileName);

  return publicUrlData.publicUrl;
}

// Reset password by verifying email and username
async function resetUserPassword(email, username, newPassword) {
  const cleanEmail = (email || '').trim().toLowerCase();
  const cleanUsername = (username || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');

  if (!cleanEmail || !cleanUsername || !newPassword) {
    throw new Error('Email, username, and new password are required.');
  }
  if (newPassword.length < 6) {
    throw new Error('New password must be at least 6 characters.');
  }

  // Find user by email
  const user = await findUserByEmail(cleanEmail);
  if (!user) {
    throw new Error('No account found with this email address.');
  }

  // Verify username matches
  if (user.username.toLowerCase() !== cleanUsername) {
    throw new Error('The username does not match the registered email address.');
  }

  const newHash = hashPassword(newPassword);

  if (supabase) {
    const { data, error } = await supabase
      .from('users')
      .update({ password_hash: newHash })
      .eq('id', user.id)
      .select('*')
      .maybeSingle();

    if (error) {
      throw new Error('Database error updating password: ' + error.message);
    }
  }

  // Local fallback
  const localDb = loadLocalDB();
  const userIndex = localDb.users.findIndex(u => u.id === user.id);
  if (userIndex !== -1) {
    localDb.users[userIndex].passwordHash = newHash;
    saveLocalDB(localDb);
  }

  return user;
}

module.exports = {
  hashPassword,
  createSession,
  getUserBySession,
  deleteSession,
  findUserByEmail,
  findUserByUsername,
  findUserByIdentifier,
  findUserById,
  createUser,
  resetUserPassword,
  getCardByUsername,
  getCardByUserId,
  updateCard,
  uploadPhotoToStorage
};

