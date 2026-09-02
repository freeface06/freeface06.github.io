/* ==================================================== */
/* SMART VIEWPORT HEIGHT LOCK FOR FOLDABLE & ROTATION   */
/* 스크롤 시 주소창 미세변동은 무시 + 폴드/회전/분할창은 즉시 감지 */
/* ==================================================== */
(function initSmartAppHeightLock() {
  let lastW = window.innerWidth;
  let lastH = window.innerHeight;

  function updateAppHeight(force = false) {
    const curW = window.innerWidth;
    const curH = window.innerHeight;

    // 가로폭 변화(폴드 펴기/접기, 회전) 또는 대폭 높이 변화(160px 초과) 시에만 재계산
    if (force || Math.abs(curW - lastW) > 5 || Math.abs(curH - lastH) > 160) {
      document.documentElement.style.setProperty('--app-height', `${curH}px`);
      document.documentElement.style.setProperty('--vh', `${curH * 0.01}px`);
      lastW = curW;
      lastH = curH;
    }
  }

  updateAppHeight(true);

  window.addEventListener('resize', () => {
    updateAppHeight(false);
  });

  window.addEventListener('orientationchange', () => {
    setTimeout(() => updateAppHeight(true), 150);
  });
})();

    /* ==================================================== */
    /* KAKAO JAVASCRIPT SDK & SHARE CONFIGURATION          */
    /* ==================================================== */
    const KAKAO_JAVASCRIPT_KEY = '4ebb148f84b8b983a0a27ceaf5f6c60b';

    function initKakaoSDK() {
      if (typeof window.Kakao !== 'undefined' && KAKAO_JAVASCRIPT_KEY) {
        if (!window.Kakao.isInitialized()) {
          try {
            window.Kakao.init(KAKAO_JAVASCRIPT_KEY);
            console.log('[Kakao] SDK initialized successfully:', window.Kakao.isInitialized());
          } catch (e) {
            console.log('[Kakao] SDK init error:', e);
          }
        }
      }
    }

    // Try initializing immediately if SDK script is ready
    initKakaoSDK();

    /* ==================================================== */
    /* GOOGLE SPREADSHEET (APPS SCRIPT) API CONFIGURATION   */
    /* ==================================================== */
    const GOOGLE_SHEET_API_URL = 'https://script.google.com/macros/s/AKfycby6DENoj4doh7phAp0UpNcB7YQE5JSZmdS1zGfLj0fT9PhNnx-xXzic1j6_QI5JQnY/exec';
    const COMMENTS_CACHE_KEY = 'wedding_comments_cache_v2';

    function isSafeArray(val) {
      return val && (typeof Array !== 'undefined' && Array.isArray ? Array.isArray(val) : Object.prototype.toString.call(val) === '[object Array]');
    }

    function getInitialCommentsData() {
      try {
        const cached = localStorage.getItem(COMMENTS_CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (isSafeArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        }
      } catch (e) {
        console.log('[Comments] Local cache read error:', e);
      }
      return [];
    }

    const commentsData = getInitialCommentsData();
    let isCommentsLoading = commentsData.length === 0;

    async function sendDataToGoogleSheet(payload) {
      if (!GOOGLE_SHEET_API_URL || GOOGLE_SHEET_API_URL.trim() === '') {
        console.log('[GoogleSheet] API URL not configured. Skipped remote save:', payload);
        return false;
      }
      try {
        await fetch(GOOGLE_SHEET_API_URL, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(payload)
        });
        console.log('[GoogleSheet] Data sent successfully:', payload.action);
        return true;
      } catch (err) {
        console.error('[GoogleSheet] Error sending data:', err);
        return false;
      }
    }

    let commentsFetchPromise = null;
    function prefetchComments() {
      if (!GOOGLE_SHEET_API_URL || GOOGLE_SHEET_API_URL.trim() === '') return;
      if (commentsFetchPromise) return commentsFetchPromise;

      commentsFetchPromise = fetch(`${GOOGLE_SHEET_API_URL}?action=get_comments`, { cache: 'no-cache' })
        .then(res => res.json())
        .then(json => {
          isCommentsLoading = false;
          if (json && json.status === 'success' && isSafeArray(json.comments)) {
            const sheetComments = json.comments.map(c => ({
              id: c.id || Date.now() + Math.random(),
              uname: c.uname || '하객',
              avatar: 'images/main/1762868176689.jpg',
              text: c.text,
              time: c.time || '최근',
              likes: 1,
              liked: false,
              isAuthor: false
            }));

            // Check if changed
            const isDifferent = JSON.stringify(sheetComments) !== JSON.stringify(commentsData);
            if (isDifferent) {
              commentsData.length = 0;
              commentsData.push(...sheetComments);
              try {
                localStorage.setItem(COMMENTS_CACHE_KEY, JSON.stringify(sheetComments));
              } catch (e) { }
              renderComments();
            }
          }
        })
        .catch(err => {
          isCommentsLoading = false;
          console.log('[GoogleSheet] Note: comments fetch error:', err);
          renderComments();
        });

      return commentsFetchPromise;
    }

    const fetchCommentsFromGoogleSheet = prefetchComments;

    // Immediately trigger background prefetch upon script load
    prefetchComments();


    /* ==================================================== */
    /* INTERSECTION OBSERVER SCROLL REVEAL ENGINE           */
    /* ==================================================== */
    document.addEventListener('DOMContentLoaded', () => {
      initKakaoSDK();
      initAutoBGM();
      updateCountdownTimer();
      setupMapTouchGuard();
      tryInitMap();
      renderComments();
      fetchCommentsFromGoogleSheet();
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('active');
          }
        });
      }, {
        threshold: 0.12,
        rootMargin: '0px 0px -40px 0px'
      });

      document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
    });

    window.addEventListener('load', tryInitMap);

    let mapInitialized = false;
    function tryInitMap() {
      if (mapInitialized) return;
      if (window.naver && window.naver.maps) {
        try {
          mapInitialized = true;
          initInteractiveMap();
        } catch (e) {
          console.log('Naver Maps init error:', e);
          showFallbackMap();
        }
      } else {
        let attempts = 0;
        const checkTimer = setInterval(() => {
          attempts++;
          if (window.naver && window.naver.maps) {
            clearInterval(checkTimer);
            if (!mapInitialized) {
              try {
                mapInitialized = true;
                initInteractiveMap();
              } catch (e) {
                showFallbackMap();
              }
            }
          } else if (attempts > 8) {
            clearInterval(checkTimer);
            showFallbackMap();
          }
        }, 300);
      }
    }

    /* Location Tabs Switcher Engine */
    function switchLocTab(idx) {
      const btns = [document.getElementById('locTabBtn0'), document.getElementById('locTabBtn1')];
      const panes = [document.getElementById('locPane0'), document.getElementById('locPane1')];
      btns.forEach((btn, i) => {
        if (btn) {
          if (i === idx) btn.classList.add('active');
          else btn.classList.remove('active');
        }
      });
      panes.forEach((pane, i) => {
        if (pane) {
          if (i === idx) pane.classList.add('active');
          else pane.classList.remove('active');
        }
      });
    }

    function showFallbackMap() {
      const mapEl = document.getElementById('interactiveMap');
      if (!mapEl) return;
      mapEl.innerHTML = `
        <a href="https://map.naver.com/v5/search/%EB%9D%BC%EB%B9%84%EB%8B%88%EC%9B%80" target="_blank" rel="noopener" style="display:block;width:100%;height:100%;position:relative;text-decoration:none;cursor:pointer;background:#eef1f5;overflow:hidden;">
          <!-- Stylized Schematic Road Map Vector Matching images/location-rough-map.jpg -->
          <svg width="100%" height="100%" viewBox="0 0 400 230" preserveAspectRatio="xMidYMid slice" style="display:block;">
            <defs>
              <filter id="shadowFilter" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="3" stdDeviation="4" flood-color="#000000" flood-opacity="0.2"/>
              </filter>
            </defs>
            <!-- Background Map Blocks -->
            <rect width="400" height="230" fill="#f0f3f7"/>
            <rect x="15" y="15" width="100" height="75" rx="6" fill="#e2e8f0" opacity="0.6"/>
            <rect x="15" y="135" width="100" height="80" rx="6" fill="#e2e8f0" opacity="0.6"/>
            <rect x="145" y="15" width="240" height="75" rx="6" fill="#e2e8f0" opacity="0.6"/>
            <rect x="145" y="135" width="240" height="80" rx="6" fill="#e2e8f0" opacity="0.6"/>

            <!-- Main Road: Cheonho-daero (Horizontal) -->
            <path d="M-10 115 L410 115" stroke="#ffffff" stroke-width="42"/>
            <path d="M-10 115 L410 115" stroke="#cbd5e1" stroke-width="2" stroke-dasharray="8 6"/>

            <!-- Cross Road: Olympic-ro (Vertical) -->
            <path d="M125 -10 L125 240" stroke="#ffffff" stroke-width="36"/>
            <path d="M125 -10 L125 240" stroke="#cbd5e1" stroke-width="2" stroke-dasharray="8 6"/>

            <!-- Road Labels -->
            <text x="35" y="119" fill="#94a3b8" font-size="9" font-weight="700">광나루 방면</text>
            <text x="345" y="119" fill="#94a3b8" font-size="9" font-weight="700">강동 방면</text>
            <text x="125" y="24" fill="#94a3b8" font-size="9" font-weight="700" text-anchor="middle">암사 방면</text>
            <text x="125" y="218" fill="#94a3b8" font-size="9" font-weight="700" text-anchor="middle">강동구청 방면</text>

            <!-- Subway Station Hub Badge (천호역 5·8호선) -->
            <g transform="translate(125, 115)" filter="url(#shadowFilter)">
              <rect x="-42" y="-12" width="84" height="24" rx="12" fill="#222222"/>
              <circle cx="-28" cy="0" r="5" fill="#8B50A4"/>
              <text x="-28" y="3" fill="#fff" font-size="7" font-weight="800" text-anchor="middle">5</text>
              <circle cx="-16" cy="0" r="5" fill="#E61E8C"/>
              <text x="-16" y="3" fill="#fff" font-size="7" font-weight="800" text-anchor="middle">8</text>
              <text x="12" y="3.5" fill="#ffffff" font-size="9" font-weight="800">천호역</text>
            </g>

            <!-- Exit 10 Marker (Right by Labinium) -->
            <g transform="translate(78, 142)">
              <rect x="-14" y="-9" width="28" height="18" rx="5" fill="#4B388D"/>
              <text x="0" y="3.5" fill="#ffffff" font-size="9" font-weight="800" text-anchor="middle">10번</text>
            </g>

            <!-- Exit 6 Marker (Underground Public Parking) -->
            <g transform="translate(230, 142)">
              <rect x="-14" y="-9" width="28" height="18" rx="5" fill="#4B388D"/>
              <text x="0" y="3.5" fill="#ffffff" font-size="9" font-weight="800" text-anchor="middle">6번</text>
            </g>

            <!-- Public Parking [P] & Shuttle Pin -->
            <g transform="translate(285, 142)">
              <rect x="-12" y="-9" width="24" height="18" rx="5" fill="#e6683c"/>
              <text x="0" y="3.5" fill="#ffffff" font-size="9" font-weight="800" text-anchor="middle">P</text>
              <text x="0" y="24" fill="#e6683c" font-size="7.5" font-weight="700" text-anchor="middle">공영주차장</text>
            </g>

            <!-- Underground Mall Dotted Walking Path from Exit 6 to Exit 10 -->
            <path d="M 220 142 L 95 142" fill="none" stroke="#e6683c" stroke-width="2" stroke-dasharray="4 3"/>

            <!-- Main Venue Pin (Wedding Ring Marker at Labinium, Exit 10) -->
            <g transform="translate(62, 172)" filter="url(#shadowFilter)">
              <!-- Outer pulse circle -->
              <circle cx="0" cy="-20" r="20" fill="#ff3040" opacity="0.25">
                <animate attributeName="r" values="16;24;16" dur="2s" repeatCount="indefinite"/>
                <animate attributeName="opacity" values="0.35;0;0.35" dur="2s" repeatCount="indefinite"/>
              </circle>
              <!-- Pin Pointer -->
              <polygon points="-5,-4 5,-4 0,2" fill="#1a1a1a"/>
              <!-- Pin Circle Badge -->
              <circle cx="0" cy="-20" r="16" fill="#ffffff" stroke="#1a1a1a" stroke-width="2"/>
              <!-- Wedding Ring PNG inside -->
              <image href="images/wedding-ring.png" xlink:href="images/wedding-ring.png" x="-10" y="-30" width="20" height="20" preserveAspectRatio="xMidYMid meet"/>
              <!-- Labinium Label -->
              <rect x="-30" y="4" width="60" height="16" rx="4" fill="#ff3040"/>
              <text x="0" y="15" fill="#ffffff" font-size="8" font-weight="800" text-anchor="middle">라비니움</text>
            </g>
          </svg>

          <!-- Floating Bottom Banner -->
          <div style="position:absolute;bottom:10px;left:12px;right:12px;background:rgba(255,255,255,0.96);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);border:1px solid rgba(0,0,0,0.08);border-radius:10px;padding:7px 12px;display:flex;align-items:center;justify-content:space-between;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
            <div style="display:flex;align-items:center;gap:6px;">
              <span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#03C75A;"></span>
              <span style="font-size:0.75rem;font-weight:700;color:#4A2810;">천호역 10번 출구 바로 앞 (도보 10초)</span>
            </div>
            <span style="font-size:0.74rem;font-weight:700;color:#6E2B18;">네이버 지도 열기 &gt;</span>
          </div>
        </a>
      `;
    }

    let naverMapInstance = null;

    function initInteractiveMap() {
      const mapEl = document.getElementById('interactiveMap');
      if (!mapEl || !window.naver || !window.naver.maps) { showFallbackMap(); return; }

      const lat = 37.5384438;
      const lng = 127.1224221;

      try {
        naverMapInstance = new naver.maps.Map('interactiveMap', {
          center: new naver.maps.LatLng(lat, lng),
          zoom: 17,
          minZoom: 10,
          maxZoom: 19,
          draggable: false,
          pinchZoom: false,
          scrollWheel: false,
          disableDoubleTapZoom: true,
          disableTwoFingerTapZoom: true,
          disableKineticPan: true,
          mapTypeControl: false,
          scaleControl: false,
          logoControl: false,
          mapDataControl: false,
          zoomControl: false
        });

        const marker = new naver.maps.Marker({
          position: new naver.maps.LatLng(lat, lng),
          map: naverMapInstance,
          title: '라비니움 (천호역 10번 출구)',
          icon: {
            content: `<div style="width:44px;height:50px;display:flex;flex-direction:column;align-items:center;cursor:pointer;filter:drop-shadow(0 3px 8px rgba(0,0,0,0.25));box-sizing:border-box;">
              <div style="width:44px;height:44px;border-radius:50%;background:#ffffff;border:2px solid #1a1a1a;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,0.12);box-sizing:border-box;position:relative;">
                <img src="images/wedding-ring.png" alt="웨딩링" style="width:28px;height:28px;object-fit:contain;display:block;">
              </div>
              <div style="width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:7px solid #1a1a1a;margin-top:-1px;"></div>
            </div>`,
            size: new naver.maps.Size(44, 50),
            anchor: new naver.maps.Point(22, 50)
          }
        });

        naver.maps.Event.addListener(marker, 'click', () => openLargeMapModal());
        // Do not attach unconditional click on naverMapInstance to prevent scroll gesture accidental triggering

        // Check if Naver Maps injected an authentication error banner
        setTimeout(() => {
          if (mapEl.innerText.includes('인증이 실패') || mapEl.innerText.includes('Open API')) {
            showFallbackMap();
          }
        }, 400);
      } catch (err) {
        showFallbackMap();
      }

      setupMapTouchGuard();
    }

    /* Smart Touch Gesture Guard (Prevents accidental map popup opening during scroll) */
    function setupMapTouchGuard() {
      const mapWrapper = document.getElementById('mapFrameWrapper');
      if (!mapWrapper || mapWrapper.dataset.touchGuardInit) return;
      mapWrapper.dataset.touchGuardInit = 'true';

      let touchStartX = 0;
      let touchStartY = 0;
      let touchStartTime = 0;
      let isScrollDragging = false;

      mapWrapper.addEventListener('touchstart', (e) => {
        if (e.touches && e.touches.length > 0) {
          touchStartX = e.touches[0].clientX;
          touchStartY = e.touches[0].clientY;
          touchStartTime = Date.now();
          isScrollDragging = false;
        }
      }, { passive: true });

      mapWrapper.addEventListener('touchmove', (e) => {
        if (e.touches && e.touches.length > 0) {
          const dx = Math.abs(e.touches[0].clientX - touchStartX);
          const dy = Math.abs(e.touches[0].clientY - touchStartY);
          if (dx > 8 || dy > 8) {
            isScrollDragging = true;
          }
        }
      }, { passive: true });

      mapWrapper.addEventListener('touchend', (e) => {
        const elapsed = Date.now() - touchStartTime;
        // If user was scrolling, dragging or held down for too long, completely ignore
        if (isScrollDragging || elapsed > 350) {
          return;
        }
        // If it was a quick, intentional tap directly on the map area
        if (!e.target.closest('.map-expand-badge')) {
          openLargeMapModal();
        }
      }, { passive: true });
    }

    /* Universal Safe App Launcher Helper (Optimized for Mobile Chrome & WebKit) */
    function openUrlOrScheme(url) {
      if (!url) return;
      try {
        window.location.href = url;
      } catch (e) {
        console.log('[AppLauncher] window.location.href fallback:', e);
        const a = document.createElement('a');
        a.href = url;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          if (a && a.parentNode) a.parentNode.removeChild(a);
        }, 300);
      }
    }

    /* Enterprise Native App Deep Link & Safe Web Fallback Engine */
    function openAppWithFallback(appScheme, webFallbackUrl, androidIntentUrl) {
      const isAndroid = /Android/i.test(navigator.userAgent);
      const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
      const isMobile = isAndroid || isIOS;

      // 1. Desktop PC Browser: Open Web Fallback directly in a new tab
      if (!isMobile) {
        if (webFallbackUrl) window.open(webFallbackUrl, '_blank', 'noopener,noreferrer');
        return;
      }

      // 2. Android Chrome / Mobile Browsers: Use Standard Android Intent with built-in S.browser_fallback_url
      if (isAndroid) {
        const targetUrl = androidIntentUrl || appScheme;
        openUrlOrScheme(targetUrl);
        return;
      }

      // 3. iOS Safari / iOS Chrome: Try Custom URL Scheme with Visibility Guard Web Fallback
      const start = Date.now();
      let hasMovedAway = false;
      const onVisibilityChange = () => {
        if (document.hidden || document.webkitHidden) hasMovedAway = true;
      };
      document.addEventListener('visibilitychange', onVisibilityChange, { once: true });
      window.addEventListener('pagehide', onVisibilityChange, { once: true });

      openUrlOrScheme(appScheme);

      if (webFallbackUrl) {
        setTimeout(() => {
          document.removeEventListener('visibilitychange', onVisibilityChange);
          window.removeEventListener('pagehide', onVisibilityChange);
          if (!hasMovedAway && (Date.now() - start) < 2600) {
            openUrlOrScheme(webFallbackUrl);
          }
        }, 1800);
      }
    }

    function launchNavigationApp(app) {
      const isAndroid = /Android/i.test(navigator.userAgent);
      const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
      const isMobile = isAndroid || isIOS;

      const venueName = '라비니움';
      const encodedName = encodeURIComponent(venueName);
      const lat = '37.5384438';
      const lng = '127.1224221';

      const naverWebUrl = `https://map.naver.com/p/search/${encodedName}`;
      const kakaoWebUrl = `https://map.kakao.com/link/to/${encodedName},${lat},${lng}`;

      // Desktop PC: Direct Web Browser Navigation in New Tab
      if (!isMobile) {
        if (app === 'naver' || app === 'tmap') {
          window.open(naverWebUrl, '_blank', 'noopener,noreferrer');
        } else if (app === 'kakao') {
          window.open(kakaoWebUrl, '_blank', 'noopener,noreferrer');
        }
        return;
      }

      if (app === 'naver') {
        const androidIntent = `intent://route/car?dlat=${lat}&dlng=${lng}&dname=${encodedName}&appname=wedding#Intent;scheme=nmap;action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;package=com.nhn.android.nmap;S.browser_fallback_url=${encodeURIComponent(naverWebUrl)};end`;
        const iosScheme = `nmap://route/car?dlat=${lat}&dlng=${lng}&dname=${encodedName}&appname=wedding`;
        openAppWithFallback(iosScheme, naverWebUrl, androidIntent);
      } else if (app === 'tmap') {
        const tmapParams = `goalname=${encodedName}&goalx=${lng}&goaly=${lat}&rGoName=${encodedName}&rGoX=${lng}&rGoY=${lat}&name=${encodedName}`;
        const androidIntent = `intent://route?${tmapParams}#Intent;scheme=tmap;action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;package=com.skt.tmap.ku;S.browser_fallback_url=${encodeURIComponent(naverWebUrl)};end`;
        const iosScheme = `tmap://route?${tmapParams}`;
        openAppWithFallback(iosScheme, naverWebUrl, androidIntent);
      } else if (app === 'kakao') {
        // KakaoNavi (com.locnall.KimGiSa) & KakaoMap route fail-safe
        const androidIntent = `intent://navigate?name=${encodedName}&coord_type=wgs84&x=${lng}&y=${lat}&key=${KAKAO_JAVASCRIPT_KEY}#Intent;scheme=kakaonavi;action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;package=com.locnall.KimGiSa;S.browser_fallback_url=${encodeURIComponent(kakaoWebUrl)};end`;
        const iosScheme = `kakaonavi://navigate?name=${encodedName}&coord_type=wgs84&x=${lng}&y=${lat}&key=${KAKAO_JAVASCRIPT_KEY}`;
        openAppWithFallback(iosScheme, kakaoWebUrl, androidIntent);
      }
    }

    function openNaverNavi() { launchNavigationApp('naver'); }
    function openTmapNavi() { launchNavigationApp('tmap'); }
    function openKakaoNavi() { launchNavigationApp('kakao'); }

    function updateCountdownTimer() {
      const target = new Date('2027-06-19T15:30:00+09:00');
      const now = new Date();
      const diff = target - now;

      const daysEl = document.getElementById('timer-days');
      const hoursEl = document.getElementById('timer-hours');
      const minsEl = document.getElementById('timer-mins');
      const secsEl = document.getElementById('timer-secs');
      const noticeEl = document.getElementById('countdownNotice');

      if (diff <= 0) {
        if (daysEl) daysEl.textContent = '00';
        if (hoursEl) hoursEl.textContent = '00';
        if (minsEl) minsEl.textContent = '00';
        if (secsEl) secsEl.textContent = '00';
        if (noticeEl) {
          noticeEl.innerHTML = '오늘은 <strong>호정, 다솔</strong>의 결혼식 당일입니다. 축하해 주세요!';
        }
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const mins = Math.floor((diff / (1000 * 60)) % 60);
      const secs = Math.floor((diff / 1000) % 60);

      if (daysEl) daysEl.textContent = String(days).padStart(2, '0');
      if (hoursEl) hoursEl.textContent = String(hours).padStart(2, '0');
      if (minsEl) minsEl.textContent = String(mins).padStart(2, '0');
      if (secsEl) secsEl.textContent = String(secs).padStart(2, '0');

      if (noticeEl) {
        noticeEl.innerHTML = `호정과 다솔의 결혼식이 <strong>${days}일</strong> 남았습니다.`;
      }
    }
    setInterval(updateCountdownTimer, 1000);
    updateCountdownTimer();

    function updateDDay() {
      updateCountdownTimer();
    }

    function addWeddingToCalendar() {
      const title = '이호정 & 전다솔 결혼식';
      const description = '이호정 & 전다솔의 결혼식에 초대합니다.\n일시: 2027년 6월 19일(토) 오후 3:30\n장소: 라비니움 1층 리츄얼홀 (서울특별시 송파구 천호대로 996)';
      const location = '서울특별시 송파구 천호대로 996 (라비니움 1층 리츄얼홀)';
      const startDate = '20270619T063000Z'; // 15:30 KST (UTC+9 -> 06:30Z)
      const endDate = '20270619T083000Z';   // 17:30 KST (UTC+9 -> 08:30Z)

      const startMillis = new Date('2027-06-19T15:30:00+09:00').getTime();
      const endMillis = new Date('2027-06-19T17:30:00+09:00').getTime();

      const googleWebUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${startDate}/${endDate}&details=${encodeURIComponent(description)}&location=${encodeURIComponent(location)}`;

      const isAndroid = /Android/i.test(navigator.userAgent);
      const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

      if (typeof showToastMsg === 'function') {
        showToastMsg('캘린더 일정 등록 화면으로 이동합니다.');
      }

      if (isAndroid) {
        // Android Native Calendar Insert Intent (Wakes up Google Calendar / Samsung Calendar App instantly)
        const androidIntent = `intent:#Intent;action=android.intent.action.INSERT;type=vnd.android.cursor.dir/event;S.title=${encodeURIComponent(title)};S.description=${encodeURIComponent(description)};S.eventLocation=${encodeURIComponent(location)};l.beginTime=${startMillis};l.endTime=${endMillis};S.browser_fallback_url=${encodeURIComponent(googleWebUrl)};end`;
        window.location.href = androidIntent;
      } else if (isIOS) {
        // iOS: Try Google Calendar App Scheme first, then fall back to Google Calendar Web
        const iosAppUrl = `comgooglecalendar://?action=create&title=${encodeURIComponent(title)}&dates=${startDate}/${endDate}&details=${encodeURIComponent(description)}&location=${encodeURIComponent(location)}`;
        const start = Date.now();

        window.location.href = iosAppUrl;

        setTimeout(() => {
          // If app was not opened (page remains visible)
          if (document.hidden || document.webkitHidden) return;
          if (Date.now() - start < 2500) {
            window.location.href = googleWebUrl;
          }
        }, 1200);
      } else {
        // PC / Others: Open Google Calendar in new tab
        window.open(googleWebUrl, '_blank', 'noopener,noreferrer');
      }
    }

    function scrollToSection(id) {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
        el.classList.add('active');
      }
    }

    /* Supercharged Dynamic Photo Double Tap Heart Burst */
    function triggerHeart(container, e) {
      const rect = container.getBoundingClientRect();
      let clickX = rect.width / 2;
      let clickY = rect.height / 2;
      let screenX = rect.left + clickX;
      let screenY = rect.top + clickY;

      if (e && e.clientX && e.clientY) {
        clickX = e.clientX - rect.left;
        clickY = e.clientY - rect.top;
        screenX = e.clientX;
        screenY = e.clientY;
      }

      // 1. Spawn Supercharged Big 3D Heart Element
      const heartEl = document.createElement('div');
      heartEl.className = 'dynamic-photo-heart';
      heartEl.style.left = clickX + 'px';
      heartEl.style.top = clickY + 'px';
      heartEl.innerHTML = `<svg viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`;
      container.appendChild(heartEl);
      setTimeout(() => heartEl.remove(), 900);

      // 2. Spawn Shockwave Ripple Ring
      const ripple = document.createElement('div');
      ripple.className = 'photo-heart-ripple';
      ripple.style.left = clickX + 'px';
      ripple.style.top = clickY + 'px';
      container.appendChild(ripple);
      setTimeout(() => ripple.remove(), 800);

      // 3. Spawn 360-degree Radial Heart Particles at Tap Position
      triggerEasterEggBurst(screenX, screenY, ['heart', 'pinkHeart', 'sparkle', 'star'], 14);

      // 4. Trigger Post Action Bar Heart
      const post = container.closest('.feed-post');
      const likeItem = post ? post.querySelector('.action-btn-item') : null;
      if (likeItem) {
        const svg = likeItem.querySelector('.action-svg');
        if (svg) {
          svg.classList.add('liked');
          svg.classList.remove('heart-burst-anim');
          void svg.offsetWidth;
          svg.classList.add('heart-burst-anim');
          setTimeout(() => svg.classList.remove('heart-burst-anim'), 700);
        }
      }
    }

    /* Ultra-Delightful Vector SVG Easter Egg Engine */
    const VECTOR_PARTICLES = {
      heart: '<svg viewBox="0 0 24 24" width="18" height="18" fill="#ff3040"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>',
      pinkHeart: '<svg viewBox="0 0 24 24" width="18" height="18" fill="#ff6b8b"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>',
      sparkle: '<svg viewBox="0 0 24 24" width="16" height="16" fill="#f59e0b"><path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z"/></svg>',
      star: '<svg viewBox="0 0 24 24" width="16" height="16" fill="#fbbf24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
      ring: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#d97706" stroke-width="2"><circle cx="12" cy="14" r="7"/><path d="M12 7l-2-3h4l-2 3z"/></svg>',
      bubble: '<svg viewBox="0 0 24 24" width="16" height="16" fill="#38bdf8"><circle cx="12" cy="12" r="9"/></svg>',
      plane: '<svg viewBox="0 0 24 24" width="16" height="16" fill="#2563eb"><path d="M22 2L2 9.2l8.8 3.5 3.5 8.8L22 2z"/></svg>',
      burst: '<svg viewBox="0 0 24 24" width="16" height="16" fill="#ef4444"><circle cx="12" cy="12" r="5"/></svg>'
    };

    function triggerEasterEggBurst(x, y, particleTypes = ['heart', 'pinkHeart', 'sparkle'], count = 10) {
      for (let i = 0; i < count; i++) {
        const particle = document.createElement('div');
        particle.className = 'easter-particle-blast';
        const type = particleTypes[Math.floor(Math.random() * particleTypes.length)];
        particle.innerHTML = VECTOR_PARTICLES[type] || VECTOR_PARTICLES.sparkle;

        const angle = (i / count) * 2 * Math.PI + (Math.random() - 0.5) * 0.6;
        const distance = Math.random() * 60 + 35;
        const dx = Math.cos(angle) * distance + 'px';
        const dy = Math.sin(angle) * distance + 'px';
        const rot = (Math.random() - 0.5) * 360 + 'deg';
        const scale = (Math.random() * 0.5 + 0.9).toFixed(2);

        particle.style.setProperty('--dx', dx);
        particle.style.setProperty('--dy', dy);
        particle.style.setProperty('--rot', rot);
        particle.style.setProperty('--target-scale', scale);
        particle.style.left = (x - 12) + 'px';
        particle.style.top = (y - 12) + 'px';

        document.body.appendChild(particle);
        setTimeout(() => particle.remove(), 950);
      }
    }

    function toggleLike(item, e) {
      handleActionLike(item, e);
    }

    /* 1. HEART: Endless Heart Explosion (Pure Easter Egg, No Count Change) */
    function handleActionLike(item, e) {
      const svg = item.querySelector('.action-svg');
      if (!svg) return;

      // Always fill red
      svg.classList.add('liked');

      // Re-trigger energetic popping animation on every single click
      svg.classList.remove('heart-burst-anim');
      void svg.offsetWidth; // Force reflow
      svg.classList.add('heart-burst-anim');
      setTimeout(() => svg.classList.remove('heart-burst-anim'), 700);

      const rect = item.getBoundingClientRect();
      const x = (e && e.clientX) ? e.clientX : (rect.left + rect.width / 2);
      const y = (e && e.clientY) ? e.clientY : (rect.top + rect.height / 2);

      triggerEasterEggBurst(x, y, ['heart', 'pinkHeart', 'sparkle', 'burst'], 12);
    }

    /* 2. SPEECH BUBBLE: Inflate like Balloon & POP Explosion! */
    function handleActionComment(item, e) {
      const svg = item.querySelector('.action-svg');
      if (svg) {
        svg.classList.remove('bubble-pop-anim');
        void svg.offsetWidth; // Force reflow
        svg.classList.add('bubble-pop-anim');
        setTimeout(() => svg.classList.remove('bubble-pop-anim'), 750);
      }

      const rect = item.getBoundingClientRect();
      const x = (e && e.clientX) ? e.clientX : (rect.left + rect.width / 2);
      const y = (e && e.clientY) ? e.clientY : (rect.top + rect.height / 2);

      // Delay pop particles slightly to match the balloon pop climax at ~350ms
      setTimeout(() => {
        triggerEasterEggBurst(x, y, ['bubble', 'sparkle', 'burst'], 12);
      }, 350);
    }

    /* 3. REPOST: 720° Turbo Spin & Speed Trails */
    function handleActionRepost(item, e) {
      const svg = item.querySelector('.action-svg');
      if (!svg) return;

      svg.classList.remove('repost-turbo-anim');
      void svg.offsetWidth; // Force reflow
      svg.classList.add('repost-turbo-anim');
      setTimeout(() => svg.classList.remove('repost-turbo-anim'), 750);

      svg.classList.toggle('reposted');

      const rect = item.getBoundingClientRect();
      const x = (e && e.clientX) ? e.clientX : (rect.left + rect.width / 2);
      const y = (e && e.clientY) ? e.clientY : (rect.top + rect.height / 2);

      triggerEasterEggBurst(x, y, ['sparkle', 'star', 'bubble'], 10);
    }

    /* 4. PAPER PLANE: Wind-up & SWOOSH 슝~ Fly Away! */
    function handleActionShare(item, e) {
      const svg = item.querySelector('.action-svg');
      if (svg) {
        svg.classList.remove('plane-fly-anim');
        void svg.offsetWidth; // Force reflow
        svg.classList.add('plane-fly-anim');
        setTimeout(() => svg.classList.remove('plane-fly-anim'), 900);
      }

      const rect = item.getBoundingClientRect();
      const x = (e && e.clientX) ? e.clientX : (rect.left + rect.width / 2);
      const y = (e && e.clientY) ? e.clientY : (rect.top + rect.height / 2);

      triggerEasterEggBurst(x, y, ['plane', 'sparkle', 'star'], 12);
    }

    /* 5. BOOKMARK: Starburst Explosion & Black Ribbon Fill */
    function handleActionSave(svg, e) {
      if (!svg) return;

      svg.classList.remove('bookmark-snap-anim');
      void svg.offsetWidth; // Force reflow
      svg.classList.add('bookmark-snap-anim');
      setTimeout(() => svg.classList.remove('bookmark-snap-anim'), 700);

      const isSaved = svg.classList.toggle('saved');

      const rect = svg.getBoundingClientRect();
      const x = (e && e.clientX) ? e.clientX : (rect.left + rect.width / 2);
      const y = (e && e.clientY) ? e.clientY : (rect.top + rect.height / 2);

      if (isSaved) {
        triggerEasterEggBurst(x, y, ['star', 'sparkle', 'ring'], 12);
      } else {
        triggerEasterEggBurst(x, y, ['sparkle', 'bubble'], 6);
      }
    }

    function animateActionTap(item) {
      if (!item) return;
      item.classList.remove('tap-active');
      void item.offsetWidth; // trigger reflow
      item.classList.add('tap-active');
      setTimeout(() => item.classList.remove('tap-active'), 400);
    }

    function toggleCommentLike(svg) {
      if (svg.style.fill === 'rgb(255, 48, 64)') {
        svg.style.fill = 'none';
        svg.style.stroke = 'var(--text-dim)';
      } else {
        svg.style.fill = '#ff3040';
        svg.style.stroke = '#ff3040';
      }
    }

    /* Confetti Particle Burst for RSVP YES */
    function launchConfetti() {
      const canvas = document.getElementById('confettiCanvas');
      const ctx = canvas.getContext('2d');
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      canvas.style.display = 'block';

      const pieces = [];
      const colors = ['#f09433', '#e6683c', '#dc2743', '#cc2366', '#bc1888', '#0095f6', '#ffd700'];

      for (let i = 0; i < 70; i++) {
        pieces.push({
          x: canvas.width / 2,
          y: canvas.height * 0.65,
          vx: (Math.random() - 0.5) * 16,
          vy: (Math.random() - 0.8) * 18,
          size: Math.random() * 8 + 4,
          color: colors[Math.floor(Math.random() * colors.length)],
          rotation: Math.random() * 360,
          rotSpeed: (Math.random() - 0.5) * 10,
          opacity: 1
        });
      }

      let frame = 0;
      function animateConfetti() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        let alive = false;
        pieces.forEach(p => {
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.45; // gravity
          p.rotation += p.rotSpeed;
          p.opacity -= 0.012;

          if (p.opacity > 0) {
            alive = true;
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate((p.rotation * Math.PI) / 180);
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.opacity;
            ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
            ctx.restore();
          }
        });

        frame++;
        if (alive && frame < 120) {
          requestAnimationFrame(animateConfetti);
        } else {
          canvas.style.display = 'none';
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      }
      requestAnimationFrame(animateConfetti);
    }

    let currentRsvpCount = 1;
    let currentRsvpSide = '신랑측';
    let currentRsvpMeal = '식사 예정';

    function selectRsvpSide(side, btn) {
      document.querySelectorAll('.rsvp-pill-group .rsvp-pill-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentRsvpSide = (side === 'groom') ? '신랑측' : '신부측';
    }

    function selectRsvpMeal(meal, btn) {
      document.querySelectorAll('.rsvp-meal-group .rsvp-pill-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      if (meal === 'yes') currentRsvpMeal = '식사 예정';
      else if (meal === 'no') currentRsvpMeal = '식사 안 함';
      else currentRsvpMeal = '미정';
    }

    function updateRsvpCountUI() {
      const display = document.getElementById('rsvpCountDisplay');
      if (display) {
        if (currentRsvpCount === 1) {
          display.textContent = '1명 (본인)';
        } else {
          display.textContent = `${currentRsvpCount}명 (동반 ${currentRsvpCount - 1}인)`;
        }
      }

      // Update preset chips active state
      document.querySelectorAll('.rsvp-count-chip').forEach((chip, index) => {
        chip.classList.remove('active');
        if (index === 0 && currentRsvpCount === 1) chip.classList.add('active');
        else if (index === 1 && currentRsvpCount === 2) chip.classList.add('active');
        else if (index === 2 && currentRsvpCount === 3) chip.classList.add('active');
        else if (index === 3 && currentRsvpCount >= 4) chip.classList.add('active');
      });
    }

    function adjustRsvpCount(delta) {
      currentRsvpCount = Math.max(1, Math.min(10, currentRsvpCount + delta));
      updateRsvpCountUI();
    }

    function setRsvpCount(count, btn) {
      currentRsvpCount = count;
      updateRsvpCountUI();
    }

    function selectPoll(isYes, btn) {
      const choiceYes = document.getElementById('rsvpChoiceYes');
      const choiceNo = document.getElementById('rsvpChoiceNo');
      const form = document.getElementById('rsvp-form');
      const declined = document.getElementById('rsvp-declined');

      if (choiceYes) choiceYes.classList.remove('active', 'yes', 'no');
      if (choiceNo) choiceNo.classList.remove('active', 'yes', 'no');

      if (isYes) {
        if (choiceYes) choiceYes.classList.add('active', 'yes');
        if (declined) declined.style.display = 'none';
        if (form) {
          form.style.display = 'block';
          launchConfetti();
          setTimeout(() => {
            form.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }, 120);
        }
      } else {
        if (choiceNo) choiceNo.classList.add('active', 'no');
        if (form) form.style.display = 'none';
        if (declined) {
          declined.style.display = 'block';
          setTimeout(() => {
            declined.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }, 120);
        }
      }
    }

    function submitRSVP() {
      const nameInput = document.getElementById('rsvpName');
      const name = nameInput ? nameInput.value.trim() : '';
      if (!name) {
        showCustomAlert('성함을 입력해 주세요.', { title: '입력 필요', type: 'warn' }).then(() => {
          if (nameInput) nameInput.focus();
        });
        return;
      }
      // Send to Google Sheet (if configured)
      sendDataToGoogleSheet({
        action: 'rsvp',
        name: name,
        side: currentRsvpSide,
        count: currentRsvpCount,
        meal: currentRsvpMeal,
        createdAt: new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })
      });

      launchConfetti();
      showToastMsg(`${name}님의 소중한 참석 의사가 전달되었습니다. 감사합니다!`);
      const form = document.getElementById('rsvp-form');
      if (form) form.style.display = 'none';
      const choiceYes = document.getElementById('rsvpChoiceYes');
      if (choiceYes) {
        const companionText = (currentRsvpCount > 1) ? ` 외 ${currentRsvpCount - 1}인` : '';
        choiceYes.innerHTML = `
          <div class="choice-icon-wrap" style="background:#0095f6;color:#fff;">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <span class="choice-title" style="color:#0095f6;">참석 전달 완료</span>
          <span class="choice-desc">${currentRsvpSide} · ${name}님${companionText}</span>
        `;
      }
    }

    function switchBankTab(side, tabBtn) {
      document.querySelectorAll('.bank-tab-btn').forEach(t => t.classList.remove('active'));
      tabBtn.classList.add('active');
      const groom = document.getElementById('bank-groom');
      const bride = document.getElementById('bank-bride');
      if (side === 'groom') {
        bride.style.display = 'none';
        groom.style.display = 'block';
        groom.classList.remove('bank-tab-panel');
        void groom.offsetWidth; // trigger reflow for animation restart
        groom.classList.add('bank-tab-panel');
      } else {
        groom.style.display = 'none';
        bride.style.display = 'block';
        bride.classList.remove('bank-tab-panel');
        void bride.offsetWidth; // trigger reflow for animation restart
        bride.classList.add('bank-tab-panel');
      }
    }

    function copyText(text, customMsg) {
      const msg = customMsg || '복사되었습니다.';
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
          showToastMsg(msg);
        }).catch(() => {
          fallbackCopy(text, msg);
        });
      } else {
        fallbackCopy(text, msg);
      }
    }

    function fallbackCopy(text, msg = '복사되었습니다.') {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.readOnly = true;
      ta.contentEditable = 'true';
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      ta.style.top = '0';
      ta.style.opacity = '0';
      ta.style.fontSize = '16px'; // Prevents iOS Safari auto-zoom
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      ta.setSelectionRange(0, text.length);
      try {
        document.execCommand('copy');
        showToastMsg(msg);
      } catch (e) { }
      document.body.removeChild(ta);
    }

    /* Native Easy Remittance (간편송금) Handlers: Instant Copy & Direct App Launch */
    function sendKakaoPay(bank, accountNo) {
      const cleanAccount = accountNo.replace(/[^0-9]/g, '');
      const isAndroid = /Android/i.test(navigator.userAgent);
      const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
      const isMobile = isAndroid || isIOS;

      copyText(cleanAccount, `계좌번호(${bank} ${accountNo})가 복사되었습니다!`);

      if (!isMobile) {
        showToastMsg(`계좌번호(${bank} ${accountNo})가 복사되었습니다. PC에서는 인터넷 뱅킹을 이용해 주세요.`);
        return;
      }

      const webFallback = 'https://www.kakaopay.com';
      if (isAndroid) {
        const androidIntent = `intent://kakaopay/money/to/bank#Intent;scheme=kakaotalk;action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;package=com.kakao.talk;S.browser_fallback_url=${encodeURIComponent(webFallback)};end`;
        openUrlOrScheme(androidIntent);
      } else {
        openAppWithFallback('kakaotalk://kakaopay/money/to/bank', webFallback);
      }
    }

    function sendToss(bank, accountNo) {
      const cleanAccount = accountNo.replace(/[^0-9]/g, '');
      const bankName = bank.replace('은행', '').trim();
      const isAndroid = /Android/i.test(navigator.userAgent);
      const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
      const isMobile = isAndroid || isIOS;

      copyText(cleanAccount, `계좌번호(${bank} ${accountNo})가 복사되었습니다!`);

      if (!isMobile) {
        showToastMsg(`계좌번호(${bank} ${accountNo})가 복사되었습니다. PC에서는 인터넷 뱅킹을 이용해 주세요.`);
        return;
      }

      const webFallback = 'https://toss.im';
      if (isAndroid) {
        const androidIntent = `intent://send?bank=${encodeURIComponent(bankName)}&accountNo=${cleanAccount}#Intent;scheme=supertoss;action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;package=viva.republica.toss;S.browser_fallback_url=${encodeURIComponent(webFallback)};end`;
        openUrlOrScheme(androidIntent);
      } else {
        openAppWithFallback(`supertoss://send?bank=${encodeURIComponent(bankName)}&accountNo=${cleanAccount}`, webFallback);
      }
    }

    function sendKakaoBank(bank, accountNo) {
      const cleanAccount = accountNo.replace(/[^0-9]/g, '');
      const isAndroid = /Android/i.test(navigator.userAgent);
      const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
      const isMobile = isAndroid || isIOS;

      copyText(cleanAccount, `계좌번호(${bank} ${accountNo})가 복사되었습니다!`);

      if (!isMobile) {
        showToastMsg(`계좌번호(${bank} ${accountNo})가 복사되었습니다. PC에서는 인터넷 뱅킹을 이용해 주세요.`);
        return;
      }

      const webFallback = 'https://www.kakaobank.com';
      if (isAndroid) {
        const androidIntent = `intent://open#Intent;scheme=kakaobank;action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;package=com.kakaobank.channel;S.browser_fallback_url=${encodeURIComponent(webFallback)};end`;
        openUrlOrScheme(androidIntent);
      } else {
        openAppWithFallback('kakaobank://', webFallback);
      }
    }

    /* ==================================================== */
    /* INVITATION SHARE ENGINE (카카오톡 공유 & 링크 복사)     */
    /* ==================================================== */
    function shareKakaoTalk() {
      if (window.location.protocol === 'file:') {
        copyText(window.location.href, '로컬 파일 환경에서는 카카오톡 공유 대신 링크가 복사되었습니다.');
        return;
      }

      initKakaoSDK();

      const shareTitle = '이호정 & 전다솔 결혼합니다';
      const shareDesc = '2027년 6월 19일 토요일 오후 3시 30분 라비니움 1층 리츄얼홀';
      const shareUrl = window.location.href.split('#')[0];
      const basePath = window.location.pathname.substring(0, window.location.pathname.lastIndexOf('/') + 1);
      const shareImg = window.location.origin + basePath + 'images/main/1762868176689.jpg';

      // 1. Kakao JS SDK Official Card Share (카카오톡 전용 피드 카드 메시지)
      if (window.Kakao && window.Kakao.isInitialized && window.Kakao.isInitialized()) {
        try {
          window.Kakao.Share.sendDefault({
            objectType: 'feed',
            content: {
              title: shareTitle,
              description: shareDesc,
              imageUrl: shareImg,
              link: {
                mobileWebUrl: shareUrl,
                webUrl: shareUrl
              }
            },
            buttons: [
              {
                title: '모바일 청첩장 보기',
                link: {
                  mobileWebUrl: shareUrl,
                  webUrl: shareUrl
                }
              }
            ]
          });
          return;
        } catch (e) {
          console.log('[KakaoShare] SDK send error:', e);
        }
      }

      // 2. Native Web Share API (Mobile Safari, Chrome, Samsung Internet, In-App Browsers)
      if (navigator.share) {
        navigator.share({
          title: shareTitle,
          text: `${shareTitle}\n${shareDesc}\n\n저희 두 사람의 결혼식에 소중한 분들을 초대합니다.`,
          url: shareUrl
        }).catch((err) => {
          if (err && err.name !== 'AbortError') {
            copyText(shareUrl, '모바일 청첩장 링크가 복사되었습니다!');
          }
        });
        return;
      }

      // 3. Fallback: Copy URL to clipboard with Toast Guide
      copyText(shareUrl, '모바일 청첩장 링크가 복사되었습니다. 카카오톡에 붙여넣어 공유해보세요!');
    }

    function shareCopyLink() {
      const shareUrl = window.location.href.split('#')[0];
      copyText(shareUrl, '모바일 청첩장 주소가 복사되었습니다.');
    }

    /* =============================== */
    /* CUSTOM ALERT / CONFIRM MODAL    */
    /* =============================== */
    let customModalResolve = null;

    function showCustomAlert(msg, options = {}) {
      const overlay = document.getElementById('customModalOverlay');
      const titleEl = document.getElementById('customModalTitle');
      const msgEl = document.getElementById('customModalMsg');
      const iconEl = document.getElementById('customModalIcon');
      const actionsEl = document.getElementById('customModalActions');
      if (!overlay) return Promise.resolve(true);

      const title = options.title || '안내';
      const type = options.type || 'info'; // info, warn, success

      titleEl.textContent = title;
      msgEl.textContent = msg;

      // Set icon type
      iconEl.className = 'custom-modal-icon ' + type;
      const iconSvgs = {
        info: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
        warn: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
        success: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>'
      };
      iconEl.innerHTML = iconSvgs[type] || iconSvgs.info;

      // Alert mode: single OK button
      actionsEl.innerHTML = '<button type="button" class="custom-modal-btn ok" onclick="closeCustomModal(true)">확인</button>';

      overlay.classList.add('show');

      return new Promise(resolve => {
        customModalResolve = resolve;
      });
    }

    function showCustomConfirm(msg, options = {}) {
      const overlay = document.getElementById('customModalOverlay');
      const titleEl = document.getElementById('customModalTitle');
      const msgEl = document.getElementById('customModalMsg');
      const iconEl = document.getElementById('customModalIcon');
      const actionsEl = document.getElementById('customModalActions');
      if (!overlay) return Promise.resolve(false);

      const title = options.title || '확인';
      const type = options.type || 'info';
      const okText = options.okText || '확인';
      const cancelText = options.cancelText || '취소';
      const danger = options.danger || false;

      titleEl.textContent = title;
      msgEl.textContent = msg;

      iconEl.className = 'custom-modal-icon ' + type;
      const iconSvgs = {
        info: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
        warn: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
        success: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>'
      };
      iconEl.innerHTML = iconSvgs[type] || iconSvgs.info;

      // Confirm mode: Cancel + OK buttons
      const dangerClass = danger ? ' danger' : '';
      actionsEl.innerHTML = `
        <button type="button" class="custom-modal-btn cancel" onclick="closeCustomModal(false)">${cancelText}</button>
        <button type="button" class="custom-modal-btn ok${dangerClass}" onclick="closeCustomModal(true)">${okText}</button>
      `;

      overlay.classList.add('show');

      return new Promise(resolve => {
        customModalResolve = resolve;
      });
    }

    function closeCustomModal(result) {
      const overlay = document.getElementById('customModalOverlay');
      if (overlay) overlay.classList.remove('show');
      if (customModalResolve) {
        customModalResolve(result);
        customModalResolve = null;
      }
    }

    function handleModalOverlayClick(e) {
      if (e.target === e.currentTarget) {
        closeCustomModal(false);
      }
    }

    let toastTimer = null;
    function showToastMsg(msg) {
      const toast = document.getElementById('toast');
      if (!toast) return;

      if (toastTimer) {
        clearTimeout(toastTimer);
        toastTimer = null;
      }

      toast.textContent = msg;
      toast.classList.remove('show');
      void toast.offsetWidth; // Force DOM reflow to re-trigger pop animation
      toast.classList.add('show');

      toastTimer = setTimeout(() => {
        toast.classList.remove('show');
        toastTimer = null;
      }, 2200);
    }

        /* ==================================================== */
    /* INSTAGRAM COMMENTS ENGINE & FULL BOTTOM SHEET (IMAGE 2) */
    /* ==================================================== */
    const emojiMap = {
      'heart': '\u2764\uFE0F',
      'clap': '\uD83D\uDC4F',
      'fire': '\uD83D\uDD25',
      'party': '\uD83C\uDF89',
      'plead': '\uD83E\uDD7A',
    }

    function renderCommentItemHTML(c) {
      const isAuthorTag = c.isAuthor ? `<span class="ig-author-badge">· 작성자</span>` : '';

      return `
        <div class="ig-comment-item">
          <div class="ig-comment-main">
            <div class="ig-comment-header-row">
              <span class="ig-comment-uname">${c.uname}</span>
              <span class="ig-comment-time">${c.time}</span>
              ${isAuthorTag}
            </div>
            <div class="ig-comment-text">${c.text}</div>
          </div>
        </div>
      `;
    }

    function renderComments() {
      const totalCount = commentsData.length;
      const badge = document.getElementById('comments-count-badge');
      if (badge) badge.textContent = totalCount;
      const postCommentCount = document.getElementById('post-comments-count');
      if (postCommentCount) postCommentCount.textContent = totalCount;

      const viewAllBtn = document.getElementById('view-all-comments-btn');
      if (viewAllBtn) {
        if (totalCount === 0) {
          viewAllBtn.style.display = 'none';
        } else {
          viewAllBtn.style.display = 'block';
          viewAllBtn.innerHTML = `메시지 <span id="comments-count-badge">${totalCount}</span>개 모두 보기`;
        }
      }

      // 1. Render Preview Comments on main page (latest 2 comments)
      const listEl = document.getElementById('comments-list');
      if (listEl) {
        if (commentsData.length === 0) {
          if (isCommentsLoading) {
            listEl.innerHTML = `
              <div style="text-align:center; padding:18px 0; color:#aaaaaa; font-size:0.84rem;">
                축하 메시지를 불러오는 중입니다...
              </div>
            `;
          } else {
            listEl.innerHTML = `
              <div style="text-align:center; padding:18px 0; color:#8e8e8e; font-size:0.86rem;">
                첫 번째 축하 메시지를 남겨주세요
              </div>
            `;
          }
        } else {
          const previewItems = commentsData.slice(0, 2);
          listEl.innerHTML = previewItems.map(c => renderCommentItemHTML(c)).join('');
        }
      }

      // 2. Render Full Modal Sheet List (all comments)
      const sheetBody = document.getElementById('sheet-comments-body');
      if (sheetBody) {
        if (commentsData.length === 0) {
          if (isCommentsLoading) {
            sheetBody.innerHTML = `
              <div style="text-align:center; padding:50px 20px; color:#aaaaaa; font-size:0.88rem; line-height:1.6;">
                축하 메시지를 불러오는 중입니다...
              </div>
            `;
          } else {
            sheetBody.innerHTML = `
              <div style="text-align:center; padding:50px 20px; color:#8e8e8e; font-size:0.9rem; line-height:1.6;">
                아직 등록된 축하 메시지가 없습니다.<br>가장 먼저 축하의 한마디를 남겨주세요.
              </div>
            `;
          }
        } else {
          sheetBody.innerHTML = commentsData.map(c => renderCommentItemHTML(c)).join('');
        }
      }
    }

    /* ==================================================== */
    /* UNIFIED MODAL & VIEWER BROWSER BACK NAVIGATION       */
    /* & BULLETPROOF SCROLL/TOUCH ISOLATION                 */
    /* ==================================================== */
    const modalHistoryStack = [];
    let isHistoryNavigating = false;
    let lockedScrollY = 0;
    let isScrollLocked = false;

    function updateModalBodyState() {
      const hasModals = modalHistoryStack.length > 0;
      
      if (hasModals && !isScrollLocked) {
        document.documentElement.classList.add('modal-open');
        document.body.classList.add('modal-open');
        isScrollLocked = true;
      } else if (!hasModals && isScrollLocked) {
        document.documentElement.classList.remove('modal-open');
        document.body.classList.remove('modal-open');
        isScrollLocked = false;
      }

      if (typeof manageFeedVideos === 'function') {
        manageFeedVideos();
      }
    }

    /* ==================================================== */
    /* BULLETPROOF MODAL TOUCH TRAPPING & 1PX INSET GUARD   */
    /* 모달 내 스크롤 시 접혀있던 브라우저 주소창 슬라이드인 원천 차단 */
    /* ==================================================== */
    (function initTouchBoundaryGuards() {
      let touchStartY = 0;
      let activeScrollable = null;

      document.addEventListener('touchstart', (e) => {
        if (!isScrollLocked) return;

        if (e.touches.length === 1) {
          touchStartY = e.touches[0].clientY;
          activeScrollable = e.target.closest(
            '.comments-sheet-body, .tmi-sheet-body, .activity-sheet-body, .grid-gallery-sheet-body, .profile-sheet-body, .rough-map-sheet-body, .large-map-modal-body, .sheet-comments-body, #story-viewer, #photo-lightbox'
          );

          // 1px Inset Trick: 맨 위(0)나 맨 아래에 닿아 있으면 1px 안쪽으로 살짝 이동시켜
          // 브라우저가 주소창 슬라이드인 제스처를 인식하지 못하게 방어
          if (activeScrollable) {
            if (activeScrollable.scrollTop <= 0) {
              activeScrollable.scrollTop = 1;
            } else if (activeScrollable.scrollTop + activeScrollable.clientHeight >= activeScrollable.scrollHeight) {
              activeScrollable.scrollTop = activeScrollable.scrollHeight - activeScrollable.clientHeight - 1;
            }
          }
        }
      }, { passive: true });

      document.addEventListener('touchmove', (e) => {
        if (!isScrollLocked) return;

        // 모달 오버레이 바깥이나 헤더/버튼 등 고정 영역 터치는 100% 차단
        if (!activeScrollable) {
          if (e.cancelable) {
            e.preventDefault();
          }
          return;
        }

        const currentY = e.touches[0].clientY;
        const deltaY = currentY - touchStartY;

        const isAtTop = activeScrollable.scrollTop <= 1;
        const isAtBottom = activeScrollable.scrollTop + activeScrollable.clientHeight >= activeScrollable.scrollHeight - 1;

        // 맨 위에서 아래로 당길 때(주소창 노출 트리거) 또는 맨 아래에서 위로 밀 때 -> 브라우저 윈도우 스크롤러 전파 100% 차단
        if ((isAtTop && deltaY > 0) || (isAtBottom && deltaY < 0)) {
          if (e.cancelable) {
            e.preventDefault();
          }
        }
      }, { passive: false });
    })();

    /* ==================================================== */
    /* UNIVERSAL BULLETPROOF MODAL HISTORY ROUTER           */
    /* ==================================================== */
    let isPoppingProgrammatically = false;

    function pushModalToHistory(id, closeCallback) {
      if (modalHistoryStack.length > 0 && modalHistoryStack[modalHistoryStack.length - 1].id === id) {
        return;
      }
      modalHistoryStack.push({ id, close: closeCallback });
      history.pushState({ modalId: id, stackDepth: modalHistoryStack.length }, '');
      updateModalBodyState();
    }

    function popModalFromHistory(id) {
      const idx = modalHistoryStack.findIndex(m => m.id === id);
      if (idx !== -1) {
        modalHistoryStack.splice(idx, 1);
        isPoppingProgrammatically = true;
        history.back();
        setTimeout(() => {
          isPoppingProgrammatically = false;
          updateModalBodyState();
        }, 120);
      }
      updateModalBodyState();
    }

    window.addEventListener('popstate', () => {
      if (isPoppingProgrammatically) {
        isPoppingProgrammatically = false;
        updateModalBodyState();
        return;
      }

      if (modalHistoryStack.length > 0) {
        const topModal = modalHistoryStack.pop();
        if (topModal && typeof topModal.close === 'function') {
          topModal.close(true);
        }
      }
      updateModalBodyState();
    });

    function openCommentsSheet() {
      renderComments();
      const overlay = document.getElementById('comments-modal-overlay');
      if (overlay) {
        overlay.classList.add('active');
        pushModalToHistory('comments-sheet', (fromHistory) => {
          overlay.classList.remove('active');
        });
      }
    }

    function closeCommentsSheet(fromHistory = false) {
      const overlay = document.getElementById('comments-modal-overlay');
      if (overlay) {
        overlay.classList.remove('active');
      }
      if (!fromHistory) {
        popModalFromHistory('comments-sheet');
      }
    }

    function handleCommentsOverlayClick(e) {
      if (e.target.id === 'comments-modal-overlay') {
        closeCommentsSheet();
      }
    }

    /* TMI Behind Profile Bottom Sheet Handlers (Integrated Profile & Story) */
    let currentTmiType = 'couple';

    function openTmiModal(type = 'couple', focusMember = null) {
      currentTmiType = type;
      const overlay = document.getElementById('tmi-modal-overlay');
      const titleEl = document.getElementById('tmi-modal-title');
      const secCouple = document.getElementById('tmi-section-couple');
      const secStory = document.getElementById('tmi-section-story');
      const secGuest = document.getElementById('tmi-section-guest');

      if (secCouple) secCouple.style.display = (type === 'couple') ? 'flex' : 'none';
      if (secStory) secStory.style.display = (type === 'story') ? 'flex' : 'none';
      if (secGuest) secGuest.style.display = (type === 'guest') ? 'flex' : 'none';

      if (titleEl) {
        if (type === 'couple') titleEl.textContent = '신랑 & 신부 프로필';
        else if (type === 'story') titleEl.textContent = 'Our Love Story';
        else if (type === 'guest') titleEl.textContent = '하객 감사 인사';
      }

      if (overlay) {
        overlay.classList.add('active');
        if (focusMember === 'groom') {
          setTimeout(() => {
            const groomCard = document.getElementById('tmi-card-groom');
            if (groomCard) groomCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 80);
        } else if (focusMember === 'bride') {
          setTimeout(() => {
            const brideCard = document.getElementById('tmi-card-bride');
            if (brideCard) brideCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 80);
        }

        pushModalToHistory('tmi-modal', (fromHistory) => {
          overlay.classList.remove('active');
        });
      }
    }

    function closeTmiModal(fromHistory = false) {
      const overlay = document.getElementById('tmi-modal-overlay');
      if (overlay) {
        overlay.classList.remove('active');
      }
      if (!fromHistory) {
        popModalFromHistory('tmi-modal');
      }
    }

    function handleTmiOverlayClick(e) {
      if (e.target.id === 'tmi-modal-overlay') {
        closeTmiModal();
      }
    }

    /* Groom & Bride Profile Modal Legacy Wrapper -> Integrated with TMI Modal */
    function openProfileModal(focusType = 'all') {
      openTmiModal('couple', focusType === 'all' ? null : focusType);
    }

    function closeProfileModal(fromHistory = false) {
      closeTmiModal(fromHistory);
    }

    function handleProfileOverlayClick(e) {
      closeTmiModal();
    }

    /* ==================================================== */
    /* HERO PHOTO WATER DROP RIPPLE INTERACTION             */
    /* 메인 사진 터치/클릭 시 물방울 낙하 및 수면 파동 애니메이션 */
    /* ==================================================== */
    function handleHeroPhotoClick(e) {
      const container = e.currentTarget || document.querySelector('.wedding-hero-photo');
      if (!container) return;

      const rect = container.getBoundingClientRect();
      let clientX, clientY;

      if (e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else if (e.changedTouches && e.changedTouches.length > 0) {
        clientX = e.changedTouches[0].clientX;
        clientY = e.changedTouches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }

      if (typeof clientX !== 'number' || typeof clientY !== 'number') {
        clientX = rect.left + rect.width / 2;
        clientY = rect.top + rect.height / 2;
      }

      const x = Math.max(10, Math.min(rect.width - 10, clientX - rect.left));
      const y = Math.max(10, Math.min(rect.height - 10, clientY - rect.top));

      createWaterRippleEffect(container, x, y);
    }

    function createWaterRippleEffect(container, x, y) {
      let rippleWrap = container.querySelector('.water-ripple-container');
      if (!rippleWrap) {
        rippleWrap = document.createElement('div');
        rippleWrap.className = 'water-ripple-container';
        container.appendChild(rippleWrap);
      }

      // 1. Water Droplet (위에서 똑 떨어짐)
      const droplet = document.createElement('div');
      droplet.className = 'water-droplet';
      droplet.style.left = `${x}px`;
      droplet.style.top = `${y}px`;
      rippleWrap.appendChild(droplet);

      // 2. Concentric Ripple Waves (물결 퍼짐 - 3겹)
      setTimeout(() => {
        for (let i = 1; i <= 3; i++) {
          const wave = document.createElement('div');
          wave.className = `water-ripple-wave wave-${i}`;
          wave.style.left = `${x}px`;
          wave.style.top = `${y}px`;
          rippleWrap.appendChild(wave);
        }

        // 3. Splash Particles (미세 물방울 튀김 6개)
        const angles = [0, 60, 120, 180, 240, 300];
        angles.forEach(deg => {
          const p = document.createElement('div');
          p.className = 'water-splash-particle';
          p.style.left = `${x}px`;
          p.style.top = `${y}px`;
          const dist = 18 + Math.random() * 22;
          const rad = (deg + (Math.random() * 20 - 10)) * (Math.PI / 180);
          const tx = Math.cos(rad) * dist;
          const ty = Math.sin(rad) * dist - 8;
          p.style.setProperty('--tx', `${tx}px`);
          p.style.setProperty('--ty', `${ty}px`);
          rippleWrap.appendChild(p);
        });
      }, 160);

      // Clean up elements after animation finishes
      setTimeout(() => {
        if (droplet && droplet.parentNode) droplet.parentNode.removeChild(droplet);
        const waves = rippleWrap.querySelectorAll('.water-ripple-wave, .water-splash-particle');
        waves.forEach(w => {
          if (w && w.parentNode) w.parentNode.removeChild(w);
        });
      }, 1300);
    }

    /* Top Nav (+) Confetti Celebration Fireworks Engine */
    function handleTopPlusClick(btn, e) {
      if (btn) {
        btn.classList.remove('plus-burst-anim');
        void btn.offsetWidth;
        btn.classList.add('plus-burst-anim');
        setTimeout(() => btn.classList.remove('plus-burst-anim'), 650);
      }

      const rect = btn ? btn.getBoundingClientRect() : { left: 24, top: 24, width: 24, height: 24 };
      const x = (e && e.clientX) ? e.clientX : (rect.left + rect.width / 2);
      const y = (e && e.clientY) ? e.clientY : (rect.top + rect.height / 2);

      triggerEasterEggBurst(x, y, ['sparkle', 'star', 'pinkHeart', 'heart', 'ring'], 14);
      launchConfetti();
    }

    /* Instagram Activity / Notification Modal Handlers */
    function openActivityModal() {
      const dot = document.getElementById('topHeartRedDot');
      if (dot) dot.style.display = 'none';

      const overlay = document.getElementById('activity-modal-overlay');
      if (overlay) {
        overlay.classList.add('active');
        pushModalToHistory('activity-modal', (fromHistory) => {
          overlay.classList.remove('active');
        });
      }
    }

    function closeActivityModal(fromHistory = false) {
      const overlay = document.getElementById('activity-modal-overlay');
      if (overlay) {
        overlay.classList.remove('active');
      }
      if (!fromHistory) {
        popModalFromHistory('activity-modal');
      }
    }

    function handleActivityOverlayClick(e) {
      if (e.target.id === 'activity-modal-overlay') {
        closeActivityModal();
      }
    }

    /* Instagram 3x3 Grid Wedding Gallery Modal Handlers */
    function openGridGalleryModal() {
      const overlay = document.getElementById('grid-gallery-modal-overlay');
      if (overlay) {
        overlay.classList.add('active');
        pushModalToHistory('grid-gallery-modal', (fromHistory) => {
          overlay.classList.remove('active');
        });
      }
    }

    function closeGridGalleryModal(fromHistory = false) {
      const overlay = document.getElementById('grid-gallery-modal-overlay');
      if (overlay) {
        overlay.classList.remove('active');
      }
      if (!fromHistory) {
        popModalFromHistory('grid-gallery-modal');
      }
    }

    function handleGridGalleryOverlayClick(e) {
      if (e.target.id === 'grid-gallery-modal-overlay') {
        closeGridGalleryModal();
      }
    }

    function selectGridPhoto(index) {
      closeGridGalleryModal();
      setTimeout(() => {
        openPhotoLightbox(index);
      }, 150);
    }

    /* Rough Map Modal Handlers */
    function openRoughMapModal() {
      openSinglePhotoLightbox('images/location-rough-map.jpg', '라비니움 오시는 길 약도');
    }

    function closeRoughMapModal(fromHistory = false) {
      closePhotoLightbox(fromHistory);
    }

    /* ==================================================== */
    /* LARGE INTERACTIVE MAP MODAL HANDLERS                 */
    /* ==================================================== */
    let naverLargeMapInstance = null;
    let largeMapMarker = null;

    function initLargeInteractiveMap() {
      const mapEl = document.getElementById('largeInteractiveMap');
      if (!mapEl || !window.naver || !window.naver.maps) {
        showLargeMapFallback();
        return;
      }

      const lat = 37.5384438;
      const lng = 127.1224221;

      try {
        naverLargeMapInstance = new naver.maps.Map('largeInteractiveMap', {
          center: new naver.maps.LatLng(lat, lng),
          zoom: 17,
          minZoom: 9,
          maxZoom: 19,
          draggable: true,
          pinchZoom: true,
          scrollWheel: true,
          disableDoubleTapZoom: false,
          disableTwoFingerTapZoom: false,
          disableKineticPan: false,
          mapTypeControl: false,
          scaleControl: true,
          scaleControlOptions: {
            position: naver.maps.Position.BOTTOM_LEFT
          },
          logoControl: true,
          logoControlOptions: {
            position: naver.maps.Position.BOTTOM_LEFT
          },
          zoomControl: false
        });

        largeMapMarker = new naver.maps.Marker({
          position: new naver.maps.LatLng(lat, lng),
          map: naverLargeMapInstance,
          title: '라비니움 (천호역 10번 출구)',
          icon: {
            content: `<div style="width:48px;height:54px;display:flex;flex-direction:column;align-items:center;cursor:pointer;filter:drop-shadow(0 3px 10px rgba(0,0,0,0.3));box-sizing:border-box;">
              <div style="width:48px;height:48px;border-radius:50%;background:#ffffff;border:2.5px solid #1a1a1a;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.15);box-sizing:border-box;position:relative;">
                <img src="images/wedding-ring.png" alt="웨딩링" style="width:30px;height:30px;object-fit:contain;display:block;">
              </div>
              <div style="width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-top:8px solid #1a1a1a;margin-top:-1px;"></div>
            </div>`,
            size: new naver.maps.Size(48, 54),
            anchor: new naver.maps.Point(24, 54)
          }
        });

        naver.maps.Event.addListener(largeMapMarker, 'click', () => {
          if (naverLargeMapInstance) {
            naverLargeMapInstance.panTo(new naver.maps.LatLng(lat, lng));
          }
        });
      } catch (err) {
        showLargeMapFallback();
      }
    }

    function showLargeMapFallback() {
      const mapEl = document.getElementById('largeInteractiveMap');
      if (!mapEl) return;
      mapEl.innerHTML = `
        <div style="width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px;text-align:center;background:transparent;">
          <img src="images/story_location.jpg" alt="라비니움" style="width:100%;max-width:320px;border-radius:12px;box-shadow:0 4px 16px rgba(0,0,0,0.08);margin-bottom:14px;object-fit:cover;">
          <div style="font-size:0.95rem;font-weight:700;color:#4A2810;margin-bottom:4px;">천호 라비니움 1층 리츄얼홀</div>
          <div style="font-size:0.8rem;color:#7B6858;margin-bottom:12px;">서울특별시 송파구 천호대로 996 (풍납동 473-1)</div>
          <div style="font-size:0.78rem;color:#6E2B18;font-weight:600;">하단 내비게이션 버튼을 누르시면 길찾기 앱으로 바로 연결됩니다.</div>
        </div>
      `;
    }

    function openLargeMapModal() {
      const overlay = document.getElementById('large-map-modal-overlay');
      if (!overlay) return;

      overlay.classList.add('active');

      pushModalToHistory('large-map-modal', (fromHistory) => {
        overlay.classList.remove('active');
      });

      if (!naverLargeMapInstance) {
        if (window.naver && window.naver.maps) {
          initLargeInteractiveMap();
        } else {
          showLargeMapFallback();
        }
      }

      setTimeout(() => {
        if (naverLargeMapInstance) {
          naver.maps.Event.trigger(naverLargeMapInstance, 'resize');
          naverLargeMapInstance.setCenter(new naver.maps.LatLng(37.5384438, 127.1224221));
          naverLargeMapInstance.setZoom(17);
        }
      }, 150);
    }

    function closeLargeMapModal(fromHistory = false) {
      const overlay = document.getElementById('large-map-modal-overlay');
      if (overlay) {
        overlay.classList.remove('active');
      }
      if (!fromHistory) {
        popModalFromHistory('large-map-modal');
      }
    }

    function handleLargeMapOverlayClick(e) {
      if (e.target.id === 'large-map-modal-overlay') {
        closeLargeMapModal();
      }
    }

    function resetLargeMapCenter() {
      if (naverLargeMapInstance) {
        const latLng = new naver.maps.LatLng(37.5384438, 127.1224221);
        naverLargeMapInstance.morph(latLng, 17);
      }
    }

    function zoomLargeMap(delta) {
      if (naverLargeMapInstance) {
        const currentZoom = naverLargeMapInstance.getZoom();
        naverLargeMapInstance.setZoom(currentZoom + delta, true);
      }
    }

    function toggleCommentDataLike(id, e) {
      if (e) e.stopPropagation();
      const c = commentsData.find(item => item.id === id);
      if (c) {
        c.liked = !c.liked;
        c.likes = (c.likes || 0) + (c.liked ? 1 : -1);
        if (c.likes < 0) c.likes = 0;
      }
      renderComments();
    }

    function validateCommentInputs() {
      const mainAuth = document.getElementById('comment-author-field');
      const mainText = document.getElementById('comment-input-field');
      const mainBtn = document.getElementById('comment-post-btn');

      const sheetAuth = document.getElementById('sheet-comment-author');
      const sheetText = document.getElementById('sheet-comment-input');
      const sheetBtn = document.getElementById('sheet-post-btn');

      const isMainValid = (mainAuth && mainAuth.value.trim().length > 0) && (mainText && mainText.value.trim().length > 0);
      if (mainBtn) {
        if (isMainValid) mainBtn.classList.add('active');
        else mainBtn.classList.remove('active');
      }

      const isSheetValid = (sheetAuth && sheetAuth.value.trim().length > 0) && (sheetText && sheetText.value.trim().length > 0);
      if (sheetBtn) {
        if (isSheetValid) sheetBtn.classList.add('active');
        else sheetBtn.classList.remove('active');
      }
    }

    function syncAuthorInputs(name) {
      const mainAuth = document.getElementById('comment-author-field');
      const sheetAuth = document.getElementById('sheet-comment-author');
      if (mainAuth && mainAuth.value !== name) mainAuth.value = name;
      if (sheetAuth && sheetAuth.value !== name) sheetAuth.value = name;
      validateCommentInputs();
    }

    function quickReact(type, btn) {
      const emoji = emojiMap[type] || '\u2764\uFE0F';
      const input = document.getElementById('comment-input-field');
      if (input) {
        input.value += (input.value ? ' ' : '') + emoji;
        validateCommentInputs();
        input.focus();
      }
      if (btn) {
        btn.style.transform = 'scale(1.35)';
        setTimeout(() => btn.style.transform = '', 200);
      }
    }

    function quickReactSheet(type, btn) {
      const emoji = emojiMap[type] || '\u2764\uFE0F';
      const input = document.getElementById('sheet-comment-input');
      if (input) {
        input.value += (input.value ? ' ' : '') + emoji;
        validateCommentInputs();
        input.focus();
      }
      if (btn) {
        btn.style.transform = 'scale(1.35)';
        setTimeout(() => btn.style.transform = '', 200);
      }
    }

    function addCommentRecord(val, authorName) {
      const name = (authorName && authorName.trim()) ? authorName.trim() : '익명 하객';
      const newComment = {
        id: Date.now(),
        uname: name,
        avatar: 'images/main/1762868176689.jpg',
        text: val,
        time: '방금 전',
        likes: 1,
        liked: true,
        isAuthor: false,
        replies: []
      };
      commentsData.unshift(newComment);
      renderComments();

      // Send to Google Sheet (if configured)
      sendDataToGoogleSheet({
        action: 'comment',
        author: name,
        message: val,
        createdAt: new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })
      });

      showToastMsg('축하 메시지가 등록되었습니다.');
    }

    function postComment() {
      const authInput = document.getElementById('comment-author-field');
      const input = document.getElementById('comment-input-field');
      const author = authInput ? authInput.value.trim() : '';
      const val = input ? input.value.trim() : '';

      if (!author) {
        showToastMsg('성함(이름)을 입력해주세요.');
        if (authInput) authInput.focus();
        return;
      }
      if (!val) {
        showToastMsg('축하 메시지를 입력해주세요.');
        if (input) input.focus();
        return;
      }

      addCommentRecord(val, author);
      if (input) {
        input.value = '';
      }
      validateCommentInputs();
      openCommentsSheet();
    }

    function postCommentFromSheet() {
      const authInput = document.getElementById('sheet-comment-author');
      const input = document.getElementById('sheet-comment-input');
      const author = authInput ? authInput.value.trim() : '';
      const val = input ? input.value.trim() : '';

      if (!author) {
        showToastMsg('성함(이름)을 입력해주세요.');
        if (authInput) authInput.focus();
        return;
      }
      if (!val) {
        showToastMsg('축하 메시지를 입력해주세요.');
        if (input) input.focus();
        return;
      }

      addCommentRecord(val, author);
      if (input) {
        input.value = '';
      }
      validateCommentInputs();
      const body = document.getElementById('sheet-comments-body');
      if (body) body.scrollTo({ top: 0, behavior: 'smooth' });
    }

    /* Web Audio & MP3 BGM Engine */
    let isPlaying = false;
    let userMutedExplicitly = false;
    let audioCtx = null;
    let synthTimer = null;
    const melodyNotes = [
      [293.66, 369.99, 440.00, 587.33],
      [220.00, 277.18, 329.63, 440.00],
      [246.94, 293.66, 369.99, 493.88],
      [185.00, 220.00, 277.18, 369.99],
      [196.00, 246.94, 293.66, 392.00],
      [146.83, 220.00, 293.66, 440.00],
      [196.00, 246.94, 293.66, 392.00],
      [220.00, 277.18, 329.63, 440.00]
    ];
    let chordIndex = 0;

    function playSynthNote(freq, time, duration) {
      if (!audioCtx) return;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, time);
      gain.gain.setValueAtTime(0.0001, time);
      gain.gain.exponentialRampToValueAtTime(0.05, time + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(time);
      osc.stop(time + duration);
    }

    function playSynthMelodyLoop() {
      if (!isPlaying || !audioCtx || audioCtx.state !== 'running') return;
      const now = audioCtx.currentTime;
      const chord = melodyNotes[chordIndex % melodyNotes.length];
      chord.forEach((freq, idx) => {
        playSynthNote(freq, now + (idx * 0.4), 1.5);
      });
      chordIndex++;
      synthTimer = setTimeout(playSynthMelodyLoop, 1600);
    }

    function playBGM() {
      if (userMutedExplicitly) return;
      const audio = document.getElementById('bgm-audio');
      const audioBtn = document.getElementById('audioToggleBtn');
      const audioIcon = document.getElementById('audioIcon');
      if (!audio) return;

      audio.muted = false;
      audio.volume = 0.65;
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.then(() => {
          isPlaying = true;
          updateAudioUI(true);
        }).catch(err => {
          console.log('Autoplay waiting for user gesture:', err);
          isPlaying = false;
          updateAudioUI(false);
        });
      }
    }

    function pauseBGM() {
      const audio = document.getElementById('bgm-audio');
      if (audio) {
        audio.pause();
      }
      if (synthTimer) {
        clearTimeout(synthTimer);
        synthTimer = null;
      }
      if (audioCtx && audioCtx.state === 'running') {
        audioCtx.suspend();
      }
      isPlaying = false;
      updateAudioUI(false);
    }

    function toggleBGM() {
      const audio = document.getElementById('bgm-audio');
      if (audio && !audio.paused && isPlaying) {
        userMutedExplicitly = true;
        pauseBGM();
      } else {
        userMutedExplicitly = false;
        playBGM();
      }
    }

    function updateAudioUI(playing) {
      const mainBtn = document.getElementById('audioToggleBtn');
      const floatBtn = document.getElementById('floatingBgmBtn');
      const mainIcon = document.getElementById('audioIcon');
      const floatIcon = document.getElementById('floatingAudioIcon');

      const playingSVG = '<path d="M11 5L6 9H2v6h4l5 4V5z" fill="#ffffff"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round"/>';
      const mutedSVG = '<path d="M11 5L6 9H2v6h4l5 4V5z" fill="#ffffff"/><line x1="22" y1="9" x2="16" y2="15" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round"/><line x1="16" y1="9" x2="22" y2="15" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round"/>';

      if (playing) {
        if (mainBtn) mainBtn.classList.add('playing');
        if (floatBtn) floatBtn.classList.add('playing');
        if (mainIcon) mainIcon.innerHTML = playingSVG;
        if (floatIcon) floatIcon.innerHTML = playingSVG;
      } else {
        if (mainBtn) mainBtn.classList.remove('playing');
        if (floatBtn) floatBtn.classList.remove('playing');
        if (mainIcon) mainIcon.innerHTML = mutedSVG;
        if (floatIcon) floatIcon.innerHTML = mutedSVG;
      }
    }

    function initFloatingBGMObserver() {
      const heroPhoto = document.querySelector('.wedding-hero-photo');
      const floatingBtn = document.getElementById('floatingBgmBtn');
      if (!heroPhoto || !floatingBtn) return;

      if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            if (!entry.isIntersecting) {
              floatingBtn.classList.add('visible');
            } else {
              floatingBtn.classList.remove('visible');
            }
          });
        }, { threshold: 0.15 });
        observer.observe(heroPhoto);
      } else {
        const onScroll = () => {
          const rect = heroPhoto.getBoundingClientRect();
          if (rect.bottom < 80) {
            floatingBtn.classList.add('visible');
          } else {
            floatingBtn.classList.remove('visible');
          }
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        onScroll();
      }
    }

    let wasPlayingBeforeHide = false;

    function handlePageHidden() {
      const audio = document.getElementById('bgm-audio');
      if ((audio && !audio.paused) || isPlaying) {
        wasPlayingBeforeHide = true;
        pauseBGM();
      }

      // Also pause any active videos (e.g. story viewer, reels, gallery videos)
      // Pause all active videos immediately when page/app goes into background
      document.querySelectorAll('video').forEach(vid => {
        try {
          if (!vid.paused) vid.pause();
        } catch (e) { }
      });
    }

    function handlePageVisible() {
      if (wasPlayingBeforeHide && !userMutedExplicitly) {
        wasPlayingBeforeHide = false;
        playBGM();
      }

      // Resume active feed video if gallery is currently in viewport and no modal is open
      manageFeedVideos();
    }

    function initAutoBGM() {
      // 1. Initial play attempt on load
      playBGM();

      // 2. Comprehensive interaction listeners on all gesture events with capture
      const gestureEvents = ['click', 'touchstart', 'touchend', 'pointerdown', 'mousedown', 'keydown'];

      const onFirstGesture = () => {
        if (userMutedExplicitly) return;
        const audio = document.getElementById('bgm-audio');
        if (audio && audio.paused) {
          audio.muted = false;
          audio.volume = 0.65;
          const p = audio.play();
          if (p !== undefined) {
            p.then(() => {
              isPlaying = true;
              updateAudioUI(true);
              gestureEvents.forEach(evt => {
                document.removeEventListener(evt, onFirstGesture, true);
                window.removeEventListener(evt, onFirstGesture, true);
              });
            }).catch(e => {
              console.log('Gesture play attempt deferred:', e);
            });
          }
        }
      };

      gestureEvents.forEach(evt => {
        document.addEventListener(evt, onFirstGesture, { capture: true, passive: true });
        window.addEventListener(evt, onFirstGesture, { capture: true, passive: true });
      });

      // 3. Multi-layer Lifecycle & Visibility Audio Guard (Background / Tab Switch / Minimize / App Exit / Abnormal Suspend)
      // Standard Page Visibility API
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          handlePageHidden();
        } else {
          handlePageVisible();
        }
      }, { capture: true, passive: true });

      // WebKit prefix for older in-app browsers (KakaoTalk / Naver / Instagram WebView)
      document.addEventListener('webkitvisibilitychange', () => {
        if (document.webkitHidden) {
          handlePageHidden();
        } else {
          handlePageVisible();
        }
      }, { capture: true, passive: true });

      // Mobile Page Lifecycle API (pagehide, freeze, resume, pageshow)
      window.addEventListener('pagehide', handlePageHidden, { capture: true, passive: true });
      document.addEventListener('freeze', handlePageHidden, { capture: true, passive: true });
      document.addEventListener('resume', handlePageVisible, { capture: true, passive: true });
      window.addEventListener('pageshow', () => {
        if (!document.hidden && !document.webkitHidden) {
          handlePageVisible();
        }
      }, { capture: true, passive: true });

      // Window Blur / Focus
      window.addEventListener('blur', () => {
        if (document.hidden || document.webkitHidden) {
          handlePageHidden();
        }
      }, { passive: true });

      // Unload & BeforeUnload (Window close / Tab destroy)
      window.addEventListener('beforeunload', handlePageHidden, { passive: true });
      window.addEventListener('unload', handlePageHidden, { passive: true });
    }

    /* ==================================================== */
    /* SMART FEED & MODAL VIDEO PLAYBACK CONTROLLER        */
    /* ==================================================== */
    let isGalleryInViewport = false;

    function manageFeedVideos() {
      const isPageVisible = !document.hidden && !document.webkitHidden;
      const isStoryOpen = document.getElementById('story-viewer') && document.getElementById('story-viewer').style.display === 'flex';
      const isLightboxOpen = document.getElementById('photo-lightbox') && document.getElementById('photo-lightbox').style.display === 'flex';
      const isAnyModalOpen = (typeof modalHistoryStack !== 'undefined' && modalHistoryStack.length > 0) || isStoryOpen || isLightboxOpen;

      const wrapper = document.getElementById('galleryCarouselWrapper');
      if (!wrapper) return;

      const slides = wrapper.querySelectorAll('.carousel-slide');
      let currentIdx = 0;
      if (carouselInstances['galleryCarouselWrapper'] && typeof carouselInstances['galleryCarouselWrapper'].getCurrentIndex === 'function') {
        currentIdx = carouselInstances['galleryCarouselWrapper'].getCurrentIndex();
      }

      const shouldPlay = isPageVisible && !isAnyModalOpen && isGalleryInViewport;

      slides.forEach((slide, idx) => {
        const video = slide.querySelector('video');
        if (!video) return;

        video.muted = true;
        video.defaultMuted = true;
        video.playsInline = true;

        if (shouldPlay && idx === currentIdx) {
          if (video.paused) {
            const p = video.play();
            if (p !== undefined) {
              p.catch(() => { });
            }
          }
        } else {
          if (!video.paused) {
            video.pause();
          }
        }
      });
    }

    function initGalleryVideoObserver() {
      const target = document.getElementById('post-gallery') || document.getElementById('galleryCarouselWrapper');
      if (!target) return;

      if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            isGalleryInViewport = entry.isIntersecting && entry.intersectionRatio >= 0.15;
            manageFeedVideos();
          });
        }, {
          threshold: [0, 0.15, 0.5, 1.0]
        });
        observer.observe(target);
      } else {
        const checkViewport = () => {
          const rect = target.getBoundingClientRect();
          const inView = rect.top < window.innerHeight * 0.85 && rect.bottom > window.innerHeight * 0.15;
          if (isGalleryInViewport !== inView) {
            isGalleryInViewport = inView;
            manageFeedVideos();
          }
        };
        window.addEventListener('scroll', checkViewport, { passive: true });
        window.addEventListener('resize', checkViewport, { passive: true });
        checkViewport();
      }
    }

    /* ==================================================== */
    /* DYNAMIC GALLERY & STORY AUTO-SCAN ENGINE             */
    /* ==================================================== */
    let galleryMediaList = [
      'images/gallery/01_2026_03_30 13_49.mp4',
      'images/gallery/02_1762868144152.jpg',
      'images/gallery/03_1762868146681.jpg',
      'images/gallery/04_1762868148857.jpg',
      'images/gallery/05_1762868180166.jpg',
      'images/gallery/06_2026_08_19 13_15.mp4',
      'images/gallery/07_1762868142274.jpg',
      'images/gallery/08_2026_03_30 13_49.mp4',
      'images/gallery/09_1762868149684.jpg',
      'images/gallery/10_1762868150411.jpg',
      'images/gallery/11_1762868168703.jpg',
      'images/gallery/12_1762868168978.jpg',
      'images/gallery/13_1762868174450.jpg',
      'images/gallery/14_1762868174682.jpg',
      'images/gallery/15_1762868177891.jpg'
    ];
    let postPhotos = galleryMediaList;
    let gridPhotos = galleryMediaList;
    let stories = galleryMediaList;
    let currentStory = 0;
    let storyTimer = null;

    function isVideoMedia(path) {
      if (!path) return false;
      const lower = path.toLowerCase().split('?')[0];
      return lower.endsWith('.mp4') || lower.endsWith('.webm') || lower.endsWith('.mov') || lower.endsWith('.ogg');
    }

    function renderDynamicGallery(mediaList) {
      if (!mediaList || !mediaList.length) return;
      galleryMediaList = mediaList;
      postPhotos = mediaList;
      gridPhotos = mediaList;
      stories = mediaList;

      // 1. Post 4 Feed Carousel Track & Dots
      const track = document.getElementById('galleryCarouselTrack');
      const dotsContainer = document.getElementById('galleryCarouselDots');
      const locationTag = document.querySelector('#post-gallery .post-location-tag');
      if (locationTag) {
        locationTag.textContent = `웨딩 갤러리 · 사진 및 영상 ${mediaList.length}개`;
      }

      if (track) {
        track.innerHTML = mediaList.map((src, idx) => {
          const isVid = isVideoMedia(src);
          const encodedSrc = encodeURI(src);
          if (isVid) {
            return `
              <div class="carousel-slide" onclick="handleSlideClick(${idx}, this, event)">
                <video src="${encodedSrc}" muted loop playsinline preload="metadata" class="feed-video-element"></video>
                <div class="video-media-badge">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M17 10.5V7a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3.5l4 4v-11l-4 4z"/></svg>
                </div>
                <svg class="double-tap-heart" width="90" height="90" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
              </div>
            `;
          } else {
            return `
              <div class="carousel-slide" onclick="handleSlideClick(${idx}, this, event)">
                <img src="${encodedSrc}" alt="Wedding Media ${idx + 1}" loading="lazy">
                <svg class="double-tap-heart" width="90" height="90" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
              </div>
            `;
          }
        }).join('');
      }

      if (dotsContainer) {
        dotsContainer.innerHTML = mediaList.map((_, idx) =>
          `<div class="dot ${idx === 0 ? 'active' : ''}" onclick="goToGallerySlide(${idx})"></div>`
        ).join('');
      }

      const carouselWrapper = document.getElementById('galleryCarouselWrapper');
      if (carouselWrapper) {
        initCarouselInstance(carouselWrapper);
      }

      // 2. 3x3 Grid Modal
      const grid = document.querySelector('.ig-photo-grid');
      const statNum = document.querySelector('#grid-gallery-modal-overlay .ig-stat-num');
      if (statNum) statNum.textContent = mediaList.length;

      if (grid) {
        grid.innerHTML = mediaList.map((src, idx) => {
          const isVid = isVideoMedia(src);
          const encodedSrc = encodeURI(src);
          if (isVid) {
            return `
              <div class="ig-grid-cell" onclick="selectGridPhoto(${idx})">
                <video src="${encodedSrc}" muted loop playsinline preload="metadata"></video>
                <div class="ig-grid-badge">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="#ffffff"><path d="M17 10.5V7a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3.5l4 4v-11l-4 4z"/></svg>
                </div>
              </div>
            `;
          } else {
            return `
              <div class="ig-grid-cell" onclick="selectGridPhoto(${idx})">
                <img src="${encodedSrc}" alt="Wedding Media ${idx + 1}" loading="lazy">
              </div>
            `;
          }
        }).join('');
      }

      // 3. Story Viewer Progress Container
      const progContainer = document.getElementById('story-progress-container');
      if (progContainer) {
        progContainer.innerHTML = mediaList.map((_, idx) =>
          `<div class="story-progress-bar"><div class="story-progress-fill" id="story-progress-${idx + 1}"></div></div>`
        ).join('');
      }

      manageFeedVideos();
    }

    async function autoScanGalleryFolder() {
      // 1. Try Live GitHub Repository Auto-Scan (works for any filename with zero setup)
      try {
        const repoUrl = `https://api.github.com/repos/freeface06/mobile-wedding/contents/images/gallery?t=${Date.now()}`;
        const res = await fetch(repoUrl, { headers: { 'Accept': 'application/vnd.github.v3+json' } });
        if (res.ok) {
          const files = await res.json();
          if (isSafeArray(files) && files.length > 0) {
            const validMediaFiles = files
              .filter(f => f.type === 'file')
              .map(f => `images/gallery/${f.name}`)
              .filter(path => {
                const lower = path.toLowerCase();
                return lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.png') ||
                  lower.endsWith('.webp') || lower.endsWith('.gif') || lower.endsWith('.mp4') ||
                  lower.endsWith('.webm') || lower.endsWith('.mov');
              })
              .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

            if (validMediaFiles.length > 0) {
              renderDynamicGallery(validMediaFiles);
              return;
            }
          }
        }
      } catch (e) {
        // Fallback to local auto-probe
      }

      // 2. Local Fallback Rendering
      renderDynamicGallery(galleryMediaList);
    }

    function openStoryViewer() {
      const sv = document.getElementById('story-viewer');
      if (!sv) return;
      sv.style.display = 'flex';
      currentStory = 0;
      updateStory();
      if (typeof manageFeedVideos === 'function') manageFeedVideos();
      pushModalToHistory('story-viewer', (fromHistory) => {
        sv.style.display = 'none';
        clearTimeout(storyTimer);
        if (typeof manageFeedVideos === 'function') manageFeedVideos();
      });
    }

    function closeStoryViewer(fromHistory = false) {
      const sv = document.getElementById('story-viewer');
      const videoEl = document.getElementById('story-video');
      if (videoEl) {
        videoEl.pause();
        videoEl.currentTime = 0;
        videoEl.style.display = 'none';
      }
      if (sv) {
        sv.style.display = 'none';
      }
      clearTimeout(storyTimer);
      if (typeof manageFeedVideos === 'function') manageFeedVideos();
      if (!fromHistory) {
        popModalFromHistory('story-viewer');
      }
    }

    function nextStory() {
      currentStory++;
      if (currentStory >= stories.length) closeStoryViewer();
      else updateStory();
    }

    function prevStory() {
      currentStory--;
      if (currentStory < 0) currentStory = 0;
      updateStory();
    }

    function updateStory() {
      const currentSrc = stories[currentStory] || '';
      const isVid = isVideoMedia(currentSrc);
      const encodedSrc = encodeURI(currentSrc);
      const imgEl = document.getElementById('story-img');
      const videoEl = document.getElementById('story-video');

      if (videoEl) {
        videoEl.pause();
        videoEl.currentTime = 0;
      }

      if (isVid) {
        if (imgEl) imgEl.style.display = 'none';
        if (videoEl) {
          videoEl.style.display = 'block';
          videoEl.muted = true;
          videoEl.defaultMuted = true;
          videoEl.playsInline = true;
          videoEl.src = encodedSrc;
          videoEl.play().catch(() => { });
        }
      } else {
        if (videoEl) videoEl.style.display = 'none';
        if (imgEl) {
          imgEl.style.display = 'block';
          imgEl.src = encodedSrc;
        }
      }

      for (let i = 1; i <= stories.length; i++) {
        const fill = document.getElementById(`story-progress-${i}`);
        if (fill) {
          if (i < currentStory + 1) fill.style.width = '100%';
          else fill.style.width = '0%';
          fill.style.transition = 'none';
        }
      }
      clearTimeout(storyTimer);
      const currentFill = document.getElementById(`story-progress-${currentStory + 1}`);
      if (currentFill) {
        setTimeout(() => {
          currentFill.style.transition = 'width 3.5s linear';
          currentFill.style.width = '100%';
        }, 50);
      }
      storyTimer = setTimeout(nextStory, 3500);
    }
    let didSwipeSlide = false;
    const carouselInstances = {};

    function initCarouselInstance(wrapper) {
      if (!wrapper) return;
      const id = wrapper.id || ('carousel_' + Math.random().toString(36).substr(2, 9));
      const track = wrapper.querySelector('.post-carousel-track');
      if (!track) return;

      // Clean up previous instance if already initialized to prevent duplicate listeners
      if (carouselInstances[id] && typeof carouselInstances[id].destroy === 'function') {
        carouselInstances[id].destroy();
      }

      const parentArticle = wrapper.closest('article') || wrapper.parentElement;

      let currentIndex = 0;
      let startX = 0;
      let startY = 0;
      let deltaX = 0;
      let deltaY = 0;
      let isTouching = false;
      let isHorizontalSwipe = false;
      let isVerticalScroll = false;
      let startTime = 0;
      let isMouseDown = false;
      let wheelLocked = false;

      function updateUI(animate = true) {
        const slides = track.querySelectorAll('.carousel-slide');
        const maxSlides = slides.length || 1;
        if (currentIndex >= maxSlides) currentIndex = maxSlides - 1;
        if (currentIndex < 0) currentIndex = 0;

        track.style.transition = animate ? 'transform 0.32s cubic-bezier(0.22, 1, 0.36, 1)' : 'none';
        track.style.transform = `translateX(-${currentIndex * 100}%)`;

        const dots = parentArticle.querySelectorAll('.carousel-dots .dot');
        dots.forEach((dot, idx) => {
          dot.classList.toggle('active', idx === currentIndex);
        });

        if (typeof manageFeedVideos === 'function') {
          manageFeedVideos();
        }
      }

      function goTo(index) {
        const slides = track.querySelectorAll('.carousel-slide');
        const maxSlides = slides.length || 1;
        if (index >= 0 && index < maxSlides) {
          currentIndex = index;
          updateUI(true);
        }
      }

      function onTouchStart(e) {
        const touch = e.touches ? e.touches[0] : e;
        startX = touch.clientX;
        startY = touch.clientY;
        deltaX = 0;
        deltaY = 0;
        startTime = Date.now();
        isTouching = true;
        isHorizontalSwipe = false;
        isVerticalScroll = false;
        didSwipeSlide = false;
        track.style.transition = 'none';
      }

      function onTouchMove(e) {
        if (!isTouching) return;
        const touch = e.touches ? e.touches[0] : e;
        deltaX = touch.clientX - startX;
        deltaY = touch.clientY - startY;

        if (!isHorizontalSwipe && !isVerticalScroll) {
          if (Math.abs(deltaY) > 8 && Math.abs(deltaY) > Math.abs(deltaX)) {
            isVerticalScroll = true;
            return;
          } else if (Math.abs(deltaX) > 8 && Math.abs(deltaX) >= Math.abs(deltaY)) {
            isHorizontalSwipe = true;
          }
        }

        if (isHorizontalSwipe) {
          if (e.cancelable) e.preventDefault();
          didSwipeSlide = true;
          const width = wrapper.offsetWidth || 375;
          const slides = track.querySelectorAll('.carousel-slide');
          const totalSlides = slides.length || 1;
          let effectiveDelta = deltaX;

          if (currentIndex === 0 && deltaX > 0) {
            effectiveDelta = deltaX * 0.22;
          } else if (currentIndex === totalSlides - 1 && deltaX < 0) {
            effectiveDelta = deltaX * 0.22;
          } else {
            if (deltaX < -width) {
              effectiveDelta = -width + (deltaX + width) * 0.12;
            } else if (deltaX > width) {
              effectiveDelta = width + (deltaX - width) * 0.12;
            }
          }
          const offsetPercent = -currentIndex * 100;
          track.style.transform = `translateX(calc(${offsetPercent}% + ${effectiveDelta}px))`;

          // Synchronize active dot in real-time as slide moves past 50% midpoint
          let previewIndex = Math.round(currentIndex - (effectiveDelta / width));
          if (previewIndex < 0) previewIndex = 0;
          if (previewIndex >= totalSlides) previewIndex = totalSlides - 1;

          const dots = parentArticle.querySelectorAll('.carousel-dots .dot');
          dots.forEach((dot, idx) => {
            dot.classList.toggle('active', idx === previewIndex);
          });
        }
      }

      function onTouchEnd() {
        if (!isTouching) return;
        isTouching = false;

        if (isHorizontalSwipe) {
          const timeTaken = Date.now() - startTime;
          const width = wrapper.offsetWidth || 375;
          const velocity = Math.abs(deltaX) / (timeTaken || 1);
          const slides = track.querySelectorAll('.carousel-slide');
          const totalSlides = slides.length || 1;

          if (deltaX < 0 && (Math.abs(deltaX) > width * 0.15 || (velocity > 0.22 && Math.abs(deltaX) > 15))) {
            currentIndex = Math.min(currentIndex + 1, totalSlides - 1);
          } else if (deltaX > 0 && (Math.abs(deltaX) > width * 0.15 || (velocity > 0.22 && Math.abs(deltaX) > 15))) {
            currentIndex = Math.max(currentIndex - 1, 0);
          }
          updateUI(true);
          setTimeout(() => { didSwipeSlide = false; }, 80);
        } else {
          updateUI(true);
        }
      }

      function onWheel(e) {
        if (Math.abs(e.deltaX) > Math.abs(e.deltaY) && Math.abs(e.deltaX) > 15) {
          if (e.cancelable) e.preventDefault();
          if (wheelLocked) return;
          wheelLocked = true;
          const slides = track.querySelectorAll('.carousel-slide');
          const totalSlides = slides.length || 1;
          if (e.deltaX > 15) {
            goTo(Math.min(currentIndex + 1, totalSlides - 1));
          } else if (e.deltaX < -15) {
            goTo(Math.max(currentIndex - 1, 0));
          }
          setTimeout(() => { wheelLocked = false; }, 360);
        }
      }

      function onMouseDown(e) {
        if (e.target.closest('.media-audio-btn')) return;
        isMouseDown = true;
        onTouchStart(e);
      }

      function onMouseMove(e) {
        if (!isMouseDown) return;
        onTouchMove(e);
      }

      function onMouseUp() {
        if (!isMouseDown) return;
        isMouseDown = false;
        onTouchEnd();
      }

      wrapper.addEventListener('touchstart', onTouchStart, { passive: false });
      wrapper.addEventListener('touchmove', onTouchMove, { passive: false });
      wrapper.addEventListener('touchend', onTouchEnd, { passive: true });
      wrapper.addEventListener('touchcancel', onTouchEnd, { passive: true });
      wrapper.addEventListener('wheel', onWheel, { passive: false });
      wrapper.addEventListener('mousedown', onMouseDown);
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);

      function destroy() {
        wrapper.removeEventListener('touchstart', onTouchStart);
        wrapper.removeEventListener('touchmove', onTouchMove);
        wrapper.removeEventListener('touchend', onTouchEnd);
        wrapper.removeEventListener('touchcancel', onTouchEnd);
        wrapper.removeEventListener('wheel', onWheel);
        wrapper.removeEventListener('mousedown', onMouseDown);
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
      }

      carouselInstances[id] = { goTo, updateUI, destroy, getCurrentIndex: () => currentIndex };
      updateUI(false);
    }

    function goToSlide(index) {
      if (carouselInstances['carouselWrapper']) {
        carouselInstances['carouselWrapper'].goTo(index);
      }
    }

    function goToGallerySlide(index) {
      if (carouselInstances['galleryCarouselWrapper']) {
        carouselInstances['galleryCarouselWrapper'].goTo(index);
      }
    }

    document.addEventListener('DOMContentLoaded', () => {
      document.querySelectorAll('.post-carousel-wrapper').forEach(wrapper => {
        initCarouselInstance(wrapper);
      });
      autoScanGalleryFolder();
      initFloatingBGMObserver();
      initGalleryVideoObserver();
    });

    /* Handle Click vs Double Tap on Photos */
    let clickTimeout = null;
    let lastClickTime = 0;
    function handleSlideClick(index, slideEl, event) {
      if (didSwipeSlide) {
        didSwipeSlide = false;
        return;
      }
      const now = Date.now();
      if (now - lastClickTime < 360) {
        clearTimeout(clickTimeout);
        clickTimeout = null;
        triggerHeart(slideEl, event);
        lastClickTime = now;
      } else {
        lastClickTime = now;
        clickTimeout = setTimeout(() => {
          openPhotoLightbox(index);
          clickTimeout = null;
        }, 320);
      }
    }

    /* ==================================================== */
    /* FULLSCREEN LIGHTBOX ENGINE (SWIPE + PINCH/TAP ZOOM)   */
    /* ==================================================== */
    let currentLightboxIdx = 0;
    let lbScale = 1;
    let lbTranslateX = 0;
    let lbTranslateY = 0;
    let lbStartScale = 1;
    let lbStartX = 0;
    let lbStartY = 0;
    let lbStartTransX = 0;
    let lbStartTransY = 0;
    let lbStartDist = 0;
    let lbIsTouching = false;
    let lbIsDragging = false;
    let lbIsPinching = false;
    let lbSwipeDeltaX = 0;
    let lbSwipeStartTime = 0;
    let lbLastTapTime = 0;

    function openPhotoLightbox(index) {
      currentLightboxIdx = index;
      resetLightboxTransform(false);
      updateLightbox();
      const lb = document.getElementById('photo-lightbox');
      if (!lb) return;
      lb.style.display = 'flex';
      if (typeof manageFeedVideos === 'function') manageFeedVideos();
      pushModalToHistory('photo-lightbox', (fromHistory) => {
        lb.style.display = 'none';
        resetLightboxTransform(false);
        if (typeof manageFeedVideos === 'function') manageFeedVideos();
      });
    }

    function openSinglePhotoLightbox(src, caption = '약도') {
      const lb = document.getElementById('photo-lightbox');
      const img = document.getElementById('lightboxImg');
      const video = document.getElementById('lightboxVideo');
      const counter = document.getElementById('lightboxCounter');
      const dotsContainer = document.getElementById('lightboxDots');
      if (!lb || !img) return;

      if (video) {
        video.pause();
        video.currentTime = 0;
        video.style.display = 'none';
      }
      img.style.display = 'block';
      img.src = src;
      resetLightboxTransform(false);
      img.style.opacity = '1';
      if (counter) counter.textContent = caption;
      if (dotsContainer) dotsContainer.innerHTML = '';

      lb.style.display = 'flex';
      if (typeof manageFeedVideos === 'function') manageFeedVideos();
      pushModalToHistory('photo-lightbox', (fromHistory) => {
        lb.style.display = 'none';
        resetLightboxTransform(false);
        if (typeof manageFeedVideos === 'function') manageFeedVideos();
      });
    }

    function closePhotoLightbox(fromHistory = false) {
      const lb = document.getElementById('photo-lightbox');
      const video = document.getElementById('lightboxVideo');
      if (video) {
        video.pause();
        video.currentTime = 0;
        video.style.display = 'none';
      }
      if (lb) {
        lb.style.display = 'none';
        resetLightboxTransform(false);
      }
      if (typeof manageFeedVideos === 'function') manageFeedVideos();
      if (!fromHistory) {
        popModalFromHistory('photo-lightbox');
      }
    }

    function getActiveLightboxMedia() {
      const video = document.getElementById('lightboxVideo');
      const img = document.getElementById('lightboxImg');
      if (video && video.style.display !== 'none') return video;
      return img;
    }

    function resetLightboxTransform(animate = true) {
      lbScale = 1;
      lbTranslateX = 0;
      lbTranslateY = 0;
      applyLightboxTransform(animate);
    }

    function applyLightboxTransform(animate = true) {
      const media = getActiveLightboxMedia();
      if (!media) return;

      media.style.transition = animate ? 'transform 0.28s cubic-bezier(0.22, 1, 0.36, 1)' : 'none';
      media.style.transform = `translate3d(${lbTranslateX}px, ${lbTranslateY}px, 0) scale(${lbScale})`;
    }

    function updateLightbox(slideDirection = 0) {
      const img = document.getElementById('lightboxImg');
      const video = document.getElementById('lightboxVideo');
      const counter = document.getElementById('lightboxCounter');
      const dotsContainer = document.getElementById('lightboxDots');
      const currentSrc = gridPhotos[currentLightboxIdx] || '';
      const isVideo = isVideoMedia(currentSrc);
      const encodedSrc = encodeURI(currentSrc);

      if (video) {
        video.pause();
        video.currentTime = 0;
      }

      function applyMedia() {
        if (isVideo) {
          if (img) img.style.display = 'none';
          if (video) {
            video.style.display = 'block';
            video.muted = true;
            video.defaultMuted = true;
            video.playsInline = true;
            video.src = encodedSrc;
            video.play().catch(() => { });
          }
        } else {
          if (video) {
            video.style.display = 'none';
          }
          if (img) {
            img.style.display = 'block';
            img.src = encodedSrc;
            img.style.opacity = '1';
          }
        }
        resetLightboxTransform(false);
      }

      const activeMedia = getActiveLightboxMedia();
      if (slideDirection !== 0 && activeMedia) {
        activeMedia.style.transition = 'transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.2s ease';
        activeMedia.style.transform = `translate3d(${slideDirection * -50}px, 0, 0) scale(0.94)`;
        activeMedia.style.opacity = '0';
        setTimeout(() => {
          applyMedia();
          const newMedia = getActiveLightboxMedia();
          if (newMedia) {
            newMedia.style.transform = `translate3d(${slideDirection * 50}px, 0, 0) scale(0.94)`;
            newMedia.style.opacity = '0';
            newMedia.offsetHeight;
            newMedia.style.transition = 'transform 0.26s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.26s ease';
            newMedia.style.transform = `translate3d(0, 0, 0) scale(1)`;
            newMedia.style.opacity = '1';
          }
        }, 160);
      } else {
        applyMedia();
      }

      if (counter) counter.textContent = `${currentLightboxIdx + 1} / ${gridPhotos.length}`;

      if (dotsContainer) {
        dotsContainer.innerHTML = gridPhotos.map((_, i) =>
          `<div class="dot ${i === currentLightboxIdx ? 'active' : ''}" onclick="goToLightboxPhoto(${i})"></div>`
        ).join('');
      }
    }

    function nextLightboxPhoto() {
      if (currentLightboxIdx < gridPhotos.length - 1) {
        currentLightboxIdx++;
        updateLightbox(1);
      }
    }

    function prevLightboxPhoto() {
      if (currentLightboxIdx > 0) {
        currentLightboxIdx--;
        updateLightbox(-1);
      }
    }

    function goToLightboxPhoto(index) {
      if (index !== currentLightboxIdx && index >= 0 && index < gridPhotos.length) {
        const dir = index > currentLightboxIdx ? 1 : -1;
        currentLightboxIdx = index;
        updateLightbox(dir);
      }
    }

    function zoomLightbox(delta, clientX, clientY) {
      const wrapper = document.getElementById('lightboxImgWrapper');
      const newScale = Math.max(1, Math.min(4.5, lbScale + delta));
      if (newScale === 1) {
        resetLightboxTransform(true);
      } else {
        if (wrapper && typeof clientX === 'number' && typeof clientY === 'number') {
          const rect = wrapper.getBoundingClientRect();
          const focalX = clientX - rect.left - rect.width / 2;
          const focalY = clientY - rect.top - rect.height / 2;
          const ratio = newScale / lbScale;
          lbTranslateX = (lbTranslateX - focalX) * ratio + focalX;
          lbTranslateY = (lbTranslateY - focalY) * ratio + focalY;
        }
        lbScale = newScale;
        clampLightboxTranslate();
        applyLightboxTransform(true);
      }
    }

    function resetLightboxZoom(clientX, clientY) {
      if (lbScale !== 1) {
        resetLightboxTransform(true);
      } else {
        zoomLightbox(1.5, clientX, clientY);
      }
    }

    function clampLightboxTranslate() {
      const wrapper = document.getElementById('lightboxImgWrapper');
      if (!wrapper) return;

      const maxTransX = Math.max(0, (wrapper.offsetWidth * (lbScale - 1)) / 2);
      const maxTransY = Math.max(0, (wrapper.offsetHeight * (lbScale - 1)) / 2);

      lbTranslateX = Math.max(-maxTransX, Math.min(maxTransX, lbTranslateX));
      lbTranslateY = Math.max(-maxTransY, Math.min(maxTransY, lbTranslateY));
    }

    // Touch & Pointer Gesture Controller for Lightbox (Focal Zoom & Video Swipe)
    (function initLightboxGestures() {
      document.addEventListener('DOMContentLoaded', () => {
        const body = document.getElementById('lightboxBody');
        const wrapper = document.getElementById('lightboxImgWrapper');
        if (!body || !wrapper) return;

        function getDistance(t1, t2) {
          return Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        }

        let lbFocalX = 0;
        let lbFocalY = 0;

        function onTouchStart(e) {
          const media = getActiveLightboxMedia();
          if (!media) return;

          if (e.touches.length === 2) {
            lbIsPinching = true;
            lbIsDragging = false;
            lbStartDist = getDistance(e.touches[0], e.touches[1]);
            lbStartScale = lbScale;
            lbStartTransX = lbTranslateX;
            lbStartTransY = lbTranslateY;

            const rect = wrapper.getBoundingClientRect();
            lbFocalX = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left - rect.width / 2;
            lbFocalY = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top - rect.height / 2;

            media.style.transition = 'none';
          } else if (e.touches.length === 1) {
            lbIsTouching = true;
            lbIsPinching = false;
            lbIsDragging = true;
            lbStartX = e.touches[0].clientX;
            lbStartY = e.touches[0].clientY;
            lbStartTransX = lbTranslateX;
            lbStartTransY = lbTranslateY;
            lbSwipeDeltaX = 0;
            lbSwipeStartTime = Date.now();
            media.style.transition = 'none';
          }
        }

        function onTouchMove(e) {
          const media = getActiveLightboxMedia();
          if (!media) return;

          if (lbIsPinching && e.touches.length === 2) {
            if (e.cancelable) e.preventDefault();
            const currentDist = getDistance(e.touches[0], e.touches[1]);
            if (lbStartDist > 0) {
              const factor = currentDist / lbStartDist;
              const newScale = Math.max(1, Math.min(4.5, lbStartScale * factor));
              const scaleRatio = newScale / lbStartScale;

              // Focal point preserving translation formula
              lbTranslateX = lbStartTransX * scaleRatio + lbFocalX * (1 - scaleRatio);
              lbTranslateY = lbStartTransY * scaleRatio + lbFocalY * (1 - scaleRatio);
              lbScale = newScale;

              clampLightboxTranslate();
              applyLightboxTransform(false);
            }
          } else if (lbIsTouching && e.touches.length === 1) {
            const curX = e.touches[0].clientX;
            const curY = e.touches[0].clientY;
            const deltaX = curX - lbStartX;
            const deltaY = curY - lbStartY;
            lbSwipeDeltaX = deltaX;

            if (lbScale > 1.05) {
              if (e.cancelable) e.preventDefault();
              lbTranslateX = lbStartTransX + deltaX;
              lbTranslateY = lbStartTransY + deltaY;
              clampLightboxTranslate();
              applyLightboxTransform(false);
            } else {
              if (Math.abs(deltaX) > Math.abs(deltaY) || Math.abs(deltaX) > 10) {
                if (e.cancelable) e.preventDefault();
                let effectiveDelta = deltaX;
                if ((currentLightboxIdx === 0 && deltaX > 0) || (currentLightboxIdx === gridPhotos.length - 1 && deltaX < 0)) {
                  effectiveDelta = deltaX * 0.25;
                }
                media.style.transform = `translate3d(${effectiveDelta}px, 0, 0) scale(1)`;
              }
            }
          }
        }

        function onTouchEnd(e) {
          if (lbIsPinching && e.touches.length < 2) {
            lbIsPinching = false;
            if (lbScale < 1.05) {
              resetLightboxTransform(true);
            } else {
              clampLightboxTranslate();
              applyLightboxTransform(true);
            }
          } else if (lbIsTouching) {
            lbIsTouching = false;
            lbIsDragging = false;

            if (lbScale <= 1.05) {
              const elapsed = Date.now() - lbSwipeStartTime;
              const velocity = Math.abs(lbSwipeDeltaX) / (elapsed || 1);
              const width = body.offsetWidth || 375;

              if (lbSwipeDeltaX < 0 && (Math.abs(lbSwipeDeltaX) > width * 0.15 || (velocity > 0.3 && Math.abs(lbSwipeDeltaX) > 20))) {
                nextLightboxPhoto();
              } else if (lbSwipeDeltaX > 0 && (Math.abs(lbSwipeDeltaX) > width * 0.15 || (velocity > 0.3 && Math.abs(lbSwipeDeltaX) > 20))) {
                prevLightboxPhoto();
              } else {
                resetLightboxTransform(true);
              }
            } else {
              clampLightboxTranslate();
              applyLightboxTransform(true);
            }
          }
        }

        body.addEventListener('touchstart', onTouchStart, { passive: false });
        body.addEventListener('touchmove', onTouchMove, { passive: false });
        body.addEventListener('touchend', onTouchEnd, { passive: true });
        body.addEventListener('touchcancel', onTouchEnd, { passive: true });

        // Double Tap to Focal Zoom
        body.addEventListener('click', (e) => {
          if (e.target.closest('.sheet-back-btn') || e.target.closest('.lightbox-header')) return;
          const now = Date.now();
          if (now - lbLastTapTime < 320) {
            const media = getActiveLightboxMedia();
            if (lbScale > 1.05) {
              resetLightboxTransform(true);
            } else {
              // Zoom in focused on tap coordinates
              const rect = wrapper.getBoundingClientRect();
              const tapX = e.clientX - rect.left - rect.width / 2;
              const tapY = e.clientY - rect.top - rect.height / 2;
              lbScale = 2.5;
              lbTranslateX = -tapX * (lbScale - 1);
              lbTranslateY = -tapY * (lbScale - 1);
              clampLightboxTranslate();
              applyLightboxTransform(true);
            }
            lbLastTapTime = 0;
          } else {
            lbLastTapTime = now;
          }
        });

        // Mouse Drag / Swipe for Desktop
        let isMouseDown = false;
        body.addEventListener('mousedown', (e) => {
          if (e.target.closest('.lightbox-header')) return;
          const media = getActiveLightboxMedia();
          if (!media) return;

          isMouseDown = true;
          lbIsTouching = true;
          lbStartX = e.clientX;
          lbStartY = e.clientY;
          lbStartTransX = lbTranslateX;
          lbStartTransY = lbTranslateY;
          lbSwipeDeltaX = 0;
          lbSwipeStartTime = Date.now();
          media.style.transition = 'none';
        });

        window.addEventListener('mousemove', (e) => {
          if (!isMouseDown) return;
          const media = getActiveLightboxMedia();
          if (!media) return;

          const deltaX = e.clientX - lbStartX;
          const deltaY = e.clientY - lbStartY;
          lbSwipeDeltaX = deltaX;

          if (lbScale > 1.05) {
            lbTranslateX = lbStartTransX + deltaX;
            lbTranslateY = lbStartTransY + deltaY;
            clampLightboxTranslate();
            applyLightboxTransform(false);
          } else {
            let effectiveDelta = deltaX;
            if ((currentLightboxIdx === 0 && deltaX > 0) || (currentLightboxIdx === gridPhotos.length - 1 && deltaX < 0)) {
              effectiveDelta = deltaX * 0.25;
            }
            media.style.transform = `translate3d(${effectiveDelta}px, 0, 0) scale(1)`;
          }
        });

        window.addEventListener('mouseup', () => {
          if (!isMouseDown) return;
          isMouseDown = false;
          lbIsTouching = false;
          if (lbScale <= 1.05) {
            const width = body.offsetWidth || 375;
            if (lbSwipeDeltaX < -width * 0.15 || lbSwipeDeltaX < -40) {
              nextLightboxPhoto();
            } else if (lbSwipeDeltaX > width * 0.15 || lbSwipeDeltaX > 40) {
              prevLightboxPhoto();
            } else {
              resetLightboxTransform(true);
            }
          } else {
            clampLightboxTranslate();
            applyLightboxTransform(true);
          }
        });

        let lbWheelLock = false;
        body.addEventListener('wheel', (e) => {
          e.preventDefault();
          if (e.ctrlKey || Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
            const delta = e.deltaY < 0 ? 0.3 : -0.3;
            zoomLightbox(delta, e.clientX, e.clientY);
          } else if (Math.abs(e.deltaX) > 15 && lbScale <= 1.05) {
            if (lbWheelLock) return;
            lbWheelLock = true;
            if (e.deltaX > 15) nextLightboxPhoto();
            else if (e.deltaX < -15) prevLightboxPhoto();
            setTimeout(() => { lbWheelLock = false; }, 400);
          }
        }, { passive: false });
      });
    })();

    /* ==================================================== */
    /* SMART SCROLL TOP NAV AUTO HIDE & SHOW               */
    /* ==================================================== */
    (function initSmartTopNavScroll() {
      let lastScrollY = window.pageYOffset || document.documentElement.scrollTop || 0;
      let isNavHidden = false;
      let ticking = false;
      const topNavElement = document.querySelector('.top-nav');

      function updateNavState() {
        if (!topNavElement) {
          ticking = false;
          return;
        }

        const currentScrollY = Math.max(0, window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0);

        // Always show near top (within 40px)
        if (currentScrollY <= 40) {
          if (isNavHidden) {
            topNavElement.classList.remove('nav-hidden');
            isNavHidden = false;
          }
          lastScrollY = currentScrollY;
          ticking = false;
          return;
        }

        const diff = currentScrollY - lastScrollY;

        // Scrolling Down by at least 6px -> Hide Nav
        if (diff > 6 && !isNavHidden) {
          topNavElement.classList.add('nav-hidden');
          isNavHidden = true;
        }
        // Scrolling Up by at least 6px -> Show Nav
        else if (diff < -6 && isNavHidden) {
          topNavElement.classList.remove('nav-hidden');
          isNavHidden = false;
        }

        lastScrollY = currentScrollY;
        ticking = false;
      }

      window.addEventListener('scroll', () => {
        if (!ticking) {
          window.requestAnimationFrame(updateNavState);
          ticking = true;
        }
      }, { passive: true });

      window.addEventListener('touchmove', () => {
        if (!ticking) {
          window.requestAnimationFrame(updateNavState);
          ticking = true;
        }
      }, { passive: true });
    })();