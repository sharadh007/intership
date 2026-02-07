// ===== API + FIREBASE SETUP =====
const API_BASE = 'http://localhost:5000/api';

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCFTIqMvtSM1WhEjhe7pb7Tkix9ggDuS_s",
  authDomain: "pm-intrenship.firebaseapp.com",
  databaseURL: "https://pm-intrenship-default-rtdb.firebaseio.com",
  projectId: "pm-intrenship",
  storageBucket: "pm-intrenship.firebasestorage.app",
  messagingSenderId: "682720260870",
  appId: "1:682720260870:web:84af139577b2bc51e46487",
  measurementId: "G-L5YJBSR69C"
};

firebase.initializeApp(FIREBASE_CONFIG);
const auth = firebase.auth();
const db = firebase.database();

// ===== PAGINATION STATE =====
let paginationState = {
  currentPage: 1,
  totalPages: 1,
  totalCount: 0,
  itemsPerPage: 15,
  allInternships: [],
  filteredInternships: [],
  userLocation: null,
  userSkills: []
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
    fetchInternshipsWithFilters(paginationState.userLocation, paginationState.userSkills);
  }
}

function nextPage() {
  if (paginationState.currentPage < paginationState.totalPages) {
    paginationState.currentPage++;
    fetchInternshipsWithFilters(paginationState.userLocation, paginationState.userSkills);
  }
}

// ===== FETCH INTERNSHIPS WITH FILTERS AND PAGINATION =====
async function fetchInternshipsWithFilters(location, skills) {
  try {
    paginationState.userLocation = location;
    paginationState.userSkills = Array.isArray(skills) ? skills : (skills ? skills.split(',').map(s => s.trim()) : []);

    // Show loading state
    // Show loading state
    const cardsContainer = document.getElementById('recommendationCards');
    const browseContainer = document.getElementById('browseInternshipsList');

    if (cardsContainer) {
      cardsContainer.innerHTML = '<p style="text-align: center; padding: 20px; grid-column: 1/-1;">ðŸ” Loading internships...</p>';
    }
    if (browseContainer) {
      browseContainer.innerHTML = '<p style="text-align: center; padding: 20px;">Loading internships...</p>';
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
        // Display recommendations
        displayInternshipsWithPagination(data.data);

        // Update greeting
        const greetingText = document.getElementById('greetingText');
        const message = document.getElementById('recommendationsMessage');

        if (greetingText) greetingText.textContent = `ðŸ“ Personalized Matches for You`;
        if (message) {
          let msgText = `Found ${data.pagination.total} internship${data.pagination.total !== 1 ? 's' : ''} matching your criteria.`;
          if (location && location !== '--') msgText += ` Location: ${location}.`;
          if (paginationState.userSkills.length > 0) msgText += ` Skills: ${paginationState.userSkills.join(', ')}.`;
          message.textContent = msgText;
        }

        // Show pagination controls
        displayPaginationControls();

        // Scroll to results
        const section = document.getElementById('recommendationsSection');
        if (section) {
          section.scrollIntoView({ behavior: 'smooth' });
        }
      } else {
        // No internships found
        const greetingText = document.getElementById('greetingText');
        const message = document.getElementById('recommendationsMessage');

        if (greetingText) greetingText.textContent = `No Matches Found ðŸ˜”`;
        if (message) message.textContent = 'Try adjusting your preferences or selecting a different location/skills.';
        if (cardsContainer) cardsContainer.innerHTML = '<p style="text-align: center; padding: 40px; grid-column: 1/-1; color: #666;">No internships found for your criteria. Please try with different preferences.</p>';

        // Hide pagination
        const paginationContainer = document.getElementById('paginationContainer');
        if (paginationContainer) paginationContainer.style.display = 'none';
      }
    } else {
      throw new Error(data.error || 'Failed to fetch internships');
    }
  } catch (error) {
    console.error('Error fetching internships:', error);
    const cardsContainer = document.getElementById('recommendationCards');
    if (cardsContainer) {
      cardsContainer.innerHTML = '<p style="text-align: center; padding: 20px; color: #d32f2f; grid-column: 1/-1;">âŒ Error loading internships. Please try again.</p>';
    }
  }
}

// ===== DISPLAY INTERNSHIPS WITH PAGINATION =====
function displayInternshipsWithPagination(internships) {
  const recContainer = document.getElementById('recommendationCards');
  const browseContainer = document.getElementById('browseInternshipsList');

  // Update recommendations if container exists
  if (recContainer) {
    recContainer.innerHTML = '';
    internships.forEach((internship, index) => {
      // ... (keep existing card generation logic for recommendations)
      // Assuming we can reuse createInternshipCard or similar logic
      recContainer.appendChild(createRecommendationCard(internship, index));
    });
  }

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

    // Ensure pagination controls are visible for browse list too
    let browsePagination = document.getElementById('browsePaginationControls');
    if (!browsePagination) {
      browsePagination = document.createElement('div');
      browsePagination.id = 'browsePaginationControls';
      if (browseContainer.parentNode) browseContainer.parentNode.appendChild(browsePagination);
    }

    browsePagination.innerHTML = `
        <div style="display: flex; gap: 10px; align-items: center; justify-content: center; margin-top: 20px;">
          <button class="btn btn-outline" ${paginationState.currentPage === 1 ? 'disabled' : ''} onclick="previousPage()">Previous</button>
          <span>Page ${paginationState.currentPage} of ${paginationState.totalPages}</span>
          <button class="btn btn-outline" ${paginationState.currentPage >= paginationState.totalPages ? 'disabled' : ''} onclick="nextPage()">Next</button>
        </div>
      `;
  }

  // Update page counters
  const showingCountEl = document.getElementById('showingCount');
  const totalCountEl = document.getElementById('totalCount');
  const pageNumEl = document.getElementById('pageNum');
  const totalPagesEl = document.getElementById('totalPages');

  if (showingCountEl) showingCountEl.textContent = internships.length;
  if (totalCountEl) totalCountEl.textContent = paginationState.totalCount || 0;
  if (pageNumEl) pageNumEl.textContent = paginationState.currentPage;
  if (totalPagesEl) totalPagesEl.textContent = paginationState.totalPages;

  console.log(`ðŸ“Š Updated counters: Showing ${internships.length} of ${paginationState.totalCount}, Page ${paginationState.currentPage}/${paginationState.totalPages}`);
}


// Helper for recommendation card specific style (extracted from original displayInternshipsWithPagination)
// Helper for recommendation card specific style (extracted from original displayInternshipsWithPagination)
function createRecommendationCard(internship, index) {
  const card = document.createElement('div');
  card.className = 'recommendation-card-horizontal';

  // Format location
  let locationDisplay = internship.location || 'N/A';
  if (locationDisplay.startsWith("('") || locationDisplay.startsWith('("')) {
    locationDisplay = locationDisplay.replace(/^[\\('"]|[\\)'"]]$/g, '');
  }

  // Format skills for description
  let descriptionText = '';
  if (internship.description) {
    descriptionText = internship.description;
  } else {
    descriptionText = `Build your IT career with ${internship.company} and work on innovative technology projects.`;
  }

  // Determine badge color (gradient colors like in image)
  const rankNum = (paginationState.currentPage - 1) * paginationState.itemsPerPage + index + 1;
  let badgeBg = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'; // Purple gradient
  if (rankNum % 3 === 0) {
    badgeBg = 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'; // Pink gradient
  } else if (rankNum % 2 === 0) {
    badgeBg = 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'; // Blue gradient  
  }

  card.innerHTML = `
    <div style="display: flex; align-items: center; gap: 20px; padding: 24px; background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); transition: all 0.3s ease;">
      <!-- Numbered Circle Badge -->
      <div style="flex-shrink: 0; width: 56px; height: 56px; border-radius: 50%; background: ${badgeBg}; display: flex; align-items: center; justify-content: center; color: white; font-size: 1.5em; font-weight: 700; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);">
        ${rankNum}
      </div>
      
      <!-- Content Section -->
      <div style="flex: 1; min-width: 0;">
        <!-- Title and Company -->
        <h3 style="margin: 0 0 4px 0; font-size: 1.15em; font-weight: 700; color: #1e293b;">
          ${internship.role || 'N/A'}
        </h3>
        <p style="margin: 0 0 12px 0; font-size: 0.95em; color: #64748b; font-weight: 500;">
          ${internship.company || 'N/A'}
        </p>
        
        <!-- Details Row with Icons -->
        <div style="display: flex; flex-wrap: wrap; gap: 16px; margin-bottom: 8px; font-size: 0.9em; color: #64748b;">
          <span style="display: flex; align-items: center; gap: 6px;">
            <span style="color: #ef4444;">ðŸ“</span> ${locationDisplay}
          </span>
          <span style="display: flex; align-items: center; gap: 6px;">
            <span style="color: #3b82f6;">ðŸ¢</span> ${internship.sector || 'Technology'}
          </span>
          <span style="display: flex; align-items: center; gap: 6px;">
            <span style="color: #f59e0b;">ðŸ’°</span> ${internship.stipend || 'N/A'}
          </span>
          <span style="display: flex; align-items: center; gap: 6px;">
            <span style="color: #8b5cf6;">â±ï¸</span> ${internship.duration || 'N/A'}
          </span>
        </div>
        
        <!-- Description -->
        <p style="margin: 8px 0 0 0; font-size: 0.85em; color: #94a3b8; line-height: 1.5;">
          ${descriptionText}
        </p>
      </div>
      
      <!-- View Details Button -->
      <div style="flex-shrink: 0;">
        <button class="btn-view-horizontal" style="padding: 12px 24px; background: #0d9488; color: white; border: none; border-radius: 8px; font-weight: 600; font-size: 0.95em; cursor: pointer; transition: all 0.2s ease; box-shadow: 0 2px 8px rgba(13, 148, 136, 0.3); white-space: nowrap;">
          View Details
        </button>
      </div>
    </div>
  `;

  // Card styling
  card.style.cssText = `
    margin-bottom: 16px;
    transition: all 0.3s ease;
  `;

  // Hover effect for entire card
  const cardInner = card.querySelector('div');
  card.addEventListener('mouseenter', function () {
    if (cardInner) {
      cardInner.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)';
      cardInner.style.transform = 'translateY(-2px)';
    }
  });

  card.addEventListener('mouseleave', function () {
    if (cardInner) {
      cardInner.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
      cardInner.style.transform = 'translateY(0)';
    }
  });

  // Button click handler
  const button = card.querySelector('.btn-view-horizontal');
  if (button) {
    button.addEventListener('click', function (e) {
      e.stopPropagation();
      if (typeof openModal === 'function') {
        openModal(internship);
      } else {
        console.error('openModal function not found');
      }
    });

    button.addEventListener('mouseenter', function () {
      this.style.background = '#0f766e';
      this.style.transform = 'scale(1.05)';
    });

    button.addEventListener('mouseleave', function () {
      this.style.background = '#0d9488';
      this.style.transform = 'scale(1)';
    });
  }

  // Make whole card clickable
  card.addEventListener('click', function (e) {
    if (!e.target.classList.contains('btn-view-horizontal')) {
      if (typeof openModal === 'function') {
        openModal(internship);
      }
    }
  });

  return card;
}


// Helper function to get match label from score
function getMatchLabelFromScore(score) {
  const numScore = typeof score === 'string' ? parseInt(score) : score;
  if (numScore >= 85) return 'Excellent Match';
  if (numScore >= 70) return 'Good Match';
  if (numScore >= 55) return 'Fair Match';
  if (numScore >= 40) return 'Average Match';
  return 'Poor Match';
}

// Create internship card for Browse All page
function createInternshipCard(internship) {
  const card = document.createElement('div');
  card.className = 'internship-card';
  card.onclick = () => openModal(internship);

  // Format location
  let locationDisplay = internship.location || 'N/A';
  if (locationDisplay.startsWith("('") || locationDisplay.startsWith('("')) {
    locationDisplay = locationDisplay.replace(/^[\('"]|[\)'"]]$/g, '');
  }

  // Format skills
  let skillsDisplay = '';
  if (internship.skills) {
    try {
      const skillsArray = typeof internship.skills === 'string' ? JSON.parse(internship.skills) : internship.skills;
      skillsDisplay = skillsArray.slice(0, 3).join(', ');
      if (skillsArray.length > 3) skillsDisplay += ' +' + (skillsArray.length - 3) + ' more';
    } catch (e) {
      skillsDisplay = internship.skills;
    }
  }

  card.innerHTML = `
    <div class="card-header">
      <div class="company-icon">${(internship.company || 'C')[0].toUpperCase()}</div>
      <div>
        <h3>${internship.role || 'N/A'}</h3>
        <p>${internship.company || 'N/A'}</p>
      </div>
    </div>
    <div class="card-body">
      <div class="info-row"><i class="fas fa-map-marker-alt"></i> ${locationDisplay}</div>
      <div class="info-row"><i class="fas fa-money-bill-wave"></i> ${internship.stipend || 'N/A'}</div>
      <div class="info-row"><i class="fas fa-clock"></i> ${internship.duration || 'N/A'}</div>
      ${skillsDisplay ? `<div class="info-row"><i class="fas fa-code"></i> ${skillsDisplay}</div>` : ''}
    </div>
    <div class="card-footer">
      <button class="btn btn-outline view-details-btn">View Details</button>
      <button class="btn btn-primary apply-now-btn">Apply Now</button>
    </div>
  `;

  // Add click handlers properly
  const viewBtn = card.querySelector('.view-details-btn');
  const applyBtn = card.querySelector('.apply-now-btn');

  if (viewBtn) {
    viewBtn.onclick = (e) => {
      e.stopPropagation();
      openModal(internship);
    };
  }

  if (applyBtn) {
    applyBtn.onclick = (e) => {
      e.stopPropagation();
      const websiteUrl = internship.website_link || internship.websiteLink || 'https://www.internshala.com';
      window.open(websiteUrl, '_blank');
    };
  }

  return card;
}

try {
  document.getElementById('recommendationsSection').style.display = 'none';
  document.getElementById('recommendationCards').innerHTML = '';
} catch (e) { }


// ðŸ“ FETCH INTERNSHIPS BY LOCATION FUNCTION (UPDATED WITH PAGINATION)
async function fetchAndDisplayInternshipsByLocation(location) {
  if (!location || location === '--' || location === '') {
    console.log('No location selected');
    return;
  }

  try {
    // Reset pagination and fetch with new filter endpoint
    paginationState.currentPage = 1;
    await fetchInternshipsWithFilters(location, []);

  } catch (error) {
    console.error('Error fetching internships:', error);
    const cardsContainer = document.getElementById('recommendationCards');
    if (cardsContainer) {
      cardsContainer.innerHTML = '<p style="text-align: center; padding: 20px; color: #d32f2f;">âŒ Error loading internships. Please try again.</p>';
    }
  }
}

// ðŸ”¥ CRITICAL: DEFINE THESE FIRST (BEFORE Profile)
function clearAllForms() {
  document.querySelectorAll('input[type="text"], input[type="email"], input[type="number"], input[type="tel"], select').forEach(input => {
    input.value = '';
  });
  document.querySelectorAll('.recommendations-container, #recommendations, .rec-card').forEach(el => {
    if (el) {
      el.style.display = 'none';
      el.innerHTML = '';
    }
  });
  console.log('âœ… Forms cleared');
}

// Global function - clears everything when called


function safeLogout() {
  // Firebase logout
  auth.signOut().then(() => {
    // BULLETPROOF CLEAR - targets your exact HTML
    const section = document.getElementById('recommendationsSection');
    const cards = document.getElementById('recommendationCards');
    const greeting = document.getElementById('greetingText');
    const message = document.getElementById('recommendationsMessage');

    if (section) section.style.display = 'none';
    if (cards) cards.innerHTML = '';
    if (greeting) greeting.textContent = '';
    if (message) message.textContent = '';

    // Clear forms too
    clearAllForms();

    console.log('ðŸ”¥ SAFE LOGOUT COMPLETE');
  }).catch(err => console.error('Logout failed:', err));
}

// ðŸ”¥ PROFILE SYSTEM (NOW SAFE)
let currentProfile = null;
let isProfileModalOpen = false;

// ðŸ”¥ PROFILE SYSTEM (INLINE EDIT REFRACTOR)
// Note: variables defined globally earlier in file (lines 69-70), reused here.

const $ = id => document.getElementById(id);


// Field configuration mapping (key -> label/type)
const FIELD_CONFIG = {
  name: { label: 'Full Name', type: 'text' },
  phone: { label: 'Phone', type: 'tel' },
  qualification: { label: 'Qualification', type: 'select', options: ['B.Tech', 'B.E', 'MBA', 'BBA', 'B.Com', 'B.Sc', 'Diploma', 'Other'] },
  skills: { label: 'Skills', type: 'tags' }, // Special handling
  location: { label: 'Preferred Location', type: 'select', options: ['Remote', 'Bangalore', 'Mumbai', 'Delhi', 'Hyderabad', 'Chennai', 'Pune', 'Noida'] },
  industry: { label: 'Preferred Industry', type: 'select', options: ['IT / Software', 'Finance', 'Marketing', 'Manufacturing', 'Construction', 'Healthcare', 'Education'] }
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
    <span class="edit-icon" onclick="Profile.toggleEdit('${key}')" style="cursor:pointer; font-size:1.1rem;" title="Edit ${key.charAt(0).toUpperCase() + key.slice(1)}">âœï¸</span>
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
    console.log(`âœï¸ Editing ${key} `);
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
          `< option value = "${opt}" ${opt === currentValue ? 'selected' : ''}> ${opt}</option > `
        ).join('');
        inputHtml = `< select id = "input_${key}" class="inline-input" > ${options}</select > `;
      } else {
        inputHtml = `< input type = "text" id = "input_${key}" class="inline-input" value = "${(currentValue || '').toString().trim()}" > `;
      }

      // Helper text for skills
      const helper = key === 'skills' ? '<p class="helper-text">Comma separated (e.g. Java, React)</p>' : '';

      container.innerHTML = `
  < div style = "display:flex; flex-direction:column; width:100%; align-items:center;" >
    <div style="display:flex; gap:8px; width:100%; justify-content:center; align-items:center;">
      ${inputHtml}
      <div class="inline-actions">
        <button class="btn-icon btn-save" onclick="Profile.saveField('${key}')" title="Save">âœ“</button>
        <button class="btn-icon btn-cancel" onclick="Profile.cancelEdit('${key}')" title="Cancel">âœ•</button>
      </div>
    </div>
          ${helper}
        </div >
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

    fetch(`${API_BASE} /students/`, {
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

        // ðŸ“ FETCH AND DISPLAY INTERNSHIPS BY LOCATION
        if (key === 'location' && newValue && newValue !== '--') {
          fetchAndDisplayInternshipsByLocation(newValue);
        }

        // Brief success indicator (optional toast could go here)
      } else {
        alert('âŒ Save failed: ' + (data.error || 'Unknown error'));
        input.disabled = false;
      }
    }).catch(e => {
      console.error(e);
      alert('Network error');
      input.disabled = false;
    });
  },

  analyzeResume() {
    const text = document.getElementById('resumeTextData')?.value.trim();
    if (!text || text.length < 50) {
      alert("âš ï¸ Please paste a valid resume (at least 50 chars).");
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
          // Merge Data
          const extracted = data.data;

          // 1. Update Internal State (Keep existing logic)
          if (extracted.fullName) {
            const parts = extracted.fullName.split(' ');
            currentProfile.first_name = parts[0];
            currentProfile.last_name = parts.slice(1).join(' ');
          }
          if (extracted.phone) currentProfile.phone = extracted.phone;
          // Handle both old 'skills' and new 'extractedSkills'
          const finalSkills = extracted.extractedSkills || extracted.skills || [];
          currentProfile.skills = finalSkills;

          if (extracted.qualification || extracted.education) currentProfile.qualification = extracted.qualification || extracted.education;

          // 2. ðŸ”¥ POPULATE FORM FIELDS DIRECTLY ðŸ”¥
          const form = document.getElementById('quickProfileForm');
          if (form) {
            // Name
            if (extracted.fullName) {
              const parts = extracted.fullName.split(' ');
              if (form.firstName) form.firstName.value = parts[0] || '';
              if (form.lastName) form.lastName.value = parts.slice(1).join(' ') || '';
            }

            // Contact
            if (extracted.email && form.email) form.email.value = extracted.email;
            if (extracted.phone && form.phone) form.phone.value = extracted.phone;

            // Skills (Array -> String)
            if (finalSkills && form.skills) {
              form.skills.value = Array.isArray(finalSkills)
                ? finalSkills.join(', ')
                : finalSkills;
            }

            // Experience
            // Use experienceYears if available, otherwise 0
            const expYears = extracted.experienceYears || extracted.experience || 0;
            if (form.experience) form.experience.value = typeof expYears === 'number' ? expYears : (parseInt(expYears) || 0);

            // Education (Try matching by string)
            const edu = extracted.educationLevel || extracted.qualification || extracted.education;
            if (edu && form.education) form.education.value = edu;

            // Attempt to set location if present
            if (extracted.location && form.location) form.location.value = extracted.location;
          }

          // Simple approach: Alert user validation
          alert("âœ… Resume Analyzed! Fields have been updated. Please verify.");
          this.displayData();

        } else {
          alert("âŒ AI Parsing Failed: " + (data.error || "Unknown error"));
        }
      })
      .catch(err => {
        console.error("Resume Analysis Error:", err);
        alert("âŒ Network Error: Could not connect to backend.");
      })
      .finally(() => {
        if (btn) btn.disabled = false;
        if (loading) loading.style.display = 'none';
      });
  }
};

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
  const email = document.getElementById('landingLoginEmail').value;
  const password = document.getElementById('landingLoginPassword').value;
  const rememberMe = document.getElementById('rememberMe').checked;

  try {
    // Set persistence based on checkbox
    await auth.setPersistence(rememberMe ? firebase.auth.Auth.Persistence.LOCAL : firebase.auth.Auth.Persistence.SESSION);
    await auth.signInWithEmailAndPassword(email, password);

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
    alert(error.message);
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

// ===== DEMO MODE (Skip Login) =====
function enterDemoMode() {
  // Set demo user as logged in without Firebase
  const demoUser = {
    uid: 'demo-user-' + Date.now(),
    email: 'demo@example.com',
    displayName: 'Demo User'
  };

  // Save to session
  sessionStorage.setItem('demoMode', 'true');
  sessionStorage.setItem('demoUser', JSON.stringify(demoUser));

  // Simulate auth state change
  updateViewForAuth(demoUser);
  updateAuthUI('Demo User');

  // Show main app
  const landingView = document.getElementById('auth-landing-view');
  const mainView = document.getElementById('main-app-view');

  if (landingView) landingView.style.display = 'none';
  if (mainView) {
    mainView.style.display = 'grid';
    mainView.scrollIntoView({ behavior: 'smooth' });
  }

  // Show profile section
  Profile.show({
    first_name: 'Demo',
    last_name: 'User',
    email: 'demo@example.com'
  });

  console.log('âœ… Demo mode activated - Explore internships freely!');
}

// SINGLE CLEAN AUTH LISTENER
auth.onAuthStateChanged(async user => {
  if (user) {
    console.log('âœ… Logged in:', user.email);
    updateViewForAuth(user);
    updateAuthUI(user.displayName || user.email || 'User'); // Pass string, not object

    // Fetch Profile
    try {
      const res = await fetch(`${API_BASE}/students/${user.uid}`);
      const data = await res.json();
      if (data.success && data.data) {
        Profile.show(data.data);
        // Update name if profile has it
        const fullName = (data.data.first_name || data.data.name) + ' ' + (data.data.last_name || '');
        updateAuthUI(fullName.trim() || user.email);
      } else {
        Profile.show({ first_name: user.email.split('@')[0], email: user.email });
      }
    } catch (e) {
      console.error(e);
      Profile.show({ first_name: user.email.split('@')[0], email: user.email });
    }

    fetchNotifications();
  } else {
    console.log('ðŸ‘‹ Logged out');
    updateViewForAuth(null);
    Profile.hide();
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
  console.log('ðŸ”„ updateAuthUI called with:', userName);
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

async function handleLogin(event) {
  event.preventDefault();
  const emailEl = document.getElementById('loginEmail');
  const passEl = document.getElementById('loginPassword');
  if (!emailEl || !passEl) return;

  const email = emailEl.value.trim();
  const password = passEl.value;



  showLoginMessage('Login successful!');

  try {
    const result = await auth.signInWithEmailAndPassword(email, password);
    const user = result.user;
    const snap = await db.ref('users/' + user.uid).once('value');

    if (!snap.exists()) {
      auth.signOut();
      showLoginMessage('Account not found in PM Internship portal.', 'error');
      return;
    }

    updateAuthUI(snap.val().name || email);
    showLoginMessage('Logged in successfully!', 'success');
    setTimeout(closeAuthModal, 1000);

    showLoginMessage('Login successful!', 'success');
    updateAuthUI(user.displayName || user.email);
    clearAllForms();  // â† ADD THIS LINE
    setTimeout(closeAuthModal, 1000);
  } catch (err) {
    showLoginMessage(mapFirebaseError(err.code), 'error');
  }
}

async function handleRegister(event) {
  event.preventDefault();
  const nameEl = document.getElementById('registerName');
  const emailEl = document.getElementById('registerEmail');
  const passEl = document.getElementById('registerPassword');
  if (!nameEl || !emailEl || !passEl) return;

  const name = nameEl.value.trim();
  const email = emailEl.value.trim();
  const password = passEl.value;

  showRegisterMessage('');

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






function googleLogin() {
  const provider = new firebase.auth.GoogleAuthProvider();

  auth.signInWithPopup(provider)
    .then((result) => {
      const user = result.user;
      return db.ref('users/' + user.uid).once('value');
    })
    .then((snap) => {
      if (!snap.exists()) {
        const user = auth.currentUser;
        return db.ref('users/' + user.uid).set({
          name: user.displayName || '',
          email: user.email,
          createdAt: new Date().toISOString()
        });
      }
    })
    .then(() => {
      const user = auth.currentUser;
      updateAuthUI(user.displayName || user.email);
      closeAuthModal();
    })
    .catch((error) => {
      console.error('Google login error:', error);

    });
}

async function saveUserProfile(name, email, skills, location) {
  const uid = auth.currentUser.uid;  // Get Firebase UID

  try {
    const response = await fetch(API_BASE + '/student/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uid,  // â† Send Firebase UID
        name,
        email,
        phone: '9876543210',  // from form
        age: 21,  // from form
        qualification: 'B.Tech CS',  // from form
        skills: ['JavaScript', 'React'],  // from form
        preferredSector: 'Technology',
        preferredState: 'Andhra Pradesh'
      })
    });
    const data = await response.json();
    console.log('Profile saved:', data);
  } catch (error) {
    console.error('Error saving profile:', error);
  }
}


function togglePassword(inputId, el) {
  const input = document.getElementById(inputId);
  if (!input || !el) return;
  if (input.type === 'password') {
    input.type = 'text';
    el.textContent = 'Hide password';
  } else {
    input.type = 'password';
    el.textContent = 'Show password';
  }
}

// Auth state listener
/*
auth.onAuthStateChanged((user) => {
  if (user) {
    db.ref('users/' + user.uid).once('value').then((snap) => {
      if (snap.exists()) {
        updateAuthUI(snap.val().name || user.email);
      }
    });
  } else {
    updateAuthUI(null);
  }
});
*/

// Close modal on outside click
window.addEventListener('click', (e) => {
  if (e.target.id === 'authModal') {
    closeAuthModal();
  }
});


// ========== END AUTHENTICATION CODE ==========



function switchAuthForm(mode) {
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const title = document.getElementById('authTitle');

  if (mode === 'login') {
    loginForm.style.display = 'block';
    registerForm.style.display = 'none';
    title.textContent = 'Login to your account';
  } else {
    loginForm.style.display = 'none';
    registerForm.style.display = 'block';
    title.textContent = 'Create your account';
  }
}

function showAuthMessage(text, type = '') {
  const box = document.getElementById('authMessage');
  if (!box) return;
  box.textContent = text;
  box.className = 'auth-message';
  if (type) box.classList.add(type);
}

function mapFirebaseError(code) {
  switch (code) {
    case 'auth/user-not-found':
      return 'No account found with this email.';
    case 'auth/wrong-password':
      return 'Incorrect password. Please try again.';
    case 'auth/email-already-in-use':
      return 'This email is already registered.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters.';
    default:
      return 'Something went wrong. Please try again.';
  }
}

async function handleRegister(event) {
  event.preventDefault();

  const name = document.getElementById('registerName').value.trim();
  const email = document.getElementById('registerEmail').value.trim();
  const password = document.getElementById('registerPassword').value;

  showRegisterMessage('');

  try {
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    const user = userCredential.user;

    await firebase.database().ref('users/' + user.uid).set({
      name,
      email,
      createdAt: new Date().toISOString()
    });

    showRegisterMessage('Account created! Logging inâ€¦', 'success');
    setTimeout(() => {
      updateAuthUI(name || email);
      closeAuthModal();
    }, 800);
  } catch (err) {
    showRegisterMessage(mapFirebaseError(err.code), 'error');
  }
}


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
    const snap = await db.ref('users/' + user.uid).once('value');

    if (!snap.exists()) {
      auth.signOut();
      showLoginMessage('Account not found in PM Internship portal.', 'error');
      return;
    }

    // SINGLE SUCCESS BLOCK - CORRECTED
    updateAuthUI(snap.val().name || email);
    showLoginMessage('Login successful!', 'success');
    clearAllForms();  // âœ… ADDED HERE
    setTimeout(closeAuthModal, 1000);

  } catch (err) {
    showLoginMessage(mapFirebaseError(err.code), 'error');
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

    const res = await fetch(`${API_BASE} /auth/login`, {
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

      alert('âœ… Login successful!');
      closeAuthModal();
      updateAuthUI(user.displayName || email);
    } else {
      alert('âŒ ' + json.error);
    }

  } catch (error) {
    console.error('Login error:', error);
    alert('âŒ ' + error.message);
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
async function getAIRecommendations() {
  const loading = document.getElementById('aiLoading');
  const section = document.getElementById('aiResultsSection');

  // Basic validation check (ensure user is logged in/has profile loaded)
  if (!currentProfile) {
    alert("Please login to get personalized AI recommendations.");
    openLoginModal();
    return;
  }

  try {
    loading.style.display = 'block';
    section.style.display = 'none';
    section.innerHTML = '<h3 style="width: 100%; text-align: center; margin-bottom: 20px;">ðŸ¤– AI Matched for You</h3>';

    const response = await fetch(`${API_BASE}/recommendations/ai-recommendations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...currentProfile,
        skills: currentProfile.skills || [] // Ensure skills is array
      })
    });

    const data = await response.json();

    if (data.success) {
      if (data.recommendations.length === 0) {
        alert("AI couldn't find matches. Try updating your profile skills.");
      } else {
        data.recommendations.forEach(rec => {
          const card = document.createElement('div');
          card.className = 'internship-card ai-card';
          card.style.border = '2px solid #6a11cb';
          card.innerHTML = `
  < div class="card-header" >
              <div class="company-icon">${rec.company[0]}</div>
              <div>
                <h3>${rec.role}</h3>
                <p>${rec.company}</p>
              </div>
            </div >
  <div class="card-body">
    <div class="info-row"><i class="fas fa-map-marker-alt"></i> ${rec.location}</div>
    <div class="info-row"><i class="fas fa-money-bill-wave"></i> â‚¹${rec.stipend}/mo</div>
    <div class="info-row"><i class="fas fa-clock"></i> ${rec.duration}</div>
    <div class="card-footer">
      <button class="btn btn-outline" onclick="viewDetails(${rec.id})">View Details</button>
      <button class="btn btn-primary" onclick="applyNow(${rec.id})">Apply Now</button>
    </div>
    <!-- AI Explanation Section -->
    <div style="background: #f0f7ff; border-top: 1px solid #cce5ff; padding: 10px 15px; font-size: 0.9em; color: #004085; border-radius: 0 0 8px 8px;">
      <strong>ðŸ’¡ Why this matches you:</strong>
      <p style="margin: 5px 0 0 0; line-height: 1.4;">${rec.aiExplanation}</p>
    </div>
    `;
          section.appendChild(card);
        });
        section.style.display = 'grid';
      }
    } else {
      if (data.error.includes("Missing API Key")) {
        alert("AI Service Not Configured: Missing API Key in Backend.");
      } else {
        alert("AI Error: " + (data.message || data.error));
      }
    }

  } catch (error) {
    console.error("AI Fetch Error:", error);
    alert("Failed to connect to AI service.");
  } finally {
    loading.style.display = 'none';
  }
}

