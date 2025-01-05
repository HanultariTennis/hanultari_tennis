const express = require('express');
const router = express.Router();
const path = require('path');
const xlsx = require('xlsx');
const ExcelJS = require('exceljs');

// 엑셀 파일 경로
const memberFilePath = path.join(__dirname, '../database', 'member.xlsx');
const rankingFilePath = path.join(__dirname, '../database', 'ranking.xlsx');
const courtFilePath = path.join(__dirname, '../database', 'court.xlsx');
const leagueFilePath = path.join(__dirname, '../database', 'league.xlsx');
const matchFilePath = path.join(__dirname, '../database', 'match.xlsx');
const totalPointFilePath = path.join(__dirname, '../database', 'totalPoint.xlsx');

// 엑셀 파일 읽기
const readExcelFile = (filePath) => {
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(worksheet,);
  return data;
};

// 엑셀 파일 쓰기
const writeExcelFile = (workbook, filePath) => {
  xlsx.writeFile(workbook, filePath);
};

function updatePoint() {
  const matchData = readExcelFile(matchFilePath);
  const leagueData = readExcelFile(leagueFilePath);
  const memberData = readExcelFile(memberFilePath);
  const totalPointData = readExcelFile(totalPointFilePath);
  const winLoseData = calculateWinLose();

  // console.log(winLoseData);

  // console.log(matchData);
  // console.log(totalPointData);

  totalPointData.forEach(point => {
    // console.log(point.name);

  });
}

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

const oneWeek = 1 * 24 * 60 * 60 * 1000;

updatePoint();
setInterval(updatePoint, oneWeek);

router.get('/', (req, res) => {
  if(req.isAuthenticated()) {
    res.render('pages/admin/admin', {
      userName: req.user.name,
      userRole: req.user.role
    });
  } else {
    res.redirect('/login');
  }
});

// 관리 페이지
router.get('/ranking', (req, res) => {
  res.render('pages/admin/admin-ranking');
});

// 코트 관리 페이지
router.get('/court', (req, res) => {
  if(req.isAuthenticated()) {
    const courtData = readExcelFile(courtFilePath);
    const courts = [...new Set(readExcelFile(courtFilePath).map(court => court.place))];
    
    res.render('pages/admin/admin-court', {
      userName: req.user.name,
      userRole: req.user.role,
      courts,
      courtData
    });
  } else {
    res.redirect('/login');
  }
});

//코트 추가 페이지
router.get('/court/add', (req, res) => {
  if(req.isAuthenticated()) {    
    const courts = [...new Set(readExcelFile(courtFilePath).map(court => court.place))];

    res.render('pages/admin/admin-court-add', {
      userName: req.user.name,
      userRole: req.user.role,
      courts,
    });
  } else {
    res.redirect('/login');
  }
});

// 코트 추가 제출
router.post('/court/add', async (req, res) => {
  if(req.isAuthenticated()) {
    const newCourtData = JSON.parse(req.body.newCourtData);
    console.log(newCourtData);

    const courtWorkbook = new ExcelJS.Workbook();
    await courtWorkbook.xlsx.readFile(courtFilePath);
    const courtWorksheet = courtWorkbook.getWorksheet('Sheet1');

    newCourtData.forEach(newCourt => {
      courtWorksheet.addRow([
        newCourt.place,
        newCourt.court,
        newCourt.surface,
        newCourt.type
      ]);
    });

    await courtWorkbook.xlsx.writeFile(courtFilePath);
    console.log('court.xlsx 업데이트 성공!');

    res.redirect('/admin/court');

  } else {
    res.redirect('/login');
  }
})

router.get('/court/delete', (req, res) => {
});

router.get('/court/edit/:courtName', (req, res) => {
  if(req.isAuthenticated()) {
    const place = req.params.courtName;
    const courtData = readExcelFile(courtFilePath).filter(row => row.place === place);

    console.log(place)
    console.log(courtData)
    res.render('pages/admin/admin-court-edit', {
      userName: req.user.name,
      userRole: req.user.role,
      courtData
    });
  } else {
    res.redirect('/login');
  }

});

router.post('/court/edit', async (req, res) => {
  if(req.isAuthenticated()) {
    const editCourtData = JSON.parse(req.body.editCourtData);
    console.log(editCourtData);

    const courtWorkbook = new ExcelJS.Workbook();
    await courtWorkbook.xlsx.readFile(courtFilePath);
    const courtWorksheet = courtWorkbook.getWorksheet('Sheet1');
    let findRow = null;

    courtWorksheet.eachRow((row, rowNumber) => {
      const rowName = row.getCell(1).value;
  
      if(rowName === formerName) {
        row.getCell(3).value = editPhone;
        row.getCell(4).value = editRole;
      }
    });

    await courtWorkbook.xlsx.writeFile(courtFilePath);
    console.log('court.xlsx 업데이트 성공!');

    res.redirect('/admin/court');

  } else {
    res.redirect('/login');
  }
});

