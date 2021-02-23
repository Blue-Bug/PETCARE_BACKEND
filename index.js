const express = require('express');
const app = express();

const bodyParser = require('body-parser');
const http = require('http');//http 기본 라이브러리

const date = require('./date');
const watchdog = require('./watchdog');
const database = require('./database');
const connection = database.get_connection();

//----Android PUSH Setting------//
var admin = require("firebase-admin");
var serviceAccount = require('./config/petcare-master-df8cb-firebase-adminsdk-nty45-03ddb623f6.json');
const commands = require('./commands');

var dateObj = date.getnewdate();
console.log(dateObj.year+'-'+dateObj.month+'-'+dateObj.date+' '+dateObj.weekday);
console.log(hours+':'+minutes+':'+seconds);


app.use(bodyParser.urlencoded({extended: false}));

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://petcare-master-df8cb.firebaseio.com"
});
  

watchdog._1mScheduler(connection,admin);
watchdog._dawnScheduler(connection);


app.get('/',(req,res)=>{
    res.send('express.js 테스트');  
});

app.get('/testauto',(req,res)=>{
    var sql = 'SELECT * FROM USER WHERE arduino_id = ?';
    var params = ['POPS6688'];
    connection.query(sql,params,function(err,rows,fields){
        if(!err){
            commands.sendPushAlarm(admin,rows[0].app_token,'사료 남김 알림','사료를 반절 이상이나 남겼네요. 몸이 아픈건 아닐까요? 확인해주세요.');
        }
        else{
        }
    });
});

app.get('/pushTEST',(req,res)=>{
    res.send('푸시알람 테스트');
    var sql = 'SELECT * FROM USER WHERE arduino_id = \'AAAA1232\'';
    connection.query(sql,function(err,rows,fields){
        if(!err){
            commands.sendPushAlarm(admin,rows[0].app_token,"TEST","TEST");
        }   
        else{
            console.log('push alarm error');
        }
    });
})

