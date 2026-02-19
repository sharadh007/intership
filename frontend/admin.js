const API_BASE = window.location.origin + '/api';

const Admin = {
    token: null,

    init() {
        // Check local storage or session storage
        const token = localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');
        if (token) {
            this.token = token;
            this.showDashboard();
        }
    },

    togglePassword() {
        const input = document.getElementById('adminPassInput');
        input.type = input.type === 'password' ? 'text' : 'password';
    },

    async login(e) {
        e.preventDefault();
        const email = document.getElementById('adminEmailInput').value;
        const password = document.getElementById('adminPassInput').value;

        try {
            const res = await fetch(`${API_BASE}/admin/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await res.json();

            if (data.success) {
                this.token = data.token;
                if (document.getElementById('adminRememberMe').checked) {
                    localStorage.setItem('adminToken', this.token);
                } else {
                    sessionStorage.setItem('adminToken', this.token);
                }
                this.showDashboard();
            } else {
                alert(data.error || 'Login failed');
            }
        } catch (err) {
            console.error(err);
            alert('Network error');
        }
    },

    logout() {
        this.token = null;
        localStorage.removeItem('adminToken');
        sessionStorage.removeItem('adminToken');
        document.getElementById('loginSection').style.display = 'block';
        document.getElementById('dashboardSection').style.display = 'none';
        document.getElementById('adminNav').style.display = 'none';
    },

    async showDashboard() {
        document.getElementById('loginSection').style.display = 'none';
        document.getElementById('dashboardSection').style.display = 'block';
        document.getElementById('adminNav').style.display = 'block';
        // document.getElementById('adminEmail').textContent = 'Admin'; 

        this.fetchInternships();
        this.fetchVerificationQueue();
        this.fetchVerificationQueue();
        this.fetchAuditLogs();
        this.fetchSyncStats();
    },

    async fetchSyncStats() {
        try {
            const res = await fetch(`${API_BASE}/admin/sync-stats`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            const data = await res.json();
            if (data.success) {
                const { lastSync, deletedCount } = data.data;
                document.getElementById('lastSyncTime').textContent = lastSync ? new Date(lastSync).toLocaleString() : 'Never';
                document.getElementById('deletedCount').textContent = deletedCount;
            }
        } catch (e) { console.error('Sync stats error:', e); }
    },

    async fetchInternships() {
        try {
            const res = await fetch(`${API_BASE}/internships`);
            const data = await res.json();
            if (data.success) {
                this.renderTable(data.data);
                this.updateStats(data.data);
            }
        } catch (err) {
            console.error('Failed to fetch internships:', err);
        }
    },

    async fetchVerificationQueue() {
        try {
            const res = await fetch(`${API_BASE}/admin/unverified`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            const data = await res.json();
            if (data.success) {
                this.renderVerificationQueue(data.data);
            }
        } catch (err) {
            console.error('Failed to fetch queue:', err);
        }
    },

    async fetchAuditLogs() {
        try {
            const res = await fetch(`${API_BASE}/admin/audit-logs`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            const data = await res.json();
            if (data.success) {
                this.renderAuditLogs(data.data);
            }
        } catch (err) {
            console.error('Failed to fetch audit logs:', err);
        }
    },

    renderTable(internships) {
        const tbody = document.getElementById('internshipTableBody');
        tbody.innerHTML = internships.map(i => `
      <tr>
        <td>
            <div style="font-weight:bold;">${i.company}</div>
            <div style="font-size:0.85em; color:var(--color-text-secondary);">${i.location}</div>
        </td>
        <td>${i.role}</td>
        <td>
          <span class="badge badge-${i.verification_status}">${i.verification_status}</span>
        </td>
        <td>${i.deadline ? new Date(i.deadline).toLocaleDateString() : 'N/A'}</td>
        <td>
          <button class="action-btn btn-expire" onclick="Admin.setStatus(${i.id}, 'expired')">Expire</button>
          <button class="action-btn" onclick="Admin.deleteInternship(${i.id})" style="color:red;">Del</button>
        </td>
      </tr>
    `).join('');
    },

    renderVerificationQueue(internships) {
        const tbody = document.getElementById('verificationTableBody');
        if (internships.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="padding:1rem; text-align:center;">No pending verifications.</td></tr>';
            return;
        }
        tbody.innerHTML = internships.map(i => `
            <tr>
                <td>
                    <span style="font-size:0.8rem; padding:2px 6px; background:#e0f2fe; color:#0369a1; border-radius:4px;">${i.source_name || 'Manual'}</span>
                    <div style="font-size:0.75rem; color:#64748b;">${i.source_type}</div>
                </td>
                <td>
                    <div style="font-weight:600;">${i.company}</div>
                    <div>${i.role}</div>
                </td>
                 <td>
                    <div style="font-size:0.85rem;">${i.sector} | ₹${i.stipend}</div>
                    <a href="${i.external_link}" target="_blank" style="font-size:0.8rem; color:var(--color-primary);">View Source</a>
                </td>
                <td>
                    <button class="action-btn btn-approve" onclick="Admin.verifyInternship(${i.id}, 'verified')">Approve</button>
                    <button class="action-btn btn-reject" onclick="Admin.verifyInternship(${i.id}, 'rejected')">Reject</button>
                </td>
            </tr>
        `).join('');
    },

    renderAuditLogs(logs) {
        const tbody = document.getElementById('auditTableBody');
        tbody.innerHTML = logs.map(log => `
            <tr>
                <td>${new Date(log.created_at).toLocaleString()}</td>
                <td>${log.admin_name || 'System'}</td>
                <td><span style="font-weight:600;">${log.action}</span></td>
                <td>#${log.entity_id}</td>
                <td style="font-family:monospace; font-size:0.8rem;">${JSON.stringify(log.details)}</td>
            </tr>
        `).join('');
    },

    updateStats(internships) {
        document.getElementById('statTotal').textContent = internships.length;
        document.getElementById('statVerified').textContent = internships.filter(i => i.verification_status === 'verified').length;
        document.getElementById('statPending').textContent = internships.filter(i => i.verification_status === 'unverified').length; // or fetch queue length
    },

    // Old method for non-audit actions (like expire)
    async setStatus(id, status) {
        if (!this.token) return;
        if (!confirm(`Mark this internship as ${status}?`)) return;

        try {
            const res = await fetch(`${API_BASE}/internships/${id}/status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify({ status })
            });
            const data = await res.json();
            if (data.success) this.fetchInternships();
            else alert(data.error);
        } catch (err) { console.error(err); }
    },

    // New method for Trust Layer (Audit Logged)
    async verifyInternship(id, status) {
        if (!this.token) return;
        if (!confirm(`${status === 'verified' ? 'Approve' : 'Reject'} this internship?`)) return;

        try {
            const res = await fetch(`${API_BASE}/admin/verify/${id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify({ status })
            });
            const data = await res.json();

            if (data.success) {
                // Refresh everything
                this.fetchInternships();
                this.fetchVerificationQueue();
                this.fetchAuditLogs();
            } else {
                alert(data.error || 'Verification failed');
            }
        } catch (err) {
            console.error(err);
            alert('Network error');
        }
    },

    async deleteInternship(id) {
        if (!confirm('Permanently delete?')) return;
        try {
            await fetch(`${API_BASE}/internships/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            this.fetchInternships();
        } catch (e) { console.error(e); }
    }
};

// Initialize
Admin.init();