// Check if user is already logged in on page load
/*
auth.onAuthStateChanged((user) => {
  if (user) {
      // User is logged in â†’ fetch name, then show logout
      firebase.database().ref('users/' + user.uid).once('value', (snapshot) => {
        const data = snapshot.val() || {};
        const nameOrEmail = data.name || user.email;
        updateAuthUI(nameOrEmail);
      });
  } else {
      // No user logged in â†’ show login/register
      updateAuthUI(null);
  }
});
    */



// Note: internships array is declared later in the file

// Load internships from backend API (now using pagination)
// Note: This function is redefined later with the actual implementation


// Fetch internships with server-side filtering and pagination
async function fetchInternshipsWithFilters(location = '', skills = []) {
  try {
    // Update state
    paginationState.userLocation = location;
    paginationState.userSkills = Array.isArray(skills) ? skills : (skills ? skills.split(',').map(s => s.trim()) : []);

    const queryParams = new URLSearchParams({
      page: paginationState.currentPage,
      limit: paginationState.itemsPerPage
    });

    if (location && location !== 'All') queryParams.append('location', location);
    if (skills && skills.length > 0) queryParams.append('skills', skills.toString());

    // Show loading
    const browseContainer = document.getElementById('browseInternshipsList');
    if (browseContainer) browseContainer.innerHTML = '<p style="text-align: center; padding: 20px;">Loading internships...</p>';

    const recContainer = document.getElementById('recommendationCards');
    if (recContainer) recContainer.innerHTML = '<p style="text-align: center; padding: 20px;">Finding best matches...</p>';

    // Call API
    const res = await fetch(`${API_BASE}/internships/filter?${queryParams}`);
    const json = await res.json();

    if (json.success) {
      internships = json.data; // Update local cache with current page
      paginationState.filteredInternships = json.data;

      if (typeof internships !== 'undefined') {
        internships = json.data;
      }

      // Update pagination state from server response
      if (json.pagination) {
        paginationState.totalCount = json.pagination.total;
        paginationState.totalPages = json.pagination.totalPages;
        paginationState.currentPage = json.pagination.page;
      }

      console.log(`âœ… Loaded ${internships.length} internships (Page ${paginationState.currentPage} of ${paginationState.totalPages})`);

      // Display results in appropriate containers
      displayInternshipsWithPagination(internships);
      setupPaginationControls();
    } else {
      console.error('âŒ Failed to load internships:', json.error);
      alert('Failed to load internships: ' + json.error);
    }
  } catch (error) {
    console.error('âŒ Error fetching internships:', error);
    const container = document.getElementById('browseInternshipsList');
    if (container) container.innerHTML = '<p style="text-align: center; color: red;">Error connecting to server.</p>';
  }
}

// Setup Pagination UI
function setupPaginationControls() {
  const container = document.getElementById('paginationControls') || createPaginationContainer();

  if (!container) return;

  container.innerHTML = `
    <div style="display: flex; gap: 10px; align-items: center; justify-content: center; margin-top: 20px;">
      <button class="btn btn-outline" ${paginationState.currentPage === 1 ? 'disabled' : ''} onclick="changePage(${paginationState.currentPage - 1})">
        Previous
      </button>
      <span>Page ${paginationState.currentPage} of ${paginationState.totalPages}</span>
      <button class="btn btn-outline" ${paginationState.currentPage >= paginationState.totalPages ? 'disabled' : ''} onclick="changePage(${paginationState.currentPage + 1})">
        Next
      </button>
    </div>
  `;
}

function createPaginationContainer() {
  const browseList = document.getElementById('browseInternshipsList');
  if (browseList && browseList.parentNode) {
    let div = document.createElement('div');
    div.id = 'paginationControls';
    browseList.parentNode.insertBefore(div, browseList.nextSibling);
    return div;
  }
  return null;
}

// Global function for onclick
window.changePage = function (newPage) {
  if (newPage < 1 || newPage > paginationState.totalPages) return;
  paginationState.currentPage = newPage;
  fetchInternshipsWithFilters(paginationState.userLocation, paginationState.userSkills);
  // Scroll to top of list
  const list = document.getElementById('browseInternshipsList');
  if (list) list.scrollIntoView({ behavior: 'smooth' });
};