app.post('/sendCommand',(req,res)=>{
    console.log(req.body);
    if(req.body.id == "undefined"){
        console.log('NO ID HERE');
        res.send("ID Value Missing");
    }
    else{
        //COMMAND CASE 1 = 배식 예약
        //예약하기
            //예약하기 전 ALWAYS 테이블과 FEED 테이블에서 먼저조회
            //있으면 이미 존재한다고 알리고 예약취소
        if(req.body.command == 1){
            var sql = 'SELECT * FROM FEED WHERE arduino_id = ? and feed_weekday = ? and feed_time = ?';
            var params = [req.body.id,req.body.weekday,req.body.time];
            connection.query(sql,params,function(err,rows,fields){
                //해당 날짜에 예약된것이 있는지 확인
                if(!err){
                    //해당 날짜,시간에 예약된 것이 없다면
                    if(rows.length==0){
                        sql = 'INSERT into FEED values(?,?,?,?,?,?,?,?)';
                        params = [req.body.id,
                                    req.body.weekday,
                                    req.body.time,
                                    req.body.c1,
                                    req.body.c2,
                                    req.body.c3,
                                    req.body.auto,
                                    req.body.always];
                        connection.query(sql,params,function(err,rows,fields){
                            if(!err){
                                console.log('DB Query Successfully Executed : ',sql);
                                console.log('VALUE INSERTED');
                                res.send("Your Request Succesfully Executed"); 
                            }
                            else{
                                console.log('Error while performing Query',err);
                                res.send("Your Request NOT Executed"); 
                            }
                        });
                    }
                    //해당 날짜,시간에 예약된 것이 있다면
                    else{
                        console.log(rows);
                        res.send('Schedule Already EXIST');
                    }
                }
                else{
                    console.log('Error while performing Query',err);
                    res.send("Your Request NOT Executed"); 
                }
            });
        }
        //COMMAND CASE 2 = 즉시 배식
        //즉시 배식하기
            //배식하기 전 테이블에 있는지 검사해서 있으면 진짜로 배식할건지 물어보기?
            //아두이노로 HTTP GET으로 명령 전송
        else if(req.body.command == 2){
            var sql = 'SELECT * FROM USER WHERE arduino_id = ?';
            var params = [req.body.id];
            var feed_con = [req.body.c1,req.body.c2,req.body.c3];
            connection.query(sql,params,function(err,rows,fields){
                if(!err){
                    var hosturl = rows[0].ext_ip;
                    var pathurl = '/MOTOR?';
                    var cat_dog = rows[0].cat_dog;
                    console.log(hosturl);
                    if(rows.length == 0){
                        console.log('Arduino NO EXIST');
                        res.send("ID Value Missing");
                    }
                    else{
                        if(req.body.is_auto == 1){
                            //몸무게 별 자동 급식량 조절
                            //총 지급해야하는 일일칼로리/3 한 값을 (한끼)받음
                            //건사료는 1g 당 3~4kcal
                                //몸무게 별 자동 급식량 조절
                                var app_token = rows[0].app_token;
                                var sql = 'SELECT * FROM WEIGHT WHERE arduino_id = ?';
                                var params = [rows[0].arduino_id];
                                connection.query(sql,params,function(err,rows,fields){
                                    if(!err){
                                        if(rows.length == 0){
                                            //고양이나 개 정상 몸무게 기준으로 자동 계산
                                            if(cat_dog==0){         
                                               
                                                var feedCon = 29;
                                                pathurl = pathurl + 'c1='+ feedCon + '&c2=' +
                                                feedCon + '&c3=' + feedCon;  

                                                var options = {
                                                    host: hosturl,
                                                    port: 80,
                                                    method: 'GET',
                                                    path: pathurl,
                                                    headers: {
                                                        'Content-Type': 'application/x-www-form-urlencoded',
                                                        'Content-Length': 0
                                                    }
                                                };
                                                const req = http.request(options,function(res){
                                                    res.setEncoding('utf8');
                                                });
                                                req.on('close',function(){
                                                    console.log('CLOSED');
                                                });
                                                req.on('error',function(e){
                                                    console.log(e);
                                                });
                                                req.on('timeout',function(){
                                                    console.log('TIMEOUT!');
                                                    req.destroy();
                                                });
                                                req.end();
                                                console.log('1 여기임 '+ pathurl);
                                                console.log('SEND COMPLETE ',feedCon);
                                                //DB weight에 consume_c1,c2,c3 업데이트
                                                _updateContainer(rows[0].arduino_id,feedCon,feedCon,feedCon);
                                            }
                                            else if(cat_dog==1){
                                                var feedCon = 33;
                                                pathurl = pathurl + 'c1='+ feedCon + '&c2=' +
                                                feedCon + '&c3=' + feedCon;  

                                                var options = {
                                                    host: hosturl,
                                                    port: 80,
                                                    method: 'GET',
                                                    path: pathurl,
                                                    headers: {
                                                        'Content-Type': 'application/x-www-form-urlencoded',
                                                        'Content-Length': 0
                                                    }
                                                };
                                                const req = http.request(options,function(res){
                                                    res.setEncoding('utf8');
                                                });
                                                req.on('close',function(){
                                                    console.log('CLOSED');
                                                });
                                                req.on('error',function(e){
                                                    console.log(e);
                                                });
                                                req.on('timeout',function(){
                                                    console.log('TIMEOUT!');
                                                    req.destroy();
                                                });
                                                req.end();
                                                console.log('2 여기임 '+ pathurl);
                                                console.log('SEND COMPLETE ',feedCon);
                                                //DB weight에 consume_c1,c2,c3 업데이트
                                                _updateContainer(rows[0].arduino_id,feedCon,feedCon,feedCon);
                                            }
                                        }
                                        else if(rows.length < 3){
                                            //마지막 무게 기록으로 계산해서 준다.
                                            var weight = rows[rows.length-1].weight;
                                            var RER = 30 * average_Weight + 70;
                                            if(cat_dog==0){
                                                var DER = RER * 1;
                                                var feedCon = (DER/18)+10;
                                                feedCon = feedCon.toFixed(2);
                                                pathurl = pathurl + 'c1='+ feedCon + '&c2=' +
                                                feedCon + '&c3=' + feedCon;  

                                                var options = {
                                                    host: hosturl,
                                                    port: 80,
                                                    method: 'GET',
                                                    path: pathurl,
                                                    headers: {
                                                        'Content-Type': 'application/x-www-form-urlencoded',
                                                        'Content-Length': 0
                                                    }
                                                };
                                                const req = http.request(options,function(res){
                                                    res.setEncoding('utf8');
                                                });
                                                req.on('close',function(){
                                                    console.log('CLOSED');
                                                });
                                                req.on('error',function(e){
                                                    console.log(e);
                                                });
                                                req.on('timeout',function(){
                                                    console.log('TIMEOUT!');
                                                    req.destroy();
                                                });
                                                req.end();
                                                console.log('3 여기임 '+ pathurl);
                                                console.log('SEND COMPLETE ',feedCon);
                                                //DB weight에 consume_c1,c2,c3 업데이트
                                                _updateContainer(rows[0].arduino_id,feedCon,feedCon,feedCon);
                                            }
                                            else if(cat_dog==1){
                                                var DER = RER * 1.6;
                                                var feedCon = (DER/18)+10;
                                                feedCon = feedCon.toFixed(2);
                                                pathurl = pathurl + 'c1='+ feedCon + '&c2=' +
                                                feedCon + '&c3=' + feedCon;  

                                                var options = {
                                                    host: hosturl,
                                                    port: 80,
                                                    method: 'GET',
                                                    path: pathurl,
                                                    headers: {
                                                        'Content-Type': 'application/x-www-form-urlencoded',
                                                        'Content-Length': 0
                                                    }
                                                };
                                                const req = http.request(options,function(res){
                                                    res.setEncoding('utf8');
                                                });
                                                req.on('close',function(){
                                                    console.log('CLOSED');
                                                });
                                                req.on('error',function(e){
                                                    console.log(e);
                                                });
                                                req.on('timeout',function(){
                                                    console.log('TIMEOUT!');
                                                    req.destroy();
                                                });
                                                req.end();
                                                console.log('4 여기임 '+ pathurl);
                                                console.log('SEND COMPLETE ',feedCon);
                                                //DB weight에 consume_c1,c2,c3 업데이트
                                                _updateContainer(rows[0].arduino_id,feedCon,feedCon,feedCon);
                                            }
                                        }
                                        else if(rows.length <= 7){
                                            var diff_plus = 0;
                                            var diff_minus = 0;
                                            var sum = rows[0].weight;
                                            for(var i = 1; i < rows.length; i++){
                                                var result = rows[i-1].weight - rows[i].weight;
                                                if(result > 0){
                                                    diff_plus++;
                                                }
                                                else if(result < 0){
                                                    diff_minus++;
                                                }
                                                else{
                                                    //몸무게가 안변함
                                                }
                                                sum += rows[i].weight;
                                            }
                                            if(diff_plus==6){
                                                sendPushAlarm(app_token,"건강 이상 알림","일주일 동안 계속해서 몸무게가 감소하였네요. 어디가 아픈건 아닐까요?");
                                            }
                                            var average_Weight = (sum/rows.length).toFixed(2);
                                            console.log('자동 배식 '+average_Weight);
                                            if(diff_plus > diff_minus){
                                                //몸무게가 감소하고 있었음
                                                //정상몸무게 - 평균 기록
                                                var RER = 30 * average_Weight + 70;
                                                if(cat_dog==0){
                                                    //240이 정상 kcal
                                                    var DER = RER * 1.2;
                                                    if(DER >= 240){
                                                        //그래도 정상 몸무게 보다 크다면 계산한 값을 줌
                                                        var feedCon = (DER/18)+10;
                                                        feedCon = feedCon.toFixed(2);
                                                        pathurl = pathurl + 'c1='+ feedCon + '&c2=' +
                                                        feedCon + '&c3=' + feedCon;  

                                                        var options = {
                                                            host: hosturl,
                                                            port: 80,
                                                            method: 'GET',
                                                            path: pathurl,
                                                            headers: {
                                                                'Content-Type': 'application/x-www-form-urlencoded',
                                                                'Content-Length': 0
                                                            }
                                                        };
                                                        const req = http.request(options,function(res){
                                                            res.setEncoding('utf8');
                                                        });
                                                        req.on('close',function(){
                                                            console.log('CLOSED');
                                                        });
                                                        req.on('error',function(e){
                                                            console.log(e);
                                                        });
                                                        req.on('timeout',function(){
                                                            console.log('TIMEOUT!');
                                                            req.destroy();
                                                        });
                                                        req.end();
                                                        console.log('5 여기임 '+ pathurl);
                                                        console.log('SEND COMPLETE ',feedCon);
                                                        //DB weight에 consume_c1,c2,c3 업데이트
                                                        _updateContainer(rows[0].arduino_id,feedCon,feedCon,feedCon);
                                                    }
                                                    else{
                                                        var plusfeed = 240-DER;
                                                        RER = 30 * rows[rows.length-1].weight + 70;
                                                        //활동량이 큰 것으로 판단
                                                        DER = RER * 1.6;
                                                        //총 지급해야하는 칼로리/3 한 값을 보내줌
                                                        var feedCon = ((DER + plusfeed)/18)+10;
                                                        feedCon = feedCon.toFixed(2);
                                                        pathurl = pathurl + 'c1='+ feedCon + '&c2=' +
                                                        feedCon + '&c3=' + feedCon;  

                                                        var options = {
                                                            host: hosturl,
                                                            port: 80,
                                                            method: 'GET',
                                                            path: pathurl,
                                                            headers: {
                                                                'Content-Type': 'application/x-www-form-urlencoded',
                                                                'Content-Length': 0
                                                            }
                                                        };
                                                        const req = http.request(options,function(res){
                                                            res.setEncoding('utf8');
                                                        });
                                                        req.on('close',function(){
                                                            console.log('CLOSED');
                                                        });
                                                        req.on('error',function(e){
                                                            console.log(e);
                                                        });
                                                        req.on('timeout',function(){
                                                            console.log('TIMEOUT!');
                                                            req.destroy();
                                                        });
                                                        req.end();
                                                        console.log('6 여기임 '+ pathurl);
                                                        console.log('SEND COMPLETE ',feedCon);
                                                        //DB weight에 consume_c1,c2,c3 업데이트
                                                        _updateContainer(rows[0].arduino_id,feedCon,feedCon,feedCon);
                                                    }        
                                                }
                                                else if(cat_dog==1){
                                                    //352가 정상 kcal(기초 대사량)
                                                    var DER = RER * 1.6;
                                                    if(DER >= 352){
                                                        var feedCon = (DER/18)+10;
                                                        feedCon = feedCon.toFixed(2);
                                                        pathurl = pathurl + 'c1='+ feedCon + '&c2=' +
                                                        feedCon + '&c3=' + feedCon;  

                                                        var options = {
                                                            host: hosturl,
                                                            port: 80,
                                                            method: 'GET',
                                                            path: pathurl,
                                                            headers: {
                                                                'Content-Type': 'application/x-www-form-urlencoded',
                                                                'Content-Length': 0
                                                            }
                                                        };
                                                        const req = http.request(options,function(res){
                                                            res.setEncoding('utf8');
                                                        });
                                                        req.on('close',function(){
                                                            console.log('CLOSED');
                                                        });
                                                        req.on('error',function(e){
                                                            console.log(e);
                                                        });
                                                        req.on('timeout',function(){
                                                            console.log('TIMEOUT!');
                                                            req.destroy();
                                                        });
                                                        req.end();
                                                        console.log('7 여기임 '+ pathurl);
                                                        console.log('SEND COMPLETE ',feedCon);
                                                        //DB weight에 consume_c1,c2,c3 업데이트
                                                        _updateContainer(rows[0].arduino_id,feedCon,feedCon,feedCon);
                                                    }
                                                    else{
                                                        var plusfeed = 352-DER;
                                                        RER = 30 * rows[rows.length-1].weight + 70;
                                                        DER = RER * 2.5;
                                                        var feedCon = ((DER + plusfeed)/18)+10;
                                                        feedCon = feedCon.toFixed(2);
                                                        pathurl = pathurl + 'c1='+ feedCon + '&c2=' +
                                                        feedCon + '&c3=' + feedCon;  

                                                        var options = {
                                                            host: hosturl,
                                                            port: 80,
                                                            method: 'GET',
                                                            path: pathurl,
                                                            headers: {
                                                                'Content-Type': 'application/x-www-form-urlencoded',
                                                                'Content-Length': 0
                                                            }
                                                        };
                                                        const req = http.request(options,function(res){
                                                            res.setEncoding('utf8');
                                                        });
                                                        req.on('close',function(){
                                                            console.log('CLOSED');
                                                        });
                                                        req.on('error',function(e){
                                                            console.log(e);
                                                        });
                                                        req.on('timeout',function(){
                                                            console.log('TIMEOUT!');
                                                            req.destroy();
                                                        });
                                                        req.end();
                                                        console.log('8 여기임 '+ pathurl);
                                                        console.log('SEND COMPLETE ',feedCon);
                                                        //DB weight에 consume_c1,c2,c3 업데이트
                                                        _updateContainer(rows[0].arduino_id,feedCon,feedCon,feedCon);
                                                    }
                                                }
                                            }
                                            else if(diff_plus < diff_minus){
                                                //몸무게가 증가하고 있었음
                                                var RER = 30 * average_Weight + 70;
                                                
                                                console.log('자동 배식 '+ RER);
                                                if(cat_dog==0){
                                                    //좀더 늘려서 300을 정상 kcal
                                                    var DER = RER * 1.4;
                                                    if(DER <= 300){
                                                        //정상 체중 섭취량 보다 작거나 같다면 계산한 값을 줌
                                                        var feedCon = (DER/18)+10;
                                                        feedCon = feedCon.toFixed(2);
                                                        pathurl = pathurl + 'c1='+ feedCon + '&c2=' +
                                                        feedCon + '&c3=' + feedCon;  
                                                        
                                                        var options = {
                                                            host: hosturl,
                                                            port: 80,
                                                            method: 'GET',
                                                            path: pathurl,
                                                            headers: {
                                                                'Content-Type': 'application/x-www-form-urlencoded',
                                                                'Content-Length': 0
                                                            }
                                                        };
                                                        const req = http.request(options,function(res){
                                                            res.setEncoding('utf8');
                                                        });
                                                        req.on('close',function(){
                                                            console.log('CLOSED');
                                                        });
                                                        req.on('error',function(e){
                                                            console.log(e);
                                                        });
                                                        req.on('timeout',function(){
                                                            console.log('TIMEOUT!');
                                                            req.destroy();
                                                        });
                                                        req.end();
                                                        console.log('9 여기임 '+ pathurl);
                                                        console.log('SEND COMPLETE ',feedCon);
                                                        //DB weight에 consume_c1,c2,c3 업데이트
                                                        _updateContainer(rows[0].arduino_id,feedCon,feedCon,feedCon);
                                                    }
                                                    else{
                                                        var minusfeed = DER-300;
                                                        RER = 30 * rows[rows.length-1].weight + 70;
                                                        //활동량이 적은 것으로 판단
                                                        DER = RER * 0.8;
                                                        //총 지급해야하는 칼로리/3 한 값을 보내줌
                                                        var feedCon = ((DER - minusfeed)/18)+10;
                                                        feedCon = feedCon.toFixed(2);
                                                        pathurl = pathurl + 'c1='+ feedCon + '&c2=' +
                                                        feedCon + '&c3=' + feedCon;  

                                                        var options = {
                                                            host: hosturl,
                                                            port: 80,
                                                            method: 'GET',
                                                            path: pathurl,
                                                            headers: {
                                                                'Content-Type': 'application/x-www-form-urlencoded',
                                                                'Content-Length': 0
                                                            }
                                                        };
                                                        const req = http.request(options,function(res){
                                                            res.setEncoding('utf8');
                                                        });
                                                        req.on('close',function(){
                                                            console.log('CLOSED');
                                                        });
                                                        req.on('error',function(e){
                                                            console.log(e);
                                                        });
                                                        req.on('timeout',function(){
                                                            console.log('TIMEOUT!');
                                                            req.destroy();
                                                        });
                                                        req.end();
                                                        console.log('10 여기임 '+ pathurl);
                                                        console.log('SEND COMPLETE ',feedCon);
                                                        //DB weight에 consume_c1,c2,c3 업데이트
                                                        _updateContainer(rows[0].arduino_id,feedCon,feedCon,feedCon);
                                                    }        
                                                }
                                                else if(cat_dog==1){
                                                    //352가 정상 kcal(기초 대사량)
                                                    var DER = RER * 1.6;
                                                    if(DER <= 352){
                                                        var feedCon = (DER/18)+10;
                                                        feedCon = feedCon.toFixed(2);
                                                        pathurl = pathurl + 'c1='+ feedCon + '&c2=' +
                                                        feedCon + '&c3=' + feedCon;  

                                                        var options = {
                                                            host: hosturl,
                                                            port: 80,
                                                            method: 'GET',
                                                            path: pathurl,
                                                            headers: {
                                                                'Content-Type': 'application/x-www-form-urlencoded',
                                                                'Content-Length': 0
                                                            }
                                                        };
                                                        const req = http.request(options,function(res){
                                                            res.setEncoding('utf8');
                                                        });
                                                        req.on('close',function(){
                                                            console.log('CLOSED');
                                                        });
                                                        req.on('error',function(e){
                                                            console.log(e);
                                                        });
                                                        req.on('timeout',function(){
                                                            console.log('TIMEOUT!');
                                                            req.destroy();
                                                        });
                                                        req.end();
                                                        console.log('11 여기임 '+ pathurl);
                                                        console.log('SEND COMPLETE ',feedCon);
                                                        //DB weight에 consume_c1,c2,c3 업데이트
                                                        _updateContainer(rows[0].arduino_id,feedCon,feedCon,feedCon);
                                                    }
                                                    else{
                                                        var minusfeed = DER-352;
                                                        RER = 30 * rows[rows.length-1].weight + 70;
                                                        DER = RER * 0.8;
                                                        var feedCon = ((DER - minusfeed)/18)+10;
                                                        feedCon = feedCon.toFixed(2);
                                                        pathurl = pathurl + 'c1='+ feedCon + '&c2=' +
                                                        feedCon + '&c3=' + feedCon;  

                                                        var options = {
                                                            host: hosturl,
                                                            port: 80,
                                                            method: 'GET',
                                                            path: pathurl,
                                                            headers: {
                                                                'Content-Type': 'application/x-www-form-urlencoded',
                                                                'Content-Length': 0
                                                            }
                                                        };
                                                        const req = http.request(options,function(res){
                                                            res.setEncoding('utf8');
                                                        });
                                                        req.on('close',function(){
                                                            console.log('CLOSED');
                                                        });
                                                        req.on('error',function(e){
                                                            console.log(e);
                                                        });
                                                        req.on('timeout',function(){
                                                            console.log('TIMEOUT!');
                                                            req.destroy();
                                                        });
                                                        req.end();
                                                        console.log('12 여기임 '+ pathurl);
                                                        console.log('SEND COMPLETE ',feedCon);
                                                        //DB weight에 consume_c1,c2,c3 업데이트
                                                        _updateContainer(rows[0].arduino_id,feedCon,feedCon,feedCon);
                                                    }
                                                }
                                            }
                                            else{
                                                //+,-가 같다면 그냥 마지막 몸무게로 계산
                                                var weight = rows[rows.length-1].weight;
                                                var RER = 30 * weight + 70;
                                                if(cat_dog==0){
                                                    var DER = RER * 1;
                                                    var feedCon = (DER/18)+10;
                                                    feedCon = feedCon.toFixed(2);
                                                    pathurl = pathurl + 'c1='+ feedCon + '&c2=' +
                                                    feedCon + '&c3=' + feedCon;  

                                                    var options = {
                                                        host: hosturl,
                                                        port: 80,
                                                        method: 'GET',
                                                        path: pathurl,
                                                        headers: {
                                                            'Content-Type': 'application/x-www-form-urlencoded',
                                                            'Content-Length': 0
                                                        }
                                                    };
                                                    const req = http.request(options,function(res){
                                                        res.setEncoding('utf8');
                                                    });
                                                    req.on('close',function(){
                                                        console.log('CLOSED');
                                                    });
                                                    req.on('error',function(e){
                                                        console.log(e);
                                                    });
                                                    req.on('timeout',function(){
                                                        console.log('TIMEOUT!');
                                                        req.destroy();
                                                    });
                                                    req.end();
                                                    console.log('13 여기임 '+ pathurl);
                                                    console.log('SEND COMPLETE ',feedCon);
                                                    //DB weight에 consume_c1,c2,c3 업데이트
                                                    _updateContainer(rows[0].arduino_id,feedCon,feedCon,feedCon);
                                                }
                                                else if(cat_dog==1){
                                                    var DER = RER * 1.6;
                                                    var feedCon = (DER /18)+10;
                                                    feedCon =feedCon.toFixed(2);
                                                    pathurl = pathurl + 'c1='+ feedCon + '&c2=' +
                                                    feedCon + '&c3=' + feedCon;  

                                                    var options = {
                                                        host: hosturl,
                                                        port: 80,
                                                        method: 'GET',
                                                        path: pathurl,
                                                        headers: {
                                                            'Content-Type': 'application/x-www-form-urlencoded',
                                                            'Content-Length': 0
                                                        }
                                                    };
                                                    const req = http.request(options,function(res){
                                                        res.setEncoding('utf8');
                                                    });
                                                    req.on('close',function(){
                                                        console.log('CLOSED');
                                                    });
                                                    req.on('error',function(e){
                                                        console.log(e);
                                                    });
                                                    req.on('timeout',function(){
                                                        console.log('TIMEOUT!');
                                                        req.destroy();
                                                    });
                                                    req.end();
                                                    console.log('14 여기임 '+ pathurl);
                                                    console.log('SEND COMPLETE ',feedCon);
                                                    //DB weight에 consume_c1,c2,c3 업데이트
                                                    _updateContainer(rows[0].arduino_id,feedCon,feedCon,feedCon);
                                                }
                                            }
                                        }
                                    }
                                    else{
                                        console.log('Error while performing Query',err);
                                        return -1;
                                    }
                                });
                                
                        }
                        else{
                            pathurl = pathurl + 'c1='+ feed_con[0] + '&c2=' + feed_con[1] + '&c3=' + feed_con[2];
                        
                            sendRequests(hosturl,pathurl);
                                                
                            console.log('SEND COMPLETE ',params);
                            _updateContainer(rows[0].arduino_id,feed_con[0],feed_con[1],feed_con[2]);
                        }
                    }
                }
                else{
                    console.log('Error while performing Query',err);
                    res.send("Your Request NOT Executed"); 
                }
            });
        }
        //COMMAND CASE 3 = 배식 삭제
        //배식 예약 삭제
            //테이블에서 확인 후 삭제
        else if(req.body.command == 3){
            var sql = 'DELETE FROM FEED WHERE arduino_id = ? and feed_weekday = ? and feed_time = ?';
            var params = [req.body.id,req.body.weekday,req.body.time];
            connection.query(sql,params,function(err,rows,fields){
                if(!err){
                    console.log('DELETE Schedule Well Executed');
                    sql = 'SELECT * FROM FEED WHERE arduino_id = ?';
                    params = [req.body.id];
                    connection.query(sql,params,function(err,rows,fields){
                        if(!err){
                            console.log('DB Query Successfully Executed: ',sql);
                            if(rows.length == 0){
                                res.send('EMPTY');
                            }else{
                                res.send(rows);
                            }
                        }   
                        else{
                            console.log('Error while performing Query',err);
                            res.send("Your Request NOT Executed"); 
                        }
                    });
                }
                else{
                    console.log('Error while performing Query',err);
                    res.send("Your Request NOT Executed"); 
                }
            });
        } 
        else{
            console.log('Unknown Command '+req.body.command);
            res.send('Check Your Command');
        }    
    }
});


