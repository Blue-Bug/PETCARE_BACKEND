const http = require('http');//http 기본 라이브러리
const date = require('./date');

const send_command = (hosturl,pathurl) => {
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
  const req = http.request(options, function (res) {
    res.setEncoding('utf8');
  });
  req.on('close', function () {
    console.log('CLOSED');
  });
  req.on('error', function (e) {
    console.log(e);
  });
  req.on('timeout', function () {
    console.log('TIMEOUT!');
    req.destroy();
  });
  req.end();
}

const updateContainer = (connection,arduino_id,c1,c2,c3) => {
    var get_date = date.getnewdate();
    var weight_date = get_date.year+'-'+get_date.month+'-'+get_date.date;
    var sql = 'SELECT * FROM WEIGHT WHERE arduino_id = ? and weight_date = ?';
    var params = [arduino_id,weight_date];
    connection.query(sql,params,function(err,rows,fields){
        if(!err){
            if(rows.length == 0){//첫 급식일 경우
                sql = 'INSERT into WEIGHT(arduino_id,weight_date,consume_c1,consume_c2,consume_c3) values(?,?,?,?,?)';
                params = [arduino_id,weight_date,c1,c2,c3];
                connection.query(sql,params,function(err,rows,fields){
                    if(!err){
                        console.log('VALUE INSERTED');
                    }
                    else{
                        console.log('Error while performing Query',err);
                    }
                });
            }
            else{//이미 급식이 있을 경우
                sql = 'UPDATE WEIGHT SET consume_c1 = consume_c1 + ?, consume_c2 = consume_c2 + ?, consume_c3 = consume_c3 + ? WHERE arduino_id = ? and weight_date = ?';
                params = [c1,c2,c3,arduino_id,weight_date];
                connection.query(sql,params,function(err,rows,fields){
                    if(!err){
                        console.log('VALUE UPDATED');
                    }
                    else{
                        console.log('Error while performing Query',err);
                    }
                });
            }
        }
        else{
            console.log('Error while performing Query',err);
        }
    });
    
    
        //무게 테이블에서 섭취량 업데이트
            
            /*sql = 'UPDATE USER SET remain_c1 = remain_c1 - ?, remain_c2 = remain_c2 - ?, remain_c3 = remain_c3 - ? WHERE arduino_id = ?';
            params = [arduino_id,c1,c2,c3];
            connection.query(sql,params,function(err,rows,fields){
                if(!err){//유저 테이블에서 남은 사료량 업데이트
                    console.log('DB Query Successfully Executed : ',sql);
                    console.log('VALUE INSERTED');
                    sql = 'SELECT * FROM USER WHERE arduino_id = ?';
                    params = [arduino_id];
                    connection.query(sql,params,function(err,rows,fields){
                        if(!err){//유저 테이블에서 남은 사료량이 15g 이하일때
                            if(rows[0].c1!=null && rows[0].c2!=null && rows[0].c3!=null){
                                if(rows[0].c1 <= 15 || rows[0].c2 <= 15 && rows[0].c3 <= 15){
                                    var title = '사료량 부족 알림';
                                    var body = '하나 이상의 컨테이너의 잔여 사료량이 15g 미만이 되었습니다. 사료를 채워주세요.';
                                    sendPushAlarm(rows[0].app_token,title,body);
                                    console.log(rows[0].arduino_id+'사료량 부족 알림 보냄');
                                }
                            }
                        }   
                    });
                }
                else{
                    console.log('Error while performing Query',err);
                }
            });*/
        
}

const sendPushAlarm = (admin,registrationToken,title,body) => {
    var payload = {
       "notification":{
            "title":title,
            "body":body
        }
    };
    admin.messaging().sendToDevice(registrationToken,payload)
    .then(function(response){
        console.log("Successfully sent message:", response);
    })
    .catch(function(error){
        console.log("Error sending message:",error);
    });
}
  
module.exports = {
  send_command : send_command,
  updateContainer : updateContainer,
  sendPushAlarm : sendPushAlarm,
}




