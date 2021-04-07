    //1.DB의 user 테이블에 arduino_id 값으로 조회
    //2.조회한 값 ext_ip,Command type 으로 http request
    //3.응답 확인

    //어려웠던 점
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
    