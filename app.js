const http = require('http');
const https = require('https');
const fs = require('fs');
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const methodOverride = require('method-override');
const rankingRoutes = require('./routes/ranking');
const leagueRoutes = require('./routes/league');
const historyRoutes = require('./routes/history');
const adminRoutes = require('./routes/admin');
const boardRoutes = require('./routes/board');

const {
  readGoogleSheet,
  writeGoogleSheet,
  rankingSheets,
  tourSheets,
  leagueSheets,
  matchSheets,
  memberSheets,
} = require('./routes/googleSheet');

const app = express();

const session = require('express-session')
const passport = require('passport')
const LocalStrategy = require('passport-local')

const options = {
  key: fs.readFileSync('public/path/to/private.key'),
  cert: fs.readFileSync('public/path/to/certificate.crt')
};

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
  const members = await readGoogleSheet(memberSheets, 'active');
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
app.use('/board', boardRoutes);

app.get('/', (req, res) => {
  if(req.isAuthenticated()) {
    res.redirect('/league');
  } else {
    res.redirect('/login');
  }
  
});

app.get('/login', async (req, res) => {
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

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  Array(5).fill('').forEach(() => console.log(''));
  console.log('**************************************************')
  console.log(Date());
  console.log('Server starts')
  console.log(`Server is running on port ${PORT}`);
  console.log('**************************************************')
});
