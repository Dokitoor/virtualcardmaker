document.addEventListener('DOMContentLoaded', async () => {
  const token = localStorage.getItem('card_token');
  if (!token) {
    window.location.href = '/login';
    return;
  }

  // DOM Elements
  const userDisplayEmail = document.getElementById('user-display-email');
  const logoutBtn = document.getElementById('logout-btn');
  const vanityUrlLink = document.getElementById('vanity-url-link');
  const copyUrlBtn = document.getElementById('copy-url-btn');
  const openLiveBtn = document.getElementById('open-live-btn');
  const cardEditorForm = document.getElementById('card-editor-form');
  const previewUsernameTag = document.getElementById('preview-username-tag');
  const liveCardIframe = document.getElementById('live-card-iframe');
  const toastElement = document.getElementById('toast-notification');
  const toastMessage = document.getElementById('toast-message');

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
  let toastTimeout = null;

  function showToast(msg) {
    if (!toastElement) return;
    toastMessage.textContent = msg;
    toastElement.classList.add('is-visible');
    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => toastElement.classList.remove('is-visible'), 2800);
  }

  // Fetch Current User & Card
  try {
    const res = await fetch('/api/me', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Session expired');
    const data = await res.json();
    currentUser = data.user;
    currentCard = data.card;

    userDisplayEmail.textContent = currentUser.email;
    previewUsernameTag.textContent = currentUser.username;

    const fullVanityUrl = `${window.location.origin}/c/${currentUser.username}`;
    vanityUrlLink.href = fullVanityUrl;
    vanityUrlLink.textContent = fullVanityUrl;
    openLiveBtn.href = fullVanityUrl;

    // Populate Form Fields
    populateForm(currentCard);

    // Set Live Iframe Source
    liveCardIframe.src = `/c/${currentUser.username}`;

  } catch (err) {
    console.error(err);
    localStorage.removeItem('card_token');
    window.location.href = '/login';
    return;
  }

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
  }

  // Reload Live Iframe
  function refreshPreview() {
    liveCardIframe.src = `/c/${currentUser.username}?t=` + Date.now();
  }

  // Copy Vanity URL
  copyUrlBtn.addEventListener('click', async () => {
    const url = vanityUrlLink.href;
    try {
      await navigator.clipboard.writeText(url);
      showToast('Custom card URL copied to clipboard!');
    } catch {
      showToast('Card URL: ' + url);
    }
  });

  // Logout Handler
  logoutBtn.addEventListener('click', async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch {}
    localStorage.removeItem('card_token');
    localStorage.removeItem('card_user');
    window.location.href = '/login';
  });

  // Handle Card Form Submit
  cardEditorForm.addEventListener('submit', async (e) => {
    e.preventDefault();

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

    if (editPhotoFile.files[0]) {
      formData.append('photo', editPhotoFile.files[0]);
    }

    try {
      const res = await fetch('/api/card', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update card');

      currentCard = data.card;
      showToast('Card published successfully!');
      refreshPreview();
    } catch (err) {
      showToast('Error: ' + err.message);
    }
  });
});
