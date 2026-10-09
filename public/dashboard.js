document.addEventListener('DOMContentLoaded', async () => {
  let token = localStorage.getItem('card_token');

  // DOM Elements
  const userDisplayEmail = document.getElementById('user-display-email');
  const logoutBtn = document.getElementById('logout-btn');
  const vanityUrlLink = document.getElementById('vanity-url-link');
  const copyUrlBtn = document.getElementById('copy-url-btn');
  const openLiveBtn = document.getElementById('open-live-btn');
  const cardEditorForm = document.getElementById('card-editor-form');
  const saveCardBtn = document.getElementById('save-card-btn');
  const previewUsernameTag = document.getElementById('preview-username-tag');
  const liveCardIframe = document.getElementById('live-card-iframe');
  const nativeCardContainer = document.getElementById('card-element');
  const toastElement = document.getElementById('toast-notification');
  const toastMessage = document.getElementById('toast-message');

  // Theme Elements
  const themeToggleBtn = document.getElementById('theme-toggle-btn');
  const themeIcon = document.getElementById('theme-icon');
  const themeText = document.getElementById('theme-text');

  // Minimal Wizard Elements
  const activeStepNum = document.getElementById('active-step-num');
  const activeStageName = document.getElementById('active-stage-name');
  const prevStepBtn = document.getElementById('prev-step-btn');
  const nextStepBtn = document.getElementById('next-step-btn');
  const wizardProgressFill = document.getElementById('wizard-progress-fill');
  const stepScreens = document.querySelectorAll('.wizard-step-screen');
  const wizardStepDotsContainer = document.getElementById('wizard-step-dots');
  const avatarPreviewImg = document.getElementById('avatar-preview-img');
  const themeOptionsGrid = document.getElementById('theme-options-grid');

  // View Switcher & Settings Elements
  const tabBtnCards = document.getElementById('tab-btn-cards');
  const tabBtnBuilder = document.getElementById('tab-btn-builder');
  const tabBtnSettings = document.getElementById('tab-btn-settings');
  const builderBackToCardsBtn = document.getElementById('builder-back-to-cards-btn');
  const homeNewCardBtn = document.getElementById('home-new-card-btn');
  const btnQuickCreateCard = document.getElementById('btn-quick-create-card');
  const emptyStateCreateBtn = document.getElementById('empty-state-create-btn');
  const builderActiveCardName = document.getElementById('builder-active-card-name');
  const settingsPasswordForm = document.getElementById('settings-password-form');
  const settingsPassAlert = document.getElementById('settings-pass-alert');
  const settingsSavePassBtn = document.getElementById('settings-save-pass-btn');
  const settingsThemeBtn = document.getElementById('settings-theme-toggle-btn');
  const settingsLogoutBtn = document.getElementById('settings-logout-btn');

  // Input Fields
  const editFullName = document.getElementById('edit-fullName');
  const editRoleTitle = document.getElementById('edit-roleTitle');
  const editPositioningStatement = document.getElementById('edit-positioningStatement');
  const editCapabilities = document.getElementById('edit-capabilities');
  const editEditionMark = document.getElementById('edit-editionMark');
  const editBrandSubmark = document.getElementById('edit-brandSubmark');
  const editTheme = document.getElementById('edit-theme');
  const editEmail = document.getElementById('edit-email');
  const editPhone = document.getElementById('edit-phone');
  const editWhatsapp = document.getElementById('edit-whatsapp');
  const editLinkedinUrl = document.getElementById('edit-linkedinUrl');
  const editPortfolioUrl = document.getElementById('edit-portfolioUrl');
  const editPhotoFile = document.getElementById('edit-photoFile');

  let currentUser = null;
  let currentCard = null;
  let userCards = [];
  let currentCardId = null;
  let isLoggedIn = false;
  let toastTimeout = null;
  let draftPhotoUrl = null;
  let currentStep = 1;

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
  const totalSteps = 10;

  const stageNames = [
    "Personal Details",
    "Professional Role",
    "Bio & Tagline",
    "Profile Photo",
    "Skills & Tags",
    "Card Palette",
    "Event Name",
    "Contact Details",
    "Social Links",
    "Account Creation"
  ];

  // Render 9 Minimal Step Dots
  if (wizardStepDotsContainer) {
    wizardStepDotsContainer.innerHTML = '';
    for (let i = 1; i <= totalSteps; i++) {
      const dot = document.createElement('span');
      dot.className = 'step-dot' + (i === 1 ? ' active' : '');
      dot.setAttribute('data-dot-step', i);
      dot.onclick = () => goToStep(i);
      wizardStepDotsContainer.appendChild(dot);
    }
  }

  // --------------------------------------------------------------------------
  // THEME MANAGEMENT (LIGHT & DARK MODE)
  // --------------------------------------------------------------------------
  function initTheme() {
    const savedTheme = localStorage.getItem('dashboard_theme') || 'light';
    applyTheme(savedTheme);
  }

  function applyTheme(theme) {
    document.body.setAttribute('data-dashboard-theme', theme);
    localStorage.setItem('dashboard_theme', theme);
    if (theme === 'dark') {
      themeIcon.textContent = '☀️';
      themeText.textContent = 'Light Mode';
    } else {
      themeIcon.textContent = '🌙';
      themeText.textContent = 'Dark Mode';
    }
  }

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      const currentTheme = document.body.getAttribute('data-dashboard-theme') || 'light';
      applyTheme(currentTheme === 'dark' ? 'light' : 'dark');
    });
  }

  // --------------------------------------------------------------------------
  // INTERACTIVE THEME CARD SELECTION (QUESTION 6)
  // --------------------------------------------------------------------------
  if (themeOptionsGrid) {
    const themeCards = themeOptionsGrid.querySelectorAll('.theme-card-option');
    themeCards.forEach(card => {
      card.addEventListener('click', () => {
        const selectedVal = card.getAttribute('data-theme-val');
        editTheme.value = selectedVal;

        themeCards.forEach(c => c.classList.remove('active'));
        card.classList.add('active');

        emitLiveUpdate();
      });
    });
  }

  function syncThemeCardUI(themeVal) {
    if (themeOptionsGrid) {
      const themeCards = themeOptionsGrid.querySelectorAll('.theme-card-option');
      themeCards.forEach(card => {
        if (card.getAttribute('data-theme-val') === themeVal) {
          card.classList.add('active');
        } else {
          card.classList.remove('active');
        }
      });
    }

    const quickThemeDots = document.querySelectorAll('.quick-theme-dot');
    quickThemeDots.forEach(dot => {
      if (dot.getAttribute('data-theme-val') === themeVal) {
        dot.classList.add('active');
      } else {
        dot.classList.remove('active');
      }
    });
  }

  // Quick theme switcher above live preview
  const quickThemesContainer = document.getElementById('preview-quick-themes');
  if (quickThemesContainer) {
    const quickDots = quickThemesContainer.querySelectorAll('.quick-theme-dot');
    quickDots.forEach(dot => {
      dot.addEventListener('click', () => {
        const selectedVal = dot.getAttribute('data-theme-val');
        if (editTheme) editTheme.value = selectedVal;
        syncThemeCardUI(selectedVal);
        emitLiveUpdate();
      });
    });
  }

  // --------------------------------------------------------------------------
  // MINIMAL ONE QUESTION PER SCREEN WIZARD LOGIC
  // --------------------------------------------------------------------------
  function validateWizardState() {
    // 1. Check Full Name (Step 1)
    const nameVal = (editFullName ? editFullName.value : '').trim();
    if (!nameVal) {
      goToStep(1);
      if (editFullName) {
        editFullName.classList.add('input-error');
        editFullName.focus();
      }
      showToast('⚠️ Missing Detail: Please enter your Full Name on Step 01 (Personal Details).');
      return false;
    } else if (editFullName) {
      editFullName.classList.remove('input-error');
    }

    // 2. Check Professional Role Title (Step 2)
    const roleVal = (editRoleTitle ? editRoleTitle.value : '').trim();
    if (!roleVal) {
      goToStep(2);
      if (editRoleTitle) {
        editRoleTitle.classList.add('input-error');
        editRoleTitle.focus();
      }
      showToast('⚠️ Missing Detail: Please enter your Professional Role Title on Step 02 (Professional Role).');
      return false;
    } else if (editRoleTitle) {
      editRoleTitle.classList.remove('input-error');
    }

    return true;
  }

  function goToStep(stepNum) {
    if (stepNum < 1 || stepNum > totalSteps) return;

    // Validate required inputs before advancing forward
    if (stepNum > currentStep) {
      if (currentStep === 1) {
        const nameVal = (editFullName ? editFullName.value : '').trim();
        if (!nameVal) {
          if (editFullName) {
            editFullName.classList.add('input-error');
            editFullName.focus();
          }
          showToast('⚠️ Missing Detail: Please enter your Full Name before continuing.');
          return;
        } else if (editFullName) {
          editFullName.classList.remove('input-error');
        }
      }

      if (currentStep === 2) {
        const roleVal = (editRoleTitle ? editRoleTitle.value : '').trim();
        if (!roleVal) {
          if (editRoleTitle) {
            editRoleTitle.classList.add('input-error');
            editRoleTitle.focus();
          }
          showToast('⚠️ Missing Detail: Please enter your Professional Role Title before continuing.');
          return;
        } else if (editRoleTitle) {
          editRoleTitle.classList.remove('input-error');
        }
      }
    }

    currentStep = stepNum;

    // 1. Update Step Screens
    stepScreens.forEach(screen => {
      const screenStep = parseInt(screen.getAttribute('data-step'), 10);
      if (screenStep === currentStep) {
        screen.classList.add('active');
        const focusableInput = screen.querySelector('input:not([type="file"]), textarea, select');
        if (focusableInput) {
          setTimeout(() => focusableInput.focus(), 150);
        }
      } else {
        screen.classList.remove('active');
      }
    });

    // 2. Update Active Stage Badge & Top Progress Line
    if (activeStepNum) activeStepNum.textContent = `${String(currentStep).padStart(2, '0')} / ${String(totalSteps).padStart(2, '0')}`;
    if (activeStageName) activeStageName.textContent = stageNames[currentStep - 1] || 'Card Setup';

    const progressPercent = Math.round(((currentStep - 1) / (totalSteps - 1)) * 100);
    if (wizardProgressFill) wizardProgressFill.style.width = `${Math.max(11, progressPercent)}%`;

    // 3. Update Step Dots (if present)
    const dots = wizardStepDotsContainer ? wizardStepDotsContainer.querySelectorAll('.step-dot') : [];
    dots.forEach((dot, index) => {
      if (index + 1 === currentStep) {
        dot.classList.add('active');
      } else {
        dot.classList.remove('active');
      }
    });

    // 4. Update Navigation Buttons
    if (prevStepBtn) prevStepBtn.disabled = (currentStep === 1);

    if (currentStep === totalSteps) {
      if (nextStepBtn) nextStepBtn.style.display = 'none';
      if (saveCardBtn) saveCardBtn.style.display = 'inline-flex';
    } else {
      if (nextStepBtn) nextStepBtn.style.display = 'inline-flex';
      if (saveCardBtn) saveCardBtn.style.display = 'none';
    }

    // 5. Auto-rotate preview card: Back face for Contact & Social steps, Front face for Identity steps
    if (nativeCardContainer) {
      if (currentStep === 8 || currentStep === 9) {
        nativeCardContainer.style.transform = 'rotateY(180deg)';
      } else {
        nativeCardContainer.style.transform = 'rotateY(0deg)';
      }
    }
  }

  // Prev / Next Navigation Clicks
  if (prevStepBtn) prevStepBtn.addEventListener('click', () => goToStep(currentStep - 1));
  if (nextStepBtn) nextStepBtn.addEventListener('click', () => goToStep(currentStep + 1));

  // Enter Key Navigation for smooth question flow
  cardEditorForm.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.tagName === 'INPUT' && e.target.type !== 'file') {
      e.preventDefault();
      if (currentStep < totalSteps) {
        goToStep(currentStep + 1);
      }
    }
  });

  function showToast(msg) {
    if (!toastElement) return;
    toastMessage.textContent = msg;
    toastElement.classList.add('is-visible');
    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => toastElement.classList.remove('is-visible'), 3200);
  }

  function showModalAlert(msg, isError = true) {
    if (!modalAuthAlert) return;
    modalAuthAlert.textContent = msg;
    modalAuthAlert.className = 'modal-alert ' + (isError ? 'alert-error' : 'alert-success');
    modalAuthAlert.style.display = 'block';
  }

  function hideModalAlert() {
    if (modalAuthAlert) modalAuthAlert.style.display = 'none';
  }

  // Check User Session asynchronously without blocking event binding & function setup
  async function initUserSession() {
    if (token) {
      try {
        const res = await fetch('/api/me', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          currentUser = data.user;
          userCards = Array.isArray(data.cards) ? data.cards : (data.card ? [data.card] : []);
          
          // Select saved card or first card
          const savedCardId = localStorage.getItem('active_card_id');
          const foundSaved = userCards.find(c => c.id === savedCardId);
          currentCard = foundSaved || (userCards.length > 0 ? userCards[0] : data.card);
          currentCardId = currentCard ? currentCard.id : null;
          if (currentCardId) localStorage.setItem('active_card_id', currentCardId);

          isLoggedIn = true;
          switchDashboardView('cards');
        } else {
          localStorage.removeItem('card_token');
          token = null;
          switchDashboardView('builder');
        }
      } catch {
        token = null;
        switchDashboardView('builder');
      }
    } else {
      switchDashboardView('builder');
    }
    syncAuthStateUI();
    renderCardSwitcherUI();
    renderDashboardCardsGrid();
    emitLiveUpdate();
  }


  // Update UI for Auth State
  function syncAuthStateUI() {
    if (isLoggedIn && currentUser) {
      userDisplayEmail.textContent = currentUser.email;
      logoutBtn.textContent = 'Logout';

      const activeHandle = (currentCard && currentCard.username) || currentUser.username;
      previewUsernameTag.textContent = activeHandle;

      const fullVanityUrl = `${window.location.origin}/c/${activeHandle}`;
      vanityUrlLink.href = fullVanityUrl;
      vanityUrlLink.textContent = fullVanityUrl;
      openLiveBtn.href = fullVanityUrl;

      saveCardBtn.innerHTML = '<span>Save & Publish Changes 🚀</span>';
      liveCardIframe.src = `/c/${activeHandle}`;
      populateForm(currentCard);
    } else {
      userDisplayEmail.textContent = '⚡ DRAFT MODE (Unpublished)';
      logoutBtn.textContent = 'Sign In / Register';
      previewUsernameTag.textContent = 'yourname';
      renderCardSwitcherUI();

      const draftVanityUrl = `${window.location.origin}/c/yourname`;
      vanityUrlLink.href = '#';
      vanityUrlLink.textContent = `${draftVanityUrl} (Claim link below)`;
      openLiveBtn.href = '#';
      openLiveBtn.onclick = (e) => { e.preventDefault(); openAuthModal(); };

      saveCardBtn.innerHTML = '<span>Publish & Claim Custom Link 🚀</span>';
      liveCardIframe.src = `/c/demo`;

      const savedDraft = localStorage.getItem('card_draft');
      if (savedDraft) {
        try { populateForm(JSON.parse(savedDraft)); } catch {}
      } else {
        populateForm({
          fullName: '',
          roleTitle: '',
          positioningStatement: '',
          capabilities: [],
          editionMark: 'DIGITAL EDITION 2026',
          brandSubmark: 'CARD—PASS',
          theme: 'terracotta',
          email: '',
          phone: '',
          whatsapp: '',
          linkedinUrl: '',
          portfolioUrl: '',
          photoUrl: '/assets/default-avatar.png'
        });
      }
    }
  }

  function getCurrentDraftCard() {
    return {
      fullName: editFullName ? editFullName.value : '',
      roleTitle: editRoleTitle ? editRoleTitle.value : '',
      positioningStatement: editPositioningStatement ? editPositioningStatement.value : '',
      capabilities: editCapabilities && editCapabilities.value ? editCapabilities.value.split(',').map(s => s.trim()).filter(Boolean) : [],
      editionMark: editEditionMark ? editEditionMark.value : 'DIGITAL EDITION 2026',
      brandSubmark: editBrandSubmark ? editBrandSubmark.value : 'CARD—PASS',
      theme: editTheme ? editTheme.value : 'terracotta',
      email: editEmail ? editEmail.value : '',
      phone: editPhone ? editPhone.value : '',
      whatsapp: editWhatsapp ? editWhatsapp.value : '',
      linkedinUrl: editLinkedinUrl ? editLinkedinUrl.value : '',
      portfolioUrl: editPortfolioUrl ? editPortfolioUrl.value : '',
      photoUrl: draftPhotoUrl || (currentCard && currentCard.photoUrl ? currentCard.photoUrl : '')
    };
  }
  window.getCurrentDraftCard = getCurrentDraftCard;

  function renderNativePreviewCard(data) {
    if (!data) return;

    const nativeCard = document.getElementById('card-element');
    if (nativeCard && data.theme) {
      nativeCard.setAttribute('data-theme', data.theme);
    }

    // Name
    const nameEl = document.getElementById('card-person-name');
    if (nameEl) {
      if (data.fullName && data.fullName.trim()) {
        const nameParts = data.fullName.trim().split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';
        nameEl.classList.remove('is-placeholder-text');
        if (lastName) {
          nameEl.innerHTML = `${firstName}<br><span class="name-accent">${lastName}</span>`;
        } else {
          nameEl.innerHTML = `<span class="name-accent">${firstName}</span>`;
        }
      } else {
        nameEl.classList.add('is-placeholder-text');
        nameEl.innerHTML = `YOUR NAME<br><span class="name-accent">SURNAME</span>`;
      }
    }

    // Role
    const roleEl = document.getElementById('card-role-title');
    if (roleEl) {
      if (data.roleTitle && data.roleTitle.trim()) {
        roleEl.classList.remove('is-placeholder-text');
        roleEl.textContent = data.roleTitle;
      } else {
        roleEl.classList.add('is-placeholder-text');
        roleEl.textContent = 'YOUR PROFESSIONAL TITLE / ROLE';
      }
    }

    // Bio / Positioning Statement
    const posEl = document.getElementById('card-positioning-statement');
    if (posEl) {
      if (data.positioningStatement && data.positioningStatement.trim()) {
        posEl.classList.remove('is-placeholder-text');
        posEl.textContent = data.positioningStatement;
      } else {
        posEl.classList.add('is-placeholder-text');
        posEl.textContent = 'Your personal bio or positioning statement will appear here once configured in your dashboard.';
      }
    }

    // Photo
    const portraitImg = document.getElementById('card-portrait-img');
    if (portraitImg) {
      portraitImg.src = data.photoUrl || '/assets/dummy-avatar.svg';
    }

    // Skills
    const capsGrid = document.getElementById('card-capabilities-grid');
    if (capsGrid) {
      capsGrid.innerHTML = '';
      const caps = Array.isArray(data.capabilities) && data.capabilities.length > 0 ? data.capabilities : [];
      if (caps.length > 0) {
        caps.forEach((cap, idx) => {
          const pill = document.createElement('span');
          pill.className = 'capability-pill';
          pill.innerHTML = `<span class="cap-num">0${idx + 1}</span> ${cap}`;
          capsGrid.appendChild(pill);
        });
      } else {
        ['YOUR SKILL 01', 'YOUR SKILL 02', 'YOUR SKILL 03'].forEach((cap, idx) => {
          const pill = document.createElement('span');
          pill.className = 'capability-pill is-placeholder';
          pill.innerHTML = `<span class="cap-num">0${idx + 1}</span> ${cap}`;
          capsGrid.appendChild(pill);
        });
      }
    }

    // Event & Submark
    const edTag = document.getElementById('card-edition-tag');
    const brandSub = document.getElementById('card-brand-submark');
    const backLoc = document.getElementById('card-back-location');
    if (edTag) edTag.textContent = data.editionMark || 'DIGITAL EDITION 2026';
    if (brandSub) brandSub.textContent = data.brandSubmark || 'CARD—PASS';
    if (backLoc) backLoc.textContent = data.brandSubmark || 'CARD—PASS';

    // Contacts
    const emailWrap = document.getElementById('item-email-wrap');
    const emailLink = document.getElementById('contact-email-link');
    const directEmailBtn = document.getElementById('direct-email-btn');
    const copyEmailBtn = document.getElementById('copy-email-btn');
    if (emailWrap && emailLink) {
      if (data.email) {
        emailWrap.classList.remove('is-placeholder-row');
        emailLink.href = `mailto:${data.email}`;
        emailLink.textContent = data.email;
        if (directEmailBtn) directEmailBtn.href = `mailto:${data.email}`;
      } else {
        emailWrap.classList.add('is-placeholder-row');
        emailLink.href = '#';
        emailLink.textContent = 'your.email@example.com';
        if (directEmailBtn) directEmailBtn.href = '#';
      }
    }
    if (copyEmailBtn) {
      copyEmailBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (data.email) {
          navigator.clipboard.writeText(data.email).then(() => {
            showToast('📋 Email copied to clipboard!');
          }).catch(() => {
            showToast(`Email: ${data.email}`);
          });
        }
      };
    }

    const phoneWrap = document.getElementById('item-phone-wrap');
    const phoneLink = document.getElementById('contact-phone-link');
    const directPhoneBtn = document.getElementById('direct-phone-btn');
    const whatsappLink = document.getElementById('contact-whatsapp-link');

    if (phoneWrap && phoneLink) {
      if (data.phone) {
        phoneWrap.classList.remove('is-placeholder-row');
        phoneLink.href = `tel:${data.phone.replace(/\s+/g, '')}`;
        phoneLink.textContent = data.phone;
        if (directPhoneBtn) directPhoneBtn.href = `tel:${data.phone.replace(/\s+/g, '')}`;
      } else {
        phoneWrap.classList.add('is-placeholder-row');
        phoneLink.href = '#';
        phoneLink.textContent = '+1 (555) 000-0000';
        if (directPhoneBtn) directPhoneBtn.href = '#';
      }
    }

    if (whatsappLink) {
      const waNumber = data.whatsapp || data.phone || '';
      const cleanWa = waNumber.replace(/[^0-9]/g, '');
      if (cleanWa) {
        whatsappLink.href = `https://wa.me/${cleanWa}`;
        whatsappLink.style.display = 'inline-flex';
      } else {
        whatsappLink.href = '#';
      }
    }

    const linkedinWrap = document.getElementById('item-linkedin-wrap');
    const linkedinLink = document.getElementById('contact-linkedin-link');
    const directLinkedinBtn = document.getElementById('direct-linkedin-btn');
    if (linkedinWrap && linkedinLink) {
      if (data.linkedinUrl) {
        linkedinWrap.classList.remove('is-placeholder-row');
        linkedinLink.href = data.linkedinUrl;
        linkedinLink.textContent = data.linkedinUrl.replace(/^https?:\/\/(www\.)?/, '');
        if (directLinkedinBtn) directLinkedinBtn.href = data.linkedinUrl;
      } else {
        linkedinWrap.classList.add('is-placeholder-row');
        linkedinLink.href = '#';
        linkedinLink.textContent = 'linkedin.com/in/yourprofile';
        if (directLinkedinBtn) directLinkedinBtn.href = '#';
      }
    }

    const portfolioWrap = document.getElementById('item-portfolio-wrap');
    const portfolioLink = document.getElementById('contact-portfolio-link');
    const directPortfolioBtn = document.getElementById('direct-portfolio-btn');
    if (portfolioWrap && portfolioLink) {
      if (data.portfolioUrl) {
        portfolioWrap.classList.remove('is-placeholder-row');
        portfolioLink.href = data.portfolioUrl;
        portfolioLink.textContent = data.portfolioUrl.replace(/^https?:\/\/(www\.)?/, '');
        if (directPortfolioBtn) directPortfolioBtn.href = data.portfolioUrl;
      } else {
        portfolioWrap.classList.add('is-placeholder-row');
        portfolioLink.href = '#';
        portfolioLink.textContent = 'yourwebsite.com';
        if (directPortfolioBtn) directPortfolioBtn.href = '#';
      }
    }

    const previewQrImg = document.getElementById('preview-card-qr-img');
    if (previewQrImg) {
      const uname = (currentUser && currentUser.username) || (previewUsernameTag ? previewUsernameTag.textContent.trim() : 'you') || 'you';
      const cardUrl = `${window.location.origin}/c/${uname}`;
      previewQrImg.src = `/api/qr?data=${encodeURIComponent(cardUrl)}`;
    }
  }

  // Flip controls for native 3D card preview
  const nativeFlipToBackBtn = document.getElementById('flip-to-back-btn');
  const nativeFlipToFrontBtn = document.getElementById('flip-to-front-btn');

  if (nativeFlipToBackBtn && nativeCardContainer) {
    nativeFlipToBackBtn.onclick = (e) => {
      e.stopPropagation();
      nativeCardContainer.style.transform = 'rotateY(180deg)';
    };
  }
  if (nativeFlipToFrontBtn && nativeCardContainer) {
    nativeFlipToFrontBtn.onclick = (e) => {
      e.stopPropagation();
      nativeCardContainer.style.transform = 'rotateY(0deg)';
    };
  }

  function emitLiveUpdate() {
    const draftCard = window.getCurrentDraftCard();

    // 1. Direct Native Preview DOM Update (0ms Instant Sync)
    renderNativePreviewCard(draftCard);

    if (avatarPreviewImg) {
      avatarPreviewImg.src = draftCard.photoUrl || '/assets/dummy-avatar.svg';
    }

    syncThemeCardUI(draftCard.theme);

    if (!isLoggedIn) {
      try {
        const localDraft = { ...draftCard };
        if (localDraft.photoUrl && localDraft.photoUrl.startsWith('data:')) {
          delete localDraft.photoUrl;
        }
        localStorage.setItem('card_draft', JSON.stringify(localDraft));
      } catch (err) {
        console.warn('Draft storage notice:', err);
      }
    }

    // 2. Direct synchronous call for 0ms iframe fallback if active
    if (liveCardIframe && liveCardIframe.contentWindow) {
      try {
        if (typeof liveCardIframe.contentWindow.updateLiveCard === 'function') {
          liveCardIframe.contentWindow.updateLiveCard(draftCard);
        }
      } catch (e) {}

      try {
        liveCardIframe.contentWindow.postMessage({ type: 'LIVE_CARD_UPDATE', card: draftCard }, '*');
      } catch (e) {}
    }
  }

  const NIGERIAN_PROFILES = [
    {
      fullName: "Babatunde Adeleke",
      roleTitle: "Senior Cloud Architect | DevOps Lead",
      positioningStatement: "Building resilient cloud infrastructure, automating CI/CD pipelines, and driving digital transformation for enterprise solutions.",
      capabilities: ["AWS & AZURE", "KUBERNETES", "DEVOPS ARCHITECTURE"],
      editionMark: "LAGOS TECH SUMMIT 2026",
      brandSubmark: "BA—CLOUD",
      theme: "sapphire",
      email: "babatunde.adeleke@example.com",
      phone: "+234 803 123 4567",
      whatsapp: "+2348031234567",
      linkedinUrl: "https://linkedin.com/in/babatunde-adeleke",
      portfolioUrl: "https://babatundeadeleke.dev"
    },
    {
      fullName: "Chinedu Okonkwo",
      roleTitle: "Principal Product Manager | Fintech Lead",
      positioningStatement: "Scaling cross-border payment platforms, leading high-impact engineering teams, and simplifying digital financial services across Africa.",
      capabilities: ["PRODUCT STRATEGY", "PAYMENT INFRASTRUCTURE", "GROWTH & SCALE"],
      editionMark: "AFRICA FINTECH 2026",
      brandSubmark: "CO—PAY",
      theme: "emerald",
      email: "chinedu.okonkwo@example.com",
      phone: "+234 812 987 6543",
      whatsapp: "+2348129876543",
      linkedinUrl: "https://linkedin.com/in/chinedu-okonkwo",
      portfolioUrl: "https://chineduokonkwo.com"
    },
    {
      fullName: "Aisha Bello",
      roleTitle: "Data Scientist | AI & Machine Learning Lead",
      positioningStatement: "Developing predictive AI models, extracting deep analytics insights, and applying machine learning to solve complex business challenges.",
      capabilities: ["MACHINE LEARNING", "PYTHON & PYTORCH", "BIG DATA ANALYTICS"],
      editionMark: "KANO AI SUMMIT 2026",
      brandSubmark: "AB—AI",
      theme: "monochrome",
      email: "aisha.bello@example.com",
      phone: "+234 809 456 7890",
      whatsapp: "+2348094567890",
      linkedinUrl: "https://linkedin.com/in/aisha-bello",
      portfolioUrl: "https://aishabello.ai"
    },
    {
      fullName: "Damilola Ogunleye",
      roleTitle: "Full Stack Engineer | Systems Architect",
      positioningStatement: "Crafting high-performance web applications, designing microservice APIs, and crafting intuitive user experiences end-to-end.",
      capabilities: ["FULL STACK DEV", "REACT & NODE.JS", "SYSTEM ARCHITECTURE"],
      editionMark: "IBADAN DEV SUMMIT 2026",
      brandSubmark: "DO—CODE",
      theme: "terracotta",
      email: "damilola.ogunleye@example.com",
      phone: "+234 814 222 3344",
      whatsapp: "+2348142223344",
      linkedinUrl: "https://linkedin.com/in/damilola-ogunleye",
      portfolioUrl: "https://damilolaogunleye.dev"
    },
    {
      fullName: "Emeka Nwosu",
      roleTitle: "Financial Analyst | Venture Investment Strategist",
      positioningStatement: "Evaluating high-growth tech investments, structuring venture capital deals, and delivering data-backed financial modeling across emerging markets.",
      capabilities: ["VENTURE CAPITAL", "FINANCIAL MODELING", "MARKET ANALYSIS"],
      editionMark: "ABUJA CAPITAL FORUM 2026",
      brandSubmark: "EN—CAPITAL",
      theme: "gold",
      email: "emeka.nwosu@example.com",
      phone: "+234 805 555 6677",
      whatsapp: "+2348055556677",
      linkedinUrl: "https://linkedin.com/in/emeka-nwosu",
      portfolioUrl: "https://emekanwosu.com"
    },
    {
      fullName: "Folake Adeniyi",
      roleTitle: "Brand Strategist | Digital Marketing Director",
      positioningStatement: "Building iconic brand identities, crafting omnichannel marketing campaigns, and elevating brand presence across global audiences.",
      capabilities: ["BRAND STRATEGY", "DIGITAL MARKETING", "CAMPAIGN DIRECTION"],
      editionMark: "CREATIVE SUMMIT 2026",
      brandSubmark: "FA—BRAND",
      theme: "terracotta",
      email: "folake.adeniyi@example.com",
      phone: "+234 818 777 8899",
      whatsapp: "+2348187778899",
      linkedinUrl: "https://linkedin.com/in/folake-adeniyi",
      portfolioUrl: "https://folakeadeniyi.com"
    },
    {
      fullName: "Ngozi Eze",
      roleTitle: "Legal Consultant | Corporate & Tech Counsel",
      positioningStatement: "Advising tech startups on regulatory compliance, intellectual property protection, corporate governance, and cross-border commercial contracts.",
      capabilities: ["CORPORATE LAW", "TECH REGULATION", "IP & CONTRACTS"],
      editionMark: "LEGAL TECH FORUM 2026",
      brandSubmark: "NE—LAW",
      theme: "monochrome",
      email: "ngozi.eze@example.com",
      phone: "+234 802 333 4455",
      whatsapp: "+2348023334455",
      linkedinUrl: "https://linkedin.com/in/ngozi-eze",
      portfolioUrl: "https://ngozieze.law"
    }
  ];

  const randomizeProfileBtn = document.getElementById('randomize-profile-btn');
  if (randomizeProfileBtn) {
    randomizeProfileBtn.addEventListener('click', () => {
      const idx = Math.floor(Math.random() * NIGERIAN_PROFILES.length);
      const profile = NIGERIAN_PROFILES[idx];
      populateForm(profile);
      emitLiveUpdate();
      showToast(`🎲 Sample Profile Loaded: ${profile.fullName} (${profile.roleTitle.split('|')[0].trim()})`);
    });
  }

  // Multi-event real-time input listeners across all input fields for 100% instant sync
  const inputsToTrack = [
    editFullName, editRoleTitle, editPositioningStatement, editCapabilities,
    editEditionMark, editBrandSubmark, editTheme, editEmail, editPhone,
    editWhatsapp, editLinkedinUrl, editPortfolioUrl
  ];

  inputsToTrack.forEach(input => {
    if (input) {
      ['input', 'keyup', 'keydown', 'change', 'paste', 'compositionend'].forEach(evtType => {
        input.addEventListener(evtType, emitLiveUpdate);
      });
    }
  });

  cardEditorForm.addEventListener('input', emitLiveUpdate);
  cardEditorForm.addEventListener('keyup', emitLiveUpdate);
  cardEditorForm.addEventListener('change', emitLiveUpdate);
  cardEditorForm.addEventListener('paste', emitLiveUpdate);
  document.addEventListener('input', emitLiveUpdate);

  // Photo file real-time preview listener & explicit upload triggers
  const explicitUploadBtn = document.getElementById('explicit-upload-btn');
  if (explicitUploadBtn) {
    explicitUploadBtn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (editPhotoFile) editPhotoFile.click();
    };
  }

  const avatarWrapper = document.getElementById('avatar-preview-wrapper');
  if (avatarWrapper) {
    avatarWrapper.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (editPhotoFile) editPhotoFile.click();
    };
  }

  if (avatarPreviewImg) {
    avatarPreviewImg.style.cursor = 'pointer';
    avatarPreviewImg.title = 'Click to choose portrait photo';
    avatarPreviewImg.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (editPhotoFile) editPhotoFile.click();
    };
  }

  if (editPhotoFile) {
    const processImageFile = (file) => {
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
        draftPhotoUrl = evt.target.result;
        if (avatarPreviewImg) avatarPreviewImg.src = draftPhotoUrl;
        emitLiveUpdate();
      };
      reader.readAsDataURL(file);
    };

    editPhotoFile.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) processImageFile(e.target.files[0]);
    });
  }

  // Handshake listener from card iframe
  window.addEventListener('message', (e) => {
    if (e.data && e.data.type === 'IFRAME_READY') {
      emitLiveUpdate();
    }
  });

  liveCardIframe.addEventListener('load', () => {
    emitLiveUpdate();
    setTimeout(emitLiveUpdate, 150);
    setTimeout(emitLiveUpdate, 500);
  });

  function populateForm(card) {
    if (!card) return;
    if (editFullName) editFullName.value = card.fullName || '';
    if (editRoleTitle) editRoleTitle.value = card.roleTitle || '';
    if (editPositioningStatement) editPositioningStatement.value = card.positioningStatement || '';
    if (editCapabilities) editCapabilities.value = Array.isArray(card.capabilities) ? card.capabilities.join(', ') : (card.capabilities || '');
    if (editEditionMark) editEditionMark.value = card.editionMark || '';
    if (editBrandSubmark) editBrandSubmark.value = card.brandSubmark || '';
    if (editTheme) editTheme.value = card.theme || 'terracotta';
    if (editEmail) editEmail.value = card.email || '';
    if (editPhone) editPhone.value = card.phone || '';
    if (editWhatsapp) editWhatsapp.value = card.whatsapp || '';
    if (editLinkedinUrl) editLinkedinUrl.value = card.linkedinUrl || '';
    if (editPortfolioUrl) editPortfolioUrl.value = card.portfolioUrl || '';

    if (card.photoUrl) {
      draftPhotoUrl = card.photoUrl;
      if (avatarPreviewImg) avatarPreviewImg.src = card.photoUrl;
    } else {
      draftPhotoUrl = null;
      if (avatarPreviewImg) avatarPreviewImg.src = '/assets/dummy-avatar.svg';
    }

    syncThemeCardUI(card.theme || 'terracotta');
    emitLiveUpdate();
  }

  copyUrlBtn.addEventListener('click', async () => {
    const url = vanityUrlLink.href;
    if (!isLoggedIn) {
      openAuthModal();
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      showToast('Custom card URL copied to clipboard!');
    } catch {
      showToast('Card URL: ' + url);
    }
  });

  logoutBtn.addEventListener('click', async () => {
    if (isLoggedIn) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      } catch {}
      localStorage.removeItem('card_token');
      localStorage.removeItem('card_user');
      isLoggedIn = false;
      currentUser = null;
      currentCard = null;
      userCards = [];
      token = null;
      syncAuthStateUI();
      renderDashboardCardsGrid();
      switchDashboardView('builder');
      goToStep(1);
      showToast('Logged out successfully.');
    } else {
      switchDashboardView('builder');
      goToStep(10);
    }
  });

  // --------------------------------------------------------------------------
  // DASHBOARD VIEW SWITCHER & MULTI-VIEW NAVIGATION
  // --------------------------------------------------------------------------
  let activeDashboardView = 'cards';

  function switchDashboardView(view) {
    activeDashboardView = view;
    const viewCards = document.getElementById('view-cards-section');
    const viewBuilder = document.getElementById('view-builder-section');
    const viewSettings = document.getElementById('view-settings-section');

    if (viewCards) viewCards.style.display = view === 'cards' ? 'block' : 'none';
    if (viewBuilder) viewBuilder.style.display = view === 'builder' ? 'block' : 'none';
    if (viewSettings) viewSettings.style.display = view === 'settings' ? 'block' : 'none';

    if (tabBtnCards) {
      tabBtnCards.classList.toggle('active', view === 'cards');
      tabBtnCards.setAttribute('aria-selected', view === 'cards');
    }
    if (tabBtnBuilder) {
      tabBtnBuilder.classList.toggle('active', view === 'builder');
      tabBtnBuilder.setAttribute('aria-selected', view === 'builder');
    }
    if (tabBtnSettings) {
      tabBtnSettings.classList.toggle('active', view === 'settings');
      tabBtnSettings.setAttribute('aria-selected', view === 'settings');
    }

    if (view === 'cards') {
      renderDashboardCardsGrid();
    } else if (view === 'builder') {
      if (builderActiveCardName && currentCard) {
        builderActiveCardName.textContent = currentCard.editionMark || currentCard.fullName || `/c/${currentCard.username}`;
      }
      emitLiveUpdate();
      setTimeout(emitLiveUpdate, 200);
    } else if (view === 'settings') {
      syncSettingsUI();
    }
  }

  function showPublishedSuccessBanner(handle) {
    const alertBanner = document.getElementById('dash-published-alert');
    const alertTitle = document.getElementById('published-alert-title');
    const alertSub = document.getElementById('published-alert-subtitle');
    const bannerCopyBtn = document.getElementById('banner-copy-btn');
    const bannerViewBtn = document.getElementById('banner-view-btn');

    if (!alertBanner || !handle) return;
    const fullUrl = `${window.location.origin}/c/${handle}`;
    alertBanner.style.display = 'flex';
    if (alertTitle) alertTitle.textContent = `🎉 Your Card (/c/${handle}) is Live!`;
    if (alertSub) alertSub.textContent = `Anyone can now view your 3D digital card or save your contact info with one tap.`;

    if (bannerCopyBtn) {
      bannerCopyBtn.onclick = async () => {
        try {
          await navigator.clipboard.writeText(fullUrl);
          showToast(`Copied: ${fullUrl}`);
          bannerCopyBtn.innerHTML = '<span>✓ Copied!</span>';
          setTimeout(() => {
            bannerCopyBtn.innerHTML = '<span>📋 Copy Share Link</span>';
          }, 2000);
        } catch {
          showToast(`Share Link: ${fullUrl}`);
        }
      };
    }

    if (bannerViewBtn) {
      bannerViewBtn.href = fullUrl;
    }
  }

  function renderDashboardCardsGrid() {
    const gridEl = document.getElementById('dash-cards-grid');
    const emptyEl = document.getElementById('dash-cards-empty');
    const statCardCount = document.getElementById('stat-card-count');
    const cardsBadgeCount = document.getElementById('cards-badge-count');
    const navCardsCount = document.getElementById('nav-cards-count');
    const statPrimaryHandle = document.getElementById('stat-primary-handle');
    const dashGreetingName = document.getElementById('dash-greeting-name');

    const totalCards = userCards ? userCards.length : 0;
    if (statCardCount) statCardCount.textContent = totalCards;
    if (cardsBadgeCount) cardsBadgeCount.textContent = totalCards;
    if (navCardsCount) navCardsCount.textContent = totalCards;

    const displayName = (currentUser && currentUser.username) || (currentCard && currentCard.fullName) || 'there';
    if (dashGreetingName) dashGreetingName.textContent = displayName;

    const primaryHandle = (currentUser && currentUser.username) || (currentCard && currentCard.username) || '';
    if (statPrimaryHandle) statPrimaryHandle.textContent = primaryHandle ? `/c/${primaryHandle}` : '—';

    if (!gridEl) return;

    if (totalCards === 0) {
      gridEl.innerHTML = '';
      if (emptyEl) emptyEl.style.display = 'block';
      return;
    }

    if (emptyEl) emptyEl.style.display = 'none';
    gridEl.innerHTML = '';

    userCards.forEach(card => {
      const tile = document.createElement('div');
      tile.className = 'dash-card-tile';

      const themeName = (card.theme || 'terracotta').toLowerCase();
      const editionText = card.editionMark || 'DIGITAL PASS';
      const userFullName = card.fullName || card.username || 'Conference Pass';
      const userRole = card.roleTitle || 'Attendee';
      const userBio = card.positioningStatement || 'Connecting and Networking';
      const fullLink = `${window.location.origin}/c/${card.username}`;

      const avatarMarkup = card.photoUrl
        ? `<img src="${escapeHtml(card.photoUrl)}" alt="${escapeHtml(userFullName)}" class="tile-avatar-img">`
        : `<span>${escapeHtml(userFullName.substring(0, 2).toUpperCase())}</span>`;

      tile.innerHTML = `
        <div class="dash-card-tile-top">
          <div class="tile-badges-wrap">
            <span class="tile-edition-badge">${escapeHtml(editionText)}</span>
            <span class="tile-theme-pill theme-pill-${escapeHtml(themeName)}">${escapeHtml(themeName)}</span>
          </div>
          <span style="display:inline-flex; align-items:center; gap:5px; font-size:11px; font-weight:700; color:#10B981;">
            <span style="width:6px; height:6px; border-radius:50%; background:#10B981;"></span> LIVE
          </span>
        </div>

        <div class="dash-card-tile-body">
          <div class="tile-profile-header">
            <div class="tile-avatar-box">
              ${avatarMarkup}
            </div>
            <div class="tile-info-block">
              <h3 class="tile-user-name">${escapeHtml(userFullName)}</h3>
              <p class="tile-user-role">${escapeHtml(userRole)}</p>
            </div>
          </div>

          <p class="tile-user-bio">${escapeHtml(userBio)}</p>

          <div class="tile-link-bar">
            <a href="${fullLink}" target="_blank" class="tile-link-url">/c/${escapeHtml(card.username)}</a>
            <button type="button" class="btn-mini-copy" data-link="${fullLink}">Copy</button>
          </div>
        </div>

        <div class="dash-card-tile-actions">
          <button type="button" class="btn-tile-action btn-tile-copy" data-link="${fullLink}">
            <span>📋 Copy Link</span>
          </button>
          <a href="${fullLink}" target="_blank" class="btn-tile-action btn-tile-view">
            <span>View ↗</span>
          </a>
          <button type="button" class="btn-tile-action btn-tile-edit" data-card-id="${escapeHtml(card.id)}">
            <span>Edit Card ✏️</span>
          </button>
          ${userCards.length > 1 ? `
            <button type="button" class="btn-tile-action btn-tile-delete" data-card-id="${escapeHtml(card.id)}" title="Delete card">
              <span>🗑️</span>
            </button>
          ` : ''}
        </div>
      `;

      // Wire Copy Buttons
      const copyBtns = tile.querySelectorAll('[data-link]');
      copyBtns.forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const link = btn.getAttribute('data-link');
          try {
            await navigator.clipboard.writeText(link);
            const orig = btn.innerHTML;
            btn.innerHTML = '<span>✓ Copied!</span>';
            btn.style.color = '#10B981';
            showToast(`Copied to clipboard: ${link}`);
            setTimeout(() => {
              btn.innerHTML = orig;
              btn.style.color = '';
            }, 1800);
          } catch {
            showToast(`Card link: ${link}`);
          }
        });
      });

      // Wire Edit Button
      const editBtn = tile.querySelector('.btn-tile-edit');
      if (editBtn) {
        editBtn.addEventListener('click', () => {
          selectActiveCard(card);
          if (builderActiveCardName) {
            builderActiveCardName.textContent = card.editionMark || card.fullName || `/c/${card.username}`;
          }
          switchDashboardView('builder');
          window.scrollTo({ top: 0, behavior: 'smooth' });
          showToast(`Now editing: ${card.editionMark || card.username} ✏️`);
        });
      }

      // Wire Delete Button
      const delBtn = tile.querySelector('.btn-tile-delete');
      if (delBtn) {
        delBtn.addEventListener('click', async (e) => {
          e.stopPropagation();
          if (!confirm(`Are you sure you want to delete your "${card.editionMark || card.username}" card? This cannot be undone.`)) {
            return;
          }
          try {
            const res = await fetch(`/api/cards/${card.id}`, {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to delete card.');
            userCards = data.cards || userCards.filter(c => c.id !== card.id);
            if (currentCard && currentCard.id === card.id) {
              currentCard = userCards[0] || null;
              currentCardId = currentCard ? currentCard.id : null;
              if (currentCard) populateForm(currentCard);
            }
            renderDashboardCardsGrid();
            renderCardSwitcherUI();
            showToast('Card deleted successfully.');
          } catch (err) {
            showToast('❌ ' + err.message);
          }
        });
      }

      gridEl.appendChild(tile);
    });
  }

  function syncSettingsUI() {
    const setMail = document.getElementById('settings-display-email');
    const setUser = document.getElementById('settings-display-username');
    const setCount = document.getElementById('settings-display-cards-count');
    if (setMail && currentUser) setMail.textContent = currentUser.email;
    if (setUser && currentUser) setUser.textContent = `/c/${currentUser.username}`;
    if (setCount) setCount.textContent = `${userCards.length} ${userCards.length === 1 ? 'Card' : 'Cards'}`;
  }

  // View Navigation Listeners
  if (tabBtnCards) tabBtnCards.addEventListener('click', () => switchDashboardView('cards'));
  if (tabBtnBuilder) tabBtnBuilder.addEventListener('click', () => switchDashboardView('builder'));
  if (tabBtnSettings) tabBtnSettings.addEventListener('click', () => switchDashboardView('settings'));
  if (builderBackToCardsBtn) builderBackToCardsBtn.addEventListener('click', () => switchDashboardView('cards'));
  if (homeNewCardBtn) homeNewCardBtn.addEventListener('click', () => openNewCardModal());
  if (btnQuickCreateCard) btnQuickCreateCard.addEventListener('click', () => openNewCardModal());
  if (emptyStateCreateBtn) emptyStateCreateBtn.addEventListener('click', () => switchDashboardView('builder'));

  function openNewCardModal() {
    if (!isLoggedIn) {
      switchDashboardView('builder');
      goToStep(10);
      showToast('Please sign in or create an account first.');
      return;
    }
    if (newCardModal) {
      if (newCardAlert) newCardAlert.style.display = 'none';
      if (newCardForm) newCardForm.reset();
      if (newCardUsernamePreview) newCardUsernamePreview.textContent = 'yourname-event';
      newCardModal.style.display = 'flex';
    }
  }

  // Settings Password Change
  if (settingsPasswordForm) {
    settingsPasswordForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const currentPassword = document.getElementById('settings-current-pass').value.trim();
      const newPassword = document.getElementById('settings-new-pass').value.trim();
      const confirmPassword = document.getElementById('settings-confirm-pass').value.trim();

      function showPassAlert(msg, isErr = true) {
        if (!settingsPassAlert) return;
        settingsPassAlert.textContent = msg;
        settingsPassAlert.className = 'modal-alert ' + (isErr ? 'alert-error' : 'alert-success');
        settingsPassAlert.style.display = 'block';
      }

      if (newPassword.length < 6) {
        showPassAlert('New password must be at least 6 characters.');
        return;
      }
      if (newPassword !== confirmPassword) {
        showPassAlert('New passwords do not match. Please verify.');
        return;
      }

      try {
        if (settingsSavePassBtn) {
          settingsSavePassBtn.disabled = true;
          settingsSavePassBtn.innerHTML = '<span>Updating Password... ⏳</span>';
        }
        const res = await fetch('/api/auth/change-password', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ currentPassword, newPassword })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Password update failed.');

        settingsPasswordForm.reset();
        showPassAlert('✓ Password updated successfully!', false);
        showToast('Password changed successfully! 🔑');
      } catch (err) {
        showPassAlert(err.message, true);
      } finally {
        if (settingsSavePassBtn) {
          settingsSavePassBtn.disabled = false;
          settingsSavePassBtn.innerHTML = '<span>Update Password 🔑</span>';
        }
      }
    });
  }

  if (settingsThemeBtn) {
    settingsThemeBtn.addEventListener('click', () => {
      const currentTheme = document.body.getAttribute('data-dashboard-theme') || 'light';
      applyTheme(currentTheme === 'dark' ? 'light' : 'dark');
    });
  }

  if (settingsLogoutBtn) {
    settingsLogoutBtn.addEventListener('click', () => {
      if (logoutBtn) logoutBtn.click();
    });
  }


  async function savePublishedCard() {
    const formData = new FormData();
    formData.append('fullName', editFullName ? editFullName.value : '');
    formData.append('roleTitle', editRoleTitle ? editRoleTitle.value : '');
    formData.append('positioningStatement', editPositioningStatement ? editPositioningStatement.value : '');
    formData.append('capabilities', editCapabilities ? editCapabilities.value : '');
    formData.append('editionMark', editEditionMark ? editEditionMark.value : '');
    formData.append('brandSubmark', editBrandSubmark ? editBrandSubmark.value : '');
    formData.append('theme', editTheme ? editTheme.value : 'terracotta');
    formData.append('email', editEmail ? editEmail.value : '');
    formData.append('phone', editPhone ? editPhone.value : '');
    formData.append('whatsapp', editWhatsapp ? editWhatsapp.value : '');
    formData.append('linkedinUrl', editLinkedinUrl ? editLinkedinUrl.value : '');
    formData.append('portfolioUrl', editPortfolioUrl ? editPortfolioUrl.value : '');

    if (editPhotoFile && editPhotoFile.files && editPhotoFile.files[0]) {
      formData.append('photo', editPhotoFile.files[0]);
    } else if (draftPhotoUrl) {
      formData.append('photoUrl', draftPhotoUrl);
    }

    if (currentCard && currentCard.id) {
      formData.append('cardId', currentCard.id);
    }

    const res = await fetch('/api/card', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    });
    let data;
    try {
      data = await res.json();
    } catch {
      throw new Error(`Server returned an unexpected response (${res.status}). Please try again.`);
    }
    if (!res.ok) throw new Error(data.error || 'Failed to save card');
    currentCard = data.card;
    currentCardId = currentCard.id;
    if (currentCardId) localStorage.setItem('active_card_id', currentCardId);

    // Update in userCards array
    const idx = userCards.findIndex(c => c.id === currentCard.id);
    if (idx !== -1) {
      userCards[idx] = currentCard;
    } else {
      userCards.unshift(currentCard);
    }
    renderCardSwitcherUI();

    localStorage.removeItem('card_draft');
    return currentCard;
  }

  // --------------------------------------------------------------------------
  // STEP 10 DEDICATED ACCOUNT CREATION PAGE LOGIC
  // --------------------------------------------------------------------------
  const step10ShowLoginBtn = document.getElementById('step10-show-login-btn');
  const step10ShowRegisterBtn = document.getElementById('step10-show-register-btn');
  const step10RegisterBox = document.getElementById('step10-register-box');
  const step10LoginBox = document.getElementById('step10-login-box');
  const step10MainTitle = document.getElementById('step10-main-title');
  const step10MainSub = document.getElementById('step10-main-sub');
  const step10RegUsername = document.getElementById('step10-reg-username');
  const step10UsernamePreview = document.getElementById('step10-username-preview');

  if (step10ShowLoginBtn && step10ShowRegisterBtn) {
    step10ShowLoginBtn.addEventListener('click', () => {
      const step10ResetBox = document.getElementById('step10-reset-box');
      if (step10ResetBox) step10ResetBox.style.display = 'none';
      step10RegisterBox.style.display = 'none';
      step10LoginBox.style.display = 'block';
      const regEmailEl = document.getElementById('step10-reg-email');
      const logIdEl = document.getElementById('step10-login-identifier');
      if (regEmailEl && logIdEl && !logIdEl.value) {
        logIdEl.value = regEmailEl.value;
      }
      if (step10MainTitle) step10MainTitle.textContent = 'Sign in to publish your card';
      if (step10MainSub) step10MainSub.textContent = 'Sign in with your Meetme account to publish your card changes.';
      if (saveCardBtn) saveCardBtn.innerHTML = '<span>Sign In & Publish Live 🚀</span>';
      const step10Alert = document.getElementById('step10-auth-alert');
      if (step10Alert) step10Alert.style.display = 'none';
    });

    step10ShowRegisterBtn.addEventListener('click', () => {
      const step10ResetBox = document.getElementById('step10-reset-box');
      if (step10ResetBox) step10ResetBox.style.display = 'none';
      step10LoginBox.style.display = 'none';
      step10RegisterBox.style.display = 'block';
      if (step10MainTitle) step10MainTitle.textContent = 'Create your account to publish';
      if (step10MainSub) step10MainSub.textContent = 'Your card is ready! Create your free account to publish your card and claim your custom share link.';
      if (saveCardBtn) saveCardBtn.innerHTML = '<span>Create Account & Publish Live 🚀</span>';
      const step10Alert = document.getElementById('step10-auth-alert');
      if (step10Alert) step10Alert.style.display = 'none';
    });

    const step10ShowResetBtn = document.getElementById('step10-show-reset-btn');
    const step10ResetBackBtn = document.getElementById('step10-reset-back-btn');
    if (step10ShowResetBtn) {
      step10ShowResetBtn.addEventListener('click', () => {
        const step10ResetBox = document.getElementById('step10-reset-box');
        step10LoginBox.style.display = 'none';
        step10RegisterBox.style.display = 'none';
        if (step10ResetBox) step10ResetBox.style.display = 'block';

        const logIdEl = document.getElementById('step10-login-identifier');
        const resetEmailEl = document.getElementById('step10-reset-email');
        const resetUserEl = document.getElementById('step10-reset-username');
        if (logIdEl && resetEmailEl && !resetEmailEl.value) {
          if (logIdEl.value.includes('@')) {
            resetEmailEl.value = logIdEl.value.trim();
          } else if (resetUserEl && !resetUserEl.value) {
            resetUserEl.value = logIdEl.value.trim();
          }
        }
        if (step10MainTitle) step10MainTitle.textContent = 'Reset your password';
        if (step10MainSub) step10MainSub.textContent = 'Enter your registered email and username handle to set a new password.';
        if (saveCardBtn) saveCardBtn.innerHTML = '<span>Reset Password & Publish Live 🚀</span>';
        const step10Alert = document.getElementById('step10-auth-alert');
        if (step10Alert) step10Alert.style.display = 'none';
      });
    }

    if (step10ResetBackBtn) {
      step10ResetBackBtn.addEventListener('click', () => {
        const step10ResetBox = document.getElementById('step10-reset-box');
        if (step10ResetBox) step10ResetBox.style.display = 'none';
        step10RegisterBox.style.display = 'none';
        step10LoginBox.style.display = 'block';
        if (step10MainTitle) step10MainTitle.textContent = 'Sign in to publish your card';
        if (step10MainSub) step10MainSub.textContent = 'Sign in with your Meetme account to publish your card changes.';
        if (saveCardBtn) saveCardBtn.innerHTML = '<span>Sign In & Publish Live 🚀</span>';
        const step10Alert = document.getElementById('step10-auth-alert');
        if (step10Alert) step10Alert.style.display = 'none';
      });
    }
  }

  if (step10RegUsername && step10UsernamePreview) {
    step10RegUsername.addEventListener('input', (e) => {
      const clean = e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '');
      step10UsernamePreview.textContent = clean || 'yourname';
    });
  }

  cardEditorForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // 1. Explicitly check required wizard fields and direct user to missing detail
    if (!validateWizardState()) {
      return;
    }

    // 2. Execute Account Creation / Login on Step 10 for unauthenticated users
    if (!isLoggedIn) {
      if (currentStep < 10) {
        goToStep(10);
        return;
      }

      const step10ResetBox = document.getElementById('step10-reset-box');
      const isResetMode = step10ResetBox && step10ResetBox.style.display !== 'none';
      const isLoginMode = step10LoginBox && step10LoginBox.style.display !== 'none';
      const step10Alert = document.getElementById('step10-auth-alert');

      function showStep10Alert(msg, isErr = true) {
        if (!step10Alert) return;
        step10Alert.textContent = msg;
        step10Alert.className = 'modal-alert ' + (isErr ? 'alert-error' : 'alert-success');
        step10Alert.style.display = 'block';
      }

      if (step10Alert) step10Alert.style.display = 'none';

      if (isResetMode) {
        const resetEmailEl = document.getElementById('step10-reset-email');
        const resetUserEl = document.getElementById('step10-reset-username');
        const resetPassEl = document.getElementById('step10-reset-password');
        const resetConfEl = document.getElementById('step10-reset-confirm');

        const email = (resetEmailEl ? resetEmailEl.value : '').trim();
        const username = (resetUserEl ? resetUserEl.value : '').trim().toLowerCase();
        const newPassword = (resetPassEl ? resetPassEl.value : '').trim();
        const confirmPassword = (resetConfEl ? resetConfEl.value : '').trim();

        if (!email || !username || !newPassword) {
          showStep10Alert('Registered email, username handle, and new password are required.');
          return;
        }

        if (newPassword.length < 6) {
          showStep10Alert('Password must be at least 6 characters.');
          return;
        }

        if (newPassword !== confirmPassword) {
          showStep10Alert('New passwords do not match. Please re-enter.');
          return;
        }

        try {
          if (saveCardBtn) {
            saveCardBtn.disabled = true;
            saveCardBtn.innerHTML = '<span>Resetting Password & Publishing... ⏳</span>';
          }
          const res = await fetch('/api/auth/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, username, newPassword })
          });
          let data;
          try {
            data = await res.json();
          } catch {
            throw new Error(`Server returned an unexpected response (${res.status}). Please try again.`);
          }
          if (!res.ok) throw new Error(data.error || 'Password reset failed.');

          token = data.token;
          localStorage.setItem('card_token', token);
          localStorage.setItem('card_user', JSON.stringify(data.user));
          currentUser = data.user;
          isLoggedIn = true;

          await savePublishedCard();
          onCardPublishedSuccess(`🎉 Password reset! Card published live.`);
        } catch (err) {
          showStep10Alert(err.message);
          if (saveCardBtn) {
            saveCardBtn.disabled = false;
            saveCardBtn.innerHTML = '<span>Reset Password & Publish Live 🚀</span>';
          }
        }
        return;
      } else if (isLoginMode) {
        const logIdEl = document.getElementById('step10-login-identifier');
        const logPassEl = document.getElementById('step10-login-password');
        const identifier = (logIdEl ? logIdEl.value : '').trim();
        const password = (logPassEl ? logPassEl.value : '').trim();

        if (!identifier || !password) {
          showStep10Alert('Please enter your email/username and password.');
          return;
        }

        try {
          if (saveCardBtn) {
            saveCardBtn.disabled = true;
            saveCardBtn.innerHTML = '<span>Signing In & Publishing... ⏳</span>';
          }
          const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: identifier, password })
          });
          let data;
          try {
            data = await res.json();
          } catch {
            throw new Error(`Server returned an unexpected response (${res.status}). Please try again.`);
          }
          if (!res.ok) throw new Error(data.error || 'Invalid email/username or password.');

          token = data.token;
          localStorage.setItem('card_token', token);
          currentUser = data.user;
          isLoggedIn = true;

          await savePublishedCard();
          onCardPublishedSuccess(`🎉 Welcome back, ${currentUser.username}! Card published live.`);
        } catch (err) {
          showStep10Alert(err.message);
          if (saveCardBtn) {
            saveCardBtn.disabled = false;
            saveCardBtn.innerHTML = '<span>Sign In & Publish Live 🚀</span>';
          }
        }
      } else {
        const regEmailEl = document.getElementById('step10-reg-email');
        const regUserEl = document.getElementById('step10-reg-username');
        const regPassEl = document.getElementById('step10-reg-password');
        const email = (regEmailEl ? regEmailEl.value : '').trim();
        const username = (regUserEl ? regUserEl.value : '').trim().toLowerCase();
        const password = (regPassEl ? regPassEl.value : '').trim();

        if (!email || !username || !password) {
          showStep10Alert('Email, custom username, and password are required.');
          return;
        }

        if (password.length < 6) {
          showStep10Alert('Password must be at least 6 characters.');
          return;
        }

        try {
          if (saveCardBtn) {
            saveCardBtn.disabled = true;
            saveCardBtn.innerHTML = '<span>Creating Account & Publishing... ⏳</span>';
          }
          const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, username, password })
          });
          let data;
          try {
            data = await res.json();
          } catch {
            throw new Error(`Server returned an unexpected response (${res.status}). Please try again.`);
          }
          if (!res.ok) {
            if (data.error && data.error.toLowerCase().includes('already registered')) {
              throw new Error('This email is already registered! Click "Sign In Instead" below to log into your account.');
            }
            if (data.error && data.error.toLowerCase().includes('already taken')) {
              throw new Error('This username is already taken. Please choose another username.');
            }
            throw new Error(data.error || 'Account creation failed');
          }

          token = data.token;
          localStorage.setItem('card_token', token);
          currentUser = data.user;
          isLoggedIn = true;

          await savePublishedCard();
          onCardPublishedSuccess(`🎉 Account created! Card published live at /c/${currentUser.username}`);
        } catch (err) {
          showStep10Alert(err.message);
          if (saveCardBtn) {
            saveCardBtn.disabled = false;
            saveCardBtn.innerHTML = '<span>Create Account & Publish Live 🚀</span>';
          }
        }
      }
      return;
    }

    // 3. Publish card for logged-in user
    try {
      if (saveCardBtn) {
        saveCardBtn.disabled = true;
        saveCardBtn.innerHTML = '<span>Publishing... ⏳</span>';
      }
      await savePublishedCard();
      onCardPublishedSuccess('🎉 Card published successfully! Moved to your dashboard.');
    } catch (err) {
      showToast('❌ Submission Error: ' + err.message);
    } finally {
      if (saveCardBtn) {
        saveCardBtn.disabled = false;
        saveCardBtn.innerHTML = '<span>Save & Publish Changes 🚀</span>';
      }
    }
  });

  function onCardPublishedSuccess(msg) {
    syncAuthStateUI();
    renderDashboardCardsGrid();
    renderCardSwitcherUI();
    const targetHandle = (currentCard && currentCard.username) || (currentUser && currentUser.username) || '';
    if (liveCardIframe && targetHandle) {
      liveCardIframe.src = `/c/${targetHandle}?t=` + Date.now();
    }
    switchDashboardView('cards');
    showPublishedSuccessBanner(targetHandle);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast(msg || `🎉 Card published live! Moved to your dashboard.`);
  }


  // --------------------------------------------------------------------------
  // MULTI-CARD SWITCHER & NEW CONFERENCE CARD CREATION LOGIC
  // --------------------------------------------------------------------------
  const cardSwitcherWrap = document.getElementById('card-switcher-wrap');
  const cardSwitcherBtn = document.getElementById('card-switcher-btn');
  const cardSwitcherDropdown = document.getElementById('card-switcher-dropdown');
  const switcherCurrentTitle = document.getElementById('switcher-current-title');
  const cardSwitcherList = document.getElementById('card-switcher-list');
  const cardCountBadge = document.getElementById('card-count-badge');
  const openNewCardModalBtn = document.getElementById('open-new-card-modal-btn');
  const newCardModal = document.getElementById('new-card-modal');
  const newCardModalClose = document.getElementById('new-card-modal-close');
  const newCardForm = document.getElementById('new-card-form');
  const newCardAlert = document.getElementById('new-card-alert');
  const newCardUsername = document.getElementById('new-card-username');
  const newCardUsernamePreview = document.getElementById('new-card-username-preview');

  function renderCardSwitcherUI() {
    if (!cardSwitcherWrap) return;

    if (!isLoggedIn || !userCards || userCards.length === 0) {
      cardSwitcherWrap.style.display = 'none';
      return;
    }

    cardSwitcherWrap.style.display = 'inline-flex';
    if (cardCountBadge) cardCountBadge.textContent = userCards.length;

    const active = currentCard || userCards[0];
    if (switcherCurrentTitle) {
      switcherCurrentTitle.textContent = active.editionMark || active.fullName || `/c/${active.username}`;
    }

    if (cardSwitcherList) {
      cardSwitcherList.innerHTML = '';
      userCards.forEach(c => {
        const item = document.createElement('div');
        const isActive = c.id === (currentCard ? currentCard.id : null);
        item.className = 'card-switcher-item' + (isActive ? ' active' : '');
        item.innerHTML = `
          <div class="card-switcher-item-left">
            <span class="card-switcher-item-name">${escapeHtml(c.editionMark || c.fullName || 'Conference Card')}</span>
            <span class="card-switcher-item-url">/c/${escapeHtml(c.username)}</span>
          </div>
          ${isActive ? '<span class="card-switcher-item-tag">ACTIVE</span>' : ''}
        `;
        item.onclick = () => {
          selectActiveCard(c);
          if (cardSwitcherDropdown) cardSwitcherDropdown.style.display = 'none';
        };
        cardSwitcherList.appendChild(item);
      });
    }
  }

  function selectActiveCard(card) {
    currentCard = card;
    currentCardId = card.id;
    if (card.id) localStorage.setItem('active_card_id', card.id);
    populateForm(card);
    syncAuthStateUI();
    renderCardSwitcherUI();
    emitLiveUpdate();
    showToast(`Switched to: ${card.editionMark || card.username}`);
  }

  if (cardSwitcherBtn && cardSwitcherDropdown) {
    cardSwitcherBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isVisible = cardSwitcherDropdown.style.display === 'block';
      cardSwitcherDropdown.style.display = isVisible ? 'none' : 'block';
    });

    document.addEventListener('click', (e) => {
      if (cardSwitcherWrap && !cardSwitcherWrap.contains(e.target)) {
        cardSwitcherDropdown.style.display = 'none';
      }
    });
  }

  function openNewCardModal() {
    if (!newCardModal) return;
    if (cardSwitcherDropdown) cardSwitcherDropdown.style.display = 'none';
    if (newCardAlert) {
      newCardAlert.style.display = 'none';
      newCardAlert.textContent = '';
    }
    if (newCardForm) newCardForm.reset();
    if (newCardUsernamePreview) newCardUsernamePreview.textContent = 'yourname-event';
    newCardModal.classList.remove('hidden');
    newCardModal.style.setProperty('display', 'flex', 'important');
  }

  function closeNewCardModal() {
    if (!newCardModal) return;
    newCardModal.classList.add('hidden');
    newCardModal.style.setProperty('display', 'none', 'important');
    if (newCardAlert) {
      newCardAlert.style.display = 'none';
      newCardAlert.textContent = '';
    }
  }

  if (openNewCardModalBtn && newCardModal) {
    openNewCardModalBtn.addEventListener('click', openNewCardModal);
  }

  if (newCardModalClose && newCardModal) {
    newCardModalClose.addEventListener('click', closeNewCardModal);
  }

  if (newCardModal) {
    newCardModal.addEventListener('click', (e) => {
      if (e.target === newCardModal) {
        closeNewCardModal();
      }
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && newCardModal && !newCardModal.classList.contains('hidden')) {
      closeNewCardModal();
    }
  });

  if (newCardUsername && newCardUsernamePreview) {
    newCardUsername.addEventListener('input', (e) => {
      const clean = e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '');
      newCardUsernamePreview.textContent = clean || 'yourname-event';
    });
  }

  if (newCardForm) {
    newCardForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const eventName = document.getElementById('new-card-event').value.trim();
      const username = newCardUsername.value.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
      const role = document.getElementById('new-card-role').value.trim();
      const copyDetails = document.getElementById('new-card-copy-details').checked;
      const submitBtn = document.getElementById('new-card-submit-btn');

      function showNewCardAlert(msg, isErr = true) {
        if (!newCardAlert) return;
        newCardAlert.textContent = msg;
        newCardAlert.className = 'modal-alert ' + (isErr ? 'alert-error' : 'alert-success');
        newCardAlert.style.display = 'block';
      }

      if (!eventName || !username) {
        showNewCardAlert('Event name and custom link are required.');
        return;
      }

      try {
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.innerHTML = '<span>Creating Card... ⏳</span>';
        }

        const payload = {
          username,
          editionMark: eventName,
          roleTitle: role || (currentCard ? currentCard.roleTitle : ''),
          copyFromCardId: (copyDetails && currentCard) ? currentCard.id : null
        };

        const res = await fetch('/api/cards', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });

        let data;
        try {
          data = await res.json();
        } catch {
          throw new Error(`Server returned an unexpected response (${res.status}). Please try again.`);
        }

        if (!res.ok) throw new Error(data.error || 'Failed to create conference card.');

        // Close modal immediately upon successful creation
        closeNewCardModal();

        try {
          userCards = data.cards || [data.card, ...userCards];
          selectActiveCard(data.card);
          renderDashboardCardsGrid();
          switchDashboardView('cards');
          showPublishedSuccessBanner(data.card.username);
          window.scrollTo({ top: 0, behavior: 'smooth' });
          showToast(`🎉 New card created for ${eventName}! Public link: /c/${data.card.username}`);
        } catch (uiErr) {
          console.warn('UI update notice:', uiErr);
          showToast(`🎉 New card created! Public link: /c/${data.card.username}`);
        }
      } catch (err) {
        showNewCardAlert(err.message);
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = '<span>Create & Launch Card 🚀</span>';
        }
      }
    });
  }

  // Init Theme & Auth State & Wizard Step 1
  initTheme();
  syncAuthStateUI();
  emitLiveUpdate();
  initUserSession();
  goToStep(1);
});
