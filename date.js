const week = [7,1,2,3,4,5,6];//일 월 화 ..

var dateObj = { year:"", 
                month:"", 
                date:"", 
                hours:"", 
                minutes:"", 
                seconds:"", 
                weekday:""};

exports.getnewdate = function(){
  var today = new Date();
  dateObj.year = today.getFullYear();
  dateObj.month = today.getMonth()+1;
  dateObj.date = today.getDate();
  dateObj.hours = today.getHours();
  dateObj.minutes = today.getMinutes();
  dateObj.seconds = today.getSeconds();
  dateObj.weekday = week[today.getDay()];
  //console.log(today);
  return dateObj;
};

