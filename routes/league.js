const express = require('express');
const router = express.Router();
const path = require('path');
const xlsx = require('xlsx');
const ExcelJS = require('exceljs');

// 엑셀 파일 경로
const matchFilePath = path.join(__dirname, '../database', 'match.xlsx');
const leagueFilePath = path.join(__dirname, '../database', 'league.xlsx');
const memberFilePath = path.join(__dirname, '../database', 'member.xlsx');
const courtFilePath = path.join(__dirname, '../database', 'court.xlsx');
const hanulAaFilePath = path.join(__dirname, '../database', 'hanulAA.xlsx');
const hanulAbFilePath = path.join(__dirname, '../database', 'hanulAB.xlsx');

// 엑셀 파일 읽는 함수
const readExcelFile = (filePath) => {
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(worksheet);
  return data;
};

// 날짜 스트링을 엑셀 데이터로 변환하는 함수
function dateStringToExcel(dateStr) {
  const date = new Date(dateStr);
  const excelEpoch = new Date(1899, 11, 30);
  const days = Math.floor((date - excelEpoch) / (1000 * 60 * 60 * 24));

  return days;
}

// 시리얼 값을 생년월일로 변환하는 함수
function serialToDate(serial) {
  const excelStartDate = new Date(1899, 11, 30); // 1899-12-30
  const birthDate = new Date(excelStartDate.getTime() + serial * 24 * 60 * 60 * 1000);
  return birthDate;
}

// 만 나이를 계산하는 함수
function calculateAgeFromExcel(serial) {
  const birthDate = serialToDate(serial);
  const today = new Date();

  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  const dayDiff = today.getDate() - birthDate.getDate();

  // 생일이 지나지 않았으면 나이를 한 살 뺌
  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    age--;
  }

  return age;
}

// 게스트 표시 함수
function formatParticipantName(name) {
  // const participant = newLeague.players.find(p => p.id === id);
  const participant = newLeague.players.find(p => p.name === name);
  if (!participant) {
    console.error(`Participant not found for id: ${name}`);
    return "N/A";
  }
  // return participant.type === '게스트' ? `${participant.name} (G)` : participant.name;
  return participant.name;
}

// 시드 선수 카운트 함수
function countSeeds(players) {
  return players.reduce((count, player) => count + (player.seed ? 1 : 0), 0);
}

// 비시드 선수 카운트 함수
function countNoSeeds(players) {
  return players.reduce((count, player) => count + (player.seed ? 0 : 1), 0);
}

// 리그 이름 확인 함수
function appendSuffix(existingNames, newName) {
  // 이미 존재하는 이름에 대한 접미사 (A, B, C, ...) 추가 로직
  if (!existingNames.includes(newName)) {
    return newName;
  }

  let suffix = 'A';
  let modifiedName = newName + suffix;

  // 만약 modifiedName도 존재한다면, 접미사를 B, C, ... 로 변경
  while (existingNames.includes(modifiedName)) {
    suffix = String.fromCharCode(suffix.charCodeAt(0) + 1); // 'A' 다음은 'B'
    modifiedName = newName + suffix;
  }

  return modifiedName;
}

// 리그 복사 함수
function addLeague(newLeague) {
  // leagues 배열에서 모든 이름 추출
  const existingNames = leagues.map(league => league.name);
  
  // 새 리그 이름이 중복되는지 검사하고 접미사 추가
  newLeague.name = appendSuffix(existingNames, newLeague.name);
  
  // leagues 배열에 추가
  leagues.push({...newLeague});
}

function getMaxSeeds(format, playerCount) {
  if (format === "한울AA") {
      if (playerCount >= 6 && playerCount <= 8) return 2;
      if (playerCount >= 9 && playerCount <= 10) return 3;
      if (playerCount >= 11 && playerCount <= 14) return 4;
      if (playerCount === 15) return 5;
      if (playerCount === 16) return 6;
  } else if (format === "한울AB") {
      if (playerCount === 8) return 4;
      if (playerCount === 10) return 5;
      if (playerCount === 12) return 6;
      if (playerCount === 14) return 7;
      if (playerCount === 16) return 8;
  }
  return 0;
}

