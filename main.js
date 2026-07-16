let currentUser = getCurrentUser();
if (!currentUser) window.location.href = 'login.html';

let chats = JSON.parse(localStorage.getItem('neorise_chats')) || [];

function saveChats() {
    localStorage.setItem('neorise_chats', JSON.stringify(chats));
}

function formatDate(timestamp) {
    return new Date(timestamp).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function getUserStatus(username) {
    const user = getUserByUsername(username);
    if (!user) return 'offline';
    const lastSeen = user.lastSeen || 0;
    const now = Date.now();
    if (now - lastSeen < 120000) return 'online';
    return 'offline';
}

function updateUserLastSeen() {
    if (currentUser) {
        currentUser.lastSeen = Date.now();
        updateUserData(currentUser);
    }
}

setInterval(updateUserLastSeen, 15000);
updateUserLastSeen();

// ============================================================
// ===== ШАПКА =====
// ============================================================
function updateHeader() {
    document.getElementById('headerName').textContent = currentUser.username;
    const avatar = document.getElementById('headerAvatar');
    if (currentUser.avatar) {
        avatar.src = currentUser.avatar;
    } else {
        avatar.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="40" height="40"%3E%3Crect width="40" height="40" fill="%23b44dff"/%3E%3Ctext x="20" y="27" text-anchor="middle" fill="%230a0a0a" font-size="18" font-family="Arial"%3E' + currentUser.username[0].toUpperCase() + '%3C/text%3E%3C/svg%3E';
    }
    const notifs = currentUser.notifications || [];
    const badge = document.getElementById('notifBadge');
    if (notifs.length > 0) {
        badge.style.display = 'inline';
        badge.textContent = notifs.length;
        document.getElementById('notifBtn').textContent = '📬';
    } else {
        badge.style.display = 'none';
        document.getElementById('notifBtn').textContent = '📭';
    }
}
updateHeader();

document.getElementById('profileBtnHeader').onclick = () => window.location.href = 'profile.html';
document.getElementById('notifBtn').onclick = openNotifModal;

// ============================================================
// ===== ЛАТЕРЕЯ =====
// ============================================================
let lotteryActive = false;
let lotteryResults = [];
let revealedCount = 0;

function openLottery() {
    const modal = document.getElementById('lotteryModal');
    if (!modal) {
        alert('❌ Ошибка: модалка лотереи не найдена');
        return;
    }
    
    const now = Date.now();
    const twoHours = 2 * 60 * 60 * 1000;
    
    if (!currentUser.lottery) {
        currentUser.lottery = { lastTicket: 0, hasTicket: false };
    }
    
    if (currentUser.lottery.hasTicket) {
        alert('❌ У вас уже есть активный билет! Откройте его в разделе "Латерея".');
        return;
    }
    
    if (now - currentUser.lottery.lastTicket < twoHours) {
        const remaining = twoHours - (now - currentUser.lottery.lastTicket);
        const minutes = Math.floor(remaining / 60000);
        const seconds = Math.floor((remaining % 60000) / 1000);
        alert(`⏳ Новый билет будет доступен через ${minutes} мин ${seconds} сек.`);
        return;
    }
    
    // Выдаём билет
    currentUser.lottery.lastTicket = now;
    currentUser.lottery.hasTicket = true;
    updateUserData(currentUser);
    
    // Генерируем результаты
    lotteryResults = [];
    let luckCount = 0;
    for (let i = 0; i < 3; i++) {
        const isLuck = Math.random() < 0.01;
        lotteryResults.push(isLuck ? 'LUCK' : '❌');
        if (isLuck) luckCount++;
    }
    
    revealedCount = 0;
    lotteryActive = true;
    
    // Показываем модалку
    document.getElementById('lotteryMessage').textContent = '🎴 Стирайте карты, чтобы открыть результат!';
    document.getElementById('lotteryMessage').style.color = '#888';
    document.getElementById('closeLotteryBtn').style.display = 'none';
    
    // Сбрасываем карты
    document.querySelectorAll('.scratch-card').forEach((card, index) => {
        const cover = card.querySelector('.scratch-cover');
        const result = card.querySelector('.scratch-result');
        cover.className = 'scratch-cover silver';
        cover.textContent = '?';
        cover.style.opacity = '1';
        result.textContent = '';
        result.className = 'scratch-result';
        card.style.pointerEvents = 'auto';
        card.dataset.revealed = 'false';
    });
    
    modal.style.display = 'flex';
}

document.querySelectorAll('.scratch-card').forEach(card => {
    card.addEventListener('click', function() {
        if (!lotteryActive) return;
        if (this.dataset.revealed === 'true') return;
        
        const index = parseInt(this.dataset.index);
        const cover = this.querySelector('.scratch-cover');
        const result = this.querySelector('.scratch-result');
        
        // Показываем результат
        const value = lotteryResults[index];
        cover.className = 'scratch-cover revealed';
        cover.textContent = '';
        
        result.textContent = value;
        result.className = 'scratch-result ' + (value === 'LUCK' ? 'luck' : 'lose');
        
        this.dataset.revealed = 'true';
        revealedCount++;
        
        // Проверяем, все ли карты открыты
        if (revealedCount === 3) {
            const luckCount = lotteryResults.filter(r => r === 'LUCK').length;
            const message = document.getElementById('lotteryMessage');
            const closeBtn = document.getElementById('closeLotteryBtn');
            
            if (luckCount >= 2) {
                // ВЫИГРЫШ
                message.textContent = '🎉 Вы выиграли роль [LUCK] в Discord сервере NyxonStudio_Official! Ссылка в 📬';
                message.style.color = '#ffd700';
                message.style.textShadow = '0 0 20px #ffd700';
                
                // Отправляем ссылку в уведомления
                if (!currentUser.notifications) currentUser.notifications = [];
                currentUser.notifications.push({
                    id: 'notif_' + Date.now(),
                    type: 'discord_link',
                    message: '🔗 Ссылка на Discord сервер NyxonStudio_Official: https://discord.gg/JDmpxcKYHn',
                    timestamp: Date.now()
                });
                updateUserData(currentUser);
                updateHeader();
                
                // Уведомление Михаилу
                const director = getUsers().find(u => u.role === 'director');
                if (director) {
                    if (!director.notifications) director.notifications = [];
                    director.notifications.push({
                        id: 'notif_' + Date.now(),
                        type: 'lottery_win',
                        message: `🎰 Пользователь "${currentUser.username}" выиграл в латерее от Nyxon Studio роль [LUCK]!`,
                        timestamp: Date.now()
                    });
                    let users = getUsers();
                    let idx = users.findIndex(u => u.username === 'Михаил');
                    if (idx !== -1) {
                        users[idx] = director;
                        saveUsers(users);
                    }
                }
                
                // Создаём чат WIN
                const winChat = {
                    id: 'win_' + Date.now(),
                    name: 'WIN',
                    members: ['Михаил', currentUser.username],
                    messages: [],
                    creator: 'Михаил',
                    isWinChat: true
                };
                chats.push(winChat);
                saveChats();
                
                closeBtn.style.display = 'inline-block';
                lotteryActive = false;
                
                setTimeout(() => {
                    message.textContent = '🎉 Поздравляем! Вы выиграли [LUCK]!';
                    message.style.color = '#ffd700';
                }, 5000);
                
            } else {
                // ПРОИГРЫШ
                message.textContent = '😔 Вы проиграли, возможно повезёт позже (новая латерея каждые 2 часа в разделе "латерея")';
                message.style.color = '#888';
                closeBtn.style.display = 'inline-block';
                lotteryActive = false;
            }
            
            // Удаляем билет
            currentUser.lottery.hasTicket = false;
            updateUserData(currentUser);
        }
    });
});

document.getElementById('lotteryBtn').onclick = openLottery;

document.getElementById('closeLotteryBtn').onclick = function() {
    closeModal('lotteryModal');
    updateTicketInfo();
};

// ============================================================
// ===== ИНФО О БИЛЕТЕ =====
// ============================================================
function updateTicketInfo() {
    const infoDiv = document.getElementById('ticketInfo');
    const status = document.getElementById('ticketStatus');
    
    if (!currentUser.lottery) {
        currentUser.lottery = { lastTicket: 0, hasTicket: false };
    }
    
    if (currentUser.lottery.hasTicket) {
        infoDiv.style.display = 'block';
        status.textContent = '🎟 У вас есть активный билет! Откройте латерею, чтобы сыграть.';
        status.style.color = '#39ff14';
    } else {
        const now = Date.now();
        const twoHours = 2 * 60 * 60 * 1000;
        const remaining = twoHours - (now - currentUser.lottery.lastTicket);
        
        if (remaining > 0) {
            infoDiv.style.display = 'block';
            const minutes = Math.floor(remaining / 60000);
            const seconds = Math.floor((remaining % 60000) / 1000);
            status.textContent = `⏳ Следующий билет через ${minutes} мин ${seconds} сек.`;
            status.style.color = '#888';
        } else {
            infoDiv.style.display = 'block';
            status.textContent = '🎟 Вы можете получить новый билет! Нажмите "Латерея".';
            status.style.color = '#b44dff';
        }
    }
}

setInterval(updateTicketInfo, 10000);
updateTicketInfo();

// ============================================================
// ===== ПРОФИЛЬ =====
// ============================================================
function openProfileModal(username) {
    const user = getUserByUsername(username);
    if (!user) return;
    const modal = document.getElementById('profileModal');
    if (!modal) {
        alert('Профиль можно посмотреть в разделе "Профиль"');
        return;
    }
    document.getElementById('modalAvatar').src = user.avatar || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect width="100" height="100" fill="%23b44dff"/%3E%3Ctext x="50" y="65" text-anchor="middle" fill="%230a0a0a" font-size="40" font-family="Arial"%3E' + user.username[0].toUpperCase() + '%3C/text%3E%3C/svg%3E';
    document.getElementById('modalUsername').textContent = user.username;
    const roleMap = { 'director': '👑 Директор', 'client': 'Клиент' };
    document.getElementById('modalRole').textContent = roleMap[user.role] || 'Клиент';
    const status = getUserStatus(username);
    document.getElementById('modalPhone').textContent = '📱 ' + (user.phone || 'не указан');
    document.getElementById('modalEmail').textContent = '📧 ' + (user.email || 'не указан');
    document.getElementById('modal2FA').textContent = '🔐 2FA: ' + (user.twoFactorEnabled ? '✅ Включена' : '❌ Выключена');
    
    const actions = document.getElementById('modalActions');
    actions.innerHTML = '';
    modal.style.display = 'flex';
}

function closeModal(id) {
    document.getElementById(id).style.display = 'none';
}

document.querySelectorAll('.modal').forEach(modal => {
    modal.onclick = function(e) {
        if (e.target === this) {
            this.style.display = 'none';
        }
    };
});

// ============================================================
// ===== УВЕДОМЛЕНИЯ =====
// ============================================================
function openNotifModal() {
    const modal = document.getElementById('notifModal');
    const container = document.getElementById('notifList');
    container.innerHTML = '';
    const notifs = currentUser.notifications || [];
    
    if (notifs.length === 0) {
        container.innerHTML = '<p style="color:#555; text-align:center;">Нет уведомлений</p>';
    } else {
        notifs.sort((a,b) => b.timestamp - a.timestamp).forEach((n, idx) => {
            const div = document.createElement('div');
            div.className = 'notif-item';
            const isDiscord = n.type === 'discord_link';
            const isWin = n.type === 'lottery_win';
            
            let actions = '';
            if (isDiscord) {
                actions = `<button class="btn-primary" onclick="window.open('https://discord.gg/JDmpxcKYHn','_blank')">🔗 Перейти</button>`;
            } else if (isWin && currentUser.username === 'Михаил') {
                actions = `<button class="btn-success" onclick="openWinChat()">💬 Добавить в чат</button>`;
            }
            
            div.innerHTML = `
                <span class="notif-text">${n.message}</span>
                <span style="color:#666; font-size:12px;">${formatDate(n.timestamp)}</span>
                <span class="notif-actions">
                    ${actions}
                    <button class="btn-secondary" onclick="removeNotif('${n.id}')">🗑️</button>
                </span>
            `;
            container.appendChild(div);
        });
    }
    modal.style.display = 'flex';
}

function removeNotif(notifId) {
    let user = getCurrentUser();
    user.notifications = user.notifications.filter(n => n.id !== notifId);
    updateUserData(user);
    currentUser = user;
    openNotifModal();
    updateHeader();
}

function openWinChat() {
    const winChat = chats.find(c => c.isWinChat && c.members.includes(currentUser.username));
    if (winChat) {
        openChatModal(winChat.id);
        closeModal('notifModal');
    }
}

// ============================================================
// ===== ЧАТ =====
// ============================================================
function openChatModal(chatId) {
    const chat = chats.find(c => c.id === chatId);
    if (!chat) return;
    
    const modal = document.getElementById('chatModal');
    const otherUser = chat.members.find(m => m !== currentUser.username) || 'Чат';
    document.getElementById('chatModalTitle').textContent = `💬 ${chat.name} (${otherUser})`;
    
    const container = document.getElementById('chatModalMessages');
    container.innerHTML = '';
    if (chat.messages.length === 0) {
        container.innerHTML = '<p style="color:#555;">Сообщений пока нет</p>';
    } else {
        chat.messages.sort((a,b) => a.timestamp - b.timestamp).forEach((msg, index) => {
            const div = document.createElement('div');
            div.className = 'msg-item';
            const isOwn = msg.username === currentUser.username;
            div.innerHTML = `
                <span class="msg-text">
                    <span class="msg-username">${msg.username}</span>: ${msg.text}
                    ${msg.image ? `<br><img src="${msg.image}" style="max-width:150px; border-radius:10px; margin-top:5px;">` : ''}
                </span>
                <span class="msg-time">${formatDate(msg.timestamp)}</span>
                ${isOwn ? `<button class="delete-msg-btn" onclick="deleteMsg('${chatId}', ${index})" style="background:transparent; border:none; color:#ff4444; cursor:pointer;">✕</button>` : ''}
            `;
            container.appendChild(div);
        });
        container.scrollTop = container.scrollHeight;
    }
    
    const adminActions = document.getElementById('chatModalAdminActions');
    adminActions.innerHTML = '';
    
    const mediaActions = document.getElementById('chatModalMediaActions');
    mediaActions.innerHTML = '';
    const fileBtn = document.createElement('button');
    fileBtn.className = 'btn-secondary';
    fileBtn.textContent = '📎 Фото';
    fileBtn.onclick = function() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(ev) {
                    const msg = {
                        username: currentUser.username,
                        text: '📷 Фото',
                        image: ev.target.result,
                        timestamp: Date.now()
                    };
                    chat.messages.push(msg);
                    saveChats();
                    openChatModal(chatId);
                };
                reader.readAsDataURL(file);
            }
        };
        input.click();
    };
    mediaActions.appendChild(fileBtn);
    
    modal._chatId = chatId;
    modal.style.display = 'flex';
    
    const input = document.getElementById('chatModalInput');
    const sendBtn = document.getElementById('chatModalSend');
    
    sendBtn.onclick = function() {
        const text = input.value.trim();
        if (!text) return;
        const msg = {
            username: currentUser.username,
            text: text,
            timestamp: Date.now()
        };
        chat.messages.push(msg);
        saveChats();
        input.value = '';
        openChatModal(chatId);
    };
    
    input.onkeydown = function(e) {
        if (e.key === 'Enter') {
            sendBtn.click();
        }
    };
}

function deleteMsg(chatId, index) {
    if (!confirm('Удалить сообщение?')) return;
    const chat = chats.find(c => c.id === chatId);
    if (!chat) return;
    chat.messages.splice(index, 1);
    saveChats();
    openChatModal(chatId);
}

// ============================================================
// ===== АВТООБНОВЛЕНИЕ =====
// ============================================================
setInterval(() => {
    const updatedUser = getCurrentUser();
    if (updatedUser && updatedUser.username === currentUser.username) {
        currentUser = updatedUser;
        updateHeader();
    }
}, 5000);

updateHeader();