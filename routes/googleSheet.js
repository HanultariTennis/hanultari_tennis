const { google } = require('googleapis');
const sheets = google.sheets('v4');

let client;

const rankingSheets = '1QlTiXskeYQRZY5i0UQg-C4T88tLpa-fiWmHDvBTRdbc';
const tourSheets = '10WfSwZqwh_3B3y4fXzHbpZFy7lHMfORX4rC60oeps6U';
const leagueSheets = '1DbCinnMlibKxaM_u8EcPZEr0nSfOf1tYA_V-kY2Bkgw';
const matchSheets = '1eHhxYgmMseySauIuIaX746gIx9JmbDhx14qA7QvIGnw';
const memberSheets = '1QTJ867_m8YqmWVOdLhBFdwjJLcNC-BwIjTBadknehLU';
const courtSheets = '1-aBAG0pGl0Ba0dK4btIbLvjkRhO4Id3ybJQgGTyCuDw';

const auth = new google.auth.GoogleAuth({
  keyFile: 'singular-chain-446508-s3-1e059c3b3f2a.json',
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

async function initializeGoogleSheets() {
  client = await auth.getClient();
  console.log('Google Sheets 클라이언트 초기화 완료');
}

// async function readGoogleSheet(spreadsheetId, range) {
//   if (!client) {
//     console.error('Google Sheets 클라이언트가 초기화되지 않았습니다.');
//     throw new Error('Google Sheets 클라이언트가 초기화되지 않았습니다.');
//   }

//   const response = await sheets.spreadsheets.values.get({
//     auth: client,
//     spreadsheetId,
//     range,
//   });
//   console.log('**************************************************');
//   console.log('google sheet member');
//   console.log('**************************************************');
//   console.log(response.data.values)
//   return response.data.values;
// }

async function readGoogleSheet(spreadsheetId, range) {
  if (!client) {
    console.error('Google Sheets 클라이언트가 초기화되지 않았습니다.');
    throw new Error('Google Sheets 클라이언트가 초기화되지 않았습니다.');
  }

  try {
    const response = await sheets.spreadsheets.values.get({
      auth: client,
      spreadsheetId,
      range, // 예: 'Sheet1!A1:Z1000'
    });

    const rows = response.data.values;

    if (!rows || rows.length === 0) {
      console.log('Google Sheets 데이터가 없습니다.');
      return [];
    }

    // 첫 번째 행을 키로 사용 (헤더)
    const headers = rows[0];

    // 나머지 행을 데이터로 변환
    const data = rows.slice(1).map(row => {
      const obj = {};
      headers.forEach((header, index) => {
        obj[header] = row[index] || ''; // 값이 없으면 빈 문자열
      });
      return obj;
    });

    return data;
  } catch (error) {
    console.error('Google Sheets 데이터 읽기 중 오류 발생:', error.message);
    throw error;
  }
}

async function writeGoogleSheet(spreadsheetId, range, values) {
  if (!client) {
    console.error('Google Sheets 클라이언트가 초기화되지 않았습니다.');
    throw new Error('Google Sheets 클라이언트가 초기화되지 않았습니다.');
  }

  try {
    const response = await sheets.spreadsheets.values.update({
      auth: client,
      spreadsheetId,
      range, // 데이터 쓰기를 수행할 범위 (예: 'Sheet1!A1:C3')
      valueInputOption: 'RAW', // 'RAW' 또는 'USER_ENTERED' 중 선택 가능
      requestBody: {
        values, // 쓰고자 하는 데이터 배열
      },
    });
    console.log(`데이터가 성공적으로 기록되었습니다. 업데이트된 범위: ${response.data.updatedRange}`);
    return response.data;
  } catch (error) {
    console.error('Google Sheets 데이터 쓰기 중 오류 발생:', error.message);
    throw error;
  }
}

async function getLastColumn(spreadsheetId, sheetName) {
  if (!client) {
    console.error("Google Sheets 클라이언트가 초기화되지 않았습니다.");
    throw new Error("Google Sheets 클라이언트가 초기화되지 않았습니다.");
  }

  try {
    // 시트 전체 데이터 가져오기
    const response = await sheets.spreadsheets.values.get({
      auth: client,
      spreadsheetId,
      range: `${sheetName}!1:1`, // 첫 번째 행(A1 행)만 가져옴
    });

    const values = response.data.values || [[]]; // 값이 없으면 빈 배열 처리
    const lastColumnIndex = values[0].length; // 마지막 컬럼 인덱스
    const lastColumnLetter = String.fromCharCode(65 + lastColumnIndex); // A, B, C, D ... 변환

    console.log(`마지막 열: ${lastColumnLetter} (${lastColumnIndex})`);
    return lastColumnLetter;
  } catch (error) {
    console.error("마지막 열 찾기 중 오류 발생:", error.message);
    throw error;
  }
}

async function appendNextColumn(spreadsheetId, sheetName, values) {
  try {
    // 마지막 열 찾기
    const lastColumn = await getLastColumn(spreadsheetId, sheetName);
    const nextColumnLetter = String.fromCharCode(lastColumn.charCodeAt(0) + 1); // 다음 열 계산
    const range = `${sheetName}!${nextColumnLetter}1:${nextColumnLetter}${values.length}`;

    // 다음 열에 데이터 쓰기
    const response = await sheets.spreadsheets.values.update({
      auth: client,
      spreadsheetId,
      range,
      valueInputOption: "RAW",
      requestBody: { values: values.map(v => [v]) }, // 세로 방향으로 데이터 입력
    });

    console.log(`데이터가 성공적으로 기록되었습니다. 업데이트된 범위: ${response.data.updatedRange}`);
    return response.data;
  } catch (error) {
    console.error("새 열에 데이터 추가 중 오류 발생:", error.message);
    throw error;
  }
}

async function getLastRow(spreadsheetId, sheetName) {
  if (!client) {
    console.error("Google Sheets 클라이언트가 초기화되지 않았습니다.");
    throw new Error("Google Sheets 클라이언트가 초기화되지 않았습니다.");
  }

  try {
    // 시트 전체 데이터 가져오기
    const response = await sheets.spreadsheets.values.get({
      auth: client,
      spreadsheetId,
      range: `${sheetName}!A:A`, // 첫 번째 열(A 열) 가져옴
    });

    const values = response.data.values || []; // 값이 없으면 빈 배열 처리
    const lastRow = values.length; // 마지막 데이터가 있는 행 찾기

    console.log(`마지막 행: ${lastRow}`);
    return lastRow;
  } catch (error) {
    console.error("마지막 행 찾기 중 오류 발생:", error.message);
    throw error;
  }
}

async function appendNextRow(spreadsheetId, sheetName, values) {
  try {
    // 마지막 행 찾기
    const lastRow = await getLastRow(spreadsheetId, sheetName);
    const nextRow = lastRow + 1; // 다음 행 번호
    const range = `${sheetName}!A${nextRow}`; // A열부터 입력 시작

    // 다음 행에 데이터 쓰기
    const response = await sheets.spreadsheets.values.update({
      auth: client,
      spreadsheetId,
      range,
      valueInputOption: "RAW",
      requestBody: { values: [values] }, // 가로 방향으로 데이터 입력
    });

    console.log(`데이터가 성공적으로 기록되었습니다. 업데이트된 범위: ${response.data.updatedRange}`);
    return response.data;
  } catch (error) {
    console.error("새 행에 데이터 추가 중 오류 발생:", error.message);
    throw error;
  }
}



// 초기화
initializeGoogleSheets();

module.exports = {
  readGoogleSheet,
  writeGoogleSheet,
  appendNextRow,
  appendNextColumn,
  courtSheets,
  rankingSheets,
  tourSheets,
  leagueSheets,
  matchSheets,
  memberSheets,
};
