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

      saveCardBtn.innerHTML = '<span>Save & Publish Changes</span>';
      liveCardIframe.src = `/c/${currentUser.username}`;
      populateForm(currentCard);
    } else {
      userDisplayEmail.textContent = '⚡ DRAFT MODE (Unpublished)';
      logoutBtn.textContent = 'Sign In / Register';
      previewUsernameTag.textContent = 'yourname';

      const draftVanityUrl = `${window.location.origin}/c/yourname`;
      vanityUrlLink.href = '#';
      vanityUrlLink.textContent = `${draftVanityUrl} (Claim your link below)`;
      openLiveBtn.href = '#';
      openLiveBtn.onclick = (e) => { e.preventDefault(); openAuthModal(); };

      saveCardBtn.innerHTML = '<span>Publish & Claim Custom Link 🚀</span>';
      liveCardIframe.src = `/c/demo`;

      // Check if draft exists in localStorage or load defaults
      const savedDraft = localStorage.getItem('card_draft');
      if (savedDraft) {
        try { populateForm(JSON.parse(savedDraft)); } catch {}
      } else {
        populateForm({
          fullName: 'Oluseyi Ogundipe',
          roleTitle: 'Product & Information Designer | Project Manager',
          positioningStatement: 'Designing digital products, simplifying complex information, and helping turn ideas into meaningful projects.',
          capabilities: ['PRODUCT DESIGN', 'INFORMATION DESIGN', 'PROJECT MANAGEMENT'],
          editionMark: 'NAIROBI EDITION 2026',
          brandSubmark: 'OO—DESIGN',
          theme: 'terracotta',
          email: 'you@example.com',
          phone: '+234 814 891 8630',
          whatsapp: '+2348148918630',
          linkedinUrl: 'https://linkedin.com',
          portfolioUrl: 'https://example.com'
        });
      }
    }
  }

  function emitLiveUpdate() {
    if (!liveCardIframe || !liveCardIframe.contentWindow) return;
    const draftCard = {
      fullName: editFullName.value,
      roleTitle: editRoleTitle.value,
      positioningStatement: editPositioningStatement.value,
      capabilities: editCapabilities.value ? editCapabilities.value.split(',').map(s => s.trim()).filter(Boolean) : [],
      editionMark: editEditionMark.value,
      brandSubmark: editBrandSubmark.value,
      theme: editTheme.value,
      email: editEmail.value,
      phone: editPhone.value,
      whatsapp: editWhatsapp.value,
      linkedinUrl: editLinkedinUrl.value,
      portfolioUrl: editPortfolioUrl.value,
      photoUrl: draftPhotoUrl || (currentCard ? currentCard.photoUrl : '/assets/oluseyi-ogundipe.jpg')
    };

    // Save draft locally if guest
    if (!isLoggedIn) {
      localStorage.setItem('card_draft', JSON.stringify(draftCard));
    }

    liveCardIframe.contentWindow.postMessage({ type: 'LIVE_CARD_UPDATE', card: draftCard }, '*');
  }

  // Attach real-time input listeners across all form controls
  const allFormInputs = cardEditorForm.querySelectorAll('input:not([type="file"]), textarea, select');
  allFormInputs.forEach(input => {
    input.addEventListener('input', emitLiveUpdate);
    input.addEventListener('change', emitLiveUpdate);
    input.addEventListener('keyup', emitLiveUpdate);
  });

  // Real-time photo file preview listener
  if (editPhotoFile) {
    editPhotoFile.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (evt) => {
          draftPhotoUrl = evt.target.result;
          emitLiveUpdate();
        };
        reader.readAsDataURL(file);
      }
    });
  }

  // Send initial live sync when iframe loads
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
    emitLiveUpdate();
  }

  // Copy Vanity URL
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

  // Logout or Login Click
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

  // --------------------------------------------------------------------------
  // AUTH MODAL & PUBLISH WORKFLOW
  // --------------------------------------------------------------------------
  function openAuthModal(defaultTab = 'register') {
    if (!authModal) return;
    hideModalAlert();

    // Auto-suggest username from name
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

  // Submit Registration from Modal
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

        // Instantly save current draft card details to new account
        await savePublishedCard();

        closeAuthModal();
        syncAuthStateUI();
        showToast(`🎉 Card published live! Your link is /c/${currentUser.username}`);
      } catch (err) {
        showModalAlert(err.message);
      }
    });
  }

  // Submit Login from Modal
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

        // Save current editor changes to logged in account
        await savePublishedCard();

        closeAuthModal();
        syncAuthStateUI();
        showToast(`Welcome back, ${currentUser.username}! Card updated.`);
      } catch (err) {
        showModalAlert(err.message);
      }
    });
  }

  // Save Card to Server
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

  // Handle Main Card Editor Form Submit
  cardEditorForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!isLoggedIn) {
      openAuthModal('register');
      return;
    }

    try {
      await savePublishedCard();
      showToast('Card published successfully!');
      if (liveCardIframe && currentUser) {
        liveCardIframe.src = `/c/${currentUser.username}?t=` + Date.now();
      }
    } catch (err) {
      showToast('Error: ' + err.message);
    }
  });

  // Initialize UI
  syncAuthStateUI();
});
