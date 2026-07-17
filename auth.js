// ============================================================
// ===== ЗАЩИТА ДАННЫХ =====
// ============================================================

// === Шифрование пароля (Base64) ===
function encryptPassword(password) {
    return btoa(password);
}

function decryptPassword(encrypted) {
    try {
        return atob(encrypted);
    } catch {
        return null;
    }
}

// === Экранирование ввода (XSS защита) ===
function sanitizeInput(input) {
    if (!input) return '';
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        "/": '&#x2F;',
    };
    return String(input).replace(/[&<>"'/]/g, s => map[s]);
}

// === Простая подпись данных ===
function signData(data) {
    const secret = 'NeoriseSecretKey2026';
    return btoa(JSON.stringify(data) + secret);
}

function verifySignature(data, signature) {
    const secret = 'NeoriseSecretKey2026';
    const expected = btoa(JSON.stringify(data) + secret);
    return signature === expected;
}

// === Очистка данных перед сохранением ===
function cleanUserData(user) {
    const clean = { ...user };
    delete clean._signature;
    delete clean._temp;
    return clean;
}

// ============================================================
// ===== ОСНОВНЫЕ ФУНКЦИИ =====
// ============================================================

function getUsers() {
    try {
        const raw = localStorage.getItem('neorise_users');
        if (!raw) return [];
        const data = JSON.parse(raw);
        // Проверяем подпись
        if (data._signature && !verifySignature(data.users || [], data._signature)) {
            console.warn('⚠️ Подпись данных нарушена!');
            return [];
        }
        return data.users || [];
    } catch {
        return [];
    }
}

function saveUsers(users) {
    try {
        const cleanUsers = users.map(u => cleanUserData(u));
        const data = {
            users: cleanUsers,
            _signature: signData(cleanUsers)
        };
        localStorage.setItem('neorise_users', JSON.stringify(data));
        return true;
    } catch {
        return false;
    }
}

function getCurrentUser() {
    try {
        const raw = localStorage.getItem('neorise_current_user');
        if (!raw) return null;
        const user = JSON.parse(raw);
        // Проверяем подпись
        if (user._signature && !verifySignature(user, user._signature)) {
            console.warn('⚠️ Подпись пользователя нарушена!');
            localStorage.removeItem('neorise_current_user');
            return null;
        }
        return user;
    } catch {
        return null;
    }
}

function setCurrentUser(user) {
    try {
        const clean = cleanUserData(user);
        clean._signature = signData(clean);
        localStorage.setItem('neorise_current_user', JSON.stringify(clean));
        return true;
    } catch {
        return false;
    }
}

function logout() {
    localStorage.removeItem('neorise_current_user');
    window.location.href = 'login.html';
}

// ============================================================
// ===== 2FA =====
// ============================================================

function generateSecret() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let secret = '';
    for (let i = 0; i < 16; i++) {
        secret += chars[Math.floor(Math.random() * chars.length)];
    }
    return secret;
}

function verifyTwoFactorCode(secret, code) {
    if (!secret || !code) return false;
    const now = Math.floor(Date.now() / 30000);
    const hash = simpleHash(secret + now);
    const expectedCode = String(hash).slice(0, 6).padStart(6, '0');
    return code === expectedCode;
}

function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash);
}

// ============================================================
// ===== РЕГИСТРАЦИЯ =====
// ============================================================

function registerUser(username, age, phone, email, birthday, password) {
    // Санитайзинг
    username = sanitizeInput(username.trim());
    phone = sanitizeInput(phone.trim());
    email = sanitizeInput(email.trim());
    birthday = sanitizeInput(birthday.trim());
    
    let users = getUsers();
    if (users.find(u => u.username === username)) {
        return { success: false, message: 'Имя уже занято' };
    }
    if (users.find(u => u.email === email)) {
        return { success: false, message: 'Email уже используется' };
    }
    
    const secret = generateSecret();
    const encryptedPassword = encryptPassword(password);
    
    let role = 'client';
    if (username === 'Михаил') {
        role = 'director';
    }
    
    const newUser = {
        username,
        age: parseInt(age) || 0,
        phone,
        email,
        birthday,
        password: encryptedPassword,
        avatar: null,
        twoFactorSecret: secret,
        twoFactorEnabled: false,
        role: role,
        notifications: [],
        lastSeen: Date.now(),
        lottery: {
            lastTicket: 0,
            hasTicket: false,
            luckWins: 0
        }
    };
    
    users.push(newUser);
    if (!saveUsers(users)) {
        return { success: false, message: 'Ошибка сохранения данных' };
    }
    return { success: true, user: newUser, secret: secret };
}

// ============================================================
// ===== ВХОД =====
// ============================================================

function loginUser(username, password, twoFactorCode) {
    username = sanitizeInput(username.trim());
    let users = getUsers();
    let user = users.find(u => u.username === username);
    if (!user) {
        return { success: false, message: 'Пользователь не найден' };
    }
    
    const decryptedPassword = decryptPassword(user.password);
    if (decryptedPassword !== password) {
        return { success: false, message: 'Неверный пароль' };
    }
    
    if (user.twoFactorEnabled) {
        if (!twoFactorCode) {
            return { success: false, message: 'Требуется код 2FA', twoFactorRequired: true };
        }
        if (!verifyTwoFactorCode(user.twoFactorSecret, twoFactorCode)) {
            return { success: false, message: 'Неверный код 2FA' };
        }
    }
    
    user.lastSeen = Date.now();
    setCurrentUser(user);
    return { success: true, user };
}

// ============================================================
// ===== ОБНОВЛЕНИЕ ДАННЫХ =====
// ============================================================

function updateUserData(updatedUser) {
    let users = getUsers();
    let index = users.findIndex(u => u.username === updatedUser.username);
    if (index !== -1) {
        users[index] = updatedUser;
        if (!saveUsers(users)) {
            return false;
        }
        setCurrentUser(updatedUser);
        return true;
    }
    return false;
}

function getUserByUsername(username) {
    username = sanitizeInput(username.trim());
    return getUsers().find(u => u.username === username);
}