app.post('/getFeedSchedule',(req,res)=>{
    //현재 예약되어 있는 모든 스케줄 보여줌
        //고정배급 + 추가로 배급 예약한거 볼수 있게
    var sql = 'SELECT * FROM FEED WHERE arduino_id = ?';
    var params = [req.body.id];
    connection.query(sql,params,function(err,rows,fields){
        if(!err){
            console.log('DB Query Successfully Executed: ',sql);
            if(rows.length == 0){
                res.send('EMPTY');
            }else{
                res.send(rows);
            }
        }   
        else{
            console.log('Error while performing Query',err);
            res.send("Your Request NOT Executed"); 
        }
    });
});


app.post('/getStatus',(req,res)=>{
    //WEIGHT 테이블에 있는 정보 긁어오기
    var sql = 'SELECT * FROM WEIGHT WHERE arduino_id = ?';
    var params = [req.body.id];
    connection.query(sql,params,function(err,rows,fields){
        if(!err){
            console.log('DB Query Successfully Executed: ',sql);
            res.send(rows);
        }   
        else{
            console.log('Error while performing Query',err);
            res.send("Your Request NOT Executed"); 
        }
    })
});

app.post('/getContainer',(req,res)=>{
    //USER 테이블에 있는 정보 긁어오기
    if(req.body.command == 0){//command가 0이면 남은 사료량 가져오기
        var sql = 'SELECT * FROM USER WHERE arduino_id = ?';
        var params = [req.body.id];
        connection.query(sql,params,function(err,rows,fields){
            if(!err){
                console.log('DB Query Successfully Executed: ',sql);
                res.send(rows);
            }   
            else{
                console.log('Error while performing Query',err);
                res.send("Your Request NOT Executed"); 
            }
        });    
    }
    else if(req.body.command == 1){//command가 1이면 남은 사료량 업데이트
        var sql = 'UPDATE USER SET remain_c1 = ?,remain_c2 = ?,remain_c3 = ? WHERE arduino_id = ?';
        var params = [req.body.c1,req.body.c2,req.body.c3,req.body.id];
        connection.query(sql,params,function(err,rows,fields){
            if(!err){
                console.log('DB Query Successfully Executed: ',sql);
                res.send('사료량 업데이트 완료');
            }   
            else{
                console.log('Error while performing Query',err);
                res.send("Your Request NOT Executed"); 
            }
        });
    }
    
});

