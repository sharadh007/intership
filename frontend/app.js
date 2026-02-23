// ===== API + FIREBASE SETUP =====
// Dynamic API base — always points to current host (works for localhost, tunnels, LAN, production)
// Dynamic API base — Detects if we're on localhost but wrong port, otherwise uses relative path
const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && window.location.port !== '5000'
  ? 'http://localhost:5000/api'
  : window.location.origin + '/api';


// The Firebase configuration is now loaded from firebase-config.js
// If firebaseConfig is not defined (meaning the file is missing or not configured),
// we use a placeholder or handle it gracefully to avoid hardcoded keys in the repository.

if (typeof firebaseConfig !== 'undefined') {
  firebase.initializeApp(firebaseConfig);
} else {
  console.warn("⚠️ Firebase configuration not found. Please follow the instructions in FIREBASE_SETUP.md to configure your project.");
}

const auth = firebase.auth();
const db = firebase.database();

let currentProfile = {};
let isProfileModalOpen = false;

// ===== PAGINATION STATE =====
let paginationState = {
  currentPage: 1,
  totalPages: 1,
  totalCount: 0,
  itemsPerPage: 10,
  allInternships: [],
  filteredInternships: [],
  userLocation: null,
  userSkills: [],
  companyName: ''
};

// ===== PAGINATION FUNCTIONS =====
function displayPaginationControls() {
  const container = document.getElementById('paginationContainer');
  const prevBtn = document.getElementById('prevPageBtn');
  const nextBtn = document.getElementById('nextPageBtn');

  if (!container) return;

  // Show pagination if there's more than one page
  if (paginationState.totalPages > 1) {
    container.style.display = 'block';
  } else {
    container.style.display = 'none';
  }

  // Update page info
  document.getElementById('pageInfo').textContent = `Page ${paginationState.currentPage} of ${paginationState.totalPages}`;
  document.getElementById('pageNum').textContent = paginationState.currentPage;
  document.getElementById('totalPages').textContent = paginationState.totalPages;
  document.getElementById('totalCount').textContent = paginationState.totalCount;

  const startIdx = (paginationState.currentPage - 1) * paginationState.itemsPerPage + 1;
  const endIdx = Math.min(paginationState.currentPage * paginationState.itemsPerPage, paginationState.totalCount);
  document.getElementById('showingCount').textContent = endIdx;

  // Disable previous button if on first page
  if (prevBtn) prevBtn.disabled = paginationState.currentPage === 1;

  // Disable next button if on last page
  if (nextBtn) nextBtn.disabled = paginationState.currentPage === paginationState.totalPages;
}

function previousPage() {
  if (paginationState.currentPage > 1) {
    paginationState.currentPage--;
    fetchInternshipsWithFilters(paginationState.userLocation, paginationState.userSkills, paginationState.companyName);
  }
}

function nextPage() {
  if (paginationState.currentPage < paginationState.totalPages) {
    paginationState.currentPage++;
    fetchInternshipsWithFilters(paginationState.userLocation, paginationState.userSkills, paginationState.companyName);
  }
}

