const commands = require('./commands');

//21.1.4 updateContainer랑 sendPushAlarm 변경해줘야됨
//21.1.10 commands에 updateContainer랑 sendPushAlarm 함수 정의

exports.get_result = (connection,admin,cat_dog,app_token,params,hosturl,pathurl) => {
    //몸무게 별 자동 급식량 조절
    var sql = 'SELECT * FROM WEIGHT WHERE arduino_id = ?';

    connection.query(sql, params, function (err, rows, fields) {
      if (!err) {
        if (rows.length == 0) {
          //고양이나 개 정상 몸무게 기준으로 자동 계산
          if (cat_dog == 0) {
            var feedCon = 29;
            pathurl = pathurl + 'c1=' + feedCon + '&c2=' + feedCon + '&c3=' + feedCon;

            commands.send_command(hosturl,pathurl); 
            //아두이노로 명령 전송

            console.log('여기임 ' + pathurl);
            console.log('SEND COMPLETE ', feedCon);

            commands.updateContainer(connection,rows[0].arduino_id, feedCon, feedCon, feedCon);
            //DB weight에 consume_c1,c2,c3 업데이트
          }
          else if (cat_dog == 1) {
            var feedCon = 33;
            pathurl = pathurl + 'c1=' + feedCon + '&c2=' + feedCon + '&c3=' + feedCon;

            commands.send_command(hosturl,pathurl); 
            //아두이노로 명령 전송
            
            console.log('여기임 ' + pathurl);
            console.log('SEND COMPLETE ', feedCon);
            //DB weight에 consume_c1,c2,c3 업데이트
            commands.updateContainer(connection,rows[0].arduino_id, feedCon, feedCon, feedCon);
          }
        }
        else if (rows.length < 3) {
          //마지막 무게 기록으로 계산해서 준다.
          var weight = rows[rows.length - 1].weight;
          var RER = 30 * average_Weight + 70;
          if (cat_dog == 0) {
            var DER = RER * 1;
            var feedCon = (DER / 18) + 10;
            feedCon = feedCon.toFixed(2);
            pathurl = pathurl + 'c1=' + feedCon + '&c2=' + feedCon + '&c3=' + feedCon;

            commands.send_command(hosturl,pathurl); 
            //아두이노로 명령 전송

            console.log('여기임 ' + pathurl);
            console.log('SEND COMPLETE ', feedCon);
            //DB weight에 consume_c1,c2,c3 업데이트
            commands.updateContainer(connection,rows[0].arduino_id, feedCon, feedCon, feedCon);
          }
          else if (cat_dog == 1) {
            var DER = RER * 1.6;
            var feedCon = (DER / 18) + 10;
            feedCon = feedCon.toFixed(2);
            pathurl = pathurl + 'c1=' + feedCon + '&c2=' + feedCon + '&c3=' + feedCon;

            commands.send_command(hosturl,pathurl); 
            //아두이노로 명령 전송

            console.log('여기임 ' + pathurl);
            console.log('SEND COMPLETE ', feedCon);
            //DB weight에 consume_c1,c2,c3 업데이트
            commands.updateContainer(connection,rows[0].arduino_id, feedCon, feedCon, feedCon);
          }
        }
        else if (rows.length <= 7) {
          var diff_plus = 0;
          var diff_minus = 0;
          var sum = rows[0].weight;
          for (var i = 1; i < rows.length; i++) {
            var result = rows[i - 1].weight - rows[i].weight;
            if (result > 0) {
              diff_plus++;
            }
            else if (result < 0) {
              diff_minus++;
            }
            else {
              //몸무게가 안변함
            }
            sum += rows[i].weight;
          }
          if (diff_plus == 6) {
            commands.sendPushAlarm(admin, app_token, "건강 이상 알림", "일주일 동안 계속해서 몸무게가 감소하였네요. 어디가 아픈건 아닐까요?");
          }
          else if(diff_minus == 6){
            commands.sendPushAlarm(admin, app_token, "건강 이상 알림", "일주일 동안 계속해서 몸무게가 증가하였네요. 정상 체중인지 확인해주세요.");
          }
          var average_Weight = (sum / rows.length).toFixed(2);
          console.log('자동 배식 ' + average_Weight);
          if (diff_plus > diff_minus) {
            //몸무게가 감소하고 있었음
            //정상몸무게 - 평균 기록
            var RER = 30 * average_Weight + 70;
            if (cat_dog == 0) {
              //240이 정상 kcal
              var DER = RER * 1.2;
              if (DER >= 240) {
                //그래도 정상 몸무게 보다 크다면 계산한 값을 줌
                var feedCon = (DER / 18) + 10;
                feedCon = feedCon.toFixed(2);
                pathurl = pathurl + 'c1=' + feedCon + '&c2=' + feedCon + '&c3=' + feedCon;

                commands.send_command(hosturl,pathurl); 
                //아두이노로 명령 전송

                console.log('여기임 ' + pathurl);
                console.log('SEND COMPLETE ', feedCon);
                //DB weight에 consume_c1,c2,c3 업데이트
                commands.updateContainer(connection,rows[0].arduino_id, feedCon, feedCon, feedCon);
              }
              else {
                var plusfeed = 240 - DER;
                RER = 30 * rows[rows.length - 1].weight + 70;
                //활동량이 큰 것으로 판단
                DER = RER * 1.6;
                //총 지급해야하는 칼로리/3 한 값을 보내줌
                var feedCon = ((DER + plusfeed) / 18) + 10;
                feedCon = feedCon.toFixed(2);
                pathurl = pathurl + 'c1=' + feedCon + '&c2=' + feedCon + '&c3=' + feedCon;

                commands.send_command(hosturl,pathurl); 
                //아두이노로 명령 전송

                console.log('여기임 ' + pathurl);
                console.log('SEND COMPLETE ', feedCon);
                //DB weight에 consume_c1,c2,c3 업데이트
                commands.updateContainer(connection, rows[0].arduino_id, feedCon, feedCon, feedCon);
              }
            }
            else if (cat_dog == 1) {
              //352가 정상 kcal(기초 대사량)
              var DER = RER * 1.6;
              if (DER >= 352) {
                var feedCon = (DER / 18) + 10;
                feedCon = feedCon.toFixed(2);
                pathurl = pathurl + 'c1=' + feedCon + '&c2=' + feedCon + '&c3=' + feedCon;

                commands.send_command(hosturl,pathurl); 
                //아두이노로 명령 전송
                console.log('여기임 ' + pathurl);
                console.log('SEND COMPLETE ', feedCon);
                //DB weight에 consume_c1,c2,c3 업데이트
                commands.updateContainer(connection, rows[0].arduino_id, feedCon, feedCon, feedCon);
              }
              else {
                var plusfeed = 352 - DER;
                RER = 30 * rows[rows.length - 1].weight + 70;
                DER = RER * 2.5;
                var feedCon = ((DER + plusfeed) / 18) + 10;
                feedCon = feedCon.toFixed(2);
                pathurl = pathurl + 'c1=' + feedCon + '&c2=' + feedCon + '&c3=' + feedCon;

                commands.send_command(hosturl,pathurl); 
                //아두이노로 명령 전송

                console.log('여기임 ' + pathurl);
                console.log('SEND COMPLETE ', feedCon);
                //DB weight에 consume_c1,c2,c3 업데이트
                commands.updateContainer(connection, rows[0].arduino_id, feedCon, feedCon, feedCon);
              }
            }
          }
          else if (diff_plus < diff_minus) {
            //몸무게가 증가하고 있었음
            var RER = 30 * average_Weight + 70;

            console.log('자동 배식 ' + RER);
            if (cat_dog == 0) {
              //좀더 늘려서 300을 정상 kcal
              var DER = RER * 1.4;
              if (DER <= 300) {
                //정상 체중 섭취량 보다 작거나 같다면 계산한 값을 줌
                var feedCon = (DER / 18) + 10;
                feedCon = feedCon.toFixed(2);
                pathurl = pathurl + 'c1=' + feedCon + '&c2=' + feedCon + '&c3=' + feedCon;

                commands.send_command(hosturl,pathurl); 
                //아두이노로 명령 전송

                console.log('여기임 ' + pathurl);
                console.log('SEND COMPLETE ', feedCon);
                //DB weight에 consume_c1,c2,c3 업데이트
                commands.updateContainer(connection, rows[0].arduino_id, feedCon, feedCon, feedCon);
              }
              else {
                var minusfeed = DER - 300;
                RER = 30 * rows[rows.length - 1].weight + 70;
                //활동량이 적은 것으로 판단
                DER = RER * 0.8;
                //총 지급해야하는 칼로리/3 한 값을 보내줌
                var feedCon = ((DER - minusfeed) / 18) + 10;
                feedCon = feedCon.toFixed(2);
                pathurl = pathurl + 'c1=' + feedCon + '&c2=' + feedCon + '&c3=' + feedCon;

                commands.send_command(hosturl,pathurl); 
                //아두이노로 명령 전송

                console.log('여기임 ' + pathurl);
                console.log('SEND COMPLETE ', feedCon);
                //DB weight에 consume_c1,c2,c3 업데이트
                commands.updateContainer(connection, rows[0].arduino_id, feedCon, feedCon, feedCon);
              }
            }
            else if (cat_dog == 1) {
              //352가 정상 kcal(기초 대사량)
              var DER = RER * 1.6;
              if (DER <= 352) {
                var feedCon = (DER / 18) + 10;
                feedCon = feedCon.toFixed(2);
                pathurl = pathurl + 'c1=' + feedCon + '&c2=' + feedCon + '&c3=' + feedCon;

                commands.send_command(hosturl,pathurl); 
                //아두이노로 명령 전송

                console.log('여기임 ' + pathurl);
                console.log('SEND COMPLETE ', feedCon);
                //DB weight에 consume_c1,c2,c3 업데이트
                commands.updateContainer(connection, rows[0].arduino_id, feedCon, feedCon, feedCon);
              }
              else {
                var minusfeed = DER - 352;
                RER = 30 * rows[rows.length - 1].weight + 70;
                DER = RER * 0.8;
                var feedCon = ((DER - minusfeed) / 18) + 10;
                feedCon = feedCon.toFixed(2);
                pathurl = pathurl + 'c1=' + feedCon + '&c2=' + feedCon + '&c3=' + feedCon;

                commands.send_command(hosturl,pathurl); 
                //아두이노로 명령 전송

                console.log('여기임 ' + pathurl);
                console.log('SEND COMPLETE ', feedCon);
                //DB weight에 consume_c1,c2,c3 업데이트
                commands.updateContainer(connection, rows[0].arduino_id, feedCon, feedCon, feedCon);
              }
            }
          }
          else {
            //+,-가 같다면 그냥 마지막 몸무게로 계산
            var weight = rows[rows.length - 1].weight;
            var RER = 30 * weight + 70;
            if (cat_dog == 0) {
              var DER = RER * 1;
              var feedCon = (DER / 18) + 10;
              feedCon = feedCon.toFixed(2);
              pathurl = pathurl + 'c1=' + feedCon + '&c2=' + feedCon + '&c3=' + feedCon;

              commands.send_command(hosturl,pathurl); 
              //아두이노로 명령 전송

              console.log('여기임 ' + pathurl);
              console.log('SEND COMPLETE ', feedCon);
              //DB weight에 consume_c1,c2,c3 업데이트
              commands.updateContainer(connection, rows[0].arduino_id, feedCon, feedCon, feedCon);
            }
            else if (cat_dog == 1) {
              var DER = RER * 1.6;
              var feedCon = (DER / 18) + 10;
              feedCon = feedCon.toFixed(2);
              pathurl = pathurl + 'c1=' + feedCon + '&c2=' + feedCon + '&c3=' + feedCon;

              commands.send_command(hosturl,pathurl); 
              //아두이노로 명령 전송
              console.log('여기임 ' + pathurl);
              console.log('SEND COMPLETE ', feedCon);
              //DB weight에 consume_c1,c2,c3 업데이트
              commands.updateContainer(connection, rows[0].arduino_id, feedCon, feedCon, feedCon);
            }
          }
        }
      }
      else {
        console.log('Error while performing Query', err);
        return -1;
      }
    });
}
