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
        fullName: 'Oluseyi Ogundipe',
        roleTitle: 'Product & Information Design | Project Management',
        positioningStatement: 'Designing digital products, simplifying complex information, and helping turn ideas into meaningful projects.',
        capabilities: ['PRODUCT DESIGN', 'INFORMATION DESIGN', 'PROJECT MANAGEMENT'],
        editionMark: 'NAIROBI EDITION 2026',
        brandSubmark: 'OO—DESIGN',
        photoUrl: '/assets/oluseyi-ogundipe.jpg',
        email: 'oluseyi.ogundipe@outlook.com',
        phone: '+234 814 891 8630',
        whatsapp: '+2348148918630',
        linkedinUrl: 'https://www.linkedin.com/in/dokitoor-oluseyi/',
        portfolioUrl: 'https://oluseyiogundipe.com',
        theme: 'terracotta',
        updatedAt: new Date().toISOString()
      },
      {
        id: 'card_oluseyi',
        userId: 'user_oluseyi',
        username: 'oluseyi',
        fullName: 'Oluseyi Ogundipe',
        roleTitle: 'Product & Information Design | Project Management',
        positioningStatement: 'Designing digital products, simplifying complex information, and helping turn ideas into meaningful projects.',
        capabilities: ['PRODUCT DESIGN', 'INFORMATION DESIGN', 'PROJECT MANAGEMENT'],
        editionMark: 'NAIROBI EDITION 2026',
        brandSubmark: 'OO—DESIGN',
        photoUrl: '/assets/oluseyi-ogundipe.jpg',
        email: 'oluseyi.ogundipe@outlook.com',
        phone: '+234 814 891 8630',
        whatsapp: '+2348148918630',
        linkedinUrl: 'https://www.linkedin.com/in/dokitoor-oluseyi/',
        portfolioUrl: 'https://oluseyiogundipe.com',
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

    // Create default card for new user
    const defaultCard = {
      id: 'card_' + Date.now(),
      userId: newUser.id,
      username: newUser.username,
      fullName: username.charAt(0).toUpperCase() + username.slice(1),
      roleTitle: 'Digital Creator & Professional',
      positioningStatement: 'Welcome to my digital business card. Connect with me across links below.',
      capabilities: ['PRODUCT DESIGN', 'STRATEGY', 'CREATIVE'],
      editionMark: 'DIGITAL PASS 2026',
      brandSubmark: username.toUpperCase() + '—PASS',
      photoUrl: '/assets/oluseyi-ogundipe.jpg',
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
