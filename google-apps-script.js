/**
 * 💌 모바일 청첩장 (Mobile Wedding Invitation) - 구글 시트 연동 Google Apps Script
 * 
 * [기능]
 * 1. 참석 여부(RSVP) 실시간 자동 저장 ('참석명단' 시트 자동 생성 및 기록)
 * 2. 방명록/축하메시지 실시간 자동 저장 ('방명록' 시트 자동 생성 및 기록)
 * 3. 방명록 목록 실시간 조회 (청첩장 접속 시 실제 작성된 방명록 불러오기)
 */

function doGet(e) {
  try {
    const action = e.parameter ? e.parameter.action : '';
    const doc = SpreadsheetApp.getActiveSpreadsheet();
    
    // 방명록 목록 조회 (GET 요청)
    if (action === 'get_comments') {
      let sheet = doc.getSheetByName('방명록');
      if (!sheet) {
        return createJsonResponse({ status: 'success', comments: [] });
      }
      const data = sheet.getDataRange().getValues();
      const comments = [];
      // 헤더 제외하고 최신순으로 가져오기
      for (let i = data.length - 1; i >= 1; i--) {
        if (data[i][1] && data[i][2]) {
          comments.push({
            id: i,
            time: data[i][0] ? String(data[i][0]) : '',
            uname: String(data[i][1]),
            text: String(data[i][2])
          });
        }
      }
      return createJsonResponse({ status: 'success', comments: comments });
    }
    
    return createJsonResponse({ status: 'success', message: 'Wedding API is ready.' });
  } catch (error) {
    return createJsonResponse({ status: 'error', message: error.toString() });
  }
}

function doPost(e) {
  try {
    const doc = SpreadsheetApp.getActiveSpreadsheet();
    let data;
    if (e.postData && e.postData.contents) {
      data = JSON.parse(e.postData.contents);
    } else if (e.parameter) {
      data = e.parameter;
    } else {
      data = {};
    }

    const action = data.action;

    // 1. 참석 여부 (RSVP) 저장
    if (action === 'rsvp') {
      let sheet = doc.getSheetByName('참석명단');
      if (!sheet) {
        sheet = doc.insertSheet('참석명단');
        sheet.appendRow(['등록일시', '구분 (신랑측/신부측)', '성함', '참석 인원', '식사 여부']);
        sheet.getRange(1, 1, 1, 5).setBackground('#f2f2f2').setFontWeight('bold');
        sheet.setFrozenRows(1);
      }
      const dateStr = data.createdAt || Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd HH:mm:ss');
      sheet.appendRow([
        dateStr,
        data.side || '미지정',
        data.name || '무명',
        data.count ? (data.count + '명') : '1명',
        data.meal || '식사 예정'
      ]);
      return createJsonResponse({ status: 'success', message: 'RSVP saved successfully' });
    }

    // 2. 방명록 (Comments) 저장
    if (action === 'comment') {
      let sheet = doc.getSheetByName('방명록');
      if (!sheet) {
        sheet = doc.insertSheet('방명록');
        sheet.appendRow(['등록일시', '작성자 성함', '축하 메시지']);
        sheet.getRange(1, 1, 1, 3).setBackground('#f2f2f2').setFontWeight('bold');
        sheet.setFrozenRows(1);
      }
      const dateStr = data.createdAt || Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd HH:mm:ss');
      sheet.appendRow([
        dateStr,
        data.author || '익명 하객',
        data.message || ''
      ]);
      return createJsonResponse({ status: 'success', message: 'Comment saved successfully' });
    }

    return createJsonResponse({ status: 'error', message: 'Unknown action: ' + action });
  } catch (error) {
    return createJsonResponse({ status: 'error', message: error.toString() });
  }
}

function createJsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
