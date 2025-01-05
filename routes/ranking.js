const express = require('express');
const { read } = require('fs');
const path = require('path');
const router = express.Router();
const xlsx = require('xlsx');

// 엑셀 파일 경로
const memberFilePath = path.join(__dirname, '../database', 'member.xlsx');
const matchFilePath = path.join(__dirname, '../database', 'match.xlsx');
const rankingFilePath = path.join(__dirname, '../database', 'ranking.xlsx');
const pointFilePath = path.join(__dirname, '../database', 'point.xlsx');
const tourFilePath = path.join(__dirname, '../database', 'tour.xlsx');
const courtFilePath = path.join(__dirname, '../database', 'court.xlsx');
const leagueFilePath = path.join(__dirname, '../database', 'league.xlsx');

// 엑셀 파일 읽기
const readExcelFile = (filePath) => {
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(worksheet);
  return data;
};

var rankingTable;

function dateExcelToString(excelDate) {
  // Excel의 기준 날짜는 1900-01-01 (시리얼 1)
  // JavaScript의 기준 날짜는 1970-01-01
  // 따라서, 엑셀 날짜를 JS로 변환하려면 1900-01-01로부터 해당 일수를 더해줘야 함

  // 엑셀의 1900년 기준에서 1970년 기준을 빼면 25569일 차이
  let excelEpoch = new Date(1899, 11, 30); // 엑셀 기준 0일 (1900-01-01 시리얼 넘버는 1)
  let jsDate = new Date(excelEpoch.getTime() + excelDate * (1000 * 60 * 60 * 24)); // 86400000은 하루를 밀리초로 표현한 값

  // 날짜의 각 부분을 추출
  let day = String(jsDate.getDate()).padStart(2, '0');
  let month = String(jsDate.getMonth() + 1).padStart(2, '0');
  // let year = String(jsDate.getFullYear()).slice(-2);
  let year = String(jsDate.getFullYear());

  // 원하는 형식으로 반환
  return `${year}.${month}.${day} `;
}


// 잠깐 비활성화
// function updateRankings() {
//   rankingTable = readExcelFile(memberFilePath).filter(member => !(member.role.includes('휴면') || member.role.includes('탈퇴') || member.role.includes('?'))).map(item => ({
//     name: item.name
//   }));
//   const points = readExcelFile(pointFilePath).map(item => ({
//     name: item.name,
//     point: item.sum
//   }));
//   const rankings = readExcelFile(rankingFilePath).map(item => ({
//     name: item.name,
//     ranking: item.recent
//   }));

//   const winLosses = calculateWinLose();

//   rankingTable.forEach(row => {
//     row.point = points.find(point => point.name === row.name).point;
//     row.ranking = rankings.find(ranking => ranking.name === row.name).ranking;
//     row.win = winLosses.find(ranking => ranking.name === row.name).win;
//     row.lose = winLosses.find(ranking => ranking.name === row.name).lose;

//     if(row.win + row.lose) {
//       row.winRate = ((row.win / (row.win + row.lose)) * 100).toFixed(1);
//     } else {
//       row.winRate = 0;
//     }
//   });

//   rankingTable.sort((a, b) => {
//     if (a.ranking !== b.ranking) {
//       return a.ranking - b.ranking; // ranking 기준 오름차순 정렬
//     } else {
//       return a.name.localeCompare(b.name); // name 기준으로 가나다순 정렬
//     }
//   });
// }

function updateRankings() {
  rankingTable = readExcelFile(memberFilePath).filter(member => !(member.role.includes('휴면') || member.role.includes('탈퇴') || member.role.includes('?'))).map(item => ({
    name: item.name
  }));
  const points = readExcelFile(pointFilePath).map(item => ({
    name: item.name,
    point: item.sum
  }));
  const rankings = readExcelFile(rankingFilePath).map(item => ({
    name: item.name,
    ranking: item.recent
  }));

  const winLosses = calculateWinLose();

  rankingTable.forEach(row => {
    // row.point = points.find(point => point.name === row.name).point;
    row.ranking = rankings.find(ranking => ranking.name === row.name).ranking;
    row.win = winLosses.find(ranking => ranking.name === row.name).win;
    row.lose = winLosses.find(ranking => ranking.name === row.name).lose;
    row.point = winLosses.find(ranking => ranking.name === row.name).point;

    if(row.win + row.lose) {
      row.winRate = ((row.win / (row.win + row.lose)) * 100).toFixed(1);
    } else {
      row.winRate = 0;
    }
  });
  rankingTable.sort((a, b) => b.point - a.point);

  console.log(rankingTable)

  // rankingTable.sort((a, b) => {
  //   if (a.ranking !== b.ranking) {
  //     return a.ranking - b.ranking; // ranking 기준 오름차순 정렬
  //   } else {
  //     return a.name.localeCompare(b.name); // name 기준으로 가나다순 정렬
  //   }
  // });
}