// Multi-language translations
const translations = {
  en: {
    "nav-title": "Internship Recommendation Platform",
    "nav-home": "Home",
    "nav-about": "About",
    "nav-find": "Find Internships",
    "nav-browse": "Browse All",
    "nav-contact": "Contact",
    "btn-login": "Login",
    "btn-register": "Register",
    "hero-title": "Internship Recommendation Platform",
    "hero-subtitle": "Empowering India's Youth with Real-World Experience and Career Opportunities",
    "hero-description": "Providing valuable opportunities for youth across India, including those from rural areas, tribal districts, and underserved communities to gain practical work experience.",
    "btn-find-now": "Find Internships Now",
    "feature-internships": "Internships",
    "feature-internships-sub": "Over 5 years",
    "feature-stipend": "Monthly Stipend",
    "feature-stipend-sub": "Plus â‚¹6,000 one-time grant",
    "feature-sectors": "Sectors",
    "feature-sectors-sub": "Covered across India",
    "feature-duration": "Months Duration",
    "feature-duration-sub": "Full-time internship",
    "overview-title": "About the Scheme",
    "overview-text": "The Internship Recommendation Platform is a landmark initiative by the Government of India to provide practical work experience to youth from diverse backgrounds. This program bridges the gap between education and employment, offering hands-on training in top companies across various sectors.",
    "about-title": "About Internship Recommendation Platform",
    "about-background-title": "Background & Objectives",
    "about-background-text": "The Internship Recommendation Platform was launched to address the employability gap among Indian youth. It aims to provide practical work experience, enhance skills, and improve the career prospects of young graduates across the country, with special focus on rural, tribal, and underserved communities.",
    "about-eligibility-title": "Eligibility Criteria",
    "about-eligibility-1": "Age: 21-24 years",
    "about-eligibility-2": "Education: Bachelor's degree or Diploma in relevant field",
    "about-eligibility-3": "Family income: Up to â‚¹8 lakh per annum",
    "about-eligibility-4": "Indian citizen with valid Aadhaar card",
    "about-eligibility-5": "Not currently employed or enrolled in full-time education",
    "about-benefits-title": "Benefits",
    "about-benefits-1": "Monthly stipend of â‚¹5,000",
    "about-benefits-2": "One-time assistance of â‚¹6,000",
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
    "faq-q1": "Who is eligible for the PM Internship Scheme?",
    "faq-a1": "Youth between 21-24 years with a Bachelor's degree or Diploma, and family income up to â‚¹8 lakh per annum.",
    "faq-q2": "What is the stipend amount?",
    "faq-a2": "â‚¹5,000 per month plus a one-time assistance of â‚¹6,000.",
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
    "nav-title": "à¤ªà¥à¤°à¤§à¤¾à¤¨à¤®à¤‚à¤¤à¥à¤°à¥€ à¤‡à¤‚à¤Ÿà¤°à¥à¤¨à¤¶à¤¿à¤ª à¤¯à¥‹à¤œà¤¨à¤¾",
    "nav-home": "à¤¹à¥‹à¤®",
    "nav-about": "à¤•à¥‡ à¤¬à¤¾à¤°à¥‡ à¤®à¥‡à¤‚",
    "nav-find": "à¤‡à¤‚à¤Ÿà¤°à¥à¤¨à¤¶à¤¿à¤ª à¤–à¥‹à¤œà¥‡à¤‚",
    "nav-browse": "à¤¸à¤­à¥€ à¤¦à¥‡à¤–à¥‡à¤‚",
    "nav-contact": "à¤¸à¤‚à¤ªà¤°à¥à¤• à¤•à¤°à¥‡à¤‚",
    "btn-login": "à¤²à¥‰à¤—à¤¿à¤¨",
    "btn-register": "à¤°à¤œà¤¿à¤¸à¥à¤Ÿà¤°",
    "hero-title": "à¤ªà¥à¤°à¤§à¤¾à¤¨à¤®à¤‚à¤¤à¥à¤°à¥€ à¤‡à¤‚à¤Ÿà¤°à¥à¤¨à¤¶à¤¿à¤ª à¤¯à¥‹à¤œà¤¨à¤¾",
    "hero-subtitle": "à¤­à¤¾à¤°à¤¤ à¤•à¥‡ à¤¯à¥à¤µà¤¾à¤“à¤‚ à¤•à¥‹ à¤µà¤¾à¤¸à¥à¤¤à¤µà¤¿à¤• à¤…à¤¨à¥à¤­à¤µ à¤”à¤° à¤•à¤°à¤¿à¤¯à¤° à¤•à¥‡ à¤…à¤µà¤¸à¤° à¤ªà¥à¤°à¤¦à¤¾à¤¨ à¤•à¤°à¤¨à¤¾",
    "hero-description": "à¤—à¥à¤°à¤¾à¤®à¥€à¤£ à¤•à¥à¤·à¥‡à¤¤à¥à¤°à¥‹à¤‚, à¤†à¤¦à¤¿à¤µà¤¾à¤¸à¥€ à¤œà¤¿à¤²à¥‹à¤‚ à¤”à¤° à¤µà¤‚à¤šà¤¿à¤¤ à¤¸à¤®à¥à¤¦à¤¾à¤¯à¥‹à¤‚ à¤¸à¤¹à¤¿à¤¤ à¤ªà¥‚à¤°à¥‡ à¤­à¤¾à¤°à¤¤ à¤®à¥‡à¤‚ à¤¯à¥à¤µà¤¾à¤“à¤‚ à¤•à¥‹ à¤µà¥à¤¯à¤¾à¤µà¤¹à¤¾à¤°à¤¿à¤• à¤•à¤¾à¤°à¥à¤¯ à¤…à¤¨à¥à¤­à¤µ à¤ªà¥à¤°à¤¾à¤ªà¥à¤¤ à¤•à¤°à¤¨à¥‡ à¤•à¥‡ à¤²à¤¿à¤ à¤®à¥‚à¤²à¥à¤¯à¤µà¤¾à¤¨ à¤…à¤µà¤¸à¤° à¤ªà¥à¤°à¤¦à¤¾à¤¨ à¤•à¤°à¤¨à¤¾à¥¤",
    "btn-find-now": "à¤…à¤­à¥€ à¤‡à¤‚à¤Ÿà¤°à¥à¤¨à¤¶à¤¿à¤ª à¤–à¥‹à¤œà¥‡à¤‚",
    "feature-internships": "à¤‡à¤‚à¤Ÿà¤°à¥à¤¨à¤¶à¤¿à¤ª",
    "feature-internships-sub": "5 à¤µà¤°à¥à¤·à¥‹à¤‚ à¤®à¥‡à¤‚",
    "feature-stipend": "à¤®à¤¾à¤¸à¤¿à¤• à¤µà¥‡à¤¤à¤¨",
    "feature-stipend-sub": "à¤ªà¥à¤²à¤¸ â‚¹6,000 à¤à¤•à¤®à¥à¤¶à¥à¤¤ à¤…à¤¨à¥à¤¦à¤¾à¤¨",
    "feature-sectors": "à¤•à¥à¤·à¥‡à¤¤à¥à¤°",
    "feature-sectors-sub": "à¤ªà¥‚à¤°à¥‡ à¤­à¤¾à¤°à¤¤ à¤®à¥‡à¤‚",
    "feature-duration": "à¤®à¤¹à¥€à¤¨à¥‡ à¤•à¥€ à¤…à¤µà¤§à¤¿",
    "feature-duration-sub": "à¤ªà¥‚à¤°à¥à¤£à¤•à¤¾à¤²à¤¿à¤• à¤‡à¤‚à¤Ÿà¤°à¥à¤¨à¤¶à¤¿à¤ª",
    "overview-title": "à¤¯à¥‹à¤œà¤¨à¤¾ à¤•à¥‡ à¤¬à¤¾à¤°à¥‡ à¤®à¥‡à¤‚",
    "overview-text": "à¤ªà¥à¤°à¤§à¤¾à¤¨à¤®à¤‚à¤¤à¥à¤°à¥€ à¤‡à¤‚à¤Ÿà¤°à¥à¤¨à¤¶à¤¿à¤ª à¤¯à¥‹à¤œà¤¨à¤¾ à¤µà¤¿à¤µà¤¿à¤§ à¤ªà¥ƒà¤·à¥à¤ à¤­à¥‚à¤®à¤¿ à¤•à¥‡ à¤¯à¥à¤µà¤¾à¤“à¤‚ à¤•à¥‹ à¤µà¥à¤¯à¤¾à¤µà¤¹à¤¾à¤°à¤¿à¤• à¤•à¤¾à¤°à¥à¤¯ à¤…à¤¨à¥à¤­à¤µ à¤ªà¥à¤°à¤¦à¤¾à¤¨ à¤•à¤°à¤¨à¥‡ à¤•à¥‡ à¤²à¤¿à¤ à¤­à¤¾à¤°à¤¤ à¤¸à¤°à¤•à¤¾à¤° à¤•à¥€ à¤à¤• à¤à¤¤à¤¿à¤¹à¤¾à¤¸à¤¿à¤• à¤ªà¤¹à¤² à¤¹à¥ˆà¥¤ à¤¯à¤¹ à¤•à¤¾à¤°à¥à¤¯à¤•à¥à¤°à¤® à¤¶à¤¿à¤•à¥à¤·à¤¾ à¤”à¤° à¤°à¥‹à¤œà¤—à¤¾à¤° à¤•à¥‡ à¤¬à¥€à¤š à¤•à¥€ à¤–à¤¾à¤ˆ à¤•à¥‹ à¤ªà¤¾à¤Ÿà¤¤à¤¾ à¤¹à¥ˆà¥¤",
    "about-title": "à¤ªà¥à¤°à¤§à¤¾à¤¨à¤®à¤‚à¤¤à¥à¤°à¥€ à¤‡à¤‚à¤Ÿà¤°à¥à¤¨à¤¶à¤¿à¤ª à¤¯à¥‹à¤œà¤¨à¤¾ à¤•à¥‡ à¤¬à¤¾à¤°à¥‡ à¤®à¥‡à¤‚",
    "about-background-title": "à¤ªà¥ƒà¤·à¥à¤ à¤­à¥‚à¤®à¤¿ à¤”à¤° à¤‰à¤¦à¥à¤¦à¥‡à¤¶à¥à¤¯",
    "about-background-text": "à¤ªà¥à¤°à¤§à¤¾à¤¨à¤®à¤‚à¤¤à¥à¤°à¥€ à¤‡à¤‚à¤Ÿà¤°à¥à¤¨à¤¶à¤¿à¤ª à¤¯à¥‹à¤œà¤¨à¤¾ à¤­à¤¾à¤°à¤¤à¥€à¤¯ à¤¯à¥à¤µà¤¾à¤“à¤‚ à¤•à¥‡ à¤¬à¥€à¤š à¤°à¥‹à¤œà¤—à¤¾à¤° à¤…à¤‚à¤¤à¤° à¤•à¥‹ à¤¦à¥‚à¤° à¤•à¤°à¤¨à¥‡ à¤•à¥‡ à¤²à¤¿à¤ à¤¶à¥à¤°à¥‚ à¤•à¥€ à¤—à¤ˆ à¤¥à¥€à¥¤ à¤‡à¤¸à¤•à¤¾ à¤‰à¤¦à¥à¤¦à¥‡à¤¶à¥à¤¯ à¤µà¥à¤¯à¤¾à¤µà¤¹à¤¾à¤°à¤¿à¤• à¤•à¤¾à¤°à¥à¤¯ à¤…à¤¨à¥à¤­à¤µ à¤ªà¥à¤°à¤¦à¤¾à¤¨ à¤•à¤°à¤¨à¤¾, à¤•à¥Œà¤¶à¤² à¤¬à¤¢à¤¼à¤¾à¤¨à¤¾ à¤”à¤° à¤¦à¥‡à¤¶ à¤­à¤° à¤•à¥‡ à¤¯à¥à¤µà¤¾ à¤¸à¥à¤¨à¤¾à¤¤à¤•à¥‹à¤‚ à¤•à¥€ à¤•à¤°à¤¿à¤¯à¤° à¤¸à¤‚à¤­à¤¾à¤µà¤¨à¤¾à¤“à¤‚ à¤®à¥‡à¤‚ à¤¸à¥à¤§à¤¾à¤° à¤•à¤°à¤¨à¤¾ à¤¹à¥ˆà¥¤",
    "about-eligibility-title": "à¤ªà¤¾à¤¤à¥à¤°à¤¤à¤¾ à¤®à¤¾à¤¨à¤¦à¤‚à¤¡",
    "about-eligibility-1": "à¤†à¤¯à¥: 21-24 à¤µà¤°à¥à¤·",
    "about-eligibility-2": "à¤¶à¤¿à¤•à¥à¤·à¤¾: à¤¸à¥à¤¨à¤¾à¤¤à¤• à¤•à¥€ à¤¡à¤¿à¤—à¥à¤°à¥€ à¤¯à¤¾ à¤ªà¥à¤°à¤¾à¤¸à¤‚à¤—à¤¿à¤• à¤•à¥à¤·à¥‡à¤¤à¥à¤° à¤®à¥‡à¤‚ à¤¡à¤¿à¤ªà¥à¤²à¥‹à¤®à¤¾",
    "about-eligibility-3": "à¤ªà¤¾à¤°à¤¿à¤µà¤¾à¤°à¤¿à¤• à¤†à¤¯: à¤ªà¥à¤°à¤¤à¤¿ à¤µà¤°à¥à¤· â‚¹8 à¤²à¤¾à¤– à¤¤à¤•",
    "about-eligibility-4": "à¤µà¥ˆà¤§ à¤†à¤§à¤¾à¤° à¤•à¤¾à¤°à¥à¤¡ à¤•à¥‡ à¤¸à¤¾à¤¥ à¤­à¤¾à¤°à¤¤à¥€à¤¯ à¤¨à¤¾à¤—à¤°à¤¿à¤•",
    "about-eligibility-5": "à¤µà¤°à¥à¤¤à¤®à¤¾à¤¨ à¤®à¥‡à¤‚ à¤¨à¤¿à¤¯à¥‹à¤œà¤¿à¤¤ à¤¯à¤¾ à¤ªà¥‚à¤°à¥à¤£à¤•à¤¾à¤²à¤¿à¤• à¤¶à¤¿à¤•à¥à¤·à¤¾ à¤®à¥‡à¤‚ à¤¨à¤¾à¤®à¤¾à¤‚à¤•à¤¿à¤¤ à¤¨à¤¹à¥€à¤‚",
    "about-benefits-title": "à¤²à¤¾à¤­",
    "about-benefits-1": "â‚¹5,000 à¤•à¤¾ à¤®à¤¾à¤¸à¤¿à¤• à¤µà¥‡à¤¤à¤¨",
    "about-benefits-2": "â‚¹6,000 à¤•à¥€ à¤à¤•à¤®à¥à¤¶à¥à¤¤ à¤¸à¤¹à¤¾à¤¯à¤¤à¤¾",
    "about-benefits-3": "12 à¤®à¤¹à¥€à¤¨à¥‡ à¤•à¤¾ à¤µà¥à¤¯à¤¾à¤µà¤¹à¤¾à¤°à¤¿à¤• à¤•à¤¾à¤°à¥à¤¯ à¤…à¤¨à¥à¤­à¤µ",
    "about-benefits-4": "à¤…à¤—à¥à¤°à¤£à¥€ à¤•à¤‚à¤ªà¤¨à¤¿à¤¯à¥‹à¤‚ à¤•à¥‡ à¤¸à¤¾à¤¥ à¤‰à¤¦à¥à¤¯à¥‹à¤— à¤…à¤¨à¥à¤­à¤µ",
    "about-benefits-5": "à¤ªà¥‚à¤°à¥à¤£à¤¤à¤¾ à¤•à¤¾ à¤ªà¥à¤°à¤®à¤¾à¤£ à¤ªà¤¤à¥à¤°",
    "about-benefits-6": "à¤•à¥Œà¤¶à¤² à¤µà¤¿à¤•à¤¾à¤¸ à¤”à¤° à¤ªà¥à¤°à¤¶à¤¿à¤•à¥à¤·à¤£",
    "about-sectors-title": "à¤­à¤¾à¤— à¤²à¥‡à¤¨à¥‡ à¤µà¤¾à¤²à¥‡ à¤•à¥à¤·à¥‡à¤¤à¥à¤°",
    "find-title": "à¤‡à¤‚à¤Ÿà¤°à¥à¤¨à¤¶à¤¿à¤ª à¤–à¥‹à¤œà¥‡à¤‚",
    "search-placeholder": "à¤•à¤‚à¤ªà¤¨à¥€, à¤­à¥‚à¤®à¤¿à¤•à¤¾ à¤¯à¤¾ à¤¸à¥à¤¥à¤¾à¤¨ à¤¸à¥‡ à¤–à¥‹à¤œà¥‡à¤‚...",
    "btn-search": "à¤–à¥‹à¤œà¥‡à¤‚",
    "browse-title": "à¤¸à¤­à¥€ à¤‡à¤‚à¤Ÿà¤°à¥à¤¨à¤¶à¤¿à¤ª à¤¦à¥‡à¤–à¥‡à¤‚",
    "filter-sector": "à¤•à¥à¤·à¥‡à¤¤à¥à¤°:",
    "filter-location": "à¤¸à¥à¤¥à¤¾à¤¨:",
    "filter-all": "à¤¸à¤­à¥€",
    "btn-reset": "à¤«à¤¼à¤¿à¤²à¥à¤Ÿà¤° à¤°à¥€à¤¸à¥‡à¤Ÿ à¤•à¤°à¥‡à¤‚",
    "contact-title": "à¤¸à¤‚à¤ªà¤°à¥à¤• à¤•à¤°à¥‡à¤‚",
    "contact-helpline": "à¤¹à¥‡à¤²à¥à¤ªà¤²à¤¾à¤‡à¤¨ à¤¨à¤‚à¤¬à¤°",
    "contact-helpline-time": "à¤‰à¤ªà¤²à¤¬à¥à¤§: à¤¸à¥‹à¤®à¤µà¤¾à¤° à¤¸à¥‡ à¤¶à¥à¤•à¥à¤°à¤µà¤¾à¤°, à¤¸à¥à¤¬à¤¹ 9 à¤¬à¤œà¥‡ à¤¸à¥‡ à¤¶à¤¾à¤® 6 à¤¬à¤œà¥‡ IST",
    "contact-email-title": "à¤ˆà¤®à¥‡à¤² à¤¸à¤¹à¤¾à¤¯à¤¤à¤¾",
    "contact-faq-title": "à¤…à¤•à¥à¤¸à¤° à¤ªà¥‚à¤›à¥‡ à¤œà¤¾à¤¨à¥‡ à¤µà¤¾à¤²à¥‡ à¤ªà¥à¤°à¤¶à¥à¤¨",
    "faq-q1": "à¤ªà¥€à¤à¤® à¤‡à¤‚à¤Ÿà¤°à¥à¤¨à¤¶à¤¿à¤ª à¤¯à¥‹à¤œà¤¨à¤¾ à¤•à¥‡ à¤²à¤¿à¤ à¤•à¥Œà¤¨ à¤ªà¤¾à¤¤à¥à¤° à¤¹à¥ˆ?",
    "faq-a1": "21-24 à¤µà¤°à¥à¤· à¤•à¥‡ à¤¬à¥€à¤š à¤•à¥‡ à¤¯à¥à¤µà¤¾ à¤œà¤¿à¤¨à¤•à¥‡ à¤ªà¤¾à¤¸ à¤¸à¥à¤¨à¤¾à¤¤à¤• à¤•à¥€ à¤¡à¤¿à¤—à¥à¤°à¥€ à¤¯à¤¾ à¤¡à¤¿à¤ªà¥à¤²à¥‹à¤®à¤¾ à¤¹à¥ˆ à¤”à¤° à¤ªà¤¾à¤°à¤¿à¤µà¤¾à¤°à¤¿à¤• à¤†à¤¯ â‚¹8 à¤²à¤¾à¤– à¤ªà¥à¤°à¤¤à¤¿ à¤µà¤°à¥à¤· à¤¤à¤• à¤¹à¥ˆà¥¤",
    "faq-q2": "à¤µà¥‡à¤¤à¤¨ à¤•à¥€ à¤°à¤¾à¤¶à¤¿ à¤•à¥à¤¯à¤¾ à¤¹à¥ˆ?",
    "faq-a2": "â‚¹5,000 à¤ªà¥à¤°à¤¤à¤¿ à¤®à¤¾à¤¹ à¤ªà¥à¤²à¤¸ â‚¹6,000 à¤•à¥€ à¤à¤•à¤®à¥à¤¶à¥à¤¤ à¤¸à¤¹à¤¾à¤¯à¤¤à¤¾à¥¤",
    "faq-q3": "à¤‡à¤‚à¤Ÿà¤°à¥à¤¨à¤¶à¤¿à¤ª à¤•à¥€ à¤…à¤µà¤§à¤¿ à¤•à¤¿à¤¤à¤¨à¥€ à¤¹à¥ˆ?",
    "faq-a3": "à¤‡à¤‚à¤Ÿà¤°à¥à¤¨à¤¶à¤¿à¤ª à¤•à¥€ à¤…à¤µà¤§à¤¿ 12 à¤®à¤¹à¥€à¤¨à¥‡ (1 à¤µà¤°à¥à¤·) à¤¹à¥ˆà¥¤",
    "contact-form-title": "à¤¹à¤®à¥‡à¤‚ à¤à¤• à¤¸à¤‚à¤¦à¥‡à¤¶ à¤­à¥‡à¤œà¥‡à¤‚",
    "form-name": "à¤¨à¤¾à¤®:",
    "form-email": "à¤ˆà¤®à¥‡à¤²:",
    "form-message": "à¤¸à¤‚à¤¦à¥‡à¤¶:",
    "btn-submit": "à¤œà¤®à¤¾ à¤•à¤°à¥‡à¤‚",
    "btn-view-details": "à¤µà¤¿à¤µà¤°à¤£ à¤¦à¥‡à¤–à¥‡à¤‚",
    "btn-apply": "à¤…à¤­à¥€ à¤†à¤µà¥‡à¤¦à¤¨ à¤•à¤°à¥‡à¤‚",
    "modal-location": "à¤¸à¥à¤¥à¤¾à¤¨",
    "modal-sector": "à¤•à¥à¤·à¥‡à¤¤à¥à¤°",
    "modal-duration": "à¤…à¤µà¤§à¤¿",
    "modal-stipend": "à¤®à¤¾à¤¸à¤¿à¤• à¤µà¥‡à¤¤à¤¨",
    "modal-grant": "à¤à¤•à¤®à¥à¤¶à¥à¤¤ à¤…à¤¨à¥à¤¦à¤¾à¤¨",
    "modal-requirements": "à¤†à¤µà¤¶à¥à¤¯à¤•à¤¤à¤¾à¤à¤‚",
    "modal-skills": "à¤†à¤µà¤¶à¥à¤¯à¤• à¤•à¥Œà¤¶à¤²",
    "modal-description": "à¤µà¤¿à¤µà¤°à¤£"
  },
  ta: {
    "nav-title": "à®ªà®¿à®°à®¤à®® à®®à®¨à¯à®¤à®¿à®°à®¿ à®‡à®©à¯à®Ÿà®°à¯à®©à¯à®·à®¿à®ªà¯ à®¤à®¿à®Ÿà¯à®Ÿà®®à¯",
    "nav-home": "à®®à¯à®•à®ªà¯à®ªà¯",
    "nav-about": "à®ªà®±à¯à®±à®¿",
    "nav-find": "à®‡à®©à¯à®Ÿà®°à¯à®©à¯à®·à®¿à®ªà¯à®•à®³à¯ˆà®•à¯ à®•à®£à¯à®Ÿà®±à®¿à®¯à®µà¯à®®à¯",
    "nav-browse": "à®…à®©à¯ˆà®¤à¯à®¤à¯ˆà®¯à¯à®®à¯ à®ªà®¾à®°à¯à®•à¯à®•à®µà¯à®®à¯",
    "nav-contact": "à®¤à¯Šà®Ÿà®°à¯à®ªà¯",
    "btn-login": "à®‰à®³à¯à®¨à¯à®´à¯ˆà®¯",
    "btn-register": "à®ªà®¤à®¿à®µà¯",
    "hero-title": "à®ªà®¿à®°à®¤à®® à®®à®¨à¯à®¤à®¿à®°à®¿ à®‡à®©à¯à®Ÿà®°à¯à®©à¯à®·à®¿à®ªà¯ à®¤à®¿à®Ÿà¯à®Ÿà®®à¯",
    "hero-subtitle": "à®‡à®¨à¯à®¤à®¿à®¯à®¾à®µà®¿à®©à¯ à®‡à®³à¯ˆà®žà®°à¯à®•à®³à¯à®•à¯à®•à¯ à®¨à®Ÿà¯ˆà®®à¯à®±à¯ˆ à®…à®©à¯à®ªà®µà®®à¯ à®®à®±à¯à®±à¯à®®à¯ à®¤à¯Šà®´à®¿à®²à¯ à®µà®¾à®¯à¯à®ªà¯à®ªà¯à®•à®³à¯ˆ à®µà®´à®™à¯à®•à¯à®¤à®²à¯",
    "hero-description": "à®•à®¿à®°à®¾à®®à®ªà¯à®ªà¯à®± à®ªà®•à¯à®¤à®¿à®•à®³à¯, à®ªà®´à®™à¯à®•à¯à®Ÿà®¿ à®®à®¾à®µà®Ÿà¯à®Ÿà®™à¯à®•à®³à¯ à®®à®±à¯à®±à¯à®®à¯ à®šà¯‡à®µà¯ˆ à®šà¯†à®¯à¯à®¯à®ªà¯à®ªà®Ÿà®¾à®¤ à®šà®®à¯‚à®•à®™à¯à®•à®³à¯ˆ à®‰à®³à¯à®³à®Ÿà®•à¯à®•à®¿à®¯ à®‡à®¨à¯à®¤à®¿à®¯à®¾ à®®à¯à®´à¯à®µà®¤à¯à®®à¯ à®‰à®³à¯à®³ à®‡à®³à¯ˆà®žà®°à¯à®•à®³à¯à®•à¯à®•à¯ à®¨à®Ÿà¯ˆà®®à¯à®±à¯ˆ à®ªà®£à®¿ à®…à®©à¯à®ªà®µà®¤à¯à®¤à¯ˆà®ªà¯ à®ªà¯†à®± à®®à®¤à®¿à®ªà¯à®ªà¯à®®à®¿à®•à¯à®• à®µà®¾à®¯à¯à®ªà¯à®ªà¯à®•à®³à¯ˆ à®µà®´à®™à¯à®•à¯à®¤à®²à¯.",
    "btn-find-now": "à®‡à®ªà¯à®ªà¯‹à®¤à¯‡ à®‡à®©à¯à®Ÿà®°à¯à®©à¯à®·à®¿à®ªà¯à®•à®³à¯ˆà®•à¯ à®•à®£à¯à®Ÿà®±à®¿à®¯à®µà¯à®®à¯",
    "feature-internships": "à®‡à®©à¯à®Ÿà®°à¯à®©à¯à®·à®¿à®ªà¯à®•à®³à¯",
    "feature-internships-sub": "5 à®†à®£à¯à®Ÿà¯à®•à®³à®¿à®²à¯",
    "feature-stipend": "à®®à®¾à®¤à®¾à®¨à¯à®¤à®¿à®° à®‰à®¤à®µà®¿à®¤à¯à®¤à¯Šà®•à¯ˆ",
    "feature-stipend-sub": "à®•à¯‚à®Ÿà¯à®¤à®²à®¾à®• â‚¹6,000 à®’à®°à¯ à®®à¯à®±à¯ˆ à®®à®¾à®©à®¿à®¯à®®à¯",
    "feature-sectors": "à®¤à¯à®±à¯ˆà®•à®³à¯",
    "feature-sectors-sub": "à®‡à®¨à¯à®¤à®¿à®¯à®¾ à®®à¯à®´à¯à®µà®¤à¯à®®à¯",
    "feature-duration": "à®®à®¾à®¤à®™à¯à®•à®³à¯ à®•à®¾à®²à®®à¯",
    "feature-duration-sub": "à®®à¯à®´à¯à®¨à¯‡à®° à®‡à®©à¯à®Ÿà®°à¯à®©à¯à®·à®¿à®ªà¯",
    "overview-title": "à®¤à®¿à®Ÿà¯à®Ÿà®¤à¯à®¤à¯ˆà®ªà¯ à®ªà®±à¯à®±à®¿",
    "overview-text": "à®ªà®¿à®°à®¤à®® à®®à®¨à¯à®¤à®¿à®°à®¿ à®‡à®©à¯à®Ÿà®°à¯à®©à¯à®·à®¿à®ªà¯ à®¤à®¿à®Ÿà¯à®Ÿà®®à¯ à®ªà®²à¯à®µà¯‡à®±à¯ à®ªà®¿à®©à¯à®©à®£à®¿à®¯à¯ˆà®šà¯ à®šà¯‡à®°à¯à®¨à¯à®¤ à®‡à®³à¯ˆà®žà®°à¯à®•à®³à¯à®•à¯à®•à¯ à®¨à®Ÿà¯ˆà®®à¯à®±à¯ˆ à®ªà®£à®¿ à®…à®©à¯à®ªà®µà®¤à¯à®¤à¯ˆ à®µà®´à®™à¯à®• à®‡à®¨à¯à®¤à®¿à®¯ à®…à®°à®šà®¾à®™à¯à®•à®¤à¯à®¤à®¿à®©à¯ à®’à®°à¯ à®®à¯à®•à¯à®•à®¿à®¯ à®®à¯à®¯à®±à¯à®šà®¿à®¯à®¾à®•à¯à®®à¯. à®‡à®¨à¯à®¤ à®¤à®¿à®Ÿà¯à®Ÿà®®à¯ à®•à®²à¯à®µà®¿ à®®à®±à¯à®±à¯à®®à¯ à®µà¯‡à®²à¯ˆà®µà®¾à®¯à¯à®ªà¯à®ªà¯à®•à¯à®•à¯ à®‡à®Ÿà¯ˆà®¯à¯‡ à®‰à®³à¯à®³ à®‡à®Ÿà¯ˆà®µà¯†à®³à®¿à®¯à¯ˆ à®¨à®¿à®°à®ªà¯à®ªà¯à®•à®¿à®±à®¤à¯.",
    "about-title": "à®ªà®¿à®°à®¤à®® à®®à®¨à¯à®¤à®¿à®°à®¿ à®‡à®©à¯à®Ÿà®°à¯à®©à¯à®·à®¿à®ªà¯ à®¤à®¿à®Ÿà¯à®Ÿà®¤à¯à®¤à¯ˆà®ªà¯ à®ªà®±à¯à®±à®¿",
    "about-background-title": "à®ªà®¿à®©à¯à®©à®£à®¿ à®®à®±à¯à®±à¯à®®à¯ à®¨à¯‹à®•à¯à®•à®™à¯à®•à®³à¯",
    "about-background-text": "à®‡à®¨à¯à®¤à®¿à®¯ à®‡à®³à¯ˆà®žà®°à¯à®•à®³à®¿à®Ÿà¯ˆà®¯à¯‡ à®µà¯‡à®²à¯ˆà®µà®¾à®¯à¯à®ªà¯à®ªà¯ à®‡à®Ÿà¯ˆà®µà¯†à®³à®¿à®¯à¯ˆ à®¨à®¿à®µà®°à¯à®¤à¯à®¤à®¿ à®šà¯†à®¯à¯à®¯ à®ªà®¿à®°à®¤à®® à®®à®¨à¯à®¤à®¿à®°à®¿ à®‡à®©à¯à®Ÿà®°à¯à®©à¯à®·à®¿à®ªà¯ à®¤à®¿à®Ÿà¯à®Ÿà®®à¯ à®¤à¯Šà®Ÿà®™à¯à®•à®ªà¯à®ªà®Ÿà¯à®Ÿà®¤à¯. à®‡à®¤à¯ à®¨à®Ÿà¯ˆà®®à¯à®±à¯ˆ à®ªà®£à®¿ à®…à®©à¯à®ªà®µà®¤à¯à®¤à¯ˆ à®µà®´à®™à¯à®•à¯à®µà®¤à¯ˆà®¯à¯à®®à¯, à®¤à®¿à®±à®©à¯à®•à®³à¯ˆ à®®à¯‡à®®à¯à®ªà®Ÿà¯à®¤à¯à®¤à¯à®µà®¤à¯ˆà®¯à¯à®®à¯, à®¨à®¾à®Ÿà¯ à®®à¯à®´à¯à®µà®¤à¯à®®à¯ à®‰à®³à¯à®³ à®‡à®³à®®à¯ à®ªà®Ÿà¯à®Ÿà®¤à®¾à®°à®¿à®•à®³à®¿à®©à¯ à®¤à¯Šà®´à®¿à®²à¯ à®µà®¾à®¯à¯à®ªà¯à®ªà¯à®•à®³à¯ˆ à®®à¯‡à®®à¯à®ªà®Ÿà¯à®¤à¯à®¤à¯à®µà®¤à¯ˆà®¯à¯à®®à¯ à®¨à¯‹à®•à¯à®•à®®à®¾à®•à®•à¯ à®•à¯Šà®£à¯à®Ÿà¯à®³à¯à®³à®¤à¯.",
    "about-eligibility-title": "à®¤à®•à¯à®¤à®¿ à®µà®¿à®¤à®¿à®•à®³à¯",
    "about-eligibility-1": "à®µà®¯à®¤à¯: 21-24 à®µà®¯à®¤à¯",
    "about-eligibility-2": "à®•à®²à¯à®µà®¿: à®ªà®Ÿà¯à®Ÿà®ªà¯à®ªà®Ÿà®¿à®ªà¯à®ªà¯ à®…à®²à¯à®²à®¤à¯ à®¤à¯Šà®Ÿà®°à¯à®ªà¯à®Ÿà¯ˆà®¯ à®¤à¯à®±à¯ˆà®¯à®¿à®²à¯ à®Ÿà®¿à®ªà¯à®³à¯‹à®®à®¾",
    "about-eligibility-3": "à®•à¯à®Ÿà¯à®®à¯à®ª à®µà®°à¯à®®à®¾à®©à®®à¯: à®†à®£à¯à®Ÿà¯à®•à¯à®•à¯ â‚¹8 à®²à®Ÿà¯à®šà®®à¯ à®µà®°à¯ˆ",
    "about-eligibility-4": "à®šà®°à®¿à®¯à®¾à®© à®†à®¤à®¾à®°à¯ à®…à®Ÿà¯à®Ÿà¯ˆà®¯à¯à®Ÿà®©à¯ à®‡à®¨à¯à®¤à®¿à®¯ à®•à¯à®Ÿà®¿à®®à®•à®©à¯",
    "about-eligibility-5": "à®¤à®±à¯à®ªà¯‹à®¤à¯ à®µà¯‡à®²à¯ˆà®¯à®¿à®²à¯ à®‡à®²à¯à®²à®¾à®¤à®µà®°à¯ à®…à®²à¯à®²à®¤à¯ à®®à¯à®´à¯à®¨à¯‡à®° à®•à®²à¯à®µà®¿à®¯à®¿à®²à¯ à®ªà®¤à®¿à®µà¯ à®šà¯†à®¯à¯à®¯à®ªà¯à®ªà®Ÿà®¾à®¤à®µà®°à¯",
    "about-benefits-title": "à®ªà®²à®©à¯à®•à®³à¯",
    "about-benefits-1": "â‚¹5,000 à®®à®¾à®¤à®¾à®¨à¯à®¤à®¿à®° à®‰à®¤à®µà®¿à®¤à¯à®¤à¯Šà®•à¯ˆ",
    "about-benefits-2": "â‚¹6,000 à®’à®°à¯ à®®à¯à®±à¯ˆ à®‰à®¤à®µà®¿",
    "about-benefits-3": "12 à®®à®¾à®¤à®™à¯à®•à®³à¯ à®¨à®Ÿà¯ˆà®®à¯à®±à¯ˆ à®ªà®£à®¿ à®…à®©à¯à®ªà®µà®®à¯",
    "about-benefits-4": "à®®à¯à®©à¯à®©à®£à®¿ à®¨à®¿à®±à¯à®µà®©à®™à¯à®•à®³à¯à®Ÿà®©à¯ à®¤à¯Šà®´à®¿à®²à¯ à®µà¯†à®³à®¿à®ªà¯à®ªà®¾à®Ÿà¯",
    "about-benefits-5": "à®®à¯à®Ÿà®¿à®µà¯à®šà¯ à®šà®¾à®©à¯à®±à®¿à®¤à®´à¯",
    "about-benefits-6": "à®¤à®¿à®±à®©à¯ à®®à¯‡à®®à¯à®ªà®¾à®Ÿà¯ à®®à®±à¯à®±à¯à®®à¯ à®ªà®¯à®¿à®±à¯à®šà®¿",
    "about-sectors-title": "à®ªà®™à¯à®•à¯‡à®±à¯à®•à¯à®®à¯ à®¤à¯à®±à¯ˆà®•à®³à¯",
    "find-title": "à®‡à®©à¯à®Ÿà®°à¯à®©à¯à®·à®¿à®ªà¯à®•à®³à¯ˆà®•à¯ à®•à®£à¯à®Ÿà®±à®¿à®¯à®µà¯à®®à¯",
    "search-placeholder": "à®¨à®¿à®±à¯à®µà®©à®®à¯, à®ªà®™à¯à®•à¯ à®…à®²à¯à®²à®¤à¯ à®‡à®Ÿà®®à¯ à®®à¯‚à®²à®®à¯ à®¤à¯‡à®Ÿà¯à®™à¯à®•à®³à¯...",
    "btn-search": "à®¤à¯‡à®Ÿà¯",
    "browse-title": "à®…à®©à¯ˆà®¤à¯à®¤à¯ à®‡à®©à¯à®Ÿà®°à¯à®©à¯à®·à®¿à®ªà¯à®•à®³à¯ˆà®¯à¯à®®à¯ à®‰à®²à®¾à®µà®µà¯à®®à¯",
    "filter-sector": "à®¤à¯à®±à¯ˆ:",
    "filter-location": "à®‡à®Ÿà®®à¯:",
    "filter-all": "à®…à®©à¯ˆà®¤à¯à®¤à¯à®®à¯",
    "btn-reset": "à®µà®Ÿà®¿à®ªà¯à®ªà®¾à®©à¯à®•à®³à¯ˆ à®®à¯€à®Ÿà¯à®Ÿà®®à¯ˆà®•à¯à®•à®µà¯à®®à¯",
    "contact-title": "à®Žà®™à¯à®•à®³à¯ˆ à®¤à¯Šà®Ÿà®°à¯à®ªà¯ à®•à¯Šà®³à¯à®³à¯à®™à¯à®•à®³à¯",
    "contact-helpline": "à®‰à®¤à®µà®¿ à®Žà®£à¯",
    "contact-helpline-time": "à®•à®¿à®Ÿà¯ˆà®•à¯à®•à¯à®®à¯: à®¤à®¿à®™à¯à®•à®³à¯ à®®à¯à®¤à®²à¯ à®µà¯†à®³à¯à®³à®¿, à®•à®¾à®²à¯ˆ 9 à®®à®£à®¿ à®®à¯à®¤à®²à¯ à®®à®¾à®²à¯ˆ 6 à®®à®£à®¿ IST",
    "contact-email-title": "à®®à®¿à®©à¯à®©à®žà¯à®šà®²à¯ à®†à®¤à®°à®µà¯",
    "contact-faq-title": "à®…à®Ÿà®¿à®•à¯à®•à®Ÿà®¿ à®•à¯‡à®Ÿà¯à®•à®ªà¯à®ªà®Ÿà¯à®®à¯ à®•à¯‡à®³à¯à®µà®¿à®•à®³à¯",
    "faq-q1": "PM à®‡à®©à¯à®Ÿà®°à¯à®©à¯à®·à®¿à®ªà¯ à®¤à®¿à®Ÿà¯à®Ÿà®¤à¯à®¤à®¿à®±à¯à®•à¯ à®¯à®¾à®°à¯ à®¤à®•à¯à®¤à®¿à®¯à¯à®Ÿà¯ˆà®¯à®µà®°à¯?",
    "faq-a1": "à®ªà®Ÿà¯à®Ÿà®ªà¯à®ªà®Ÿà®¿à®ªà¯à®ªà¯ à®…à®²à¯à®²à®¤à¯ à®Ÿà®¿à®ªà¯à®³à¯‹à®®à®¾à®µà¯à®Ÿà®©à¯ 21-24 à®µà®¯à®¤à¯à®•à¯à®•à¯à®Ÿà¯à®ªà®Ÿà¯à®Ÿ à®‡à®³à¯ˆà®žà®°à¯à®•à®³à¯ à®®à®±à¯à®±à¯à®®à¯ à®•à¯à®Ÿà¯à®®à¯à®ª à®µà®°à¯à®®à®¾à®©à®®à¯ à®†à®£à¯à®Ÿà¯à®•à¯à®•à¯ â‚¹8 à®²à®Ÿà¯à®šà®®à¯ à®µà®°à¯ˆ à®‰à®³à¯à®³à®µà®°à¯à®•à®³à¯.",
    "faq-q2": "à®‰à®¤à®µà®¿à®¤à¯à®¤à¯Šà®•à¯ˆ à®¤à¯Šà®•à¯ˆ à®Žà®©à¯à®©?",
    "faq-a2": "à®®à®¾à®¤à®¤à¯à®¤à®¿à®±à¯à®•à¯ â‚¹5,000 à®•à¯‚à®Ÿà¯à®¤à®²à®¾à®• â‚¹6,000 à®’à®°à¯ à®®à¯à®±à¯ˆ à®‰à®¤à®µà®¿.",
    "faq-q3": "à®‡à®©à¯à®Ÿà®°à¯à®©à¯à®·à®¿à®ªà¯ à®•à®¾à®²à®®à¯ à®Žà®µà¯à®µà®³à®µà¯?",
    "faq-a3": "à®‡à®©à¯à®Ÿà®°à¯à®©à¯à®·à®¿à®ªà¯ à®•à®¾à®²à®®à¯ 12 à®®à®¾à®¤à®™à¯à®•à®³à¯ (1 à®†à®£à¯à®Ÿà¯).",
    "contact-form-title": "à®Žà®™à¯à®•à®³à¯à®•à¯à®•à¯ à®’à®°à¯ à®šà¯†à®¯à¯à®¤à®¿ à®…à®©à¯à®ªà¯à®ªà¯à®™à¯à®•à®³à¯",
    "form-name": "à®ªà¯†à®¯à®°à¯:",
    "form-email": "à®®à®¿à®©à¯à®©à®žà¯à®šà®²à¯:",
    "form-message": "à®šà¯†à®¯à¯à®¤à®¿:",
    "btn-submit": "à®šà®®à®°à¯à®ªà¯à®ªà®¿à®•à¯à®•à®µà¯à®®à¯",
    "btn-view-details": "à®µà®¿à®µà®°à®™à¯à®•à®³à¯ˆà®•à¯ à®•à®¾à®£à¯à®•",
    "btn-apply": "à®‡à®ªà¯à®ªà¯‹à®¤à¯ à®µà®¿à®£à¯à®£à®ªà¯à®ªà®¿à®•à¯à®•à®µà¯à®®à¯",
    "modal-location": "à®‡à®Ÿà®®à¯",
    "modal-sector": "à®¤à¯à®±à¯ˆ",
    "modal-duration": "à®•à®¾à®²à®®à¯",
    "modal-stipend": "à®®à®¾à®¤à®¾à®¨à¯à®¤à®¿à®° à®‰à®¤à®µà®¿à®¤à¯à®¤à¯Šà®•à¯ˆ",
    "modal-grant": "à®’à®°à¯ à®®à¯à®±à¯ˆ à®®à®¾à®©à®¿à®¯à®®à¯",
    "modal-requirements": "à®¤à¯‡à®µà¯ˆà®•à®³à¯",
    "modal-skills": "à®¤à¯‡à®µà¯ˆà®¯à®¾à®© à®¤à®¿à®±à®©à¯à®•à®³à¯",
    "modal-description": "à®µà®¿à®³à®•à¯à®•à®®à¯"
  },
  ma: {
    "nav-title": "à¤ªà¤‚à¤¤à¤ªà¥à¤°à¤§à¤¾à¤¨ à¤‡à¤‚à¤Ÿà¤°à¥à¤¨à¤¶à¤¿à¤ª à¤¯à¥‹à¤œà¤¨à¤¾",
    "nav-home": "à¤®à¥à¤–à¥à¤¯à¤ªà¥ƒà¤·à¥à¤ ",
    "nav-about": "à¤¬à¤¦à¥à¤¦à¤²",
    "nav-find": "à¤‡à¤‚à¤Ÿà¤°à¥à¤¨à¤¶à¤¿à¤ª à¤¶à¥‹à¤§à¤¾",
    "nav-browse": "à¤¸à¤°à¥à¤µ à¤ªà¤¹à¤¾",
    "nav-contact": "à¤¸à¤‚à¤ªà¤°à¥à¤•",
    "btn-login": "à¤²à¥‰à¤—à¤¿à¤¨",
    "btn-register": "à¤¨à¥‹à¤‚à¤¦à¤£à¥€",
    "hero-title": "à¤ªà¤‚à¤¤à¤ªà¥à¤°à¤§à¤¾à¤¨ à¤‡à¤‚à¤Ÿà¤°à¥à¤¨à¤¶à¤¿à¤ª à¤¯à¥‹à¤œà¤¨à¤¾",
    "hero-subtitle": "à¤­à¤¾à¤°à¤¤à¤¾à¤šà¥à¤¯à¤¾ à¤¯à¥à¤µà¤•à¤¾à¤‚à¤¨à¤¾ à¤µà¤¾à¤¸à¥à¤¤à¤µà¤¿à¤• à¤…à¤¨à¥à¤­à¤µ à¤†à¤£à¤¿ à¤•à¤°à¤¿à¤…à¤°à¤šà¥à¤¯à¤¾ à¤¸à¤‚à¤§à¥€ à¤ªà¥à¤°à¤¦à¤¾à¤¨ à¤•à¤°à¤£à¥‡",
    "hero-description": "à¤—à¥à¤°à¤¾à¤®à¥€à¤£ à¤­à¤¾à¤—, à¤†à¤¦à¤¿à¤µà¤¾à¤¸à¥€ à¤œà¤¿à¤²à¥à¤¹à¥‡ à¤†à¤£à¤¿ à¤µà¤‚à¤šà¤¿à¤¤ à¤¸à¤®à¥à¤¦à¤¾à¤¯à¤¾à¤‚à¤¸à¤¹ à¤¸à¤‚à¤ªà¥‚à¤°à¥à¤£ à¤­à¤¾à¤°à¤¤à¤¾à¤¤à¥€à¤² à¤¯à¥à¤µà¤•à¤¾à¤‚à¤¨à¤¾ à¤µà¥à¤¯à¤¾à¤µà¤¹à¤¾à¤°à¤¿à¤• à¤•à¤¾à¤®à¤¾à¤šà¤¾ à¤…à¤¨à¥à¤­à¤µ à¤®à¤¿à¤³à¤µà¤£à¥à¤¯à¤¾à¤¸à¤¾à¤ à¥€ à¤®à¥Œà¤²à¥à¤¯à¤µà¤¾à¤¨ à¤¸à¤‚à¤§à¥€ à¤ªà¥à¤°à¤¦à¤¾à¤¨ à¤•à¤°à¤£à¥‡.",
    "btn-find-now": "à¤†à¤¤à¤¾ à¤‡à¤‚à¤Ÿà¤°à¥à¤¨à¤¶à¤¿à¤ª à¤¶à¥‹à¤§à¤¾",
    "feature-internships": "à¤‡à¤‚à¤Ÿà¤°à¥à¤¨à¤¶à¤¿à¤ª",
    "feature-internships-sub": "5 à¤µà¤°à¥à¤·à¤¾à¤‚à¤¤",
    "feature-stipend": "à¤®à¤¾à¤¸à¤¿à¤• à¤µà¥‡à¤¤à¤¨",
    "feature-stipend-sub": "à¤¤à¤¸à¥‡à¤š â‚¹6,000 à¤à¤•à¤µà¥‡à¤³ à¤…à¤¨à¥à¤¦à¤¾à¤¨",
    "feature-sectors": "à¤•à¥à¤·à¥‡à¤¤à¥à¤°à¥‡",
    "feature-sectors-sub": "à¤¸à¤‚à¤ªà¥‚à¤°à¥à¤£ à¤­à¤¾à¤°à¤¤à¤¾à¤¤",
    "feature-duration": "à¤®à¤¹à¤¿à¤¨à¥‡ à¤•à¤¾à¤²à¤¾à¤µà¤§à¥€",
    "feature-duration-sub": "à¤ªà¥‚à¤°à¥à¤£à¤µà¥‡à¤³ à¤‡à¤‚à¤Ÿà¤°à¥à¤¨à¤¶à¤¿à¤ª",
    "overview-title": "à¤¯à¥‹à¤œà¤¨à¥‡à¤¬à¤¦à¥à¤¦à¤²",
    "overview-text": "à¤ªà¤‚à¤¤à¤ªà¥à¤°à¤§à¤¾à¤¨ à¤‡à¤‚à¤Ÿà¤°à¥à¤¨à¤¶à¤¿à¤ª à¤¯à¥‹à¤œà¤¨à¤¾ à¤µà¤¿à¤µà¤¿à¤§ à¤ªà¤¾à¤°à¥à¤¶à¥à¤µà¤­à¥‚à¤®à¥€à¤¤à¥€à¤² à¤¯à¥à¤µà¤•à¤¾à¤‚à¤¨à¤¾ à¤µà¥à¤¯à¤¾à¤µà¤¹à¤¾à¤°à¤¿à¤• à¤•à¤¾à¤®à¤¾à¤šà¤¾ à¤…à¤¨à¥à¤­à¤µ à¤¦à¥‡à¤£à¥à¤¯à¤¾à¤¸à¤¾à¤ à¥€ à¤­à¤¾à¤°à¤¤ à¤¸à¤°à¤•à¤¾à¤°à¤šà¤¾ à¤à¤• à¤®à¤¹à¤¤à¥à¤¤à¥à¤µà¤¾à¤šà¤¾ à¤‰à¤ªà¤•à¥à¤°à¤® à¤†à¤¹à¥‡. à¤¹à¤¾ à¤•à¤¾à¤°à¥à¤¯à¤•à¥à¤°à¤® à¤¶à¤¿à¤•à¥à¤·à¤£ à¤†à¤£à¤¿ à¤°à¥‹à¤œà¤—à¤¾à¤° à¤¯à¤¾à¤‚à¤šà¥à¤¯à¤¾à¤¤à¥€à¤² à¤…à¤‚à¤¤à¤° à¤­à¤°à¥‚à¤¨ à¤•à¤¾à¤¢à¤¤à¥‹.",
    "about-title": "à¤ªà¤‚à¤¤à¤ªà¥à¤°à¤§à¤¾à¤¨ à¤‡à¤‚à¤Ÿà¤°à¥à¤¨à¤¶à¤¿à¤ª à¤¯à¥‹à¤œà¤¨à¥‡à¤¬à¤¦à¥à¤¦à¤²",
    "about-background-title": "à¤ªà¤¾à¤°à¥à¤¶à¥à¤µà¤­à¥‚à¤®à¥€ à¤†à¤£à¤¿ à¤‰à¤¦à¥à¤¦à¤¿à¤·à¥à¤Ÿà¥‡",
    "about-background-text": "à¤­à¤¾à¤°à¤¤à¥€à¤¯ à¤¯à¥à¤µà¤•à¤¾à¤‚à¤®à¤§à¥€à¤² à¤°à¥‹à¤œà¤—à¤¾à¤°à¤•à¥à¤·à¤®à¤¤à¥‡à¤šà¥€ à¤¦à¤°à¥€ à¤­à¤°à¥‚à¤¨ à¤•à¤¾à¤¢à¤£à¥à¤¯à¤¾à¤¸à¤¾à¤ à¥€ à¤ªà¤‚à¤¤à¤ªà¥à¤°à¤§à¤¾à¤¨ à¤‡à¤‚à¤Ÿà¤°à¥à¤¨à¤¶à¤¿à¤ª à¤¯à¥‹à¤œà¤¨à¤¾ à¤¸à¥à¤°à¥‚ à¤•à¤°à¤£à¥à¤¯à¤¾à¤¤ à¤†à¤²à¥€. à¤¦à¥‡à¤¶à¤­à¤°à¤¾à¤¤à¥€à¤² à¤¤à¤°à¥à¤£ à¤ªà¤¦à¤µà¥€à¤§à¤°à¤¾à¤‚à¤¨à¤¾ à¤µà¥à¤¯à¤¾à¤µà¤¹à¤¾à¤°à¤¿à¤• à¤•à¤¾à¤®à¤¾à¤šà¤¾ à¤…à¤¨à¥à¤­à¤µ à¤¦à¥‡à¤£à¥‡, à¤•à¥Œà¤¶à¤²à¥à¤¯à¥‡ à¤µà¤¾à¤¢à¤µà¤£à¥‡ à¤†à¤£à¤¿ à¤•à¤°à¤¿à¤…à¤°à¤šà¥€ à¤¶à¤•à¥à¤¯à¤¤à¤¾ à¤¸à¥à¤§à¤¾à¤°à¤£à¥‡ à¤¹à¥‡ à¤¤à¥à¤¯à¤¾à¤šà¥‡ à¤‰à¤¦à¥à¤¦à¤¿à¤·à¥à¤Ÿ à¤†à¤¹à¥‡.",
    "about-eligibility-title": "à¤ªà¤¾à¤¤à¥à¤°à¤¤à¤¾ à¤¨à¤¿à¤•à¤·",
    "about-eligibility-1": "à¤µà¤¯: 21-24 à¤µà¤°à¥à¤·à¥‡",
    "about-eligibility-2": "à¤¶à¤¿à¤•à¥à¤·à¤£: à¤¸à¤‚à¤¬à¤‚à¤§à¤¿à¤¤ à¤•à¥à¤·à¥‡à¤¤à¥à¤°à¤¾à¤¤ à¤ªà¤¦à¤µà¥€ à¤•à¤¿à¤‚à¤µà¤¾ à¤¡à¤¿à¤ªà¥à¤²à¥‹à¤®à¤¾",
    "about-eligibility-3": "à¤•à¥Œà¤Ÿà¥à¤‚à¤¬à¤¿à¤• à¤‰à¤¤à¥à¤ªà¤¨à¥à¤¨: à¤µà¤°à¥à¤·à¤¾à¤²à¤¾ â‚¹8 à¤²à¤¾à¤– à¤ªà¤°à¥à¤¯à¤‚à¤¤",
    "about-eligibility-4": "à¤µà¥ˆà¤§ à¤†à¤§à¤¾à¤° à¤•à¤¾à¤°à¥à¤¡à¤¾à¤¸à¤¹ à¤­à¤¾à¤°à¤¤à¥€à¤¯ à¤¨à¤¾à¤—à¤°à¤¿à¤•",
    "about-eligibility-5": "à¤¸à¤§à¥à¤¯à¤¾ à¤¨à¥‹à¤•à¤°à¥€à¤¤ à¤¨à¤¾à¤¹à¥€ à¤•à¤¿à¤‚à¤µà¤¾ à¤ªà¥‚à¤°à¥à¤£à¤µà¥‡à¤³ à¤¶à¤¿à¤•à¥à¤·à¤£à¤¾à¤¤ à¤¨à¥‹à¤‚à¤¦à¤£à¥€à¤•à¥ƒà¤¤ à¤¨à¤¾à¤¹à¥€",
    "about-benefits-title": "à¤«à¤¾à¤¯à¤¦à¥‡",
    "about-benefits-1": "â‚¹5,000 à¤®à¤¾à¤¸à¤¿à¤• à¤µà¥‡à¤¤à¤¨",
    "about-benefits-2": "â‚¹6,000 à¤à¤•à¤µà¥‡à¤³ à¤®à¤¦à¤¤",
    "about-benefits-3": "12 à¤®à¤¹à¤¿à¤¨à¥‡ à¤µà¥à¤¯à¤¾à¤µà¤¹à¤¾à¤°à¤¿à¤• à¤•à¤¾à¤®à¤¾à¤šà¤¾ à¤…à¤¨à¥à¤­à¤µ",
    "about-benefits-4": "à¤†à¤˜à¤¾à¤¡à¥€à¤šà¥à¤¯à¤¾ à¤•à¤‚à¤ªà¤¨à¥à¤¯à¤¾à¤‚à¤¸à¤¹ à¤‰à¤¦à¥à¤¯à¥‹à¤— à¤ªà¥à¤°à¤¦à¤°à¥à¤¶à¤¨",
    "about-benefits-5": "à¤ªà¥‚à¤°à¥à¤£à¤¤à¤¾ à¤ªà¥à¤°à¤®à¤¾à¤£à¤ªà¤¤à¥à¤°",
    "about-benefits-6": "à¤•à¥Œà¤¶à¤²à¥à¤¯ à¤µà¤¿à¤•à¤¾à¤¸ à¤†à¤£à¤¿ à¤ªà¥à¤°à¤¶à¤¿à¤•à¥à¤·à¤£",
    "about-sectors-title": "à¤¸à¤¹à¤­à¤¾à¤—à¥€ à¤•à¥à¤·à¥‡à¤¤à¥à¤°à¥‡",
    "find-title": "à¤‡à¤‚à¤Ÿà¤°à¥à¤¨à¤¶à¤¿à¤ª à¤¶à¥‹à¤§à¤¾",
    "search-placeholder": "à¤•à¤‚à¤ªà¤¨à¥€, à¤­à¥‚à¤®à¤¿à¤•à¤¾ à¤•à¤¿à¤‚à¤µà¤¾ à¤¸à¥à¤¥à¤¾à¤¨ à¤¦à¥à¤µà¤¾à¤°à¥‡ à¤¶à¥‹à¤§à¤¾...",
    "btn-search": "à¤¶à¥‹à¤§à¤¾",
    "browse-title": "à¤¸à¤°à¥à¤µ à¤‡à¤‚à¤Ÿà¤°à¥à¤¨à¤¶à¤¿à¤ª à¤¬à¥à¤°à¤¾à¤‰à¤ à¤•à¤°à¤¾",
    "filter-sector": "à¤•à¥à¤·à¥‡à¤¤à¥à¤°:",
    "filter-location": "à¤¸à¥à¤¥à¤¾à¤¨:",
    "filter-all": "à¤¸à¤°à¥à¤µ",
    "btn-reset": "à¤«à¤¿à¤²à¥à¤Ÿà¤° à¤°à¥€à¤¸à¥‡à¤Ÿ à¤•à¤°à¤¾",
    "contact-title": "à¤†à¤®à¤šà¥à¤¯à¤¾à¤¶à¥€ à¤¸à¤‚à¤ªà¤°à¥à¤• à¤¸à¤¾à¤§à¤¾",
    "contact-helpline": "à¤¹à¥‡à¤²à¥à¤ªà¤²à¤¾à¤‡à¤¨ à¤¨à¤‚à¤¬à¤°",
    "contact-helpline-time": "à¤‰à¤ªà¤²à¤¬à¥à¤§: à¤¸à¥‹à¤®à¤µà¤¾à¤° à¤¤à¥‡ à¤¶à¥à¤•à¥à¤°à¤µà¤¾à¤°, à¤¸à¤•à¤¾à¤³à¥€ 9 à¤¤à¥‡ à¤¸à¤‚à¤§à¥à¤¯à¤¾à¤•à¤¾à¤³à¥€ 6 IST",
    "contact-email-title": "à¤ˆà¤®à¥‡à¤² à¤¸à¤ªà¥‹à¤°à¥à¤Ÿ",
    "contact-faq-title": "à¤µà¤¾à¤°à¤‚à¤µà¤¾à¤° à¤µà¤¿à¤šà¤¾à¤°à¤²à¥‡ à¤œà¤¾à¤£à¤¾à¤°à¥‡ à¤ªà¥à¤°à¤¶à¥à¤¨",
    "faq-q1": "PM à¤‡à¤‚à¤Ÿà¤°à¥à¤¨à¤¶à¤¿à¤ª à¤¯à¥‹à¤œà¤¨à¥‡à¤¸à¤¾à¤ à¥€ à¤•à¥‹à¤£ à¤ªà¤¾à¤¤à¥à¤° à¤†à¤¹à¥‡?",
    "faq-a1": "à¤ªà¤¦à¤µà¥€ à¤•à¤¿à¤‚à¤µà¤¾ à¤¡à¤¿à¤ªà¥à¤²à¥‹à¤®à¤¾ à¤…à¤¸à¤²à¥‡à¤²à¥‡ 21-24 à¤µà¤°à¥à¤·à¥‡ à¤µà¤¯à¥‹à¤—à¤Ÿà¤¾à¤¤à¥€à¤² à¤¯à¥à¤µà¤• à¤†à¤£à¤¿ à¤•à¥Œà¤Ÿà¥à¤‚à¤¬à¤¿à¤• à¤‰à¤¤à¥à¤ªà¤¨à¥à¤¨ à¤µà¤°à¥à¤·à¤¾à¤²à¤¾ â‚¹8 à¤²à¤¾à¤– à¤ªà¤°à¥à¤¯à¤‚à¤¤.",
    "faq-q2": "à¤µà¥‡à¤¤à¤¨ à¤°à¤•à¥à¤•à¤® à¤•à¤¿à¤¤à¥€ à¤†à¤¹à¥‡?",
    "faq-a2": "â‚¹5,000 à¤ªà¥à¤°à¤¤à¤¿ à¤®à¤¹à¤¿à¤¨à¤¾ à¤¤à¤¸à¥‡à¤š â‚¹6,000 à¤à¤•à¤µà¥‡à¤³ à¤®à¤¦à¤¤.",
    "faq-q3": "à¤‡à¤‚à¤Ÿà¤°à¥à¤¨à¤¶à¤¿à¤ªà¤šà¤¾ à¤•à¤¾à¤²à¤¾à¤µà¤§à¥€ à¤•à¤¿à¤¤à¥€ à¤†à¤¹à¥‡?",
    "faq-a3": "à¤‡à¤‚à¤Ÿà¤°à¥à¤¨à¤¶à¤¿à¤ªà¤šà¤¾ à¤•à¤¾à¤²à¤¾à¤µà¤§à¥€ 12 à¤®à¤¹à¤¿à¤¨à¥‡ (1 à¤µà¤°à¥à¤·) à¤†à¤¹à¥‡.",
    "contact-form-title": "à¤†à¤®à¥à¤¹à¤¾à¤²à¤¾ à¤¸à¤‚à¤¦à¥‡à¤¶ à¤ªà¤¾à¤ à¤µà¤¾",
    "form-name": "à¤¨à¤¾à¤µ:",
    "form-email": "à¤ˆà¤®à¥‡à¤²:",
    "form-message": "à¤¸à¤‚à¤¦à¥‡à¤¶:",
    "btn-submit": "à¤¸à¤¬à¤®à¤¿à¤Ÿ à¤•à¤°à¤¾",
    "btn-view-details": "à¤¤à¤ªà¤¶à¥€à¤² à¤ªà¤¹à¤¾",
    "btn-apply": "à¤†à¤¤à¤¾ à¤…à¤°à¥à¤œ à¤•à¤°à¤¾",
    "modal-location": "à¤¸à¥à¤¥à¤¾à¤¨",
    "modal-sector": "à¤•à¥à¤·à¥‡à¤¤à¥à¤°",
    "modal-duration": "à¤•à¤¾à¤²à¤¾à¤µà¤§à¥€",
    "modal-stipend": "à¤®à¤¾à¤¸à¤¿à¤• à¤µà¥‡à¤¤à¤¨",
    "modal-grant": "à¤à¤•à¤µà¥‡à¤³ à¤…à¤¨à¥à¤¦à¤¾à¤¨",
    "modal-requirements": "à¤†à¤µà¤¶à¥à¤¯à¤•à¤¤à¤¾",
    "modal-skills": "à¤†à¤µà¤¶à¥à¤¯à¤• à¤•à¥Œà¤¶à¤²à¥à¤¯à¥‡",
    "modal-description": "à¤µà¤°à¥à¤£à¤¨"
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
  console.log('ðŸš€ Page loaded, initializing app...');
  clearAllForms();
  initializeNavigation();
  initializeTheme();
  initializeLanguage();
  initScrollAnimations();

  const profileBtn = document.getElementById('profileBtn');
  if (profileBtn) {
    profileBtn.onclick = Profile.open.bind(Profile);
  }

  const overlay = document.querySelector('.profile-modal-overlay');
  if (overlay) {
    overlay.onclick = Profile.close;
  }

  console.log('âœ… Profile system initialized safely');

  // Load internships data from backend
  await loadIntershipDataFromBackend();

  // After data is loaded, initialize filters and browse page
  populateFilters();
  populateBrowseFilters();
  initializeBrowseAllPage();

  console.log('âœ… Internships loaded and browse page initialized');
});