function getLeagueRankings(league) {
  const stats = league.players.map(player => ({
    name: player.name,
    age: player.name.endsWith('G') ? 45292 : members.find(member => member.name === player.name).birth, 
    wins: 0,
    losses: 0,
    winGames: 0,
    loseGames: 0,
    gapWinLoss: 0
  }));

  league.matches.forEach(match => {
    if (match.score) {
      const [team1Score, team2Score] = match.score.split(':').map(Number);

      const team1Player1 = stats.find(stat => stat.name === match.team1[0]);
      const team1Player2 = stats.find(stat => stat.name === match.team1[1]);
      const team2Player1 = stats.find(stat => stat.name === match.team2[0]);
      const team2Player2 = stats.find(stat => stat.name === match.team2[1]);

      if (team1Score > team2Score) {
        team1Player1.wins++;
        team1Player2.wins++;
        team2Player1.losses++;
        team2Player2.losses++;
      } else {
        team1Player1.losses++;
        team1Player2.losses++;
        team2Player1.wins++;
        team2Player2.wins++;
      }

      team1Player1.winGames += team1Score;
      team1Player2.winGames += team1Score;
      team2Player1.winGames += team2Score;
      team2Player2.winGames += team2Score;

      team1Player1.loseGames += team2Score;
      team1Player2.loseGames += team2Score;
      team2Player1.loseGames += team1Score;
      team2Player2.loseGames += team1Score;
    }
  });

  stats.forEach(stat => {
    stat.gapWinLoss = stat.winGames - stat.loseGames;
  });

  stats.sort((a, b) =>
    (b.wins - a.wins) ||
    (b.gapWinLoss - a.gapWinLoss) ||
    (b.winGames - a.winGames) ||
    (b.age - a.age)
  );

  stats.sort((a, b) => {
    if (b.wins !== a.wins) {
      return b.wins - a.wins;
    } else if (b.gapWinLoss !== a.gapWinLoss) {
      return b.gapWinLoss - a.gapWinLoss;
    } else if (b.winGames !== a.winGames) {
      return b.winGames - a.winGames;
    } else {
      return a.age - b.age;
    }
  });

  return stats;
}

// 밥값 순위 계산 함수
// function getMoneyRankings(leagues) {
//   let results = [];

//   leagues.forEach((league, index) => {
//     const leagueRankings = getLeagueRankings(league);

//     leagueRankings.forEach(ranking => {
//       let row = {};

//       row.name = ranking.name;
//       row.score = Math.round(((ranking.wins * 100) + ranking.gapWinLoss + (ranking.winGames * 0.1) + (calculateAgeFromExcel(ranking.age) * 0.01)) * 100) / 100;
//       row.league = league.name;
//       row.losses = ranking.losses;

//       results.push(row);
//     });
//   });
//   // console.log('밦값 순위: ', results);
//   return results;
// }

function getMoneyRankings(leagues) {
  let results = [];

  leagues.forEach((league, index) => {
    const leagueRankings = getLeagueRankings(league);

    leagueRankings.forEach(ranking => {
      let row = {};
      let targetRow = {};
      console.log('results:', results);
      console.log('results 길이:', results.length);
      if (results.length != 0) {
        console.log('이름비교')
        console.log(ranking.name)
        targetRow = results.find(result => result.name == ranking.name);
      } else {
        targetRow = undefined;
      }

      console.log('targetRow:', targetRow);

      if(targetRow === undefined) {
        row.name = ranking.name;
        console.log('나이 계산:', ranking.age);
        if(row.name == '이근희') {
          console.log('승수', ranking.wins);
          console.log('득실차', ranking.gapWinLoss);
          console.log('득', ranking.winGames);
          console.log('나이', calculateAgeFromExcel(ranking.age));
        }
        row.score = Math.round(((ranking.wins * 100) + ranking.gapWinLoss + (ranking.winGames * 0.1) + (calculateAgeFromExcel(ranking.age) * 0.01)) * 100) / 100;
        row.league = league.name;
        row.losses = ranking.losses;
        results.push(row);
      } else {
        console.log(targetRow);
        const newScore = Math.round(((ranking.wins * 100) + ranking.gapWinLoss + (ranking.winGames * 0.1) + (calculateAgeFromExcel(ranking.age) * 0.01)) * 100) / 100;
        console.log('기존 점수: ', targetRow.score);
        console.log('새 점수: ', newScore);
        targetRow.score = (targetRow.score > newScore) ? targetRow.score : newScore; 
        targetRow.league += league.name;
        row.losses += ranking.losses;
      }
    });
  });
  console.log('밦값 계산 디버깅');
  console.log(results);

  return results;
}

function getLeagueRanking(league) {

  // 초기화
  league.players.forEach(player => {
    player.wins = 0;
    player.losses = 0;
    player.totalScore = 0;
    player.totalLostScore = 0;
    player.matchPlayed = 0;
  });

  // 매치 결과를 반영
  league.matches.forEach(match => {
    if (match.score) {
      const [team1Score, team2Score] = match.score.split(':').map(Number);

      const team1Player1 = league.players.find(p => p.name === match.team1[0]);
      const team1Player2 = league.players.find(p => p.name === match.team1[1]);
      const team2Player1 = league.players.find(p => p.name === match.team2[0]);
      const team2Player2 = league.players.find(p => p.name === match.team2[1]);

      if (team1Score > team2Score) {
        team1Player1.wins++;
        team1Player2.wins++;
        team2Player1.losses++;
        team2Player2.losses++;
      } else {
        team1Player1.losses++;
        team1Player2.losses++;
        team2Player1.wins++;
        team2Player2.wins++;
      }

      team1Player1.totalScore += team1Score;
      team1Player2.totalScore += team1Score;
      team2Player1.totalScore += team2Score;
      team2Player2.totalScore += team2Score;

      team1Player1.totalLostScore += team2Score;
      team1Player2.totalLostScore += team2Score;
      team2Player1.totalLostScore += team1Score;
      team2Player2.totalLostScore += team1Score;

      team1Player1.matchPlayed++;
      team1Player2.matchPlayed++;
      team2Player1.matchPlayed++;
      team2Player2.matchPlayed++;
    }
  });

  // 순위 정렬
  const sortedPlayers = league.players.sort((a, b) => {
    if (b.wins !== a.wins) {
      return b.wins - a.wins;
    }
    return (b.totalScore - b.totalLostScore) - (a.totalScore - a.totalLostScore);
  });

  // 순위 부여
  sortedPlayers.forEach((player, index) => {
    player.rank = index + 1;
  });

  return sortedPlayers;
}

