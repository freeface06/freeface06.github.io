# Mobile Wedding Invitation Agent System (AGENTS.md)

이 문서는 모바일 청첩장 프로젝트의 표준 에이전트 개발 및 검증 하네스 체계 가이드라인입니다. 마크업(`index.html`), 스타일(`css/style.css`), 스크립트(`js/script.js`)의 모듈형 분리 구조로 관리됩니다.

---

## 1. 시스템 개요 및 디렉토리 아키텍처

```
mobile-wedding/
├── css/
│   └── style.css            # 모든 디자인 스타일, 타이포그래피, 애니메이션, 반응형 미디어쿼리
├── js/
│   └── script.js            # 갤러리 자동스캔, 스토리 뷰어, BGM, 네이버지도, RSVP/방명록 로직
├── images/                  # 메인/프로필/스토리/갤러리/아이콘 이미지 리소스
├── music/                   # 배경음악 음원 리소스
├── index.html               # 시맨틱 HTML 엔트리포인트
├── AGENTS.md                # 에이전트 하네스 가이드라인
└── google-apps-script.js    # Google 스프레드시트 방명록 백엔드
```

---

## 2. 핵심 규격 및 개발 표준

1. **모듈형 분리 원칙 (HTML / CSS / JS)**:
   - 마크업은 `index.html`, 스타일은 `css/style.css`, 동작 로직은 `js/script.js`에 명확히 분리하여 유지보수성을 극대화합니다.
2. **에셋 및 리소스 경로**:
   - 이미지: `images/` (배경, 프로필, 갤러리, 아이콘 등)
   - 음원: `music/` (`music/the_mountain-wedding.mp3` 등)
3. **무이모지 정책 (Zero Unicode Emoji)**:
   - 렌더링 파편화를 유발하는 유니코드 이모지 대신 인라인 SVG 또는 WebP/SVG 브랜드 아이콘을 100% 사용합니다.
4. **미설치 대비 방어 코드 (Fail-safe Deep Linking)**:
   - 네비게이션(네이버 지도/티맵/카카오내비) 및 간편송금(카카오페이/토스/카카오뱅크)은 모바일 환경별 Intent 및 Visibility Guard를 적용하여 앱 미설치 시에도 안전하게 웹/스토어로 전환되도록 유지합니다.

---

## 3. 에이전트 하네스 스킬 (Custom Skills)

- **`gallery-sync`** (`.agents/skills/gallery-sync/SKILL.md`):
  - `images/gallery/` 폴더 안의 미디어를 스캔하여 `js/script.js`를 100% 자동 동기화하고 Git 배포를 수행하는 전용 하네스 스킬.
  - 실행: `node .agents/skills/gallery-sync/scripts/sync_gallery.js`

---

## 4. 구성 변경 이력 (Change History)

| 변경 일자 | 구성 유형 | 주요 변경 사항 |
| :--- | :--- | :--- |
| **2026-08-31** | **단일 통합 (Unified)** | • 분리 폴더 정리 및 기능 통합 |
| **2026-09-01** | **모듈형 분리 (Modular)** | • 사용자 요청에 따라 `index.html`에서 `css/style.css` 및 `js/script.js`로 분리 완료<br>• 갤러리 폴더 자동 스캔(Auto-Scan), BGM 플로팅 반응형 버튼, 무이모지 100% 벡터 파티클 적용<br>• `gallery-sync` 하네스 전용 스킬 구축 완료 |
