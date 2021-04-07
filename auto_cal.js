const commands = require('./commands');

//21.1.4 updateContainer랑 sendPushAlarm 변경해줘야됨
//21.1.10 commands에 updateContainer랑 sendPushAlarm 함수 정의

exports.get_result = (connection,admin,cat_dog,app_token,params,hosturl,pathurl) => {
    //몸무게 별 자동 급식량 조절
    let sql = 'SELECT * FROM WEIGHT WHERE arduino_id = ?';

    connection.query(sql, params, function (err, rows, fields) {
      if (!err) {
        if (rows.length == 0) {
          //고양이나 개 정상 몸무게 기준으로 자동 계산
          if (cat_dog == 0) {
            let feedCon = 29;
            pathurl = pathurl + 'c1=' + feedCon + '&c2=' + feedCon + '&c3=' + feedCon;

            commands.send_command(hosturl,pathurl); 
            //아두이노로 명령 전송

            console.log('SEND COMPLETE ' + hosturl + pathurl);

            commands.updateContainer(connection,rows[0].arduino_id, feedCon, feedCon, feedCon);
            //DB weight에 consume_c1,c2,c3 업데이트
          }
          else if (cat_dog == 1) {
            let feedCon = 33;
            pathurl = pathurl + 'c1=' + feedCon + '&c2=' + feedCon + '&c3=' + feedCon;

            commands.send_command(hosturl,pathurl); 
            //아두이노로 명령 전송
            
            console.log('SEND COMPLETE ' + hosturl + pathurl);

            //DB weight에 consume_c1,c2,c3 업데이트
            commands.updateContainer(connection,rows[0].arduino_id, feedCon, feedCon, feedCon);
          }
        }
        else if (rows.length < 3) {
          //마지막 무게 기록으로 계산해서 준다.
          let average_Weight = rows[rows.length - 1].weight;
          let RER = 30 * average_Weight + 70;
          if (cat_dog == 0) {
            let DER = RER * 1;
            //3개의 통마다 아침,점심,저녁(3)을 나눈 값에 보정값 + 10을 더해서 준다.
            let feedCon = (DER / 9) + 10;
            feedCon = feedCon.toFixed(2);
            pathurl = pathurl + 'c1=' + feedCon + '&c2=' + feedCon + '&c3=' + feedCon;

            commands.send_command(hosturl,pathurl); 
            //아두이노로 명령 전송

            console.log('SEND COMPLETE ' + hosturl + pathurl);

            //DB weight에 consume_c1,c2,c3 업데이트
            commands.updateContainer(connection,rows[0].arduino_id, feedCon, feedCon, feedCon);
          }
          else if (cat_dog == 1) {
            let DER = RER * 1.6;
            let feedCon = (DER / 9) + 10;
            feedCon = feedCon.toFixed(2);
            pathurl = pathurl + 'c1=' + feedCon + '&c2=' + feedCon + '&c3=' + feedCon;

            commands.send_command(hosturl,pathurl); 
            //아두이노로 명령 전송

             console.log('SEND COMPLETE ' + hosturl + pathurl);
            //DB weight에 consume_c1,c2,c3 업데이트
            commands.updateContainer(connection,rows[0].arduino_id, feedCon, feedCon, feedCon);
          }
        }
        else if (rows.length <= 7) {
          let diff_plus = 0;
          let diff_minus = 0;
          let sum = rows[0].weight;
          for (let i = 1; i < rows.length; i++) {
            let result = rows[i - 1].weight - rows[i].weight;
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
          let average_Weight = (sum / rows.length).toFixed(2);
          console.log('자동 배식 ' + average_Weight);
          if (diff_plus > diff_minus) {
            //몸무게가 감소하고 있었음
            //정상몸무게 - 평균 기록
            let RER = 30 * average_Weight + 70;
            if (cat_dog == 0) {
              //240이 정상 kcal
              let DER = RER * 1.2;
              if (DER >= 240) {
                //그래도 정상 몸무게 보다 크다면 계산한 값을 줌
                let feedCon = (DER / 9) + 10;
                feedCon = feedCon.toFixed(2);
                pathurl = pathurl + 'c1=' + feedCon + '&c2=' + feedCon + '&c3=' + feedCon;

                commands.send_command(hosturl,pathurl); 
                //아두이노로 명령 전송

                console.log('SEND COMPLETE ' + hosturl + pathurl);
                //DB weight에 consume_c1,c2,c3 업데이트
                commands.updateContainer(connection,rows[0].arduino_id, feedCon, feedCon, feedCon);
              }
              else {
                let plusfeed = 240 - DER;
                RER = 30 * rows[rows.length - 1].weight + 70;
                //활동량이 큰 것으로 판단
                DER = RER * 1.6;
    
                let feedCon = ((DER + plusfeed) / 9) + 10;
                feedCon = feedCon.toFixed(2);
                pathurl = pathurl + 'c1=' + feedCon + '&c2=' + feedCon + '&c3=' + feedCon;

                commands.send_command(hosturl,pathurl); 
                //아두이노로 명령 전송

                console.log('SEND COMPLETE ' + hosturl + pathurl);
                //DB weight에 consume_c1,c2,c3 업데이트
                commands.updateContainer(connection, rows[0].arduino_id, feedCon, feedCon, feedCon);
              }
            }
            else if (cat_dog == 1) {
              //352가 정상 kcal(기초 대사량)
              let DER = RER * 1.6;
              if (DER >= 352) {
                let feedCon = (DER / 9) + 10;
                feedCon = feedCon.toFixed(2);
                pathurl = pathurl + 'c1=' + feedCon + '&c2=' + feedCon + '&c3=' + feedCon;

                commands.send_command(hosturl,pathurl); 
                //아두이노로 명령 전송
                console.log('SEND COMPLETE ' + hosturl + pathurl);
                //DB weight에 consume_c1,c2,c3 업데이트
                commands.updateContainer(connection, rows[0].arduino_id, feedCon, feedCon, feedCon);
              }
              else {
                let plusfeed = 352 - DER;
                RER = 30 * rows[rows.length - 1].weight + 70;
                DER = RER * 2.5;
                let feedCon = ((DER + plusfeed) / 9) + 10;
                feedCon = feedCon.toFixed(2);
                pathurl = pathurl + 'c1=' + feedCon + '&c2=' + feedCon + '&c3=' + feedCon;

                commands.send_command(hosturl,pathurl); 
                //아두이노로 명령 전송

                console.log('SEND COMPLETE ' + hosturl + pathurl);
                //DB weight에 consume_c1,c2,c3 업데이트
                commands.updateContainer(connection, rows[0].arduino_id, feedCon, feedCon, feedCon);
              }
            }
          }
          else if (diff_plus < diff_minus) {
            //몸무게가 증가하고 있었음
            let RER = 30 * average_Weight + 70;

            console.log('자동 배식 ' + RER);
            if (cat_dog == 0) {
              //좀더 늘려서 300을 정상 kcal
              let DER = RER * 1.4;
              if (DER <= 300) {
                //정상 체중 섭취량 보다 작거나 같다면 계산한 값을 줌
                let feedCon = (DER / 9) + 10;
                feedCon = feedCon.toFixed(2);
                pathurl = pathurl + 'c1=' + feedCon + '&c2=' + feedCon + '&c3=' + feedCon;

                commands.send_command(hosturl,pathurl); 
                //아두이노로 명령 전송

                console.log('SEND COMPLETE ' + hosturl + pathurl);
                //DB weight에 consume_c1,c2,c3 업데이트
                commands.updateContainer(connection, rows[0].arduino_id, feedCon, feedCon, feedCon);
              }
              else {
                let minusfeed = DER - 300;
                RER = 30 * rows[rows.length - 1].weight + 70;
                //활동량이 적은 것으로 판단
                DER = RER * 0.8;
           
                let feedCon = ((DER - minusfeed) / 9) + 10;
                feedCon = feedCon.toFixed(2);
                pathurl = pathurl + 'c1=' + feedCon + '&c2=' + feedCon + '&c3=' + feedCon;

                commands.send_command(hosturl,pathurl); 
                //아두이노로 명령 전송

                console.log('SEND COMPLETE ' + hosturl + pathurl);
                //DB weight에 consume_c1,c2,c3 업데이트
                commands.updateContainer(connection, rows[0].arduino_id, feedCon, feedCon, feedCon);
              }
            }
            else if (cat_dog == 1) {
              //352가 정상 kcal(기초 대사량)
              let DER = RER * 1.6;
              if (DER <= 352) {
                let feedCon = (DER / 9) + 10;
                feedCon = feedCon.toFixed(2);
                pathurl = pathurl + 'c1=' + feedCon + '&c2=' + feedCon + '&c3=' + feedCon;

                commands.send_command(hosturl,pathurl); 
                //아두이노로 명령 전송

                console.log('SEND COMPLETE ' + hosturl + pathurl);
                //DB weight에 consume_c1,c2,c3 업데이트
                commands.updateContainer(connection, rows[0].arduino_id, feedCon, feedCon, feedCon);
              }
              else {
                let minusfeed = DER - 352;
                RER = 30 * rows[rows.length - 1].weight + 70;
                DER = RER * 0.8;
                let feedCon = ((DER - minusfeed) / 9) + 10;
                feedCon = feedCon.toFixed(2);
                pathurl = pathurl + 'c1=' + feedCon + '&c2=' + feedCon + '&c3=' + feedCon;

                commands.send_command(hosturl,pathurl); 
                //아두이노로 명령 전송

                console.log('SEND COMPLETE ' + hosturl + pathurl);
                //DB weight에 consume_c1,c2,c3 업데이트
                commands.updateContainer(connection, rows[0].arduino_id, feedCon, feedCon, feedCon);
              }
            }
          }
          else {
            //+,-가 같다면 그냥 마지막 몸무게로 계산
            let weight = rows[rows.length - 1].weight;
            let RER = 30 * weight + 70;
            if (cat_dog == 0) {
              let DER = RER * 1;
              let feedCon = (DER / 9) + 10;
              feedCon = feedCon.toFixed(2);
              pathurl = pathurl + 'c1=' + feedCon + '&c2=' + feedCon + '&c3=' + feedCon;

              commands.send_command(hosturl,pathurl); 
              //아두이노로 명령 전송

              console.log('SEND COMPLETE ' + hosturl + pathurl);
              //DB weight에 consume_c1,c2,c3 업데이트
              commands.updateContainer(connection, rows[0].arduino_id, feedCon, feedCon, feedCon);
            }
            else if (cat_dog == 1) {
              let DER = RER * 1.6;
              let feedCon = (DER / 9) + 10;
              feedCon = feedCon.toFixed(2);
              pathurl = pathurl + 'c1=' + feedCon + '&c2=' + feedCon + '&c3=' + feedCon;

              commands.send_command(hosturl,pathurl); 
              //아두이노로 명령 전송
              console.log('SEND COMPLETE ' + hosturl + pathurl);
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