// 회원 데이터 전역 변수
let members = readExcelFile(memberFilePath).sort((a, b) => a.name.localeCompare(b.name));
let courts = [];
let newLeague = {};
let leagues = [];

/**
 * 테스트 데이터
 */
leagues = [
  {
    format: '한울AA',
    type: '주말리그',
    date: '2024-07-22',
    court: '수원북중',
    name: '테스트리그1',
    players: [
      { name: '이근희', type: '회원', seed: '선수1' },
      { name: '이동주', type: '회원', seed: '선수2' },
      { name: '이병훈', type: '회원', seed: '선수3' },
      { name: '이서현', type: '회원', seed: '선수4' }
    ],
    people: 4,
    seedPeople: 0,
    noSeedPeople: 4,
    matches: [
      { team1: [ '이근희', '이서현' ], team2: [ '이동주', '이병훈' ], score: '6:3' },
      { team1: [ '이근희', '이동주' ], team2: [ '이서현', '이병훈' ], score: '1:6' },
      { team1: [ '이근희', '이병훈' ], team2: [ '이서현', '이동주' ], score: '6:2' },
      { team1: [ '이근희', '이동주' ], team2: [ '이서현', '이병훈' ] }
    ],
    manager: '박민규'
  },
  {
    manager: '박민규',
    format: '한울AB',
    type: '분기대회',
    date: '2024-07-22',
    court: '수원북중',
    name: '테스트리그2',
    players: [
      { name: '이근희', type: '회원', seed: '선수1' },
      { name: '이동주', type: '회원', seed: '시드1' },
      { name: '이병훈', type: '회원', seed: '선수2' },
      { name: '강호동G', type: '게스트', seed: '시드2' }
    ],
    people: 4,
    seedPeople: 2,
    noSeedPeople: 2,
    matches: [
      { team1: [ '이근희', '강호동G' ], team2: [ '이동주', '이병훈' ], score: '6:3' },
      { team1: [ '이근희', '이동주' ], team2: [ '강호동G', '이병훈' ], score: '2:6' },
      { team1: [ '이근희', '이병훈' ], team2: [ '강호동G', '이동주' ], score: '6:5' },
      { team1: [ '이근희', '이동주' ], team2: [ '강호동G', '이병훈' ], score: '6:3' }
    ],
    manager: '박민규'
  }
];

// 리그 페이지
router.get('/', (req, res) => {
  if(req.isAuthenticated()) {
    res.render('pages/league/league-main', {
      leagues,
      userName: req.user.name,
      userRole: req.user.role
    });
  } else {
    res.redirect('/login');
  }
});

// 리그 상세 페이지
router.get('/detail', (req, res) => {
  if(req.isAuthenticated()) {
    const leagueIndex = req.query.leagueIndex;
    const league = leagues[leagueIndex];
    const leaguePlayers = league.players.map(player => player.name);
    const players = [...new Set([
      ...league.players.map(player => player.name),
      ...members.map(member => member.name)
    ])];
    const rankingTest = getLeagueRankings(league);
    

    courts = [...new Set(readExcelFile(courtFilePath).map(court => court.place))];
    
    console.log('****************************************')
    console.log('리그에 입장했습니다!')
    console.log('사용자 :', req.user.name);
    console.log(Date());
    console.log('****************************************')
    console.log('');
    console.log('');

    res.render('pages/league/league-detail', {
      league,
      leagueIndex,
      leagues,
      rankingTest,
      userName: req.user.name,
      userRole: req.user.role
    });
  } else {
    res.redirect('/login');
  }
});

router.get('/info', (req, res) => {
  if(req.isAuthenticated()) {
    const leagueIndex = req.query.leagueIndex;
    const league = leagues[leagueIndex];
    res.render('pages/league/league-info', {
      league,
      leagueIndex,
      userName: req.user.name,
      userRole: req.user.role
    })
  } else {
    res.redirect('/login');
  }
});

// 새 리그 기본 정보 페이지
router.get('/new/info', (req, res) => {
  if(req.isAuthenticated()) {
    courts = [...new Set(readExcelFile(courtFilePath).map(court => court.place))];

    res.render('pages/league/league-new-info', {
      members,
      courts,
      leagueType: '',
      date: '',
      court: '',
      userName: req.user.name,
      userRole: req.user.role
    });

    console.log('****************************************')
    console.log('새 리그 기본 정보 선택을 시작합니다!')
    console.log(Date());
    console.log('사용자:', req.user.name);
    console.log('****************************************')
    console.log('');
    console.log('');
  } else {
    res.redirect('/login');
  }
});

