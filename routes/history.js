const express = require('express');
const path = require('path');
const xlsx = require('xlsx');
const router = express.Router();

const {
  readGoogleSheet,
  rankingSheets,
  tourSheets,
  leagueSheets,
  matchSheets,
  memberSheets,
} = require('./googleSheet');

// 엑셀 파일 경로
const memberFilePath = path.join(__dirname, '../database', 'member.xlsx');
const leagueFilePath = path.join(__dirname, '../database', 'league.xlsx');
const matchFilePath = path.join(__dirname, '../database', 'match.xlsx');

// 엑셀 파일 읽기
const readExcelFile = (filePath) => {
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(worksheet);
  return data;
};

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

function getRankings(players, matches) {
  const members = readExcelFile(memberFilePath);
  const stats = players.map(player => ({
    name: player,
    age: player.endsWith('G') ? 50000 : members.find(member => member.name === player).birth, 
    wins: 0,
    losses: 0,
    winGames: 0,
    loseGames: 0,
    gapWinLoss: 0
  }));

  matches.forEach(match => {
    const winTeam = [match.winAddPlayer, match.winDeucePlayer];
    const loseTeam = [match.loseAddPlayer, match.loseDeucePlayer];
    const winScore = parseInt(match.winScore, 10);
    const loseScore = parseInt(match.loseScore, 10);

    winTeam.forEach(winPlayer => {
      const stat = stats.find(s => s.name === winPlayer);
      if (stat) {
        stat.wins += 1;
        stat.winGames += winScore;
        stat.loseGames += loseScore;
      }
    });

    loseTeam.forEach(losePlayer => {
      const stat = stats.find(s => s.name === losePlayer);
      if (stat) {
        stat.losses += 1;
        stat.winGames += loseScore;
        stat.loseGames += winScore;
      }
    });
  });

  stats.forEach(stat => {
    stat.gapWinLoss = stat.winGames - stat.loseGames;
  });

  stats.sort((a, b) => {
    if (b.wins !== a.wins) {
      return b.wins - a.wins;
    } else if (b.gapWinLoss !== a.gapWinLoss) {
      return b.gapWinLoss - a.gapWinLoss;
    } else if (b.winGames !== a.winGames) {
      return b.winGames - a.winGames;
    } else {
      return b.age - a.age;
    }
  });

  return stats;
};

router.get('/', async (req, res) => {
  if(req.isAuthenticated()) {
    const members = readExcelFile(memberFilePath).sort((a, b) => a.name.localeCompare(b.name));
    let leagues = readExcelFile(leagueFilePath).map(league => {
      return {
        ...league,
        date: league.date
      };
    });
    leagues.sort((a, b) => b.date - a.date);

    res.render('pages/history/history', {
      leagues,
      members,
      userName: req.user.name,
      userRole: req.user.role
    });
  } else {
    res.redirect('/login');
  }
});

router.get('/:leagueName', (req, res) => {
  if(req.isAuthenticated()) {
    const leagueName = req.params.leagueName;
    const leagues = readExcelFile(leagueFilePath);
    const league = leagues.find(league => league.name === leagueName);
    let seedPlayers = [];
    let noSeedPlayers = [];
    let snackScores = [];

    if (league.seed) {
      seedPlayers = league.seed.split("/");
    } 
    if (league.noSeed) {
      noSeedPlayers = league.noSeed.split("/");
    }
    if(league.snack) {
      snackScores = league.snack.split("/");
    }
    
    if (!league) {
      return res.status(404).send('리그를 찾을 수 없습니다.');
    }

    const participants = seedPlayers.concat(noSeedPlayers);
    const matches = readExcelFile(matchFilePath).filter(match => match.name === leagueName).map(match => {
      return {
        ...match,
        date: dateExcelToString(match.date)
      };
    });

    const rankings = getRankings(participants, matches);

    console.log(getRankings(participants, matches));

    res.render('pages/history/history-league', {
      league,
      date: dateExcelToString(league.date),
      participants,
      matches,
      rankings,
      seedPlayers,
      noSeedPlayers,
      snackScores,
      userName: req.user.name,
      userRole: req.user.role
    });
  } else {
    res.redirect('/login');
  }
  
});

module.exports = router;
