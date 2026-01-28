//1. 기본 express설정
const express = require('express'); //express기본 라우팅
const app = express(); //app변수에 담기
const port = 9070; //통신포트 설정
const bcrypt = require('bcrypt'); //해시암호화를 위함
const jwt = require('jsonwebtoken'); //토큰 생성을 위함
const SECRET_KEY = 'test'; //jwt서명시 사용할 비밀 키

app.use(express.json());    //JSON본문 파싱 미들웨어

//2. 다른 시스템간 통신을 임시 허용(교차출처공유)
const cors = require('cors');
app.use(cors());

//3. mysql db정보 설정하기
const mysql = require('mysql');
const connection = mysql.createConnection({
    host:'database',
    user:'root',
    password:'1234',
    database:'kdt'
});


//5. DB접속시 에러가 나는 경우와 성공시 메세지 띄우기
connection.connect((err)=>{
    if(err){
        console.error('MySql 연결 실패 : ', err);
        return;
    }
    console.log('MySql DB연결 성공');
});

//4. npm run dev 백엔드 서버 실행시 콘솔모드에 내용 출력하기
app.listen(port, ()=>{
    console.log('Listening.....');
});

//6. 방법 1. app.get통신을 통해 테스트 해보기
// app.get('/', (req, res)=>{
//   //특정 경로로 요청된 정보를 처리
//   res.json('Excused from Backend!');
// });

//7. 방법 2. SQL쿼리문을 작성하여 데이터를 조회한 값을 화면에 출력하기
//express서버 통해 get요청하기   http://localhost/테이블명   => mysql 테이블 자료 가져와라~



////* ----- join(회원 가입) ----- *////
// join.js에서 넘겨받은 데이터가지고 회원가입
app.post('/register', async(req, res) => { //비동기
    try {
        const {username, password} = req.body;
        const hash = await bcrypt.hash(password, 10);

        connection.query(
            'INSERT INTO users (username, password) values (?, ?)',
            [username, hash], 
            (err, result) => {
                if(err){
                    // 아이디 중복 체크
                    if(err.code == 'ER_DUP_ENTRY'){
                        return res.status(400).json({error: '이미 존재하는 아이디'});
                    }
                    // 그 외 DB 쿼리 에러
                    return res.status(500).json({error: '가입 실패'});
                }
                // 가입 성공
                res.json({success: true});
            });
        } catch (error) {
            // [여기가 catch 블록입니다]
            // 서버 내부 오류 (예: bcrypt 라이브러리 문제, 변수 참조 오류 등)
            console.error('서버 내부 오류:', error);
            res.status(500).json({ error: '서버 내부 오류가 발생했습니다.' });
        }
    }
);

//로그인 폼에서 id, pw 넘겨 받은 데이터를 가지고 조회해 일치하면 토큰 생성 후 로그인 처리
app.post('/login', (req, res) => {
    const {username, password} = req.body; //프론트에서 넘어온 body태그 안의 값을 변수에 저장하기

    connection.query( //데이터 일치 조회
        'SELECT * FROM users WHERE username=?',
        [username],
        async(err, result) => {
            if(err||result.length==0){
                return res.status(401).json({
                    error: '아이디 또는 비밀번호 틀림'
                });
            }
            const user = result[0];
            const isMatch = await bcrypt.compare(password, user.password);

            // 사용자가 입력한 pw, db에 있는 pw비교
            if(!isMatch){
                return res.status(404).json({error: '아이디 또는 비밀번호 틀림'})
            }

            // 위과정에서 id, pw가 일치하면 토큰 생성 (1시간)
            const token = jwt.sign({id:user.id, username:user.username}, SECRET_KEY, {expiresIn:'1h'});

            // 토큰 발급
            res.json({token});
        }
    )
})


////* ----- contactus DB ----- *////
// contactus db check
app.get('/contactus', (req, res) => { //noodle목록 요청(req)
    connection.query(
        'SELECT * FROM contactus ORDER BY contactus.id DESC', // num값이 큰것부터(최신순) 거꾸로 줄 세우기 DESC(최신순), ASC(과거순)
        (err, result) => {
            if(err){ //에러나면 
                console.error('쿼리오류 : ', err);
                res.status(500).json({error : 'DB쿼리 오류'});
                return; //여기서 종료!
            }
            res.json(result); //오류X > json객체로 반환해서 데이터 전달
        }
    )
})