// 새 리그 기본 정보 제출
router.post('/new/info', (req, res) => {
  const { newFormat, newType, newDate, newCourt, newName } = req.body;

  newLeague.format = newFormat;
  newLeague.type = newType;
  newLeague.date = newDate;
  newLeague.court = newCourt;
  
  if (newType === '주말리그') {
    newLeague.name = '한울리그' + newDate.replace(/-/g, '').substring(2);
  } else if (newType === '분기대회') {
    newLeague.name = '한울분기' + newDate.replace(/-/g, '').substring(2);
  } else if (newType === '친선경기') {
    newLeague.name = '친선경기' + newDate.replace(/-/g, '').substring(2);
  } else {

  }
  

  res.redirect('/league/new/who');

  console.log('****************************************')
  console.log('새 리그 기본 정보 선택을 성공했습니다!')
  console.log(Date());
  console.log('사용자:', req.user.name);
  console.log('새 리그 정보:', newLeague);
  console.log('****************************************')
  console.log('');
  console.log('');
});

// 새 리그 참가자 페이지
router.get('/new/who', (req, res) => {
  const selectedFormat = newLeague.format;

  res.render('pages/league/league-new-who', {
    selectedFormat,
    members,
    selectedPlayers: newLeague.players ? newLeague.players.map(p => p.name) : [],
    userName: req.user.name,
    userRole: req.user.role
  });

  console.log('****************************************')
  console.log('새 리그 참가자 선택을 시작합니다!')
  console.log(Date());
  console.log('사용자:', req.user.name);
  console.log('****************************************')
  console.log('');
  console.log('');
});

// 새 리그 참가자 제출
router.post('/new/who', (req, res) => {
  const { memberPlayers, guestPlayers } = req.body;
  const playerList = [... new Set(Array.isArray(memberPlayers) ? memberPlayers : memberPlayers ? [memberPlayers] : [])];
  const guestList = [... new Set(Array.isArray(guestPlayers) ? guestPlayers : guestPlayers ? [guestPlayers] : [])];

  console.log('memberPlayers: ', memberPlayers)
  console.log('guestPlayers: ', guestPlayers)
  console.log('playerList: ', playerList)
  console.log('guestList: ', guestList)

  newLeague.players = [
    ...playerList.map(name => ({
      // id: name,
      name,
      type: '회원',
      seed: false
    })),
    ...guestList.map(name => ({
      // id: name + 'G',
      name: name + 'G',
      type: '게스트',
      seed: false
    }))
  ];
  newLeague.people = newLeague.players.length;

  if(newLeague.format == '한울AA') {
    if(newLeague.people < 6) {
      res.redirect('/league/new/match');
      newLeague.seedPeople = 0;
      newLeague.noSeedPeople = newLeague.people;
      for (var i = 0; i < newLeague.people; i++) {
        newLeague.players[i].seed = '선수' + (i + 1);
      }
      
    } else {
      res.redirect('/league/new/seed');
    }
  } else if(newLeague.format == '한울AB') {
    res.redirect('/league/new/seed');
    
  } else if(newLeague.format == '자유매치') {
    res.redirect('/league/new/self');
  } else { /* no actions */ }

  console.log('****************************************')
  console.log('새 리그 참가자 선택을 성공했습니다!')
  console.log(Date());
  console.log('사용자: ', req.user.name);
  console.log('새 리그 총원: ', newLeague.people);
  console.log('새 리그 참가자:', newLeague.players);
  console.log('****************************************')
  console.log('');
  console.log('');
});

// 새 리그 시드 페이지
router.get('/new/seed', (req, res) => {
  const selectedPlayers = newLeague.players;
  const selectedFormat = newLeague.format;
  const maxSeeds = getMaxSeeds(newLeague.format, newLeague.people);

  res.render('pages/league/league-new-seed', {
    selectedFormat,
    selectedPlayers,
    people: newLeague.people,
    maxSeeds,
    userName: req.user.name,
    userRole: req.user.role
  });

  console.log('****************************************')
  console.log('새 리그 시드 선택을 시작합니다!')
  console.log(Date());
  console.log('사용자: ', req.user.name);
  console.log('****************************************')
  console.log('');
  console.log('');
});

// 새 리그 시드 제출
router.post('/new/seed', (req, res) => {
  const { seeds, courtCount } = req.body;
  const newSeed = JSON.parse(req.body.newSeed);
  const maxSeeds = getMaxSeeds(newLeague.format, newLeague.people);

  console.log('newSeed:', newSeed);
  // console.log('Seeds:', seeds);
  // if (newLeague.people > 5) {
  //   newLeague.players.forEach(player => {
  //     player.seed = seeds && seeds[player.name] !== undefined;
  //   });
  // }

  if (newLeague.players.length === 12) {
    newLeague.courtCount = courtCount; // 코트 수 저장
  }

  // newLeague.seedPeople = countSeeds(newLeague.players);
  // newLeague.noSeedPeople = countNoSeeds(newLeague.players);

  newLeague.players = newSeed;
  newLeague.seedPeople = maxSeeds;
  newLeague.noSeedPeople = newLeague.people - maxSeeds;

  console.log('after seed:', newLeague);
  res.redirect('/league/new/match');
  console.log(Date(), '새 리그 시드 선택을 성공했습니다!')
  console.log('새 리그 정보 :');
  console.log(newLeague);
});

