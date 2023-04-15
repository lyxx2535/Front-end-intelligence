// 1.	动态水印
(function () {
    // svg 实现 watermark
    //默认参数实现水印样式的初始化
    function __svgWM({
        container = document.body,
        content = '请勿外传',
        width = '300px',
        height = '200px',
        fontSize = '20px',
        zIndex = 1000
    } = {}) {
        const args = arguments[0];
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
        const __wm = document.querySelector('.__wm');

        const watermarkDiv = __wm || document.createElement("div");
        var w = `${container.scrollWidth}` + 'px'
        var h = `${container.scrollHeight}` + 'px'
        console.log("width: " + w)
        console.log("height: " + h)

        //这里的width和height才是承载水印的大小，也就是完全覆盖container
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


        // 应对人为修改的攻击场景，创建MutationObserver来监听DOM变动
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


        if (typeof module != 'undefined' && module.exports) {  //CMD
            module.exports = __svgWM;
        } else if (typeof define == 'function' && define.amd) { // AMD
            define(function () {
                return __svgWM;
            });
        } else {
            window.__svgWM = __svgWM;
        }

    }

    //循环遍历每个需要加水印的元素，调用__svgWM
    var list = document.getElementsByClassName('picture')
    Array.prototype.forEach.call(list, function (el) {
        __svgWM({
            container: el,//每个图片
            content: '刘玥骁201250215',
        })
    });
})();

// 2.	频域水印
function writeIMG() {
    $("#blindres").hide();
    $("#blindres").attr('src', '');
    $("#result").html('Processing...');
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
}
function readIMG() {
    $("#blindres").hide();
    $("#result").html('Processing...');
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
}