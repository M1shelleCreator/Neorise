let currentUser = getCurrentUser();
if (!currentUser) window.location.href = 'login.html';

function updateProfile() {
    document.getElementById('profileUsername').textContent = currentUser.username;
    document.getElementById('profilePhone').textContent = currentUser.phone || 'не указан';
    document.getElementById('profileEmail').textContent = currentUser.email || 'не указан';
    document.getElementById('profileBirthday').textContent = currentUser.birthday || 'не указана';
    
    const roleMap = { 'director': '👑 Директор', 'client': 'Клиент' };
    document.getElementById('profileRole').textContent = roleMap[currentUser.role] || 'Клиент';
    
    const status = document.getElementById('twoFactorStatus');
    if (currentUser.twoFactorEnabled) {
        status.textContent = '✅ Включена';
        status.style.color = '#39ff14';
    } else {
        status.textContent = '❌ Выключена';
        status.style.color = '#ff4444';
    }
    
    const avatar = document.getElementById('profileAvatar');
    if (currentUser.avatar) {
        avatar.src = currentUser.avatar;
    } else {
        avatar.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="150" height="150"%3E%3Crect width="150" height="150" fill="%23b44dff"/%3E%3Ctext x="75" y="95" text-anchor="middle" fill="%230a0a0a" font-size="60" font-family="Arial"%3E' + currentUser.username[0].toUpperCase() + '%3C/text%3E%3C/svg%3E';
    }
}
updateProfile();

document.getElementById('changeAvatarBtn').onclick = () => document.getElementById('avatarInput').click();
document.getElementById('avatarInput').onchange = function(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(ev) {
            currentUser.avatar = ev.target.result;
            updateUserData(currentUser);
            updateProfile();
        };
        reader.readAsDataURL(file);
    }
};

document.getElementById('editProfileBtn').onclick = function() {
    document.getElementById('editUsername').value = currentUser.username;
    document.getElementById('editPhone').value = currentUser.phone || '';
    document.getElementById('editEmail').value = currentUser.email || '';
    document.getElementById('editBirthday').value = currentUser.birthday || '';
    document.getElementById('editModal').style.display = 'flex';
};

document.getElementById('editForm').onsubmit = function(e) {
    e.preventDefault();
    const newUsername = document.getElementById('editUsername').value.trim();
    const msg = document.getElementById('editMessage');
    
    if (newUsername.length < 2) {
        msg.textContent = '❌ Имя слишком короткое';
        msg.style.color = '#ff4444';
        return;
    }
    if (newUsername !== currentUser.username) {
        const users = getUsers();
        if (users.find(u => u.username === newUsername)) {
            msg.textContent = '❌ Имя уже занято';
            msg.style.color = '#ff4444';
            return;
        }
        currentUser.username = newUsername;
    }
    
    currentUser.phone = document.getElementById('editPhone').value.trim();
    currentUser.email = document.getElementById('editEmail').value.trim();
    currentUser.birthday = document.getElementById('editBirthday').value;
    updateUserData(currentUser);
    updateProfile();
    msg.textContent = '✅ Профиль обновлён';
    msg.style.color = '#39ff14';
    setTimeout(() => {
        closeModal('editModal');
        msg.textContent = '';
    }, 1000);
};

document.getElementById('setupTwoFactorBtn').onclick = function() {
    const modal = document.getElementById('twoFactorModal');
    const info = document.getElementById('twoFactorInfo');
    const setup = document.getElementById('twoFactorSetup');
    const disable = document.getElementById('twoFactorDisable');
    
    if (currentUser.twoFactorEnabled) {
        info.textContent = '✅ 2FA включена';
        setup.style.display = 'none';
        disable.style.display = 'block';
    } else {
        if (!currentUser.twoFactorSecret) {
            currentUser.twoFactorSecret = generateSecret();
            updateUserData(currentUser);
        }
        document.getElementById('twoFactorSecretDisplay').textContent = currentUser.twoFactorSecret;
        info.textContent = '🔐 Включите 2FA через приложение-аутентификатор';
        setup.style.display = 'block';
        disable.style.display = 'none';
    }
    modal.style.display = 'flex';
};

document.getElementById('verifyTwoFactorBtn').onclick = function() {
    const code = document.getElementById('twoFactorTestCode').value.trim();
    const msg = document.getElementById('twoFactorSetupMessage');
    
    if (!code || code.length !== 6) {
        msg.textContent = '❌ Введите 6-значный код';
        msg.style.color = '#ff4444';
        return;
    }
    
    if (verifyTwoFactorCode(currentUser.twoFactorSecret, code)) {
        currentUser.twoFactorEnabled = true;
        updateUserData(currentUser);
        msg.textContent = '✅ 2FA включена!';
        msg.style.color = '#39ff14';
        updateProfile();
        setTimeout(() => closeModal('twoFactorModal'), 1500);
    } else {
        msg.textContent = '❌ Неверный код';
        msg.style.color = '#ff4444';
    }
};

document.getElementById('disableTwoFactorBtn').onclick = function() {
    if (!confirm('Отключить 2FA?')) return;
    const password = prompt('Введите пароль:');
    if (password !== currentUser.password) {
        alert('❌ Неверный пароль');
        return;
    }
    currentUser.twoFactorEnabled = false;
    updateUserData(currentUser);
    updateProfile();
    alert('✅ 2FA отключена');
    closeModal('twoFactorModal');
};

document.getElementById('logoutBtn').onclick = function() {
    if (confirm('Выйти из аккаунта?')) {
        logout();
    }
};

function closeModal(id) {
    document.getElementById(id).style.display = 'none';
}

document.querySelectorAll('.modal').forEach(modal => {
    modal.onclick = function(e) {
        if (e.target === this) this.style.display = 'none';
    };
});