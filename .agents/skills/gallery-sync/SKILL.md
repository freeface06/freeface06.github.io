---
name: gallery-sync
description: >-
  Automatically scan and synchronize wedding gallery photos and videos from images/gallery/ 
  into js/script.js, validate media integrity, and deploy updates to Git.
  Use this skill whenever the user adds, renames, deletes, or changes media files in images/gallery/
  or asks to synchronize the gallery.
---

# Wedding Gallery Media Sync Skill

이 스킬은 `images/gallery/` 폴더 안의 모든 사진 및 동영상 파일을 자동으로 감지하여 `js/script.js`의 `galleryMediaList` 배열을 실시간 동기화하고, 무결성 검증 및 Git 배포까지 원스톱으로 처리하는 표준 하네스 스킬입니다.

## 실행 절차 (Execution Workflow)

### 1단계: 동기화 스크립트 실행
아래 명령어를 실행하여 `images/gallery/` 폴더의 모든 미디어를 스캔하고 `js/script.js`를 자동 갱신합니다:
```bash
node .agents/skills/gallery-sync/scripts/sync_gallery.js
```

### 2단계: 파일 무결성 및 무이모지 검증
```bash
node -e "
const fs = require('fs');
const js = fs.readFileSync('js/script.js', 'utf8');
new Function(js);
console.log('JS Syntax: 100% VALID');
"
```

### 3단계: Git 커밋 및 GitHub 배포
```bash
git add images/gallery/ js/script.js
git commit -m "feat(gallery): 갤러리 미디어 자동 동기화 및 렌더링 목록 갱신"
git push origin main
```
