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
            <span style="color: #ef4444;">📍</span> ${locationDisplay}
          </span>
          <span style="display: flex; align-items: center; gap: 6px;">
            <span style="color: #3b82f6;">🏢</span> ${internship.sector || 'Technology'}
          </span>
          <span style="display: flex; align-items: center; gap: 6px;">
            <span style="color: #f59e0b;">💰</span> ${internship.stipend || 'N/A'}
          </span>
          <span style="display: flex; align-items: center; gap: 6px;">
            <span style="color: #8b5cf6;">⏱️</span> ${internship.duration || 'N/A'}
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
