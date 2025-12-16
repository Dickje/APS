const net = require('net');

  class ECU_connector {

  async fetchData(ECU_address, ECU_command) {
    ECU_address = ECU_address.split('.').map(Number).join('.'); // Normalize the IP
    console.log(`Command ${ECU_command.replace(/[\n]/g,"")} to IP address ${ECU_address}`, '\n');

    //throw new Error('connectionError');
    return new Promise((resolve, reject) => {
      const client = new net.Socket();
      client.setTimeout(5000); // 5 seconds timeout
      let hasError = false;

      client.connect(8899, ECU_address, () => { client.write(ECU_command, 'utf-8'); });

      client.on('error', () => {
        console.error('❗ Connection error');
        client.destroy();
        if (hasError) return;
        hasError = true;
         reject (new Error('connectionError'));
      });

      client.on('timeout', () => {
        console.error('⏱️ Timeout error');
        client.destroy();
        if (hasError) return;
        hasError = true;
        reject (new Error('timeoutError'));
      });

      client.on('data', (data) => {
        client.destroy();
        resolve({ data });
      });
    });
  }
  }
module.exports = ECU_connector;