// [1] contactus db 조회/읽기 - GET(SELECT)
app.get('/contactus/:id', (req, res) => {
    const { id } = req.params;
    connection.query(
        'SELECT * FROM contactus WHERE id =?',
        [id], (err, result) => {
            if(err){
                console.log('조회오류 : ', err);
                res.status(500).json({error: '조회 실패'});
                return;
            }

            if(result.length == 0){
                res.status(404).json({error: '내용 조회 불가'});
                return;
            }
            res.json(result[0]); 
        }
    )
})


////* ----- noodel DB ----- *////
// noodle db check
app.get('/noodle', (req, res) => { //noodle목록 요청(req)
    connection.query(
        'SELECT * FROM noodle ORDER BY num DESC', // num값이 큰것부터(최신순) 거꾸로 줄 세우기 DESC(최신순), ASC(과거순)
        (err, result) => {
            if(err){ //에러나면 
                console.error('쿼리오류 : ', err);
                res.status(500).json({error : 'DB쿼리 오류'});
                return; //여기서 종료!
            }
            res.json(result); //오류X > json객체로 반환해서 데이터 전달
        }
    )
})

// get(조회, select) | put(수정, update) | delete(삭제) | post(입력, insert)

// [1] noodle db 조회/읽기 - GET(SELECT)
app.get('/noodle/:num', (req, res) => {
    const { num } = req.params;
    connection.query(
        'SELECT * FROM noodle WHERE num =?',
        [num], (err, result) => {
            if(err){
                console.log('조회오류 : ', err);
                res.status(500).json({error: '조회 실패'});
                return;
            }

            if(result.length == 0){
                res.status(404).json({error: '해당 상품 미존재'});
                return;
            }
            res.json(result[0]); 
        }
    )
})

// [2] noodle db 입력 - POST(INSERT)
app.post('/noodle', (req, res) => {
    const { name, company, kind, price, e_date } = req.body; //넘겨 받을 값
    if(!name||!company||!kind||!price||!e_date){
        return res.status(400).json({error: '필수 항목 누락'});
    }
    connection.query(
        'INSERT INTO noodle (name, company, kind, price, e_date) VALUES (?, ?, ?, ?, ?)',
        [name, company, kind, price, e_date],
        (err, result)=>{
            if(err){
                console.log('등록오류 : ', err);
                res.status(500).json({error:'상품 등록 실패'});
                return;
            }
            res.json({ success: true, insertId: result.insertId });
        }
    );
});

// [3] noodle db 삭제 - DELETE
app.delete('/noodle/:num', (req, res) => {
    const num = req.params.num;
    connection.query('DELETE FROM noodle WHERE num =?', [num], (err, result) =>{
        if(err){
            console.log('삭제 오류 : ', err);
            res.status(500).json({error:'삭제 실패'});
            return;
        }
        res.json({success:true});
    })
})


// [3] noodle db 수정 - PUT(UPDATE)
app.put('/noodle/noodleupdate/:num', (req, res) => {
    const { num } = req.params;
    const { name, company, kind, price, e_date } = req.body; // 프론트에서 보낸 데이터

    connection.query(
        'UPDATE noodle SET name=?, company=?, kind=?, price=?, e_date=? WHERE num = ?',
        [name, company, kind, price, e_date, num], (err, result) => {
        if (err) {
            console.log('수정오류 : ', err);
            return res.status(500).json({ error: '상품 수정 실패' });
        }
        res.json({ success: true });
    });
});


////* ----- bookstore DB ----- *////
// bookstore db조회
app.get('/book_store', (req, res) => {
    connection.query('SELECT * FROM book_store ORDER BY code DESC', (err, results) =>{
        if(err){
            console.error('쿼리오류 : ', err);
            res.status(500).json({error:'DB쿼리오류'});
            return;
        }
        res.json(results); //오류가 없으면 json객체로 반환
    })
})

// bookstore [1] 선택 자료 삭제
app.delete('/book_store/:code', (req, res) => {
    const code = req.params.code; //넘겨받은 code저장
    connection.query('DELETE FROM book_store WHERE code =?', [code], (err, result) =>{
        if(err){
            console.log('삭제 오류 : ', err);
            res.status(500).json({error:'삭제 실패'});
            return;
        }
        res.json({success:true});
    })
})

