const http = require('http');
const https = require('https');
const fs = require('fs');
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const methodOverride = require('method-override');
const xlsx = require('xlsx');
const rankingRoutes = require('./routes/ranking');
const leagueRoutes = require('./routes/league');
const historyRoutes = require('./routes/history');
const adminRoutes = require('./routes/admin');
const noticeRoutes = require('./routes/notice');

const app = express();

const session = require('express-session')
const passport = require('passport')
const LocalStrategy = require('passport-local')

const { MongoClient } = require('mongodb')

let db
const url = 'mongodb+srv://admin:gksdnfxkfl2007@hanultari-tennis.0rzdd.mongodb.net/?retryWrites=true&w=majority&appName=Hanultari-Tennis'
new MongoClient(url).connect().then((client)=>{
  console.log('DB연결성공')
  db = client.db('hanultari')
}).catch((err)=>{
  console.log(err)
})

// 엑셀 파일 읽는 함수
const readExcelFile = (filePath) => {
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(worksheet);
  return data;
};

const options = {
  key: fs.readFileSync('public/path/to/private.key'),
  cert: fs.readFileSync('public/path/to/certificate.crt')
};

const memberFilePath = path.join(__dirname, 'database', 'member.xlsx');

app.use(passport.initialize())
app.use(session({
  secret: '한울타리 테니스 클럽',
  resave : false,
  saveUninitialized : false,
  cookie : { maxAge : 12 * 60 * 60 * 1000 }
}))

app.use(passport.session()) 

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(methodOverride('_method'));


// Passport Local Strategy 설정
passport.use(new LocalStrategy(async (username, password, done) => {
  const members = readExcelFile(memberFilePath).map(row => {
    return {
      name: row.name,
      password: row.password,
      role: row.role
    };
  });
  
  const member = members.find(member => member.name == username);

  if (!member) {
    return done('wrongUsername', false, { message: '회원이 아닙니다!' });
  }
  if (member.password != password) {
    return done('wrongPassword', false, { message: '비밀번호가 틀립니다!' });
  }

  return done(null, member);
}));

// 사용자 직렬화
passport.serializeUser((user, done) => {
  console.log(user);
  process.nextTick(() => {
    done(null, { name: user.name, role: user.role });
  });
});

// 사용자 역직렬화
passport.deserializeUser((user, done) => {
  process.nextTick(() => {
    return done(null, user)
  })
})

app.use('/ranking', rankingRoutes);
app.use('/league', leagueRoutes);
app.use('/history', historyRoutes);
app.use('/admin', adminRoutes);
app.use('/notice', noticeRoutes);

app.get('/', (req, res) => {
  if(req.isAuthenticated()) {
    res.redirect('/league');
  } else {
    res.redirect('/login');
  }
  
});

app.get('/login', (req, res) => {
  if(req.isAuthenticated()) {
    res.redirect('/league');
  } else {
    const prevUsername = req.query.prevUsername;
    const prevPassword = req.query.prevPassword;
    const whatIsWrong = req.query.whatIsWrong;

    res.render('pages/login/login', {
      userName: null,
      userRole: null,
      prevUsername,
      prevPassword,
      whatIsWrong
    });

  }
});

app.post('/login', async (req, res, next) => {
  passport.authenticate('local', (error, user, info) => {
    console.log('error:', error)
    console.log('user:', user)
    console.log('info:', info)
    if (error == 'wrongUsername') {
      res.redirect(`/login?prevUsername=${encodeURIComponent(req.body.username)}&prevPassword=${encodeURIComponent(req.body.password)}&whatIsWrong=${encodeURIComponent('wrongUsername')}`);
    } else if (error == 'wrongPassword') {
      res.redirect(`/login?prevUsername=${encodeURIComponent(req.body.username)}&prevPassword=${encodeURIComponent(req.body.password)}&whatIsWrong=${encodeURIComponent('wrongPassword')}`);
    } else {
      req.logIn(user, (err) => {
        if (err) {
          return next(err)
        }
  
        // 로그인 유지 체크박스 확인
        if (req.body.remember) {
          req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30일 유지
        } else {
          req.session.cookie.expires = false; // 브라우저 종료 시 세션 만료
        }
  
        res.redirect('/league');
      });
    }



    // if (error) return res.status(500).json(error)
    // if (!user) return res.status(401).json(info.message)
    
  })(req, res, next)
});

app.get('/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    req.session.destroy((err) => {
      if (err) {
        return next(err);
      }
      res.redirect('/login'); // 로그아웃 후 로그인 페이지로 리디렉션
    });
  });
});

app.get('/test1', (req, res) => {
  db.collection('member').insertOne({title:'박민규'})

})



// app.post('/login',
//   passport.authenticate('local', {
//     successRedirect: '/league',
//     failureRedirect: '/login',
//     failureFlash: false
//   })
// );

/* 포팅 임시 비활성화
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

// app.listen(PORT, HOST, () => {
//   console.log(`Server is running on http://${HOST}:${PORT}`);
// });

https.createServer(options, app).listen(443, () => {
  console.log('HTTPS Server running on port 443');
});

// HTTP 서버에서 HTTPS로 리디렉션
const httpApp = express();
httpApp.use((req, res, next) => {
  if (req.secure) {
    next();
  } else {
    res.redirect(`https://${req.headers.host}${req.url}`);
  }
});


// HTTP 서버 실행 (포트 80)
http.createServer(httpApp).listen(80, () => {
  console.log('HTTP Server running on port 80 and redirecting to HTTPS');
});
*/



const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