app.get('/sendLeftover',(req,res)=>{
    //아두이노 무게센서에서 측정한 값 보내기
    //밥그릇에 
    //남긴 사료 양
    getnewdate();
    var weight_date = year+'-'+month+'-'+date;
    var sql = 'SELECT * from WEIGHT WHERE arduino_id = ? and weight_date = ?'
    var params = [req.query.id,weight_date];
    var leftover = req.query.leftover;
    if(leftover < 0){
        leftover = -leftover;
    }
    connection.query(sql,params,function(err,rows,fields){
        if(!err){     
            var consumed = rows[0].consume_c1 + rows[0].consume_c2 + rows[0].consume_c3;
            if(rows.length == 0){//측정된 값이 없다면 새로 삽입
                sql = 'INSERT into WEIGHT(arduino_id,weight_date,leftover) values(?,?,?)';
                params = [req.query.id, weight_date, leftover];
                connection.query(sql,params,function(err,rows,fields){
                    if(!err){
                        console.log(rows+' VALUE INSERTED');
                        res.send("Your Request Succesfully Executed"); 
                    }
                    else{
                        console.log('VALUE NOT INSERTED');
                        res.send("Your Request NOT Executed"); 
                    }
                });
            }
            else{//이미 측정된 값이 있다면 업데이트
                sql = 'UPDATE WEIGHT SET leftover = ? WHERE arduino_id = ? and weight_date = ?';
                params = [leftover,rows[0].arduino_id,rows[0].weight_date];
                console.log(params);
                connection.query(sql,params,function(err,rows,fields){
                    if(!err){
                        console.log(rows+' VALUE UPDATED');
                        res.send("Your Request Succesfully Executed"); 
                    }
                    else{
                        console.log('VALUE NOT UPDATED');
                        res.send("Your Request NOT Executed"); 
                    }
                });
            }
            if(leftover >= consumed/2){//남긴양이 급식량보다 절반이상이라면
                console.log('사료를 절반 이상 남겼음');
                sql = 'SELECT * FROM USER WHERE arduino_id = ?';
                params = [rows[0].arduino_id];
                connection.query(sql,params,function(err,rows,fields){
                    if(!err){
                        console.log('남긴양 많을 시 USER 앱토큰 조회 성공');    
                        sendPushAlarm(rows[0].app_token,'사료 남김 알림','사료를 반절 이상이나 남겼네요. 몸이 아픈건 아닐까요? 확인해주세요.');
                    }
                    else{
                        console.log('Error while performing Query',err);    
                    }
                });
                
            }        
        }
        else{
            console.log('Error while performing Query',err);
            res.send("DB Query Error Occured");
        }
    });

    
   var container_empty = req.query.empty;
   if(container_empty!="undefined"){
    //사료 거의 다 떨어져가면 알려주기
    //무게 정보를 보낼때 그 정보가 사료의 양에 대한 정보라면
    //그 값이 30g 이하라면 푸시 알림으로 보내면 될것같다.  
    //사료는 한번 배급할때마다 15g씩 빠진다고 가정, 매 배급시 무게를 보내도록 한다.
   }
});

