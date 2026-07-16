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
    const username = getCurrentUser()?.username;
    const user = getCurrentUser();
    localStorage.removeItem('neorise_current_user');
    
    // Уведомление ТОЛЬКО если пользователь — сотрудник или директор (не Михаил)
    if (username && user && (user.role === 'employee' || user.role === 'director') && username !== 'Михаил') {
        const users = getUsers();
        const director = users.find(u => u.role === 'director');
        if (director) {
            if (!director.notifications) director.notifications = [];
            director.notifications.push({
                id: 'notif_' + Date.now(),
                type: 'logout',
                from: username,
                message: `🚪 Сотрудник "${username}" вышел из аккаунта`,
                timestamp: Date.now(),
                status: 'read'
            });
            let idx = users.findIndex(u => u.username === 'Михаил');
            if (idx !== -1) {
                users[idx] = director;
                saveUsers(users);
            }
        }
    }
    
    window.location.href = 'login.html';
}

function generateTwoFactorCode() {
    return String(Math.floor(100000 + Math.random() * 900000));
}

function generateBackupCodes() {
    const codes = [];
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ23456789';
    for (let i = 0; i < 10; i++) {
        let code = '';
        for (let j = 0; j < 8; j++) {
            code += chars[Math.floor(Math.random() * chars.length)];
        }
        codes.push(code);
    }
    return codes;
}

function verifyTwoFactorCode(user, enteredCode) {
    if (user.twoFactorCode && user.twoFactorCode === enteredCode) {
        return { success: true, type: 'main' };
    }
    if (user.backupCodes && user.backupCodes.includes(enteredCode)) {
        user.backupCodes = user.backupCodes.filter(c => c !== enteredCode);
        return { success: true, type: 'backup', used: true };
    }
    return { success: false };
}