// Smooth scroll to profile form
function scrollToProfile() {
  const profileSection = document.querySelector('.profile-section');
  if (profileSection) {
    profileSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

// Handle Quick Profile Form Submission
async function handleQuickProfileSubmit(event) {
  event.preventDefault();

  const formData = new FormData(event.target);
  const profileData = {};

  for (let [key, value] of formData.entries()) {
    profileData[key] = value;
  }

  // Save profile data to memory and localStorage
  savedProfileData = profileData;
  try {
    localStorage.setItem('userProfile', JSON.stringify(profileData));
  } catch (e) {
    console.log('Note: Could not save to localStorage');
  }

  // Show loading state
  const btn = event.target.querySelector('button[type="submit"]');
  const originalText = btn.textContent;
  btn.textContent = 'Finding Internships...';
  btn.disabled = true;

  try {
    // Hide form and show recommendations section
    const section = document.getElementById('recommendationsSection');
    if (section) section.style.display = 'block';

    // Extract location and skills
    const location = profileData.location || '';
    const skills = profileData.skills ? profileData.skills.split(',').map(s => s.trim()).filter(s => s) : [];

    // Reset pagination to first page
    paginationState.currentPage = 1;

    // Fetch internships with filters and pagination
    await fetchInternshipsWithFilters(location, skills);

  } catch (error) {
    console.error("Error:", error);
    const cardsContainer = document.getElementById('recommendationCards');
    if (cardsContainer) {
      cardsContainer.innerHTML = '<p style="text-align: center; padding: 20px; color: #d32f2f;">âŒ Error loading internships. Please try again.</p>';
    }
  } finally {
    btn.textContent = originalText;
    btn.disabled = false;
  }
}


// Intelligent Recommendation Algorithm
function getIntelligentRecommendations(profileData) {
  const skills = profileData.skills.toLowerCase();
  const careerGoal = profileData.career.toLowerCase();
  const industry = profileData.industry.toLowerCase();
  const location = profileData.location.toLowerCase();
  const field = profileData.field.toLowerCase();
  const experience = parseInt(profileData.experience) || 0;

  // Score each internship
  const scoredInternships = internships.map(internship => {
    let score = 0;

    // Skills matching (50% weight - 50 points max)
    const internshipSkills = internship.skills.toLowerCase();
    const skillsList = skills.split(',').map(s => s.trim());
    let skillMatches = 0;
    skillsList.forEach(skill => {
      if (internshipSkills.includes(skill) || internship.role.toLowerCase().includes(skill) || internship.description.toLowerCase().includes(skill)) {
        skillMatches++;
      }
    });
    score += Math.min((skillMatches / skillsList.length) * 50, 50);

    // Career Goal matching (25% weight - 25 points max)
    if (careerGoal.includes('technical') && (internship.sector === 'Information Technology' || internship.role.toLowerCase().includes('engineer') || internship.role.toLowerCase().includes('technical'))) {
      score += 25;
    } else if (careerGoal.includes('management') && (internship.role.toLowerCase().includes('management') || internship.role.toLowerCase().includes('manager'))) {
      score += 25;
    } else if (careerGoal.includes('finance') && (internship.sector.includes('Banking') || internship.sector.includes('Finance') || internship.sector.includes('Insurance'))) {
      score += 25;
    } else if (careerGoal.includes('operations') && internship.role.toLowerCase().includes('operations')) {
      score += 20;
    } else if (careerGoal.includes('sales') && internship.role.toLowerCase().includes('sales')) {
      score += 20;
    }

    // Industry Preference matching (25% weight - 25 points max)
    if (industry === 'it' && internship.sector === 'Information Technology') {
      score += 25;
    } else if (industry === 'finance' && (internship.sector.includes('Banking') || internship.sector.includes('Finance'))) {
      score += 25;
    } else if (industry === 'automotive' && internship.sector === 'Automotive') {
      score += 25;
    } else if (industry === 'energy' && (internship.sector.includes('Energy') || internship.sector.includes('Power'))) {
      score += 25;
    } else if (industry === 'manufacturing' && internship.sector === 'Manufacturing') {
      score += 25;
    } else if (industry === 'fmcg' && internship.sector === 'FMCG') {
      score += 25;
    } else if (industry === 'construction' && internship.sector === 'Construction') {
      score += 25;
    } else if (industry === 'healthcare' && internship.sector === 'Healthcare') {
      score += 25;
    } else if (industry === 'consulting' && internship.sector === 'Information Technology') {
      score += 15;
    }

    // Location preference (bonus 10 points)
    const locationsList = location.split(',').map(l => l.trim());
    locationsList.forEach(loc => {
      if (internship.location.toLowerCase().includes(loc)) {
        score += 10;
      }
    });

    // Field of study matching (bonus 5 points)
    if (field === 'cse' && internship.sector === 'Information Technology') {
      score += 5;
    } else if (field === 'commerce' && (internship.sector.includes('Banking') || internship.sector.includes('Finance'))) {
      score += 5;
    } else if (field === 'me' && (internship.sector === 'Automotive' || internship.sector === 'Manufacturing')) {
      score += 5;
    }

    return {
      internship,
      score
    };
  });

  // Sort by score and return top 3-5
  scoredInternships.sort((a, b) => b.score - a.score);
  const topCount = Math.min(5, Math.max(3, scoredInternships.filter(s => s.score > 20).length));
  return scoredInternships.slice(0, topCount).map(s => s.internship);
}

// Display Quick Profile Recommendations
function displayQuickProfileRecommendations(profileData, recommendations) {
  // Check if recommendations section exists, if not create it
  let recsSection = document.getElementById('quickProfileRecommendations');
  if (!recsSection) {
    recsSection = document.createElement('div');
    recsSection.id = 'quickProfileRecommendations';
    recsSection.className = 'recommendations-display';
    const profileSection = document.querySelector('.profile-section .container');
    profileSection.appendChild(recsSection);
  }

  recsSection.innerHTML = `
    <div class="recommendations-header">
      <h2>Hello, ${profileData.firstName}! ðŸ‘‹</h2>
      <p>We found ${recommendations.length} matching internships! Here are our top recommendations based on your profile:</p>
    </div>

    <div class="recommendation-cards" id="quickRecommendationCards">
      ${recommendations.map((internship, index) => `
        <div class="recommendation-card" onclick="openModal(${JSON.stringify(internship).replace(/"/g, '&quot;')})">
          <div class="recommendation-number num-${index + 1}">${index + 1}</div>
          <div class="recommendation-content">
            <div style="margin-bottom: 5px; display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
              ${internship.verification_status === 'verified' ? '<span class="badge badge-verified">Verified</span>' :
      internship.verification_status === 'expired' ? '<span class="badge badge-expired">Expired</span>' :
        '<span class="badge badge-unverified">Unverified</span>'}
              <span style="display:inline-block; background:${internship.matchScore >= 80 ? '#2ecc71' : internship.matchScore >= 60 ? '#f1c40f' : '#e74c3c'}; color:white; padding: 4px 10px; border-radius: 20px; font-size: 0.85em; font-weight: 600;">
                ðŸ”¥ ${internship.matchScore}% Match Accuracy
              </span>
            </div>
            
            <h3 class="recommendation-title">${internship.role}</h3>
            <p class="recommendation-company">${internship.company}</p>
            <div class="recommendation-details">
              <span class="recommendation-detail">ðŸ“ ${internship.location}</span>
              <span class="recommendation-detail">ðŸ¢ ${internship.sector}</span>
              <span class="recommendation-detail">â±ï¸ ${internship.duration}</span>
              <span class="recommendation-detail">ðŸ’° â‚¹${internship.stipend.toLocaleString()}/month</span>
            </div>
            
             <!-- AI Explanation Section -->
            <div style="background: #f0f7ff; border-top: 1px solid #cce5ff; padding: 15px; font-size: 0.9em; color: #004085; border-radius: 8px; margin-top: 10px;">
               <div style="margin-bottom: 8px;">
                 <strong>ðŸ’¡ Why this matches you:</strong> 
                 <span style="display:block; margin-top:4px;">${internship.aiExplanation.summary || "Good match based on your profile."}</span>
               </div>

               ${internship.aiExplanation.reasons ? `
               <ul style="margin: 5px 0 10px 20px; padding: 0;">
                 ${internship.aiExplanation.reasons.map(Reason => `<li>${Reason}</li>`).join('')}
               </ul>
               ` : ''}

               ${internship.aiExplanation.improvements && internship.aiExplanation.improvements.length > 0 ? `
               <div style="margin-top: 10px; border-top: 1px dashed #b8daff; padding-top: 8px;">
                 <strong>ðŸ“ˆ How to improve your fit:</strong>
                 <ul style="margin: 5px 0 0 20px; padding: 0; color: #555;">
                   ${internship.aiExplanation.improvements.map(imp => `<li>${imp}</li>`).join('')}
                 </ul>
               </div>
               ` : ''}
            </div>

            <p class="recommendation-description" style="margin-top: 10px;">${internship.description}</p>
          </div>
          <div class="recommendation-action">
            <button class="btn btn-primary" onclick="event.stopPropagation(); openModal(${JSON.stringify(internship).replace(/"/g, '&quot;')})">View Details</button>
          </div>
        </div>
      `).join('')}
    </div>

    <div class="recommendation-actions">
      <button class="btn btn-outline btn-large" onclick="backToQuickProfileForm()">â† Back to Form</button>
      <button class="btn btn-primary btn-large" onclick="navigateToSection('browse-all')">Browse All Internships â†’</button>
    </div>
    `;

  recsSection.style.display = 'block';
}

