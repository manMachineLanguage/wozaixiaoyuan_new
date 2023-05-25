/**
* 作者QQ：3097942073
* github仓库：https://github.com/manMachineLanguage/wozaixiaoyuan_new
* 更新说明： 适用于新版我在校园中签到消息的校区签到。在原作者的代码基础上更改以适用新功能
* 原作者QQ: 1483081359 https://github.com/manMachineLanguage/wozaixiaoyuan_new
* 原github仓库：https://github.com/zhacha222/wozaixiaoyuan
* 微信小程序：我在校园 签到
* 脚本说明：适用于我在校园所有类型的签到，包括定位、蓝牙签到等···
* 默认定时：默认不自动运行，在签到发布后，需要手动运行一次此脚本（当然，如果你有定时的签到，也可以自己去修改定时规则，在签到时间内定时运行该脚本即可）
* cron: 0
* 变量名称：wzxy
* 变量值：  {
    "username": "手机号",
    "password": "密码",
    "qd_location": "133.333333,33.333333",
    "rjrb_answers": ["0","0"],
    "rjrb_location": "133.333333,33.333333",
    "jkdk_answers": ["0","无","1","0","36.2","没有","1","1","2"],
    "jkdk_location": "133.333333,33.333333",
    "mark": "用户昵称"
   }

 ***一些前提说明：
 1.只支持青龙面板（本人青龙版本2.10.13），搭建教程自行百度
 2.本库脚本通用 wzxy这一个变量
 3.脚本变量只推荐在青龙的【环境变量】页添加，有强迫症在【配置文件】config.sh中添加的如果出现问题自己解决
 4.支持多用户，每一用户在【环境变量】单独新建变量wzxy，切勿一个变量内填写多个用户的参数
 5.脚本通知方式采用青龙面板默认通知，请在【配置文件】config.sh里配置
 6.关于各脚本的具体使用方法，请阅读脚本内的注释

 ***关于变量值中各参数的解释:
 username ———————— 手机号
 password —————————密码
 qd_location ————— 签到的`经纬度`      （wzxy_qd.js)
 rjrb_answers —————日检日报的`填空参数`（wzxy_rjrb.js）
 rjrb_location ————日检日报的`经纬度`  （wzxy_rjrb.js）
 jkdk_answers ———— 健康签到的`填空参数`（wzxy_jkdk.js）
 jkdk_location ————健康签到的`经纬度`  （wzxy_jkdk.js）
 mark —————————————用户昵称（不一定要真名，随便填都行,便于自己区分打卡用户）

 更新日志：
 1.0.0 完成签到的基本功能
 1.0.1 增加等待15s,防止黑ip
 1.0.2 增加完整参数验证
 1.0.5 修复地址信息请求失败的bug
 1.0.6 优化通知
 1.0.7 log增加新版本内容
 1.0.8 增加`仅通知签到失败`模式，在脚本第52行修改开启
 
 */
//cron: 0

//===============通知设置=================//
const Notify = 1; //0为关闭通知，1为打开通知,默认为1
const OnlyErrorNotify = 0; //0为关闭`仅通知签到失败`模式，1为打开`仅通知签到失败`模式,默认为0   
////////////////////////////////////////////

const $ = new Env('我在校园签到');
const notify = $.isNode() ? require('./sendNotify') : '';
const fs = require("fs");
const request = require('request');
const {log} = console;

//////////////////////
let scriptVersion = "1.0.8";
let scriptVersionLatest = '';
let update_data = "1.0.8 增加`仅通知签到失败`模式，可在脚本第52行修改开启"; //新版本更新内容
//我在校园账号数据
let wzxy = ($.isNode() ? process.env.wzxy : $.getdata("wzxy")) || "";
let wzxyArr = [];
let wait = 0;
let checkBack = 0;
let loginBack = 0;
let PunchInBack = 0;
let requestAddressBack = 0;
let msg = '';
let jwsession = '';
let location = '';
let schoolId = '';
let signId = '';
let id = '';
let sign_data = '';
let status_code = 0;
let locat = '';
let fail = 0;
let areaJSON = '';