const oneWeek = 1 * 24 * 60 * 60 * 1000;

updateRankings();
setInterval(updateRankings, oneWeek);

function calculateWinLose() {
  const matches = readExcelFile(matchFilePath);
  const stats = readExcelFile(memberFilePath).sort((a, b) => a.name.localeCompare(b.name)).map(item => ({
    name: item.name
  }));
  const snackData = readExcelFile(leagueFilePath).map(row => row.snack);

  stats.forEach(stat => {
    let winCount = 0;
    let losecount = 0;
    let snackSum = 0;

    matches.forEach(row => {
      if(row.winAddPlayer === stat.name) {
        winCount++;
      }
      if(row.winDeucePlayer === stat.name) {
        winCount++;
      }
      if(row.loseAddPlayer === stat.name) {
        losecount++;
      }
      if(row.loseDeucePlayer === stat.name) {
        losecount++;
      }
    });
    stat.win = winCount;
    stat.lose = losecount;

    snackData.forEach(item => {
      if(item != undefined) {
        if (item.includes(stat.name)) { // target으로 시작하는 문자열을 찾음
          let target = stat.name + ':';
          const snackPoint = parseInt(item.slice(item.indexOf(target) + target.length)); // target 문자열 뒤의 문자를 숫자로 변환
          snackSum += snackPoint; // 합산
        }
      }
    });
    
    stat.snack = snackSum;
    stat.point = winCount * 2.5 + losecount * 0.5 + snackSum;
  });

  return stats;
};

function getRankings() {
  const rankingTable = readExcelFile(memberFilePath).filter(member => !(member.role.includes('휴면') || member.role.includes('탈퇴') || member.role.includes('?'))).map(item => ({
    name: item.name
  }));
  const points = readExcelFile(pointFilePath).map(item => ({
    name: item.name,
    point: item.sum
  }));
  const rankings = readExcelFile(rankingFilePath).map(item => ({
    name: item.name,
    ranking: item.recent
  }));

  const winLosses = calculateWinLose();

  rankingTable.forEach(row => {
    row.point = points.find(point => point.name === row.name).point;
    row.ranking = rankings.find(ranking => ranking.name === row.name).ranking;
    row.win = winLosses.find(ranking => ranking.name === row.name).win;
    row.lose = winLosses.find(ranking => ranking.name === row.name).lose;

    if(row.win && row.lose) {
      row.winRate = ((row.win / (row.win + row.lose)) * 100).toFixed(1);
    } else {
      row.winRate = 0;
    }
  });

  rankingTable.sort((a, b) => {
    if (a.ranking !== b.ranking) {
      return a.ranking - b.ranking; // ranking 기준 오름차순 정렬
    } else {
      return a.name.localeCompare(b.name); // name 기준으로 가나다순 정렬
    }
  });

  return rankingTable;
}

function excelSerialToDate(serial) {
  // Excel 기준 날짜 설정 (1899-12-30이 0으로 계산됨)
  const excelEpoch = new Date(1899, 11, 30);
  // 시리얼 번호를 밀리초로 변환하여 JavaScript Date 객체 생성
  const jsDate = new Date(excelEpoch.getTime() + (serial * 24 * 60 * 60 * 1000));
  
  // 연, 월, 일 추출
  const year = jsDate.getFullYear();
  const month = String(jsDate.getMonth() + 1).padStart(2, '0'); // 0부터 시작하므로 1을 더함
  const day = String(jsDate.getDate()).padStart(2, '0');
  
  // "YYYY.MM.DD" 형식으로 반환
  return `${year}.${month}.${day}`;
}

function stringToDate(string) {
  const split = string.split("-");
  const date = new Date(split[0], split[1] - 1, split[2]);

  return date;
}

