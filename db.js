const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DB_PATH = path.join(__dirname, 'data', 'db.json');

// Ensure data directory exists
if (!fs.existsSync(path.join(__dirname, 'data'))) {
  fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
}

// Seed initial default database
function getInitialData() {
  return {
    users: [
      {
        id: 'user_dokitoor',
        email: 'oluseyi.ogundipe@outlook.com',
        username: 'dokitoor',
        passwordHash: hashPassword('password123'),
        createdAt: new Date().toISOString()
      },
      {
        id: 'user_oluseyi',
        email: 'oluseyi@example.com',
        username: 'oluseyi',
        passwordHash: hashPassword('password123'),
        createdAt: new Date().toISOString()
      }
    ],
    cards: [
      {
        id: 'card_dokitoor',
        userId: 'user_dokitoor',
        username: 'dokitoor',
        fullName: '',
        roleTitle: '',
        positioningStatement: '',
        capabilities: [],
        editionMark: 'DIGITAL PASS 2026',
        brandSubmark: 'CARD—PASS',
        photoUrl: '',
        email: 'oluseyi.ogundipe@outlook.com',
        phone: '',
        whatsapp: '',
        linkedinUrl: '',
        portfolioUrl: '',
        theme: 'terracotta',
        updatedAt: new Date().toISOString()
      },
      {
        id: 'card_oluseyi',
        userId: 'user_oluseyi',
        username: 'oluseyi',
        fullName: '',
        roleTitle: '',
        positioningStatement: '',
        capabilities: [],
        editionMark: 'DIGITAL PASS 2026',
        brandSubmark: 'CARD—PASS',
        photoUrl: '',
        email: 'oluseyi@example.com',
        phone: '',
        whatsapp: '',
        linkedinUrl: '',
        portfolioUrl: '',
        theme: 'terracotta',
        updatedAt: new Date().toISOString()
      }
    ],
    sessions: {}
  };
}

function hashPassword(password) {
  return crypto.createHash('sha256').update(password + 'salt_card_platform_2026').digest('hex');
}

function loadDB() {
  if (!fs.existsSync(DB_PATH)) {
    const initial = getInitialData();
    saveDB(initial);
    return initial;
  }
  try {
    const data = fs.readFileSync(DB_PATH, 'utf-8');
    return JSON.parse(data);
  } catch {
    const initial = getInitialData();
    saveDB(initial);
    return initial;
  }
}

function saveDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

module.exports = {
  hashPassword,
  
  findUserByEmail(email) {
    if (!email) return null;
    const db = loadDB();
    return db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  },

  findUserByUsername(username) {
    if (!username) return null;
    const db = loadDB();
    return db.users.find(u => u.username.toLowerCase() === username.toLowerCase());
  },

  findUserByIdentifier(identifier) {
    if (!identifier) return null;
    const db = loadDB();
    const clean = identifier.trim().toLowerCase();
    return db.users.find(u => u.email.toLowerCase() === clean || u.username.toLowerCase() === clean);
  },

  findUserById(id) {
    const db = loadDB();
    return db.users.find(u => u.id === id);
  },

  createUser(email, username, password) {
    const db = loadDB();
    const newUser = {
      id: 'usr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      email: email.toLowerCase(),
      username: username.toLowerCase(),
      passwordHash: hashPassword(password),
      createdAt: new Date().toISOString()
    };
    db.users.push(newUser);

    // Create default card for new user with empty initial fields
    const defaultCard = {
      id: 'card_' + Date.now(),
      userId: newUser.id,
      username: newUser.username,
      fullName: '',
      roleTitle: '',
      positioningStatement: '',
      capabilities: [],
      editionMark: 'DIGITAL PASS 2026',
      brandSubmark: username.toUpperCase() + '—PASS',
      photoUrl: '',
      email: newUser.email,
      phone: '',
      whatsapp: '',
      linkedinUrl: '',
      portfolioUrl: '',
      theme: 'terracotta',
      updatedAt: new Date().toISOString()
    };
    db.cards.push(defaultCard);

    saveDB(db);
    return { user: newUser, card: defaultCard };
  },

  getCardByUsername(username) {
    const db = loadDB();
    return db.cards.find(c => c.username.toLowerCase() === username.toLowerCase());
  },

  getCardByUserId(userId) {
    const db = loadDB();
    return db.cards.find(c => c.userId === userId);
  },

  updateCard(userId, cardUpdates) {
    const db = loadDB();
    const cardIndex = db.cards.findIndex(c => c.userId === userId);
    if (cardIndex === -1) return null;

    db.cards[cardIndex] = {
      ...db.cards[cardIndex],
      ...cardUpdates,
      updatedAt: new Date().toISOString()
    };

    saveDB(db);
    return db.cards[cardIndex];
  },

  createSession(userId) {
    const db = loadDB();
    const token = 'token_' + Date.now() + '_' + Math.random().toString(36).substring(2, 12);
    db.sessions[token] = { userId, createdAt: new Date().toISOString() };
    saveDB(db);
    return token;
  },

  getUserBySession(token) {
    if (!token) return null;
    const db = loadDB();
    const session = db.sessions[token];
    if (!session) return null;
    return db.users.find(u => u.id === session.userId);
  },

  deleteSession(token) {
    const db = loadDB();
    if (db.sessions[token]) {
      delete db.sessions[token];
      saveDB(db);
    }
  }
};
