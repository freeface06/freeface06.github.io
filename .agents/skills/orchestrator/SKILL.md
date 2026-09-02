---
name: orchestrator
description: Coordinates the multi-agent pipeline to develop and validate the standard and friends mobile wedding invitations using subagent dispatch and JSON messaging protocols.
allowed-tools:
  - invoke_subagent
  - send_message
  - manage_subagents
  - view_file
  - run_command
  - write_to_file
---

# orchestrator

이 스킬은 사용자의 요청에 따라 시네마틱 기본 청첩장(`standard_designer`)과 인스타그램 x 페스티벌 친구용 청첩장(`friends_designer`), 그리고 품질 검증 엔지니어(`wedding_qa_reviewer`)를 유기적으로 지휘하고 조율하는 총괄 오케스트레이터입니다.

## When to use this skill
- 모바일 청첩장 프로젝트 전체 구축 또는 특정 테마 청첩장의 생성/업데이트를 실행할 때
- 다중 에이전트(`standard_designer`, `friends_designer`, `wedding_qa_reviewer`)의 병렬 디스패치 및 파이프라인 협업을 총괄할 때
- 에이전트 간 표준 JSON 메시지를 수신하여 진행 상태를 트래킹하고 최종 산출물을 검증할 때

## 하네스 팀 구성 및 전문 스킬 명세

| 에이전트 명 (Agent Name) | 담당 역할 (Role) | 전용 커스텀 스킬 (Skill Name) | 자동화 임무 |
| :--- | :--- | :--- | :--- |
| **`standard_designer`** | Cinematic Wedding Developer | `standard-invitation-dev` | 다크 차콜/골드 톤, 필름 스트립 갤러리, 시놉시스, 크레딧 푸터, 무이모지 단일 HTML 청첩장 구현 |
| **`friends_designer`** | Instagram Festival Developer | `friends-invitation-dev` | 인스타 다크모드/그라데이션 UI, 스토리 뷰어, 피드 카드, 더블탭 하트, 무이모지 단일 HTML 청첩장 구현 |
| **`wedding_qa_reviewer`** | Wedding QA & Auditor | `wedding-qa-validation` | 무이모지 스캔(0-Emoji Audit), 모바일 반응형(375~480px) 뷰포트, BGM 재생, 폼/클립보드 무결성 검증 |

## 표준 메시징 프로토콜
모든 에이전트는 `send_message` 도구 사용 시 아래 JSON 규격을 엄격히 준수합니다:
```json
{
  "sender": "송신 에이전트명",
  "action": "REQUEST_REVIEW | TASK_COMPLETE | REFACTOR_REQUEST | STATUS_UPDATE",
  "target_artifact": "작업 대상 파일의 절대 경로",
  "content": "상세 설명 및 요청 사항",
  "metadata": {
    "task_id": "작업 식별자",
    "status": "READY_FOR_QA | APPROVED | REJECTED",
    "additional_context": "기타 참고 정보"
  }
}
```

## Instructions & SOP
1. **서브에이전트 런타임 등록 확인**: 작업 착수 전 `.agents/agents/{agent_name}/agent.json` 프로필이 `define_subagent`로 등록되어 있는지 확인합니다.
2. **병렬 또는 순차 디스패치 (Fan-out / Pipeline)**:
   - 두 청첩장 구축 태스크(`standard-invitation`, `friends-invitation`)를 `invoke_subagent`로 병렬 또는 개별 기동합니다.
3. **상태 동기화 및 검증 위임 (Producer-Reviewer)**:
   - 개발 완료 메시지(`TASK_COMPLETE`)를 수신하면 `wedding_qa_reviewer`를 기동하여 무이모지 및 기능 테스트를 수행하도록 지시합니다.
4. **품질 검증 실패 시 재작업 루프 (Self-Correction)**:
   - QA 리포트에서 결함(이모지 발견, 레이아웃 깨짐, JS 에러)이 감지되면 해당 디자이너 에이전트에게 `REFACTOR_REQUEST` 메시지를 발송하여 수정하도록 지휘합니다.
5. **최종 보고**: 모든 검증을 통과하면 사용자에게 완성된 청첩장 링크와 기능 요약을 보고합니다.

## Workflow
1. **Step 1. 태스크 분석 및 에이전트 선정**: 사용자 명령에 따라 `standard_designer` 또는 `friends_designer` (또는 둘 다)를 기동합니다.
2. **Step 2. 청첩장 단일 HTML 구축**: 지정된 디자이너 에이전트가 `standard-invitation/index.html` 및 `friends-invitation/index.html`을 생성합니다.
3. **Step 3. QA 감사 및 무이모지 검증**: `wedding_qa_reviewer`가 두 산출물을 스캔하여 `_workspace/qa/qa_report.json`을 작성합니다.
4. **Step 4. 결과 종합 및 사용자 완료 안내**: 최종 산출물을 정리하여 사용자에게 확인을 요청합니다.
