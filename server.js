const fs = require('fs');
const mysql = require('mysql');
const svgCaptcha = require('svg-captcha')
const crypto = require('crypto')
const bcryptjs = require('bcryptjs');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const express = require('express')
const session = require('express-session')
const path = require('path');
const logger = require('morgan');

let app = express();
app.set('trust proxy', 1) // trust first proxy
app.use(session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: true }
}))
app.listen(3001, () => {
    console.log('server服务已开启，运行在http://127.0.0.1:3001');

})
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: false }));
app.all("*", function (req, res, next) {
    if (!req.get("Origin")) return next();
    res.set("Access-Control-Allow-Origin", req.headers.origin);
    res.set("Access-Control-Allow-Methods", "GET");
    res.set("Access-Control-Allow-Headers", "X-Requested-With, Content-Type");
    res.header('Access-Control-Allow-Credentials', 'true');
    if ("OPTIONS" === req.method) return res.sendStatus(200);
    next();
});

// 连接数据库
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'lyx20020305',
    database: 'node_server'
});
connection.connect();

//GET
function sendHTML(req, response, path) {
    fs.readFile(path, function (err, data) {
        if (err) {
            console.log(err);
            response.writeHead(404, { 'Content-Type': 'text/html' });
        } else {
            // HTTP 状态码: 200 : OK
            response.writeHead(200, { 'Content-Type': 'text/html' });
            response.write(data.toString());
        }
        //  发送响应数据
        response.end();
    });
}

app.get('/', function (req, res) {
    sendHTML(req, res, 'index.html');
})
app.get('/index.html', function (req, res) {
    if(req.session.username){
        res.render('index.html',{username : req.session.username});//将渲染的视图发送给客户端
        // sendHTML(req, res, 'index.html');
    }else {
        res.redirect('login.html');
    }

})
app.get('/login.html', function (req, res) {
    sendHTML(req, res, 'login.html');
})
app.get('/register.html', function (req, res) {
    sendHTML(req, res, 'register.html');
})

//POST
app.post('/get_captcha', function (req, res) {
    const codeConfig = {
        size: 4, // 验证码长度
        ignoreChars: '0oO1ilI', // 验证码字符中排除 0oO1ilI
        noise: 2, // 干扰线条的数量
        width: 160,
        height: 50,
        fontSize: 50,
        color: true, // 验证码的字符是否有颜色，默认没有，如果设定了背景，则默认有
        background: "#eee",//背景色
    };
    const captcha = svgCaptcha.create(codeConfig);
    req.session.captcha = captcha.text.toLowerCase(); // 将正确验证码存在session中
    console.log("验证码：" + req.session.captcha)
    res.send({ success: true, data: { src: captcha.data, ans: req.session.captcha } });
})

app.post('/login', function (req, res) {
    console.log('/login')
    console.log(req.session)
    console.log(req.session.captcha)
    if (req.query.ans) {
        if ((req.query.captcha).toUpperCase() !== (req.query.ans).toUpperCase()) {
            res.send({ success: false, message: '验证码错误！' })
            return
        } else {
            let right_email = /^([a-zA-Z0-9]+[_|\_|\.]?)*[a-zA-Z0-9]+@([a-zA-Z0-9]+[_|\_|\.]?)*[a-zA-Z0-9]+\.[a-zA-Z]{2,3}$/
            if (right_email.test(req.query.username)) {//如果是邮箱格式，说明用邮箱登录
                connection.query(`select * from user where email='${req.query.username}' limit 1`, (err, user) => {
                    if (err) {
                        console.log(err)
                        return
                    }
                    if (user.length === 0) {
                        res.send({ success: false, message: '邮箱未注册！' })
                        return
                    }
                    user = user[0]
                    if (!bcryptjs.compareSync(user.salt + req.query.password, user.password)) {
                        res.send({ success: false, message: '密码错误！' })
                        return
                    }
                    req.session.username = req.query.username
                    res.send({ success: true, message: '邮箱登录成功' })
                })
            } else {
                connection.query(`select * from user where username='${req.query.username}' limit 1`, (err, user) => {
                    if (err) {
                        console.log(err)
                        return
                    }
                    if (user.length === 0) {
                        res.send({ success: false, message: '用户不存在！' })
                        return
                    }
                    user = user[0]
                    if (!bcryptjs.compareSync(user.salt + req.query.password, user.password)) {
                        res.send({ success: false, message: '密码错误！' })
                        return
                    }
                    req.session.username = req.query.username
                    res.send({ success: true, message: '用户名登录成功' })
                })
            }

        }
    } else {
        res.send({ success: false, message: '不存在验证码！' })
        return
    }
})
app.post('/register', function (req, res) {
    console.log('/register')
    const SALT_FACTOR = 10;
    const salt = String(Math.random() * new Date().getTime())
    const password = bcryptjs.hashSync(salt + req.query.encryptPassword, bcryptjs.genSaltSync(SALT_FACTOR));

    connection.query(`INSERT INTO user(username,password,email,salt) VALUES 
    ('${req.query.username}',
    '${password}',
    '${req.query.email}',
    '${salt}')`, (err) => {
        if (err) {
            console.log(err)
            return
        }
        res.send({ success: true, message: '注册成功' })
    })
})
app.post('/check_username', function (req, res) {
    console.log('/check_username')
    connection.query(`select * from user where username='${req.query.username}' limit 1`, (err, user) => {
        if (err) {
            console.log(err)
            return
        }
        if (user.length === 0) {
            res.send({ success: true, message: '用户名未使用' })
            return
        } else {
            res.send({ success: false, message: '用户名已存在' })
            console.log("用户名已存在");
            return;
        }
    })
})
app.post('/check_email', function (req, res) {
    console.log('/check_email')
    connection.query(`select * from user where email='${req.query.email}' limit 1`, (err, user) => {
        if (err) {
            console.log(err)
            return
        }
        if (user.length === 0) {
            res.send({ success: true, message: '邮箱未使用' })
            return
        } else {
            res.send({ success: false, message: '邮箱已存在' })
            console.log("邮箱已存在");
            return;
        }
    })
})

app.get("/get_session", (req, res) => {
    console.log(req.session.username)
    if (req.session.username) {
        res.send({ success: true, data: { res: req.session.username } });
    } else {
        res.send({ success: false, message: '没有保存的cookie' });
    }
})


