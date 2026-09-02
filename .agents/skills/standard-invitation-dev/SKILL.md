---
name: standard-invitation-dev
description: Builds the cinematic film story style mobile wedding invitation (standard-invitation/index.html) with dark charcoal/gold aesthetics, film strip gallery, RSVP, accounts, BGM, and zero emojis.
allowed-tools:
  - write_to_file
  - replace_file_content
  - view_file
  - run_command
---

# standard-invitation-dev

이 스킬은 영화 시놉시스와 크레딧 감성을 극대화한 시네마틱 모바일 청첩장(`standard-invitation/index.html`)을 단일 HTML 파일로 완벽하게 제작할 때 호출합니다.

## When to use this skill
- 시네마틱 필름 스토리 컨셉의 기본 모바일 청첩장을 신규 구축하거나 수정할 때
- 다크 차콜(`#1a1a2e`) & 골드(`#d4a373`) 톤의 영화 포스터, 필름 스트립 갤러리, 엔딩 크레딧 UI를 구현할 때
- 무이모지 정책을 준수하며 정교한 SVG 및 반응형 CSS 애니메이션을 적용할 때

## Instructions
1. **디자인 톤앤매너**:
   - 배경: `#1a1a2e` (다크 차콜) 및 `#16213e`, `#0f3460`
   - 포인트 컬러: `#d4a373` (골드 앰버), `#f4a261`, 텍스트는 `#e0e0e0` 및 크림 화이트
   - 폰트: 구글 폰트 `Playfair Display` (영문 세리프) 및 `Nanum Myeongjo` (한글 명조)
   - 효과: 필름 그레인 텍스처, 비네팅, 부드러운 스크롤 페이드인
2. **필수 섹션 구성**:
   - **오프닝 등급 카드**: "전체관람가 | 2026 | 로맨스 | 상영시간: 평생"
   - **타이틀 시퀀스 메인 포스터**: 풀스크린 웨딩 대표 이미지 + 영문 세리프 타이포
   - **시놉시스 (모시는 글)**: 영화 줄거리 형식 초대 문구 + 양가 부모님 및 신랑/신부 정보 + 전화/문자 SVG 모달
   - **필름 캘린더 & D-Day**: 필름 프레임 형태의 달력 및 D-Day 카운트다운 타이머
   - **스틸컷 (웨딩 갤러리)**: 35mm 필름 스트립 프레임(스프로킷 홀 장식) 수평 스와이프 및 클릭 시 풀스크린 뷰어
   - **로케이션 (오시는 길)**: 지도 연동 영역 + 카카오내비/티맵/네이버지도 원클릭 길찾기 + 교통편 아코디언
   - **관람 예약 (RSVP)**: 하객 성함, 동행 인원, 식사 여부, 셔틀버스 여부 입력 폼 + 시각적 예약 완료 피드백
   - **후원 (축의금)**: 신랑측/신부측 아코디언 접기/펼치기 + 1클릭 복사 & 토스트 알림 + 카카오페이/토스 송금 버튼
   - **관객 리뷰 (방명록)**: 별점(SVG 스타 아이콘) + 한줄평 작성 및 실시간 리스트 렌더링
   - **엔딩 크레딧 & 푸터**: 영화 엔딩 크레딧 롤 애니메이션, 카카오톡 공유 및 링크 복사
   - **BGM 플레이어**: 우측 하단 고정 플로팅 오디오 플레이어 (Web Audio 합성음 또는 MP3 오디오)
3. **무이모지 원칙 (Zero Emoji)**:
   - 본문, 버튼, 타이틀 등 어디에도 유니코드 이모지를 쓰지 않고, 인라인 SVG와 CSS 기하 도형으로만 시각화합니다.
4. **산출물 위치**:
   - 최종 파일: `c:/Users/freef/workspace/mobile_wedding/standard-invitation/index.html`
   - 임시 작업 파일: `c:/Users/freef/workspace/mobile_wedding/_workspace/standard/`

## Workflow
1. **Step 1. 리소스 및 구조 설계**: `_workspace/standard/`에 섹션별 마크업 계획과 SVG 아이콘 세트를 사전 정리합니다.
2. **Step 2. HTML5/CSS3/JS 단일 파일 구현**: `standard-invitation/index.html`에 반응형 레이아웃, 세리프 타이포그래피, 필름 스트립 UI, 모달, BGM 컨트롤러를 단일 파일로 작성합니다.
3. **Step 3. 로컬 렌더링 및 기능 검증**: 자바스크립트 이벤트(복사, RSVP, 리뷰 추가, 오디오 토글) 및 모바일 뷰포트 정합성을 확인합니다.
4. **Step 4. 완료 보고**: 오케스트레이터 및 QA 에이전트에게 표준 JSON 메시지로 완료를 통지합니다.