// 새 리그 매치 페이지
router.get('/new/match', (req, res) => {
  const people = newLeague.people;
  const format = newLeague.format;
  let filePath;
  let sheetName = `${people}play`;

  // 코트 수에 따라 시트 이름 변경
  if (format == '한울AA') {
    filePath = hanulAaFilePath;
    if (people === 12) {
      sheetName = newLeague.courtCount === '2' ? '12play2crt' : '12play3crt';
    }
  }
  if (format == '한울AB') {
    filePath = hanulAbFilePath;
  }
  const workbook = xlsx.readFile(filePath);
  const worksheet = workbook.Sheets[sheetName];

  if (!worksheet) {
    return res.status(400).send(`매치 리스트를 생성할 수 없습니다. (${sheetName} 탭을 찾을 수 없음)`);
  }

  // 참가자 매핑
  const playerMapping = {};
  const seedData = xlsx.utils.sheet_to_json(worksheet, { range: `A1:B${people + 1}`, header: 1 });

  // if (people === 4 || people === 5) {
  //   // 시드 없이 순서대로 매핑
  //   // let allPlayers = newLeague.players.map(player => player.id);
  //   let allPlayers = newLeague.players.map(player => player.name);
  //   seedData.slice(1).forEach(row => {
  //     const [, player] = row;
  //     playerMapping[player] = allPlayers.shift() || "N/A";
  //   });
  // } else {
  //   // 시드와 비시드 매핑
  //   const seedPlayer = newLeague.players.filter(player => player.seed).map(player => player.name);
  //   const noSeedPlayer = newLeague.players.filter(player => !player.seed).map(player => player.name);
  //   let seedIndex = 0;
  //   let noSeedIndex = 0;

  //   seedData.slice(1).forEach(row => {
  //     const [num, player] = row;
  //     if (num && player) {
  //       if (num.startsWith('시드')) {
  //         playerMapping[player] = seedPlayer[seedIndex] ? seedPlayer[seedIndex++] : noSeedPlayer[noSeedIndex++] || "N/A";
  //       } else if (num.startsWith('비시드')) {
  //         playerMapping[player] = noSeedPlayer[noSeedIndex] ? noSeedPlayer[noSeedIndex++] : seedPlayer[seedIndex++] || "N/A";
  //       }
  //     }
  //   });
  // }

  let index;
  const playerNames = newLeague.players.map(player => player.name);
  const playerSeeds = newLeague.players.map(player => player.seed);

  seedData.slice(1).forEach(row => {
      const [seed, player] = row;

      for(var i = 0; i < newLeague.people; i++) {
        if(seed == playerSeeds[i]) {
          playerMapping[player] = playerNames[i];
        }
      }

      // if(seed && player) {
      //   if(seed == newLeague.player[index].seed) {
      //     playerMapping[player] = newLeague.player[index].name;
      //     index++;
      //   }
      // }
  });

  // console.log('Participant Mapping:', playerMapping);

  // 매핑 결과 디버깅
  newLeague.players.forEach(player => {
    console.log(`Name: ${player.name}, Type: ${player.type}, Seed: ${player.seed}`);
  });

  // 매치 리스트 생성
  const matchData = xlsx.utils.sheet_to_json(worksheet, { range: `D1:G${people + 1}`, header: 1 });
  const matchTable = matchData.slice(1).map(row => ({
    team1: [
      playerMapping[row[0]] ? formatParticipantName(playerMapping[row[0]]) : "N/A",
      playerMapping[row[1]] ? formatParticipantName(playerMapping[row[1]]) : "N/A"
    ],
    team2: [
      playerMapping[row[2]] ? formatParticipantName(playerMapping[row[2]]) : "N/A",
      playerMapping[row[3]] ? formatParticipantName(playerMapping[row[3]]) : "N/A"
    ]
  }));

  newLeague.matches = matchTable;

  // console.log('Participants:', newLeague.players); // 참가자 리스트 출력
  // console.log('Match Table:', matchTable); // 매치 리스트 출력

  res.render('pages/league/league-new-match', {
    league: newLeague,
    matchTable,
    userName: req.user.name,
    userRole: req.user.role
  });

  console.log('****************************************')
  console.log('새 리그 확정을 시작합니다!')
  console.log(Date());
  console.log('사용자: ', req.user.name);
  console.log('새 리그 매치 테이블: ', newLeague.matches);
  console.log('****************************************')
  console.log('');
  console.log('');
});

// 새 리그 매치 제출
router.post('/new/match', (req, res) => {
  newLeague.manager = req.user.name;
  addLeague(newLeague);
  console.log('leagues:', leagues);
  res.redirect('/league');
});