// ===== FETCH INTERNSHIPS WITH FILTERS AND PAGINATION =====
async function fetchInternshipsWithFilters(location, skills, company) {
  try {
    paginationState.userLocation = location;
    paginationState.userSkills = Array.isArray(skills) ? skills : (skills ? skills.split(',').map(s => s.trim()) : []);
    paginationState.companyName = company || '';

    // Show loading state
    const browseContainer = document.getElementById('browseInternshipsList');

    if (browseContainer) {
      browseContainer.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 60px 0;">
          <div class="ai-loader-ring" style="width: 40px; height: 40px; border-width: 3px; margin: 0 auto;"></div>
          <p style="margin-top: 15px; color: #64748b;">Searching opportunities...</p>
        </div>
      `;
    }

    // Build query parameters
    const params = new URLSearchParams({
      page: paginationState.currentPage,
      limit: paginationState.itemsPerPage
    });

    if (location && location !== '--' && location !== 'All') {
      params.append('location', location);
    }

    if (paginationState.userSkills.length > 0) {
      paginationState.userSkills.forEach(skill => {
        params.append('skills', skill);
      });
    }

    if (paginationState.companyName) {
      params.append('company', paginationState.companyName);
    }

    // Fetch from backend with pagination
    const response = await fetch(`${API_BASE}/internships/filter?${params}`);
    const data = await response.json();

    if (data.success) {
      // Update pagination state
      paginationState.totalCount = data.pagination.total;
      paginationState.totalPages = data.pagination.totalPages;
      paginationState.filteredInternships = data.data;
      if (typeof internships !== 'undefined') {
        internships = data.data;
      }

      if (data.data && data.data.length > 0) {
        // Display results
        displayInternshipsWithPagination(data.data);

        // Show pagination controls
        displayPaginationControls();
      } else {
        // No internships found
        if (browseContainer) browseContainer.innerHTML = '<p style="text-align: center; padding: 40px; color: #666;">No internships found for your criteria. Please try with different filters.</p>';

        // Hide pagination
        const paginationContainer = document.getElementById('paginationContainer');
        if (paginationContainer) paginationContainer.style.display = 'none';
      }
    } else {
      throw new Error(data.error || 'Failed to fetch internships');
    }
  } catch (error) {
    console.error('Error fetching internships:', error);
    const browseContainer = document.getElementById('browseInternshipsList');
    if (browseContainer) {
      browseContainer.innerHTML = '<p style="text-align: center; padding: 20px; color: #d32f2f;">❌ Error loading internships. Please try again.</p>';
    }
  }
}

// ===== DISPLAY INTERNSHIPS WITH PAGINATION =====
function displayInternshipsWithPagination(internships) {
  const browseContainer = document.getElementById('browseInternshipsList');

  // Update browse list if container exists
  if (browseContainer) {
    browseContainer.innerHTML = '';
    if (internships.length === 0) {
      browseContainer.innerHTML = '<p style="text-align: center; padding: 20px;">No internships found.</p>';
    } else {
      internships.forEach((internship) => {
        // Use the standard card creator for browse list
        if (typeof createInternshipCard === 'function') {
          browseContainer.appendChild(createInternshipCard(internship));
        }
      });
    }

    // Use the specific browsePagination container from HTML
    const browsePagination = document.getElementById('browsePagination');
    if (browsePagination) {
      if (paginationState.totalPages <= 1) {
        browsePagination.innerHTML = '';
      } else {
        browsePagination.innerHTML = `
          <div style="display: flex; gap: 15px; align-items: center; justify-content: center; margin-top: 30px;">
            <button class="btn btn-outline" ${paginationState.currentPage === 1 ? 'disabled' : ''} 
              onclick="previousPage()" style="padding: 8px 16px; min-width: 100px;">← Previous</button>
            
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-weight: 700; color: #13343b; background: #e6f4f6; padding: 4px 12px; border-radius: 6px;">${paginationState.currentPage}</span>
              <span style="color: #94a3b8; font-weight: 500;">of ${paginationState.totalPages}</span>
            </div>

            <button class="btn btn-outline" ${paginationState.currentPage === paginationState.totalPages ? 'disabled' : ''} 
              onclick="nextPage()" style="padding: 8px 16px; min-width: 100px;">Next →</button>
          </div>
        `;
      }
    }
  }

  // Update page counters
  const showingCountEl = document.getElementById('showingCount');
  const totalCountEl = document.getElementById('totalCount');
  const pageNumEl = document.getElementById('pageNum');
  const totalPagesEl = document.getElementById('totalPages');

  if (showingCountEl) showingCountEl.textContent = `${(paginationState.currentPage - 1) * paginationState.itemsPerPage + 1} - ${Math.min(paginationState.currentPage * paginationState.itemsPerPage, paginationState.totalCount)}`;
  if (totalCountEl) totalCountEl.textContent = paginationState.totalCount || 0;
  if (pageNumEl) pageNumEl.textContent = paginationState.currentPage;
  if (totalPagesEl) totalPagesEl.textContent = paginationState.totalPages;
}

// Create internship card for Browse All page
function createInternshipCard(internship) {
  const card = document.createElement('div');
  card.className = 'internship-card';

  // Format location
  let locationDisplay = internship.location || 'N/A';
  if (locationDisplay.startsWith("('") || locationDisplay.startsWith('("')) {
    locationDisplay = locationDisplay.replace(/^[\('"]|[\)'"]]$/g, '');
  }

  // Format skills
  let skillsDisplay = '';
  if (internship.skills) {
    try {
      const skillsArray = Array.isArray(internship.skills) ? internship.skills : JSON.parse(internship.skills.replace(/'/g, '"'));
      skillsDisplay = skillsArray.slice(0, 3).join(', ');
      if (skillsArray.length > 3) skillsDisplay += ' +' + (skillsArray.length - 3) + ' more';
    } catch (e) {
      skillsDisplay = internship.skills;
    }
  }

  card.innerHTML = `
    <div style="padding: 20px; background: white; border-radius: 12px; border: 1px solid rgba(19,52,59,0.08); transition: all 0.3s ease; position: relative; overflow: hidden; display: flex; flex-direction: column; gap: 12px; height: 100%; box-shadow: 0 2px 10px rgba(19,52,59,0.04);">
      <div style="position: absolute; top: 0; left: 0; right: 0; height: 4px; background: linear-gradient(90deg, #13343b 0%, #21808d 100%);"></div>
      
      <div style="display: flex; justify-content: space-between; align-items: flex-start;">
        <div style="width: 44px; height: 44px; background: #f1f5f9; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-weight: 800; color: #21808d; font-size: 1.2rem; border: 1px solid #e2e8f0;">
          ${(internship.company || 'C')[0].toUpperCase()}
        </div>
        ${internship.internType ? `<span style="background: rgba(33,128,141,0.1); color: #1a6874; padding: 4px 10px; border-radius: 20px; font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">${internship.internType}</span>` : ''}
      </div>

      <div>
        <h3 style="margin: 0 0 4px 0; font-size: 1.1rem; font-weight: 800; color: #13343b; line-height: 1.3;">${internship.role || 'Internship'}</h3>
        <p style="margin: 0; font-size: 0.9rem; color: #64748b; font-weight: 500;">🏢 ${internship.company || 'N/A'}</p>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 0.82rem; color: #475569;">
        <div style="display: flex; align-items: center; gap: 6px;">📍 <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${locationDisplay}</span></div>
        <div style="display: flex; align-items: center; gap: 6px;">⏱️ <span>${internship.duration || 'N/A'}</span></div>
        <div style="display: flex; align-items: center; gap: 6px;">💰 <span style="font-weight: 600; color: #0d9488;">${internship.stipend || 'N/A'}</span></div>
        <div style="display: flex; align-items: center; gap: 6px;">🎯 <span>${internship.sector || 'Various'}</span></div>
      </div>

      ${skillsDisplay ? `
      <div style="margin-top: 4px; padding-top: 12px; border-top: 1px solid #f1f5f9;">
        <p style="margin: 0 0 6px 0; font-size: 0.72rem; color: #94a3b8; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Top Skills</p>
        <p style="margin: 0; font-size: 0.8rem; color: #475569;">${skillsDisplay}</p>
      </div>
      ` : ''}

      <div style="margin-top: auto; padding-top: 12px; display: flex; gap: 8px;">
        <button class="btn btn-primary btn-sm btn-browse-view" style="flex: 1; padding: 10px; font-size: 0.85rem; font-weight: 600;">View Details</button>
        ${internship.external_link || internship.websiteLink ? `
          <a href="${internship.external_link || internship.websiteLink}" target="_blank" class="btn btn-outline btn-sm" style="padding: 10px; font-size: 0.85rem; text-decoration: none; text-align: center; color: #21808d; border-color: #21808d;">Apply →</a>
        ` : ''}
      </div>
    </div>
  `;

  const viewBtn = card.querySelector('.btn-browse-view');
  if (viewBtn) {
    viewBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openModal(internship);
    });
  }

  return card;
}


try {
  document.getElementById('recommendationsSection').style.display = 'none';
  document.getElementById('recommendationCards').innerHTML = '';
} catch (e) { }



// 🔥 CRITICAL: DEFINE THESE FIRST (BEFORE Profile)
function clearAllForms() {
  document.querySelectorAll('input[type="text"], input[type="email"], input[type="number"], input[type="tel"], select').forEach(input => {
    input.value = '';
  });
  // Only clear dynamic content containers, not the structural ones
  const dynamicContainers = [
    document.getElementById('recommendationCards'),
    document.getElementById('aiResultsSection'),
    document.getElementById('browseInternshipsList')
  ];
  dynamicContainers.forEach(el => {
    if (el) {
      el.innerHTML = '';
    }
  });
  console.log('✅ Forms cleared');
}

// Global function - clears everything when called


function safeLogout() {
  // Firebase logout
  auth.signOut().then(() => {
    // Clear forms 
    clearAllForms();
    console.log('🔥 SAFE LOGOUT COMPLETE');
  }).catch(err => console.error('Logout failed:', err));
}

// Field configuration mapping (key -> label/type)
const FIELD_CONFIG = {
  name: { label: 'Full Name', type: 'text' },
  phone: { label: 'Phone', type: 'tel' },
  qualification: { label: 'Qualification', type: 'select', options: ['B.Tech', 'B.E', 'MBA', 'BBA', 'B.Com', 'B.Sc', 'Diploma', 'Other'] },
  skills: { label: 'Skills', type: 'tags' }, // Special handling
  location: { label: 'Preferred Location', type: 'select', options: ['Remote', 'Bangalore', 'Mumbai', 'Delhi', 'Hyderabad', 'Chennai', 'Pune', 'Noida'] },
  industry: { label: 'Preferred Industry', type: 'select', options: ['Technical', 'IT / Software', 'Finance', 'Marketing', 'Manufacturing', 'Construction', 'Healthcare', 'Education'] }
};

const Profile = {
  open() {
    if (!auth.currentUser || isProfileModalOpen) return;
    const modal = $('profileModal');
    if (modal) {
      isProfileModalOpen = true;
      modal.style.display = 'flex';
      this.displayData();
    }
  },

  close() {
    isProfileModalOpen = false;
    const modal = $('profileModal');
    if (modal) modal.style.display = 'none';
  },

  show(profile) {
    currentProfile = profile;
    this.displayData();
    // Safe check if modal is strictly needed to open automatically (usually triggered by user)
    // this.open(); 
  },

  hide() {
    this.close();
  },

  // Renders the Read-Only State
  displayData() {
    if (!currentProfile) return;

    // 1. Update Header
    const name = (currentProfile.first_name || currentProfile.name) + ' ' + (currentProfile.last_name || '');
    if ($('headerName')) $('headerName').textContent = name.trim() || 'User';
    if ($('headerEmail')) $('headerEmail').textContent = currentProfile.email || auth.currentUser?.email || '';
    if ($('headerAvatar')) $('headerAvatar').textContent = (name.trim()[0] || 'U').toUpperCase();

    // 2. Update Fields (Read Mode)

    // Persistent Name Input
    if ($('input_name_persistent')) {
      $('input_name_persistent').value = name.trim();
    }

    this.renderFieldReadMode('phone', currentProfile.phone);
    this.renderFieldReadMode('qualification', currentProfile.qualification);
    this.renderFieldReadMode('location', currentProfile.preferred_state);
    this.renderFieldReadMode('industry', currentProfile.preferred_industry);
    // Email is static
    if ($('val_email')) $('val_email').textContent = currentProfile.email || auth.currentUser?.email;

    // Skills (Tags)
    this.renderSkillsTags(currentProfile.skills);
  },

  renderFieldReadMode(key, value) {
    const el = $(`val_${key} `);
    const container = $(`container_${key} `);
    const cleanVal = (value || '--').toString().trim();

    // Always enforce the correct structure (Value + Edit Button)
    // This fixes issues where the edit button might be missing initially
    if (container) {
      container.innerHTML = `
    < span class="field-value" id = "val_${key}" > ${cleanVal === '' ? '--' : cleanVal}</span >
      <span class="edit-icon" onclick="Profile.toggleEdit('${key}')" style="cursor:pointer; font-size:1.1rem;" title="Edit ${key.charAt(0).toUpperCase() + key.slice(1)}">✏️</span>
  `;
    }
  },

  renderSkillsTags(skills) {
    const container = $('val_skills');
    if (!container) return;

    // Normalize skills (could be string or array)
    let skillList = [];
    if (Array.isArray(skills)) skillList = skills;
    else if (typeof skills === 'string') skillList = skills.split(',').map(s => s.trim());

    if (skillList.length === 0 || (skillList.length === 1 && skillList[0] === '')) {
      container.innerHTML = '<span style="color:#94a3b8; font-style:italic;">No skills added</span>';
      return;
    }

    container.innerHTML = skillList.map(s =>
      `< span class="skill-tag" > ${s}</span > `
    ).join('');
  },

  // ENTER EDIT MODE
  toggleEdit(key) {
    console.log(`✏️ Editing ${key} `);
    try {
      const container = $(`container_${key} `);
      if (!container) {
        console.error(`Container not found for ${key}`);
        return;
      }

      let currentValue = '';

      // Get current value logically
      if (key === 'name') {
        currentValue = (currentProfile.first_name || '') + ' ' + (currentProfile.last_name || '');
      } else if (key === 'skills') {
        currentValue = Array.isArray(currentProfile.skills) ? currentProfile.skills.join(', ') : (currentProfile.skills || '');
      } else if (key === 'location') {
        currentValue = currentProfile.preferred_state || '';
      } else if (key === 'industry') {
        currentValue = currentProfile.preferred_industry || '';
      } else {
        currentValue = currentProfile[key] || '';
      }

      console.log('Current value:', currentValue);

      // Generate Input HTML
      let inputHtml = '';
      const config = FIELD_CONFIG[key];

      if (!config) {
        console.error(`FIELD_CONFIG missing for ${key}`);
        return;
      }

      if (config.type === 'select') {
        const options = config.options.map(opt =>
          `<option value="${opt}" ${opt === currentValue ? 'selected' : ''}>${opt}</option>`
        ).join('');
        inputHtml = `<select id="input_${key}" class="inline-input">${options}</select>`;
      } else {
        inputHtml = `<input type="text" id="input_${key}" class="inline-input" value="${(currentValue || '').toString().trim()}">`;
      }

      // Helper text for skills
      const helper = key === 'skills' ? '<p class="helper-text">Comma separated (e.g. Java, React)</p>' : '';

      container.innerHTML = `
    <div style="display:flex; flex-direction:column; width:100%; align-items:center;">
      <div style="display:flex; gap:8px; width:100%; justify-content:center; align-items:center;">
        ${inputHtml}
        <div class="inline-actions">
          <button class="btn-icon btn-save" onclick="Profile.saveField('${key}')" title="Save">✓</button>
          <button class="btn-icon btn-cancel" onclick="Profile.cancelEdit('${key}')" title="Cancel">✕</button>
        </div>
      </div>
          ${helper}
    </div>
    `;


      // Focus input
      const input = $(`input_${key} `);
      if (input) {
        input.focus();
        input.select(); // Highlight text to verify focus
        console.log('Input focused and selected');
      } else {
        console.error('Input element creation failed');
      }
    } catch (e) {
      console.error('Error in toggleEdit:', e);
      alert('Error enabling edit mode: ' + e.message);
    }
  },

  cancelEdit(key) {
    // Legacy support for inline editing - kept to avoid errors if referenced, but unused in new UI
    if (!currentProfile) return;
    this.displayData();
  },

  // NEW: Save Persistent Name
  saveNamePersistent() {
    const input = $('input_name_persistent');
    if (!input) return;

    const newName = input.value.trim();
    if (!newName) {
      alert("Name cannot be empty");
      return;
    }

    // Reuse saveField logic manually
    const parts = newName.split(' ');
    const first_name = parts[0];
    const last_name = parts.slice(1).join(' ') || '';

    const payload = {
      uid: auth.currentUser.uid,
      first_name: first_name,
      last_name: last_name,
      ...currentProfile // merge existing
    };
    delete payload._id;

    // Visual feedback
    const btn = input.nextElementSibling;
    const originalText = btn.textContent;
    btn.textContent = '...';
    btn.disabled = true;

    fetch(`${API_BASE}/students/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(res => res.json()).then(data => {
      if (data.success) {
        currentProfile = data.data;
        this.displayData();
        btn.textContent = 'SAVED';
        setTimeout(() => {
          btn.textContent = originalText;
          btn.disabled = false;
        }, 1500);
      } else {
        alert('Save failed: ' + data.error);
        btn.textContent = originalText;
        btn.disabled = false;
      }
    }).catch(e => {
      console.error(e);
      btn.textContent = originalText;
      btn.disabled = false;
    });
  },

  deleteAccount() {
    if (!confirm("Are you sure you want to delete your account? This action cannot be undone.")) return;

    const user = auth.currentUser;
    if (!user) return;

    // Optional: Call backend to delete user data
    // fetch(`${ API_BASE } /students/${ user.uid } `, { method: 'DELETE' });

    user.delete().then(() => {
      alert("Account deleted.");
      safeLogout();
      // Force reload to clear any state
      window.location.reload();
    }).catch((error) => {
      console.error("Error deleting account:", error);
      if (error.code === 'auth/requires-recent-login') {
        alert("For security, please logout and login again before deleting your account.");
      } else {
        alert("Error deleting account: " + error.message);
      }
    });
  },


  saveField(key) {
    if (!auth.currentUser) return;

    const input = $(`input_${key} `);
    if (!input) return;

    const newValue = input.value.trim();
    // Prepare partial update payload
    const payload = { uid: auth.currentUser.uid }; // Always send UID

    // Map UI key to Backend key
    if (key === 'name') {
      // Split name
      const parts = newValue.split(' ');
      payload.first_name = parts[0];
      payload.last_name = parts.slice(1).join(' ') || '';
    } else if (key === 'phone') {
      payload.phone = newValue;
    } else if (key === 'qualification') {
      payload.qualification = newValue;
    } else if (key === 'skills') {
      payload.skills = newValue.split(',').map(s => s.trim()).filter(Boolean);
    } else if (key === 'location') {
      payload.preferred_state = newValue;
    } else if (key === 'industry') {
      payload.preferred_industry = newValue;
    }

    // Include other required fields from currentProfile to prevent overwriting with nulls if backend isn't PATCH
    // Assuming backend needs full object, let's merge.
    // Ideally backend supports PATCH. If not, we send full object.
    const fullPayload = { ...currentProfile, ...payload };
    delete fullPayload._id; // Remove internal mongo IDs if present

    // Disable input while saving
    input.disabled = true;

    fetch(`${API_BASE}/students/`, {
      method: 'POST', // or PATCH depending on your API
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fullPayload)
    }).then(res => res.json()).then(data => {
      if (data.success) {
        currentProfile = data.data; // Update local state
        this.displayData(); // Refresh UI (handles reverting edit mode)
        // Ensure name header updates
        const name = (currentProfile.first_name || currentProfile.name) + ' ' + (currentProfile.last_name || '');
        if ($('headerName')) $('headerName').textContent = name;

        // 📍 FETCH AND DISPLAY INTERNSHIPS BY LOCATION
        if (key === 'location' && newValue && newValue !== '--') {
          fetchAndDisplayInternshipsByLocation(newValue);
        }

        // Brief success indicator (optional toast could go here)
      } else {
        alert('❌ Save failed: ' + (data.error || 'Unknown error'));
        input.disabled = false;
      }
    }).catch(e => {
      console.error(e);
      alert('Network error');
      input.disabled = false;
    });
  },

  processAnalyzedData(extracted) {
    if (!extracted) return;

    // 1. Update Internal State
    if (!currentProfile) currentProfile = {};

    if (extracted.fullName) {
      const parts = extracted.fullName.split(' ');
      currentProfile.first_name = parts[0];
      currentProfile.last_name = parts.slice(1).join(' ');
    }
    if (extracted.phone) currentProfile.phone = extracted.phone;
    const finalSkills = extracted.extractedSkills || extracted.skills || [];
    currentProfile.skills = finalSkills;

    if (extracted.qualification || extracted.education) currentProfile.qualification = extracted.qualification || extracted.education;

    // 2. 🔥 POPULATE FORM FIELDS DIRECTLY 🔥
    const form = document.getElementById('quickProfileForm');
    if (form) {
      if (extracted.fullName) {
        const parts = extracted.fullName.split(' ');
        if (form.firstName) form.firstName.value = parts[0] || '';
        if (form.lastName) form.lastName.value = parts.slice(1).join(' ') || '';
      }
      if (extracted.email && form.email) form.email.value = extracted.email;
      if (extracted.phone && form.phone) form.phone.value = extracted.phone;
      if (finalSkills && form.skills) {
        form.skills.value = Array.isArray(finalSkills) ? finalSkills.join(', ') : finalSkills;
      }
      const expYears = extracted.experienceYears || extracted.experience || 0;
      if (form.experience) form.experience.value = typeof expYears === 'number' ? expYears : (parseInt(expYears) || 0);
      const edu = extracted.educationLevel || extracted.qualification || extracted.education;
      if (edu && form.education) form.education.value = edu;
      if (extracted.location && form.location) form.location.value = extracted.location;
    }

    // 🔥 ALSO POPULATE THE RECOMMENDATION FORM 🔥
    if (document.getElementById('name')) document.getElementById('name').value = extracted.fullName || '';
    if (document.getElementById('skillsInput')) {
      document.getElementById('skillsInput').value = Array.isArray(finalSkills) ? finalSkills.join(', ') : (finalSkills || '');
    }
    if (document.getElementById('interests')) {
      const sector = extracted.preferredSector || extracted.industry || '';
      if (sector) document.getElementById('interests').value = sector;
    }
    if (document.getElementById('stateRecommendation')) document.getElementById('stateRecommendation').value = extracted.location || '';
    if (document.getElementById('emailRecommendation')) document.getElementById('emailRecommendation').value = extracted.email || '';
    if (document.getElementById('phoneRecommendation')) document.getElementById('phoneRecommendation').value = extracted.phone || '';

    if (document.getElementById('qualificationRecommendation') && (extracted.qualification || extracted.education)) {
      document.getElementById('qualificationRecommendation').value = extracted.qualification || extracted.education;
    }
    if (document.getElementById('experienceRecommendation')) {
      const yrs = extracted.experienceYears || extracted.experience || 0;
      document.getElementById('experienceRecommendation').value = yrs;
    }
    if (document.getElementById('collegeRecommendation')) {
      document.getElementById('collegeRecommendation').value = extracted.college || extracted.university || '';
    }
    if (document.getElementById('gradYearRecommendation')) {
      document.getElementById('gradYearRecommendation').value = extracted.graduationYear || '';
    }
    if (document.getElementById('linkedinRecommendation')) {
      document.getElementById('linkedinRecommendation').value = extracted.linkedin || extracted.portfolio || '';
    }
  },

  uploadResumeFile(file) {
    if (!file) return;

    const btn = document.getElementById('btnAnalyzeResume');
    const loading = document.getElementById('resumeLoading');
    if (btn) btn.disabled = true;
    if (loading) loading.style.display = 'block';

    const formData = new FormData();
    formData.append('resume', file);

    fetch(`${API_BASE}/ai/upload-resume`, {
      method: 'POST',
      body: formData
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          this.processAnalyzedData(data.data);
          alert("✅ Resume PDF Uploaded & Analyzed! Form fields have been updated.");
          switchRecTab('manual');
        } else {
          alert("❌ PDF Analysis Failed: " + (data.error || "Unknown error"));
        }
      })
      .catch(err => {
        console.error("Resume Upload Error:", err);
        alert("❌ Network Error: Could not connect to backend.");
      })
      .finally(() => {
        if (btn) btn.disabled = false;
        if (loading) loading.style.display = 'none';
      });
  },

  analyzeResume() {
    const text = document.getElementById('resumeTextData')?.value.trim();
    if (!text || text.length < 50) {
      alert("⚠️ Please paste a valid resume (at least 50 chars).");
      return;
    }

    const btn = document.getElementById('btnAnalyzeResume');
    const loading = document.getElementById('resumeLoading');
    if (btn) btn.disabled = true;
    if (loading) loading.style.display = 'block';

    fetch(`${API_BASE}/ai/analyze-resume`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resumeText: text })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          this.processAnalyzedData(data.data);
          alert("✅ Resume Analyzed! Fields have been updated. Please verify.");
          switchRecTab('manual');
        } else {
          alert("❌ AI Parsing Failed: " + (data.error || "Unknown error"));
        }
      })
      .catch(err => {
        console.error("Resume Analysis Error:", err);
        alert("❌ Network Error: Could not connect to backend.");
      })
      .finally(() => {
        if (btn) btn.disabled = false;
        if (loading) loading.style.display = 'none';
      });
  }
};

