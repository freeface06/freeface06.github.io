---
name: friends-invitation-dev
description: Builds the Instagram x Festival style mobile wedding invitation (friends-invitation/index.html) with IG dark mode, story highlights, feed posts, story viewer gallery, polling RSVP, and zero emojis.
allowed-tools:
  - write_to_file
  - replace_file_content
  - view_file
  - run_command
---

# friends-invitation-dev

이 스킬은 인스타그램 앱 UI 패턴(프로필, 피드, 스토리 뷰어, 릴스, 댓글창)과 페스티벌 감성을 접목한 친구용 이색 모바일 청첩장(`friends-invitation/index.html`)을 단일 HTML 파일로 완벽하게 제작할 때 호출합니다.

## When to use this skill
- 인스타그램 UI 스타일의 친구용 모바일 청첩장을 신규 구축하거나 수정할 때
- 인스타 다크모드, 스토리 링 그라데이션, 피드 카드, 풀스크린 스토리 뷰어 인터랙션을 구현할 때
- 이모지 없이 세련된 인라인 SVG와 텍스트 태그를 활용한 현대적 SNS UX를 구축할 때

## Instructions
1. **디자인 톤앤매너**:
   - 배경: `#000000` (인스타 다크 모드) 및 카드 배경 `#121212`, 테두리 `#262626`
   - 시그니처 그라데이션: `linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)`
   - 폰트: 시스템 산세리프 및 `Pretendard`, `Outfit`
   - 효과: 스토리 아바타 그라데이션 링, 피드 더블탭 하트 팝업, 3초 자동 재생 스토리 뷰어
2. **필수 섹션 구성**:
   - **스플래시 로딩**: 인스타 앱 진입 스타일 웨딩 로고 페이드인
   - **프로필 헤더**: 스토리 링 아바타, 계정명 `@minjun_x_yujin`, 게시물/하객/팔로잉 카운터, 프로필 바이오, [Follow] 버튼
   - **스토리 하이라이트**: 원형 아이콘 가로 스크롤 (모시는글, 갤러리, 오시는길, RSVP, 계좌, 방명록 탭 시 부드러운 스크롤 이동)
   - **피드 포스트 1 (모시는 글)**: 인스타 피드 카드(헤더, 웨딩 사진, 하트/댓글/공유 SVG 액션 바, 좋아요 999개, 캡션 본문, 연락하기 모달)
   - **피드 포스트 2 (캘린더 & D-Day)**: 피드 프레임 내 달력 및 실시간 카운트다운 타이머
   - **스토리 뷰어 (웨딩 갤러리)**: 상단 세그먼트 프로그레스 바, 3초 자동 전환, 좌/우 탭 네비게이션, 인스타 스토리 감성 풀스크린 뷰
   - **피드 포스트 3 (오시는 길)**: 지도 임베드 영역 + 카카오내비/티맵/네이버지도 버튼 + 교통 안내 펼치기
   - **피드 포스트 4 (페스티벌 셋리스트)**: 페스티벌 타임테이블 형태의 타임라인
   - **RSVP (인스타 설문 스토리 스타일)**: YES/NO 설문 슬라이더 UI + 참석 인원/식사 여부 폼 + 제출 피드백
   - **축의금 (인스타 송금 카드 스타일)**: 신랑측/신부측 계좌 번호 1클릭 복사 & 토스트 알림, 카카오페이/토스 송금
   - **방명록 (인스타 댓글 섹션)**: 닉네임 + 댓글 입력 시 실시간 피드 댓글 목록 추가
   - **공유 시트 & 푸터**: 인스타 공유 바텀시트 스타일 카카오톡 공유 및 링크 복사
   - **플로팅 BGM 플레이어**: 인스타 릴스 오디오 트랙 스타일 플로팅 사운드 플레이어
3. **무이모지 원칙 (Zero Emoji)**:
   - 모든 리액션은 텍스트 태그(`Congrats!`, `Best Wishes`, `Cheers!`)로 표시하며, 모든 아이콘은 인라인 SVG로 완벽 렌더링합니다.
4. **산출물 위치**:
   - 최종 파일: `c:/Users/freef/workspace/mobile_wedding/friends-invitation/index.html`
   - 임시 작업 파일: `c:/Users/freef/workspace/mobile_wedding/_workspace/friends/`

## Workflow
1. **Step 1. 인스타 UI 컴포넌트 설계**: `_workspace/friends/`에 피드 카드, 스토리 뷰어, 설문 인터랙션의 CSS/JS 스펙을 정의합니다.
2. **Step 2. HTML5/CSS3/JS 단일 파일 구현**: `friends-invitation/index.html`에 인스타 다크모드 테마, SVG 액션 바, 더블탭 하트, 스토리 뷰어 타이머, BGM 제어를 통합 작성합니다.
3. **Step 3. 인터랙션 및 모바일 반응형 검증**: 터치 제스처, 스토리 탭 전환, 설문 슬라이더, 댓글 등록, 클립보드 복사를 로컬에서 검증합니다.
4. **Step 4. 완료 보고**: 오케스트레이터 및 QA 에이전트에게 표준 JSON 메시지로 완료를 통지합니다.
