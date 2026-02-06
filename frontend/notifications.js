// ===== NOTIFICATIONS SYSTEM =====
let isNotificationOpen = false;

function toggleNotifications() {
    const dropdown = document.getElementById('notificationDropdown');
    isNotificationOpen = !isNotificationOpen;
    dropdown.style.display = isNotificationOpen ? 'block' : 'none';

    if (isNotificationOpen && auth.currentUser) {
        fetchNotifications();
    }
}

async function fetchNotifications() {
    if (!auth.currentUser) return;
    try {
        const res = await fetch(`${API_BASE}/notifications/${auth.currentUser.uid}`);
        const json = await res.json();

        if (json.success) {
            updateNotificationUI(json.data);
        }
    } catch (err) {
        console.error('Error fetching notifications:', err);
    }
}

function updateNotificationUI(notifications) {
    const list = document.getElementById('notificationList');
    const badge = document.getElementById('notificationBadge');

    const unreadCount = notifications.filter(n => !n.is_read).length;
    if (badge) {
        badge.textContent = unreadCount;
        badge.style.display = unreadCount > 0 ? 'block' : 'none';
    }

    if (!list) return;

    if (notifications.length === 0) {
        list.innerHTML = '<p style="padding: 10px; color: #666;">No notifications</p>';
        return;
    }

    list.innerHTML = notifications.map(n => `
    <div class="notification-item ${n.is_read ? '' : 'unread'}" onclick="markOneRead('${n.id}')">
      <div>${n.message}</div>
      <div class="notification-time">${new Date(n.created_at).toLocaleString()}</div>
    </div>
  `).join('');
}

async function markAllRead() {
    if (!auth.currentUser) return;
    await fetch(`${API_BASE}/notifications/mark-read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: auth.currentUser.uid })
    });
    fetchNotifications();
}

async function markOneRead(id) {
    await fetch(`${API_BASE}/notifications/mark-read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId: id })
    });
    fetchNotifications(); // Refresh to update UI
}

// Poll for notifications every minute
setInterval(() => {
    if (auth && auth.currentUser) fetchNotifications();
}, 60000);

// Close dropdown when clicking outside
window.addEventListener('click', (e) => {
    const container = document.querySelector('.notification-container');
    if (container && !container.contains(e.target)) {
        const dropdown = document.getElementById('notificationDropdown');
        if (dropdown) {
            dropdown.style.display = 'none';
            isNotificationOpen = false;
        }
    }
});