function getRecord(memberName, memberMatch) {
  const record = {
    total: memberMatch.length,
    win: 0,
    lose: 0,
    grassWin: 0,
    grassLose: 0,
    hardWin: 0,
    hardLose: 0,
    clayWin: 0,
    clayLose: 0,
    carpetWin: 0,
    carpetLose: 0,
    deuceWin: 0,
    deuceLose: 0,
    addWin: 0,
    addLose: 0
  };
  const courtData = readExcelFile(courtFilePath);
  const seenPlaces = new Set();
  const courts = courtData.filter(item => {
    if (seenPlaces.has(item.place)) {
      return false;
    } else {
      seenPlaces.add(item.place);
      return true;
    }
  }).map(item => ({
    place: item.place,
    surface: item.surface
  }));

  memberMatch.forEach(match => {
    const surface = courts.find(court => court.place === match.place).surface;

    if ((match.winAddPlayer === memberName) || (match.winDeucePlayer === memberName)) {
      record.win++;

      

      if (surface == '인조잔디') {
        record.grassWin++;
      } else if (surface == '하드') {
        record.hardWin++;
      } else if (surface == '클레이') {
        record.clayWin++;
      } else if (surface == '카펫') {
        record.carpetWin++;
      } else {

      }

      if(memberName === match.winAddPlayer) {
        record.addWin++;
      } else {
        record.deuceWin++;
      }

    } else if ((match.loseAddPlayer === memberName) || (match.loseDeucePlayer === memberName)) {
      record.lose++;

      if (surface == '인조잔디') {
        record.grassLose++;
      } else if (surface == '하드') {
        record.hardLose++;
      } else if (surface == '클레이') {
        record.clayLose++;
      } else if (surface == '카펫') {
        record.carpetLose++;
      } else {

      }

      if(memberName === match.loseAddPlayer) {
        record.addLose++;
      } else {
        record.deuceLose++;
      }

    } else {

    }

  });

  if(record.win + record.lose) {
    record.winRate = ((record.win / (record.win + record.lose)) * 100).toFixed(1);
  } else {
    record.winRate = 0;
  }

  if(record.grassWin + record.grassLose) {
    record.grassWinRate = ((record.grassWin / (record.grassWin + record.grassLose)) * 100).toFixed(1);
  } else {
    record.grassWinRate = 0;
  }

  if(record.hardWin + record.hardLose) {
    record.hardWinRate = ((record.hardWin / (record.hardWin + record.hardLose)) * 100).toFixed(1);
  } else {
    record.hardWinRate = 0;
  }

  if(record.clayWin + record.clayLose) {
    record.clayWinRate = ((record.clayWin / (record.clayWin + record.clayLose)) * 100).toFixed(1);
  } else {
    record.clayWinRate = 0;
  }

  if(record.carpetWin + record.carpetLose) {
    record.carpetWinRate = ((record.carpetWin / (record.carpetWin + record.carpetLose)) * 100).toFixed(1);
  } else {
    record.carpetWinRate = 0;
  }

  if(record.deuceWin + record.deuceLose) {
    record.deuceWinRate = ((record.deuceWin / (record.deuceWin + record.deuceLose)) * 100).toFixed(1);
  } else {
    record.deuceWinRate = 0;
  }

  if(record.addWin + record.addLose) {
    record.addWinRate = ((record.addWin / (record.addWin + record.addLose)) * 100).toFixed(1);
  } else {
    record.addWinRate = 0;
  }

  return record;
}

function getBestPartner(memberName, memberMatch) {
  const partners = [];

  memberMatch.forEach(match => {
    if (match.winAddPlayer === memberName) {
      if (match.winDeucePlayer.endsWith('G')) {

      } else if (!(partners.find(partner => partner.name === match.winDeucePlayer))) {
        partners.push({
          name: match.winDeucePlayer,
          win: 1,
          lose: 0
        })
      } else {
        const target = partners.find(partner => partner.name === match.winDeucePlayer);
        
        target.win ++;
      }

    } else if (match.winDeucePlayer === memberName) {
      if (match.winAddPlayer.endsWith('G')) {

      } else if (!(partners.find(partner => partner.name === match.winAddPlayer))) {
        partners.push({
          name: match.winAddPlayer,
          win: 1,
          lose: 0
        })
      } else {
        const target = partners.find(partner => partner.name === match.winAddPlayer);
        
        target.win ++;
      }

    } else if (match.loseAddPlayer === memberName) {
      if (match.loseDeucePlayer.endsWith('G')) {

      } else if (!(partners.find(partner => partner.name === match.loseDeucePlayer))) {
        partners.push({
          name: match.loseDeucePlayer,
          win: 0,
          lose: 1
        })
      } else {
        const target = partners.find(partner => partner.name === match.loseDeucePlayer);
        
        target.lose ++;
      }
    } else if (match.loseDeucePlayer === memberName) {
      if (match.loseAddPlayer.endsWith('G')) {

      } else if (!(partners.find(partner => partner.name === match.loseAddPlayer))) {
        partners.push({
          name: match.loseAddPlayer,
          win: 0,
          lose: 1
        })
      } else {
        const target = partners.find(partner => partner.name === match.loseAddPlayer);
        
        target.lose ++;
      }

    } else {

    }
  });
  partners.forEach(partner => {
    partner.winRate = ((partner.win / (partner.win + partner.lose)) * 100).toFixed(1);
  });

  return partners;
}

