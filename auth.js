function getUsers() {
    return JSON.parse(localStorage.getItem('neorise_users')) || [];
}

function saveUsers(users) {
    localStorage.setItem('neorise_users', JSON.stringify(users));
}

function getCurrentUser() {
    return JSON.parse(localStorage.getItem('neorise_current_user'));
}

function setCurrentUser(user) {
    localStorage.setItem('neorise_current_user', JSON.stringify(user));
}

function logout() {
    localStorage.removeItem('neorise_current_user');
    window.location.href = 'login.html';
}

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

function registerUser(username, age, phone, email, birthday, password) {
    let users = getUsers();
    if (users.find(u => u.username === username)) {
        return { success: false, message: 'Имя уже занято' };
    }
    if (users.find(u => u.email === email)) {
        return { success: false, message: 'Email уже используется' };
    }
    const secret = generateSecret();
    
    let role = 'client';
    if (username === 'Михаил') {
        role = 'director';
    }
    
    const newUser = {
        username,
        age,
        phone,
        email,
        birthday,
        password,
        avatar: null,
        twoFactorSecret: secret,
        twoFactorEnabled: false,
        role: role,
        notifications: [],
        lastSeen: Date.now(),
        lottery: {
            lastTicket: 0,
            hasTicket: false
        }
    };
    users.push(newUser);
    saveUsers(users);
    return { success: true, user: newUser, secret: secret };
}

function loginUser(username, password, twoFactorCode) {
    let users = getUsers();
    let user = users.find(u => u.username === username);
    if (!user) {
        return { success: false, message: 'Пользователь не найден' };
    }
    if (user.password !== password) {
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

function updateUserData(updatedUser) {
    let users = getUsers();
    let index = users.findIndex(u => u.username === updatedUser.username);
    if (index !== -1) {
        users[index] = updatedUser;
        saveUsers(users);
        setCurrentUser(updatedUser);
        return true;
    }
    return false;
}

function getUserByUsername(username) {
    return getUsers().find(u => u.username === username);
}