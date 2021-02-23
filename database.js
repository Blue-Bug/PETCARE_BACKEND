const mysql = require('mysql');
const dbconfig = require('./config/db_config.js')

const get_connection = () => {
  const connection = mysql.createConnection(dbconfig);
  connection.connect(function(err){
    if(err){
      console.log('error when connection to db:', err);
      setTimeout(get_connection,2000);
    }
  }); //DB 연결
  handleDisconnect(connection);
  return connection;
}

function handleDisconnect(client) {
  client.on('error', function (error) {
    if (!error.fatal) return;
    if (error.code !== 'PROTOCOL_CONNECTION_LOST'){
      console.error('> Re-connecting lost MySQL connection: ' + error.stack);
      const connection = mysql.createConnection(dbconfig);
      handleDisconnect(connection);
      connection.connect();
    } else{
      throw err;
    }
  });
};

module.exports = {
  get_connection : get_connection,
}