function switchRecTab(tab) {
  const manualBtn = document.getElementById('tabManual');
  const resumeBtn = document.getElementById('tabResume');
  const manualSection = document.getElementById('profileFormSection');
  const resumeSection = document.getElementById('resumeAnalyzerSection');

  if (tab === 'manual') {
    manualBtn?.classList.add('active');
    manualBtn.style.background = '#6366f1';
    manualBtn.style.color = 'white';
    resumeBtn?.classList.remove('active');
    resumeBtn.style.background = 'transparent';
    resumeBtn.style.color = '#6366f1';
    if (manualSection) manualSection.style.display = 'block';
    if (resumeSection) resumeSection.style.display = 'none';
  } else {
    resumeBtn?.classList.add('active');
    resumeBtn.style.background = '#6366f1';
    resumeBtn.style.color = 'white';
    manualBtn?.classList.remove('active');
    manualBtn.style.background = 'transparent';
    manualBtn.style.color = '#6366f1';
    if (resumeSection) resumeSection.style.display = 'block';
    if (manualSection) manualSection.style.display = 'none';
  }
}

// --- Auth Landing Page & View Switching ---
function showAuthTab(tab) {
  const loginBtn = document.getElementById('tab-login');
  const regBtn = document.getElementById('tab-register');
  const loginForm = document.getElementById('landingLoginForm');
  const regForm = document.getElementById('landingRegisterForm');

  if (tab === 'login') {
    loginBtn.style.color = '#0d9488';
    loginBtn.style.borderBottomColor = '#0d9488';
    regBtn.style.color = '#94a3b8';
    regBtn.style.borderBottomColor = 'transparent';
    loginForm.style.display = 'block';
    regForm.style.display = 'none';
  } else {
    regBtn.style.color = '#0d9488';
    regBtn.style.borderBottomColor = '#0d9488';
    loginBtn.style.color = '#94a3b8';
    loginBtn.style.borderBottomColor = 'transparent';
    regForm.style.display = 'block';
    loginForm.style.display = 'none';
  }
}

async function handleLandingLogin(e) {
  e.preventDefault();
  console.log("handleLandingLogin called");

  const email = document.getElementById('landingLoginEmail').value;
  const password = document.getElementById('landingLoginPassword').value;
  const rememberMe = document.getElementById('rememberMe').checked;

  console.log("Email:", email);

  try {
    // Set persistence based on checkbox
    await auth.setPersistence(rememberMe ? firebase.auth.Auth.Persistence.LOCAL : firebase.auth.Auth.Persistence.SESSION);
    console.log("Persistence set");

    await auth.signInWithEmailAndPassword(email, password);
    console.log("Signed in successfully");

    // Explicitly handle "Remember Me" for form auto-fill as requested
    if (rememberMe) {
      localStorage.setItem('rememberedEmail', email);
      localStorage.setItem('rememberedPassword', btoa(password)); // Encoding password (caution: not secure storage)
    } else {
      localStorage.removeItem('rememberedEmail');
      localStorage.removeItem('rememberedPassword');
    }

    // Auth state observer will handle the view switch
  } catch (error) {
    console.error("Login Error:", error);
    alert("Login Error: " + error.message);
  }
}

// Auto-fill on load
// Auto-fill on load - Robust Implementation
// Auto-fill on load - Robust Implementation with Retry
function initRememberedUser() {
  try {
    const savedEmail = localStorage.getItem('rememberedEmail');
    const savedPass = localStorage.getItem('rememberedPassword');

    if (savedEmail) {
      const emailInput = document.getElementById('landingLoginEmail');
      const passInput = document.getElementById('landingLoginPassword');
      const rememberCheck = document.getElementById('rememberMe');

      const fill = () => {
        if (emailInput) {
          emailInput.value = savedEmail;
          emailInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
        if (passInput && savedPass) {
          passInput.value = atob(savedPass);
          passInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
        if (rememberCheck) rememberCheck.checked = true;
      };

      // Immediate fill
      fill();

      // Retry after delay to ensure it sticks
      setTimeout(fill, 500);
    }
  } catch (e) {
    console.error('Error in initRememberedUser:', e);
  }
}
const savedEmail = localStorage.getItem('rememberedEmail');
const savedPass = localStorage.getItem('rememberedPassword');

if (savedEmail) {
  const emailInput = document.getElementById('landingLoginEmail');
  const passInput = document.getElementById('landingLoginPassword');
  const rememberCheck = document.getElementById('rememberMe');

  if (emailInput) {
    emailInput.value = savedEmail;
    emailInput.dispatchEvent(new Event('input', { bubbles: true }));
  }
  if (passInput && savedPass) {
    passInput.value = atob(savedPass);
    passInput.dispatchEvent(new Event('input', { bubbles: true }));
  }
  if (rememberCheck) rememberCheck.checked = true;
}


if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initRememberedUser);
} else {
  // DOM already ready
  initRememberedUser();
}
// Old listener removed
/*
  const savedEmail = localStorage.getItem('rememberedEmail');
  const savedPass = localStorage.getItem('rememberedPassword');

  if (savedEmail) {
    const emailInput = document.getElementById('landingLoginEmail');
    const passInput = document.getElementById('landingLoginPassword');
    const rememberCheck = document.getElementById('rememberMe');

    if (emailInput) emailInput.value = savedEmail;
    if (passInput && savedPass) passInput.value = atob(savedPass);
    if (rememberCheck) rememberCheck.checked = true;
  }
*/

async function handleLandingRegister(e) {
  e.preventDefault();
  const name = document.getElementById('landingRegName').value;
  const email = document.getElementById('landingRegEmail').value;
  const password = document.getElementById('landingRegPassword').value;

  try {
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    // Create student profile in backend
    await registerStudent(userCredential.user.uid, email, name);
    // Auth state observer will handle view switch
  } catch (error) {
    alert(error.message);
  }
}

// --- Auth UX Functions ---
function togglePasswordVisibility(id) {
  const input = document.getElementById(id);
  const btn = document.querySelector(`button[onclick = "togglePasswordVisibility('${id}')"]`);

  // SVG Icons
  const eyeOpen = `< svg xmlns = "http://www.w3.org/2000/svg" width = "20" height = "20" viewBox = "0 0 24 24" fill = "none" stroke = "currentColor" stroke - width="2" stroke - linecap="round" stroke - linejoin="round" class="feather feather-eye" ><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg > `;

  const eyeClosed = `< svg xmlns = "http://www.w3.org/2000/svg" width = "20" height = "20" viewBox = "0 0 24 24" fill = "none" stroke = "currentColor" stroke - width="2" stroke - linecap="round" stroke - linejoin="round" class="feather feather-eye-off" ><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg > `;

  if (input.type === 'password') {
    input.type = 'text';
    if (btn) btn.innerHTML = eyeOpen;
    if (btn) btn.style.color = '#0d9488'; // Active color
  } else {
    input.type = 'password';
    if (btn) btn.innerHTML = eyeClosed;
    if (btn) btn.style.color = '#94a3b8'; // Muted color
  }
}

async function toggleGoogleLogin() {
  const btn = document.querySelector('button[onclick="toggleGoogleLogin()"]');
  if (btn) btn.disabled = true;

  const provider = new firebase.auth.GoogleAuthProvider();
  try {
    const result = await auth.signInWithPopup(provider);
    const user = result.user;

    // Check if new user, if so register in backend
    // Note: detailed check would require fetching profile first, 
    // but registerStudent is safe to call (upsert logic if implemented, or ignore conflict)
    // For simplicity, we try to ensure profile exists:
    await registerStudent(user.uid, user.email, user.displayName);

  } catch (error) {
    if (error.code === 'auth/cancelled-popup-request' || error.code === 'auth/popup-closed-by-user') {
      console.log('Popup closed by user');
    } else {
      console.error(error);
      alert(error.message);
    }
  } finally {
    if (btn) btn.disabled = false;
  }
}

function updateViewForAuth(user) {
  const landingView = document.getElementById('auth-landing-view');
  const mainView = document.getElementById('main-app-view');
  const authButtons = document.getElementById('authButtons');

  if (user) {
    if (landingView) landingView.style.display = 'none';
    if (mainView) mainView.style.display = 'block';
    if (authButtons) authButtons.style.display = 'none'; // Ensure buttons are gone

    // Initial fetch of profile
  } else {
    if (landingView) landingView.style.display = 'flex';
    if (mainView) mainView.style.display = 'none';
  }
}


// SINGLE CLEAN AUTH LISTENER
auth.onAuthStateChanged(async user => {
  console.log('AuthStateChanged triggered:', user ? user.email : 'No User');
  if (user) {
    updateViewForAuth(user);
    updateAuthUI(user.displayName || user.email || 'User');
    fetchNotifications();
  } else {
    console.log('👋 Logged out');
    updateViewForAuth(null);
    safeLogout();
    clearAllForms();
    updateAuthUI(null);
  }
});


// ===== NEXT FUNCTIONS (getRecommendations, etc.) CONTINUE HERE =====



// ===== USER MENU TOGGLE =====
window.toggleUserMenu = function () {
  const menu = document.getElementById('userDropdown');
  if (menu) menu.classList.toggle('active');
};

// Close menu when clicking outside
document.addEventListener('click', (e) => {
  const container = document.getElementById('userMenuContainer');
  const menu = document.getElementById('userDropdown');
  // Check if click is OUTSIDE the container
  if (container && !container.contains(e.target) && menu && menu.classList.contains('active')) {
    menu.classList.remove('active');
  }
});

// ===== ALL AUTH FUNCTIONS =====
// ===== ALL AUTH FUNCTIONS =====
function updateAuthUI(userName) {
  console.log('🔄 updateAuthUI called with:', userName);
  const loginBtn = document.querySelector('.login-btn');
  const registerBtn = document.querySelector('.register-btn');
  const userMenuContainer = document.getElementById('userMenuContainer');
  const navUserName = document.getElementById('navUserName');
  const navUserInitials = document.getElementById('navUserInitials'); // Target for initials
  const greeting = document.getElementById('userGreeting');

  if (userName) {
    // 1. Hide Login/Register
    if (loginBtn) loginBtn.style.display = 'none';
    if (registerBtn) registerBtn.style.display = 'none';

    // 2. Show User Menu
    if (userMenuContainer) {
      userMenuContainer.style.display = 'block';
    }

    // 3. Update Name
    if (navUserName) navUserName.textContent = userName;

    // 4. Update Initials (e.g. "John Doe" -> "JD")
    if (navUserInitials) {
      let initials = 'U';
      if (userName) {
        const parts = userName.trim().split(/\s+/);
        if (parts.length === 1) {
          initials = parts[0].substring(0, 2).toUpperCase();
        } else if (parts.length >= 2) {
          initials = (parts[0][0] + parts[1][0]).toUpperCase();
        }
      }
      navUserInitials.textContent = initials;
    }

    // 5. Update Greeting (if used elsewhere)
    if (greeting) {
      greeting.style.display = 'inline';
      greeting.textContent = 'Hi, ' + userName;
    }

  } else {
    // LOGGED OUT STATE
    if (loginBtn) loginBtn.style.display = 'inline-flex';
    if (registerBtn) registerBtn.style.display = 'inline-flex';

    if (userMenuContainer) userMenuContainer.style.display = 'none';

    if (greeting) greeting.style.display = 'none';
  }
}
window.updateAuthUI = updateAuthUI; // Ensure global


function openLoginModal() {
  const modal = document.getElementById('authModal');
  modal.style.display = 'flex';
  switchToLogin();
  if (document.getElementById('loginMessage')) document.getElementById('loginMessage').textContent = '';
  if (document.getElementById('registerMessage')) document.getElementById('registerMessage').textContent = '';
}

function openRegisterModal() {
  const modal = document.getElementById('authModal');
  modal.style.display = 'flex';
  switchToRegister();
  if (document.getElementById('loginMessage')) document.getElementById('loginMessage').textContent = '';
  if (document.getElementById('registerMessage')) document.getElementById('registerMessage').textContent = '';
}

function closeAuthModal() {
  const modal = document.getElementById('authModal');
  if (modal) modal.style.display = 'none';
}

function switchToLogin() {
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  if (loginForm) loginForm.classList.add('active');
  if (registerForm) registerForm.classList.remove('active');
  const tabs = document.querySelectorAll('.tab-btn');
  if (tabs[0]) tabs[0].classList.add('active');
  if (tabs[1]) tabs[1].classList.remove('active');
}

