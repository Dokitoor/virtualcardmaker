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

  // Modal Elements
  const authModal = document.getElementById('auth-modal');
  const authModalClose = document.getElementById('auth-modal-close');
  const modalTabRegister = document.getElementById('modal-tab-register');
  const modalTabLogin = document.getElementById('modal-tab-login');
  const modalRegisterForm = document.getElementById('modal-register-form');
  const modalLoginForm = document.getElementById('modal-login-form');
  const modalAuthAlert = document.getElementById('modal-auth-alert');
  const modalRegUsername = document.getElementById('modal-reg-username');
  const modalUsernamePreview = document.getElementById('modal-username-preview');

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
  let isLoggedIn = false;
  let toastTimeout = null;
  let draftPhotoUrl = null;
  let currentStep = 1;
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
    if (!themeOptionsGrid) return;
    const themeCards = themeOptionsGrid.querySelectorAll('.theme-card-option');
    themeCards.forEach(card => {
      if (card.getAttribute('data-theme-val') === themeVal) {
        card.classList.add('active');
      } else {
        card.classList.remove('active');
      }
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

  // Check User Session
  if (token) {
    try {
      const res = await fetch('/api/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        currentUser = data.user;
        currentCard = data.card;
        isLoggedIn = true;
      } else {
        localStorage.removeItem('card_token');
        token = null;
      }
    } catch {
      token = null;
    }
  }

  // Update UI for Auth State
  function syncAuthStateUI() {
    if (isLoggedIn && currentUser) {
      userDisplayEmail.textContent = currentUser.email;
      logoutBtn.textContent = 'Logout';
      previewUsernameTag.textContent = currentUser.username;

      const fullVanityUrl = `${window.location.origin}/c/${currentUser.username}`;
      vanityUrlLink.href = fullVanityUrl;
      vanityUrlLink.textContent = fullVanityUrl;
      openLiveBtn.href = fullVanityUrl;

      saveCardBtn.innerHTML = '<span>Save & Publish Changes 🚀</span>';
      liveCardIframe.src = `/c/${currentUser.username}`;
      populateForm(currentCard);
    } else {
      userDisplayEmail.textContent = '⚡ DRAFT MODE (Unpublished)';
      logoutBtn.textContent = 'Sign In / Register';
      previewUsernameTag.textContent = 'yourname';

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

  function emitLiveUpdate() {
    if (!liveCardIframe || !liveCardIframe.contentWindow) return;
    const draftCard = {
      fullName: editFullName.value || 'YOUR NAME',
      roleTitle: editRoleTitle.value || 'PROFESSIONAL TITLE & ROLE',
      positioningStatement: editPositioningStatement.value || 'Add a brief tagline or description of what you do to showcase your professional profile.',
      capabilities: editCapabilities.value ? editCapabilities.value.split(',').map(s => s.trim()).filter(Boolean) : ['PRODUCT DESIGN', 'STRATEGY', 'CREATIVE'],
      editionMark: editEditionMark.value || 'DIGITAL EDITION 2026',
      brandSubmark: editBrandSubmark.value || 'CARD—PASS',
      theme: editTheme.value || 'terracotta',
      email: editEmail.value || '',
      phone: editPhone.value || '',
      whatsapp: editWhatsapp.value || '',
      linkedinUrl: editLinkedinUrl.value || '',
      portfolioUrl: editPortfolioUrl.value || '',
      photoUrl: draftPhotoUrl || (currentCard && currentCard.photoUrl ? currentCard.photoUrl : '/assets/default-avatar.png')
    };

    if (avatarPreviewImg) {
      avatarPreviewImg.src = draftCard.photoUrl;
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

    liveCardIframe.contentWindow.postMessage({ type: 'LIVE_CARD_UPDATE', card: draftCard }, '*');
  }

  // Attach real-time input listeners
  const allFormInputs = cardEditorForm.querySelectorAll('input:not([type="file"]), textarea, select');
  allFormInputs.forEach(input => {
    input.addEventListener('input', emitLiveUpdate);
    input.addEventListener('change', emitLiveUpdate);
    input.addEventListener('keyup', emitLiveUpdate);
  });

  // Photo file preview listener
  if (editPhotoFile) {
    editPhotoFile.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (evt) => {
          draftPhotoUrl = evt.target.result;
          if (avatarPreviewImg) avatarPreviewImg.src = draftPhotoUrl;
          emitLiveUpdate();
        };
        reader.readAsDataURL(file);
      }
    });
  }

  liveCardIframe.addEventListener('load', () => {
    setTimeout(emitLiveUpdate, 350);
  });

  function populateForm(card) {
    if (!card) return;
    editFullName.value = card.fullName || '';
    editRoleTitle.value = card.roleTitle || '';
    editPositioningStatement.value = card.positioningStatement || '';
    editCapabilities.value = Array.isArray(card.capabilities) ? card.capabilities.join(', ') : (card.capabilities || '');
    editEditionMark.value = card.editionMark || '';
    editBrandSubmark.value = card.brandSubmark || '';
    editTheme.value = card.theme || 'terracotta';
    editEmail.value = card.email || '';
    editPhone.value = card.phone || '';
    editWhatsapp.value = card.whatsapp || '';
    editLinkedinUrl.value = card.linkedinUrl || '';
    editPortfolioUrl.value = card.portfolioUrl || '';

    if (card.photoUrl && avatarPreviewImg) {
      avatarPreviewImg.src = card.photoUrl;
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
      token = null;
      syncAuthStateUI();
      showToast('Logged out.');
    } else {
      openAuthModal();
    }
  });

  function openAuthModal(defaultTab = 'register') {
    if (!authModal) return;
    hideModalAlert();

    if (editFullName.value && !modalRegUsername.value) {
      const suggested = editFullName.value.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
      if (suggested) {
        modalRegUsername.value = suggested;
        modalUsernamePreview.textContent = suggested;
      }
    }

    switchModalTab(defaultTab);
    authModal.style.display = 'flex';
  }

  function closeAuthModal() {
    if (authModal) authModal.style.display = 'none';
  }

  function switchModalTab(tab) {
    hideModalAlert();
    if (tab === 'login') {
      modalTabLogin.classList.add('active');
      modalTabRegister.classList.remove('active');
      modalLoginForm.style.display = 'flex';
      modalRegisterForm.style.display = 'none';
    } else {
      modalTabRegister.classList.add('active');
      modalTabLogin.classList.remove('active');
      modalRegisterForm.style.display = 'flex';
      modalLoginForm.style.display = 'none';
    }
  }

  if (authModalClose) authModalClose.onclick = closeAuthModal;
  if (modalTabRegister) modalTabRegister.onclick = () => switchModalTab('register');
  if (modalTabLogin) modalTabLogin.onclick = () => switchModalTab('login');

  if (modalRegUsername) {
    modalRegUsername.addEventListener('input', () => {
      const val = modalRegUsername.value.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
      modalUsernamePreview.textContent = val || 'yourname';
    });
  }

  if (modalRegisterForm) {
    modalRegisterForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideModalAlert();

      const email = document.getElementById('modal-reg-email').value;
      const username = modalRegUsername.value.trim().toLowerCase();
      const password = document.getElementById('modal-reg-password').value;

      try {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, username, password })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Registration failed');

        token = data.token;
        localStorage.setItem('card_token', token);
        localStorage.setItem('card_user', JSON.stringify(data.user));
        currentUser = data.user;
        isLoggedIn = true;

        showModalAlert('Account created! Publishing your card...', false);

        await savePublishedCard();

        closeAuthModal();
        syncAuthStateUI();
        showToast(`🎉 Card published live! Your link is /c/${currentUser.username}`);
      } catch (err) {
        showModalAlert(err.message);
      }
    });
  }

  if (modalLoginForm) {
    modalLoginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideModalAlert();

      const identifier = document.getElementById('modal-login-identifier').value;
      const password = document.getElementById('modal-login-password').value;

      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: identifier, password })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Login failed');

        token = data.token;
        localStorage.setItem('card_token', token);
        localStorage.setItem('card_user', JSON.stringify(data.user));
        currentUser = data.user;
        isLoggedIn = true;

        showModalAlert('Logged in! Updating your card...', false);

        await savePublishedCard();

        closeAuthModal();
        syncAuthStateUI();
        showToast(`Welcome back, ${currentUser.username}! Card updated.`);
      } catch (err) {
        showModalAlert(err.message);
      }
    });
  }

  async function savePublishedCard() {
    const formData = new FormData();
    formData.append('fullName', editFullName.value);
    formData.append('roleTitle', editRoleTitle.value);
    formData.append('positioningStatement', editPositioningStatement.value);
    formData.append('capabilities', editCapabilities.value);
    formData.append('editionMark', editEditionMark.value);
    formData.append('brandSubmark', editBrandSubmark.value);
    formData.append('theme', editTheme.value);
    formData.append('email', editEmail.value);
    formData.append('phone', editPhone.value);
    formData.append('whatsapp', editWhatsapp.value);
    formData.append('linkedinUrl', editLinkedinUrl.value);
    formData.append('portfolioUrl', editPortfolioUrl.value);

    if (editPhotoFile && editPhotoFile.files[0]) {
      formData.append('photo', editPhotoFile.files[0]);
    }

    const res = await fetch('/api/card', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to save card');
    currentCard = data.card;
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
      step10RegisterBox.style.display = 'none';
      step10LoginBox.style.display = 'block';
      if (step10MainTitle) step10MainTitle.textContent = 'Sign in to publish your card';
      if (step10MainSub) step10MainSub.textContent = 'Sign in with your Meetme account to publish your card changes.';
      if (saveCardBtn) saveCardBtn.innerHTML = '<span>Sign In & Publish Live 🚀</span>';
    });

    step10ShowRegisterBtn.addEventListener('click', () => {
      step10LoginBox.style.display = 'none';
      step10RegisterBox.style.display = 'block';
      if (step10MainTitle) step10MainTitle.textContent = 'Create your account to publish';
      if (step10MainSub) step10MainSub.textContent = 'Your card is ready! Create your free account to publish your card and claim your custom share link.';
      if (saveCardBtn) saveCardBtn.innerHTML = '<span>Create Account & Publish Live 🚀</span>';
    });
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

      const isLoginMode = step10RegisterBox && step10RegisterBox.style.display === 'none';
      const step10Alert = document.getElementById('step10-auth-alert');

      function showStep10Alert(msg, isErr = true) {
        if (!step10Alert) return;
        step10Alert.textContent = msg;
        step10Alert.className = 'modal-alert ' + (isErr ? 'alert-error' : 'alert-success');
        step10Alert.style.display = 'block';
      }

      if (step10Alert) step10Alert.style.display = 'none';

      if (isLoginMode) {
        const identifier = (document.getElementById('step10-login-identifier').value || '').trim();
        const password = (document.getElementById('step10-login-password').value || '').trim();

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
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Login failed');

          token = data.token;
          localStorage.setItem('card_token', token);
          currentUser = data.user;
          isLoggedIn = true;

          await savePublishedCard();
          syncAuthStateUI();
          showToast(`🎉 Welcome back, ${currentUser.username}! Card published live.`);
          window.location.href = `/c/${currentUser.username}`;
        } catch (err) {
          showStep10Alert(err.message);
          if (saveCardBtn) {
            saveCardBtn.disabled = false;
            saveCardBtn.innerHTML = '<span>Sign In & Publish Live 🚀</span>';
          }
        }
      } else {
        const email = (document.getElementById('step10-reg-email').value || '').trim();
        const username = (document.getElementById('step10-reg-username').value || '').trim().toLowerCase();
        const password = (document.getElementById('step10-reg-password').value || '').trim();

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
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Account creation failed');

          token = data.token;
          localStorage.setItem('card_token', token);
          currentUser = data.user;
          isLoggedIn = true;

          await savePublishedCard();
          syncAuthStateUI();
          showToast(`🎉 Account created! Card published live at /c/${currentUser.username}`);
          window.location.href = `/c/${currentUser.username}`;
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
      showToast('🎉 Card published successfully!');
      if (liveCardIframe && currentUser) {
        liveCardIframe.src = `/c/${currentUser.username}?t=` + Date.now();
      }
    } catch (err) {
      showToast('❌ Submission Error: ' + err.message);
    } finally {
      if (saveCardBtn) {
        saveCardBtn.disabled = false;
        saveCardBtn.innerHTML = '<span>Save & Publish Changes 🚀</span>';
      }
    }
  });

  // Init Theme & Auth State & Wizard Step 1
  initTheme();
  syncAuthStateUI();
  goToStep(1);
});