// Back to Quick Profile Form
function backToQuickProfileForm() {
  const formCard = document.querySelector('.profile-form-card');
  const recsSection = document.getElementById('quickProfileRecommendations');

  if (formCard) formCard.style.display = 'block';
  if (recsSection) recsSection.style.display = 'none';

  // Scroll to form
  setTimeout(() => {
    formCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 100);
}

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
  const targetLink = document.querySelector(`a[href="#${sectionId}"]`);
  if (targetLink) {
    targetLink.click();
  }
}

function navigateToFindInternships() {
  navigateToSection('find-internships');
  // Switch to browse tab
  setTimeout(() => {
    switchTab('browse');
  }, 100);
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

  // Reload internships to update language
  loadInternships();
  filterInternships();
}

// Note: internships and filteredBrowseAll are declared earlier in the file

// Load internships data from backend
async function loadIntershipDataFromBackend() {
  try {
    console.log('ðŸ“¡ Fetching internships from backend...');

    // Fetch all internships from backend (using limit parameter)
    const response = await fetch(`${API_BASE}/internships/filter?limit=10000`);
    const json = await response.json();

    if (json.success && json.data) {
      internships = json.data;
      filteredBrowseAll = [...internships];
      console.log(`âœ… Loaded ${internships.length} internships from backend`);
    } else {
      console.error('âŒ Failed to load internships:', json.error);
      internships = [];
      filteredBrowseAll = [];
    }
  } catch (error) {
    console.error('âŒ Error loading internships:', error);
    internships = [];
    filteredBrowseAll = [];
  }
}