function switchToRegister() {
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  if (loginForm) loginForm.classList.remove('active');
  if (registerForm) registerForm.classList.add('active');
  const tabs = document.querySelectorAll('.tab-btn');
  if (tabs[0]) tabs[0].classList.remove('active');
  if (tabs[1]) tabs[1].classList.add('active');
}

function mapFirebaseError(code) {
  switch (code) {
    case 'auth/user-not-found': return 'No account found with this email.';
    case 'auth/wrong-password': return 'Incorrect password. Please try again.';
    case 'auth/email-already-in-use': return 'This email is already registered.';
    case 'auth/invalid-email': return 'Please enter a valid email address.';
    case 'auth/weak-password': return 'Password must be at least 6 characters.';
    default: return 'Something went wrong. Please try again.';
  }
}

function showLoginMessage(text, type = '') {
  const box = document.getElementById('loginMessage');
  if (box) {
    box.textContent = text;
    box.className = 'auth-message';
    if (type) box.classList.add(type);
  }
}

function showRegisterMessage(text, type = '') {
  const box = document.getElementById('registerMessage');
  if (box) {
    box.textContent = text;
    box.className = 'auth-message';
    if (type) box.classList.add(type);
  }
}

// Consolidated Login Handler
async function handleLogin(event) {
  event.preventDefault();
  const emailEl = document.getElementById('loginEmail');
  const passEl = document.getElementById('loginPassword');
  if (!emailEl || !passEl) return;

  const email = emailEl.value.trim();
  const password = passEl.value;

  showLoginMessage('Logging in...', 'info');

  try {
    const result = await auth.signInWithEmailAndPassword(email, password);
    const user = result.user;

    // Check if user exists in Realtime DB (optional, depending on your setup)
    const snap = await db.ref('users/' + user.uid).once('value');

    updateAuthUI(snap.exists() ? (snap.val().name || email) : (user.displayName || email));
    showLoginMessage('Login successful!', 'success');
    clearAllForms();
    setTimeout(closeAuthModal, 1000);
  } catch (err) {
    showLoginMessage(mapFirebaseError(err.code), 'error');
  }
}

// Consolidated Register Handler
async function handleRegister(event) {
  event.preventDefault();
  const nameEl = document.getElementById('registerName');
  const emailEl = document.getElementById('registerEmail');
  const passEl = document.getElementById('registerPassword');
  if (!nameEl || !emailEl || !passEl) return;

  const name = nameEl.value.trim();
  const email = emailEl.value.trim();
  const password = passEl.value;

  showRegisterMessage('Creating account...', 'info');

  try {
    const result = await auth.createUserWithEmailAndPassword(email, password);
    const user = result.user;

    await db.ref('users/' + user.uid).set({
      name, email, createdAt: new Date().toISOString()
    });

    updateAuthUI(name);
    showRegisterMessage('Account created successfully!', 'success');
    clearAllForms();
    setTimeout(closeAuthModal, 1000);
  } catch (err) {
    showRegisterMessage(mapFirebaseError(err.code), 'error');
  }
}


function updateAuthUI(displayNameOrEmail) {
  const greeting = document.getElementById('userGreeting');
  const logoutBtn = document.getElementById('logoutBtn');

  if (displayNameOrEmail) {
    if (greeting) {
      greeting.style.display = 'inline';
      greeting.textContent = 'Hi, ' + displayNameOrEmail;
    }
    if (logoutBtn) {
      logoutBtn.style.display = 'inline-flex';
    }
  } else {
    if (greeting) greeting.style.display = 'none';
    if (logoutBtn) logoutBtn.style.display = 'none';
  }
}




