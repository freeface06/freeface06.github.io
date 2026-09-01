/**
 * 💌 모바일 청첩장 (Mobile Wedding Invitation) - 구글 시트 연동 Google Apps Script
 * 
 * [특징]
 * 사용자가 시트에 만들어 둔 열(컬럼) 제목을 자동으로 인식하여,
 * '성함', '연락처', '참석 여부', '참석 인원', '식사 여부', '구분' 열의 위치에 맞춰 정확하게 데이터를 삽입합니다.
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
      if (data.length <= 1) {
        return createJsonResponse({ status: 'success', comments: [] });
      }

      const headers = data[0].map(h => String(h).trim());
      let dateIdx = headers.findIndex(h => h.includes('일시') || h.includes('날짜') || h.includes('시간'));
      let authorIdx = headers.findIndex(h => h.includes('작성자') || h.includes('이름') || h.includes('성함'));
      let msgIdx = headers.findIndex(h => h.includes('메시지') || h.includes('내용') || h.includes('축하'));

      if (dateIdx === -1) dateIdx = 0;
      if (authorIdx === -1) authorIdx = 1;
      if (msgIdx === -1) msgIdx = 2;

      const comments = [];
      for (let i = data.length - 1; i >= 1; i--) {
        const author = data[i][authorIdx];
        const msg = data[i][msgIdx];
        if (author && msg) {
          comments.push({
            id: i,
            time: data[i][dateIdx] ? String(data[i][dateIdx]) : '',
            uname: String(author),
            text: String(msg)
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
        sheet.appendRow(['등록일시', '성함', '연락처', '참석 여부', '참석 인원', '식사 여부', '구분 (신랑측/신부측)']);
        sheet.getRange(1, 1, 1, 7).setBackground('#7b3b4a').setFontColor('#ffffff').setFontWeight('bold');
        sheet.setFrozenRows(1);
      }

      const headers = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getValues()[0];
      const dateStr = data.createdAt || Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd HH:mm:ss');
      
      const row = [];
      for (let i = 0; i < headers.length; i++) {
        const h = String(headers[i]).trim();
        if (h.includes('일시') || h.includes('날짜') || h.includes('시간')) {
          row.push(dateStr);
        } else if (h.includes('성함') || h.includes('이름') || h.includes('하객')) {
          row.push(data.name || '무명');
        } else if (h.includes('연락') || h.includes('전화') || h.includes('휴대폰')) {
          row.push(data.phone || '-');
        } else if (h.includes('참석 여부') || h.includes('참석여부')) {
          row.push('참석');
        } else if (h.includes('인원')) {
          row.push(data.count ? (data.count + '명') : '1명');
        } else if (h.includes('식사')) {
          row.push(data.meal || '식사 예정');
        } else if (h.includes('구분') || h.includes('측')) {
          row.push(data.side || '미지정');
        } else {
          row.push('');
        }
      }

      if (row.length === 0) {
        sheet.appendRow([dateStr, data.name || '무명', '-', '참석', data.count ? (data.count + '명') : '1명', data.meal || '식사 예정', data.side || '미지정']);
      } else {
        sheet.appendRow(row);
      }

      return createJsonResponse({ status: 'success', message: 'RSVP saved successfully' });
    }

    // 2. 방명록 (Comments) 저장
    if (action === 'comment') {
      let sheet = doc.getSheetByName('방명록');
      if (!sheet) {
        sheet = doc.insertSheet('방명록');
        sheet.appendRow(['등록일시', '작성자 성함', '축하 메시지']);
        sheet.getRange(1, 1, 1, 3).setBackground('#7b3b4a').setFontColor('#ffffff').setFontWeight('bold');
        sheet.setFrozenRows(1);
      }

      const headers = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getValues()[0];
      const dateStr = data.createdAt || Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd HH:mm:ss');
      
      const row = [];
      for (let i = 0; i < headers.length; i++) {
        const h = String(headers[i]).trim();
        if (h.includes('일시') || h.includes('날짜') || h.includes('시간')) {
          row.push(dateStr);
        } else if (h.includes('작성자') || h.includes('이름') || h.includes('성함')) {
          row.push(data.author || '익명 하객');
        } else if (h.includes('메시지') || h.includes('내용') || h.includes('축하')) {
          row.push(data.message || '');
        } else {
          row.push('');
        }
      }

      if (row.length === 0) {
        sheet.appendRow([dateStr, data.author || '익명 하객', data.message || '']);
      } else {
        sheet.appendRow(row);
      }

      return createJsonResponse({ status: 'success', message: 'Comment saved successfully' });
    }

    return createJsonResponse({ status: 'error', message: 'Unknown action' });
  } catch (error) {
    return createJsonResponse({ status: 'error', message: error.toString() });
  }
}

function createJsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