app.get('/sendWeight',(req,res)=>{
    //아두이노 무게센서에서 측정한 값 보내기
    //패드
    //애완동물 무게
    getnewdate();
    var weight_date = year+'-'+month+'-'+date;
    var sql = 'SELECT * from WEIGHT WHERE arduino_id = ? and weight_date = ?'
    var params = [req.query.id,weight_date];
    var weight = req.query.weight;
    if(weight<0){
        weight = -weight;
    }
    connection.query(sql,params,function(err,rows,fields){
        if(!err){
            if(rows.length == 0){//측정된 값이 없다면 새로 삽입
                sql = 'INSERT into WEIGHT(arduino_id,weight_date,weight) values(?,?,?)';
                params = [req.query.id, weight_date, weight];
                connection.query(sql,params,function(err,rows,fields){
                    if(!err){
                        console.log(rows+' VALUE INSERTED');
                        res.send("Your Request Succesfully Executed"); 
                    }
                    else{
                        console.log('VALUE NOT INSERTED');
                        res.send("Your Request NOT Executed"); 
                    }
                });
            }
            else{//이미 측정된 값이 있다면 업데이트
                sql = 'UPDATE WEIGHT SET weight = ? WHERE arduino_id = ? and weight_date = ?';
                params = [weight,rows[0].arduino_id,rows[0].weight_date];
                connection.query(sql,params,function(err,rows,fields){
                    if(!err){
                        console.log(rows+' VALUE UPDATED');
                        res.send("Your Request Succesfully Executed"); 
                    }
                    else{
                        console.log('VALUE NOT UPDATED');
                        res.send("Your Request NOT Executed"); 
                    }
                });
            }        
        }
        else{
            console.log('Error while performing Query',err);
            res.send("DB Query Error Occured");
        }
    });

    
   var container_empty = req.query.empty;
   if(container_empty!="undefined"){
    //사료 거의 다 떨어져가면 알려주기
    //무게 정보를 보낼때 그 정보가 사료의 양에 대한 정보라면
    //그 값이 30g 이하라면 푸시 알림으로 보내면 될것같다.  
    //사료는 한번 배급할때마다 15g씩 빠진다고 가정, 매 배급시 무게를 보내도록 한다.
   }
});