/*
auth.onAuthStateChanged((user) => {
  if (user) {
    updateAuthUI(user.displayName || user.email);
  } else {
    updateAuthUI(null);
  }
});
*/
// Login
document.getElementById('loginFormElement')?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;

  try {
    const userCredential = await auth.signInWithEmailAndPassword(email, password);
    const user = userCredential.user;

    const idToken = await user.getIdToken();

    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken} `
      },
      body: JSON.stringify({ email, password })
    });

    const json = await res.json();

    if (json.success) {
      authToken = json.data.token;
      localStorage.setItem('authToken', authToken);
      localStorage.setItem('userId', user.uid);

      alert('✅ Login successful!');
      closeAuthModal();
      updateAuthUI(user.displayName || email);
    } else {
      alert('❌ ' + json.error);
    }

  } catch (error) {
    console.error('Login error:', error);
    alert('❌ ' + error.message);
  }
});

// Update UI after login
function updateAuthUI(userName) {
  const loginBtn = document.querySelector('.login-btn');
  const registerBtn = document.querySelector('.register-btn');
  const logoutBtn = document.getElementById('navLogoutBtn');
  const greeting = document.getElementById('userGreeting');

  if (userName) {
    // LOGGED IN
    if (loginBtn) loginBtn.style.display = 'none';
    if (registerBtn) registerBtn.style.display = 'none';
    if (logoutBtn) logoutBtn.style.display = 'inline-flex';
    if (greeting) {
      greeting.style.display = 'inline';
      greeting.textContent = 'Hi, ' + userName;
    }
  } else {
    // LOGGED OUT
    if (loginBtn) loginBtn.style.display = 'inline-flex';
    if (registerBtn) registerBtn.style.display = 'inline-flex';
    if (logoutBtn) logoutBtn.style.display = 'none';
    if (greeting) greeting.style.display = 'none';
  }
}


// AI RECOMMENDATION LOGIC
async function getAIRecommendations(event) {
  if (event) event.preventDefault();

  const name = document.getElementById('name')?.value;
  const skills = document.getElementById('skillsInput')?.value;
  const interests = document.getElementById('interests')?.value;
  const location = document.getElementById('stateRecommendation')?.value;
  const email = document.getElementById('emailRecommendation')?.value;
  const phone = document.getElementById('phoneRecommendation')?.value;
  const qualification = document.getElementById('qualificationRecommendation')?.value;
  const experience = document.getElementById('experienceRecommendation')?.value;
  const workMode = document.getElementById('workModeRecommendation')?.value;
  const stipend = document.getElementById('stipendRecommendation')?.value;
  const duration = document.getElementById('durationRecommendation')?.value;
  const college = document.getElementById('collegeRecommendation')?.value;
  const gradYear = document.getElementById('gradYearRecommendation')?.value;
  const linkedin = document.getElementById('linkedinRecommendation')?.value;
  const availability = document.getElementById('availabilityRecommendation')?.value;
  const startDate = document.getElementById('startDateRecommendation')?.value;

  if (!skills) {
    alert("Please enter your skills to get recommendations.");
    return;
  }

  // UI Setup
  const formSection = document.getElementById('profileFormSection');
  const loader = document.getElementById('matchingLoader');
  const resultsSection = document.getElementById('recommendationsSection');
  const cardsContainer = document.getElementById('recommendationCards');
  const msgText = document.getElementById('recommendationsMessage');

  if (formSection) formSection.style.display = 'none';
  if (resultsSection) resultsSection.style.display = 'none';
  if (loader) loader.style.display = 'flex';

  try {
    // Stage-based loader simulation
    const stages = [
      { status: 'Analyzing Your Profile...', sub: 'Scanning industry data matching your skills.', progress: '8%' },
      { status: 'Mapping Competency Vectors...', sub: 'Cross-referencing technical requirements.', progress: '35%' },
      { status: 'Verifying Locations...', sub: 'Checking proximity and remote options.', progress: '62%' },
      { status: 'Ranking Top Matches...', sub: 'Optimizing for relevance and fit.', progress: '91%' }
    ];

    const statusText = document.getElementById('loaderStatus');
    const subText = document.getElementById('loaderSubtext');
    const progText = document.getElementById('loaderProgress');

    for (let i = 0; i < stages.length; i++) {
      if (statusText) statusText.textContent = stages[i].status;
      if (subText) subText.textContent = stages[i].sub;
      if (progText) progText.textContent = stages[i].progress;
      await new Promise(r => setTimeout(r, 1200));
    }

    const res = await fetch(`${API_BASE}/recommendations/ai-match`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        skills,
        interests,
        preferredState: location,
        email,
        phone,
        qualification,
        experience,
        workMode,
        stipend,
        duration,
        college,
        gradYear,
        linkedin,
        availability,
        startDate
      })
    });

    const data = await res.json();

    if (loader) loader.style.display = 'none';
    if (resultsSection) resultsSection.style.display = 'block';

    if (data.success && data.recommendations) {
      if (cardsContainer) cardsContainer.innerHTML = '';
      const count = data.recommendations.length;
      if (msgText) msgText.textContent = `🎯 Found ${count} best - matched internship${count !== 1 ? 's' : ''} for your profile.`;

      // Cache recs so we can pass full object to openModal
      const recCache = {};

      data.recommendations.forEach((rec, idx) => {
        recCache[idx] = rec;
        const score = rec.matchScore || rec.finalScore || 0;
        const scoreBreakdown = rec.scoreBreakdown || {};
        const label = rec.matchLabel || (score >= 85 ? 'Excellent Match' : score >= 70 ? 'Good Match' : score >= 55 ? 'Fair Match' : 'Average Match');
        const missing = (rec.missingSkills || []).slice(0, 3);
        const tips = (rec.improvementTips || []).slice(0, 1);
        const locationLabel = rec.locationLabel || '';

        const scoreColor = score >= 85 ? '#10b981' : score >= 70 ? '#21808d' : score >= 55 ? '#f59e0b' : '#ef4444';
        const scoreBg = score >= 85 ? '#ecfdf5' : score >= 70 ? '#e6f4f6' : score >= 55 ? '#fffbeb' : '#fef2f2';
        const skillsPct = scoreBreakdown.profileSkillScore || 0;
        const locationPct = scoreBreakdown.locationScore || 0;

        const card = document.createElement('div');
        card.className = 'ai-rec-card';

        // Robustly handle AI explanation (ensure it's a readable string, not JSON)
        let aiReasoning = rec.aiExplanation || 'Analyzing match potential...';

        if (typeof aiReasoning === 'string' && aiReasoning.trim().startsWith('{')) {
          try {
            const parsed = JSON.parse(aiReasoning);
            if (parsed.summary && parsed.reasons) {
              aiReasoning = `<strong style="display:block;margin-bottom:4px;color:#13343b;">${parsed.summary}</strong>` +
                `<ul style="margin:0;padding-left:15px;list-style:disc;">` +
                parsed.reasons.map(r => `<li style="margin-bottom:2px;">${r}</li>`).join('') +
                `</ul>`;
            } else if (parsed.explanation) {
              aiReasoning = parsed.explanation;
            }
          } catch (e) {
            console.warn('Failed to parse AI JSON reasoning', e);
          }
        } else if (typeof aiReasoning === 'object' && aiReasoning !== null) {
          if (aiReasoning.summary && aiReasoning.reasons) {
            aiReasoning = `<strong>${aiReasoning.summary}</strong><br>` + aiReasoning.reasons.join('<br>');
          } else {
            aiReasoning = aiReasoning.explanation || aiReasoning.text || JSON.stringify(aiReasoning);
          }
        }

        // Clean up location (strip Python tuple format if present)
        let loc = rec.location || 'N/A';
        if (loc.startsWith("('") || loc.startsWith('("')) {
          loc = loc.replace(/^[\('"]|[\)'"]]$/g, '');
        }

        card.innerHTML = `
          <div class="ai-rec-card-inner">
            <!-- LEFT: Match Score Panel -->
            <div class="ai-rec-score-panel">
              <div class="score-rank-badge" style="background: rgba(255,255,255,0.15); color: white; font-size: 0.65rem; font-weight: 700; padding: 2px 9px; border-radius: 20px; letter-spacing: 0.5px; margin-bottom: 4px;">#${idx + 1} AI Match</div>
              <div style="position: relative; width: 64px; height: 64px; flex-shrink: 0;">
                <svg viewBox="0 0 36 36" width="64" height="64" style="transform: rotate(-90deg);">
                  <circle cx="18" cy="18" r="14" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="3.5"/>
                  <circle cx="18" cy="18" r="14" fill="none" stroke="${scoreColor}" stroke-width="3.5" stroke-dasharray="${score} ${100 - score}" stroke-dashoffset="0" stroke-linecap="round"/>
                </svg>
                <div style="position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center;">
                  <span style="font-size: 0.9rem; font-weight: 800; color: white; line-height: 1;">${score}%</span>
                  <span style="font-size: 0.45rem; color: rgba(255,255,255,0.8); font-weight: 600; text-transform: uppercase; margin-top: 1px;">Accuracy</span>
                </div>
              </div>
              <div style="background: ${scoreBg}; color: ${scoreColor}; font-size: 0.62rem; font-weight: 700; padding: 2px 7px; border-radius: 20px; text-align: center; max-width: 94px; line-height: 1.4;">${label}</div>
            </div>

            <!-- RIGHT: Content Area -->
            <div class="ai-rec-content-panel">
              <div>
                <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; flex-wrap: wrap;">
                  <div>
                    <h3 style="font-size: 1rem; font-weight: 700; color: var(--color-text, #13343b); margin: 0 0 3px; line-height: 1.3;">${rec.role || rec.title || 'Internship'}</h3>
                    <p style="color: var(--color-text-secondary, #626c71); font-size: 0.84rem; margin: 0; display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                      <span>🏢 ${rec.company || 'Company'}</span>
                      ${loc ? `<span style="color:#cbd5e1;">|</span><span>📍 ${loc}</span>` : ''}
                    </p>
                  </div>
                  ${rec.sector ? `<span style="background:rgba(33,128,141,0.1);color:#1a6874;border:1px solid rgba(33,128,141,0.2);border-radius:6px;padding:3px 10px;font-size:0.72rem;font-weight:600;white-space:nowrap;flex-shrink:0;">${rec.sector}</span>` : ''}
                </div>

                <!-- Match Intelligence Section -->
                <div style="margin-top: 12px; padding: 10px; background: #f8fafc; border-radius: 8px; border-left: 3px solid ${scoreColor};">
                  <p style="font-size: 0.65rem; color: #94a3b8; font-weight: 800; text-transform: uppercase; margin: 0 0 4px; letter-spacing: 0.5px; display: flex; align-items: center; gap: 5px;">
                    <span style="font-size: 0.8rem;">✨</span> MATCH INTELLIGENCE
                  </p>
                  <p style="font-size: 0.78rem; color: #475569; margin: 0; line-height: 1.5; font-weight: 500;">
                    ${aiReasoning}
                  </p>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 12px;">
                  <div>
                    <div style="display: flex; justify-content: space-between; font-size: 0.68rem; color: #94a3b8; margin-bottom: 3px;"><span>Skills Match</span><span style="font-weight:700;color:#21808d;">${skillsPct}%</span></div>
                    <div style="height: 5px; background: rgba(94,82,64,0.1); border-radius: 3px; overflow: hidden;"><div style="height:100%;width:${skillsPct}%;background:#21808d;border-radius:3px;"></div></div>
                  </div>
                  <div>
                    <div style="display: flex; justify-content: space-between; font-size: 0.68rem; color: #94a3b8; margin-bottom: 3px;"><span>Location${locationLabel ? ' · ' + locationLabel : ''}</span><span style="font-weight:700;color:#10b981;">${locationPct}%</span></div>
                    <div style="height: 5px; background: rgba(94,82,64,0.1); border-radius: 3px; overflow: hidden;"><div style="height:100%;width:${locationPct}%;background:#10b981;border-radius:3px;"></div></div>
                  </div>
                </div>
              </div>

              <div style="margin-top: 10px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
                <div style="display: flex; flex-wrap: wrap; gap: 5px;">
                  ${rec.stipend ? `<span style="background:#f0fdf4;color:#15803d;border:1px solid #bbf7d0;border-radius:6px;padding:3px 9px;font-size:0.72rem;font-weight:600;">💰 ₹${Number(rec.stipend).toLocaleString()}/mo</span>` : ''}
                  ${rec.duration ? `<span style="background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;border-radius:6px;padding:3px 9px;font-size:0.72rem;font-weight:600;">⏱ ${rec.duration}</span>` : ''}
                  ${rec.work_mode ? `<span style="background:#faf5ff;color:#6b21a8;border:1px solid #e9d5ff;border-radius:6px;padding:3px 9px;font-size:0.72rem;font-weight:600;">🖥 ${rec.work_mode}</span>` : ''}
                  ${missing.length > 0 ? `<span style="background:#fff7ed;color:#c2410c;border:1px solid #fed7aa;border-radius:6px;padding:3px 9px;font-size:0.72rem;font-weight:600;" title="Skill gaps: ${missing.join(', ')}">⚡ ${missing.length} Skill Gap${missing.length > 1 ? 's' : ''}</span>` : `<span style="background:#f0fdf4;color:#15803d;border:1px solid #bbf7d0;border-radius:6px;padding:3px 9px;font-size:0.72rem;font-weight:600;">✅ Skills Fit</span>`}
                </div>
                <div style="display: flex; gap: 8px; flex-shrink: 0;">
                  <button class="rec-view-details-btn btn btn-outline" data-idx="${idx}" style="padding: 7px 16px; font-size: 0.82rem; border-radius: 8px;">View Details</button>
                  ${rec.application_link || rec.website_link ? `<a href="${rec.application_link || rec.website_link}" target="_blank" class="btn btn-primary" style="padding: 7px 16px; font-size: 0.82rem; border-radius: 8px; text-decoration: none; display: inline-flex; align-items: center;">Apply Now →</a>` : ''}
                </div>
              </div>
              ${tips.length > 0 ? `<p style="font-size:0.72rem;color:#94a3b8;margin:6px 0 0;font-style:italic;">💡 ${tips[0]}</p>` : ''}
            </div>
          </div>
        `;

        card.addEventListener('mouseenter', () => { card.style.boxShadow = '0 6px 24px rgba(19,52,59,0.14)'; card.style.transform = 'translateY(-2px)'; });
        card.addEventListener('mouseleave', () => { card.style.boxShadow = '0 2px 12px rgba(19,52,59,0.07)'; card.style.transform = 'translateY(0)'; });

        card.addEventListener('click', (e) => {
          const btn = e.target.closest('.rec-view-details-btn');
          if (btn) {
            const i = parseInt(btn.getAttribute('data-idx'));
            if (recCache[i] && typeof openModal === 'function') openModal(recCache[i]);
          }
        });

        if (cardsContainer) cardsContainer.appendChild(card);
      });

      resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      throw new Error(data.error || 'Failed to match');
    }

  } catch (error) {
    console.error('❌ AI Match Error:', error);
    if (loader) loader.style.display = 'none';
    if (formSection) formSection.style.display = 'block';
    alert('Match Error: ' + error.message);
  }
}

function clearRecForm() {
  if (!confirm("Are you sure you want to clear all fields?")) return;
  const ids = [
    'name', 'emailRecommendation', 'phoneRecommendation', 'skillsInput',
    'interests', 'stateRecommendation', 'qualificationRecommendation',
    'experienceRecommendation', 'workModeRecommendation', 'stipendRecommendation',
    'durationRecommendation', 'collegeRecommendation', 'gradYearRecommendation',
    'linkedinRecommendation', 'availabilityRecommendation', 'startDateRecommendation'
  ];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
}

function gotoForm() {
  const formSection = document.getElementById('profileFormSection');
  const resultsSection = document.getElementById('recommendationsSection');
  if (formSection) formSection.style.display = 'block';
  if (resultsSection) resultsSection.style.display = 'none';
  if (formSection) formSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Check if user is already logged in on page load
/*
auth.onAuthStateChanged((user) => {
  if (user) {
      // User is logged in → fetch name, then show logout
      firebase.database().ref('users/' + user.uid).once('value', (snapshot) => {
        const data = snapshot.val() || {};
        const nameOrEmail = data.name || user.email;
        updateAuthUI(nameOrEmail);
      });
  } else {
      // No user logged in → show login/register
      updateAuthUI(null);
  }
});
    */



// Note: internships array is declared later in the file

// Load internships from backend API (now using pagination)
// Note: This function is redefined later with the actual implementation


// Fetch internships with server-side filtering and pagination

// Multi-language translations
const translations = {
  en: {
    "nav-title": "InternHub India",
    "nav-home": "Home",
    "nav-about": "About",
    "nav-find": "Recommendations",
    "nav-browse": "Browse All",
    "nav-contact": "Contact",
    "btn-login": "Login",
    "btn-register": "Register",
    "hero-title": "InternHub India",
    "hero-subtitle": "Connecting India's Youth with High-Quality Internship Opportunities",
    "hero-description": "The premier platform for discovering valuable internship opportunities across India, empowering students from all backgrounds to gain practical industry exposure.",
    "btn-find-now": "Find Internships Now",
    "feature-internships": "Opportunities",
    "feature-internships-sub": "Nationwide Access",
    "feature-stipend": "Monthly Stipend",
    "feature-stipend-sub": "Competitive Industry Pay",
    "feature-sectors": "Sectors",
    "feature-sectors-sub": "24+ Industries Covered",
    "feature-duration": "Months Duration",
    "feature-duration-sub": "Flexible Durations",
    "overview-title": "About the Platform",
    "overview-text": "InternHub India is a comprehensive initiative to provide practical work experience to youth from diverse backgrounds. This program bridges the gap between education and employment, offering hands-on training in top companies across various sectors.",
    "about-title": "About InternHub India",
    "about-background-title": "Our Vision",
    "about-background-text": "InternHub India was launched to address the employability gap among Indian youth. It aims to provide practical work experience, enhance skills, and improve the career prospects of young graduates across the country.",
    "about-eligibility-title": "Eligibility Criteria",
    "about-eligibility-1": "Age: 21-24 years",
    "about-eligibility-2": "Education: Bachelor's degree or Diploma in relevant field",
    "about-eligibility-3": "Family income: Up to ₹8 lakh per annum",
    "about-eligibility-4": "Indian citizen with valid Aadhaar card",
    "about-eligibility-5": "Not currently employed or enrolled in full-time education",
    "about-benefits-title": "Benefits",
    "about-benefits-1": "Monthly stipend of ₹5,000",
    "about-benefits-2": "One-time assistance of ₹6,000",
    "about-benefits-3": "12 months of practical work experience",
    "about-benefits-4": "Industry exposure with leading companies",
    "about-benefits-5": "Certificate of completion",
    "about-benefits-6": "Skill development and training",
    "about-sectors-title": "Participating Sectors",
    "find-title": "Find Internships",
    "search-placeholder": "Search by company, role, or location...",
    "btn-search": "Search",
    "browse-title": "Browse All Internships",
    "filter-sector": "Sector:",
    "filter-location": "Location:",
    "filter-all": "All",
    "btn-reset": "Reset Filters",
    "contact-title": "Contact Us",
    "contact-helpline": "Helpline Number",
    "contact-helpline-time": "Available: Monday to Friday, 9 AM - 6 PM IST",
    "contact-email-title": "Email Support",
    "contact-faq-title": "Frequently Asked Questions",
    "faq-q1": "Who is eligible for the National Internship Program?",
    "faq-a1": "Youth with a Bachelor's degree or Diploma interested in gaining industry experience.",
    "faq-q2": "What is the stipend amount?",
    "faq-a2": "₹5,000 per month plus a one-time assistance of ₹6,000.",
    "faq-q3": "How long is the internship duration?",
    "faq-a3": "The internship duration is 12 months (1 year).",
    "contact-form-title": "Send us a Message",
    "form-name": "Name:",
    "form-email": "Email:",
    "form-message": "Message:",
    "btn-submit": "Submit",
    "btn-view-details": "View Details",
    "btn-apply": "Apply Now",
    "modal-location": "Location",
    "modal-sector": "Sector",
    "modal-duration": "Duration",
    "modal-stipend": "Monthly Stipend",
    "modal-grant": "One-time Grant",
    "modal-requirements": "Requirements",
    "modal-skills": "Skills Required",
    "modal-description": "Description"
  },
  hi: {
    "nav-title": "National Internship Portal",
    "nav-home": "होम",
    "nav-about": "के बारे में",
    "nav-find": "इंटर्नशिप खोजें",
    "nav-browse": "सभी देखें",
    "nav-contact": "संपर्क करें",
    "btn-login": "लॉगिन",
    "btn-register": "रजिस्टर",
    "hero-title": "राष्ट्रीय इंटर्नशिप पोर्टल",
    "hero-subtitle": "भारत के युवाओं को वास्तविक अनुभव और करियर के अवसर प्रदान करना",
    "hero-description": "पूरे भारत में युवाओं को व्यावहारिक कार्य अनुभव प्राप्त करने के लिए मूल्यवान अवसर प्रदान करना।",
    "btn-find-now": "अभी इंटर्नशिप खोजें",
    "feature-internships": "इंटर्नशिप",
    "feature-internships-sub": "पूरे भारत में",
    "feature-stipend": "मासिक वेतन",
    "feature-stipend-sub": "प्रतिस्पर्धी उद्योग वेतन",
    "feature-sectors": "क्षेत्र",
    "feature-sectors-sub": "पूरे भारत में",
    "feature-duration": "महीने की अवधि",
    "feature-duration-sub": "पूर्णकालिक इंटर्नशिप",
    "overview-title": "योजना के बारे में",
    "overview-text": "राष्ट्रीय इंटर्नशिप पोर्टल विविध पृष्ठभूमि के युवाओं को व्यावहारिक कार्य अनुभव प्रदान करने के लिए एक ऐतिहासिक पहल है। यह कार्यक्रम शिक्षा और रोजगार के बीच की खाई को पाटता है।",
    "about-title": "राष्ट्रीय इंटर्नशिप पोर्टल के बारे में",
    "about-background-title": "पृष्ठभूमि और उद्देश्य",
    "about-background-text": "राष्ट्रीय इंटर्नशिप पोर्टल भारतीय युवाओं के बीच रोजगार अंतर को दूर करने के लिए शुरू किया गया था। इसका उद्देश्य व्यावहारिक कार्य अनुभव प्रदान करना, कौशल बढ़ाना और देश भर के युवा स्नातकों की करियर संभावनाओं में सुधार करना है।",
    "about-eligibility-title": "पात्रता मानदंड",
    "about-eligibility-1": "आयु: 21-24 वर्ष",
    "about-eligibility-2": "शिक्षा: स्नातक की डिग्री या प्रासंगिक क्षेत्र में डिप्लोमा",
    "about-eligibility-3": "पारिवारिक आय: प्रति वर्ष ₹8 लाख तक",
    "about-eligibility-4": "वैध आधार कार्ड के साथ भारतीय नागरिक",
    "about-eligibility-5": "वर्तमान में नियोजित या पूर्णकालिक शिक्षा में नामांकित नहीं",
    "about-benefits-title": "लाभ",
    "about-benefits-1": "₹5,000 का मासिक वेतन",
    "about-benefits-2": "₹6,000 की एकमुश्त सहायता",
    "about-benefits-3": "12 महीने का व्यावहारिक कार्य अनुभव",
    "about-benefits-4": "अग्रणी कंपनियों के साथ उद्योग अनुभव",
    "about-benefits-5": "पूर्णता का प्रमाण पत्र",
    "about-benefits-6": "कौशल विकास और प्रशिक्षण",
    "about-sectors-title": "भाग लेने वाले क्षेत्र",
    "find-title": "इंटर्नशिप खोजें",
    "search-placeholder": "कंपनी, भूमिका या स्थान से खोजें...",
    "btn-search": "खोजें",
    "browse-title": "सभी इंटर्नशिप देखें",
    "filter-sector": "क्षेत्र:",
    "filter-location": "स्थान:",
    "filter-all": "सभी",
    "btn-reset": "फ़िल्टर रीसेट करें",
    "contact-title": "संपर्क करें",
    "contact-helpline": "हेल्पलाइन नंबर",
    "contact-helpline-time": "उपलब्ध: सोमवार से शुक्रवार, सुबह 9 बजे से शाम 6 बजे IST",
    "contact-email-title": "ईमेल सहायता",
    "contact-faq-title": "अक्सर पूछे जाने वाले प्रश्न",
    "faq-q1": "पीएम इंटर्नशिप योजना के लिए कौन पात्र है?",
    "faq-a1": "21-24 वर्ष के बीच के युवा जिनके पास स्नातक की डिग्री या डिप्लोमा है और पारिवारिक आय ₹8 लाख प्रति वर्ष तक है।",
    "faq-q2": "वेतन की राशि क्या है?",
    "faq-a2": "₹5,000 प्रति माह प्लस ₹6,000 की एकमुश्त सहायता।",
    "faq-q3": "इंटर्नशिप की अवधि कितनी है?",
    "faq-a3": "इंटर्नशिप की अवधि 12 महीने (1 वर्ष) है।",
    "contact-form-title": "हमें एक संदेश भेजें",
    "form-name": "नाम:",
    "form-email": "ईमेल:",
    "form-message": "संदेश:",
    "btn-submit": "जमा करें",
    "btn-view-details": "विवरण देखें",
    "btn-apply": "अभी आवेदन करें",
    "modal-location": "स्थान",
    "modal-sector": "क्षेत्र",
    "modal-duration": "अवधि",
    "modal-stipend": "मासिक वेतन",
    "modal-grant": "एकमुश्त अनुदान",
    "modal-requirements": "आवश्यकताएं",
    "modal-skills": "आवश्यक कौशल",
    "modal-description": "विवरण"
  },
  ta: {
    "nav-title": "பிரதம மந்திரி இன்டர்ன்ஷிப் திட்டம்",
    "nav-home": "முகப்பு",
    "nav-about": "பற்றி",
    "nav-find": "இன்டர்ன்ஷிப்களைக் கண்டறியவும்",
    "nav-browse": "அனைத்தையும் பார்க்கவும்",
    "nav-contact": "தொடர்பு",
    "btn-login": "உள்நுழைய",
    "btn-register": "பதிவு",
    "hero-title": "பிரதம மந்திரி இன்டர்ன்ஷிப் திட்டம்",
    "hero-subtitle": "இந்தியாவின் இளைஞர்களுக்கு நடைமுறை அனுபவம் மற்றும் தொழில் வாய்ப்புகளை வழங்குதல்",
    "hero-description": "கிராமப்புற பகுதிகள், பழங்குடி மாவட்டங்கள் மற்றும் சேவை செய்யப்படாத சமூகங்களை உள்ளடக்கிய இந்தியா முழுவதும் உள்ள இளைஞர்களுக்கு நடைமுறை பணி அனுபவத்தைப் பெற மதிப்புமிக்க வாய்ப்புகளை வழங்குதல்.",
    "btn-find-now": "இப்போதே இன்டர்ன்ஷிப்களைக் கண்டறியவும்",
    "feature-internships": "இன்டர்ன்ஷிப்கள்",
    "feature-internships-sub": "5 ஆண்டுகளில்",
    "feature-stipend": "மாதாந்திர உதவித்தொகை",
    "feature-stipend-sub": "கூடுதலாக ₹6,000 ஒரு முறை மானியம்",
    "feature-sectors": "துறைகள்",
    "feature-sectors-sub": "இந்தியா முழுவதும்",
    "feature-duration": "மாதங்கள் காலம்",
    "feature-duration-sub": "முழுநேர இன்டர்ன்ஷிப்",
    "overview-title": "திட்டத்தைப் பற்றி",
    "overview-text": "பிரதம மந்திரி இன்டர்ன்ஷிப் திட்டம் பல்வேறு பின்னணியைச் சேர்ந்த இளைஞர்களுக்கு நடைமுறை பணி அனுபவத்தை வழங்க இந்திய அரசாங்கத்தின் ஒரு முக்கிய முயற்சியாகும். இந்த திட்டம் கல்வி மற்றும் வேலைவாய்ப்புக்கு இடையே உள்ள இடைவெளியை நிரப்புகிறது.",
    "about-title": "பிரதம மந்திரி இன்டர்ன்ஷிப் திட்டத்தைப் பற்றி",
    "about-background-title": "பின்னணி மற்றும் நோக்கங்கள்",
    "about-background-text": "இந்திய இளைஞர்களிடையே வேலைவாய்ப்பு இடைவெளியை நிவர்த்தி செய்ய பிரதம மந்திரி இன்டர்ன்ஷிப் திட்டம் தொடங்கப்பட்டது. இது நடைமுறை பணி அனுபவத்தை வழங்குவதையும், திறன்களை மேம்படுத்துவதையும், நாடு முழுவதும் உள்ள இளம் பட்டதாரிகளின் தொழில் வாய்ப்புகளை மேம்படுத்துவதையும் நோக்கமாகக் கொண்டுள்ளது.",
    "about-eligibility-title": "தகுதி விதிகள்",
    "about-eligibility-1": "வயது: 21-24 வயது",
    "about-eligibility-2": "கல்வி: பட்டப்படிப்பு அல்லது தொடர்புடைய துறையில் டிப்ளோமா",
    "about-eligibility-3": "குடும்ப வருமானம்: ஆண்டுக்கு ₹8 லட்சம் வரை",
    "about-eligibility-4": "சரியான ஆதார் அட்டையுடன் இந்திய குடிமகன்",
    "about-eligibility-5": "தற்போது வேலையில் இல்லாதவர் அல்லது முழுநேர கல்வியில் பதிவு செய்யப்படாதவர்",
    "about-benefits-title": "பலன்கள்",
    "about-benefits-1": "₹5,000 மாதாந்திர உதவித்தொகை",
    "about-benefits-2": "₹6,000 ஒரு முறை உதவி",
    "about-benefits-3": "12 மாதங்கள் நடைமுறை பணி அனுபவம்",
    "about-benefits-4": "முன்னணி நிறுவனங்களுடன் தொழில் வெளிப்பாடு",
    "about-benefits-5": "முடிவுச் சான்றிதழ்",
    "about-benefits-6": "திறன் மேம்பாடு மற்றும் பயிற்சி",
    "about-sectors-title": "பங்கேற்கும் துறைகள்",
    "find-title": "இன்டர்ன்ஷிப்களைக் கண்டறியவும்",
    "search-placeholder": "நிறுவனம், பங்கு அல்லது இடம் மூலம் தேடுங்கள்...",
    "btn-search": "தேடு",
    "browse-title": "அனைத்து இன்டர்ன்ஷிப்களையும் உலாவவும்",
    "filter-sector": "துறை:",
    "filter-location": "இடம்:",
    "filter-all": "அனைத்தும்",
    "btn-reset": "வடிப்பான்களை மீட்டமைக்கவும்",
    "contact-title": "எங்களை தொடர்பு கொள்ளுங்கள்",
    "contact-helpline": "உதவி எண்",
    "contact-helpline-time": "கிடைக்கும்: திங்கள் முதல் வெள்ளி, காலை 9 மணி முதல் மாலை 6 மணி IST",
    "contact-email-title": "மின்னஞ்சல் ஆதரவு",
    "contact-faq-title": "அடிக்கடி கேட்கப்படும் கேள்விகள்",
    "faq-q1": "PM இன்டர்ன்ஷிப் திட்டத்திற்கு யார் தகுதியுடையவர்?",
    "faq-a1": "பட்டப்படிப்பு அல்லது டிப்ளோமாவுடன் 21-24 வயதுக்குட்பட்ட இளைஞர்கள் மற்றும் குடும்ப வருமானம் ஆண்டுக்கு ₹8 லட்சம் வரை உள்ளவர்கள்.",
    "faq-q2": "உதவித்தொகை தொகை என்ன?",
    "faq-a2": "மாதத்திற்கு ₹5,000 கூடுதலாக ₹6,000 ஒரு முறை உதவி.",
    "faq-q3": "இன்டர்ன்ஷிப் காலம் எவ்வளவு?",
    "faq-a3": "இன்டர்ன்ஷிப் காலம் 12 மாதங்கள் (1 ஆண்டு).",
    "contact-form-title": "எங்களுக்கு ஒரு செய்தி அனுப்புங்கள்",
    "form-name": "பெயர்:",
    "form-email": "மின்னஞ்சல்:",
    "form-message": "செய்தி:",
    "btn-submit": "சமர்ப்பிக்கவும்",
    "btn-view-details": "விவரங்களைக் காண்க",
    "btn-apply": "இப்போது விண்ணப்பிக்கவும்",
    "modal-location": "இடம்",
    "modal-sector": "துறை",
    "modal-duration": "காலம்",
    "modal-stipend": "மாதாந்திர உதவித்தொகை",
    "modal-grant": "ஒரு முறை மானியம்",
    "modal-requirements": "தேவைகள்",
    "modal-skills": "தேவையான திறன்கள்",
    "modal-description": "விளக்கம்"
  },
  ma: {
    "nav-title": "पंतप्रधान इंटर्नशिप योजना",
    "nav-home": "मुख्यपृष्ठ",
    "nav-about": "बद्दल",
    "nav-find": "इंटर्नशिप शोधा",
    "nav-browse": "सर्व पहा",
    "nav-contact": "संपर्क",
    "btn-login": "लॉगिन",
    "btn-register": "नोंदणी",
    "hero-title": "पंतप्रधान इंटर्नशिप योजना",
    "hero-subtitle": "भारताच्या युवकांना वास्तविक अनुभव आणि करिअरच्या संधी प्रदान करणे",
    "hero-description": "ग्रामीण भाग, आदिवासी जिल्हे आणि वंचित समुदायांसह संपूर्ण भारतातील युवकांना व्यावहारिक कामाचा अनुभव मिळवण्यासाठी मौल्यवान संधी प्रदान करणे.",
    "btn-find-now": "आता इंटर्नशिप शोधा",
    "feature-internships": "इंटर्नशिप",
    "feature-internships-sub": "5 वर्षांत",
    "feature-stipend": "मासिक वेतन",
    "feature-stipend-sub": "तसेच ₹6,000 एकवेळ अनुदान",
    "feature-sectors": "क्षेत्रे",
    "feature-sectors-sub": "संपूर्ण भारतात",
    "feature-duration": "महिने कालावधी",
    "feature-duration-sub": "पूर्णवेळ इंटर्नशिप",
    "overview-title": "योजनेबद्दल",
    "overview-text": "पंतप्रधान इंटर्नशिप योजना विविध पार्श्वभूमीतील युवकांना व्यावहारिक कामाचा अनुभव देण्यासाठी भारत सरकारचा एक महत्त्वाचा उपक्रम आहे. हा कार्यक्रम शिक्षण आणि रोजगार यांच्यातील अंतर भरून काढतो.",
    "about-title": "पंतप्रधान इंटर्नशिप योजनेबद्दल",
    "about-background-title": "पार्श्वभूमी आणि उद्दिष्टे",
    "about-background-text": "भारतीय युवकांमधील रोजगारक्षमतेची दरी भरून काढण्यासाठी पंतप्रधान इंटर्नशिप योजना सुरू करण्यात आली. देशभरातील तरुण पदवीधरांना व्यावहारिक कामाचा अनुभव देणे, कौशल्ये वाढवणे आणि करिअरची शक्यता सुधारणे हे त्याचे उद्दिष्ट आहे.",
    "about-eligibility-title": "पात्रता निकष",
    "about-eligibility-1": "वय: 21-24 वर्षे",
    "about-eligibility-2": "शिक्षण: संबंधित क्षेत्रात पदवी किंवा डिप्लोमा",
    "about-eligibility-3": "कौटुंबिक उत्पन्न: वर्षाला ₹8 लाख पर्यंत",
    "about-eligibility-4": "वैध आधार कार्डासह भारतीय नागरिक",
    "about-eligibility-5": "सध्या नोकरीत नाही किंवा पूर्णवेळ शिक्षणात नोंदणीकृत नाही",
    "about-benefits-title": "फायदे",
    "about-benefits-1": "₹5,000 मासिक वेतन",
    "about-benefits-2": "₹6,000 एकवेळ मदत",
    "about-benefits-3": "12 महिने व्यावहारिक कामाचा अनुभव",
    "about-benefits-4": "आघाडीच्या कंपन्यांसह उद्योग प्रदर्शन",
    "about-benefits-5": "पूर्णता प्रमाणपत्र",
    "about-benefits-6": "कौशल्य विकास आणि प्रशिक्षण",
    "about-sectors-title": "सहभागी क्षेत्रे",
    "find-title": "इंटर्नशिप शोधा",
    "search-placeholder": "कंपनी, भूमिका किंवा स्थान द्वारे शोधा...",
    "btn-search": "शोधा",
    "browse-title": "सर्व इंटर्नशिप ब्राउझ करा",
    "filter-sector": "क्षेत्र:",
    "filter-location": "स्थान:",
    "filter-all": "सर्व",
    "btn-reset": "फिल्टर रीसेट करा",
    "contact-title": "आमच्याशी संपर्क साधा",
    "contact-helpline": "हेल्पलाइन नंबर",
    "contact-helpline-time": "उपलब्ध: सोमवार ते शुक्रवार, सकाळी 9 ते संध्याकाळी 6 IST",
    "contact-email-title": "ईमेल सपोर्ट",
    "contact-faq-title": "वारंवार विचारले जाणारे प्रश्न",
    "faq-q1": "PM इंटर्नशिप योजनेसाठी कोण पात्र आहे?",
    "faq-a1": "पदवी किंवा डिप्लोमा असलेले 21-24 वर्षे वयोगटातील युवक आणि कौटुंबिक उत्पन्न वर्षाला ₹8 लाख पर्यंत.",
    "faq-q2": "वेतन रक्कम किती आहे?",
    "faq-a2": "₹5,000 प्रति महिना तसेच ₹6,000 एकवेळ मदत.",
    "faq-q3": "इंटर्नशिपचा कालावधी किती आहे?",
    "faq-a3": "इंटर्नशिपचा कालावधी 12 महिने (1 वर्ष) आहे.",
    "contact-form-title": "आम्हाला संदेश पाठवा",
    "form-name": "नाव:",
    "form-email": "ईमेल:",
    "form-message": "संदेश:",
    "btn-submit": "सबमिट करा",
    "btn-view-details": "तपशील पहा",
    "btn-apply": "आता अर्ज करा",
    "modal-location": "स्थान",
    "modal-sector": "क्षेत्र",
    "modal-duration": "कालावधी",
    "modal-stipend": "मासिक वेतन",
    "modal-grant": "एकवेळ अनुदान",
    "modal-requirements": "आवश्यकता",
    "modal-skills": "आवश्यक कौशल्ये",
    "modal-description": "वर्णन"
  }
};

// Global internships arrays - initialized before use
let internships = [];
let filteredBrowseAll = [];

let currentLanguage = 'en';
let filteredInternshipsList = [];
let savedProfileData = null; // Store profile in memory instead of localStorage
let browseFilters = {
  sectors: [],
  locations: []
};
let browseAllFilters = {
  search: '',
  sector: '',
  location: '',
  sort: 'recent'
};
let browseAllPagination = {
  currentPage: 1,
  itemsPerPage: 20,
  totalPages: 1
};
let currentInternship = null;

// Initialize app
document.addEventListener('DOMContentLoaded', async function () {
  console.log('🚀 Page loaded, initializing app...');
  clearAllForms();
  initializeNavigation();
  initializeTheme();
  initializeLanguage();
  initScrollAnimations();

  console.log('✅ App initialized');

  // Load internships data from backend
  await loadIntershipDataFromBackend();
});



// Initialize scroll animations
function initScrollAnimations() {
  const cards = document.querySelectorAll('.feature-card, .stat-card, .why-card');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, index) => {
      if (entry.isIntersecting) {
        setTimeout(() => {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
        }, index * 100);
      }
    });
  }, {
    threshold: 0.1
  });

  cards.forEach(card => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';
    card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(card);
  });
}

// Navigation
function initializeNavigation() {
  const navLinks = document.querySelectorAll('.nav-link');
  const sections = document.querySelectorAll('.page-section');
  const mobileToggle = document.getElementById('mobileMenuToggle');
  const navMenu = document.getElementById('navMenu');

  navLinks.forEach(link => {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      const targetId = this.getAttribute('href').substring(1);

      // Update active states
      navLinks.forEach(l => l.classList.remove('active'));
      this.classList.add('active');

      // Show target section
      sections.forEach(section => {
        section.classList.remove('active');
        if (section.id === targetId) {
          section.classList.add('active');
        }
      });

      // Close mobile menu
      navMenu.classList.remove('active');

      // Scroll to top
      window.scrollTo(0, 0);
    });
  });

  // Mobile menu toggle
  if (mobileToggle) {
    mobileToggle.addEventListener('click', function () {
      navMenu.classList.toggle('active');
    });
  }
}

function navigateToSection(sectionId) {
  const targetLink = document.querySelector(`a[href = "#${sectionId}"]`);
  if (targetLink) {
    targetLink.click();
  }
}


// Theme Toggle
function initializeTheme() {
  const themeToggle = document.getElementById('themeToggle');
  const savedTheme = 'light'; // Default to light mode
  document.documentElement.setAttribute('data-color-scheme', savedTheme);

  themeToggle.addEventListener('click', function () {
    const currentTheme = document.documentElement.getAttribute('data-color-scheme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-color-scheme', newTheme);
  });
}

// Language Selector
function initializeLanguage() {
  const languageSelector = document.getElementById('languageSelector');
  languageSelector.addEventListener('change', function () {
    currentLanguage = this.value;
    updateLanguage();
  });
}

// Update Language UI
function updateLanguage() {
  const elements = document.querySelectorAll('[data-translate]');
  elements.forEach(element => {
    const key = element.getAttribute('data-translate');
    if (translations[currentLanguage] && translations[currentLanguage][key]) {
      element.textContent = translations[currentLanguage][key];
    }
  });

  // Update placeholder
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.placeholder = translations[currentLanguage]['search-placeholder'] || 'Search...';
  }
}

// Load internships data from backend
async function loadIntershipDataFromBackend() {
  try {
    console.log('📡 Fetching internships from backend...');

    // Fetch all internships from backend (using limit parameter)
    const response = await fetch(`${API_BASE}/internships/filter?limit=10000`);
    const json = await response.json();

    if (json.success && json.data) {
      internships = json.data;
      filteredBrowseAll = [...internships];
      console.log(`✅ Loaded ${internships.length} internships from backend`);
    } else {
      console.error('❌ Failed to load internships:', json.error || 'API Route not found');
      internships = [];
      filteredBrowseAll = [];
    }
  } catch (error) {
    console.error('❌ Error loading internships:', error);
    internships = [];
    filteredBrowseAll = [];
  }
}

// Redundant browse functions removed

// Modal
function openModal(internship) {
  currentInternship = internship;
  const modal = document.getElementById('internshipModal');
  const modalBody = document.getElementById('modalBody');

  // Helper function to parse and display arrays/lists
  const parseList = (data) => {
    if (!data) return 'Not specified';
    if (typeof data === 'string') {
      try {
        const parsed = JSON.parse(data.replace(/'/g, '"'));
        return Array.isArray(parsed) ? parsed.join(', ') : data;
      } catch {
        return data;
      }
    }
    return Array.isArray(data) ? data.join(', ') : data;
  };

  // Format location - strip ('...')
  let locationDisplay = internship.location || 'N/A';
  if (locationDisplay.startsWith("('") || locationDisplay.startsWith('("')) {
    locationDisplay = locationDisplay.replace(/^[\\('"]|[\\)'"]]$/g, '');
  }

  // Parse skills and perks
  const skills = parseList(internship.skills);
  const perks = parseList(internship.perks);
  const internType = parseList(internship.intern_type || internship.internType);

  // 1A. Formatted AI Explanation
  let aiReasoning = internship.aiExplanation || '';
  if (aiReasoning) {
    if (typeof aiReasoning === 'string' && aiReasoning.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(aiReasoning);
        if (parsed.summary && parsed.reasons) {
          aiReasoning = `<strong style="display:block;margin-bottom:4px;color:#13343b;">${parsed.summary}</strong>` +
            `<ul style="margin:0;padding-left:15px;list-style:disc;">` +
            parsed.reasons.map(r => `<li style="margin-bottom:2px;">${r}</li>`).join('') +
            `</ul>`;
        } else if (parsed.explanation) {
          aiReasoning = parsed.explanation;
        }
      } catch (e) { }
    } else if (typeof aiReasoning === 'object' && aiReasoning !== null) {
      if (aiReasoning.summary && aiReasoning.reasons) {
        aiReasoning = `<strong style="display:block;margin-bottom:4px;">${aiReasoning.summary}</strong>` +
          `<ul style="margin:0;padding-left:15px;list-style:disc;">` +
          aiReasoning.reasons.map(r => `<li>${r}</li>`).join('') +
          `</ul>`;
      } else {
        aiReasoning = aiReasoning.explanation || aiReasoning.text || JSON.stringify(aiReasoning);
      }
    }
  }

  modalBody.innerHTML = `
    <div class="modal-header" style="background: linear-gradient(135deg, #13343b 0%, #21808d 100%); color: white; padding: 28px 24px; border-radius: 12px 12px 0 0; margin: -20px -20px 24px -20px; box-shadow: 0 4px 12px rgba(19,52,59,0.1);">
      <h2 style="margin: 0 0 6px 0; font-size: 1.6em; font-weight: 800; letter-spacing: -0.5px;">${internship.company || 'Company Name'}</h2>
      <p style="margin: 0; font-size: 1.1em; opacity: 0.9; font-weight: 500;">${internship.role || 'Role'}</p>
    </div>

    <div class="modal-details" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; margin-bottom: 24px;">
      <div class="modal-detail-item" style="background: #f8fafc; padding: 14px; border-radius: 10px; border: 1px solid rgba(19,52,59,0.08); border-top: 3px solid #64748b;">
        <span style="display: block; font-size: 0.75rem; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">📍 Location</span>
        <span style="display: block; font-weight: 600; color: #1e293b; font-size: 0.95rem;">${locationDisplay}</span>
      </div>
      <div class="modal-detail-item" style="background: #f8fafc; padding: 14px; border-radius: 10px; border: 1px solid rgba(19,52,59,0.08); border-top: 3px solid #10b981;">
        <span style="display: block; font-size: 0.75rem; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">⏱️ Duration</span>
        <span style="display: block; font-weight: 600; color: #1e293b; font-size: 0.95rem;">${internship.duration || 'N/A'}</span>
      </div>
      <div class="modal-detail-item" style="background: #f8fafc; padding: 14px; border-radius: 10px; border: 1px solid rgba(19,52,59,0.08); border-top: 3px solid #f59e0b;">
        <span style="display: block; font-size: 0.75rem; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">💰 Stipend</span>
        <span style="display: block; font-weight: 600; color: #1e293b; font-size: 0.95rem;">${internship.stipend || 'N/A'}</span>
      </div>
      <div class="modal-detail-item" style="background: #f8fafc; padding: 14px; border-radius: 10px; border: 1px solid rgba(19,52,59,0.08); border-top: 3px solid #21808d;">
        <span style="display: block; font-size: 0.75rem; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">🎯 Type</span>
        <span style="display: block; font-weight: 600; color: #1e293b; font-size: 0.95rem;">${internType && internType !== 'Not specified' ? internType : 'Internship'}</span>
      </div>
    </div>

    ${aiReasoning ? `
    <div class="modal-section" style="margin-bottom: 24px; padding: 20px; background: #f0fdfa; border-radius: 12px; border: 1px solid #ccfbf1; box-shadow: 0 2px 8px rgba(33,128,141,0.05);">
       <h3 style="margin: 0 0 10px 0; font-size: 0.95rem; font-weight: 800; color: #13343b; text-transform: uppercase; letter-spacing: 1px; display: flex; align-items: center; gap: 8px;">
        <span style="font-size: 1.2rem;">✨</span> AI Match Insights
      </h3>
      <div style="margin: 0; color: #1e293b; line-height: 1.6; font-size: 0.95rem; font-weight: 500;">
        ${aiReasoning}
      </div>
    </div>
    ` : ''}

    ${skills && skills !== 'Not specified' ? `
    <div class="modal-section" style="margin-bottom: 18px; padding: 16px; background: rgba(33,128,141,0.04); border-radius: 10px; border-left: 4px solid #21808d;">
      <h3 style="margin: 0 0 10px 0; font-size: 1rem; font-weight: 700; color: #13343b; display: flex; align-items: center; gap: 8px;">
        <span style="color: #21808d;">💼</span> Required Skills
      </h3>
      <p style="margin: 0; color: #475569; line-height: 1.6; font-size: 0.92rem;">${skills}</p>
    </div>
    ` : ''
    }

    ${perks && perks !== 'Not specified' ? `
    <div class="modal-section" style="margin-bottom: 18px; padding: 16px; background: rgba(59,130,246,0.04); border-radius: 10px; border-left: 4px solid #3b82f6;">
      <h3 style="margin: 0 0 10px 0; font-size: 1rem; font-weight: 700; color: #1e3a8a; display: flex; align-items: center; gap: 8px;">
        <span style="color: #3b82f6;">🎁</span> Perks & Benefits
      </h3>
      <p style="margin: 0; color: #475569; line-height: 1.6; font-size: 0.92rem;">${perks}</p>
    </div>
    ` : ''
    }

    ${internship.requirements && internship.requirements !== 'undefined' ? `
    <div class="modal-section" style="margin-bottom: 18px; padding: 16px; background: rgba(16,185,129,0.04); border-radius: 10px; border-left: 4px solid #10b981;">
      <h3 style="margin: 0 0 10px 0; font-size: 1rem; font-weight: 700; color: #064e3b; display: flex; align-items: center; gap: 8px;">
        <span style="color: #10b981;">📋</span> Requirements
      </h3>
      <p style="margin: 0; color: #475569; line-height: 1.6; font-size: 0.92rem;">${internship.requirements}</p>
    </div>
    ` : ''
    }

  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 10px; margin: 24px 0;">
    ${internship.hiring_since || internship.hiringSince ? `
      <div style="background: white; padding: 12px; border-radius: 8px; text-align: center; border: 1px solid #f1f5f9; box-shadow: 0 2px 4px rgba(0,0,0,0.02);">
        <div style="font-size: 0.65rem; font-weight: 700; color: #94a3b8; text-transform: uppercase; margin-bottom: 4px;">📅 Hiring Since</div>
        <div style="font-weight: 600; color: #1e293b; font-size: 0.85rem;">${internship.hiring_since || internship.hiringSince}</div>
      </div>
      ` : ''}
    ${internship.opening || internship.openings ? `
      <div style="background: white; padding: 12px; border-radius: 8px; text-align: center; border: 1px solid #f1f5f9; box-shadow: 0 2px 4px rgba(0,0,0,0.02);">
        <div style="font-size: 0.65rem; font-weight: 700; color: #94a3b8; text-transform: uppercase; margin-bottom: 4px;">🚪 Openings</div>
        <div style="font-weight: 600; color: #1e293b; font-size: 0.85rem;">${internship.opening || internship.openings}</div>
      </div>
      ` : ''}
    ${internship.number_of_applications || internship.applications ? `
      <div style="background: white; padding: 12px; border-radius: 8px; text-align: center; border: 1px solid #f1f5f9; box-shadow: 0 2px 4px rgba(0,0,0,0.02);">
        <div style="font-size: 0.65rem; font-weight: 700; color: #94a3b8; text-transform: uppercase; margin-bottom: 4px;">👥 Applications</div>
        <div style="font-weight: 600; color: #1e293b; font-size: 0.85rem;">${internship.number_of_applications || internship.applications}</div>
      </div>
      ` : ''}
  </div>

    ${internship.website_link || internship.websiteLink ? `
    <div style="margin-bottom: 24px; text-align: center;">
      <a href="${internship.website_link || internship.websiteLink}" target="_blank" style="padding: 10px 20px; background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 8px; color: #21808d; text-decoration: none; font-size: 0.85rem; font-weight: 600; display: inline-flex; align-items: center; gap: 8px; transition: all 0.2s;">
        <span>🌐</span> Visit Company Website <span>→</span>
      </a>
    </div>
    ` : ''
    }

  <div class="modal-footer" style="display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; padding-top: 24px; border-top: 1px solid #f1f5f9;">
    <button class="btn btn-outline" onclick="closeModal()" style="min-width: 100px;">Close</button>
    <button class="btn btn-outline" onclick="generateCoverLetterForModal(this)" style="color: #21808d; border-color: #21808d; background: #f0fdfa;">
      ✨ AI Cover Letter
    </button>
    <button class="btn btn-outline" onclick="openInterviewModal()" style="color: #3b82f6; border-color: #3b82f6; background: #eff6ff;">
      🎤 AI Coach
    </button>
    <a href="${internship.website_link || internship.websiteLink || 'https://www.internshala.com'}" target="_blank" class="btn btn-primary" style="padding: 10px 24px; text-decoration: none; min-width: 120px; display: inline-flex; justify-content: center; align-items: center;">Apply Now</a>
  </div>

  `;

  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  const modal = document.getElementById('internshipModal');
  modal.classList.remove('active');
  document.body.style.overflow = 'auto';
}

// Close modal on outside click
document.getElementById('internshipModal').addEventListener('click', function (e) {
  if (e.target === this) {
    closeModal();
  }
});

async function generateCoverLetterForModal(btn) {
  if (!auth.currentUser || !currentProfile) {
    alert("Please login and complete your profile to use AI features.");
    openLoginModal();
    return;
  }

  const internship = currentInternship;
  if (!internship) return;

  const originalText = btn.innerHTML;
  btn.innerHTML = '⏳ Generating...';
  btn.disabled = true;

  try {
    const res = await fetch(`${API_BASE}/ai/generate-cover-letter`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userName: currentProfile.name || currentProfile.first_name,
        skills: currentProfile.skills || [],
        role: internship.role,
        company: internship.company
      })
    });

    const data = await res.json();
    if (data.success) {
      const modalBody = document.getElementById('modalBody');
      const letter = data.data; // {subject, body}

      // Remove existing letter if any
      const existing = document.getElementById('generatedCoverLetter');
      if (existing) existing.remove();

      const letterHtml = `
    <div id="generatedCoverLetter" style="margin-top: 20px; background: #fff; padding: 20px; border: 1px solid #ddd; border-radius: 8px; animation: slideIn 0.3s ease;">
      <h4 style="margin-top:0; color: #333;">📄 Your AI Cover Letter</h4>
      <div style="margin-bottom: 10px;">
        <label style="font-weight:bold; font-size:12px; color:#666;">SUBJECT LINE</label>
        <input type="text" value="${letter.subject}" style="width:100%; padding:8px; border:1px solid #ccc; border-radius:4px; margin-top:4px;">
      </div>
      <div>
        <label style="font-weight:bold; font-size:12px; color:#666;">CONTENT</label>
        <textarea style="width:100%; height:200px; padding:10px; border:1px solid #ccc; border-radius:4px; font-family:inherit; resize:vertical;">${letter.body}</textarea>
      </div>
      <button onclick="copyCoverLetter()" class="btn-primary" style="margin-top:10px; width:auto; padding: 8px 16px;">📋 Copy to Clipboard</button>
    </div>
    `;

      // Append before footer
      const footer = document.querySelector('.modal-footer');
      footer.insertAdjacentHTML('beforebegin', letterHtml);
      footer.scrollIntoView({ behavior: 'smooth' });

    } else {
      alert("❌ Failed to generate cover letter: " + data.error);
    }

  } catch (error) {
    console.error(error);
    alert("Network error.");
  } finally {
    btn.innerHTML = originalText;
    btn.disabled = false;
  }
}

function copyCoverLetter() {
  const text = document.querySelector('#generatedCoverLetter textarea').value;
  navigator.clipboard.writeText(text).then(() => alert("Copied!"));
}

// Tab Switching
function switchTab(tabName) {
  // Update tab buttons
  const tabButtons = document.querySelectorAll('.tab-btn');
  tabButtons.forEach(btn => {
    if (btn.getAttribute('data-tab') === tabName) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // Update tab content
  const recommendationsTab = document.getElementById('recommendations-tab');

  if (recommendationsTab) {
    if (tabName === 'recommendations') {
      recommendationsTab.style.display = 'block';
      recommendationsTab.classList.add('active');
    } else {
      recommendationsTab.style.display = 'none';
      recommendationsTab.classList.remove('active');
    }
  }
}

// ========== BROWSE ALL LOGIC (V3 - Consolidated) ==========

function scrollToBrowse() {
  const browseSection = document.getElementById('browse-all');
  if (browseSection) {
    navigateToSection('browse-all');
    setTimeout(() => {
      loadBrowseInternships();
    }, 100);
  }
}

function navigateToBrowseAll() {
  navigateToSection('browse-all');
  setTimeout(() => {
    loadBrowseInternships();
  }, 100);
}

// ===== BROWSE ALL CORE FUNCTIONS =====
function loadBrowseInternships() {
  // Reset pagination when loading all initially
  paginationState.currentPage = 1;
  paginationState.companyName = '';

  // Clear search input UI
  const companyInput = document.getElementById('browseCompanySearch');
  if (companyInput) companyInput.value = '';

  fetchInternshipsWithFilters(null, null, '');
}

function applyBrowseFilters() {
  const companyInput = document.getElementById('browseCompanySearch');
  const company = companyInput ? companyInput.value.trim() : '';

  paginationState.currentPage = 1;
  fetchInternshipsWithFilters(paginationState.userLocation, paginationState.userSkills, company);
}

function clearBrowseFilters() {
  const companyInput = document.getElementById('browseCompanySearch');
  if (companyInput) companyInput.value = '';

  paginationState.currentPage = 1;
  paginationState.companyName = '';
  fetchInternshipsWithFilters(null, null, '');
}

// Handle Quick Profile Form Submission (Unified)
async function handleQuickProfileSubmit(event) {
  event.preventDefault();
  const formData = new FormData(event.target);

  const firstName = formData.get('firstName') || '';
  const lastName = formData.get('lastName') || '';
  const name = `${firstName} ${lastName}`.trim();
  const qualification = formData.get('education') || formData.get('field') || '';
  const skillsInput = formData.get('skills') || '';
  const preferredState = formData.get('preferredState') || formData.get('location') || '';
  const preferredSector = formData.get('industry') || 'Any';
  const workPreference = formData.get('workPreference') || 'office';
  const resumeText = document.getElementById('resumeTextData') ? document.getElementById('resumeTextData').value : '';

  currentProfile = { name, qualification, skills: skillsInput, preferredState, preferredSector, workPreference };
  await callRecommendationsAPI(name, '21', qualification, skillsInput, preferredState, preferredSector, workPreference, resumeText);
}

// Profile Form Submission
async function getRecommendations() {
  const nameEl = document.getElementById('name');
  const qualificationEl = document.getElementById('qualification');
  const skillsEl = document.getElementById('skills');
  const stateEl = document.getElementById('state');

  if (!nameEl || !qualificationEl || !skillsEl || !stateEl) return;

  const name = nameEl.value.trim();
  const qualification = qualificationEl.value.trim();
  const skillsInput = skillsEl.value.trim();
  const preferredState = stateEl.value.trim();
  const preferredSector = document.getElementById('sector')?.value || 'Any';

  if (!name || !qualification || !skillsInput || !preferredState) {
    alert('Please fill in required fields');
    return;
  }

  await callRecommendationsAPI(name, '21', qualification, skillsInput, preferredState, preferredSector);
}

async function callRecommendationsAPI(name, age, qualification, skillsInput, preferredState, preferredSector, workPreference = 'office', resumeText = '') {
  try {
    const skills = skillsInput.split(',').map(s => s.trim()).filter(s => s);
    showRecommendationsLoading();

    const res = await fetch(`${API_BASE}/recommendations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, age, qualification, skills, preferredSector, preferredState, workPreference, resumeText })
    });

    const json = await res.json();
    if (json.success) {
      displayRecommendationsResults(json.recommendations || []);
    } else {
      alert('Error: ' + (json.error || 'Failed to get recommendations'));
      hideRecommendationsLoading();
    }
  } catch (error) {
    console.error('Recommendations Error:', error);
    hideRecommendationsLoading();
  }
}
// ===== CONTACT & INTERVIEW COACH =====