function getTour(memberName) {
  const memberTourData = readExcelFile(tourFilePath).find(tour => tour.name === memberName);
  delete memberTourData.name;
  const tours = [];

  for (let key in memberTourData) {
    if (memberTourData.hasOwnProperty(key)) {
      // 문자열을 공백으로 나누기
      const parts = memberTourData[key].split(' ');

      // 분리된 데이터를 각 항목에 할당
      const date = parts[0];
      const name = parts.slice(1, -2).join(' ');
      const result = parts[parts.length - 2];
      const partner = parts[parts.length - 1];

      // 객체로 구성
      tours.push({
        date: date,
        name: name,
        result: result,
        partner: partner
      });
    }
  }

  return tours;
}

function getFourWins(name) { 
  const fourWinsData = readExcelFile(leagueFilePath).filter(league => {
    if (league.fourWins && league.fourWins.includes(name)) {
      return true;
    } else {
      return false;
    }
  });

  
  return fourWinsData.length;
}

// 랭킹 페이지
router.get('/', (req, res) => {
  if(req.isAuthenticated()) {
    const members = readExcelFile(memberFilePath).sort((a, b) => a.name.localeCompare(b.name));

    res.render('pages/ranking/ranking', {
      members,
      rankingTable: rankingTable,
      userName: req.user.name,
      userRole: req.user.role
    });
  } else {
    res.redirect('/login');
  }
});

// 회원 상세 페이지
router.get('/member/:name', (req, res) => {
  if(req.isAuthenticated()) {
    const members = readExcelFile(memberFilePath).sort((a, b) => a.name.localeCompare(b.name));
    const memberName = req.params.name;
    const member = members.find(m => m.name === memberName);

    if (!member) {
      return res.status(404).send('회원 정보를 찾을 수 없습니다.');
    }

    const rankingRow = rankingTable.find(row => row.name === memberName);
    const matchList = readExcelFile(matchFilePath);

    const memberMatch = matchList.filter(row => ((row.winAddPlayer === memberName) || (row.winDeucePlayer === memberName) || (row.loseAddPlayer === memberName) ||(row.loseDeucePlayer === memberName)));

    // const recentMatch = memberMatch.sort((a, b) => stringToDate(b.date) - stringToDate(a.date)).slice(0, 20);
    // const recentMatch = memberMatch.sort((a, b) => excelSerialToDate(b.date) - excelSerialToDate(a.date)).slice(0, 20);
    const recentMatch = memberMatch.sort((a, b) => b.date - a.date).slice(0, 20);

    recentMatch.forEach(row => {
      row.date = excelSerialToDate(row.date).slice(2);
      // row.date = row.date.replace(/-/g, '.').slice(2);
    });


    // 대회 기록 가져오기
    const tours = getTour(memberName);

    const partners = getBestPartner(memberName, memberMatch);
    const bestWinPartner = partners.sort((a, b) => b.win - a.win)[0];
    const bestWinRatePartner = partners.sort((a, b) => b.winRate - a.winRate)[0];

    const records = getRecord(memberName, memberMatch);
    const fourWins = getFourWins(memberName);

    res.render('pages/ranking/member', {
      name: memberName,
      birth: excelSerialToDate(member.birth),
      join: excelSerialToDate(member.join),
      ranking: rankingRow.ranking,
      phone: member.phone,
      plays: member.plays,
      racquet: member.racquet,
      point: rankingRow.point,
      recentMatch: recentMatch,
      win: rankingRow.win,
      lose: rankingRow.lose,
      winRate: rankingRow.winRate,
      photoUrl: `/path/to/${memberName}.jpg`,
      tours: tours,
      bestWinPartner,
      bestWinRatePartner,
      records: records,
      fourWins: fourWins,
      userName: req.user.name,
      userRole: req.user.role
    });
  } else {
    res.redirect('/login');
  }
});

module.exports = router;
