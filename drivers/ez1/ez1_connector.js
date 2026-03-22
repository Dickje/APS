const http = require('http');

class EZ1_connector {

  async fetchData(EZ1_address, EZ1_endpoint) {
    EZ1_address = EZ1_address.split('.').map(Number).join('.'); // Normalize the IP
    console.log(`Request to http://${EZ1_address}:8050/${EZ1_endpoint}`);

    return new Promise((resolve, reject) => {
      const options = {
        hostname: EZ1_address,
        port: 8050,
        path: `/${EZ1_endpoint}`,
        method: 'GET',
        timeout: 5000,
      };

      const req = http.request(options, (res) => {
        let rawData = '';
        res.setEncoding('utf8');

        res.on('data', (chunk) => { rawData += chunk; });

        res.on('end', () => {
          let json;
          try {
            json = JSON.parse(rawData);
          } catch (error) {
            console.log('Invalid JSON data received:', rawData);
            return reject(new Error(`invalid JSON response: ${error.message}`));
          }
          resolve({ raw: rawData, json });
        });
      });

      req.on('timeout', () => {
        console.error('⏱️ Timeout error');
        req.destroy();
        reject(new Error('timeoutError'));
      });

      req.on('error', (err) => {
        console.error('❗ Connection error:', err.message);
        reject(new Error('connectionError'));
      });

      req.end();
    });
  }
}

module.exports = EZ1_connector;