function handleContactSubmit(e) {
  e.preventDefault();
  const name = document.getElementById('contactName')?.value;
  const email = document.getElementById('contactEmail')?.value;
  alert(`Thank you ${name}! Your message has been received. We will get back to you at ${email} soon.`);
  document.getElementById('contactForm')?.reset();
}

function copyCoverLetter() {
  const textarea = document.querySelector('#generatedCoverLetter textarea');
  if (textarea) {
    navigator.clipboard.writeText(textarea.value).then(() => alert("Copied!"));
  }
}

let interviewHistory = [];
function openInterviewModal() {
  if (!auth.currentUser) {
    alert("Please login to use AI Interview Coach.");
    openLoginModal();
    return;
  }
  const modal = document.getElementById('interviewModal');
  const contextEl = document.getElementById('interviewContext');
  const chatArea = document.getElementById('interviewChatArea');
  if (currentInternship && contextEl) {
    contextEl.textContent = `Practice for ${currentInternship.role} @${currentInternship.company}`;
  }
  interviewHistory = [];
  if (chatArea) {
    chatArea.innerHTML = `
      <div class="chat-msg model" style="background: #f1f5f9; padding: 10px 15px; border-radius: 12px 12px 12px 0; align-self: flex-start; max-width: 80%; line-height: 1.5; color: #334155;">
        👋 Hi! I'm your AI Interviewer. Tell me about yourself.
      </div>
    `;
  }
  modal?.classList.add('active');
}

