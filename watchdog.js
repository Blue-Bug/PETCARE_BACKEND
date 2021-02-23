const schedule = require('node-schedule');
const commands = require('./commands');
var date = require('./date');
var auto_cal = require('./auto_cal');


//21.1.4 updateContainer랑 sendPushAlarm 변경해줘야됨
//21.1.10 commands에 updateContainer랑 sendPushAlarm 함수 정의

exports._1mScheduler = (connection, admin) => {
    schedule.scheduleJob('0 * * * * *', function () {
        //1분 마다 실행되는 스케줄러
        //DB의 FEED 테이블에서 현재 요일,시간으로 조회하여
        //DB의 SYSTEM_EXT_IP 테이블에 arduino_id 값으로 조회
        //조회한 값 ext_ip,port로 http request

        //is_always가 1일 때는 지우지 않는다

        console.log('1분 스케줄러 시작');
        var dateObj = date.getnewdate();
        var sql = 'SELECT * FROM FEED WHERE feed_weekday = ? and feed_time = ?';
        var feed_time = dateObj.hours + ':' + dateObj.minutes + ':' + dateObj.seconds;
        var params = [dateObj.weekday, feed_time]//현재 요일,시간;

        connection.query(sql, params, function (err, rows, fields) {
            if (!err) {
                //배식 예약이 있다면
                if (rows.length != 0) {
                    //해당 아두이노에 보내기 위해 USER 테이블에서 ext_ip를 찾음
                    sql = 'SELECT * FROM USER WHERE arduino_id = ?';
                    for (i = 0; i < rows.length; i++) {
                        params = [rows[i].arduino_id];
                        var feed_con = [rows[i].feed_c1, rows[i].feed_c2, rows[i].feed_c3];
                        console.log(feed_con);
                        var is_auto = rows[i].is_auto;
                        connection.query(sql, params, function (err, rows, fields) {
                            if (!err) {
                                var hosturl = rows[0].ext_ip;
                                var pathurl = '/MOTOR?';
                                //hosturl과 pathurl 설정

                                if (rows.length == 0) {
                                    console.log('Arduino NO EXIST');
                                    res.send("ID Value Missing");
                                }
                                else {
                                    if (is_auto == 1) {
                                        var cat_dog = rows[0].cat_dog;
                                        var app_token = rows[0].app_token;
                                        var params = [rows[0].arduino_id];
                                        auto_cal.get_result(connection,admin, cat_dog, app_token, params, hosturl, pathurl);
                                    }
                                    else {
                                        pathurl = pathurl + 'c1=' + feed_con[0] + '&c2=' +
                                            feed_con[1] + '&c3=' + feed_con[2];

                                        commands.send_command(hosturl, pathurl);
                                        //아두이노로 명령 전송

                                        console.log('SEND COMPLETE ', params);
                                        //DB weight에 consume_c1,c2,c3 업데이트
                                        commands.updateContainer(connection,rows[0].arduino_id, feed_con[0], feed_con[1], feed_con[2]);

                                    }
                                    //푸시 알람 보냄
                                    var title = "배식 알림"
                                    var body = feed_time + " 배식이 완료되었습니다."
                                    commands.sendPushAlarm(admin,rows[0].app_token, title, body);

                                }
                            }
                            else {
                                console.log('Error while performing Query', err);
                            }
                        });
                        //항상 주는게 아니라면 feed에서 이 정보 지움
                        if (rows[i].is_always == 0) {
                            sql = 'DELETE FROM FEED WHERE arduino_id = ? and feed_weekday = ? and feed_time <= ?';
                            params = [rows[i].arduino_id, rows[i].feed_weekday, rows[i].feed_time];
                            connection.query(sql, params, function (err, rows, fields) {
                                if (!err) {
                                    console.log('DELETE Schedule Well Executed');
                                }
                                else {
                                    console.log('Error while performing Query', err);
                                }
                            });
                        }
                    }
                }
            }
            else {
                console.log('1분마다 배식 확인 중 오류발생', err);
            }
        });
    });
}

exports._30sScheduler = (connection) => {
    var sql = 'SHOW TABLES';
    connection.query(sql, function (err, rows, fields) {
        if (!err) {
            console.log('DB Connection Alive');
        }
        else {
            console.log('DB Connection Lose');
        }
    });
};

exports._dawnScheduler = (connection) => {
    schedule.scheduleJob('0 0 4 * * *', function () {
        //새벽 4시에 실행되는 스케줄러
        //DB의 WEIGHT 테이블에서 7일 이상된 기록 삭제
        var dateObj = date.getnewdate();
        var weight_date = dateObj.year + '-' + dateObj.month + '-' + dateObj.date;
        var sql = 'DELETE * FROM WEIGHT WHERE weight_date <= ?';
        var params = [weight_date - 7];
        connection.query(sql, params, function (err, rows, fields) {
            if (!err) {
                console.log('DB에서 7일 이상된 무게 기록을 삭제했습니다.');
            }
            else {
                console.log('DB에서 무게 기록을 삭제하는 중 오류 발생');
            }
        });

    });
}