// Load Internships (legacy - no longer used)
function loadInternships() {
  // Internships are now loaded in browse tab via loadBrowseInternships()
}

function createInternshipCard(internship) {
  const card = document.createElement('div');
  card.className = 'internship-card';
  card.onclick = () => openModal(internship);

  let badgeHtml = '';
  if (internship.verification_status === 'verified') {
    badgeHtml = '<span class="badge badge-verified">Verified</span>';
  } else if (internship.verification_status === 'expired') {
    badgeHtml = '<span class="badge badge-expired">Expired</span>';
  } else {
    badgeHtml = '<span class="badge badge-unverified">Unverified</span>';
  }

  card.innerHTML = `
    <h3 class="internship-company">${badgeHtml} ${internship.company}</h3>
    <p class="internship-role">${internship.role}</p>
    <div class="internship-details">
      <div class="internship-detail">
        <span class="detail-icon">ðŸ“</span>
        <span>${internship.location}</span>
      </div>
      <div class="internship-detail">
        <span class="detail-icon">ðŸ¢</span>
        <span>${internship.sector}</span>
      </div>
      <div class="internship-detail">
        <span class="detail-icon">â±ï¸</span>
        <span>${internship.duration}</span>
      </div>
    </div>
    <div class="internship-footer">
      <span class="internship-stipend">â‚¹${internship.stipend.toLocaleString()}/month</span>
      <button class="btn btn-primary" data-translate="btn-view-details">${translations[currentLanguage]['btn-view-details']}</button>
    </div>
    `;

  return card;
}

// Search Functionality (for Browse tab)
function searchInternships() {
  const searchInput = document.getElementById('searchInput');
  const searchTerm = searchInput.value.toLowerCase();

  const filtered = internships.filter(internship => {
    return internship.company.toLowerCase().includes(searchTerm) ||
      internship.role.toLowerCase().includes(searchTerm) ||
      internship.location.toLowerCase().includes(searchTerm) ||
      internship.sector.toLowerCase().includes(searchTerm);
  });

  // Display in browse tab
  const container = document.getElementById('browseInternshipsList');
  container.innerHTML = '';

  if (filtered.length === 0) {
    container.innerHTML = '<p style="text-align: center; padding: 40px; color: var(--color-text-secondary); grid-column: 1/-1;">No internships found matching your search.</p>';
    return;
  }

  filtered.forEach(internship => {
    const card = createInternshipCard(internship);
    container.appendChild(card);
  });
}

// Populate Filters (legacy - kept for compatibility)
function populateFilters() {
  // This function is kept for compatibility but filters are now in browse tab
}

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

  // Parse skills and perks
  const skills = parseList(internship.skills);
  const perks = parseList(internship.perks);
  const internType = parseList(internship.intern_type || internship.internType);

  modalBody.innerHTML = `
    <div class="modal-header" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 24px; border-radius: 12px 12px 0 0; margin: -20px -20px 20px -20px;">
      <h2 style="margin: 0 0 8px 0; font-size: 1.8em; font-weight: bold;">${internship.company || 'Company Name'}</h2>
      <p style="margin: 0; font-size: 1.2em; opacity: 0.95;">${internship.role || 'Role'}</p>
    </div>

    <div class="modal-details" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px;">
      <div class="modal-detail-item" style="background: #f8fafc; padding: 12px; border-radius: 8px; border-left: 3px solid #667eea;">
        <span style="display: block; font-size: 0.85em; color: #64748b; margin-bottom: 4px;">ðŸ“ Location</span>
        <span style="display: block; font-weight: 600; color: #1e293b;">${internship.location || 'N/A'}</span>
      </div>
      <div class="modal-detail-item" style="background: #f8fafc; padding: 12px; border-radius: 8px; border-left: 3px solid #10b981;">
        <span style="display: block; font-size: 0.85em; color: #64748b; margin-bottom: 4px;">â±ï¸ Duration</span>
        <span style="display: block; font-weight: 600; color: #1e293b;">${internship.duration || 'N/A'}</span>
      </div>
      <div class="modal-detail-item" style="background: #f8fafc; padding: 12px; border-radius: 8px; border-left: 3px solid #f59e0b;">
        <span style="display: block; font-size: 0.85em; color: #64748b; margin-bottom: 4px;">ðŸ’° Stipend</span>
        <span style="display: block; font-weight: 600; color: #1e293b;">${internship.stipend || 'N/A'}</span>
      </div>
      ${internType && internType !== 'Not specified' ? `
      <div class="modal-detail-item" style="background: #f8fafc; padding: 12px; border-radius: 8px; border-left: 3px solid #8b5cf6;">
        <span style="display: block; font-size: 0.85em; color: #64748b; margin-bottom: 4px;">ðŸŽ¯ Type</span>
        <span style="display: block; font-weight: 600; color: #1e293b;">${internType}</span>
      </div>
      ` : ''}
    </div>

    ${skills && skills !== 'Not specified' ? `
    <div class="modal-section" style="margin-bottom: 20px; padding: 16px; background: #fef3c7; border-radius: 8px; border-left: 4px solid #f59e0b;">
      <h3 style="margin: 0 0 12px 0; font-size: 1.1em; color: #92400e; display: flex; align-items: center; gap: 8px;">
        <span>ðŸ’¼</span> Required Skills
      </h3>
      <p style="margin: 0; color: #78350f; line-height: 1.6;">${skills}</p>
    </div>
    ` : ''}

    ${perks && perks !== 'Not specified' ? `
    <div class="modal-section" style="margin-bottom: 20px; padding: 16px; background: #dbeafe; border-radius: 8px; border-left: 4px solid #3b82f6;">
      <h3 style="margin: 0 0 12px 0; font-size: 1.1em; color: #1e40af; display: flex; align-items: center; gap: 8px;">
        <span>ðŸŽ</span> Perks & Benefits
      </h3>
      <p style="margin: 0; color: #1e3a8a; line-height: 1.6;">${perks}</p>
    </div>
    ` : ''}

    ${internship.requirements && internship.requirements !== 'undefined' ? `
    <div class="modal-section" style="margin-bottom: 20px; padding: 16px; background: #f0fdf4; border-radius: 8px; border-left: 4px solid #10b981;">
      <h3 style="margin: 0 0 12px 0; font-size: 1.1em; color: #065f46; display: flex; align-items: center; gap: 8px;">
        <span>ðŸ“‹</span> Requirements
      </h3>
      <p style="margin: 0; color: #064e3b; line-height: 1.6;">${internship.requirements}</p>
    </div>
    ` : ''}

    <div class="modal-details" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin-bottom: 20px;">
      ${internship.hiring_since || internship.hiringSince ? `
      <div style="background: #fef2f2; padding: 10px; border-radius: 6px; text-align: center;">
        <div style="font-size: 0.8em; color: #991b1b; margin-bottom: 4px;">ðŸ“… Hiring Since</div>
        <div style="font-weight: 600; color: #7f1d1d;">${internship.hiring_since || internship.hiringSince}</div>
      </div>
      ` : ''}
      ${internship.opening || internship.openings ? `
      <div style="background: #f0fdf4; padding: 10px; border-radius: 6px; text-align: center;">
        <div style="font-size: 0.8em; color: #065f46; margin-bottom: 4px;">ðŸšª Openings</div>
        <div style="font-weight: 600; color: #064e3b;">${internship.opening || internship.openings}</div>
      </div>
      ` : ''}
      ${internship.number_of_applications || internship.applications ? `
      <div style="background: #ede9fe; padding: 10px; border-radius: 6px; text-align: center;">
        <div style="font-size: 0.8em; color: #5b21b6; margin-bottom: 4px;">ðŸ‘¥ Applications</div>
        <div style="font-weight: 600; color: #4c1d95;">${internship.number_of_applications || internship.applications}</div>
      </div>
      ` : ''}
      ${internship.hired_candidate || internship.hiredCandidates ? `
      <div style="background: #ecfdf5; padding: 10px; border-radius: 6px; text-align: center;">
        <div style="font-size: 0.8em; color: #065f46; margin-bottom: 4px;">âœ… Hired</div>
        <div style="font-weight: 600; color: #064e3b;">${internship.hired_candidate || internship.hiredCandidates}</div>
      </div>
      ` : ''}
    </div>

    ${internship.website_link || internship.websiteLink ? `
    <div style="margin-bottom: 20px; padding: 12px; background: #f1f5f9; border-radius: 8px; text-align: center;">
      <a href="${internship.website_link || internship.websiteLink}" target="_blank" style="color: #3b82f6; text-decoration: none; font-weight: 500; display: inline-flex; align-items: center; gap: 6px;">
        <span>ðŸŒ</span> Visit Company Website <span>â†’</span>
      </a>
    </div>
    ` : ''}

    <div class="modal-footer" style="display: flex; gap: 12px; flex-wrap: wrap; justify-content: center; padding-top: 20px; border-top: 2px solid #e2e8f0;">
      <button class="btn btn-outline" onclick="closeModal()" style="padding: 10px 20px;">Close</button>
      <button class="btn btn-secondary" onclick="generateCoverLetterForModal(this)" style="background: #f0fdfa; border: 1px solid #0d9488; color: #0f766e; padding: 10px 20px;">
        âœ¨ AI Cover Letter
      </button>
      <button class="btn btn-secondary" onclick="openInterviewModal()" style="background: #eff6ff; border: 1px solid #3b82f6; color: #1d4ed8; padding: 10px 20px;">
        ðŸŽ¤ Practice Interview
      </button>
      <a href="${internship.website_link || internship.websiteLink || 'https://www.internshala.com'}" target="_blank" class="btn btn-primary" style="padding: 10px 24px; text-decoration: none;">Apply Now</a>
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
  btn.innerHTML = 'â³ Generating...';
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
      <h4 style="margin-top:0; color: #333;">ðŸ“„ Your AI Cover Letter</h4>
      <div style="margin-bottom: 10px;">
        <label style="font-weight:bold; font-size:12px; color:#666;">SUBJECT LINE</label>
        <input type="text" value="${letter.subject}" style="width:100%; padding:8px; border:1px solid #ccc; border-radius:4px; margin-top:4px;">
      </div>
      <div>
        <label style="font-weight:bold; font-size:12px; color:#666;">CONTENT</label>
        <textarea style="width:100%; height:200px; padding:10px; border:1px solid #ccc; border-radius:4px; font-family:inherit; resize:vertical;">${letter.body}</textarea>
      </div>
      <button onclick="copyCoverLetter()" class="btn-primary" style="margin-top:10px; width:auto; padding: 8px 16px;">ðŸ“‹ Copy to Clipboard</button>
    </div>
    `;

      // Append before footer
      const footer = document.querySelector('.modal-footer');
      footer.insertAdjacentHTML('beforebegin', letterHtml);
      footer.scrollIntoView({ behavior: 'smooth' });

    } else {
      alert("âŒ Failed to generate cover letter: " + data.error);
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
  const browseTab = document.getElementById('browse-tab');

  if (tabName === 'recommendations') {
    recommendationsTab.classList.add('active');
    browseTab.classList.remove('active');
  } else {
    recommendationsTab.classList.remove('active');
    browseTab.classList.add('active');
  }
}

// Handle Quick Profile Form Submission
async function handleQuickProfileSubmit(event) {
  event.preventDefault();
  console.log('ðŸ“ Quick Profile Form submitted');

  const formData = new FormData(event.target);

  // Extract form values
  const firstName = formData.get('firstName') || '';
  const lastName = formData.get('lastName') || '';
  const name = `${firstName} ${lastName}`.trim();
  const qualification = formData.get('education') || formData.get('field') || '';
  const skillsInput = formData.get('skills') || '';
  const preferredState = formData.get('location') || '';
  const preferredSector = formData.get('industry') || 'Any';
  const age = '20'; // Default age

  console.log('ðŸ“‹ Form data extracted:', { name, qualification, skillsInput, preferredState, preferredSector });

  // Call the recommendations API
  await callRecommendationsAPI(name, age, qualification, skillsInput, preferredState, preferredSector);
}

// Profile Form Submission - Simplified and Robust
async function getRecommendations() {
  console.log('ðŸŽ¯ getRecommendations() called');

  // Get form values with fallbacks
  const nameEl = document.getElementById('name');
  const ageEl = document.getElementById('age');
  const qualificationEl = document.getElementById('qualification');
  const skillsEl = document.getElementById('skills');
  const stateEl = document.getElementById('state');
  const sectorEl = document.getElementById('sector');

  // If form elements don't exist, prompt user
  if (!nameEl || !qualificationEl || !skillsEl || !stateEl) {
    const name = prompt('Enter your name:');
    const qualification = prompt('Enter your qualification (e.g., B.Tech, BCA):');
    const skills = prompt('Enter your skills (comma-separated):');
    const state = prompt('Enter your preferred state:');

    if (!name || !qualification || !skills || !state) {
      alert('All fields are required!');
      return;
    }

    // Call API with prompted values
    await callRecommendationsAPI(name, '20', qualification, skills, state, 'Any');
    return;
  }

  // Get values from form
  const name = nameEl.value.trim();
  const age = ageEl ? ageEl.value.trim() : '20';
  const qualification = qualificationEl.value.trim();
  const skillsInput = skillsEl.value.trim();
  const preferredState = stateEl.value.trim();
  const preferredSector = sectorEl ? sectorEl.value.trim() : 'Any';

  // Validate
  if (!name || !qualification || !skillsInput || !preferredState) {
    alert('Please fill in: Name, Qualification, Skills, and Preferred State');
    return;
  }

  await callRecommendationsAPI(name, age, qualification, skillsInput, preferredState, preferredSector);
}

