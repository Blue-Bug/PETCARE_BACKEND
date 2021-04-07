const express = require('express');
const app = express();

const date = require('./date');
const watchdog = require('./watchdog');
const database = require('./database');
const connection = database.get_connection();

//----Android PUSH Setting------//
const push_config = require('./config/push_config');
let admin = require("firebase-admin");
let serviceAccount = push_config.serviceAccount;
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: push_config.databaseURL
});


let dateObj = date.getnewdate();
console.log(dateObj.year+'-'+dateObj.month+'-'+dateObj.date+' '+dateObj.weekday);
console.log(dateObj.hours+':'+dateObj.minutes+':'+dateObj.seconds);


app.use(express.urlencoded({extended: false}));
app.use(express.json());

app.set('database', connection);
console.log('connection 객체가 app 객체의 속성으로 추가됨.');

watchdog._1mScheduler(connection,admin);
watchdog._dawnScheduler(connection);

const route_loader = require('./routes/route_loader');
const router = express.Router();

//라우팅 정보를 읽어 들여 라우팅 설정
route_loader.init(app, router);

let port = process.env.PORT || 3000;

app.listen(port,function(){
    console.log('Server Listening on Port '+port);
});

const handle_30sScheduler = setInterval(watchdog._30sScheduler, 30000,connection);

process.on('SIGINT',function(){
    clearInterval(handle_30sScheduler);
    process.exit();
})