// 새 리그 자유 매치 페이지
router.get('/new/self', (req, res) => {
  const selectedPlayers = newLeague.players;
  const people = newLeague.people;
  console.log(selectedPlayers);
  res.render('pages/league/league-new-self', {
    selectedPlayers,
    people,
    userName: req.user.name,
    userRole: req.user.role
  })
});

// 새 리그 자유 매치 제출
router.post('/new/self', (req, res) => {
  // const matchTable = JSON.parse(req.body.matches);
  const newMatches = JSON.parse(req.body.newMatches);
  console.log(newMatches);
  newLeague.matches = newMatches;

  addLeague(newLeague);
  res.redirect('/league');
});

// 리그 수정 페이지
router.get('/edit', (req, res) => {
  const leagueIndex = req.query.leagueIndex;
  const league = leagues[leagueIndex];
  const leaguePlayers = league.players.map(player => player.name);
  const players = [...new Set([
    ...league.players.map(player => player.name),
    ...members.map(member => member.name)
  ])];

  courts = [...new Set(readExcelFile(courtFilePath).map(court => court.place))];
  
  console.log('****************************************')
  console.log('리그 변경을 시작합니다!')
  console.log('사용자 :', req.user.name);
  console.log('수정 타겟 :', league.name);
  console.log('수정 전 매치 :', league.matches);
  console.log(Date());
  console.log('****************************************')
  console.log('');
  console.log('');

  res.render('pages/league/league-edit', {
    leagueIndex,
    league,
    players,
    courts,
    userName: req.user.name,
    userRole: req.user.role
  });
});

// 리그 변경 제출
router.post('/edit', (req, res) => {
  const leagueIndex = req.body.leagueIndex;
  const editType = req.body.editType;
  const editDate = req.body.editDate;
  const editCourt = req.body.editCourt;
  const editMatches = JSON.parse(req.body.editMatches);
  const existingNames = leagues.map(league => league.name);
  let newName;

  if (editType === '주말리그') {
    newName = '한울리그' + editDate.replace(/-/g, '').substring(2);
  } else if (editType === '분기대회') {
    newName = '한울분기' + editDate.replace(/-/g, '').substring(2);
  } else if (newType === '친선경기') {
    newName = '친선경기' + editDate.replace(/-/g, '').substring(2);
  } else {

  }

  const playerSet = new Set();
  editMatches.forEach(match => {
    match.team1.forEach(player => playerSet.add(player));
    match.team2.forEach(player => playerSet.add(player));
  })
  const tempPlayers = Array.from(playerSet);

  let editPlayers = leagues[leagueIndex].players;

  // 기존 플레이어 리스트에서 임시 플레이어 리스트에 없는 플레이어 제거
  editPlayers = editPlayers.filter(player => tempPlayers.includes(player.name));

  // 임시 플레이어 리스트에서 기존 플레이어 리스트에 없는 플레이어 추가
  tempPlayers.forEach(name => {
      if (!editPlayers.some(player => player.name === name)) {
        editPlayers.push({ name: name, type: '회원', seed: '선수추가' });
      }
  });

  // console.log('기존 플레이어리스트:', leagues[leagueIndex].players);
  // console.log('임시 플레이어 리스트 :', editPlayers);

  leagues[leagueIndex].name = appendSuffix(existingNames, newName);
  leagues[leagueIndex].type = editType;
  leagues[leagueIndex].date = editDate;
  leagues[leagueIndex].court = editCourt;
  leagues[leagueIndex].matches = editMatches;
  leagues[leagueIndex].players = editPlayers;
  leagues[leagueIndex].people = editPlayers.length;
  leagues[leagueIndex].seedPeople = editPlayers.filter(player => player.seed.startsWith('시드')).length;
  leagues[leagueIndex].noSeedPeople = editPlayers.filter(player => player.seed.startsWith('선수')).length;

  console.log('****************************************')
  console.log('리그 변경을 성공했습니다!')
  console.log('사용자 :', req.user.name);
  console.log('수정 타겟 :', leagues[leagueIndex].name);
  console.log('수정 후 매치 :', leagues[leagueIndex].matches);
  console.log(Date());
  console.log('****************************************')
  console.log('');
  console.log('');

  res.redirect(`/league/detail?leagueIndex=${leagueIndex}`);
});

// 리그 점수 입력 페이지
router.get('/score', (req, res) => {
  if(req.isAuthenticated()) {
    const { leagueIndex, matchIndex } = req.query;
    const league = leagues[leagueIndex];
    const match = league.matches[matchIndex];
  
    if (!league || !match) {
      return res.status(404).send('매치를 찾을 수 없습니다.');
    }
  
    res.render('pages/league/league-score', {
      leagueIndex,
      matchIndex,
      match,
      leagueName : league.name,
      leaguePlayers: league.players,
      userName: req.user.name,
      userRole: req.user.role
    });
  } else {
    res.redirect('/login');
  }
});

