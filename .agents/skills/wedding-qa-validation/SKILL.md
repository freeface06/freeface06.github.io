---
name: wedding-qa-validation
description: Validates and audits mobile wedding invitation codebases for zero-emoji compliance, responsive viewport layouts, interactive JavaScript integrity, audio BGM handling, and clipboard actions.
allowed-tools:
  - view_file
  - run_command
  - write_to_file
  - grep_search
---

# wedding-qa-validation

이 스킬은 생성된 두 모바일 청첩장(`standard-invitation/index.html`, `friends-invitation/index.html`)의 코드 품질, 반응형 모바일 UX, 무이모지 정책 준수, 자바스크립트 런타임 무결성을 감사할 때 호출합니다.

## When to use this skill
- `standard-invitation/index.html` 또는 `friends-invitation/index.html` 구현 완료 후 최종 검증을 수행할 때
- 유니코드 이모지 포함 여부(Zero Emoji Audit)를 정밀 스캔할 때
- 오디오 재생, 클립보드 복사, 갤러리/스토리 제어 등의 JS 로직 오류 및 모바일 뷰포트 오버플로우를 감사할 때

## Instructions
1. **무이모지 정밀 스캔 (Zero Emoji Scan)**:
   - 정규식 `[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}]` 등을 활용하여 HTML/CSS/JS 내에 유니코드 이모지가 0개인지 확인합니다.
2. **모바일 반응형 및 레이아웃 검증**:
   - `max-width: 480px` 컨테이너 중앙 정렬 여부 확인.
   - `overflow-x: hidden` 및 모바일 기기(375px~480px) 가로 스크롤 방지 CSS 점검.
3. **자바스크립트 및 인터랙션 무결성 검증**:
   - 복사 기능: `navigator.clipboard.writeText` 및 구형 브라우저 대체 로직(execCommand) 구비 여부.
   - BGM 컨트롤러: 오디오 재생/정지 토글, 에러 예외 처리(브라우저 자동재생 정책 대응).
   - 갤러리/스토리: 타이머 메모리 누수 방지(clearInterval/clearTimeout), 모달 닫기 핸들러.
   - 폼 인터랙션: RSVP 제출 및 방명록 댓글 실시간 DOM 렌더링 검사.
4. **리포트 작성**:
   - 검증 결과는 `_workspace/qa/qa_report.json` 및 `_workspace/qa/qa_summary.md`에 기록합니다.

## Workflow
1. **Step 1. 정적 소스코드 감사**: 두 HTML 파일의 유니코드 이모지 스캔 및 인라인 SVG 무결성을 확인합니다.
2. **Step 2. JS 구문 및 이벤트 검증**: 콘솔 에러 유발 가능 코드, DOM 선택자 매핑, 브라우저 API 호출부를 정밀 분석합니다.
3. **Step 3. QA 리포트 생성**: `_workspace/qa/qa_report.json`에 점검 항목별 통과 여부를 기록합니다.
4. **Step 4. 오케스트레이터 보고**: 표준 JSON 메시지로 최종 승인 또는 수정 요청을 회신합니다.
