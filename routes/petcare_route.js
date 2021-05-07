const commands = require("../commands");
const auto_cal = require('../auto_cal');

const sendCommand = (req,res)=>{
  const connection = req.app.get('database');
  const admin = req.app.get('pushAdmin');
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
          let sql = 'SELECT * FROM FEED WHERE arduino_id = ? and feed_weekday = ? and feed_time = ?';
          let params = [req.body.id,req.body.weekday,req.body.time];
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
                                  req.body.is_auto,
                                  req.body.is_always];
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
      //COMMAND CASE 2 = 바로 배식
      //바로 배식하기
          //배식하기 전 테이블에 있는지 검사해서 있으면 진짜로 배식할건지 물어보기?
          //아두이노로 HTTP GET으로 명령 전송
      else if(req.body.command == 2){
          let sql = 'SELECT * FROM USER WHERE arduino_id = ?';
          let params = [req.body.id];
          let feed_con = [req.body.c1,req.body.c2,req.body.c3];
          connection.query(sql,params,function(err,rows,fields){
              if(!err){
                  let hosturl = rows[0].ext_ip;
                  let pathurl = '/MOTOR?';
                  let cat_dog = rows[0].cat_dog;
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
                              //몸무게 별 자동 급식량 
                              let app_token = rows[0].app_token;
                              let params = [rows[0].arduino_id];
                              auto_cal.get_result(connection,admin,cat_dog,app_token,params,hosturl,pathurl);                                
                      }
                      else{
                          pathurl = pathurl + 'c1='+ feed_con[0] + '&c2=' + feed_con[1] + '&c3=' + feed_con[2];
                      
                          commands.send_command(hosturl,pathurl);
                                              
                          console.log('SEND COMPLETE ',params);
                          commands.updateContainer(rows[0].arduino_id,feed_con[0],feed_con[1],feed_con[2]);
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
          let sql = 'DELETE FROM FEED WHERE arduino_id = ? and feed_weekday = ? and feed_time = ?';
          let params = [req.body.id,req.body.weekday,req.body.time];
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
};

const getFeedSchedule = (req,res)=>{
  //현재 예약되어 있는 모든 스케줄 보여줌
      //고정배급 + 추가로 배급 예약한거 볼수 있게
  const connection = req.app.get('database');

  let sql = 'SELECT * FROM FEED WHERE arduino_id = ?';
  let params = [req.body.id];
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
};

const getStatus = (req,res)=>{
  const connection = req.app.get('database');
  //WEIGHT 테이블에 있는 정보 긁어오기
  let sql = 'SELECT * FROM WEIGHT WHERE arduino_id = ?';
  let params = [req.body.id];
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
};

const getContainer = (req,res)=>{
  const connection = req.app.get('database');
  //USER 테이블에 있는 정보 가져오기
  if(req.body.command == 0){//command가 0이면 남은 사료량 가져오기
      let sql = 'SELECT * FROM USER WHERE arduino_id = ?';
      let params = [req.body.id];
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
      let sql = 'UPDATE USER SET remain_c1 = ?,remain_c2 = ?,remain_c3 = ? WHERE arduino_id = ?';
      let params = [req.body.c1,req.body.c2,req.body.c3,req.body.id];
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
}

const sendLeftover = (req,res)=>{
  const connection = req.app.get('database');
  //아두이노 무게센서에서 측정한 값 보내기
  //밥그릇에 남긴 사료 양
  const date = require('./date')
  let dateObj = date.getnewdate();
  let weight_date = dateObj.year+'-'+dateObj.month+'-'+dateObj.date;
  let sql = 'SELECT * from WEIGHT WHERE arduino_id = ? and weight_date = ?'
  let params = [req.query.id,weight_date];
  let leftover = req.query.leftover;
  //아두이노 무게센서에서 측정한 값에 
  //부호가 반전되어 전달되는 경우 체크
  if(leftover < 0){
      leftover = -leftover;
  }
  connection.query(sql,params,function(err,rows,fields){
      if(!err){     
          let consumed = rows[0].consume_c1 + rows[0].consume_c2 + rows[0].consume_c3;
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
};

const sendWeight = (req,res)=>{
  const connection = req.app.get('database');
  //아두이노 무게센서에서 측정한 값 보내기
  //기기 패드 아래 달린 센서에서 측정한 애완동물 무게
  const date = require('./date')
  let dateObj = date.getnewdate();
  let weight_date = dateObj.year+'-'+dateObj.month+'-'+dateObj.date;
  let sql = 'SELECT * from WEIGHT WHERE arduino_id = ? and weight_date = ?'
  let params = [req.query.id,weight_date];
  let weight = req.query.weight;
  if(weight<0){
    //측정 오류로 값이 반전되서 넘어오는 경우가 있음
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

  
 let container_empty = req.query.empty;
 if(container_empty!="undefined"){
  //사료 거의 다 떨어져가면 알려주기
  //무게 정보를 보낼때 그 정보가 사료의 양에 대한 정보라면
  //그 값이 30g 이하라면 푸시 알림으로 보내면 될것같다.  
  //사료는 한번 배급할때마다 15g씩 빠진다고 가정, 매 배급시 무게를 보내도록 한다.
 }
};

const registerID = (req,res)=>{
  const connection = req.app.get('database');
  let ip = req.headers['x-forwarded-for']||req.connection.remoteAddress;
  console.log('External IP :',ip);
  
  let arduino_id = req.query.id;

  if(typeof arduino_id != "undefined"){
      let sql = 'SELECT * from USER where arduino_id = ?'
      let params = [arduino_id];
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

};

const registerPET = (req,res)=>{
  const connection = req.app.get('database');
  let arduino_id = req.body.id;
  let cat_dog = req.body.cat_dog;
  if(arduino_id == "undefined"){
      console.log('NO ID HERE');
      res.send("ID Value Missing");
  }
  else if(cat_dog == "undefined"){
      console.log('NO cat_dog value HERE');
      res.send("cat_dog Value Missing");
  }
  else{
      let sql = 'SELECT * from USER where arduino_id = ?';
      let params =[arduino_id];

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
};

const registerAPP = (req,res)=>{
  const connection = req.app.get('database');
  let arduino_id = req.body.id;
  let app_token = req.body.token;

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
      let sql = 'SELECT * from USER where arduino_id = ?';
      let params =[arduino_id];

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
};

const testRoute = (req,res)=>{
    const connection = req.app.get('database');
    const admin = req.app.get('pushAdmin');
    if(req.query.path == 0){
        res.send('푸시알람 테스트');
        let sql = 'SELECT * FROM USER WHERE arduino_id = \'TEST1234\'';
        connection.query(sql,function(err,rows,fields){
            if(!err){
                commands.sendPushAlarm(admin,rows[0].app_token,"TEST","TEST");
            }   
            else{
                console.log('push alarm error');
            }
        });
    }
    else if(req.query.path == 1){
        res.send('서버 응답 테스트');  
    }
};

module.exports = {
  sendCommand : sendCommand,
  getFeedSchedule : getFeedSchedule,
  getStatus : getStatus,
  getContainer : getContainer,
  sendLeftover : sendLeftover,
  sendWeight : sendWeight,
  registerID : registerID,
  registerPET : registerPET,
  registerAPP : registerAPP,
  testRoute : testRoute
};