function registerUser(username, age, phone, email, birthday, password) {
    let users = getUsers();
    if (users.find(u => u.username === username)) {
        return { success: false, message: 'Имя уже занято' };
    }
    if (users.find(u => u.email === email)) {
        return { success: false, message: 'Email уже используется' };
    }
    
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
        twoFactorEnabled: false,
        twoFactorCode: null,
        backupCodes: [],
        role: role,
        rating: 0,
        ratingCount: 0,
        orders: [],
        chats: [],
        notifications: [],
        lastSeen: Date.now()
    };
    users.push(newUser);
    saveUsers(users);
    return { success: true, user: newUser };
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
        const result = verifyTwoFactorCode(user, twoFactorCode);
        if (!result.success) {
            return { success: false, message: 'Неверный код 2FA' };
        }
        if (result.used) {
            let idx = users.findIndex(u => u.username === username);
            if (idx !== -1) {
                users[idx] = user;
                saveUsers(users);
            }
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

function deleteAccount(username, password) {
    let users = getUsers();
    let user = users.find(u => u.username === username);
    if (!user) {
        return { success: false, message: 'Пользователь не найден' };
    }
    if (user.password !== password) {
        return { success: false, message: 'Неверный пароль' };
    }
    
    // Уведомление ТОЛЬКО если пользователь — сотрудник или директор (не Михаил)
    if (username !== 'Михаил' && (user.role === 'employee' || user.role === 'director')) {
        const director = users.find(u => u.role === 'director');
        if (director) {
            if (!director.notifications) director.notifications = [];
            director.notifications.push({
                id: 'notif_' + Date.now(),
                type: 'delete_account',
                from: username,
                message: `🗑️ Сотрудник "${username}" удалил свой аккаунт`,
                timestamp: Date.now(),
                status: 'read'
            });
            let idx = users.findIndex(u => u.username === 'Михаил');
            if (idx !== -1) {
                users[idx] = director;
            }
        }
    }
    
    users = users.filter(u => u.username !== username);
    saveUsers(users);
    
    let allChats = JSON.parse(localStorage.getItem('neorise_chats')) || [];
    allChats = allChats.filter(c => !c.members.includes(username));
    localStorage.setItem('neorise_chats', JSON.stringify(allChats));
    
    let allOrders = JSON.parse(localStorage.getItem('neorise_orders')) || [];
    allOrders = allOrders.filter(o => o.client !== username && o.employee !== username);
    localStorage.setItem('neorise_orders', JSON.stringify(allOrders));
    
    if (username === getCurrentUser()?.username) {
        localStorage.removeItem('neorise_current_user');
    }
    
    return { success: true, message: 'Аккаунт удалён' };
}

function assignEmployee(username) {
    let users = getUsers();
    let user = users.find(u => u.username === username);
    if (!user) {
        return { success: false, message: 'Пользователь не найден' };
    }
    if (user.role === 'director') {
        return { success: false, message: 'Нельзя назначить директора' };
    }
    if (user.role === 'employee') {
        return { success: false, message: 'Уже сотрудник' };
    }
    
    user.role = 'employee';
    let idx = users.findIndex(u => u.username === username);
    if (idx !== -1) {
        users[idx] = user;
        saveUsers(users);
    }
    
    const director = users.find(u => u.role === 'director');
    if (director) {
        if (!director.notifications) director.notifications = [];
        director.notifications.push({
            id: 'notif_' + Date.now(),
            type: 'assign_employee',
            from: username,
            message: `👔 Пользователь "${username}" был назначен сотрудником`,
            timestamp: Date.now(),
            status: 'read'
        });
        let idx2 = users.findIndex(u => u.username === 'Михаил');
        if (idx2 !== -1) {
            users[idx2] = director;
            saveUsers(users);
        }
    }
    
    if (!user.notifications) user.notifications = [];
    user.notifications.push({
        id: 'notif_' + Date.now(),
        type: 'promoted',
        message: `🎉 Вы были назначены сотрудником!`,
        timestamp: Date.now(),
        status: 'read'
    });
    let idx3 = users.findIndex(u => u.username === username);
    if (idx3 !== -1) {
        users[idx3] = user;
        saveUsers(users);
    }
    
    if (username === currentUser.username) {
        currentUser = user;
        setCurrentUser(user);
        updateHeader();
    }
    
    return { success: true, message: `✅ Пользователь ${username} назначен сотрудником` };
}

function fireEmployee(username) {
    let users = getUsers();
    let user = users.find(u => u.username === username);
    if (!user) {
        return { success: false, message: 'Пользователь не найден' };
    }
    if (user.role === 'director') {
        return { success: false, message: 'Нельзя уволить директора' };
    }
    if (user.role !== 'employee') {
        return { success: false, message: 'Пользователь не является сотрудником' };
    }
    
    user.role = 'client';
    let idx = users.findIndex(u => u.username === username);
    if (idx !== -1) {
        users[idx] = user;
        saveUsers(users);
    }
    
    const director = users.find(u => u.role === 'director');
    if (director) {
        if (!director.notifications) director.notifications = [];
        director.notifications.push({
            id: 'notif_' + Date.now(),
            type: 'fire_employee',
            from: username,
            message: `👋 Сотрудник "${username}" был уволен`,
            timestamp: Date.now(),
            status: 'read'
        });
        let idx2 = users.findIndex(u => u.username === 'Михаил');
        if (idx2 !== -1) {
            users[idx2] = director;
            saveUsers(users);
        }
    }
    
    if (!user.notifications) user.notifications = [];
    user.notifications.push({
        id: 'notif_' + Date.now(),
        type: 'fired',
        message: `⚠️ Вы были уволены. Теперь вы клиент.`,
        timestamp: Date.now(),
        status: 'read'
    });
    let idx3 = users.findIndex(u => u.username === username);
    if (idx3 !== -1) {
        users[idx3] = user;
        saveUsers(users);
    }
    
    if (username === currentUser.username) {
        currentUser = user;
        setCurrentUser(user);
        updateHeader();
    }
    
    return { success: true, message: `✅ Пользователь ${username} уволен` };
}