// 리그 점수 제출
router.post('/score', (req, res) => {
  const { leagueIndex, matchIndex, team1Score, team2Score } = req.body;
  const league = leagues[leagueIndex];
  const match = league.matches[matchIndex];

  if (!league || !match) {
    return res.status(404).send('매치를 찾을 수 없습니다.');
  }

  // 점수 입력 유효성 검사
  if (
    (team1Score !== '6' && team2Score !== '6') ||
    (team1Score === '6' && team2Score === '6')
  ) {
    res.redirect(`/league/score?leagueIndex=${leagueIndex}&matchIndex=${matchIndex}&error=invalid_score`);
  } else {
    match.score = `${team1Score}:${team2Score}`;
    res.redirect(`/league/detail?leagueIndex=${leagueIndex}`);
    console.log(leagues[0].matches);
  }
});

// 리그 순위 페이지
router.get('/ranking', (req, res) => {
  const leagueIndex = req.query.leagueIndex;
  const league = leagues[leagueIndex];

  if (!league) {
    return res.status(404).send('리그를 찾을 수 없습니다.');
  }

  // 초기화
  league.players.forEach(player => {
    player.wins = 0;
    player.losses = 0;
    player.totalScore = 0;
    player.totalLostScore = 0;
    player.matchPlayed = 0;
  });

  // 매치 결과를 반영
  league.matches.forEach(match => {
    if (match.score) {
      const [team1Score, team2Score] = match.score.split(':').map(Number);

      const team1Player1 = league.players.find(p => p.name === match.team1[0]);
      const team1Player2 = league.players.find(p => p.name === match.team1[1]);
      const team2Player1 = league.players.find(p => p.name === match.team2[0]);
      const team2Player2 = league.players.find(p => p.name === match.team2[1]);

      if (team1Score > team2Score) {
        team1Player1.wins++;
        team1Player2.wins++;
        team2Player1.losses++;
        team2Player2.losses++;
      } else {
        team1Player1.losses++;
        team1Player2.losses++;
        team2Player1.wins++;
        team2Player2.wins++;
      }

      team1Player1.totalScore += team1Score;
      team1Player2.totalScore += team1Score;
      team2Player1.totalScore += team2Score;
      team2Player2.totalScore += team2Score;

      team1Player1.totalLostScore += team2Score;
      team1Player2.totalLostScore += team2Score;
      team2Player1.totalLostScore += team1Score;
      team2Player2.totalLostScore += team1Score;

      team1Player1.matchPlayed++;
      team1Player2.matchPlayed++;
      team2Player1.matchPlayed++;
      team2Player2.matchPlayed++;
    }
  });

  // 순위 정렬
  const sortedPlayers = league.players.sort((a, b) => {
    if (b.wins !== a.wins) {
      return b.wins - a.wins;
    }
    return (b.totalScore - b.totalLostScore) - (a.totalScore - a.totalLostScore);
  });

  // 순위 부여
  sortedPlayers.forEach((player, index) => {
    player.rank = index + 1;
  });

  const rankingTest = getLeagueRankings(league);

  res.render('pages/league/league-ranking', {
    league,
    rankingTest,
    players: sortedPlayers,
    userName: req.user.name,
    userRole: req.user.role
  });
});

// 리그 간식 점수 페이지
router.get('/snack', (req, res) => {
  const leagueIndex = req.query.leagueIndex;
  const league = leagues[leagueIndex];
  const snackScores = league.snackScores || [];

  res.render('pages/league/league-snack', {
    members,
    leagueName: league.name,
    leagueIndex,
    // snackScores: JSON.stringify(snackScores)
    snackScores,
    userName: req.user.name,
    userRole: req.user.role
  });
});

// 리그 간식 점수 제출
router.post('/snack', (req, res) => {
  const leagueIndex = req.body.leagueIndex;
  const snackScores = JSON.parse(req.body.snackScores);
  const league = leagues[leagueIndex];

  league.snackScores = snackScores;

  res.redirect(`/league/detail?leagueIndex=${leagueIndex}`);
  console.log('snackTest:', league);

});

// 리그 밥값 페이지
router.get('/meal', (req, res) => {
  if(req.isAuthenticated()) {
    let leagueRankings = [];

    leagues.forEach((league, index) => {
      const leagueRanking = getLeagueRankings(league);
      leagueRankings.push(leagueRanking);
      leagueRankings[index].name = league.name;
    })
  
    const moneyRankings = getMoneyRankings(leagues);
    console.log(moneyRankings);
  
    res.render('pages/league/league-meal', {
      userName: req.user.name,
      userRole: req.user.role,
      leagueRankings,
      moneyRankings
    });
  } else {
    res.redirect('/login');
  }
 
});

