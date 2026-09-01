/**
 * 💌 모바일 청첩장 (Mobile Wedding Invitation) - 구글 시트 연동 Google Apps Script
 * 
 * [특징]
 * 시트 상단에 통계 요약 박스(총 참석 인원 등)가 있어도,
 * 실제 테이블 헤더 행(5행 등)을 똑똑하게 감지하여 각 열에 정확하게 데이터를 삽입합니다.
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
      
      const headerInfo = findHeaderRow(sheet, ['작성자', '축하 메시지', '메시지', '등록일시']);
      const data = sheet.getDataRange().getValues();
      const startRow = headerInfo ? headerInfo.rowIndex : 1; // 1-indexed

      if (data.length <= startRow) {
        return createJsonResponse({ status: 'success', comments: [] });
      }

      const headers = headerInfo ? headerInfo.headers : (data[0] || []).map(h => String(h).trim());
      let dateIdx = headers.findIndex(h => h.includes('일시') || h.includes('날짜') || h.includes('시간'));
      let authorIdx = headers.findIndex(h => h.includes('작성자') || h.includes('이름') || h.includes('성함'));
      let msgIdx = headers.findIndex(h => h.includes('메시지') || h.includes('내용') || h.includes('축하'));

      if (dateIdx === -1) dateIdx = 0;
      if (authorIdx === -1) authorIdx = 1;
      if (msgIdx === -1) msgIdx = 2;

      const comments = [];
      for (let i = data.length - 1; i >= startRow; i--) {
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
        sheet = doc.getActiveSheet();
      }

      const headerInfo = findHeaderRow(sheet, ['성함', '등록일시', '참석 여부', '참석여부', '구분']);
      const dateStr = data.createdAt || Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd HH:mm:ss');
      
      if (headerInfo) {
        const headers = headerInfo.headers;
        const row = [];
        for (let i = 0; i < headers.length; i++) {
          const h = String(headers[i]).trim();
          if (!h) {
            row.push('');
            continue;
          }
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
        sheet.appendRow(row);
      } else {
        sheet.appendRow([dateStr, data.name || '무명', '-', '참석', data.count ? (data.count + '명') : '1명', data.meal || '식사 예정', data.side || '미지정']);
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

      const headerInfo = findHeaderRow(sheet, ['작성자', '축하 메시지', '메시지', '등록일시']);
      const dateStr = data.createdAt || Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd HH:mm:ss');

      if (headerInfo) {
        const headers = headerInfo.headers;
        const row = [];
        for (let i = 0; i < headers.length; i++) {
          const h = String(headers[i]).trim();
          if (!h) {
            row.push('');
            continue;
          }
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
        sheet.appendRow(row);
      } else {
        sheet.appendRow([dateStr, data.author || '익명 하객', data.message || '']);
      }

      return createJsonResponse({ status: 'success', message: 'Comment saved successfully' });
    }

    return createJsonResponse({ status: 'error', message: 'Unknown action' });
  } catch (error) {
    return createJsonResponse({ status: 'error', message: error.toString() });
  }
}

/**
 * 시트 상단에 통계 요약 박스가 있어도 실제 테이블 헤더 행을 찾아내는 함수
 */
function findHeaderRow(sheet, keywords) {
  const data = sheet.getDataRange().getValues();
  for (let r = 0; r < Math.min(data.length, 25); r++) {
    const row = data[r];
    let matchCount = 0;
    for (let c = 0; c < row.length; c++) {
      const cell = String(row[c]).trim();
      if (!cell) continue;
      for (let k = 0; k < keywords.length; k++) {
        if (cell === keywords[k] || cell.includes(keywords[k])) {
          matchCount++;
          break;
        }
      }
    }
    // 헤더 키워드가 2개 이상 일치하는 행을 실제 테이블 제목 행으로 판별
    if (matchCount >= 2) {
      return {
        rowIndex: r + 1,
        headers: row.map(h => String(h).trim())
      };
    }
  }
  return null;
}

function createJsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