app.get('/registerID',(req,res)=>{
    var ip = req.headers['x-forwarded-for']||req.connection.remoteAddress;
    console.log('External IP :',ip);
    
    var arduino_id = req.query.id;

    if(typeof arduino_id != "undefined"){
        var sql = 'SELECT * from USER where arduino_id = ?'
        var params = [arduino_id];
        connection.query(sql,params,function(err,rows,fields){
            if(!err){
               console.log('DB Query Successfully Executed : ',sql);
               if(rows.length==0){
                    sql = 'INSERT into USER (arduino_id,ext_ip) values(?,?)';
                    params = [arduino_id,ip];
                    connection.query(sql,params,function(err,rows,fields){
                        if(!err){
                           console.log('DB Query Successfully Executed : ',sql);
                           console.log('VALUE INSERTED');
                           res.send("Your Request Succesfully Executed");  
                        }
                        else{
                            console.log('VALUE NOT INSERTED');
                            res.send("Your Request NOT Executed");    
                        }  
                    });
               }
               else{
                    console.log('VALUE EXISTS : ',rows);
                    res.send("Your ID Already EXISTS");
                }
            }
            else{
                console.log('Error while performing Query',err);
                res.send("DB Query Error Occured");
            }  
        });
    }
    else{
        console.log('NO ID HERE');
        res.send("ID Value Missing");
    }

});