!(async () => {
    if (typeof $request !== "undefined") {
        await GetRewrite();
    } else {
        if (!(await Envs()))
            return;
        else {

            log(`\n\n=============================================    \n脚本执行 - 北京时间(UTC+8)：${new Date(
                new Date().getTime() + new Date().getTimezoneOffset() * 60 * 1000 +
                8 * 60 * 60 * 1000).toLocaleString()} \n=============================================\n`);

            await poem();
            await getVersion();

            log(`\n============ 当前版本：${scriptVersion}  最新版本：${scriptVersionLatest} ============`)

            if(scriptVersionLatest != scriptVersion){
                log(`\n发现新版本,请及时拉库更新！\n${update_data}`)
            }

            log(`\n=================== 共找到 ${wzxyArr.length} 个账号 ===================`)


            for (let index = 0; index < wzxyArr.length; index++) {


                let num = index + 1
                if (num >1 && wait == 0){
                    log('**********休息15s，防止黑IP**********');
                    await $.wait(16 * 1000);
                }
                log(`\n========= 开始【第 ${num} 个账号】=========\n`)
                data = wzxyArr[index];
                content = JSON.parse(data)
                username = content.username
                password = content.password
                location = content.qd_location
                mark = content.mark

                log(`签到用户：${mark}`)
                var checkBack = 0;
                loginBack = 0;
                locat = location.split(',')
                if (!locat[0] || !locat[1]){
                    log('未填写qd_location，跳过打卡');
                    var checkBack = 1
                    status_code = 6
                    wait = 1
                }
                if (checkBack == 0) {
                    log('开始检查jwsession是否存在...');
                    await checkJwsession()
                    await $.wait(2 * 1000);

                    if (loginBack) {

                        log('开始获取签到列表...');
                        await PunchIn()
                        await $.wait(2 * 1000);

                        if (PunchInBack > 0) {
                            log('正在请求地址信息...');
                            await requestAddress()
                            await $.wait(2 * 1000);

                            if (requestAddressBack) {
                                log('开始签到...');
                                await doPunchIn()
                                await $.wait(2 * 1000);

                            }

                        }

                    }
                }
                var resultlog = getResult()

                if (OnlyErrorNotify>0){
                    if (status_code != 1 ){
                        msg += `签到用户：${mark}\n签到情况：${resultlog}\n\n`
                        fail=fail+1
                    }
                }else {
                    msg += `签到用户：${mark}\n签到情况：${resultlog}\n\n`
                }

            }
            if (OnlyErrorNotify>0){

                if(fail==0){
                    msg=`共${wzxyArr.length}个用户，全部签到成功 ? `
                }else{
                    msg=`共${wzxyArr.length}个用户，? 失败${fail}个\n\n===========失败详情=============\n\n`+msg
                }
            }

              //log(msg);
             await SendMsg(msg);
        }
    }

})()
    .catch((e) => log(e))
    .finally(() => $.done())

/**
 * 判断jwsession是否存在
 */
function checkJwsession() {

    fs.open('.cache/' + username + ".json", 'r+', function(err, fd) {
        if (err) {
            console.error("找不到cache文件，正在使用账号信息登录...")
            login()
            return
        }
        console.log("找到cache文件，正在使用jwsession签到...")
        var read = fs.readFileSync('.cache/' + username + ".json")
        jwsession = read.toString()
        loginBack = 1

    });

}


/**
 * 登录
 */