async function callRecommendationsAPI(name, age, qualification, skillsInput, preferredState, preferredSector) {
  try {
    // Convert skills to array
    const skills = skillsInput.split(',').map(s => s.trim()).filter(s => s);

    console.log('ðŸ“¡ Calling recommendations API with:', { name, age, qualification, skills, preferredState, preferredSector });

    // Show loading message
    showRecommendationsLoading();

    // Call backend API
    const res = await fetch(`${API_BASE}/recommendations/get-recommendations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        age,
        qualification,
        skills,
        preferredSector,
        preferredState
      })
    });

    const json = await res.json();
    console.log('ðŸ“¥ Backend response:', json);

    if (!json.success) {
      console.error('âŒ Backend error:', json.error);
      alert('Error getting recommendations: ' + (json.error || 'Unknown error'));
      hideRecommendationsLoading();
      return;
    }

    // Display recommendations
    displayRecommendationsResults(json.recommendations || []);

  } catch (error) {
    console.error('âŒ Error in callRecommendationsAPI:', error);
    alert('Error connecting to backend: ' + error.message);
    hideRecommendationsLoading();
  }
}

function showRecommendationsLoading() {
  let container = document.getElementById('recommendationResults');
  if (!container) {
    // Create container if it doesn't exist
    container = document.createElement('div');
    container.id = 'recommendationResults';
    container.style.cssText = 'margin: 20px; padding: 20px;';
    document.body.appendChild(container);
  }
  container.innerHTML = '<p style="text-align: center; padding: 40px; font-size: 18px;">ðŸ” Finding best internships for you...</p>';
  container.scrollIntoView({ behavior: 'smooth' });
}

function hideRecommendationsLoading() {
  const container = document.getElementById('recommendationResults');
  if (container) {
    container.innerHTML = '';
  }
}

function displayRecommendationsResults(recommendations) {
    let container = document.getElementById('recommendationResults');
    if (!container) {
        container = document.createElement('div');
        container.id = 'recommendationResults';
        container.style.cssText = 'max-width: 1200px; margin: 40px auto; padding: 20px; font-family: "Segoe UI", sans-serif;';
        document.body.appendChild(container);
    }

    container.innerHTML = '';

    if (!recommendations || recommendations.length === 0) {
        console.warn('âš ï¸ No recommendations returned');
        container.innerHTML = `
      <div style="text-align: center; padding: 60px; color: #666;">
        <div style="font-size: 48px; margin-bottom: 20px;">ðŸ˜”</div>
        <h3>No matches found</h3>
        <p>Try adjusting your preferences to get better recommendations.</p>
        <button id="no-results-back-btn" style="margin-top: 20px; padding: 10px 24px; background: #333; color: white; border: none; border-radius: 6px; cursor: pointer;">Go Back to Form</button>
      </div>
    `;
        const backBtn = container.querySelector('#no-results-back-btn');
        if (backBtn) {
            backBtn.onclick = () => {
                container.innerHTML = '';
                if (typeof backToForm === 'function') backToForm();
                else window.location.reload();
            };
        }
        return;
    }

    // Section Title
    const title = document.createElement('h2');
    title.innerHTML = 'âœ¨ Recommended for You';
    title.style.cssText = 'text-align: center; margin-bottom: 40px; font-size: 2.2rem; background: linear-gradient(135deg, #1e293b 0%, #334155 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-weight: 800;';
    container.appendChild(title);

    // Grid Container
    const grid = document.createElement('div');
    grid.style.cssText = 'display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 30px; margin-bottom: 50px;';

    console.log(`âœ… Displaying ${recommendations.length} recommendations`);

    recommendations.forEach((rec, index) => {
        const card = document.createElement('div');
        card.className = 'recommendation-card';

        // Card Base Style
        card.style.cssText = `
      background: #ffffff;
      border-radius: 20px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.05);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
      border: 1px solid rgba(0,0,0,0.04);
      position: relative;
    `;

        // Hover Effects
        card.onmouseenter = () => {
            card.style.transform = 'translateY(-8px)';
            card.style.boxShadow = '0 20px 40px rgba(0,0,0,0.12)';
        };
        card.onmouseleave = () => {
            card.style.transform = 'translateY(0)';
            card.style.boxShadow = '0 10px 25px rgba(0,0,0,0.05)';
        };

        // Data Processing
        const matchScore = rec.matchPercentage || (rec.matchScore ? rec.matchScore + '%' : 'N/A');
        const description = rec.description || 'Join our team to work on exciting projects.';
        const companyInitial = (rec.company || 'C').charAt(0).toUpperCase();

        // Random gradient
        const gradients = [
            'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', // Indigo
            'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)', // Blue-Cyan
            'linear-gradient(135deg, #ec4899 0%, #f43f5e 100%)', // Pink-Red
            'linear-gradient(135deg, #10b981 0%, #059669 100%)'  // Emerald
        ];
        const headerBg = gradients[index % gradients.length];

        // Card HTML Structure
        card.innerHTML = `
      <!-- Header -->
      <div style="background: ${headerBg}; padding: 24px; color: white; position: relative;">
        <!-- Rank Badge -->
        <div style="position: absolute; top: 20px; right: 20px; background: rgba(255,255,255,0.2); backdrop-filter: blur(4px); padding: 5px 12px; border-radius: 20px; font-size: 0.85rem; font-weight: 600; border: 1px solid rgba(255,255,255,0.3);">
          #${rec.rank || index + 1}
        </div>
        
        <div style="display: flex; align-items: center; gap: 15px;">
          <div style="width: 50px; height: 50px; background: white; color: #333; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; font-weight: bold; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
            ${companyInitial}
          </div>
          <div>
            <h3 style="margin: 0; font-size: 1.25rem; font-weight: 700; line-height: 1.3;">${rec.role}</h3>
            <p style="margin: 4px 0 0 0; opacity: 0.9; font-size: 0.95rem;">${rec.company}</p>
          </div>
        </div>
      </div>

      <!-- Match Score Banner -->
      <div style="background: #f8fafc; padding: 10px 24px; border-bottom: 1px solid #f1f5f9; display: flex; align-items: center; justify-content: space-between;">
        <span style="font-size: 0.85rem; color: #64748b; font-weight: 500;">Match Compatibility</span>
        <div style="display: flex; align-items: center; gap: 6px;">
          <span style="font-weight: 700; color: #334155;">${matchScore}</span>
        </div>
      </div>

      <!-- Body -->
      <div style="padding: 24px; flex-grow: 1; display: flex; flex-direction: column;">
        <!-- Specs Grid -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px;">
          <div>
            <div style="font-size: 0.8rem; color: #94a3b8; margin-bottom: 4px;">Location</div>
            <div style="font-weight: 600; color: #1e293b; font-size: 0.95rem;">ðŸ“ ${rec.location}</div>
          </div>
          <div>
            <div style="font-size: 0.8rem; color: #94a3b8; margin-bottom: 4px;">Stipend</div>
            <div style="font-weight: 600; color: #1e293b; font-size: 0.95rem;">ðŸ’° â‚¹${rec.stipend}</div>
          </div>
          <div>
            <div style="font-size: 0.8rem; color: #94a3b8; margin-bottom: 4px;">Duration</div>
            <div style="font-weight: 600; color: #1e293b; font-size: 0.95rem;">â±ï¸ ${rec.duration}</div>
          </div>
           <div>
            <div style="font-size: 0.8rem; color: #94a3b8; margin-bottom: 4px;">Sector</div>
            <div style="font-weight: 600; color: #1e293b; font-size: 0.95rem;">ðŸ¢ ${rec.sector}</div>
          </div>
        </div>

        <!-- Description -->
        <p style="font-size: 0.9rem; color: #64748b; line-height: 1.6; margin-bottom: 24px; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;">
          ${description}
        </p>

        <!-- Button container (will be filled by JS) -->
        <div class="action-container" style="margin-top: auto; display: flex; gap: 10px;"></div>
      </div>
    `;

        // Create 'View Details' Button
        const actionContainer = card.querySelector('.action-container');

        const viewBtn = document.createElement('button');
        viewBtn.innerHTML = `
      <span>View Details</span>
      <span style="font-size: 1.1em;">â†’</span>
    `;
        viewBtn.style.cssText = `
      flex: 1;
      padding: 14px;
      background: #f1f5f9;
      color: #334155;
      border: none;
      border-radius: 12px;
      font-weight: 600;
      cursor: pointer;
      font-size: 1rem;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: all 0.2s ease;
    `;

        viewBtn.onmouseenter = () => {
            viewBtn.style.background = '#e2e8f0';
            viewBtn.style.color = '#0f172a';
        };
        viewBtn.onmouseleave = () => {
            viewBtn.style.background = '#f1f5f9';
            viewBtn.style.color = '#334155';
        };

        viewBtn.onclick = function () {
            if (typeof openModal === 'function') {
                openModal(rec);
            } else {
                console.error('openModal function is not defined');
                alert('Error: Could not open details.');
            }
        };

        // Create 'Why this match?' AI Button
        const aiBtn = document.createElement('button');
        aiBtn.innerHTML = `
      <span>Why this match?</span>
      <span style="font-size: 1.2em;">âœ¨</span>
    `;
        aiBtn.style.cssText = `
      flex: 1;
      padding: 14px;
      background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
      color: white;
      border: none;
      border-radius: 12px;
      font-weight: 600;
      cursor: pointer;
      font-size: 1rem;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: all 0.2s ease;
      box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
    `;

        aiBtn.onclick = function () {
            getMatchExplanation(rec);
        };

        aiBtn.onmouseenter = () => {
            aiBtn.style.transform = 'translateY(-2px)';
            aiBtn.style.boxShadow = '0 6px 16px rgba(79, 70, 229, 0.4)';
        };
        aiBtn.onmouseleave = () => {
            aiBtn.style.transform = 'translateY(0)';
            aiBtn.style.boxShadow = '0 4px 12px rgba(79, 70, 229, 0.3)';
        };

        actionContainer.appendChild(viewBtn);
        actionContainer.appendChild(aiBtn);
        grid.appendChild(card);
    });

    container.appendChild(grid);

    // --- GO BACK BUTTON (PREMIUM DESIGN) ---
    const footerContainer = document.createElement('div');
    footerContainer.style.cssText = 'display: flex; justify-content: center; padding: 20px 0 60px 0;';

    const backBtn = document.createElement('button');
    backBtn.innerHTML = 'â† Start New Search';
    backBtn.style.cssText = `
    padding: 14px 32px;
    background: white;
    color: #475569;
    border: 2px solid #cbd5e1;
    border-radius: 50px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 4px 6px rgba(0,0,0,0.05);
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    gap: 8px;
  `;

    backBtn.onmouseenter = () => {
        backBtn.style.borderColor = '#334155';
        backBtn.style.color = '#1e293b';
        backBtn.style.transform = 'translateY(-2px)';
    };
    backBtn.onmouseleave = () => {
        backBtn.style.borderColor = '#cbd5e1';
        backBtn.style.color = '#475569';
        backBtn.style.transform = 'translateY(0)';
    };

    backBtn.onclick = function () {
        container.innerHTML = '';
        if (typeof backToForm === 'function') {
            backToForm();
        } else {
            console.log("backToForm triggered fallback");
            window.location.reload();
        }
    };

    footerContainer.appendChild(backBtn);
    container.appendChild(footerContainer);

    console.log('âœ… Recommendations displayed successfully');
    container.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ðŸ¤– AI Explanation Function
async function getMatchExplanation(internship) {
    let studentProfile = null;

    if (typeof paginationState !== 'undefined' && paginationState.userSkills) {
        studentProfile = {
            skills: paginationState.userSkills,
            qualification: 'Not specified',
            preferred_state: paginationState.userLocation,
            cgpa: 7.5
        };
    }

    const nameInput = document.getElementById('name');
    const skillsInput = document.getElementById('skills');
    const locInput = document.getElementById('state');
    const qualInput = document.getElementById('qualification');

    if (skillsInput && locInput) {
        studentProfile = {
            name: nameInput ? nameInput.value : 'User',
            skills: skillsInput.value.split(',').map(s => s.trim()).filter(s => s),
            preferred_state: locInput.value,
            qualification: qualInput ? qualInput.value : 'Student',
            cgpa: 7.5
        };
    }

    if (!studentProfile) {
        alert("Please fill out your profile details first to get an AI explanation.");
        return;
    }

    const modalId = 'ai-explanation-modal';
    let modal = document.getElementById(modalId);
    if (!modal) {
        modal = document.createElement('div');
        modal.id = modalId;
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.6); backdrop-filter: blur(4px);
            z-index: 10000; display: flex; justify-content: center; align-items: center;
        `;
        document.body.appendChild(modal);
    }

    modal.innerHTML = `
        <div style="background: white; width: 90%; max-width: 600px; padding: 30px; border-radius: 20px; box-shadow: 0 20px 50px rgba(0,0,0,0.2); animation: popIn 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28);">
            <div style="text-align: center;">
                <div style="font-size: 40px; margin-bottom: 20px;">âœ¨</div>
                <h2 style="margin: 0 0 10px 0; color: #1e293b;">Analyzing Fit...</h2>
                <p style="color: #64748b;">Asking Gemini AI why this matches you.</p>
                <div style="margin-top: 20px; width: 100%; height: 4px; background: #f1f5f9; border-radius: 2px; overflow: hidden;">
                    <div style="width: 50%; height: 100%; background: #6366f1; animation: loadingBar 1.5s infinite linear;"></div>
                </div>
            </div>
        </div>
        <style>
            @keyframes popIn { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
            @keyframes loadingBar { from { transform: translateX(-100%); } to { transform: translateX(200%); } }
        </style>
    `;
    modal.style.display = 'flex';

    try {
        const res = await fetch(`${API_BASE}/ai/explain-match`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                student: studentProfile,
                internship: internship
            })
        });

        const data = await res.json();

        if (data.success && data.explanation) {
            const exp = data.explanation;

            modal.innerHTML = `
                <div style="background: white; width: 90%; max-width: 600px; padding: 0; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 50px rgba(0,0,0,0.2); display: flex; flex-direction: column; max-height: 90vh;">
                    <!-- Header -->
                    <div style="background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); padding: 25px; color: white; display: flex; justify-content: space-between; align-items: center;">
                        <h2 style="margin: 0; font-size: 1.4rem;">ðŸ’¡ Match Analysis</h2>
                        <button onclick="document.getElementById('${modalId}').style.display='none'" style="background: rgba(255,255,255,0.2); border: none; color: white; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; font-size: 1.2rem;">Ã—</button>
                    </div>
                    
                    <!-- Content -->
                    <div style="padding: 30px; overflow-y: auto;">
                        <div style="margin-bottom: 24px;">
                            <h3 style="font-size: 0.9rem; text-transform: uppercase; color: #64748b; margin-bottom: 10px; letter-spacing: 0.05em; font-weight: 700;">Why it fits</h3>
                            <div style="background: #f0fdf4; border-left: 4px solid #10b981; padding: 15px; border-radius: 4px; color: #065f46; font-size: 0.95rem; line-height: 1.6;">
                                ${exp.summary}
                                <ul style="margin: 10px 0 0 20px; padding: 0; color: #047857;">
                                    ${exp.reasons.map(r => `<li>${r}</li>`).join('')}
                                </ul>
                            </div>
                        </div>

                        <div style="margin-bottom: 24px;">
                            <h3 style="font-size: 0.9rem; text-transform: uppercase; color: #64748b; margin-bottom: 10px; letter-spacing: 0.05em; font-weight: 700;">Gap Analysis</h3>
                            <div style="background: #fff1f2; border-left: 4px solid #f43f5e; padding: 15px; border-radius: 4px; color: #9f1239; font-size: 0.95rem; line-height: 1.6;">
                                ${exp.limitations}
                            </div>
                        </div>

                         <div>
                            <h3 style="font-size: 0.9rem; text-transform: uppercase; color: #64748b; margin-bottom: 10px; letter-spacing: 0.05em; font-weight: 700;">How to Improve</h3>
                             <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 15px; border-radius: 4px; color: #1e40af; font-size: 0.95rem; line-height: 1.6;">
                                <ul style="margin: 0 0 0 20px; padding: 0;">
                                    ${exp.improvements.map(i => `<li>${i}</li>`).join('')}
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
             `;
        } else {
            throw new Error("Invalid response from AI");
        }
    } catch (error) {
        console.error(error);
        modal.innerHTML = `
            <div style="background: white; width: 90%; max-width: 400px; padding: 30px; border-radius: 20px; text-align: center;">
                 <h2 style="color: #ef4444; margin-top: 0;">Error</h2>
                 <p>Could not generate explanation. Please try again.</p>
                 <button onclick="document.getElementById('${modalId}').style.display='none'" style="margin-top: 15px; padding: 8px 16px; background: #333; color: white; border: none; border-radius: 6px; cursor: pointer;">Close</button>
            </div>
         `;
    }
}

// ===== RECOMMENDATIONS BY INTERESTS (NO LOGIN REQUIRED) =====
function getRecommendationsByInterests(interests) {
    let filtered = internships.filter(i => (i.sector || '').includes(interests));

    if (filtered.length === 0 || interests === 'Information Technology') {
        interests = 'Information Technology';
        filtered = internships.filter(i => (i.sector || '').includes('Technology'));
    }
    return filtered.slice(0, 5);
}

function displayRecommendations(recommendations) {
    const container = document.getElementById('recommendationCards');
    if (!container) return;
    container.innerHTML = '';

    recommendations.forEach((internship, index) => {
        const card = document.createElement('div');
        card.className = 'recommendation-card';
        card.onclick = () => openModal(internship);

        card.innerHTML = `
      <div class="recommendation-number num-${index + 1}">${index + 1}</div>
      <div class="recommendation-content">
        <h3 class="recommendation-title">${internship.role}</h3>
        <p class="recommendation-company">${internship.company}</p>
        <div style="margin-top: 8px; font-size: 0.9em; color: #666;">
            <span class="recommendation-detail">ðŸ“ ${internship.location}</span>
            <span class="recommendation-detail">ðŸ¢ ${internship.sector}</span>
        </div>
      </div>
    `;
        container.appendChild(card);
    });
}

function backToForm() {
    const recSection = document.getElementById('recommendationResults');
    const formSection = document.getElementById('profileFormSection');

    if (recSection) recSection.innerHTML = '';
    if (formSection) {
        formSection.style.display = 'block';
        formSection.scrollIntoView({ behavior: 'smooth' });
    } else {
        window.location.reload();
    }
}

// Save and Load Profile (using JavaScript variables)

function saveProfile() {
    const nameInput = document.getElementById('name');
    const qualificationInput = document.getElementById('qualification');
    const skillsInput = document.getElementById('skills');
    const stateInput = document.getElementById('state');
    const sectorInput = document.getElementById('sector');

    if (!nameInput || !stateInput) {
        alert("Form not found!");
        return;
    }

    savedProfileData = {
        name: nameInput.value,
        qualification: qualificationInput.value,
        skills: skillsInput.value,
        state: stateInput.value,
        sector: sectorInput ? sectorInput.value : ''
    };

    alert('Profile saved temporarily! You can load it anytime during this session.');
}

function loadProfile() {
    if (!savedProfileData) {
        alert('No saved profile found. Please fill out the form and click "Save My Profile" first.');
        return;
    }

    document.getElementById('name').value = savedProfileData.name;
    document.getElementById('qualification').value = savedProfileData.qualification;
    document.getElementById('skills').value = savedProfileData.skills;
    document.getElementById('state').value = savedProfileData.state;
    if (document.getElementById('sector')) {
        document.getElementById('sector').value = savedProfileData.sector;
    }

    alert('Profile loaded!');
}
function populateBrowseFilters() {
  const sectorContainer = document.getElementById('sectorCheckboxes');
  const locationContainer = document.getElementById('locationCheckboxes');

  // Get unique sectors and locations (filter out null/undefined values)
  const sectors = [...new Set(internships.map(i => i.sector).filter(s => s != null))];
  const locations = [...new Set(internships.map(i => i.location).filter(l => l != null))];

  sectors.forEach(sector => {
    const div = document.createElement('div');
    div.className = 'checkbox-item';
    const id = `sector-${sector.replace(/[^a-zA-Z0-9]/g, '-')}`;
    div.innerHTML = `
  <input type="checkbox" id="${id}" value="${sector}" onchange="applyBrowseFilters()">
    <label for="${id}">${sector}</label>
`;
    sectorContainer.appendChild(div);
  });

  locations.forEach(location => {
    const div = document.createElement('div');
    div.className = 'checkbox-item';
    const id = `location-${location.replace(/[^a-zA-Z0-9]/g, '-')}`;
    div.innerHTML = `
  <input type="checkbox" id="${id}" value="${location}" onchange="applyBrowseFilters()">
    <label for="${id}">${location}</label>
`;
    locationContainer.appendChild(div);
  });
}

function loadBrowseInternships() {
  const container = document.getElementById('browseInternshipsList');
  container.innerHTML = '';

  internships.forEach(internship => {
    const card = createInternshipCard(internship);
    container.appendChild(card);
  });
}

function applyBrowseFilters() {
  // Get selected sectors
  const sectorCheckboxes = document.querySelectorAll('#sectorCheckboxes input[type="checkbox"]:checked');
  const selectedSectors = Array.from(sectorCheckboxes).map(cb => cb.value);

  // Get selected locations
  const locationCheckboxes = document.querySelectorAll('#locationCheckboxes input[type="checkbox"]:checked');
  const selectedLocations = Array.from(locationCheckboxes).map(cb => cb.value);

  // Filter internships
  let filtered = [...internships];

  if (selectedSectors.length > 0) {
    filtered = filtered.filter(i => selectedSectors.includes(i.sector));
  }

  if (selectedLocations.length > 0) {
    filtered = filtered.filter(i => selectedLocations.includes(i.location));
  }

  // Display filtered results
  const container = document.getElementById('browseInternshipsList');
  container.innerHTML = '';

  if (filtered.length === 0) {
    container.innerHTML = '<p style="text-align: center; padding: 40px; color: var(--color-text-secondary); grid-column: 1/-1;">No internships found matching your filters.</p>';
    return;
  }

  filtered.forEach(internship => {
    const card = createInternshipCard(internship);
    container.appendChild(card);
  });
}

function resetBrowseFilters() {
  // Uncheck all checkboxes
  const allCheckboxes = document.querySelectorAll('#sectorCheckboxes input[type="checkbox"], #locationCheckboxes input[type="checkbox"]');
  allCheckboxes.forEach(cb => cb.checked = false);

  // Reload all internships
  loadBrowseInternships();
}

// Browse All Page Functions
function initializeBrowseAllPage() {
  // Populate sector filter
  const sectorSelect = document.getElementById('sectorFilterSelect');
  if (sectorSelect) {
    const sectors = [...new Set(internships.map(i => i.sector).filter(s => s != null))].sort();
    sectors.forEach(sector => {
      const option = document.createElement('option');
      option.value = sector;
      option.textContent = sector;
      sectorSelect.appendChild(option);
    });
  }

  // Populate location filter
  const locationSelect = document.getElementById('locationFilterSelect');
  if (locationSelect) {
    const locations = [...new Set(internships.map(i => i.location).filter(l => l != null))].sort();
    locations.forEach(location => {
      const option = document.createElement('option');
      option.value = location;
      option.textContent = location;
      locationSelect.appendChild(option);
    });
  }

  // Load all internships initially
  loadBrowseAllInternships();
}

function loadBrowseAllInternships() {
  const container = document.getElementById('browseAllGrid');
  if (!container) return;

  container.innerHTML = '';

  if (filteredBrowseAll.length === 0) {
    container.innerHTML = '<p style="text-align: center; padding: 40px; color: var(--color-text-secondary); grid-column: 1/-1;">No internships found matching your criteria.</p>';
    updateResultsCount();
    return;
  }

  // Display all internships (no pagination)
  filteredBrowseAll.forEach(internship => {
    const card = createBrowseAllCard(internship);
    container.appendChild(card);
  });

  updateResultsCount();
}

function createBrowseAllCard(internship) {
  const card = document.createElement('div');
  card.className = 'browse-internship-card';
  card.onclick = () => openModal(internship);

  card.innerHTML = `
    <div class="card-body">
      <p style="font-weight: bold; font-size: 1.3em; margin: 0 0 8px 0;">${internship.company}</p>
      <h3 style="margin: 0 0 12px 0;">${internship.role}</h3>
      <div class="card-location">
        <span>ðŸ“</span>
        <span>${internship.location}</span>
      </div>
      <div>
        <span class="sector-badge">${internship.sector}</span>
      </div>
      <div class="card-info-item">
        <span>â±ï¸</span>
        <span>${internship.duration}</span>
      </div>
    </div>
    <div class="card-footer">
      <span class="card-stipend">â‚¹5,000/month</span>
      <button class="btn btn-primary">View Details</button>
    </div>
`;

  // Add click handler to button that doesn't propagate
  const button = card.querySelector('.btn-primary');
  button.onclick = (e) => {
    e.stopPropagation();
    openModal(internship);
  };

  return card;
}

function searchBrowseAll() {
  const searchInput = document.getElementById('browseSearchInput');
  browseAllFilters.search = searchInput.value.toLowerCase();
  applyAllBrowseFilters();
}

function filterBrowseAll() {
  const sectorSelect = document.getElementById('sectorFilterSelect');
  const locationSelect = document.getElementById('locationFilterSelect');

  browseAllFilters.sector = sectorSelect.value;
  browseAllFilters.location = locationSelect.value;

  applyAllBrowseFilters();
}

function sortBrowseAll() {
  const sortSelect = document.getElementById('sortBySelect');
  browseAllFilters.sort = sortSelect.value;
  applyAllBrowseFilters();
}

function applyAllBrowseFilters() {
  // Start with all internships
  let filtered = [...internships];

  // Apply search filter
  if (browseAllFilters.search) {
    filtered = filtered.filter(internship => {
      return internship.company.toLowerCase().includes(browseAllFilters.search) ||
        internship.role.toLowerCase().includes(browseAllFilters.search) ||
        internship.location.toLowerCase().includes(browseAllFilters.search) ||
        internship.sector.toLowerCase().includes(browseAllFilters.search);
    });
  }

  // Apply sector filter
  if (browseAllFilters.sector) {
    filtered = filtered.filter(i => i.sector === browseAllFilters.sector);
  }

  // Apply location filter
  if (browseAllFilters.location) {
    filtered = filtered.filter(i => i.location === browseAllFilters.location);
  }

  // Apply sorting
  if (browseAllFilters.sort === 'company') {
    filtered.sort((a, b) => a.company.localeCompare(b.company));
  } else if (browseAllFilters.sort === 'location') {
    filtered.sort((a, b) => a.location.localeCompare(b.location));
  }
  // 'recent' keeps original order

  filteredBrowseAll = filtered;
  loadBrowseAllInternships();
}

function clearAllBrowseFilters() {
  // Reset all filters
  browseAllFilters = {
    search: '',
    sector: '',
    location: '',
    sort: 'recent'
  };

  // Reset UI elements
  document.getElementById('browseSearchInput').value = '';
  document.getElementById('sectorFilterSelect').value = '';
  document.getElementById('locationFilterSelect').value = '';
  document.getElementById('sortBySelect').value = 'recent';

  // Reload all internships
  filteredBrowseAll = [...internships];
  loadBrowseAllInternships();
}

function updateResultsCount() {
  const counter = document.getElementById('resultsCount');
  if (counter) {
    counter.textContent = `Showing ${filteredBrowseAll.length} internships`;
  }
}

