const net = require('net');

  class ECU_connector {

       

  async fetchData(ECU_address, ECU_command) {
    ECU_address = ECU_address.split('.').map(Number).join('.'); // Normalize the IP
    console.log('Command', ECU_command, 'to IP address', ECU_address);

    return new Promise((resolve, reject) => {
      const client = new net.Socket();
      const TIMEOUT_MS = 5000;
      client.setTimeout(TIMEOUT_MS);
      let hasError = false;

      client.connect(8899, ECU_address, () => { client.write(ECU_command, 'utf-8'); });

      client.on('error', (connectionError) => {
        //const connectionError = new Error(this.homey.__("Connection_error"));
        console.error('❗ Connection error:', connectionError.message);
        client.destroy();
        if (hasError) return;
        hasError = true;
        //reject(new Error("Connection error"));
         reject (new Error(connectionError));
      });

      client.on('timeout', (timeoutError) => {
        //const timeoutError = new Error(this.homey.__("ECU_timeout"));
        console.error('⏱️ Timeout error:', timeoutError.message);
        client.destroy();
        if (hasError) return;
        hasError = true;
        //reject(new Error("Timeout error"));
        reject (new Error(timeoutError));
      });

      client.on('data', (data) => {
        client.destroy();
        resolve({ data });
      });
    });
  }
  }
module.exports = ECU_connector;