function login(timeout = 3 * 1000) {
    return new Promise((resolve) => {
        let url = {
            url: `https://gw.wozaixiaoyuan.com/basicinfo/mobile/login/username?username=${username}&password=${password}`,
            headers: {
                "Accept-Encoding": "gzip, deflate, br",
                "Connection": "keep-alive",
                "User-Agent": "Mozilla/5.0 (iPad; CPU OS 15_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.23(0x1800172f) NetType/WIFI Language/zh_CN miniProgram/wxce6d08f781975d91",
                "content-type": "application/json;charset=UTF-8",
                "Content-Length": "2",
                "Host": "gw.wozaixiaoyuan.com",
                "Accept-Language": "en-us,en",
                "Accept": "application/json, text/plain, */*"
            },
            data: ``,
        }
        request.post(url, async (error, response, data) => {
            try {
                let result = data == "undefined" ? await login() : JSON.parse(data);
                //登录成功
                if (result.code == 0 ) {
                    jwsession = response.headers['jwsession']
                    //储存jwsession
                    setJwsession(jwsession)
                    loginBack = 1;
                    log(`登录成功`)

                } else {
                    log(`? 登录失败，${result.message}`)
                    status_code = 5;
                    loginBack = 0;
                }

            } catch (e) {
                log(e)
            } finally {
                resolve();
            }
        }, timeout)
    })
}


/**
 * 存储jwsession
 */
function setJwsession(jwsession) {

    fs.mkdir('.cache',function(err){
        if (err) {

            console.log("找到cache文件");
        }
        else console.log("正在创建cache储存目录与文件...");
    });

    fs.writeFile('.cache/' + username + ".json", jwsession,  function(err) {
        if (err) {
            return console.error(err);
        }
        console.log("更新jwsession成功");
    })

}


/**
 * 获取签到列表，符合条件则自动进行签到
 */
function PunchIn(timeout = 3 * 1000) {
    return new Promise((resolve) => {

        let url = {
            url: "https://gw.wozaixiaoyuan.com/sign/mobile/receive/getMySignLogs?page=1&size=10",
            headers: {
                'jwsession': jwsession,
            },
            data: ''
        }

        $.get(url, async (error, response, data) => {

            try {
                let result = data == "undefined" ? await PunchIn() : JSON.parse(data);

                if (result.code == -10) {
                    log('jwsession 无效，尝试账号密码签到')
                    status_code = 4;
                    PunchInBack = 0;
                    loginBack = 0;
                    await login()
                    await $.wait(2 * 1000);
                    if (loginBack > 0) {
                        log('重新获取签到列表...');
                        await PunchIn()
                        await $.wait(2 * 1000)
                        return
                    }
                }
                if (result.code != 0) {
                    log(`❌ 获取失败`)
                    if(result.code == 103){
                        log(`登录失败`)
                    }
                }
                if (result.code == 0) {
                    sign_message = result.data[0]
                    id= sign_message.id
                    signId= sign_message.signId
                    schoolId= sign_message.schoolId

                    var areaList = sign_message.areaList;
                    var area = areaList[0];
                    areaJSON = {
                    "type": area.shape,
                    "circle": {
                        "latitude": area.latitude,
                        "longitude": area.longitude,
                        "radius": area.radius
                    },
                    "id": area.id,
                    "name": area.name
                    };

                    areaJSON = JSON.stringify(areaJSON);

                    //areaJSON = areaJSON.replace(/"/g, '\\"');
 log(areaJSON)
                    log("获取成功，开始签到")
                    PunchInBack = 1
                }

            } catch (e) {
                log(e)
            } finally {
                resolve();
            }
        }, timeout)
    })
}


/**
 * 请求地址信息
 */
function requestAddress(timeout = 3 * 1000) {
    return new Promise((resolve) => {
        location = location.split(',')
        let url = {
            url: `https://apis.map.qq.com/ws/geocoder/v1/?key=A3YBZ-NC5RU-MFYVV-BOHND-RO3OT-ABFCR&location=${location[1]},${location[0]}`,
        }
        $.get(url, async (error, response, data) => {
            try {
                let result = data == "undefined" ? await requestAddress() : JSON.parse(data);
                if (result.status == 0) {
                    log(`地址信息获取成功`);
                    try {town=result.result.address_reference.town.title}catch (e) {town=``}
                    try {street=result.result.address_reference.street.title}catch (e) {street=``}
                    data = {
                        "inArea" : "1",
                        "longitude": location[0],
                        "province": encodeURI(result.result.address_component.province),
                        "latitude": location[1],
                        "streetcode" : result.result.address_reference.street.id,
                        "street": encodeURI(street),
                        "areaJSON" : areaJSON,
                        "citycode": result.result.ad_info.city_code,
                        "city" : encodeURI(result.result.address_component.city),
                        "nationcode" : result.result.ad_info.nation_code,
                        "adcode" : result.result.ad_info.adcode,
                        "district": encodeURI(result.result.address_component.district),
                        "country": encodeURI('中国'),
                        "towncode":  result.result.address_reference.town.id,
                        "township": encodeURI(town),
                    }
                    sign_data = JSON.stringify(data)
                  //log(sign_data)
                    requestAddressBack = 1
                } else {
                    log(`? 地址信息获取失败`)
                    requestAddressBack = 0
                }

            } catch (e) {
                log(e)
            } finally {
                resolve();
            }
        }, timeout)
    })
}