// 리그 종료 페이지
router.get('/end', (req, res) => {
  const leagueIndex = req.query.leagueIndex;
  const league = leagues[leagueIndex];

  if (!league) {
    return res.status(404).send('리그를 찾을 수 없습니다.');
  }

  // 초기화
  league.players.forEach(player => {
    player.wins = 0;
    player.losses = 0;
    player.totalScore = 0;
    player.totalLostScore = 0;
    player.matchPlayed = 0;
  });

  // 매치 결과를 반영
  league.matches.forEach(match => {
    if (match.score) {
      const [team1Score, team2Score] = match.score.split(':').map(Number);

      const team1Player1 = league.players.find(player => player.name === match.team1[0]);
      const team1Player2 = league.players.find(player => player.name === match.team1[1]);
      const team2Player1 = league.players.find(player => player.name === match.team2[0]);
      const team2Player2 = league.players.find(player => player.name === match.team2[1]);

      if (team1Score > team2Score) {
        team1Player1.wins++;
        team1Player2.wins++;
        team2Player1.losses++;
        team2Player2.losses++;
      } else {
        team1Player1.losses++;
        team1Player2.losses++;
        team2Player1.wins++;
        team2Player2.wins++;
      }

      team1Player1.totalScore += team1Score;
      team1Player2.totalScore += team1Score;
      team2Player1.totalScore += team2Score;
      team2Player2.totalScore += team2Score;

      team1Player1.totalLostScore += team2Score;
      team1Player2.totalLostScore += team2Score;
      team2Player1.totalLostScore += team1Score;
      team2Player2.totalLostScore += team1Score;

      team1Player1.matchPlayed++;
      team1Player2.matchPlayed++;
      team2Player1.matchPlayed++;
      team2Player2.matchPlayed++;
    }
  });

  // 순위 정렬
  const sortedPlayers = league.players.sort((a, b) => {
    if (b.wins !== a.wins) {
      return b.wins - a.wins;
    }
    return (b.totalScore - b.totalLostScore) - (a.totalScore - a.totalLostScore);
  });

  // 순위 부여
  sortedPlayers.forEach((player, index) => {
    player.rank = index + 1;
  });

  const leagueRanking = getLeagueRankings(league);

  res.render('pages/league/league-end', {
    leagueIndex,
    league,
    leagueRanking,
    players: sortedPlayers,
    userName: req.user.name,
    userRole: req.user.role
  });
});

// 리그 종료 제출
router.post('/end', async (req, res) => {
  const { leagueIndex, deleteCommand } = req.body;

  if (deleteCommand == "true") {
    console.log(deleteCommand)
    leagues.splice(leagueIndex, 1);
    res.redirect('/league');
  } else if (deleteCommand == "false") {
    try {
      const leagueData = leagues[leagueIndex];
      const leagueWorkbook = new ExcelJS.Workbook();
      await leagueWorkbook.xlsx.readFile(leagueFilePath);
      const leagueWorksheet = leagueWorkbook.getWorksheet('Sheet1');
      const leagueRanking = getLeagueRankings(leagueData);
      const fourWins = leagueRanking.filter(ranking => ranking.wins == 4).map(player => player.name).join('/');
      const managerComment = req.body.managerComment;
  
      const snackScoresString = (leagueData.snackScores || []).map(snackScore => `${snackScore.name}:${snackScore.score}:${snackScore.remark}`).join('/');
      const seedString = (leagueData.players || []).filter(player => player.seed.startsWith('시드')).map(player => player.name).join('/');
      const noSeedString = (leagueData.players || []).filter(player => player.seed.startsWith('선수')).map(player => player.name).join('/');
  
      leagueWorksheet.addRow([
        dateStringToExcel(leagueData.date),
        leagueData.name,
        leagueData.type,
        leagueData.format,
        leagueData.court,
        leagueData.people,
        seedString,
        noSeedString,
        snackScoresString,
        fourWins,
        leagueData.manager,
        managerComment
      ]);
  
      await leagueWorkbook.xlsx.writeFile(leagueFilePath);
      console.log('leagues.xlsx 업데이트 성공!');
  
      // macthes.xlsx 업데이트
      const matchWorkbook = new ExcelJS.Workbook();
      await matchWorkbook.xlsx.readFile(matchFilePath);
      const matchWorksheet = matchWorkbook.getWorksheet('Sheet1');
  
      // 리그 데이터를 엑셀 파일에 추가
      leagueData.matches.forEach((match, index) => {
        const [team1Score, team2Score] = match.score ? match.score.split(':').map(Number) : [null, null];
  
        if ((team1Score == null) && (team2Score == null)) {
          // 진행하지 않은 경기는 저장하지 않음
        } else {
          const winPlayers = team1Score > team2Score ? match.team1 : match.team2;
          const losePlayers = team1Score > team2Score ? match.team2 : match.team1;
          const winScore = team1Score > team2Score ? team1Score : team2Score;
          const loseScore = team1Score > team2Score ? team2Score : team1Score;
  
          matchWorksheet.addRow([
            dateStringToExcel(leagueData.date),
            leagueData.name,
            leagueData.type,
            leagueData.court,
            index + 1,
            winPlayers[0],
            winPlayers[1],
            losePlayers[0],
            losePlayers[1],
            winScore,
            loseScore
          ]);
        }
      });
  
      await matchWorkbook.xlsx.writeFile(matchFilePath);
      console.log('matches.xlsx 업데이트 성공!');
  
      // 리그 데이터 삭제
      leagues.splice(leagueIndex, 1);
  
      res.redirect('/league');
    } catch (error) {
      console.error('Error saving league data:', error);
      res.status(500).send('리그 데이터를 저장하는 중 오류가 발생했습니다.');
    }
  } else {

  }

});

module.exports = router;