function closeInterviewModal() {
  document.getElementById('interviewModal')?.classList.remove('active');
}

async function handleInterviewSubmit(e) {
  e.preventDefault();
  const input = document.getElementById('interviewInput');
  const text = input?.value.trim();
  if (!text) return;
  appendChatMessage(text, 'user');
  input.value = '';

  const typingId = 'typing-' + Date.now();
  const chatArea = document.getElementById('interviewChatArea');
  chatArea?.insertAdjacentHTML('beforeend', `<div id="${typingId}" class="chat-msg model" style="background: #f1f5f9; padding: 10px 15px; border-radius: 12px 12px 12px 0; align-self: flex-start; max-width: 80%; color: #94a3b8; font-style: italic;">Thinking...</div>`);
  chatArea.scrollTop = chatArea.scrollHeight;

  try {
    interviewHistory.push({ sender: 'user', text: text });
    const res = await fetch(`${API_BASE}/ai/interview-chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ history: interviewHistory, role: currentInternship?.role || 'Intern', company: currentInternship?.company || 'Company' })
    });
    const data = await res.json();
    document.getElementById(typingId)?.remove();
    if (data.success) {
      appendChatMessage(data.data.reply, 'model');
      interviewHistory.push({ sender: 'model', text: data.data.reply });
    } else {
      appendChatMessage("❌ Error connecting to AI Coach.", 'model');
    }
  } catch (err) {
    document.getElementById(typingId)?.remove();
    appendChatMessage("❌ Network error.", 'model');
  }
}

function appendChatMessage(text, sender) {
  const chatArea = document.getElementById('interviewChatArea');
  if (!chatArea) return;
  const div = document.createElement('div');
  div.className = `chat-msg ${sender}`;
  const isUser = sender === 'user';
  div.style.cssText = `
    background: ${isUser ? '#0d9488' : '#f1f5f9'};
    color: ${isUser ? '#fff' : '#334155'};
    padding: 10px 15px;
    border-radius: ${isUser ? '12px 12px 0 12px' : '12px 12px 12px 0'};
    align-self: ${isUser ? 'flex-end' : 'flex-start'};
    max-width: 80%;
    line-height: 1.5;
    word-wrap: break-word;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  `;
  div.innerHTML = text.replace(/\n/g, '<br>');
  chatArea.appendChild(div);
  chatArea.scrollTop = chatArea.scrollHeight;
}
// Global window function for file selection (PDF Resume)
window.handleFileSelect = function (input) {
  const fileNameDisplay = document.getElementById('fileNameDisplay');
  if (input.files && input.files[0]) {
    const file = input.files[0];
    if (fileNameDisplay) {
      fileNameDisplay.textContent = "📄 Selected: " + file.name;
      fileNameDisplay.style.display = 'block';
    }
    // Automatically trigger upload & analysis
    Profile.uploadResumeFile(file);
  }
};