/**
 * 开始签到
 */
function doPunchIn(timeout = 3 * 1000) {
    return new Promise((resolve) => {
        let url = {
            url: `https://gw.wozaixiaoyuan.com/sign/mobile/receive/doSignByArea?id=${id}&schoolId=${schoolId}&signId=${signId}`,
            headers: {
                'jwsession': jwsession,
                'Content-Type': 'application/json'
            },
            body: sign_data,
        }

        $.post(url, async (error, response, data) => {
            try {
                let result = data == "undefined" ? await doPunchIn() : JSON.parse(data);
                if (result.code == 0){
                    log("? 签到成功")
                    status_code = 1
                }
                else {
                    log("? 签到失败，原因："+data)
                }

            } catch (e) {
                log(e)
            } finally {
                resolve();
            }
        }, timeout)
    })
}


/**
 * 获取签到结果
 */
function getResult(timeout = 3 * 1000) {
    res = status_code
    if (res == 1) return "? 签到成功"
    if (res == 2) return "? 你已经签过到了，无需重复签到"
    if (res == 3) return "? 签到失败，当前不在签到时间段内"
    if (res == 4) return "? 签到失败，jwsession 无效"
    if (res == 5) return "? 签到失败，登录错误，请检查账号信息"
    if (res == 6) return "? 跳过打卡，变量参数不完整"
    else return "? 签到失败，发生未知错误"
}


// ============================================变量检查============================================ \\
async function Envs() {
    if (wzxy) {
        if (wzxy.indexOf("@") != -1 || wzxy.indexOf("&") != -1) {
            wzxy.split("@"&&"&").forEach((item) => {
                wzxyArr.push(item);
            });
        }
            // else if (wzxy.indexOf("\n") != -1) {
            //     wzxy.split("\n").forEach((item) => {
            //         wzxyArr.push(item);
            //     });
        // }
        else {
            wzxyArr.push(wzxy);
        }
    } else {
        log(`\n 未填写变量 wzxy`)
        return;
    }

    return true;
}
// ============================================发送消息============================================ \\
async function SendMsg(msg) {
    if (!msg)
        return;

    if (Notify > 0) {
        if ($.isNode()) {
            var notify = require('./sendNotify');
            await notify.sendNotify($.name, msg+ `\n签到时间：${t()}\n`);
        } else {
            $.msg(msg);
        }
    } else {
        //log(msg);
    }
}



/**
 * 获取当前小时数
 */
function local_hours() {
    let myDate = new Date();
    let h = myDate.getHours();
    return h;
}

/**
 * 获取当前分钟数
 */
function local_minutes() {
    let myDate = new Date();
    let m = myDate.getMinutes();
    return m;
}

/**
 * 随机数生成
 */
function randomString(e) {
    e = e || 32;
    var t = "QWERTYUIOPASDFGHJKLZXCVBNM1234567890",
        a = t.length,
        n = "";
    for (i = 0; i < e; i++)
        n += t.charAt(Math.floor(Math.random() * a));
    return n
}

/**
 * 随机整数生成
 */
function randomInt(min, max) {
    return Math.round(Math.random() * (max - min) + min)
}

/**
 * 获取毫秒时间戳
 */
function timestampMs(){
    return new Date().getTime();
}

