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

  // Fetch Public Card Data
  try {
    const res = await fetch(`/api/cards/${username}`);
    if (!res.ok) throw new Error('Card not found');
    const result = await res.json();
    cardData = result.card;
    renderCard(cardData);
  } catch (err) {
    console.warn('Falling back to default card', err);
    cardData = {
      username: username,
      fullName: 'Oluseyi Ogundipe',
      roleTitle: 'Product & Information Design | Project Management',
      positioningStatement: 'Designing digital products, simplifying complex information, and helping turn ideas into meaningful projects.',
      capabilities: ['PRODUCT DESIGN', 'INFORMATION DESIGN', 'PROJECT MANAGEMENT'],
      editionMark: 'NAIROBI EDITION 2026',
      brandSubmark: 'OO—DESIGN',
      photoUrl: '/assets/oluseyi-ogundipe.jpg',
      email: 'oluseyi.ogundipe@outlook.com',
      phone: '+234 814 891 8630',
      whatsapp: '+2348148918630',
      linkedinUrl: 'https://www.linkedin.com/in/dokitoor-oluseyi/',
      portfolioUrl: 'https://oluseyiogundipe.com',
      theme: 'terracotta'
    };
    renderCard(cardData);
  }

  function renderCard(data) {
    document.title = `${data.fullName} — Digital Business Card`;
    const pageDesc = document.getElementById('card-page-desc');
    if (pageDesc) pageDesc.content = `${data.fullName} — ${data.roleTitle}. ${data.positioningStatement}`;

    // Apply Theme
    if (data.theme) {
      document.body.setAttribute('data-theme', data.theme);
    }

    // Header & Brand
    document.getElementById('card-edition-tag').textContent = data.editionMark || 'DIGITAL EDITION 2026';
    document.getElementById('card-brand-submark').textContent = data.brandSubmark || 'CARD—PASS';
    document.getElementById('card-back-location').textContent = data.brandSubmark || 'DIGITAL—CARD';

    // Front Face Identity
    const nameParts = data.fullName.split(' ');
    const firstName = nameParts[0] || 'CARD';
    const lastName = nameParts.slice(1).join(' ') || 'HOLDER';
    document.getElementById('card-person-name').innerHTML = `${firstName}<br><span class="name-accent">${lastName}</span>`;
    
    document.getElementById('card-role-title').textContent = data.roleTitle || '';
    document.getElementById('card-positioning-statement').textContent = data.positioningStatement || '';

    // Portrait Image
    const portraitImg = document.getElementById('card-portrait-img');
    const appleTouchIcon = document.getElementById('apple-touch-icon-link');
    if (portraitImg) {
      portraitImg.src = data.photoUrl || '/assets/oluseyi-ogundipe.jpg';
      portraitImg.alt = `Portrait of ${data.fullName}`;
    }
    if (appleTouchIcon) appleTouchIcon.href = data.photoUrl || '/assets/oluseyi-ogundipe.jpg';

    // Precompute Base64 photo for iOS vCard
    precomputePhoto(data.photoUrl || '/assets/oluseyi-ogundipe.jpg');

    // Capabilities Pills
    const capsGrid = document.getElementById('card-capabilities-grid');
    if (capsGrid) {
      capsGrid.innerHTML = '';
      const caps = Array.isArray(data.capabilities) ? data.capabilities : ['PRODUCT DESIGN', 'STRATEGY'];
      caps.forEach((cap, idx) => {
        const pill = document.createElement('span');
        pill.className = 'capability-pill';
        pill.innerHTML = `<span class="cap-num">0${idx + 1}</span> ${cap}`;
        capsGrid.appendChild(pill);
      });
    }

    // Back Face Contacts
    const emailLink = document.getElementById('contact-email-link');
    const directEmailBtn = document.getElementById('direct-email-btn');
    const copyEmailBtn = document.getElementById('copy-email-btn');
    if (data.email) {
      emailLink.href = `mailto:${data.email}`;
      emailLink.textContent = data.email;
      directEmailBtn.href = `mailto:${data.email}`;
      copyEmailBtn.setAttribute('data-copy', data.email);
    } else {
      document.getElementById('item-email-wrap').style.display = 'none';
    }

    const phoneLink = document.getElementById('contact-phone-link');
    const directPhoneBtn = document.getElementById('direct-phone-btn');
    const whatsappLink = document.getElementById('contact-whatsapp-link');
    if (data.phone) {
      phoneLink.href = `tel:${data.phone.replace(/\s+/g, '')}`;
      phoneLink.textContent = data.phone;
      directPhoneBtn.href = `tel:${data.phone.replace(/\s+/g, '')}`;
      if (data.whatsapp) {
        whatsappLink.href = `https://wa.me/${data.whatsapp.replace(/[^0-9]/g, '')}`;
      } else {
        whatsappLink.href = `https://wa.me/${data.phone.replace(/[^0-9]/g, '')}`;
      }
    } else {
      document.getElementById('item-phone-wrap').style.display = 'none';
    }

    const linkedinLink = document.getElementById('contact-linkedin-link');
    const directLinkedinBtn = document.getElementById('direct-linkedin-btn');
    if (data.linkedinUrl) {
      linkedinLink.href = data.linkedinUrl;
      linkedinLink.textContent = data.linkedinUrl.replace(/^https?:\/\/(www\.)?/, '');
      directLinkedinBtn.href = data.linkedinUrl;
    } else {
      document.getElementById('item-linkedin-wrap').style.display = 'none';
    }

    const portfolioLink = document.getElementById('contact-portfolio-link');
    const directPortfolioBtn = document.getElementById('direct-portfolio-btn');
    if (data.portfolioUrl) {
      portfolioLink.href = data.portfolioUrl;
      portfolioLink.textContent = data.portfolioUrl.replace(/^https?:\/\/(www\.)?/, '');
      directPortfolioBtn.href = data.portfolioUrl;
    } else {
      document.getElementById('item-portfolio-wrap').style.display = 'none';
    }

    // Modal Quotes & Info
    document.getElementById('modal-quote-text').textContent = `"${data.positioningStatement}"`;
    document.getElementById('modal-author-text').textContent = `— ${data.fullName}`;

    // Pass Modal Values
    document.getElementById('pass-avatar-img').src = data.photoUrl || '/assets/oluseyi-ogundipe.jpg';
    document.getElementById('pass-org-name').textContent = data.fullName.toUpperCase();
    document.getElementById('pass-name-val').textContent = data.fullName;
    document.getElementById('pass-role-val').textContent = data.roleTitle;
    document.getElementById('pass-phone-val').textContent = data.phone || 'N/A';
    document.getElementById('pass-email-val').textContent = data.email ? (data.email.substring(0, 14) + '...') : 'N/A';
    document.getElementById('pass-website-val').textContent = data.portfolioUrl ? data.portfolioUrl.replace(/^https?:\/\/(www\.)?/, '') : 'virtualcard.com';
    document.getElementById('pass-event-badge').textContent = data.editionMark || 'DIGITAL PASS';
    document.getElementById('pass-serial-val').textContent = `PASS ID: ${data.username.toUpperCase()}-2026`;
    document.getElementById('pass-back-about-text').textContent = data.positioningStatement;
    document.getElementById('pass-back-competencies-text').textContent = Array.isArray(data.capabilities) ? data.capabilities.join(' · ') : '';

    // Share Sheet Details
    document.getElementById('share-avatar-img').src = data.photoUrl || '/assets/oluseyi-ogundipe.jpg';
    document.getElementById('share-sheet-name').textContent = data.fullName;

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
    const img = new Image();
    img.crossOrigin = 'Anonymous';
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
      tabBack.classList.add('active');
      tabFront.classList.remove('active');
    } else {
      cardElement.classList.remove('is-flipped');
      tabFront.classList.add('active');
      tabBack.classList.remove('active');
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

  // Real-Time Live Card Update Listener from Dashboard Editor
  window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'LIVE_CARD_UPDATE' && event.data.card) {
      const updatedData = Object.assign({}, cardData || {}, event.data.card);
      renderCard(updatedData);
    }
  });
});
