const net = require('net');

  class EZ1_connector {

  async fetchData(EZ1_address, EZ1_command) {
    EZ1_address = EZ1_address.split('.').map(Number).join('.'); // Normalize the IP
    console.log(`Command ${EZ1_command.replace(/[\n]/g,"")} to IP address ${EZ1_address}`, '\n');

    //throw new Error('connectionError');
    return new Promise((resolve, reject) => {
      const client = new net.Socket();
      client.setTimeout(5000); // 5 seconds timeout
      let hasError = false;

      client.connect(8050, EZ1_address, () => { client.write(EZ1_command, 'utf-8'); });

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
module.exports = EZ1_connector;