app.post('/registerPET',(req,res)=>{
    var arduino_id = req.body.id;
    var cat_dog = req.body.cat_dog;
    if(arduino_id == "undefined"){
        console.log('NO ID HERE');
        res.send("ID Value Missing");
    }
    else if(cat_dog == "undefined"){
        console.log('NO cat_dog value HERE');
        res.send("cat_dog Value Missing");
    }
    else{
        var sql = 'SELECT * from USER where arduino_id = ?';
        var params =[arduino_id];

        connection.query(sql,params,function(err,rows,fields){
            if(!err){
               console.log('DB Query Successfully Executed : ',sql);
               if(rows.length==0){
                    console.log('Arduino ID NOT EXISTS');
                    res.send("사용자님의 펫케어시스템이 등록되지 않았습니다. 처음부터 다시 시도해주십시오.");  
               }
               else{
                    sql = 'UPDATE USER SET cat_dog=? WHERE arduino_id=?';
                    params = [cat_dog,arduino_id];

                    connection.query(sql,params,function(err,rows,fields){
                        if(!err){
                            console.log('DB Query Successfully Executed : ',sql);
                            console.log('VALUE INSERTED');
                            res.send("사용자님의 반려동물 종이 등록 완료되었습니다.");
                        }
                        else{
                            console.log('VALUE NOT INSERTED');
                            console.log(err);
                            res.send("등록에 실패했습니다. 처음부터 다시 시도해주십시오.");
                        }
                    });
                }
            }
            else{
                console.log('Error while performing Query',err);
                res.send("죄송합니다. 다시 시도해주십시오.");
            }  
        });
    }
});

