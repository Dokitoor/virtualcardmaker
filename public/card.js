document.addEventListener('DOMContentLoaded', async () => {
  // Extract username from URL path /c/:username or query parameter ?u=username
  let username = window.location.pathname.split('/c/')[1];
  if (!username) {
    const params = new URLSearchParams(window.location.search);
    username = params.get('u') || 'dokitoor';
  }
  username = username.replace(/\/$/, '').toLowerCase();

  // Elements
  const cardElement = document.getElementById('card-element');
  const tabFront = document.getElementById('tab-front');
  const tabBack = document.getElementById('tab-back');
  const flipToBackBtn = document.getElementById('flip-to-back-btn');
  const flipToFrontBtn = document.getElementById('flip-to-front-btn');
  const saveVcfBtn = document.getElementById('save-vcf-btn');
  const openWalletBtn = document.getElementById('open-wallet-btn');
  const shareCardBtn = document.getElementById('share-card-btn');
  const toastElement = document.getElementById('toast-notification');
  const toastMessage = document.getElementById('toast-message');

  // Modals
  const qrTrigger = document.getElementById('qr-trigger');
  const qrModal = document.getElementById('qr-modal');
  const qrModalClose = document.getElementById('qr-modal-close');
  const qrModalBackdrop = document.getElementById('qr-modal-backdrop');

  const appleWalletModal = document.getElementById('apple-wallet-modal');
  const walletModalClose = document.getElementById('wallet-modal-close');
  const walletModalBackdrop = document.getElementById('wallet-modal-backdrop');
  const walletPassCard = document.getElementById('wallet-pass-card');
  const flipWalletPassBtn = document.getElementById('flip-wallet-pass-btn');
  const flipWalletPassBackBtn = document.getElementById('flip-wallet-pass-back-btn');
  const walletSaveVcfBtn = document.getElementById('wallet-save-vcf-btn');
  const downloadPassBtn = document.getElementById('download-pass-btn');

  // Direct Synchronous API for parent dashboard editor
  window.updateLiveCard = function(data) {
    if (!data) return;
    hasReceivedLiveUpdate = true;
    cardData = Object.assign({}, data);
    renderCard(cardData);
    if (cardElement) {
      cardElement.classList.remove('typing-pulse');
      void cardElement.offsetWidth;
      cardElement.classList.add('typing-pulse');
    }
  };

  // Synchronous Handshake with parent dashboard window
  if (window.parent && window.parent !== window) {
    try {
      window.parent.postMessage({ type: 'IFRAME_READY' }, '*');
      if (typeof window.parent.getCurrentDraftCard === 'function') {
        const parentDraft = window.parent.getCurrentDraftCard();
        if (parentDraft) {
          window.updateLiveCard(parentDraft);
        }
      }
    } catch (err) {}
  }

  const iphoneShareModal = document.getElementById('iphone-share-modal');
  const iphoneShareClose = document.getElementById('iphone-share-close');
  const iphoneShareBackdrop = document.getElementById('iphone-share-backdrop');
  const shareAirdropBtn = document.getElementById('share-airdrop-btn');
  const shareVcfBtn = document.getElementById('share-vcf-btn');
  const shareWalletBtn = document.getElementById('share-wallet-btn');
  const shareSmsBtn = document.getElementById('share-sms-btn');
  const shareWhatsappBtn = document.getElementById('share-whatsapp-btn');
  const shareQrBtn = document.getElementById('share-qr-btn');
  const shareCopyLinkBtn = document.getElementById('share-copy-link-btn');

  let cardData = null;
  let isFlipped = false;
  let isPassFlipped = false;
  let toastTimeout = null;
  let cachedPhotoBase64 = '';

  function showToast(msg) {
    if (!toastElement) return;
    toastMessage.textContent = msg;
    toastElement.classList.add('is-visible');
    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => toastElement.classList.remove('is-visible'), 2800);
  }

  // Audio click synthesizer
  let audioCtx = null;
  function playSubtleClick() {
    try {
      if (!audioCtx) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) audioCtx = new AudioContextClass();
      }
      if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
      if (!audioCtx) return;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(180, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.05);
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.05);
    } catch {}
  }

  let hasReceivedLiveUpdate = false;

  // Fetch Public Card Data
  async function loadPublicCardData() {
    try {
      const res = await fetch(`/api/cards/${username}`);
      if (!res.ok) throw new Error('Card not found');
      const result = await res.json();
      if (!hasReceivedLiveUpdate) {
        cardData = result.card;
        renderCard(cardData);
      }
    } catch (err) {
      console.warn('Falling back to blank card state', err);
      if (!hasReceivedLiveUpdate) {
        cardData = {
          username: username || 'cardholder',
          fullName: '',
          roleTitle: '',
          positioningStatement: '',
          capabilities: [],
          editionMark: 'DIGITAL PASS 2026',
          brandSubmark: 'CARD—PASS',
          photoUrl: '',
          email: '',
          phone: '',
          whatsapp: '',
          linkedinUrl: '',
          portfolioUrl: '',
          theme: 'terracotta'
        };
        renderCard(cardData);
      }
    }
  }

  function renderCard(data) {
    const hasName = Boolean(data.fullName && data.fullName.trim());
    document.title = hasName ? `${data.fullName} — Digital Business Card` : 'Digital Business Card — Meetme';
    
    const pageDesc = document.getElementById('card-page-desc');
    if (pageDesc) {
      pageDesc.content = hasName 
        ? `${data.fullName} — ${data.roleTitle || 'Digital Business Card'}. ${data.positioningStatement || ''}`
        : 'Digital Business Card — Save to iPhone Contacts with photo, Apple Wallet Pass, and QR code.';
    }

    // Apply Theme
    if (data.theme) {
      document.body.setAttribute('data-theme', data.theme);
    }

    // Header & Brand
    const edTag = document.getElementById('card-edition-tag');
    const brandSub = document.getElementById('card-brand-submark');
    const backLoc = document.getElementById('card-back-location');
    if (edTag) edTag.textContent = data.editionMark || 'DIGITAL EDITION 2026';
    if (brandSub) brandSub.textContent = data.brandSubmark || 'CARD—PASS';
    if (backLoc) backLoc.textContent = data.brandSubmark || 'DIGITAL—CARD';

    // Front Face Identity Placeholders
    const nameEl = document.getElementById('card-person-name');
    if (hasName) {
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
    
    const roleEl = document.getElementById('card-role-title');
    if (data.roleTitle && data.roleTitle.trim()) {
      roleEl.classList.remove('is-placeholder-text');
      roleEl.textContent = data.roleTitle;
    } else {
      roleEl.classList.add('is-placeholder-text');
      roleEl.textContent = 'YOUR PROFESSIONAL TITLE / ROLE';
    }

    const posEl = document.getElementById('card-positioning-statement');
    if (data.positioningStatement && data.positioningStatement.trim()) {
      posEl.classList.remove('is-placeholder-text');
      posEl.textContent = data.positioningStatement;
    } else {
      posEl.classList.add('is-placeholder-text');
      posEl.textContent = 'Your personal bio or positioning statement will appear here once configured in your dashboard.';
    }

    // Portrait Image Placeholder with Infallible Fallback
    const portraitImg = document.getElementById('card-portrait-img');
    const appleTouchIcon = document.getElementById('apple-touch-icon-link');
    const displayPhoto = data.photoUrl || '/assets/dummy-avatar.svg';
    if (portraitImg) {
      portraitImg.onerror = () => {
        portraitImg.onerror = null;
        portraitImg.src = '/assets/dummy-avatar.svg';
      };
      portraitImg.src = displayPhoto;
      portraitImg.alt = hasName ? `Portrait of ${data.fullName}` : 'Default avatar placeholder';
    }
    if (appleTouchIcon) appleTouchIcon.href = displayPhoto;

    // Precompute Base64 photo for iOS vCard
    precomputePhoto(displayPhoto);

    // Capabilities Pills & Placeholders
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
        // Placeholder Capabilities
        const sampleCaps = ['YOUR SKILL 01', 'YOUR SKILL 02', 'YOUR SKILL 03'];
        sampleCaps.forEach((cap, idx) => {
          const pill = document.createElement('span');
          pill.className = 'capability-pill is-placeholder';
          pill.innerHTML = `<span class="cap-num">0${idx + 1}</span> ${cap}`;
          capsGrid.appendChild(pill);
        });
      }
    }

    // Back Face Contacts & Placeholders
    const emailWrap = document.getElementById('item-email-wrap');
    const emailLink = document.getElementById('contact-email-link');
    const directEmailBtn = document.getElementById('direct-email-btn');
    const copyEmailBtn = document.getElementById('copy-email-btn');
    if (emailWrap && emailLink) {
      if (data.email) {
        emailWrap.classList.remove('is-placeholder-row');
        emailWrap.style.display = 'flex';
        emailLink.href = `mailto:${data.email}`;
        emailLink.textContent = data.email;
        if (directEmailBtn) directEmailBtn.href = `mailto:${data.email}`;
        if (copyEmailBtn) copyEmailBtn.setAttribute('data-copy', data.email);
      } else {
        emailWrap.classList.add('is-placeholder-row');
        emailWrap.style.display = 'flex';
        emailLink.href = '#';
        emailLink.textContent = 'your.email@example.com';
      }
    }

    const phoneWrap = document.getElementById('item-phone-wrap');
    const phoneLink = document.getElementById('contact-phone-link');
    const directPhoneBtn = document.getElementById('direct-phone-btn');
    const whatsappLink = document.getElementById('contact-whatsapp-link');
    if (phoneWrap && phoneLink) {
      if (data.phone) {
        phoneWrap.classList.remove('is-placeholder-row');
        phoneWrap.style.display = 'flex';
        phoneLink.href = `tel:${data.phone.replace(/\s+/g, '')}`;
        phoneLink.textContent = data.phone;
        if (directPhoneBtn) directPhoneBtn.href = `tel:${data.phone.replace(/\s+/g, '')}`;
        if (whatsappLink) {
          const waNum = data.whatsapp ? data.whatsapp.replace(/[^0-9]/g, '') : data.phone.replace(/[^0-9]/g, '');
          whatsappLink.href = `https://wa.me/${waNum}`;
        }
      } else {
        phoneWrap.classList.add('is-placeholder-row');
        phoneWrap.style.display = 'flex';
        phoneLink.href = '#';
        phoneLink.textContent = '+1 (555) 000-0000';
      }
    }

    const linkedinWrap = document.getElementById('item-linkedin-wrap');
    const linkedinLink = document.getElementById('contact-linkedin-link');
    const directLinkedinBtn = document.getElementById('direct-linkedin-btn');
    if (linkedinWrap && linkedinLink) {
      if (data.linkedinUrl) {
        linkedinWrap.classList.remove('is-placeholder-row');
        linkedinWrap.style.display = 'flex';
        linkedinLink.href = data.linkedinUrl;
        linkedinLink.textContent = data.linkedinUrl.replace(/^https?:\/\/(www\.)?/, '');
        if (directLinkedinBtn) directLinkedinBtn.href = data.linkedinUrl;
      } else {
        linkedinWrap.classList.add('is-placeholder-row');
        linkedinWrap.style.display = 'flex';
        linkedinLink.href = '#';
        linkedinLink.textContent = 'linkedin.com/in/yourprofile';
      }
    }

    const portfolioWrap = document.getElementById('item-portfolio-wrap');
    const portfolioLink = document.getElementById('contact-portfolio-link');
    const directPortfolioBtn = document.getElementById('direct-portfolio-btn');
    if (portfolioWrap && portfolioLink) {
      if (data.portfolioUrl) {
        portfolioWrap.classList.remove('is-placeholder-row');
        portfolioWrap.style.display = 'flex';
        portfolioLink.href = data.portfolioUrl;
        portfolioLink.textContent = data.portfolioUrl.replace(/^https?:\/\/(www\.)?/, '');
        if (directPortfolioBtn) directPortfolioBtn.href = data.portfolioUrl;
      } else {
        portfolioWrap.classList.add('is-placeholder-row');
        portfolioWrap.style.display = 'flex';
        portfolioLink.href = '#';
        portfolioLink.textContent = 'yourwebsite.com';
      }
    }

    // Modal Quotes & Info
    const modalQuote = document.getElementById('modal-quote-text');
    const modalAuthor = document.getElementById('modal-author-text');
    if (modalQuote) modalQuote.textContent = `"${data.positioningStatement || 'Designing digital products, simplifying complex information...'}"`;
    if (modalAuthor) modalAuthor.textContent = `— ${data.fullName || 'Your Name'}`;

    // Pass Modal Values
    const passAvatar = document.getElementById('pass-avatar-img');
    const passOrg = document.getElementById('pass-org-name');
    const passName = document.getElementById('pass-name-val');
    const passRole = document.getElementById('pass-role-val');
    if (passAvatar) passAvatar.src = displayPhoto;
    if (passOrg) passOrg.textContent = (data.fullName || 'YOUR NAME').toUpperCase();
    if (passName) passName.textContent = data.fullName || 'Your Name';
    if (passRole) passRole.textContent = data.roleTitle || 'Your Title';
    const passPhone = document.getElementById('pass-phone-val');
    const passEmail = document.getElementById('pass-email-val');
    const passWebsite = document.getElementById('pass-website-val');
    const passEvent = document.getElementById('pass-event-badge');
    const passSerial = document.getElementById('pass-serial-val');
    const passBackAbout = document.getElementById('pass-back-about-text');
    const passBackComp = document.getElementById('pass-back-competencies-text');

    if (passPhone) passPhone.textContent = data.phone || 'N/A';
    if (passEmail) passEmail.textContent = data.email ? (data.email.substring(0, 14) + '...') : 'N/A';
    if (passWebsite) passWebsite.textContent = data.portfolioUrl ? data.portfolioUrl.replace(/^https?:\/\/(www\.)?/, '') : 'virtualcard.com';
    if (passEvent) passEvent.textContent = data.editionMark || 'DIGITAL PASS';
    if (passSerial) passSerial.textContent = `PASS ID: ${(data.username || 'PASS').toUpperCase()}-2026`;
    if (passBackAbout) passBackAbout.textContent = data.positioningStatement || 'Your bio will appear here...';
    if (passBackComp) passBackComp.textContent = Array.isArray(data.capabilities) && data.capabilities.length ? data.capabilities.join(' · ') : 'Skills & Competencies';

    // Dynamic High-Resolution Vector QR Code pointing to live card URL
    const targetUsername = data.username || username || 'cardholder';
    const cardUrl = `${window.location.origin}/c/${targetUsername}`;
    const qrEndpoint = `/api/qr?data=${encodeURIComponent(cardUrl)}`;

    const cardQrImg = document.getElementById('card-qr-img');
    const modalQrImg = document.getElementById('modal-qr-img');
    const passQrImg = document.getElementById('pass-qr-img');

    if (cardQrImg) {
      cardQrImg.src = qrEndpoint;
      cardQrImg.alt = `Scan QR Code to open ${targetUsername}'s digital card`;
    }
    if (modalQrImg) {
      modalQrImg.src = qrEndpoint;
      modalQrImg.alt = `Scan QR Code to open ${targetUsername}'s digital card`;
    }
    if (passQrImg) {
      passQrImg.src = qrEndpoint;
      passQrImg.alt = `Apple Wallet pass QR Code for ${targetUsername}`;
    }

    // Share Sheet Details
    const shareAvatar = document.getElementById('share-avatar-img');
    const shareName = document.getElementById('share-sheet-name');
    if (shareAvatar) shareAvatar.src = displayPhoto;
    if (shareName) shareName.textContent = data.fullName || 'Your Name';

    // Attach Copy Handlers
    document.querySelectorAll('.copy-action-btn').forEach(btn => {
      btn.onclick = async (e) => {
        e.preventDefault();
        const text = btn.getAttribute('data-copy');
        if (!text) return;
        try {
          await navigator.clipboard.writeText(text);
          showToast(`Copied ${text}`);
        } catch {
          showToast(`Copied ${text}`);
        }
      };
    });
  }

  function precomputePhoto(url) {
    if (!url || url === '/assets/dummy-avatar.svg') return;
    const img = new Image();
    if (!url.startsWith('data:')) {
      img.crossOrigin = 'Anonymous';
    }
    img.src = url;
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 180;
        canvas.height = 180;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, 180, 180);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        cachedPhotoBase64 = dataUrl.replace(/^data:image\/jpeg;base64,/, '');
      } catch (e) {
        console.warn('vCard photo encoding fallback', e);
      }
    };
  }

  // 3D Card Flip Controls
  function setCardSide(flipped) {
    isFlipped = flipped;
    if (isFlipped) {
      cardElement.classList.add('is-flipped');
      cardElement.style.transform = 'rotateY(180deg)';
      if (tabBack) tabBack.classList.add('active');
      if (tabFront) tabFront.classList.remove('active');
    } else {
      cardElement.classList.remove('is-flipped');
      cardElement.style.transform = 'rotateX(0deg) rotateY(0deg)';
      if (tabFront) tabFront.classList.add('active');
      if (tabBack) tabBack.classList.remove('active');
    }
    playSubtleClick();
  }

  if (flipToBackBtn) flipToBackBtn.onclick = (e) => { e.stopPropagation(); setCardSide(true); };
  if (flipToFrontBtn) flipToFrontBtn.onclick = (e) => { e.stopPropagation(); setCardSide(false); };
  if (tabFront) tabFront.onclick = () => setCardSide(false);
  if (tabBack) tabBack.onclick = () => setCardSide(true);

  // iOS vCard Export with Embedded Photo
  function downloadiOSvCard() {
    if (!cardData) return;
    const nameParts = cardData.fullName.split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    const vCardLines = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `N:${lastName};${firstName};;;`,
      `FN:${cardData.fullName}`,
      `ORG:${cardData.roleTitle.split('|')[0].trim() || 'Professional'}`,
      `TITLE:${cardData.roleTitle}`
    ];

    if (cardData.phone) vCardLines.push(`TEL;TYPE=CELL,VOICE,pref:${cardData.phone.replace(/\s+/g, '')}`);
    if (cardData.email) vCardLines.push(`EMAIL;TYPE=INTERNET,pref:${cardData.email}`);
    if (cardData.portfolioUrl) vCardLines.push(`URL;TYPE=WORK:${cardData.portfolioUrl}`);
    if (cardData.linkedinUrl) vCardLines.push(`X-SOCIALPROFILE;type=linkedin:${cardData.linkedinUrl}`);

    if (cachedPhotoBase64) {
      const foldedPhoto = cachedPhotoBase64.match(/.{1,72}/g).join('\r\n ');
      vCardLines.push('PHOTO;ENCODING=b;TYPE=JPEG:\r\n ' + foldedPhoto);
    }

    vCardLines.push(
      `NOTE:${cardData.positioningStatement}`,
      'REV:' + new Date().toISOString(),
      'END:VCARD'
    );

    const vCardContent = vCardLines.join('\r\n');
    const blob = new Blob([vCardContent], { type: 'text/vcard;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const downloadLink = document.createElement('a');
    downloadLink.href = url;
    downloadLink.setAttribute('download', `${cardData.fullName.replace(/\s+/g, '_')}.vcf`);
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(url);

    showToast('Saved contact card with photo for iOS');
  }

  if (saveVcfBtn) saveVcfBtn.onclick = (e) => { e.preventDefault(); downloadiOSvCard(); };
  if (walletSaveVcfBtn) walletSaveVcfBtn.onclick = (e) => { e.preventDefault(); downloadiOSvCard(); };
  if (shareVcfBtn) shareVcfBtn.onclick = () => { closeIphoneShareModal(); downloadiOSvCard(); };

  // Apple Wallet Pass Modal
  function openAppleWalletModal() {
    if (!appleWalletModal) return;
    appleWalletModal.classList.add('is-open');
    playSubtleClick();
  }
  function closeAppleWalletModal() {
    if (!appleWalletModal) return;
    appleWalletModal.classList.remove('is-open');
  }
  function toggleWalletPassFlip() {
    if (!walletPassCard) return;
    isPassFlipped = !isPassFlipped;
    if (isPassFlipped) walletPassCard.classList.add('is-pass-flipped');
    else walletPassCard.classList.remove('is-pass-flipped');
    playSubtleClick();
  }

  function downloadPkPassFile() {
    if (!cardData) return;
    const passData = {
      formatVersion: 1,
      passTypeIdentifier: `pass.com.virtualcard.${cardData.username}`,
      serialNumber: `${cardData.username.toUpperCase()}-2026`,
      teamIdentifier: "VIRTUALCARD",
      organizationName: cardData.fullName,
      description: `${cardData.fullName} — Digital Business Card Pass`,
      logoText: cardData.fullName.toUpperCase(),
      generic: {
        primaryFields: [{ key: "name", label: "NAME", value: cardData.fullName }],
        secondaryFields: [{ key: "title", label: "ROLE", value: cardData.roleTitle }],
        auxiliaryFields: [
          { key: "phone", label: "PHONE", value: cardData.phone || '' },
          { key: "email", label: "EMAIL", value: cardData.email || '' }
        ]
      }
    };
    const blob = new Blob([JSON.stringify(passData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${cardData.username}_pass.pkpass`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Downloaded Apple Wallet Pass file (.pkpass)');
  }

  if (openWalletBtn) openWalletBtn.onclick = openAppleWalletModal;
  if (walletModalClose) walletModalClose.onclick = closeAppleWalletModal;
  if (walletModalBackdrop) walletModalBackdrop.onclick = closeAppleWalletModal;
  if (flipWalletPassBtn) flipWalletPassBtn.onclick = toggleWalletPassFlip;
  if (flipWalletPassBackBtn) flipWalletPassBackBtn.onclick = toggleWalletPassFlip;
  if (downloadPassBtn) downloadPassBtn.onclick = downloadPkPassFile;

  // iPhone Share Sheet Modal
  function openIphoneShareModal() {
    if (!iphoneShareModal) return;
    const shareAvatarImg = document.getElementById('share-avatar-img');
    const shareSheetName = document.getElementById('share-sheet-name');
    if (cardData) {
      if (shareAvatarImg) {
        shareAvatarImg.src = cardData.photoUrl || '/assets/dummy-avatar.svg';
        shareAvatarImg.alt = cardData.fullName || 'Avatar';
      }
      if (shareSheetName) {
        shareSheetName.textContent = cardData.fullName || 'Digital Business Card';
      }
    }
    iphoneShareModal.classList.add('is-open');
    playSubtleClick();
  }
  function closeIphoneShareModal() {
    if (!iphoneShareModal) return;
    iphoneShareModal.classList.remove('is-open');
  }

  if (shareCardBtn) shareCardBtn.onclick = openIphoneShareModal;
  if (iphoneShareClose) iphoneShareClose.onclick = closeIphoneShareModal;
  if (iphoneShareBackdrop) iphoneShareBackdrop.onclick = closeIphoneShareModal;

  if (shareAirdropBtn) {
    shareAirdropBtn.onclick = async () => {
      closeIphoneShareModal();
      const shareData = {
        title: `${cardData.fullName} — Digital Business Card`,
        text: `${cardData.fullName} — ${cardData.roleTitle}`,
        url: window.location.href
      };
      if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        try { await navigator.share(shareData); } catch {}
      } else {
        try { await navigator.clipboard.writeText(window.location.href); showToast('Card link copied!'); } catch {}
      }
    };
  }

  if (shareWalletBtn) shareWalletBtn.onclick = () => { closeIphoneShareModal(); openAppleWalletModal(); };
  if (shareSmsBtn) {
    shareSmsBtn.onclick = () => {
      closeIphoneShareModal();
      const text = encodeURIComponent(`Hi! Here is ${cardData ? cardData.fullName : ''}'s Digital Business Card: ${window.location.href}`);
      window.location.href = `sms:?body=${text}`;
    };
  }
  if (shareWhatsappBtn) {
    shareWhatsappBtn.onclick = () => {
      closeIphoneShareModal();
      const text = encodeURIComponent(`Hi! Here is ${cardData ? cardData.fullName : ''}'s Digital Business Card: ${window.location.href}`);
      window.open(`https://wa.me/?text=${text}`, '_blank');
    };
  }
  if (shareQrBtn) shareQrBtn.onclick = () => { closeIphoneShareModal(); openQrModal(); };
  if (shareCopyLinkBtn) {
    shareCopyLinkBtn.onclick = async () => {
      closeIphoneShareModal();
      try {
        await navigator.clipboard.writeText(window.location.href);
        showToast('Card link copied to clipboard!');
      } catch {
        showToast('Share link: ' + window.location.href);
      }
    };
  }

  // Initial 3D Entrance Animation
  if (cardElement) {
    cardElement.classList.add('card-entrance-anim');
    setTimeout(() => cardElement.classList.remove('card-entrance-anim'), 1200);
  }

  // Interactive 3D Gyroscope & Cursor Tilt Motion
  const cardScene = document.getElementById('card-scene');
  if (cardScene && cardElement) {
    cardScene.addEventListener('mousemove', (e) => {
      if (isFlipped) return;
      const rect = cardScene.getBoundingClientRect();
      const x = e.clientX - rect.left - (rect.width / 2);
      const y = e.clientY - rect.top - (rect.height / 2);
      const rotX = (-y / (rect.height / 2)) * 7;
      const rotY = (x / (rect.width / 2)) * 7;
      cardElement.style.transform = `rotateX(${rotX}deg) rotateY(${rotY}deg)`;
    });

    cardScene.addEventListener('mouseleave', () => {
      if (!isFlipped) {
        cardElement.style.transform = 'rotateX(0deg) rotateY(0deg)';
      }
    });
  }

  // Fullscreen QR Modal
  function openQrModal() {
    if (!qrModal) return;
    qrModal.classList.add('is-open');
  }
  function closeQrModal() {
    if (!qrModal) return;
    qrModal.classList.remove('is-open');
  }
  if (qrTrigger) qrTrigger.onclick = openQrModal;
  if (qrModalClose) qrModalClose.onclick = closeQrModal;
  if (qrModalBackdrop) qrModalBackdrop.onclick = closeQrModal;

  // Real-Time Live Card Update Listener from Dashboard Editor with Typing & Celebration Animations
  window.addEventListener('message', (event) => {
    let payload = event.data;
    if (typeof payload === 'string') {
      try { payload = JSON.parse(payload); } catch {}
    }
    if (payload && payload.type === 'LIVE_CARD_UPDATE' && payload.card) {
      hasReceivedLiveUpdate = true;
      cardData = Object.assign({}, payload.card);
      renderCard(cardData);

      // Trigger real-time typing pulse feedback animation on card
      if (cardElement) {
        cardElement.classList.remove('typing-pulse');
        void cardElement.offsetWidth; // trigger reflow for smooth re-animation
        cardElement.classList.add('typing-pulse');
      }
    } else if (event.data && event.data.type === 'CELEBRATE') {
      if (cardElement) {
        cardElement.classList.remove('card-entrance-anim', 'card-celebrate-flash');
        void cardElement.offsetWidth;
        cardElement.classList.add('card-entrance-anim', 'card-celebrate-flash');
      }
    }
  });

  loadPublicCardData();
});