/**
 *
 * 获取秒时间戳
 */
function timestampS(){
    return Date.parse(new Date())/1000;
}

/**
 * 获取随机诗词
 */
function poem(timeout = 3 * 1000) {
    return new Promise((resolve) => {
        let url = {
            url: `https://v1.jinrishici.com/all.json`
        }
        $.get(url, async (err, resp, data) => {
            try {
                data = JSON.parse(data)
                log(`${data.content}  \n————《${data.origin}》${data.author}`);
            } catch (e) {
                log(e, resp);
            } finally {
                resolve()
            }
        }, timeout)
    })
}

/**
 * 修改配置文件
 */
function modify() {

    fs.readFile('/ql/data/config/config.sh','utf8',function(err,dataStr){
        if(err){
            return log('读取文件失败！'+err)
        }
        else {
            var result = dataStr.replace(/regular/g,string);
            fs.writeFile('/ql/data/config/config.sh', result, 'utf8', function (err) {
                if (err) {return log(err);}
            });
        }
    })
}

/**
 * 获取远程版本
 */
function getVersion(timeout = 3 * 1000) {
    return new Promise((resolve) => {
        let url = {
            url: `https://ghproxy.com/https://raw.githubusercontent.com/zhacha222/wozaixiaoyuan/main/wzxy_qd.js`,
        }
        $.get(url, async (err, resp, data) => {
            try {
                scriptVersionLatest = data.match(/scriptVersion = "([\d\.]+)"/)[1]
                update_data = data.match(/update_data = "(.*?)"/)[1]
            } catch (e) {
                $.logErr(e, resp);
            } finally {
                resolve()
            }
        }, timeout)
    })
}

/**
 * time 输出格式：1970-01-01 00:00:00
 */
function t() {
    var date = new Date();
    // 获取当前月份
    var nowMonth = date.getMonth() + 1;
    // 获取当前是几号
    var strDate = date.getDate();
    //获取当前小时（0-23）
    var nowhour = date.getHours()
    //获取当前分钟（0-59）
    var nowMinute = date.getMinutes()
    //获取当前秒数(0-59)
    var nowSecond = date.getSeconds();
    // 添加分隔符“-”
    var seperator = "-";
    // 添加分隔符“:”
    var seperator1 = ":";

    // 对月份进行处理，1-9月在前面添加一个“0”
    if (nowMonth >= 1 && nowMonth <= 9) {
        nowMonth = "0" + nowMonth;
    }
    // 对月份进行处理，1-9号在前面添加一个“0”
    if (strDate >= 0 && strDate <= 9) {
        strDate = "0" + strDate;
    }
    // 对小时进行处理，0-9号在前面添加一个“0”
    if (nowhour >= 0 && nowhour <= 9) {
        nowhour = "0" + nowhour;
    }
    // 对分钟进行处理，0-9号在前面添加一个“0”
    if (nowMinute >= 0 && nowMinute <= 9) {
        nowMinute = "0" + nowMinute;
    }
    // 对秒数进行处理，0-9号在前面添加一个“0”
    if (nowSecond >= 0 && nowSecond <= 9) {
        nowSecond = "0" + nowSecond;
    }

    // 最后拼接字符串，得到一个格式为(yyyy-MM-dd)的日期
    var nowDate = date.getFullYear() + seperator + nowMonth + seperator + strDate + ` ` + nowhour + seperator1 + nowMinute + seperator1 + nowSecond
    return nowDate
}

