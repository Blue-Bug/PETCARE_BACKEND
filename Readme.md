# PETCARE BACKEND
## Node, MySQL 버전
- Node.js 12.16.1
- MySQL 5.6.50

## 사용 모듈
- Express ~4.17.1
- firebase-admin ^9.5.0
- mysql ^2.18.1
- node-schedule ^2.0.0

# API 호출
   |HTTP request|Method|Description|
   |----|---------|-----------|
   |POST '/sendCommand'|'sendCommand'|파라미터 Command의 값에 따라 <br>배식 예약,삭제,바로 배식 기능을 수행한 후,<br> 수행 성공여부를 반환합니다.<br>배식 예약의 경우 이미 존재하는 예약 기록이 있다면<br> 예약을 추가하지 않습니다.|

   |Parameters|Description|
   |----------|-----------|
   |<b>Required parameters<b>||
   |command|<b>int</b><br>수행할 작업을 결정하는 파라미터입니다.<br>값이 1일 경우 '배식 예약'<br>&emsp;&emsp;&nbsp;2일 경우 '바로 배식'<br>&emsp;&emsp;&nbsp;3일 경우 '배식 삭제' 작업을 수행합니다.|
   |id|<b>string</b><br>명령을 전달할 아두이노의 ID입니다.<br> registerID에서 등록된 아두이노의 ID를 사용합니다.|
   |<b>Optional parameters</b>|
   |weekday|<b>int</b><br> 배식할 요일을 지정하는 파라미터입니다.<br> <b>Note:</b>바로 배식 기능을 사용할때를 제외하고 필수 파라미터입니다.|
   |time|<b>string</b><br> 배식할 시간을 지정하는 파라미터입니다.<br><b>Note:</b> 바로 배식 기능을 사용할때를 제외하고 필수 파라미터입니다.|
   |c1, c2, c3|<b>string</b><br>3개의 사료 컨테이너에서 각각 배식할 양을 결정하는 파라미터입니다.|
   |is_auto|<b>int</b><br> 몸무게별 자동 급식량 조절 기능할 사용할것인지 아닌지를 결정하는 파라미터입니다.|
   |is_always|<b>int</b><br> 매주 배식할 것인지 아닌지를 결정하는 파라미터입니다.|

   <br>
   <br>

   |HTTP request|Method|Description|
   |----|---------|-----------|
   |POST '/getFeedSchedule'|'getFeedSchedule'|현재 예약되어 있는 모든 배식스케줄을 반환합니다.|
   
   <br>

   |Parameters|Description|
   |----------|-----------|
   |<b>Required parameters<b>||
   |id|<b>string</b><br>명령을 전달할 아두이노의 ID입니다.<br> registerID에서 등록된 아두이노의 ID를 사용합니다.|

   |HTTP request|Method|Description|
   |----|---------|-----------|
   |POST '/getStatus'|'getStatus'||

   |HTTP request|Method|Description|
   |----|---------|-----------|
   |POST '/getContainer'|'getContainer'||

   |HTTP request|Method|Description|
   |----|---------|-----------|
   |GET '/sendLeftover'|'sendLeftover'||

   |HTTP request|Method|Description|
   |----|---------|-----------|
   |GET '/sendWeight'|'sendWeight'||

   |HTTP request|Method|Description|
   |----|---------|-----------|
   |GET '/registerID'|'registerID'||

   |HTTP request|Method|Description|
   |----|---------|-----------|
   |POST '/registerPET'|'registerPET'||

   |HTTP request|Method|Description|
   |----|---------|-----------|
   |POST '/registerAPP'|'registerAPP'||

   |HTTP request|Method|Description|
   |----|---------|-----------|
   |GET '/testRoute'|'testRoute'|테스트 용 API 호출|

# Config.js
 - <h2>db_config.js</h2>

   ```javascript   
   module.exports = {
      host : 'hostname',
      user : 'username',
      password : 'password',
      port : 'port',
      database : 'database_name'
   }
   ```

- <h2>push_config.js</h2>

   ```javascript
   module.exports = {
   serviceAccount: {
      "type": "service_account",
      "project_id": "",
      "private_key_id": "",
      "private_key": "-----BEGIN PRIVATE KEY-----\n\n-----END PRIVATE KEY-----\n",
      "client_email": "",
      "client_id": "",
      "auth_uri": "https://accounts.google.com/o/oauth2/auth",
      "token_uri": "https://oauth2.googleapis.com/token",
      "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
      "client_x509_cert_url": ""
   },
   databaseURL: ""
   }
   ```

- <h2>route_config.js</h2>

   ```javascript
   module.exports = {
   route_info: [
      { file: './petcare_route', path: '/sendCommand', method: 'sendCommand', type: 'post' },
      { file: './petcare_route', path: '/getFeedSchedule', method: 'getFeedSchedule', type: 'post' },
      { file: './petcare_route', path: '/getStatus', method: 'getStatus', type: 'post' },
      { file: './petcare_route', path: '/getContainer', method: 'getContainer', type: 'post' },
      { file: './petcare_route', path: '/sendLeftover', method: 'sendLeftover', type: 'get' },
      { file: './petcare_route', path: '/sendWeight', method: 'sendWeight', type: 'get' },
      { file: './petcare_route', path: '/registerID', method: 'registerID', type: 'get' },
      { file: './petcare_route', path: '/registerPET', method: 'registerPET', type: 'post' },
      { file: './petcare_route', path: '/registerAPP', method: 'registerAPP', type: 'post' },
      { file: './petcare_route', path: '/testRoute', method: 'testRoute', type: 'get' },
   ]
   }
   ```
# 어려웠던 점
   1. 아무것도 모르는 상태에서 배워가면서 제작

   2. 아두이노로 DB에서 읽은 값을 보내줘야 할때
      지금은 기기가 한 두대지만 몇천, 몇만이라면 동시에 TCP 연결을 그만큼 유지해야됨
      시간이 얼마 남지 않은 상태에서 어떻게 구현해야되는지 모르고 테스트해야 할 시간도 부족
      -> 아두이노에서 WIFI모듈로 웹서버를 열고 포트포워딩을 해준후 서버에 주소를 알려주는 것으로 해결

      //캡스톤 이후 찾아본 방법
      1. socket.io 사용 
      2. 리눅스 서버 설정 /etc/rc.local을 ulimit -n 999999로 변경
      3. socket.setNoDelay를 disable로 바꿔서 응답이 빠르게 서버를 떠나도록 한다.
      4. node --trace-gc --expose-gc --nouse-idle-notification --max-new-space-size=2048 --max-old-space-size=8192 파일.js

      //참고 : https://blog.caustik.com/category/node-js/
               https://reiot.github.io/2012/04/21/250k-node-connections/

   3. 아두이노에서 body에 데이터를 담거나 받은 데이터를 파싱하기 힘들어서 
      아두이노와 통신시에는 전부 get방식으로 파라미터를 쿼리에 담아서 보냄

   4. 코로나로 인해 대부분 온라인 회의
    