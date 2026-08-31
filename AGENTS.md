# Mobile Wedding Invitation Agent System (AGENTS.md)

이 문서는 모바일 청첩장 프로젝트의 멀티 에이전트 협업 시스템 가이드라인입니다. 시네마틱 필름 감성의 정통 청첩장과 인스타그램 UI x 페스티벌 무드의 친구용 청첩장을 전문적으로 설계, 구현 및 검증하는 하네스 체계를 정의합니다.

---

## 1. 시스템 개요 및 아키텍처 패턴

- **아키텍처 패턴**: **Expert Pool + Producer-Reviewer (생성자-검토자 복합 파이프라인)**
- **특징**:
  - `orchestrator`가 사용자의 요구에 맞춰 전문 디자이너 에이전트를 선별 또는 병렬 디스패치(Fan-out)합니다.
  - 생성된 산출물은 `wedding_qa_reviewer`를 통해 무이모지(Zero Emoji), 반응형 모바일 UX(375~480px), JS 런타임 무결성을 2차 검증(Reviewer)합니다.

```
┌─────────────────────────────────────────────────────────────┐
│                   Orchestrator (오케스트레이터)                │
└──────────────┬───────────────────────────────┬──────────────┘
               │ (디스패치)                     │ (디스패치)
               ▼                               ▼
┌──────────────────────────────┐ ┌──────────────────────────────┐
│     standard_designer        │ │      friends_designer        │
│  (시네마틱 필름 청첩장 개발)   │ │  (인스타그램 UI 청첩장 개발)  │
└──────────────┬───────────────┘ └──────────────┬───────────────┘
               │                                │
               └───────────────┬────────────────┘
                               ▼ (검증 요청)
               ┌──────────────────────────────┐
               │     wedding_qa_reviewer      │
               │ (무이모지/반응형/JS 무결성 감사) │
               └──────────────────────────────┘
```

---

## 2. 에이전트 팀 구성 명세 (Agent Directory)

| 에이전트 명 | 담당 역할 | 프롬프트 프로필 경로 | 주 사용 스킬 |
| :--- | :--- | :--- | :--- |
| **`standard_designer`** | 시네마틱 필름 스토리 모바일 청첩장 전담 개발 | `.agents/agents/standard_designer/agent.json` | `standard-invitation-dev` |
| **`friends_designer`** | 인스타그램 UI x 페스티벌 청첩장 전담 개발 | `.agents/agents/friends_designer/agent.json` | `friends-invitation-dev` |
| **`wedding_qa_reviewer`** | 웹 반응형/무이모지/인터랙션/BGM 무결성 검증 | `.agents/agents/wedding_qa_reviewer/agent.json` | `wedding-qa-validation` |

---

## 3. 커스텀 스킬 카탈로그 (Custom Skills)

| 공식 스킬명 (`kebab-case`) | 담당 기술 역할 | 1줄 핵심 기능 요약 |
| :--- | :--- | :--- |
| **`orchestrator`** | 다중 에이전트 지휘 및 워크플로우 통제 | 디자이너 에이전트 기동, QA 검증 의뢰, 피드백 루프 자동화 관리 |
| **`standard-invitation-dev`** | 시네마틱 청첩장 단일 HTML 개발 | 다크 차콜/골드 테마, 필름 스트립 갤러리, 시놉시스, 크레딧 푸터, 무이모지 단일 HTML 구현 |
| **`friends-invitation-dev`** | 인스타 UI 청첩장 단일 HTML 개발 | 인스타 다크모드/그라데이션 UI, 스토리 뷰어, 피드 카드, 더블탭 하트, 무이모지 단일 HTML 구현 |
| **`wedding-qa-validation`** | 청첩장 정적 분석 및 런타임 품질 감사 | 유니코드 이모지 스캔(0개 보장), 375~480px 반응형 뷰포트, BGM 오디오/클립보드 무결성 검증 |

---

## 4. 작업 공간 격리 규칙 (`_workspace/`)

모든 에이전트는 개발 도중 발생하는 중간 산출물, 임시 데이터, 분석 파일 및 테스트 로그를 반드시 프로젝트 루트 하위의 `_workspace/` 디렉토리에 격리 보관합니다:
- `_workspace/standard/`: 기본 청첩장 중간 리소스 및 스펙 메모
- `_workspace/friends/`: 친구용 청첩장 컴포넌트 설계 및 테스트 파일
- `_workspace/qa/`: `qa_report.json` 등 정적 감사 및 기능 검증 리포트

---

## 5. Antigravity CLI 표준 메시징 프로토콜

서브에이전트 간 의사소통 및 상태 전달 시 아래 JSON 포맷을 텍스트 바디에 포함하여 교신합니다:

```json
{
  "sender": "송신 에이전트명",
  "action": "TASK_COMPLETE | REQUEST_REVIEW | REFACTOR_REQUEST | STATUS_UPDATE",
  "target_artifact": "작업 대상 파일의 절대 경로",
  "content": "상세 텍스트 설명 및 요청 사항",
  "metadata": {
    "task_id": "작업 식별용 ID",
    "status": "현재 상태 값",
    "additional_context": "기타 참고 데이터"
  }
}
```

---

## 6. 자연어 조작 및 오케스트레이션 매뉴얼

터미널 명령어 없이 Antigravity 대화창에서 자연어 프롬프트로 하네스 시스템을 즉시 구동할 수 있습니다:

### 대화 실행 예시
1. **전체 청첩장 일괄 구축 및 검증**:
   - `"기획된 기본 청첩장과 친구용 청첩장을 모두 생성하고 QA 검증까지 진행해줘."`
2. **시네마틱 기본 청첩장만 제작/수정**:
   - `"standard_designer를 가동해서 standard-invitation/index.html을 시네마틱 스타일로 만들어줘."`
3. **인스타그램 친구용 청첩장만 제작/수정**:
   - `"friends_designer를 호출해서 friends-invitation/index.html을 인스타 UI로 구현해줘."`
4. **무이모지 및 품질 감사 수행**:
   - `"wedding_qa_reviewer를 통해 두 청첩장에 이모지가 들어갔는지 검사하고 레이아웃을 확인해줘."`

---

## 7. 구성 변경 이력 (Change History)

| 변경 일자 | 구성 유형 | 에이전트 팀 난이도 | 주요 변경 사항 |
| :--- | :--- | :--- | :--- |
| **2026-08-31** | **신규 구성 (Initial)** | **중급 (Intermediate)** | • 모바일 청첩장 하네스 체계 최초 수립<br>• 전문 에이전트 3종 등록 (`standard_designer`, `friends_designer`, `wedding_qa_reviewer`)<br>• 표준 커스텀 스킬 4종 구축 (`orchestrator`, `standard-invitation-dev`, `friends-invitation-dev`, `wedding-qa-validation`)<br>• 무이모지 정책, BGM 플레이어, 더미 이미지 기반 단일 HTML 개발 환경 정립 |
