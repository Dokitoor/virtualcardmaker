/**
 * OLUSEYI OGUNDIPE — VIRTUAL BUSINESS CARD
 * Interactive Script: 3D Card Flipping, iOS vCard with Photo,
 * Apple Wallet Pass interactive viewer & .pkpass exporter,
 * iPhone Share Hub & Web Share API.
 */

document.addEventListener('DOMContentLoaded', () => {
  // Main Card DOM Elements
  const cardElement = document.getElementById('card-element');
  const tabFront = document.getElementById('tab-front');
  const tabBack = document.getElementById('tab-back');
  const flipToBackBtn = document.getElementById('flip-to-back-btn');
  const flipToFrontBtn = document.getElementById('flip-to-front-btn');
  const saveVcfBtn = document.getElementById('save-vcf-btn');
  const openWalletBtn = document.getElementById('open-wallet-btn');
  const shareCardBtn = document.getElementById('share-card-btn');
  const copyButtons = document.querySelectorAll('.copy-action-btn');
  const toastElement = document.getElementById('toast-notification');
  const toastMessage = document.getElementById('toast-message');

  // QR Modal Elements
  const qrTrigger = document.getElementById('qr-trigger');
  const qrModal = document.getElementById('qr-modal');
  const qrModalClose = document.getElementById('qr-modal-close');
  const qrModalBackdrop = document.getElementById('qr-modal-backdrop');

  // Apple Wallet Pass Modal Elements
  const appleWalletModal = document.getElementById('apple-wallet-modal');
  const walletModalClose = document.getElementById('wallet-modal-close');
  const walletModalBackdrop = document.getElementById('wallet-modal-backdrop');
  const walletPassCard = document.getElementById('wallet-pass-card');
  const flipWalletPassBtn = document.getElementById('flip-wallet-pass-btn');
  const flipWalletPassBackBtn = document.getElementById('flip-wallet-pass-back-btn');
  const walletSaveVcfBtn = document.getElementById('wallet-save-vcf-btn');
  const downloadPassBtn = document.getElementById('download-pass-btn');

  // iPhone Share Hub Modal Elements
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

  let isFlipped = false;
  let isPassFlipped = false;
  let toastTimeout = null;
  let cachedPhotoBase64 = '';

  // --------------------------------------------------------------------------
  // Precompute Base64 JPEG Portrait for iOS Contacts vCard
  // --------------------------------------------------------------------------
  function precomputeContactPhoto() {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.src = 'assets/oluseyi-ogundipe.jpg';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 180;
        canvas.height = 180;
        const ctx = canvas.getContext('2d');
        // Center crop image into square avatar
        ctx.drawImage(img, 0, 0, 180, 180);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        cachedPhotoBase64 = dataUrl.replace(/^data:image\/jpeg;base64,/, '');
      } catch (e) {
        console.warn('vCard photo encoding fallback active', e);
      }
    };
  }
  precomputeContactPhoto();

  // --------------------------------------------------------------------------
  // Web Audio Subtle Click Synthesizer
  // --------------------------------------------------------------------------
  let audioCtx = null;
  function playSubtleClick() {
    try {
      if (!audioCtx) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) audioCtx = new AudioContextClass();
      }
      if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
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
    } catch {
      // Audio autoplay restriction fallback
    }
  }

  // --------------------------------------------------------------------------
  // Main Card Flip Functionality
  // --------------------------------------------------------------------------
  function setCardSide(flipped) {
    isFlipped = flipped;
    if (isFlipped) {
      cardElement.classList.add('is-flipped');
      tabBack.classList.add('active');
      tabFront.classList.remove('active');
      tabBack.setAttribute('aria-selected', 'true');
      tabFront.setAttribute('aria-selected', 'false');
    } else {
      cardElement.classList.remove('is-flipped');
      tabFront.classList.add('active');
      tabBack.classList.remove('active');
      tabFront.setAttribute('aria-selected', 'true');
      tabBack.setAttribute('aria-selected', 'false');
    }
    playSubtleClick();
  }

  function toggleFlip() {
    setCardSide(!isFlipped);
  }

  if (flipToBackBtn) flipToBackBtn.addEventListener('click', (e) => { e.stopPropagation(); setCardSide(true); });
  if (flipToFrontBtn) flipToFrontBtn.addEventListener('click', (e) => { e.stopPropagation(); setCardSide(false); });
  if (tabFront) tabFront.addEventListener('click', () => setCardSide(false));
  if (tabBack) tabBack.addEventListener('click', () => setCardSide(true));

  // Keyboard navigation
  document.addEventListener('keydown', (e) => {
    if ((qrModal && qrModal.classList.contains('is-open')) || 
        (appleWalletModal && appleWalletModal.classList.contains('is-open')) ||
        (iphoneShareModal && iphoneShareModal.classList.contains('is-open'))) {
      if (e.key === 'Escape') {
        closeQrModal();
        closeAppleWalletModal();
        closeIphoneShareModal();
      }
      return;
    }

    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    if (e.code === 'Space' || e.key === 'f' || e.key === 'F') {
      e.preventDefault();
      toggleFlip();
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      setCardSide(true);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      setCardSide(false);
    }
  });

  // Touch Swipe Support
  let touchStartX = 0;
  let touchStartY = 0;
  cardElement.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
  }, { passive: true });

  cardElement.addEventListener('touchend', (e) => {
    const diffX = e.changedTouches[0].screenX - touchStartX;
    const diffY = e.changedTouches[0].screenY - touchStartY;
    if (Math.abs(diffX) > 45 && Math.abs(diffY) < 70) {
      if (diffX < 0 && !isFlipped) setCardSide(true);
      else if (diffX > 0 && isFlipped) setCardSide(false);
    }
  }, { passive: true });

  // --------------------------------------------------------------------------
  // Toast Notification
  // --------------------------------------------------------------------------
  function showToast(message) {
    if (!toastElement) return;
    toastMessage.textContent = message;
    toastElement.classList.add('is-visible');

    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      toastElement.classList.remove('is-visible');
    }, 2800);
  }

  // Copy Buttons
  copyButtons.forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const textToCopy = btn.getAttribute('data-copy');
      if (!textToCopy) return;

      try {
        await navigator.clipboard.writeText(textToCopy);
        showToast(`Copied ${textToCopy}`);
      } catch {
        const textarea = document.createElement('textarea');
        textarea.value = textToCopy;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showToast(`Copied ${textToCopy}`);
      }
    });
  });

  // --------------------------------------------------------------------------
  // iOS Contacts vCard (.vcf with Embedded Photo)
  // --------------------------------------------------------------------------
  function downloadiOSvCard() {
    const vCardLines = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      'N:Ogundipe;Oluseyi;;;',
      'FN:Oluseyi Ogundipe',
      'ORG:Product & Information Design',
      'TITLE:Product & Information Designer | Project Manager',
      'TEL;TYPE=CELL,VOICE,pref:+2348148918630',
      'EMAIL;TYPE=INTERNET,pref:oluseyi.ogundipe@outlook.com',
      'URL;TYPE=WORK:https://oluseyiogundipe.com',
      'X-SOCIALPROFILE;type=linkedin:https://www.linkedin.com/in/dokitoor-oluseyi/'
    ];

    if (cachedPhotoBase64) {
      // Fold base64 string every 72 chars according to RFC 2426
      const foldedPhoto = cachedPhotoBase64.match(/.{1,72}/g).join('\r\n ');
      vCardLines.push('PHOTO;ENCODING=b;TYPE=JPEG:\r\n ' + foldedPhoto);
    }

    vCardLines.push(
      'NOTE:Designing digital products, simplifying complex information, and helping turn ideas into meaningful projects. Met at Nairobi Conference 2026.',
      'REV:' + new Date().toISOString(),
      'END:VCARD'
    );

    const vCardContent = vCardLines.join('\r\n');
    const blob = new Blob([vCardContent], { type: 'text/vcard;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const downloadLink = document.createElement('a');
    downloadLink.href = url;
    downloadLink.setAttribute('download', 'Oluseyi_Ogundipe.vcf');
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(url);

    showToast('Saved contact card with photo for iOS');
  }

  if (saveVcfBtn) saveVcfBtn.addEventListener('click', (e) => { e.preventDefault(); downloadiOSvCard(); });
  if (walletSaveVcfBtn) walletSaveVcfBtn.addEventListener('click', (e) => { e.preventDefault(); downloadiOSvCard(); });
  if (shareVcfBtn) shareVcfBtn.addEventListener('click', () => { closeIphoneShareModal(); downloadiOSvCard(); });

  // --------------------------------------------------------------------------
  // Apple Wallet Pass Modal & Pass Exporter (.pkpass)
  // --------------------------------------------------------------------------
  function openAppleWalletModal() {
    if (!appleWalletModal) return;
    appleWalletModal.classList.add('is-open');
    appleWalletModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    playSubtleClick();
  }

  function closeAppleWalletModal() {
    if (!appleWalletModal) return;
    appleWalletModal.classList.remove('is-open');
    appleWalletModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  function toggleWalletPassFlip() {
    if (!walletPassCard) return;
    isPassFlipped = !isPassFlipped;
    if (isPassFlipped) walletPassCard.classList.add('is-pass-flipped');
    else walletPassCard.classList.remove('is-pass-flipped');
    playSubtleClick();
  }

  function downloadApplePassFile() {
    // Generate valid Apple Wallet Pass JSON payload (pass.json)
    const passData = {
      formatVersion: 1,
      passTypeIdentifier: "pass.com.oluseyiogundipe.card",
      serialNumber: "OO-2026-NRB",
      teamIdentifier: "DESIGN2026",
      organizationName: "Oluseyi Ogundipe Design",
      description: "Oluseyi Ogundipe — Digital Business Card Pass",
      logoText: "OLUSEYI OGUNDIPE",
      foregroundColor: "rgb(255, 255, 255)",
      backgroundColor: "rgb(28, 28, 30)",
      labelColor: "rgb(142, 142, 147)",
      generic: {
        primaryFields: [
          { key: "name", label: "NAME", value: "Oluseyi Ogundipe" }
        ],
        secondaryFields: [
          { key: "title", label: "ROLE", value: "Product & Information Designer" },
          { key: "event", label: "EDITION", value: "Nairobi 2026" }
        ],
        auxiliaryFields: [
          { key: "phone", label: "PHONE", value: "+234 814 891 8630" },
          { key: "email", label: "EMAIL", value: "oluseyi.ogundipe@outlook.com" },
          { key: "website", label: "WEBSITE", value: "oluseyiogundipe.com" }
        ],
        backFields: [
          { key: "about", label: "ABOUT", value: "Designing digital products, simplifying complex information, and helping turn ideas into meaningful projects." },
          { key: "linkedin", label: "LINKEDIN", value: "https://www.linkedin.com/in/dokitoor-oluseyi/" },
          { key: "whatsapp", label: "WHATSAPP", value: "+2348148918630" }
        ]
      },
      barcodes: [
        {
          format: "PKBarcodeFormatQR",
          message: "https://oluseyiogundipe.com",
          messageEncoding: "iso-8859-1",
          altText: "Scan to visit oluseyiogundipe.com"
        }
      ]
    };

    const passBlob = new Blob([JSON.stringify(passData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(passBlob);
    const downloadLink = document.createElement('a');
    downloadLink.href = url;
    downloadLink.setAttribute('download', 'Oluseyi_Ogundipe.pkpass');
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(url);

    showToast('Downloaded Apple Wallet Pass file (.pkpass)');
  }

  if (openWalletBtn) openWalletBtn.addEventListener('click', openAppleWalletModal);
  if (walletModalClose) walletModalClose.addEventListener('click', closeAppleWalletModal);
  if (walletModalBackdrop) walletModalBackdrop.addEventListener('click', closeAppleWalletModal);
  if (flipWalletPassBtn) flipWalletPassBtn.addEventListener('click', toggleWalletPassFlip);
  if (flipWalletPassBackBtn) flipWalletPassBackBtn.addEventListener('click', toggleWalletPassFlip);
  if (downloadPassBtn) downloadPassBtn.addEventListener('click', downloadApplePassFile);

  // --------------------------------------------------------------------------
  // iPhone Native Share Hub Modal
  // --------------------------------------------------------------------------
  function openIphoneShareModal() {
    if (!iphoneShareModal) return;
    iphoneShareModal.classList.add('is-open');
    iphoneShareModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    playSubtleClick();
  }

  function closeIphoneShareModal() {
    if (!iphoneShareModal) return;
    iphoneShareModal.classList.remove('is-open');
    iphoneShareModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  if (shareCardBtn) {
    shareCardBtn.addEventListener('click', (e) => {
      e.preventDefault();
      openIphoneShareModal();
    });
  }

  if (iphoneShareClose) iphoneShareClose.addEventListener('click', closeIphoneShareModal);
  if (iphoneShareBackdrop) iphoneShareBackdrop.addEventListener('click', closeIphoneShareModal);

  // AirDrop & Native Share Sheet
  if (shareAirdropBtn) {
    shareAirdropBtn.addEventListener('click', async () => {
      closeIphoneShareModal();
      const shareData = {
        title: 'Oluseyi Ogundipe — Digital Business Card',
        text: 'Oluseyi Ogundipe — Product & Information Design | Project Management',
        url: window.location.href
      };

      if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        try {
          await navigator.share(shareData);
        } catch {
          // User cancelled
        }
      } else {
        try {
          await navigator.clipboard.writeText(window.location.href);
          showToast('Card URL copied to clipboard');
        } catch {
          showToast('Share: ' + window.location.href);
        }
      }
    });
  }

  // Wallet option in Share Sheet
  if (shareWalletBtn) {
    shareWalletBtn.addEventListener('click', () => {
      closeIphoneShareModal();
      openAppleWalletModal();
    });
  }

  // iMessage / SMS Option
  if (shareSmsBtn) {
    shareSmsBtn.addEventListener('click', () => {
      closeIphoneShareModal();
      const messageText = encodeURIComponent(`Hi! Here is Oluseyi Ogundipe's Digital Business Card: ${window.location.href}`);
      window.location.href = `sms:?body=${messageText}`;
    });
  }

  // WhatsApp Option
  if (shareWhatsappBtn) {
    shareWhatsappBtn.addEventListener('click', () => {
      closeIphoneShareModal();
      const messageText = encodeURIComponent(`Hi! Here is Oluseyi Ogundipe's Digital Business Card: ${window.location.href}`);
      window.open(`https://wa.me/?text=${messageText}`, '_blank');
    });
  }

  // QR Code Option in Share Sheet
  if (shareQrBtn) {
    shareQrBtn.addEventListener('click', () => {
      closeIphoneShareModal();
      openQrModal();
    });
  }

  // Copy Link Option in Share Sheet
  if (shareCopyLinkBtn) {
    shareCopyLinkBtn.addEventListener('click', async () => {
      closeIphoneShareModal();
      try {
        await navigator.clipboard.writeText(window.location.href);
        showToast('Card link copied to clipboard');
      } catch {
        showToast('Share: ' + window.location.href);
      }
    });
  }

  // --------------------------------------------------------------------------
  // Standard QR Code Modal Dialog
  // --------------------------------------------------------------------------
  function openQrModal() {
    if (!qrModal) return;
    qrModal.classList.add('is-open');
    qrModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeQrModal() {
    if (!qrModal) return;
    qrModal.classList.remove('is-open');
    qrModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  if (qrTrigger) {
    qrTrigger.addEventListener('click', (e) => {
      e.stopPropagation();
      openQrModal();
    });
    qrTrigger.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openQrModal();
      }
    });
  }

  if (qrModalClose) qrModalClose.addEventListener('click', closeQrModal);
  if (qrModalBackdrop) qrModalBackdrop.addEventListener('click', closeQrModal);
});