// bookstore [2] 입력 - [POST](INSERT)
app.post('/book_store', (req, res)=>{
    const { name, area1, area2, area3, book_cnt, owner_nm, tel_num } = req.body; //값을 넘겨받음
    if(!name||!area1||!area2||!book_cnt||!owner_nm||!tel_num){ //값이 없는 경우,
        return res.status(400).json({error: '필수 항목이 누락됨'});
    }
    connection.query( //이상없으면 쿼리문 작성 > DB입력
        'INSERT INTO book_store (name, area1, area2, area3, book_cnt, owner_nm, tel_num) VALUES (?, ?, ?, ?, ?, ?, ?)', 
        [name, area1, area2, area3, book_cnt, owner_nm, tel_num],
        (err, result)=>{
            if(err){
                console.log('등록오류 : ', err);
                res.status(500).json({error:'상품 등록 실패'});
                return;
            }
            res.json({ success: true, insertId: result.insertId });
        }
    );
});

// bookstore [3] 조회/읽기 - [GET](SELECT)
app.get('/book_store/:code', (req,res)=>{
    const {code} = req.params; //프론트에서 넘겨준 파라미터값 저장

    connection.query(
        'SELECT * FROM book_store WHERE code = ?', 
        [code], (err, result) => {
            if(err){
                console.log('조회오류 : ', err);
                res.status(500).json({err: '상조회 실패'});
                return;
            }
            if(result.length==0){
                res.status(404).json({error:'해당 상품 존재 안함'})
                return;
            }
            res.json(result[0]); //단일 객체 반혼 (1개)
        }
    )
})

// bookstore [4] 수정 - [PUT](UPDATE)
app.put('/bookstore/bookstoreupdate/:code', (req, res) => {
    const { code } = req.params;
    const { name, area1, area2, area3, book_cnt, owner_nm, tel_num } = req.body; // 프론트에서 보낸 데이터

    const sql = "UPDATE book_store SET name=?, area1=?, area2=?, area3=?, book_cnt=?, owner_nm=?, tel_num=? WHERE code = ?";
    connection.query(sql, [name, price, color, country, num], (err, result) => {
        if (err) {
            console.log('수정오류 : ', err);
            return res.status(500).json({ error: '상품 수정 실패' });
        }
        res.json({ success: true });
    });
});

////* ----- fruits DB ----- *////
// fruits db조회
app.get('/fruits', (req, res) => {
    connection.query("SELECT * FROM fruits ORDER BY fruits.num DESC", (err, result) => {
        if(err){
            console.log('쿼리문 오류 : ', err);
            res.status(500).json({error: 'DB쿼리문 오류'});
            return;
        }
        // json 데이터로 결과 저장
        res.json(result);
    })
});

// fruits [1] 선택 자료 삭제
app.delete('/fruits/:num', (req, res) => {
    const num = req.params.num; //넘겨받은 num번호 저장

    connection.query( //삭제 쿼리
        'DELETE FROM fruits WHERE num = ?',
        [num],
        (err, result) => {
            if(err){
                console.log('삭제 오류 : ', err);
                res.status(500).json({error:'상품삭제 실패'});
                return;
            }
            res.json({success:true});
        }
    );
})

// fruits [2] 입력 - 새로운 과일 추가/입력 [POST](INSERT) --- 새로운거만듦
// http요청 본문(body)에 데이터를 담아 전송 (json, xml) - 보안유리
app.post('/fruits', (req, res)=>{
    const { name, price, color, country } = req.body; //값을 넘겨받음
    if(!name||!price||!color||!country){ //값이 없는 경우,
        return res.status(400).json({error: '필수 항목이 누락됨'});
    }
    connection.query( //이상없으면 쿼리문 작성 > DB입력
        'INSERT INTO fruits (name, price, color, country) VALUES (?, ?, ?, ?)', 
        [name, price, color, country],
        (err, result)=>{
            if(err){
                console.log('등록오류 : ', err);
                res.status(500).json({error:'상품 등록 실패'});
                return;
            }
            res.json({ success: true, insertId: result.insertId });
        }
    );
});

// fruits [3] 특정 과일 한 객 조회/읽기 [GET](SELECT) --- 주소창에 쳐서 나오는 거
// url끝에 ?key=value형태로 파라미터(쿼리스트링) 추가후 전송 - 보안 취약
app.get('/fruits/:num', (req,res)=>{
    const {num} = req.params; //프론트에서 넘겨준 파라미터값 저장

    connection.query(
        'SELECT * FROM fruits WHERE num = ?', 
        [num], (err, result) => {
            if(err){
                console.log('조회오류 : ', err);
                res.status(500).json({err: '상품 조회 실패'});
                return;
            }
            if(result.length==0){
                res.status(404).json({error:'해당 상품 존재 안함'})
                return;
            }
            res.json(result[0]); //단일 객체 반혼 (1개)
        }
    )
})