function updateBrowseAllPagination() {
  const paginationContainer = document.getElementById('browseAllPagination');
  if (!paginationContainer) return;

  // Show/hide pagination based on number of pages
  if (browseAllPagination.totalPages <= 1) {
    paginationContainer.style.display = 'none';
    return;
  }

  paginationContainer.style.display = 'flex';
  paginationContainer.innerHTML = '';

  // Previous button
  const prevBtn = document.createElement('button');
  prevBtn.textContent = 'â† Previous';
  prevBtn.className = 'pagination-btn';
  prevBtn.disabled = browseAllPagination.currentPage === 1;
  prevBtn.onclick = () => {
    if (browseAllPagination.currentPage > 1) {
      browseAllPagination.currentPage--;
      loadBrowseAllInternships();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };
  paginationContainer.appendChild(prevBtn);

  // Page info
  const pageInfo = document.createElement('span');
  pageInfo.className = 'pagination-info';
  pageInfo.textContent = `Page ${browseAllPagination.currentPage} of ${browseAllPagination.totalPages}`;
  paginationContainer.appendChild(pageInfo);

  // Next button
  const nextBtn = document.createElement('button');
  nextBtn.textContent = 'Next â†’';
  nextBtn.className = 'pagination-btn';
  nextBtn.disabled = browseAllPagination.currentPage === browseAllPagination.totalPages;
  nextBtn.onclick = () => {
    if (browseAllPagination.currentPage < browseAllPagination.totalPages) {
      browseAllPagination.currentPage++;
      loadBrowseAllInternships();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };
  paginationContainer.appendChild(nextBtn);
}

// Contact Form
function handleContactSubmit(e) {
  e.preventDefault();

  const name = document.getElementById('contactName').value;
  const email = document.getElementById('contactEmail').value;
  const message = document.getElementById('contactMessage').value;

  // In a real application, this would send data to a server
  alert(`Thank you ${name} !Your message has been received.We will get back to you at ${email} soon.`);

  // Reset form
  document.getElementById('contactForm').reset();
}

function copyCoverLetter() {
  const textarea = document.querySelector('#generatedCoverLetter textarea');
  if (textarea) {
    navigator.clipboard.writeText(textarea.value).then(() => alert("Copied!"));
  }
}

// --- INTERVIEW COACH LOGIC ---
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

  if (currentInternship) {
    contextEl.textContent = `Practice for ${currentInternship.role} @${currentInternship.company} `;
  }

  // Reset Chat
  interviewHistory = [];
  chatArea.innerHTML = `
  <div class="chat-msg model" style="background: #f1f5f9; padding: 10px 15px; border-radius: 12px 12px 12px 0; align-self: flex-start; max-width: 80%; line-height: 1.5; color: #334155;">
      ðŸ‘‹ Hi! I'm your AI Interviewer. I've reviewed the job description for <strong>${currentInternship?.role || 'this role'}</strong>. 
      <br><br>Let's start with a quick introduction. Tell me about yourself.
  </div>
  `;

  modal.classList.add('active');
  setTimeout(() => document.getElementById('interviewInput')?.focus(), 100);
}

function closeInterviewModal() {
  document.getElementById('interviewModal').classList.remove('active');
}

async function handleInterviewSubmit(e) {
  e.preventDefault();
  const input = document.getElementById('interviewInput');
  const text = input.value.trim();
  if (!text) return;

  // Add User Message
  appendChatMessage(text, 'user');
  input.value = '';

  // Show Typing Indicator
  const typingId = 'typing-' + Date.now();
  const chatArea = document.getElementById('interviewChatArea');
  chatArea.insertAdjacentHTML('beforeend', `
  <div id="${typingId}" class="chat-msg model" style="background: #f1f5f9; padding: 10px 15px; border-radius: 12px 12px 12px 0; align-self: flex-start; max-width: 80%; color: #94a3b8; font-style: italic;">
    Thinking...
    </div>
  `);
  chatArea.scrollTop = chatArea.scrollHeight;

  try {
    interviewHistory.push({ sender: 'user', text: text });

    // Call user-defined API
    const res = await fetch(`${API_BASE}/ai/interview-chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        history: interviewHistory,
        role: currentInternship?.role || 'Intern',
        company: currentInternship?.company || 'Company'
      })
    });

    const data = await res.json();
    const typingEl = document.getElementById(typingId);
    if (typingEl) typingEl.remove();

    if (data.success) {
      const reply = data.data.reply;
      appendChatMessage(reply, 'model');
      interviewHistory.push({ sender: 'model', text: reply });
    } else {
      appendChatMessage("âŒ Error connecting to AI Coach.", 'model');
    }
  } catch (err) {
    const typingEl = document.getElementById(typingId);
    if (typingEl) typingEl.remove();
    appendChatMessage("âŒ Network error.", 'model');
  }
}

function appendChatMessage(text, sender) {
  const chatArea = document.getElementById('interviewChatArea');
  const div = document.createElement('div');
  div.className = `chat-msg ${sender}`;

  const bg = sender === 'user' ? '#0d9488' : '#f1f5f9';
  const color = sender === 'user' ? '#fff' : '#334155';
  const radius = sender === 'user' ? '12px 12px 0 12px' : '12px 12px 12px 0';
  const align = sender === 'user' ? 'flex-end' : 'flex-start';

  div.style.cssText = `
background: ${bg};
color: ${color};
padding: 10px 15px;
border-radius: ${radius};
align-self: ${align};
max-width: 80%;
line-height: 1.5;
word-wrap: break-word;
box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
`;
  div.innerHTML = text.replace(/\n/g, '<br>');

  chatArea.appendChild(div);
  chatArea.scrollTop = chatArea.scrollHeight;
}

// ===== PAGE INITIALIZATION =====
// Load internships when the page loads
document.addEventListener('DOMContentLoaded', () => {
  console.log('ðŸš€ Page loaded, initializing internships...');

  // Check if we're on a page with the browse internships list
  const browseContainer = document.getElementById('browseInternshipsList');
  if (browseContainer) {
    console.log('ðŸ“‹ Browse All page detected, loading internships...');
    loadIntershipDataFromBackend();
  }

  // Also check for recommendation cards container
  const recContainer = document.getElementById('recommendationCards');
  if (recContainer && !browseContainer) {
    console.log('ðŸŽ¯ Recommendations page detected, loading internships...');
    loadIntershipDataFromBackend();
  }
});
 
 / /   ð x¤    A I   E x p l a n a t i o n   F u n c t i o n 
 
 a s y n c   f u n c t i o n   g e t M a t c h E x p l a n a t i o n ( i n t e r n s h i p )   { 
 
         / /   C o l l e c t   u s e r   p r o f i l e   d a t a   ( r e u s e   e x i s t i n g   s t a t e   o r   f o r m   d a t a ) 
 
         l e t   s t u d e n t P r o f i l e   =   n u l l ; 
 
         
 
         / /   A t t e m p t   t o   g e t   f r o m   p a g i n a t i o n S t a t e   f i r s t   ( i f   u s e d ) 
 
         i f   ( t y p e o f   p a g i n a t i o n S t a t e   ! = =   ' u n d e f i n e d '   & &   p a g i n a t i o n S t a t e . u s e r S k i l l s )   { 
 
                 s t u d e n t P r o f i l e   =   { 
 
                         s k i l l s :   p a g i n a t i o n S t a t e . u s e r S k i l l s , 
 
                         q u a l i f i c a t i o n :   ' N o t   s p e c i f i e d ' ,   / /   D e f a u l t   i f   m i s s i n g 
 
                         p r e f e r r e d _ s t a t e :   p a g i n a t i o n S t a t e . u s e r L o c a t i o n , 
 
                         c g p a :   7 . 5 
 
                 } ; 
 
         }   
 
         
 
         / /   A t t e m p t   t o   g e t   f r o m   f o r m   i n p u t s   i f   a v a i l a b l e 
 
         c o n s t   n a m e I n p u t   =   d o c u m e n t . g e t E l e m e n t B y I d ( ' n a m e ' ) ; 
 
         c o n s t   s k i l l s I n p u t   =   d o c u m e n t . g e t E l e m e n t B y I d ( ' s k i l l s ' ) ; 
 
         c o n s t   l o c I n p u t   =   d o c u m e n t . g e t E l e m e n t B y I d ( ' s t a t e ' ) ; 
 
         c o n s t   q u a l I n p u t   =   d o c u m e n t . g e t E l e m e n t B y I d ( ' q u a l i f i c a t i o n ' ) ; 
 
 
 
         i f   ( s k i l l s I n p u t   & &   l o c I n p u t )   { 
 
                 s t u d e n t P r o f i l e   =   { 
 
                         n a m e :   n a m e I n p u t   ?   n a m e I n p u t . v a l u e   :   ' U s e r ' , 
 
                         s k i l l s :   s k i l l s I n p u t . v a l u e . s p l i t ( ' , ' ) . m a p ( s   = >   s . t r i m ( ) ) . f i l t e r ( s   = >   s ) , 
 
                         p r e f e r r e d _ s t a t e :   l o c I n p u t . v a l u e , 
 
                         q u a l i f i c a t i o n :   q u a l I n p u t   ?   q u a l I n p u t . v a l u e   :   ' S t u d e n t ' , 
 
                         c g p a :   7 . 5 
 
                 } ; 
 
         } 
 
 
 
         i f   ( ! s t u d e n t P r o f i l e )   { 
 
                 a l e r t ( " P l e a s e   f i l l   o u t   y o u r   p r o f i l e   d e t a i l s   f i r s t   t o   g e t   a n   A I   e x p l a n a t i o n . " ) ; 
 
                 r e t u r n ; 
 
         } 
 
 
 
         / /   S h o w   L o a d i n g   M o d a l 
 
         c o n s t   m o d a l I d   =   ' a i - e x p l a n a t i o n - m o d a l ' ; 
 
         l e t   m o d a l   =   d o c u m e n t . g e t E l e m e n t B y I d ( m o d a l I d ) ; 
 
         i f   ( ! m o d a l )   { 
 
                 m o d a l   =   d o c u m e n t . c r e a t e E l e m e n t ( ' d i v ' ) ; 
 
                 m o d a l . i d   =   m o d a l I d ; 
 
                 m o d a l . s t y l e . c s s T e x t   =   ` 
 
                         p o s i t i o n :   f i x e d ;   t o p :   0 ;   l e f t :   0 ;   w i d t h :   1 0 0 % ;   h e i g h t :   1 0 0 % ; 
 
                         b a c k g r o u n d :   r g b a ( 0 , 0 , 0 , 0 . 6 ) ;   b a c k d r o p - f i l t e r :   b l u r ( 4 p x ) ; 
 
                         z - i n d e x :   1 0 0 0 0 ;   d i s p l a y :   f l e x ;   j u s t i f y - c o n t e n t :   c e n t e r ;   a l i g n - i t e m s :   c e n t e r ; 
 
                 ` ; 
 
                 d o c u m e n t . b o d y . a p p e n d C h i l d ( m o d a l ) ; 
 
         } 
 
 
 
         m o d a l . i n n e r H T M L   =   ` 
 
                 < d i v   s t y l e = " b a c k g r o u n d :   w h i t e ;   w i d t h :   9 0 % ;   m a x - w i d t h :   6 0 0 p x ;   p a d d i n g :   3 0 p x ;   b o r d e r - r a d i u s :   2 0 p x ;   b o x - s h a d o w :   0   2 0 p x   5 0 p x   r g b a ( 0 , 0 , 0 , 0 . 2 ) ;   a n i m a t i o n :   p o p I n   0 . 3 s   c u b i c - b e z i e r ( 0 . 1 8 ,   0 . 8 9 ,   0 . 3 2 ,   1 . 2 8 ) ; " > 
 
                         < d i v   s t y l e = " t e x t - a l i g n :   c e n t e r ; " > 
 
                                 < d i v   s t y l e = " f o n t - s i z e :   4 0 p x ;   m a r g i n - b o t t o m :   2 0 p x ; " > â S¨ < / d i v > 
 
                                 < h 2   s t y l e = " m a r g i n :   0   0   1 0 p x   0 ;   c o l o r :   # 1 e 2 9 3 b ; " > A n a l y z i n g   F i t . . . < / h 2 > 
 
                                 < p   s t y l e = " c o l o r :   # 6 4 7 4 8 b ; " > A s k i n g   G e m i n i   A I   w h y   t h i s   m a t c h e s   y o u . < / p > 
 
                                 < d i v   s t y l e = " m a r g i n - t o p :   2 0 p x ;   w i d t h :   1 0 0 % ;   h e i g h t :   4 p x ;   b a c k g r o u n d :   # f 1 f 5 f 9 ;   b o r d e r - r a d i u s :   2 p x ;   o v e r f l o w :   h i d d e n ; " > 
 
                                         < d i v   s t y l e = " w i d t h :   5 0 % ;   h e i g h t :   1 0 0 % ;   b a c k g r o u n d :   # 6 3 6 6 f 1 ;   a n i m a t i o n :   l o a d i n g B a r   1 . 5 s   i n f i n i t e   l i n e a r ; " > < / d i v > 
 
                                 < / d i v > 
 
                         < / d i v > 
 
                 < / d i v > 
 
                 < s t y l e > 
 
                         @ k e y f r a m e s   p o p I n   {   f r o m   {   t r a n s f o r m :   s c a l e ( 0 . 9 ) ;   o p a c i t y :   0 ;   }   t o   {   t r a n s f o r m :   s c a l e ( 1 ) ;   o p a c i t y :   1 ;   }   } 
 
                         @ k e y f r a m e s   l o a d i n g B a r   {   f r o m   {   t r a n s f o r m :   t r a n s l a t e X ( - 1 0 0 % ) ;   }   t o   {   t r a n s f o r m :   t r a n s l a t e X ( 2 0 0 % ) ;   }   } 
 
                 < / s t y l e > 
 
         ` ; 
 
         m o d a l . s t y l e . d i s p l a y   =   ' f l e x ' ; 
 
 
 
         t r y   { 
 
                 c o n s t   r e s   =   a w a i t   f e t c h ( ` $ { A P I _ B A S E } / a i / e x p l a i n - m a t c h ` ,   { 
 
                           m e t h o d :   ' P O S T ' , 
 
                           h e a d e r s :   {   ' C o n t e n t - T y p e ' :   ' a p p l i c a t i o n / j s o n '   } , 
 
                           b o d y :   J S O N . s t r i n g i f y ( { 
 
                                   s t u d e n t :   s t u d e n t P r o f i l e , 
 
                                   i n t e r n s h i p :   i n t e r n s h i p 
 
                           } ) 
 
                 } ) ; 
 
                 
 
                 c o n s t   d a t a   =   a w a i t   r e s . j s o n ( ) ; 
 
                 
 
                 i f   ( d a t a . s u c c e s s   & &   d a t a . e x p l a n a t i o n )   { 
 
                           c o n s t   e x p   =   d a t a . e x p l a n a t i o n ; 
 
                           
 
                           m o d a l . i n n e r H T M L   =   ` 
 
                                 < d i v   s t y l e = " b a c k g r o u n d :   w h i t e ;   w i d t h :   9 0 % ;   m a x - w i d t h :   6 0 0 p x ;   p a d d i n g :   0 ;   b o r d e r - r a d i u s :   2 0 p x ;   o v e r f l o w :   h i d d e n ;   b o x - s h a d o w :   0   2 0 p x   5 0 p x   r g b a ( 0 , 0 , 0 , 0 . 2 ) ;   d i s p l a y :   f l e x ;   f l e x - d i r e c t i o n :   c o l u m n ;   m a x - h e i g h t :   9 0 v h ; " > 
 
                                         < ! - -   H e a d e r   - - > 
 
                                         < d i v   s t y l e = " b a c k g r o u n d :   l i n e a r - g r a d i e n t ( 1 3 5 d e g ,   # 6 3 6 6 f 1   0 % ,   # 4 f 4 6 e 5   1 0 0 % ) ;   p a d d i n g :   2 5 p x ;   c o l o r :   w h i t e ;   d i s p l a y :   f l e x ;   j u s t i f y - c o n t e n t :   s p a c e - b e t w e e n ;   a l i g n - i t e m s :   c e n t e r ; " > 
 
                                                 < h 2   s t y l e = " m a r g i n :   0 ;   f o n t - s i z e :   1 . 4 r e m ; " > ð x ¡   M a t c h   A n a l y s i s < / h 2 > 
 
                                                 < b u t t o n   o n c l i c k = " d o c u m e n t . g e t E l e m e n t B y I d ( ' $ { m o d a l I d } ' ) . s t y l e . d i s p l a y = ' n o n e ' "   s t y l e = " b a c k g r o u n d :   r g b a ( 2 5 5 , 2 5 5 , 2 5 5 , 0 . 2 ) ;   b o r d e r :   n o n e ;   c o l o r :   w h i t e ;   w i d t h :   3 2 p x ;   h e i g h t :   3 2 p x ;   b o r d e r - r a d i u s :   5 0 % ;   c u r s o r :   p o i n t e r ;   f o n t - s i z e :   1 . 2 r e m ; " > Ã  < / b u t t o n > 
 
                                         < / d i v > 
 
                                         
 
                                         < ! - -   C o n t e n t   - - > 
 
                                         < d i v   s t y l e = " p a d d i n g :   3 0 p x ;   o v e r f l o w - y :   a u t o ; " > 
 
                                                 < d i v   s t y l e = " m a r g i n - b o t t o m :   2 4 p x ; " > 
 
                                                         < h 3   s t y l e = " f o n t - s i z e :   0 . 9 r e m ;   t e x t - t r a n s f o r m :   u p p e r c a s e ;   c o l o r :   # 6 4 7 4 8 b ;   m a r g i n - b o t t o m :   1 0 p x ;   l e t t e r - s p a c i n g :   0 . 0 5 e m ;   f o n t - w e i g h t :   7 0 0 ; " > W h y   i t   f i t s < / h 3 > 
 
                                                         < d i v   s t y l e = " b a c k g r o u n d :   # f 0 f d f 4 ;   b o r d e r - l e f t :   4 p x   s o l i d   # 1 0 b 9 8 1 ;   p a d d i n g :   1 5 p x ;   b o r d e r - r a d i u s :   4 p x ;   c o l o r :   # 0 6 5 f 4 6 ;   f o n t - s i z e :   0 . 9 5 r e m ;   l i n e - h e i g h t :   1 . 6 ; " > 
 
                                                                 $ { e x p . s u m m a r y } 
 
                                                                 < u l   s t y l e = " m a r g i n :   1 0 p x   0   0   2 0 p x ;   p a d d i n g :   0 ;   c o l o r :   # 0 4 7 8 5 7 ; " > 
 
                                                                         $ { e x p . r e a s o n s . m a p ( r   = >   ` < l i > $ { r } < / l i > ` ) . j o i n ( ' ' ) } 
 
                                                                 < / u l > 
 
                                                         < / d i v > 
 
                                                 < / d i v > 
 
 
 
                                                 < d i v   s t y l e = " m a r g i n - b o t t o m :   2 4 p x ; " > 
 
                                                         < h 3   s t y l e = " f o n t - s i z e :   0 . 9 r e m ;   t e x t - t r a n s f o r m :   u p p e r c a s e ;   c o l o r :   # 6 4 7 4 8 b ;   m a r g i n - b o t t o m :   1 0 p x ;   l e t t e r - s p a c i n g :   0 . 0 5 e m ;   f o n t - w e i g h t :   7 0 0 ; " > G a p   A n a l y s i s < / h 3 > 
 
                                                         < d i v   s t y l e = " b a c k g r o u n d :   # f f f 1 f 2 ;   b o r d e r - l e f t :   4 p x   s o l i d   # f 4 3 f 5 e ;   p a d d i n g :   1 5 p x ;   b o r d e r - r a d i u s :   4 p x ;   c o l o r :   # 9 f 1 2 3 9 ;   f o n t - s i z e :   0 . 9 5 r e m ;   l i n e - h e i g h t :   1 . 6 ; " > 
 
                                                                 $ { e x p . l i m i t a t i o n s } 
 
                                                         < / d i v > 
 
                                                 < / d i v > 
 
 
 
                                                   < d i v > 
 
                                                         < h 3   s t y l e = " f o n t - s i z e :   0 . 9 r e m ;   t e x t - t r a n s f o r m :   u p p e r c a s e ;   c o l o r :   # 6 4 7 4 8 b ;   m a r g i n - b o t t o m :   1 0 p x ;   l e t t e r - s p a c i n g :   0 . 0 5 e m ;   f o n t - w e i g h t :   7 0 0 ; " > H o w   t o   I m p r o v e < / h 3 > 
 
                                                           < d i v   s t y l e = " b a c k g r o u n d :   # e f f 6 f f ;   b o r d e r - l e f t :   4 p x   s o l i d   # 3 b 8 2 f 6 ;   p a d d i n g :   1 5 p x ;   b o r d e r - r a d i u s :   4 p x ;   c o l o r :   # 1 e 4 0 a f ;   f o n t - s i z e :   0 . 9 5 r e m ;   l i n e - h e i g h t :   1 . 6 ; " > 
 
                                                                 < u l   s t y l e = " m a r g i n :   0   0   0   2 0 p x ;   p a d d i n g :   0 ; " > 
 
                                                                         $ { e x p . i m p r o v e m e n t s . m a p ( i   = >   ` < l i > $ { i } < / l i > ` ) . j o i n ( ' ' ) } 
 
                                                                 < / u l > 
 
                                                         < / d i v > 
 
                                                 < / d i v > 
 
                                         < / d i v > 
 
                                 < / d i v > 
 
                           ` ; 
 
                 }   e l s e   { 
 
                           t h r o w   n e w   E r r o r ( " I n v a l i d   r e s p o n s e   f r o m   A I " ) ; 
 
                 } 
 
         }   c a t c h   ( e r r o r )   { 
 
                   c o n s o l e . e r r o r ( e r r o r ) ; 
 
                   m o d a l . i n n e r H T M L   =   ` 
 
                         < d i v   s t y l e = " b a c k g r o u n d :   w h i t e ;   w i d t h :   9 0 % ;   m a x - w i d t h :   4 0 0 p x ;   p a d d i n g :   1 0 p x ;   b o r d e r - r a d i u s :   2 0 p x ;   t e x t - a l i g n :   c e n t e r ; " > 
 
                                   < h 2   s t y l e = " c o l o r :   # e f 4 4 4 4 ;   m a r g i n - t o p :   5 p x ; " > E r r o r < / h 2 > 
 
                                   < p > C o u l d   n o t   g e n e r a t e   e x p l a n a t i o n .   P l e a s e   t r y   a g a i n . < / p > 
 
                                   < b u t t o n   o n c l i c k = " d o c u m e n t . g e t E l e m e n t B y I d ( ' $ { m o d a l I d } ' ) . s t y l e . d i s p l a y = ' n o n e ' "   s t y l e = " m a r g i n - t o p :   1 5 p x ;   p a d d i n g :   8 p x   1 6 p x ;   b a c k g r o u n d :   # 3 3 3 ;   c o l o r :   w h i t e ;   b o r d e r :   n o n e ;   b o r d e r - r a d i u s :   6 p x ;   c u r s o r :   p o i n t e r ; " > C l o s e < / b u t t o n > 
 
                         < / d i v > 
 
                   ` ; 
 
         } 
 
 } 
 
 