router.get('/member', (req, res) => {
  if(req.isAuthenticated()) {
    const members = readExcelFile(memberFilePath);
    res.render('pages/admin/admin-member', {
      userName: req.user.name,
      userRole: req.user.role,
      members
    });
  } else {
    res.redirect('/login');
  }
});

router.get('/member/new', (req, res) => {
  if(req.isAuthenticated()) {
    res.render('pages/admin/admin-member-new', {
      userName: req.user.name,
      userRole: req.user.role
    });
  } else {
    res.redirect('/login');
  }
});

router.post('/member/new', async (req, res) => {
  const { newName, newRole, newPhone, newJoin, newBirth, newPlay, newRacquet } = req.body;

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(memberFilePath);
  const worksheet = workbook.getWorksheet('members');

  const newPassword = newPhone.slice(-4);

  worksheet.addRow([
    newName,
    newPassword,
    newPhone,
    newRole,
    newJoin,
    newBirth,
    newPlay,
    newRacquet
  ]);

  await workbook.xlsx.writeFile(memberFilePath);

  res.redirect('/admin/member');
});

router.get('/member/:membername', (req, res) => {
  if(req.isAuthenticated()) {
    const memberName = req.params.membername;
    const member = readExcelFile(memberFilePath).find(member => member.name == memberName);

    res.render('pages/admin/admin-member-edit', {
      userName: req.user.name,
      userRole: req.user.role,
      member
    });
  } else {
    res.redirect('/login');
  }
});

router.post('/member/edit' , async (req, res) => {
  const { formerName, editName, editRole, editPhone } = req.body;
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(memberFilePath);
  const worksheet = workbook.getWorksheet('members');

  worksheet.eachRow((row, rowNumber) => {
    const rowName = row.getCell(1).value;

    if(rowName === formerName) {
      row.getCell(3).value = editPhone;
      row.getCell(4).value = editRole;
    }
  });

  await workbook.xlsx.writeFile(memberFilePath);

  res.redirect('/admin/member');
});

router.post('/update-ranking', (req, res) => {
  try {
    const { workbook: membersWorkbook, data: membersData } = readExcelFile(memberFilePath);
    const { workbook: rankingsWorkbook, data: rankingsData, sheetName: rankingsSheetName } = readExcelFile(rankingFilePath);

    // 데이터 유효성 검사 및 undefined 항목 제거
    const memberNames = membersData.slice(1).filter(row => row[0]).map(member => member[0]);
    const rankingNames = rankingsData.slice(1).filter(row => row[0]).map(ranking => ranking[0]);

    // rankings.xlsx에 없는 회원 추가
    const newRankings = [...rankingsData];
    memberNames.forEach(name => {
      if (!rankingNames.includes(name)) {
        newRankings.push([name]);
      }
    });

    // 현재 날짜를 rankings.xlsx의 첫 번째 행 첫 번째 빈칸에 추가 (엑셀 형식)
    const currentDate = new Date();
    const headerRow = newRankings[0];
    const firstEmptyCol = headerRow.findIndex(cell => !cell);
    if (firstEmptyCol !== -1) {
      headerRow[firstEmptyCol] = currentDate;
    } else {
      headerRow.push(currentDate);
    }

    // 데이터를 워크시트에 다시 작성
    const newWorksheet = xlsx.utils.aoa_to_sheet(newRankings);
    // 첫 번째 행의 날짜 형식을 "24-06-24"로 설정
    for (let col = 0; col < headerRow.length; col++) {
      const cellRef = xlsx.utils.encode_cell({ c: col, r: 0 });
      if (newWorksheet[cellRef]) {
        newWorksheet[cellRef].z = 'yy-mm-dd'; // 날짜 형식 설정
      }
    }

    rankingsWorkbook.Sheets[rankingsSheetName] = newWorksheet;

    // 파일 쓰기
    writeExcelFile(rankingsWorkbook, rankingFilePath);

    res.json({ message: 'Ranking updated successfully!' });
  } catch (error) {
    console.error('Error updating ranking:', error);
    res.status(500).json({ message: 'Error updating ranking', error });
  }
});

module.exports = router;
