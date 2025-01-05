// routes/notices.js
const express = require('express');
const router = express.Router();
const path = require('path');
const xlsx = require('xlsx');
const ExcelJS = require('exceljs');
const { format, parseISO, isValid } = require('date-fns');
const { read } = require('fs');

// 엑셀 파일 경로
const memberFilePath = path.join(__dirname, '../database', 'member.xlsx');
const noticeExcelPath = path.join(__dirname, '../database/notice.xlsx');
const postExcelPath = path.join(__dirname, '../database/post.xlsx');
const elbumExcelPath = path.join(__dirname, '../database/elbum.xlsx');
const commentExcelPath = path.join(__dirname, '../database/comment.xlsx');

// 엑셀 파일 읽기
const readExcelFile = (filePath) => {
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(worksheet);
  return data;
};

// 날짜 변환 함수
const convertExcelDate = (excelDate) => {
    const jsDate = new Date((excelDate - (25567 + 2)) * 86400 * 1000);
    return isValid(jsDate) ? jsDate : parseISO(excelDate);
};

// 공지 리스트 페이지 렌더링
router.get('/', (req, res) => {
  if(req.isAuthenticated()) {
    let members = readExcelFile(memberFilePath);
    let rawNotice = readExcelFile(noticeExcelPath);
    let rawPost = readExcelFile(postExcelPath);
    let rawElbum = readExcelFile(elbumExcelPath);
    let rawComment = readExcelFile(commentExcelPath);

    const notices = rawNotice.map((notice, index) => {
        return {
            noticeId: notice['id'],
            date: notice['date'],
            author: notice['author'],
            title: notice['summary'],
            content: notice['contents'],
            commentCount: rawComment.filter(comment => comment.noticeId === notice['id']).length
        };
        
    });

    const posts = rawPost.map((post, index) => {
      return {
          postId: post['id'],
          date: post['date'],
          author: post['author'],
          title: post['summary'],
          content: post['contents'],
          commentCouont: rawComment.filter(comment => comment.noticeId === post['id']).length
      };
    });
    
    res.render('pages/notice/notice', {
        notices: notices.reverse(),
        posts: posts.reverse(),
        members,
        userName : req.user.name,
        userRole: req.user.role
    });
  } else {
    res.redirect('/login');
  }
});

// 공지 작성 페이지 렌더링
router.get('/new', (req, res) => {
  if(req.isAuthenticated()) {
    res.render('pages/notice/notice-new', {
      userName : req.user.name,
      userRole: req.user.role
    });
  } else {
    res.redirect('/login');
  }
});

// 공지 상세 페이지 렌더링
router.get('/detail/:id', (req, res) => {
  const targetId = req.params.id;

  if (targetId.startsWith('n')) {
    const notices = readExcelFile(noticeExcelPath);
    const comments = readExcelFile(commentExcelPath);
    const targetNotice = notices.find(notice => notice.id == targetId);
    const targetComment = comments.filter(comment => comment.noticeId == targetId);

    res.render('pages/notice/notice-detail', {
      page: '공지사항',
      board: targetNotice,
      comments: targetComment,
      userName: req.user.name,
      userRole: req.user.role
    });
  } else if (req.params.id.startsWith('p')) {
    const posts = readExcelFile(postExcelPath);
    const comments = readExcelFile(commentExcelPath);
    const targetPost = posts.find(post => post.id == targetId);
    const targetComment = comments.filter(comment => comment.noticeId == targetId);

    res.render('pages/notice/notice-detail', {
      page: '자유게시판',
      board: targetPost,
      comments: targetComment,
      userName: req.user.name,
      userRole: req.user.role
    });
  } else {

  }
});

// 새 글 제출
router.post('/new', async (req, res) => {
    const { newDate, newAuthor, boardSelect, newSummary, newContents } = req.body;

    if (boardSelect == "공지사항") {
      const noticeWorkbook = new ExcelJS.Workbook();
      await noticeWorkbook.xlsx.readFile(noticeExcelPath);
      const noticeWorksheet = noticeWorkbook.getWorksheet('Sheet1');
      let newId;

      if (noticeWorksheet.rowCount < 2) {
        newId = 'n0001';
      } else {
        const lastId = noticeWorksheet.getRow(noticeWorksheet.rowCount).getCell(1).value;

        newId = lastId.replace(/\d+$/, (match) => {
          return (parseInt(match) + 1).toString().padStart(match.length, '0');
        });
      }

      noticeWorksheet.addRow([
        newId,
        newDate,
        newAuthor,
        newSummary,
        newContents,
        newDate
      ]);
      
      await noticeWorkbook.xlsx.writeFile(noticeExcelPath);
      console.log('notice.xlsx 업데이트 성공!');
    } else if (boardSelect == "자유게시판") {
      const postWorkbook = new ExcelJS.Workbook();
      await postWorkbook.xlsx.readFile(postExcelPath);
      const postWorksheet = postWorkbook.getWorksheet('Sheet1');
      let newId;

      if (postWorksheet.rowCount < 2) {
        newId = 'n0001';
      } else {
        const lastId = postWorksheet.getRow(postWorksheet.rowCount).getCell(1).value;

        newId = lastId.replace(/\d+$/, (match) => {
          return (parseInt(match) + 1).toString().padStart(match.length, '0');
        });
      }

      postWorksheet.addRow([
        newId,
        newDate,
        newAuthor,
        newSummary,
        newContents,
        newDate
      ]);
      
      await postWorkbook.xlsx.writeFile(postExcelPath);
      console.log('post.xlsx 업데이트 성공!');
    } else {

    }

    res.redirect('/notice');
});