function Env(t, e) {
    "undefined" != typeof process && JSON.stringify(process.env).indexOf("GITHUB") > -1 && process.exit(0);
    class s {
        constructor(t) {
            this.env = t
        }
        send(t, e = "GET") {
            t = "string" == typeof t ? {
                url: t
            } : t;
            let s = this.get;
            return "POST" === e && (s = this.post), new Promise((e, i) => {
                s.call(this, t, (t, s, r) => {
                    t ? i(t) : e(s)
                })
            })
        }
        get(t) {
            return this.send.call(this.env, t)
        }
        post(t) {
            return this.send.call(this.env, t, "POST")
        }
    }
    return new class {
        constructor(t, e) {
            this.name = t, this.http = new s(this), this.data = null, this.dataFile = "box.dat", this.logs = [], this.isMute = !1, this.isNeedRewrite = !1, this.logSeparator = "\n", this.startTime = (new Date).getTime(), Object.assign(this, e), this.log("", `?${this.name}, 开始!`)
        }
        isNode() {
            return "undefined" != typeof module && !!module.exports
        }
        isQuanX() {
            return "undefined" != typeof $task
        }
        isSurge() {
            return "undefined" != typeof $httpClient && "undefined" == typeof $loon
        }
        isLoon() {
            return "undefined" != typeof $loon
        }
        toObj(t, e = null) {
            try {
                return JSON.parse(t)
            } catch {
                return e
            }
        }
        toStr(t, e = null) {
            try {
                return JSON.stringify(t)
            } catch {
                return e
            }
        }
        getjson(t, e) {
            let s = e;
            const i = this.getdata(t);
            if (i) try {
                s = JSON.parse(this.getdata(t))
            } catch {}
            return s
        }
        setjson(t, e) {
            try {
                return this.setdata(JSON.stringify(t), e)
            } catch {
                return !1
            }
        }
        getScript(t) {
            return new Promise(e => {
                this.get({
                    url: t
                }, (t, s, i) => e(i))
            })
        }
        runScript(t, e) {
            return new Promise(s => {
                let i = this.getdata("@chavy_boxjs_userCfgs.httpapi");
                i = i ? i.replace(/\n/g, "").trim() : i;
                let r = this.getdata("@chavy_boxjs_userCfgs.httpapi_timeout");
                r = r ? 1 * r : 20, r = e && e.timeout ? e.timeout : r;
                const [o, h] = i.split("@"), n = {
                    url: `http://${h}/v1/scripting/evaluate`,
                    body: {
                        script_text: t,
                        mock_type: "cron",
                        timeout: r
                    },
                    headers: {
                        "X-Key": o,
                        Accept: "*/*"
                    }
                };
                this.post(n, (t, e, i) => s(i))
            }).catch(t => this.logErr(t))
        }
        loaddata() {
            if (!this.isNode()) return {}; {
                this.fs = this.fs ? this.fs : require("fs"), this.path = this.path ? this.path : require("path");
                const t = this.path.resolve(this.dataFile),
                    e = this.path.resolve(process.cwd(), this.dataFile),
                    s = this.fs.existsSync(t),
                    i = !s && this.fs.existsSync(e);
                if (!s && !i) return {}; {
                    const i = s ? t : e;
                    try {
                        return JSON.parse(this.fs.readFileSync(i))
                    } catch (t) {
                        return {}
                    }
                }
            }
        }
        writedata() {
            if (this.isNode()) {
                this.fs = this.fs ? this.fs : require("fs"), this.path = this.path ? this.path : require("path");
                const t = this.path.resolve(this.dataFile),
                    e = this.path.resolve(process.cwd(), this.dataFile),
                    s = this.fs.existsSync(t),
                    i = !s && this.fs.existsSync(e),
                    r = JSON.stringify(this.data);
                s ? this.fs.writeFileSync(t, r) : i ? this.fs.writeFileSync(e, r) : this.fs.writeFileSync(t, r)
            }
        }
        lodash_get(t, e, s) {
            const i = e.replace(/\[(\d+)\]/g, ".$1").split(".");
            let r = t;
            for (const t of i)
                if (r = Object(r)[t], void 0 === r) return s;
            return r
        }
        lodash_set(t, e, s) {
            return Object(t) !== t ? t : (Array.isArray(e) || (e = e.toString().match(/[^.[\]]+/g) || []), e.slice(0, -1).reduce((t, s, i) => Object(t[s]) === t[s] ? t[s] : t[s] = Math.abs(e[i + 1]) >> 0 == +e[i + 1] ? [] : {}, t)[e[e.length - 1]] = s, t)
        }
        getdata(t) {
            let e = this.getval(t);
            if (/^@/.test(t)) {
                const [, s, i] = /^@(.*?)\.(.*?)$/.exec(t), r = s ? this.getval(s) : "";
                if (r) try {
                    const t = JSON.parse(r);
                    e = t ? this.lodash_get(t, i, "") : e
                } catch (t) {
                    e = ""
                }
            }
            return e
        }
        setdata(t, e) {
            let s = !1;
            if (/^@/.test(e)) {
                const [, i, r] = /^@(.*?)\.(.*?)$/.exec(e), o = this.getval(i), h = i ? "null" === o ? null : o || "{}" : "{}";
                try {
                    const e = JSON.parse(h);
                    this.lodash_set(e, r, t), s = this.setval(JSON.stringify(e), i)
                } catch (e) {
                    const o = {};
                    this.lodash_set(o, r, t), s = this.setval(JSON.stringify(o), i)
                }
            } else s = this.setval(t, e);
            return s
        }
        getval(t) {
            return this.isSurge() || this.isLoon() ? $persistentStore.read(t) : this.isQuanX() ? $prefs.valueForKey(t) : this.isNode() ? (this.data = this.loaddata(), this.data[t]) : this.data && this.data[t] || null
        }
        setval(t, e) {
            return this.isSurge() || this.isLoon() ? $persistentStore.write(t, e) : this.isQuanX() ? $prefs.setValueForKey(t, e) : this.isNode() ? (this.data = this.loaddata(), this.data[e] = t, this.writedata(), !0) : this.data && this.data[e] || null
        }
        initGotEnv(t) {
            this.got = this.got ? this.got : require("got"), this.cktough = this.cktough ? this.cktough : require("tough-cookie"), this.ckjar = this.ckjar ? this.ckjar : new this.cktough.CookieJar, t && (t.headers = t.headers ? t.headers : {}, void 0 === t.headers.Cookie && void 0 === t.cookieJar && (t.cookieJar = this.ckjar))
        }
        get(t, e = (() => {})) {
            t.headers && (delete t.headers["Content-Type"], delete t.headers["Content-Length"]), this.isSurge() || this.isLoon() ? (this.isSurge() && this.isNeedRewrite && (t.headers = t.headers || {}, Object.assign(t.headers, {
                "X-Surge-Skip-Scripting": !1
            })), $httpClient.get(t, (t, s, i) => {
                !t && s && (s.body = i, s.statusCode = s.status), e(t, s, i)
            })) : this.isQuanX() ? (this.isNeedRewrite && (t.opts = t.opts || {}, Object.assign(t.opts, {
                hints: !1
            })), $task.fetch(t).then(t => {
                const {
                    statusCode: s,
                    statusCode: i,
                    headers: r,
                    body: o
                } = t;
                e(null, {
                    status: s,
                    statusCode: i,
                    headers: r,
                    body: o
                }, o)
            }, t => e(t))) : this.isNode() && (this.initGotEnv(t), this.got(t).on("redirect", (t, e) => {
                try {
                    if (t.headers["set-cookie"]) {
                        const s = t.headers["set-cookie"].map(this.cktough.Cookie.parse).toString();
                        s && this.ckjar.setCookieSync(s, null), e.cookieJar = this.ckjar
                    }
                } catch (t) {
                    this.logErr(t)
                }
            }).then(t => {
                const {
                    statusCode: s,
                    statusCode: i,
                    headers: r,
                    body: o
                } = t;
                e(null, {
                    status: s,
                    statusCode: i,
                    headers: r,
                    body: o
                }, o)
            }, t => {
                const {
                    message: s,
                    response: i
                } = t;
                e(s, i, i && i.body)
            }))
        }
        post(t, e = (() => {})) {
            if (t.body && t.headers && !t.headers["Content-Type"] && (t.headers["Content-Type"] = "application/x-www-form-urlencoded"), t.headers && delete t.headers["Content-Length"], this.isSurge() || this.isLoon()) this.isSurge() && this.isNeedRewrite && (t.headers = t.headers || {}, Object.assign(t.headers, {
                "X-Surge-Skip-Scripting": !1
            })), $httpClient.post(t, (t, s, i) => {
                !t && s && (s.body = i, s.statusCode = s.status), e(t, s, i)
            });
            else if (this.isQuanX()) t.method = "POST", this.isNeedRewrite && (t.opts = t.opts || {}, Object.assign(t.opts, {
                hints: !1
            })), $task.fetch(t).then(t => {
                const {
                    statusCode: s,
                    statusCode: i,
                    headers: r,
                    body: o
                } = t;
                e(null, {
                    status: s,
                    statusCode: i,
                    headers: r,
                    body: o
                }, o)
            }, t => e(t));
            else if (this.isNode()) {
                this.initGotEnv(t);
                const {
                    url: s,
                    ...i
                } = t;
                this.got.post(s, i).then(t => {
                    const {
                        statusCode: s,
                        statusCode: i,
                        headers: r,
                        body: o
                    } = t;
                    e(null, {
                        status: s,
                        statusCode: i,
                        headers: r,
                        body: o
                    }, o)
                }, t => {
                    const {
                        message: s,
                        response: i
                    } = t;
                    e(s, i, i && i.body)
                })
            }
        }
        time(t, e = null) {
            const s = e ? new Date(e) : new Date;
            let i = {
                "M+": s.getMonth() + 1,
                "d+": s.getDate(),
                "H+": s.getHours(),
                "m+": s.getMinutes(),
                "s+": s.getSeconds(),
                "q+": Math.floor((s.getMonth() + 3) / 3),
                S: s.getMilliseconds()
            };
            /(y+)/.test(t) && (t = t.replace(RegExp.$1, (s.getFullYear() + "").substr(4 - RegExp.$1.length)));
            for (let e in i) new RegExp("(" + e + ")").test(t) && (t = t.replace(RegExp.$1, 1 == RegExp.$1.length ? i[e] : ("00" + i[e]).substr(("" + i[e]).length)));
            return t
        }
        msg(e = t, s = "", i = "", r) {
            const o = t => {
                if (!t) return t;
                if ("string" == typeof t) return this.isLoon() ? t : this.isQuanX() ? {
                    "open-url": t
                } : this.isSurge() ? {
                    url: t
                } : void 0;
                if ("object" == typeof t) {
                    if (this.isLoon()) {
                        let e = t.openUrl || t.url || t["open-url"],
                            s = t.mediaUrl || t["media-url"];
                        return {
                            openUrl: e,
                            mediaUrl: s
                        }
                    }
                    if (this.isQuanX()) {
                        let e = t["open-url"] || t.url || t.openUrl,
                            s = t["media-url"] || t.mediaUrl;
                        return {
                            "open-url": e,
                            "media-url": s
                        }
                    }
                    if (this.isSurge()) {
                        let e = t.url || t.openUrl || t["open-url"];
                        return {
                            url: e
                        }
                    }
                }
            };
            if (this.isMute || (this.isSurge() || this.isLoon() ? $notification.post(e, s, i, o(r)) : this.isQuanX() && $notify(e, s, i, o(r))), !this.isMuteLog) {
                let t = ["", "==============?系统通知?=============="];
                t.push(e), s && t.push(s), i && t.push(i), console.log(t.join("\n")), this.logs = this.logs.concat(t)
            }
        }
        log(...t) {
            t.length > 0 && (this.logs = [...this.logs, ...t]), console.log(t.join(this.logSeparator))
        }
        logErr(t, e) {
            const s = !this.isSurge() && !this.isQuanX() && !this.isLoon();
            s ? this.log("", `??${this.name}, 错误!`, t.stack) : this.log("", `??${this.name}, 错误!`, t)
        }
        wait(t) {
            return new Promise(e => setTimeout(e, t))
        }
        done(t = {}) {
            const e = (new Date).getTime(),
                s = (e - this.startTime) / 1e3;
            this.log("", `?${this.name}, 结束! ? ${s} 秒`), this.log(), (this.isSurge() || this.isQuanX() || this.isLoon()) && $done(t)
        }
    }(t, e)
}
