# Front-end-intelligence

## 迭代1 瀑布流布局

## 迭代2 水印

### 结果展示

#### 动态水印

使用svg方案动态生成：

![img](https://docimg4.docs.qq.com/image/AgAABnOijIm7uCeshNBAu63uLe0gLxd1.png?w=1252&h=932)

![img](https://docimg3.docs.qq.com/image/AgAABnOijIm3rEEYKa5D96BMG9tFIq4E.png?w=623&h=936)

#### 频域水印

基于傅立叶变换的方案，利用参考文献4生成。

原始图片：

![img](https://docimg7.docs.qq.com/image/AgAABnOijIlkInqXrglEu6XTFEj7-oP5.jpeg?w=4272&h=2848)

设置水印“刘玥骁201250215”，隐写术为级别2，密码654321生成的图像：

![img](https://docimg5.docs.qq.com/image/AgAABnOijIl9HKBzUdhL9aBIZHpPu4uF.png?w=500&h=333)

解码验证：![img](https://docimg7.docs.qq.com/image/AgAABnOijImokZonQbhMWbds1cw5J3IJ.png?w=657&h=779)

### 使用方式

1. 点击waterfall.html，或者点击其他html，再点击tab栏中的水印进入本页面。

![img](https://docimg5.docs.qq.com/image/AgAABnOijIlEBSCV55lPRbdZRAJr83QR.png?w=2282&h=1207)

2. 动态水印的生成需要用\<div class="picture"\>的盒子包裹原图（Img），所以修改源代码即可。waterfall.js会为每个class为picture的div元素调用__svgWM，实现动态水印生成。

   **注意！**若水印未覆盖全图，只在图片最上方有一点，是因为浏览器缓存影响了div元素高度的实时获取，建议使用VSCode的Live Server运行。

   ```html
   <div class="picture">
      <img src="希望生成水印的原始图片路径">
   </div>
   ```

3. 频域水印的生成可以在2.2在线操作完成。它覆盖LSB水印和频域水印两类盲水印，其中DCT模式是离散余弦变换，为只使用实数的离散傅里叶变换。

   1. 将密文写入图片：![img](https://docimg6.docs.qq.com/image/AgAABnOijIlGMpi_TyJNZIsY29TIPS0N.png?w=647&h=999)
   2. 从图片中读取密文：![img](https://docimg7.docs.qq.com/image/AgAABnOijImokZonQbhMWbds1cw5J3IJ.png?w=657&h=779)

### 文件目录

作业三在作业二的基础上完成，这里仅列举新增的文件：

1. watermark.html：水印页面，支持动态水印和频域水印。
2. static文件夹：
   1. js：
      1. watermark.js：function __svgWM()实现动态水印，writeIMG()和readIMG()实现频域水印。
      2. cryptostego.min.js：为频域水印的实现提供writeMsgToCanvas、readMsgFromCanvas、loadIMGtoCanvas接口。
   2. pics：新增blind_pic6.png，用于展示盲水印效果。

### 实现方法与关键代码

#### 动态水印

1. 定义__svgWM函数的默认参数和svgStr，为了浏览器兼容性将SVG编码为Base64。

   ```javascript
   function __svgWM({//默认参数实现水印样式的初始化
       container = document.body,
       content = '请勿外传',
       width = '300px',
       height = '200px',
       fontSize = '20px',
       zIndex = 1000
   }
   ```

   ```javascript
   //传入的参数会修改水印的样式和文本内容
   const svgStr = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
   	<text x="50%" y="50%" 
       text-anchor="middle"
       font-size="${fontSize}"
       transform='rotate(-45, 100 100)'
       font-family="system-ui, sans-serif"
       dominant-baseline="middle"
       fill="#1d1d1f" 
       fill-opacity="0.3"
    	>
       ${content}
       </text>
       </svg>`;
   // 考虑到浏览器兼容性，用作背景图片时，建议将 SVG 编码为 Base64
   const base64Url = `data:image/svg+xml;base64,${window.btoa(unescape(encodeURIComponent(svgStr)))}`;
   ```

   编码成base64后svg字符串就准备好了，等待下一步作为背景。

2. 创建div容器watermarkDiv，设置属性后插入到包围原图的div容器container前。

   1. 通过设置watermarkDiv的position为absolute，container的position为relative，watermarkDiv的z-Index属性≥0，可以让水印图片显示在上层（子元素覆盖）

   2. 通过scrollWidth和scrollHeight获得container的宽和高，可以设置watermarkDiv的大小，让水印正好覆盖container

   3. 通过设置watermarkDiv的background-image为第一步得到的svg的base64编码字段，并设置为可重复背景（repeat），就可以让水印填满容器

      ```javascript
      const watermarkDiv = __wm || document.createElement("div");
      //这里的width和height获取了container的宽和高，让水印可以覆盖container
      var w = `${container.scrollWidth}` + 'px'
      var h = `${container.scrollHeight}` + 'px'
      
      watermarkDiv.setAttribute('style', `
      	position:absolute;
          top:0;
          left:0;
          width:${w};
          height:${h};
          z-index:${zIndex};
          pointer-events:none;
          background-repeat:repeat;
          background-image:url('${base64Url}')`);
      
      container.style.position = 'relative';
      container.insertBefore(watermarkDiv, container.firstChild);
      ```

3. 为了应对人为修改的攻击场景，创建MutationObserver来监听DOM变动。一旦监听到DOM元素被修改或删除，就立即重新插入一个。

   ```javascript
   const MutationObserver = window.MutationObserver || window.WebKitMutationObserver;
   	if (MutationObserver) {
   		let mo = new MutationObserver(function () {
           const __wm = document.querySelector('.__wm');
           // 只在__wm元素变动才重新调用 __svgWM
           if ((__wm && __wm.getAttribute('style') !== styleStr) || !__wm) {
           	// 避免一直触发
               mo.disconnect();
               mo = null;
               __svgWM(JSON.parse(JSON.stringify(args)));
           }
   	});
   
       mo.observe(container, {
       	attributes: true,
           subtree: true,
           childList: true
       })
   }
   ```

4. 动态水印的生成需要用\<div class="picture"\>的盒子包裹原图（img），所以通过循环遍历类为'picture'的div容器列表（改变container），调用__svgWM实现水印的动态生成。

   ```javascript
   //循环遍历每个装有需要加水印图片的容器，调用__svgWM
   var list = document.getElementsByClassName('picture')
   Array.prototype.forEach.call(list, function (el) {
   	__svgWM({
       	container: el,//每个装有图片的容器
           content: '刘玥骁201250215',
       })
   });
   ```

   ```javascript
   <div class="picture">//html中使用动态水印的示例
   	<img src="static/pics/pic4.jpg">
   </div>
   <div class="picture">
   	<img src="static/pics/pic17.jpg">
   </div>
   ```

#### 频域水印

利用cryptostego.min.js提供的接口writeMsgToCanvas和readMsgFromCanvas，编写loadIMGtoCanvas的回调函数writefunc和readfunc。

这样可以保证在调用writeMsgToCanvas和readMsgFromCanvas时图片已经被装入canvas。

```javascript
function writefunc() {
	var selectedVal = '';
	var selected = $("input[type='radio'][name='mode']:checked");
    if (selected.length > 0) {
    	selectedVal = selected.val();
    }
    var t = writeMsgToCanvas('canvas', $("#msg").val(), $("#pass").val(), selectedVal);
    if (t === true) {
    	var myCanvas = document.getElementById("canvas");
        var image = myCanvas.toDataURL("image/png");
        $("#blindres").attr('src', image);
        $("#result").html('生成成功! 赶快右键保存到本地吧！');
        $("#blindres").show();
    } else $("#result").html(t);
}
loadIMGtoCanvas('blind', 'canvas', writefunc, 500);
```

```javascript
function readfunc() {
	var selectedVal = '';
	var selected = $("input[type='radio'][name='mode']:checked");
    if (selected.length > 0) {
    	selectedVal = selected.val();
    }
    var t = readMsgFromCanvas('canvas', $("#pass").val(), selectedVal);
    if (t != null) {
    	t = t.split('&').join('&amp;');
        t = t.split(' ').join('&nbsp;');
        t = t.split('<').join('&lt;');
        t = t.split('>').join('&gt;');
        t = t.replace(/(?:\r\n|\r|\n)/g, '<br />');
        $("#result").html(t);
    } else $("#result").html('ERROR REAVEALING MESSAGE!');
}
loadIMGtoCanvas('blind', 'canvas', readfunc);
```

## 迭代3 主题切换

### 效果展示

#### 亮色模式

![img](https://docimg3.docs.qq.com/image/AgAABnOijIlz9jFQAFVB_6zyUjAARN5k.png?w=2060&h=1244)

![img](https://docimg10.docs.qq.com/image/AgAABnOijIku55a-aiBOvIui7RfVpNnQ.png?w=2059&h=714)

#### 暗色模式

![img](https://docimg6.docs.qq.com/image/AgAABnOijIlD_XzQWcpJx6n7D08qj9s6.png?w=2160&h=1262)

![img](https://docimg5.docs.qq.com/image/AgAABnOijImGTxNp9XxDfJD0GwdCS24P.png?w=1957&h=721)

### 使用方式

点击index.html，点击左按钮为亮色模式，点击右按钮为暗色模式（无需记忆，鼠标悬浮会有提示）。默认为亮色模式。（其他html页面与本次作业无关）![img](https://docimg1.docs.qq.com/image/AgAABnOijIlo7n8Z6l1DSKt2oLIf0_tU.png?w=839&h=140)

### 方案与关键代码

选择“提前引入所有主题样式，做类名切换”的方案，即为[参考资料1](https://mp.weixin.qq.com/s/J90TYDJGmo8KCTsawT-vIg)的方案2。实现逻辑较简单，在index.css中定义好样式，再用js实现切换即可。

```css
/* 默认为day样式 */
body {
    color: #333;
    background-color: #fff
}
/* day样式主题 */
body.day {
    color: #333;
    background: #fff;
}

/* dark样式主题 */
body.dark {
    color: #eee;
    background: #333;
}
```

```html
<p>
	2022Web前端作业四：主题切换
	<button onclick="change('day')" title="亮色模式">☀️</button>
	<button onclick="change('dark')" title="暗色模式">🌃</button>
</p>
```

```js
function change(theme) {
	document.body.className = theme;
}
```

### 其他

作业过程中我还尝试了[CSS变量+类名切换](https://segmentfault.com/a/1190000041195585)、[SCSS + mixin + 类名切换](https://zhuanlan.zhihu.com/p/79381867)、PostCSS三类方法，但因为示例多以Vue框架为主，最终我没能成功，但发现了两篇写的很好的博客。

此外我也发现围绕主题切换已经有一些优秀的开源插件，如[DarkReader](https://darkreader.org/)，[Darkmode.js](https://github.com/sandoche/Darkmode.js)，它们利用反转页面颜色来切换主题。也有大佬在此基础上改进，开发了[顺滑](https://github.com/guangzan/tinytab)的作品。这些方案和项目都值得我学习。

## 迭代4 登录注册

### 实现方案 

#### 基本框架

前端：

1. 使用jQuery实现Ajax，方便通信。
2. 使用md5加密密码。

后端：

1. 使用node.js的express进行路由。
2. 使用svg-captcha库生成验证码。
3. 使用本地mysql数据库存储用户信息。

#### 密码强度

使用[浅谈密码强度规则的5个版本](https://www.woshipm.com/pd/595757.html)中的常规版密码强度规则：**至少8个字符，至少1个字母，1个数字和1个特殊字符，**加分判断依据和规则如下，实现在register.html中的`function cal_psd_score(string)`，利用以下方法十分方便`string.match(/[a-z]/g).length`：

- \>50: 强
- 25-50: 中
- 0- 25: 弱

一、密码长度:

- 0分：小于等于8个字符

- 10分: 大于8个字符

二、字母:

- 0 分: 没有字母
- 10 分: 全都是小（大）写字母
- 20 分: 大小写混合字母

三、数字:

- 0分: 没有数字
- 10分: 1 个数字
- 20分: 大于等于 3个数字

四、符号:

- 0分: 没有符号
- 10分: 1个符号
- 25分: 大于1个符号

![img](https://docimg8.docs.qq.com/image/AgAABnOijIlr3eMjz-tKb53-p5dudW2-.png?w=271&h=107)

js实现时先通过id获取对象，然后利用`onkeyup`事件实时可视化密码强度，用户友好。

此外，**确认密码框初始为disabled**，通过正则表达式`right_psd`可以实时监控密码正确性，**当且仅当密码符合规则时确认密码框才可输入**，用户友好。

```html
<input type="password" name="password" id="register-password" placeholder="8字符以上，字母/数字/特殊字符至少各1个"><br>
<div class="strong">
	<p class="fl">
		<span class="hover">弱</span>
		<span class="">中</span>
   		<span class="">强</span>
	</p>
</div>
<div>确认密码：</div>
	<input type="password" name="repassword" id="register-repassword" placeholder="当且仅当上一行密码符合规则时可输入" disabled=""><br>
```

```js
window.onload = function () {
    var psd = document.getElementById("register-password");
    var repsd = document.getElementById("register-repassword");
   var fl = document.getElementsByClassName("fl")[0];

   let right_psd = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[$@$!%*#?&])[A-Za-z\d$@$!%*#?&]{8,}$/
   //实时监控密码强度和正确性
   psd.onkeyup = function () {
       if (right_psd.test(this.value)) {
            repsd.removeAttribute("disabled");
       	} else {
          	repsd.setAttribute("disabled", "disabled");
    	}
        var score = cal_psd_score(this.value)
 		if (score <= 25) {
			fl.className = "";//"弱"
       	} else if (score <= 50) {
            fl.className = "active";//"中"
       	} else {
          	fl.className = "active1";//"强"
       	}
    }
}
```

#### 注册规则

- 各项内容不得为空

- 两次输入的密码需一致

- 用户名需要符合格式，且不得与注册过的重复

- 邮箱需要符合格式，且不得与注册过的重复

- |        | 正则表达式                                                   | 规则                                   |
  | ------ | ------------------------------------------------------------ | -------------------------------------- |
  | 用户名 | ^[\u4e00-\u9fa5a-zA-Z0-9]{3,12}$                             | 3-12字符，中文/大小写英文/数字均可     |
  | 邮箱   | ^([a-zA-Z0-9]+[_\|\_\|\.]?)*[a-zA-Z0-9]+@([a-zA-Z0-9]+[_\|\_\|\.]?)*[a-zA-Z0-9]+\.[a-zA-Z]{2,3}$ | 英文、数字、下划线等，域名为com或cn    |
  | 密码   | ^(?=.*[A-Za-z])(?=.*\d)(?=.*[$@$!%*#?&])[A-Za-z\d$@$!%*#?&]{8,}$ | 8字符以上，字母/数字/特殊字符至少各1个 |

以上内容不符合均利用`alert`报错提示用户，并用form的onsubmit属性限制action属性的跳转。

#### 验证码实现

借助`svg-captcha`库生成验证码，然后利用session存放验证码，在比对时利用小写字母，所以用户输入的验证码不限制大小写。

```js
const svgCaptcha = require('svg-captcha')
```

```js
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
```

因为`/get_captcha`返回的是`<svg\>\</svg>`语句，所以直接渲染到div中。div绑定`refresh_captcha()`函数，看不清图片时可以直接单击切换。

```html
<div id="img" onclick="refresh_captcha()"></div>
```

```js
document.getElementById("img").innerHTML = data.data.src
```

#### 密码加密

前端利用`md5`加密用户输入的密码，然后发送给后端。

```javascript
<script src="https://unpkg.com/md5js@1.0.7/dist/md5.js"></script>
function get_encrypt_password(data) {
	return md5.md5(data, 32);
}
```

后端用加密后的密码作为原始密码，添加**随机数*日期**生成的盐值，注册时使用`bcryptjs库`加密后存入数据库，并进行登录时的检验。

```javascript
//app.post('/register', function (req, res) 
const SALT_FACTOR = 10;
const salt = String(Math.random() * new Date().getTime())
    const password = bcryptjs.hashSync(salt + req.query.encryptPassword, bcryptjs.genSaltSync(SALT_FACTOR));
```

```javascript
//app.post('/login', function (req, res)
if (!bcryptjs.compareSync(user.salt + req.query.password, user.password)) {
	res.send({ success: false, message: '密码错误！' })
	return
}
```

#### 鉴权方案

使用session鉴权：利用**express-session**中间件。客户端若在未登录的状态下请求主页，那么服务器将该请求重定向到登录页面；客户端在登录后，服务器需要记录保存该客户端的登录状态，并给予一个活动期限，这样下一次服务器请求主页的时候，就能够判断该客户端的登录状态，若登录状态有效，直接返回客户端需要的页面，否则重定向到登录页面。

对于 Session 的过期时间，如果没有设置 Session 的过期时间，服务器会根据自己配置中默认有效期，将长期不与服务器交互的 Session 进行删除。

```js
var express = require('express');
var app = express();
var session = require('express-session');
var bodyparser = require('body-parser');

// 下面三行设置渲染的引擎模板
app.set('views', __dirname); //设置模板的目录
app.set('view engine', 'html'); // 设置解析模板文件类型：这里为html文件
app.engine('html', require('ejs').__express); // 使用ejs引擎解析html文件中ejs语法

app.use(bodyparser.json()); // 使用bodyparder中间件，
app.use(bodyparser.urlencoded({ extended: true }));

// 使用 session 中间件
app.use(session({
    secret :  'secret', // 对session id 相关的cookie 进行签名
    resave : true,
    saveUninitialized: false, // 是否保存未初始化的会话
    cookie : {
        maxAge : 1000 * 60 * 3, // 设置 session 的有效时间，单位毫秒
    },
}));

// 获取登录页面
app.get('/login', function(req, res){
    res.sendFile(__dirname + '/login.html')
});

// 用户登录
app.post('/login', function(req, res){
    if(req.body.username == 'admin' && req.body.pwd == 'admin123'){
        req.session.userName = req.body.username; // 登录成功，设置 session
        res.redirect('/');
    }
    else{
        res.json({ret_code : 1, ret_msg : '账号或密码错误'});// 若登录失败，重定向到登录页面
    }
});

// 获取主页
app.get('/', function (req, res) {
    if(req.session.userName){  //判断session 状态，如果有效，则返回主页，否则转到登录页面
        res.render('home',{username : req.session.userName});
    }else{
        res.redirect('login');
    }
})

// 退出
app.get('/logout', function (req, res) {
    req.session.userName = null; // 删除session
    res.redirect('login');
});

app.listen(8000,function () {
    console.log('http://127.0.0.1:8000')
})
```

### 安装与运行过程（含界面截图）

#### 连接本地数据库

登录本地的MySQL，选择一个database创建table user，sql内容如下：

```sql
-- ----------------------------
-- Table structure for user
-- ----------------------------
DROP TABLE IF EXISTS `user`;
CREATE TABLE `user`(
    `id` int(11) NOT NULL AUTO_INCREMENT,
    `username` varchar(255)  NOT NULL,
    `password` varchar(255)  NOT NULL,
    `email` varchar(255)  NOT NULL,
    `salt`  varchar(255)  NOT NULL,
    PRIMARY KEY (`id`)
)ENGINE = InnoDB  CHARACTER SET = utf8mb4;
```

然后将server.js中的user/password/database改成自己的信息。

```javascript
// 连接数据库
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',//TODO：改成自己的
    password: 'lyx20020305',//TODO：改成自己的
    database: 'node_server'//TODO：改成自己的
});
connection.connect();
```

#### 启动server.js

在项目终端输入`node server.js`，命令行显示运行在3001端口即成功（若端口被占用改成空闲端口即可）

![img](https://docimg2.docs.qq.com/image/AgAABnOijIkxZ4jRNBtJlKpbvnAGPMBH.png?w=1652&h=1178)

#### 登录注册流程

在未登录状态下打开一级页面index.html，会被禁止访问，自动跳转到登录页面login.html：![img](https://docimg10.docs.qq.com/image/AgAABnOijIlwJ2mYW15M5bRalJw5W7DI.png?w=1391&h=638)

初次进入登录页面没有账号，点击立即注册或tab栏中的“注册”前往注册页面register.html：![img](https://docimg3.docs.qq.com/image/AgAABnOijIln_4nJLDNNHJedEO5ZlC1V.png?w=1119&h=671)

![img](https://docimg5.docs.qq.com/image/AgAABnOijIk4M0o9VTRCZb1fKEc2AUgY.png?w=1095&h=794)

按照提示和报错正确注册后，会跳转至登录页面：![img](https://docimg6.docs.qq.com/image/AgAABnOijIl_OB7oHq9H2r759W4W-qW4.png?w=1163&h=860)

输入正确的用户名/邮箱、密码和验证码后即可登录，用户名和邮箱均支持验证，其中单击验证码会切换图片：![img](https://docimg4.docs.qq.com/image/AgAABnOijImEVLfXEWRF5pFcv5VW7ddI.png?w=1135&h=715)

自动跳转至首页，通过session获得用户信息后即可访问一二级页面，显示登录用户信息，下图为一级页面：![img](https://docimg4.docs.qq.com/image/AgAABnOijIm_5XJ7Fr1F36Sph0Qy4dhs.png?w=2142&h=778)

下图为二级页面：

![img](https://docimg4.docs.qq.com/image/AgAABnOijIncTzS3uHlFrZbc9tGQykjs.png?w=2169&h=355)

![img](https://docimg7.docs.qq.com/image/AgAABnOijInaw3OV3BxEfLXFoLIMeS91.png?w=2179&h=898)

经过若干次登录注册的数据库内容如下图：![img](https://docimg3.docs.qq.com/image/AgAABnOijImQzjuLwKhK-aYHAqNaA9Eq.png?w=2517&h=755)

以上则为利用邮箱注册/登录完成的整体流程，仍有许多细节待补充：注册时的邮箱验证，忘记和修改密码时利用邮箱验证，鉴权的优化等，计划在前端智能中学习实践。

## 迭代5 图像风格迁移

### **安装运行过程与呈现效果**

1. 将code文件夹解压到本地，在`terminal`中输入`yarn install`即可运行`server.js`和`main.js`<img src="https://docimg9.docs.qq.com/image/AgAABnOijIkL4y7dsgFNn5SiymTNtjxZ.png?w=1058&h=503" alt="img" style="zoom:50%;" />
2. 输出如上图后运行`pic_process.html`，进入“图像风格迁移”栏。（或运行任意html文件，通过导航栏进入，无需登录，为了方便浏览一二级界面已注释session鉴权相关代码）<img src="https://docimg3.docs.qq.com/image/AgAABnOijInMK1ReI4tAxoo0UkrrejQz.png?w=1111&h=251" alt="img" style="zoom:50%;" />
3. 点击“图像风格迁移”，可以迁移一张图片风格或两张图片风格，图片可以本地上传，风格图片可以随机生成。<img src="https://docimg5.docs.qq.com/image/AgAABnOijIlwm8BkDwFHpoVhODlbt-KQ.png?w=616&h=942" alt="img" style="zoom:50%;" /><img src="https://docimg5.docs.qq.com/image/AgAABnOijIkFzFRJHCBLNqM2QRKOInMK.png?w=603&h=938" alt="img" style="zoom:50%;" />
4. 点击“图像滤镜添加”，可以给上传的图片添加15种滤镜。<img src="https://docimg6.docs.qq.com/image/AgAABnOijIm4N1EtNjdP_a0ztN0IClCg.png?w=610&h=891" alt="img" style="zoom: 80%;" />
5. 点击“具体参数调整”，可以给上传的图片设置不同参数的具体值，并添加常见的18种滤镜。![img](https://docimg9.docs.qq.com/image/AgAABnOijIn4r79QOwZN5oaSZ2tut3ml.png?w=611&h=1019)
6. 点击导航栏的“图像卡通化”会跳转至用`cartoonize.py`部署的`streamlit`页面，可利用“铅笔素描”、"细节增强"和“铅笔边缘”三种方法和相应参数的调整得到卡通化图片。![img](https://docimg7.docs.qq.com/image/AgAABnOijIkLZdJ6suNBBKiYn4kangzh.png?w=1925&h=1243)
7. 以上为四大功能的介绍和效果图，实现方案见下。因为卡通化未使用nodejs运行，所以不算在我的作业选题“图像风格迁移”中。滤镜和参数调整是因为迁移基本使用了别人造好的轮子，想进行一些自己的实践的功能，所以原则上也不算在“图像风格迁移”中。

### 实现方案

#### 1. 图像风格迁移

利用库[arbitrary-image-stylization-tfjs](https://github.com/reiinakano/arbitrary-image-stylization-tfjs)实现，源代码基于`TensorFlow.js`。

本地发现在start中用&无法让`server.js`和`main.js`同时运行，所以使用`npm-run-all -p`运行两个带监听的命令，成功。

```json
//package.json
"scripts": {
    "start": "npm-run-all -p server main",
	"server": "node server.js",
	"main": "budo main.js:dist/bundle.js --live --host localhost",
}
```

#### 2. 图像滤镜添加

利用库[lena.js](https://github.com/davidsonfellipe/lena.js)实现，利用`npm install lena.js --save`即可安装并使用。

利用`LenaJS.filterImage`方法即可将`filter`作用于`originalImage`，输出在`filteredImageCanvas`上。

```js
//lena_js.html
var imageLoader = document.getElementById('imageLoader');
var originalImage = document.getElementById("original-image");
var filteredImageCanvas = document.getElementById("filtered-image");
var filterChanger = document.getElementById("filter-changer");
var imageUploaded = false;

// Handle image upload into img tag
imageLoader.addEventListener('change', function(e){
		var reader = new FileReader();
    
    reader.onload = function(event){
        originalImage.onload = function(){
             console.log("Image Succesfully Loaded");
             imageUploaded = true;
        };
        originalImage.src = event.target.result;
    };
    
    reader.readAsDataURL(e.target.files[0]);   
}, false);

filterChanger.addEventListener("change", function(e){
	var filter = filterChanger.value;
  	
  if(imageUploaded && filter != "none"){
  
  	// Apply filter
  	LenaJS.filterImage(filteredImageCanvas, LenaJS[filter], originalImage);
  }
}, false);
```

#### 3. 具体参数调整

利用库[CamanJS](https://github.com/meltingice/CamanJS/)实现，利用`npm install caman`即可安装并使用。

初始demo可实现静态图片的处理，所以我修改了$(document).ready函数以允许用户本地上传图片。原理是监听上传本地图片的`input type="file"`，若加载了新的`img`，则更新Caman对象c和i。更新方法是利用函数`Caman.replaceCanvas()`，所以我添加了辅助函数`convertImageToCanvas()`，将上传的新图片转成`newCanvas`。

遗憾的是，最终虽实现功能，但网页显示和调整的图片均为上一张上传的图片，所以用户在上传想处理的图片后，随便再上传一张不重复的图片即可使用。这个bug大概率与源码有关，但因为难理解未能解决:(

```js
//static/js/caman.js
function convertImageToCanvas(image) {
	// 创建canvas DOM元素，并设置其宽高和图片一样
	var canvas = document.createElement("canvas");
	canvas.width = image.width;
	canvas.height = image.height;
    // 坐标(0,0) 表示从此处开始绘制，相当于偏移。
    canvas.getContext("2d").drawImage(image, 0, 0);
    return canvas;
}
$(document).ready(function () {
    var imageLoader1 = document.getElementById('imageLoader1');
    var image1 = document.getElementById("example");
    var imageLoader2 = document.getElementById('imageLoader2');
    var image2 = document.getElementById("preset-example");
    c = Caman("#example");
    i = Caman("#preset-example");
    imageLoader1.addEventListener("change", function (e) {
        var reader = new FileReader();
        reader.onload = function (event) {
            image1.onload = function () {
                console.log("Image1 Succesfully Loaded");
            };
            image1.src = event.target.result;
        };
        console.log(e.target.files)
        reader.readAsDataURL(e.target.files[0]);
        var newCanvas = convertImageToCanvas(image1);
        c.replaceCanvas(newCanvas);
    });
    imageLoader2.addEventListener("change", function (e) {
        var reader = new FileReader();
        reader.onload = function (event) {
            image2.onload = function () {
                console.log("Image2 Succesfully Loaded");
            };
            image2.src = event.target.result;
        };
        reader.readAsDataURL(e.target.files[0]);
        var newCanvas = convertImageToCanvas(image2);
        i.replaceCanvas(newCanvas);
    });
    c = Caman("#example");
    i = Caman("#preset-example");
    $(".FilterSetting input").each(function () {
        var j;
        j = $(this).data("filter");
        return b[j] = $(this).val()
    });
    $("#Filters").on("change", ".FilterSetting input", function () {
        var j, k;
        j = $(this).data("filter");
        k = $(this).val();
        b[j] = k;
        $(this).find("~ .FilterValue").html(k);
        return a()
    });
    return $("#PresetFilters").on("click", "a", function () {
        return h($(this).data("preset"))
    })
})
```

#### 4. 图像卡通化

利用库`cv2`实现三种功能的卡通化，并用`streamlit`可视化展示。

```python
def cartoonization(img, cartoon):
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    if cartoon == "铅笔素描":
        value = st.sidebar.slider('调整草图的亮度（值越高，草图越亮）',
                                  0.0, 300.0, 250.0)
        kernel = st.sidebar.slider(
            '调整草图边缘的粗体（值越高，边缘越粗）', 1, 99, 25,
            step=2)

        gray_blur = cv2.GaussianBlur(gray, (kernel, kernel), 0)

        cartoon = cv2.divide(gray, gray_blur, scale=value)

    if cartoon == "细节增强":
        smooth = st.sidebar.slider(
            '调整图像的平滑度级别（值越高，图像越平滑）', 3, 99, 5, step=2)
        kernel = st.sidebar.slider('调整图像的清晰度（值越低，越清晰）', 1, 21, 3,
                                   step=2)
        edge_preserve = st.sidebar.slider(
            '调整颜色平均效果（低：仅平滑相似的颜色，高：平滑不同的颜色）',
            0.0, 1.0, 0.5)

        gray = cv2.medianBlur(gray, kernel)
        edges = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_MEAN_C,
                                      cv2.THRESH_BINARY, 9, 9)

        color = cv2.detailEnhance(img, sigma_s=smooth, sigma_r=edge_preserve)
        cartoon = cv2.bitwise_and(color, color, mask=edges)

    if cartoon == "铅笔边缘":
        kernel = st.sidebar.slider('调整草图的清晰度（值越低，越锐利）', 1, 99,
                                   25, step=2)
        laplacian_filter = st.sidebar.slider(
            '调整边缘检测功率（值越高，功能越强大）', 3, 9, 3, step=2)
        noise_reduction = st.sidebar.slider(
            '调整草图的噪点效果（值越高，噪声越大）', 10, 255, 150)

        gray = cv2.medianBlur(gray, kernel)
        edges = cv2.Laplacian(gray, -1, ksize=laplacian_filter)

        edges_inv = 255 - edges

        dummy, cartoon = cv2.threshold(edges_inv, noise_reduction, 255, cv2.THRESH_BINARY)


    return cartoon

```

本想利用`PythonShell`在`server.js`中调用python脚本运行，但未解决第三方库引入的问题，所以使用了`streamlit`部署，它可以利用安装`requirements.txt`解决依赖问题。

[部署地址](https://lyxx2535-streamlit-file-main-jpg2qd.streamlit.app/) [github链接（含requirements.txt）](https://github.com/lyxx2535/streamlit_file)

```js
const { PythonShell } = require("python-shell");
let options = {
    pythonPath: "C:\\Users\\84368\\AppData\\Local\\Programs\\Python\\Python38\\python.exe",
    args: ["-d",encoded],
};
PythonShell.run("cartoonize.py", options, function (err, result) {
    if (err){
        console.log(err)
    }else{
        console.log("execute")
    }
});
```

![img](https://docimg4.docs.qq.com/image/AgAABnOijInUTBspmCVAL5oCmr4-6qnQ.png?w=2560&h=1520)

### 文件树结构

因为本次作业使用了较多的外来库，所以我调整了文件结构，重要文件的内容如下：

- static
  - css：
    - caman.css：支持“具体参数调整”。
  - html：
    - caman_js.html：“具体参数调整”的源代码。
    - lena_js.html：“图像滤镜添加”的源代码。
  - js：
    - caman.js：支持“具体参数调整”。
    - links.js：支持“图像风格迁移”。
    - 4个saved_model开头的文件夹：支持“图像风格迁移”。
  - pics：
    - 含有支持“图像风格迁移”的默认jpg。
- cartoonize.py：“图像卡通化”的源代码。
- home.html：瀑布流布局的首页，与本次作业无关。
- index.html：“图像风格迁移”的源代码。
- main.js：支持“图像风格迁移”。
- package.json：含`yarn start`命令的定义。
- pic_process.html：“图像风格迁移”功能使用页面。
- server.js：支持登录注册的接口，与本次作业无关。

### 参考的文献

一、[《什么是图像风格迁移》](https://zhuanlan.zhihu.com/p/469685783)

总结：研究介绍、方法演进。

风格迁移指的是两个不同域中图像的转换

1. 传统的图像风格迁移

   1.1计算机图形学领域和计算机视觉领域

   1.2非真实感图形学

2. 基于神经网络的图像风格迁移

   2.1 基于在线图像优化的慢速图像风格化迁移算法

   2.2 基于离线模型优化的快速图像风格化迁移算法

   2.3 MSPM 的快速风格转移

3. 基于对抗生成网络的图像迁移

   3.1 对抗生成网络（adversarial generative network）

   3.2 CycleGAN

   3.3 StarGAN

二、[《阿里前端智能化技术探索和未来思考》](https://juejin.cn/post/7119391755362893861)

在这种要求下，**数据分析和基于数据的建模能力将会至关重要**，我们希望可以通过Pipcook-Cloud这个项目增强前端数据分析和智能化算法能力，**逐渐将技术产出、用户使用行为数据以及业务指标三者关联在一起**。

如果说PipCook-Cloud打通了前端和业务数据的桥梁，通过平台化产品化的方式提供了数据加工和数据开发的工程能力，那么DataCook则是在底层供给PipCook平台的燃料。**DataCook**提供了JS生态下面向前端的数据科学和机器学习工具库，帮助前端同学轻松运用分析建模能力剖析自己的业务数据，产出具有价值的分析成果。

2021年选定了两个方向来优化我们的端上引擎：WASM+Rust+SIMD和WebGPU。TensorFlow.js虽然没有使用Rust，但是也在使用WASM+SIMD。

<mark>前端智能化技术应用篇</mark>

1. 代码推荐-sophon 2. 设计稿生成代码-imgcook 3. 图层解析 4. 布局分析 5. 代码生成6. 智能化能力提升 7. 产品体验优化 8. Imgcook的业务应用：智能UI 9. 最终影响助手APP效用的关键是隐私保护和端上算力

UI智能化会朝着没有UI的方向演进，应用会向着服务化和二进制输入输出演进，移动操作系统会进化为只有一个APP —— **用户的私人智能体**，其它APP被服务化并和该智能体进行二进制交互，而用户则会回归自然、社会和生活。未来，大家可能只佩戴**眼镜或耳机**就可以完成今天手机上的大部分功能

三、[《基于OpenCV的图像卡通化》](https://cloud.tencent.com/developer/article/1678909)

讲解了如何用OpenCV实现卡通化的若干方法，代码简洁易懂，十分容易运行。

四、[《基于深度学习的图像真实风格迁移》](https://zhuanlan.zhihu.com/p/28605436)

1. 图像真实风格迁移问题介绍：风格没有严格的定义，所以这个问题耶没有严格的数学定义。
2. 算法原理分析：该问题并不是机器学习通常的"训练-测试"流程，而只是一个普通的迭代求解过程。迭代结束，就得到目标图像。这也导致了该算法的运行速度比较慢。
3. 提升性能：即**需要在风格迁移的同时，最大程度保留输入图像的真实细节**。
   1. 对于过程中的畸变进行惩罚。
   2. 对输入图像进行语义分割。

这个作者提供的docker image未能在我的本地成功运行。