// fruits [4] 특정 과일 내용 수정 [PUT](UPDATE) --- 고치기
app.put('/fruits/:num', (req, res) => {
    const { num } = req.params;
    const { name, price, color, country } = req.body; // 프론트에서 보낸 데이터

    const sql = "UPDATE fruits SET name = ?, price = ?, color = ?, country = ? WHERE num = ?";
    connection.query(sql, [name, price, color, country, num], (err, result) => {
        if (err) {
            console.log('수정오류 : ', err);
            return res.status(500).json({ error: '상품 수정 실패' });
        }
        res.json({ success: true });
    });
});


////* ----- goods DB ----- *////
app.get('/goods', (req, res)=>{
  connection.query('SELECT * FROM goods', (err, results)=>{
    if(err){
        console.error('쿼리 오류', err);
        res.status(500).json({error:'DB쿼리 오류'});
        return;
    }
        res.json(results); //json데이터로 받아옴.
    });
});

//db데이터 입력을 위한 내용 (input)
app.post('/goods', (req, res)=>{
    const {g_name, g_cost}=req.body;
    
    // 유효성 검사
    if((!g_name)||(!g_cost)){
        return res.status(400).json({error: '필수 항목 누락. 다시 확인 요함.'});
    }

    //input 쿼리문 작성해서 DB입력이 되게 함
    connection.query(
        'INSERT INTO goods (g_name, g_cost) VALUES (?, ?)',
        [g_name, g_cost], (err, result) => {
            if(err){ //입력 에러 발생시
                console.log('DB입력 실패 : ', err); //에러 출력
                res.status(500).json({error : '상품 등록 실패'});
                return; //중지
            }
            // 성공시 입력
            res.json({succes: true, insertId:result.insertId});
        }
    )
})

//3. 삭제
app.delete('/goods/:g_code', (req, res)=>{
    // 넘겨 받은 코드번호 저장
    const g_code = req.params.g_code;
    //삭제 쿼리 작성
    connection.query(
        'DELETE FROM goods WHERE g_code= ?',
        [g_code],
        (err, result) =>{
            if(err){
                console.log('삭제 오류 : ', err);
                res.status(500).json({error:'상품삭제 실패'});
                return;
            }
            res.json({success:true});
        }
    );
})

// 4. 해당 g_code에 대한 자료 조회
app.get('/goods/:g_code', (req, res) => {
    const g_code = req.params.g_code;
    connection.query(
        'SELECT * FROM goods WHERE g_code = ?', [g_code],
        (err, result) => {
            if(err){
                console.log('조회오류 : ', err);
                res.status(500).json({err: '상품 조회 실패'});
                return;
            }

            if(result.length==0){
                res.status(404).json({err: '해당 자료가 존재X'});
                return;
            }
            res.json(result[0]); //하나만 반환
        }
    )
});

//5. 수정(update - g_code기준으로 수정)
app.put('/goods/:g_code', (req, res)=>{
    const g_code = req.params.g_code; //url주소뒤 붙는 파라미터 값으로 가져오고
    const {g_name, g_cost} = req.body; //프론트엔드에서 넘겨 받은 값
    
    // update쿼리문으로 데이터 수정
    connection.query(
        'UPDATE goods SET g_name = ?, g_cost = ? WHERE g_code = ?', 
        [g_name, g_cost, g_code], 
        (err, result) => {
            if (err) {
                console.log('수정 오류 : ', err);
                return res.status(500).json({ error: '수정 실패' });
            }
            res.json({ success: true });
        }
    )
})

////* ----- contactus 접수 처리 ----- *////
app.post('/api/contactus', (req, res) => {
    // [1] 변수 선언
    const {name, phone, email, content} = req.body;
    // [2] 유효성 검사 - front, back 둘 중 한 곳에서 검사해도 됨
    if(!name||!phone||!email||!content){
        return res.status(400).json({error:'필수 항목 누락'});
    }
    connection.query(
        'INSERT INTO contactus(name, phone, email, content) VALUES(?, ?, ?, ?) ', [name, phone, email, content],
        (err, result) => {
            if(err){ //db입력 오류 발생
                console.log('DB입력 오류 : ', err);
                res.status(500).json({error: '문의등록 실패'});
                return;
            }
            res.send('문의 등록 완료')
        }
    )

})