// 공지 수정 페이지 렌더링
router.get('/edit/:id', (req, res) => {
  const targetId = req.params.id;

  if (targetId.startsWith('n')) {
    const notices = readExcelFile(noticeExcelPath);
    const targetNotice = notices.find(notice => notice.id == targetId);

    res.render('pages/notice/notice-edit', {
      page: '공지사항',
      board : targetNotice,
      userName: req.user.name,
      userRole: req.user.role
    });
  } else if (req.params.id.startsWith('p')) {
    const posts = readExcelFile(postExcelPath);
    const targetPost = posts.find(post => post.id == targetId);

    res.render('pages/notice/notice-edit', {
      page: '자유게시판',
      board: targetPost,
      userName: req.user.name,
      userRole: req.user.role
    });
  } else {

  }
});

// 공지 수정 처리
router.post('/edit/', async (req, res) => {
  const { targetId, editDate, editAuthor, editSummary, editContents } = req.body;

  if (targetId.startsWith('n')) {
    const noticeWorkbook = new ExcelJS.Workbook();
    await noticeWorkbook.xlsx.readFile(noticeExcelPath);
    const noticeWorksheet = noticeWorkbook.getWorksheet('Sheet1');
    let findRow = null;

    noticeWorksheet.eachRow((row, rowNumber) => {
      const boardId = row.getCell(1).value;

      if(boardId === targetId) {
        findRow = row;
      }
    });

    if (!findRow) {
      console.log('Value not found');
    } else {
      findRow.getCell(4).value = editSummary;
      findRow.getCell(5).value = editContents;
      findRow.getCell(6).value = editDate;
    }

    await noticeWorkbook.xlsx.writeFile(noticeExcelPath);
    console.log('notice.xlsx 업데이트 성공!');

  } else if (targetId.startsWith('p')) {
    const postWorkbook = new ExcelJS.Workbook();
    await postWorkbook.xlsx.readFile(postExcelPath);
    const postWorksheet = postWorkbook.getWorksheet('Sheet1');
    let findRow = null;

    postWorksheet.eachRow((row, rowNumber) => {
      const boardId = row.getCell(1).value;

      if(boardId === targetId) {
        findRow = row;
      }
    });

    if (!findRow) {
      console.log('Value not found');
    } else {
      findRow.getCell(4).value = editSummary;
      findRow.getCell(5).value = editContents;
      findRow.getCell(6).value = editDate;
    }

    await postWorkbook.xlsx.writeFile(postExcelPath);
    console.log('post.xlsx 업데이트 성공!');

  } else {

  }

  res.redirect(`/notice/detail/${targetId}`);
});

router.post('/comment', async (req, res) => {
  const { boardId, commentAuthor, commentDate, commentContents } = req.body;
  const commentWorkbook = new ExcelJS.Workbook();
  await commentWorkbook.xlsx.readFile(commentExcelPath);
  const commentWorksheet = commentWorkbook.getWorksheet('Sheet1');

  commentWorksheet.addRow([
    boardId,
    commentDate,
    commentAuthor,
    commentContents,
    commentDate
  ]);

  await commentWorkbook.xlsx.writeFile(commentExcelPath);
  console.log('comment.xlsx 업데이트 성공!');

  res.redirect(`/notice/detail/${boardId}`);

  // const createdAt = format(new Date(), 'yyyy-MM-dd');

  // const workbook = xlsx.readFile(excelPath);
  // const sheetName = workbook.SheetNames[0];
  // const sheet = workbook.Sheets[sheetName];
  // let rawComments = xlsx.utils.sheet_to_json(sheet);

  // rawComments.push({
  //     '원글ID': noticeId,
  //     '최초작성일': createdAt,
  //     '작성자': author,
  //     '내용': content,
  //     '마지막수정일': createdAt // 처음 작성할 때는 작성 날짜와 동일하게 설정
  // });

  // // 새로운 시트로 저장
  // const newSheet = xlsx.utils.json_to_sheet(rawComments);
  // workbook.Sheets[sheetName] = newSheet;
  // xlsx.writeFile(workbook, excelPath);

  // res.redirect(`/notices/${noticeId}`);
});


// 공지 삭제 처리
router.post('/delete', async (req, res) => {
  const targetId = req.body.boardId;

  const commentWorkbook = new ExcelJS.Workbook();
  await commentWorkbook.xlsx.readFile(commentExcelPath);
  const commentWorksheet = commentWorkbook.getWorksheet('Sheet1');

  let ExcelPath;
  

  if(targetId.startsWith('n')) {
    ExcelPath = noticeExcelPath;

  } else if (targetId.startsWith('p')) {
    ExcelPath = postExcelPath;

  } else {

  }

  const Workbook = new ExcelJS.Workbook();
  await Workbook.xlsx.readFile(ExcelPath);
  const Worksheet = Workbook.getWorksheet('Sheet1');
  let findRow = null;

  Worksheet.eachRow((row, rowNumber) => {
    const rowId = row.getCell(1).value;

    if(rowId === targetId) {
      Worksheet.spliceRows(rowNumber, 1);
    }
  });

  await Workbook.xlsx.writeFile(ExcelPath);
  console.log('xlsx 업데이트 성공!');
  res.redirect('/notice');

});

module.exports = router;