app.post('/registerAPP',(req,res)=>{
    var arduino_id = req.body.id;
    var app_token = req.body.token;

    console.log(arduino_id);
    console.log(app_token);
    //요청 값이 없을 경우
    if(arduino_id == "undefined"){
        console.log('NO ID HERE');
        res.send("ID Value Missing");
    }
    else if(app_token == "undefined"){
        console.log('NO TOKEN HERE');
        res.send("TOKEN Value Missing");
    }
    //요청 값이 있다면
    else{
        var sql = 'SELECT * from USER where arduino_id = ?';
        var params =[arduino_id];

        connection.query(sql,params,function(err,rows,fields){
            if(!err){
               console.log('DB Query Successfully Executed : ',sql);
               if(rows.length==0){
                    console.log('Arduino ID NOT EXISTS');
                    res.send("사용자님의 펫케어시스템이 등록되지 않았습니다. 처음부터 다시 시도해주십시오.");  
               }
               else{
                    sql = 'UPDATE USER SET app_token=? WHERE arduino_id=?';
                    params = [app_token,arduino_id];

                    connection.query(sql,params,function(err,rows,fields){
                        if(!err){
                            console.log('DB Query Successfully Executed : ',sql);
                            console.log('VALUE INSERTED');
                            res.send("펫케어시스템과 앱의 연동이 완료되었습니다.");
                        }
                        else{
                            console.log('VALUE NOT INSERTED');
                            console.log(err);
                            res.send("등록에 실패했습니다. 처음부터 다시 시도해주십시오.");
                        }
                    });
                }
            }
            else{
                console.log('Error while performing Query',err);
                res.send("죄송합니다. 다시 시도해주십시오.");
            }  
        });
    }
});

var port = process.env.PORT || 3000;

app.listen(port,function(){
    console.log('server listening on port'+port);
});

const handle_30sScheduler = setInterval(watchdog._30sScheduler(connection), 30000);

process.on('SIGINT',function(){
    clearInterval(handle_30sScheduler);
    process.exit();
})