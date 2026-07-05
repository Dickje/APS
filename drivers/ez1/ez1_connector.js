const http = require('http');
const { json } = require('stream/consumers');

class EZ1_connector {

  async fetchData(EZ1_address, EZ1_endpoint) {
    
    EZ1_address = EZ1_address.split('.').map(Number).join('.'); // Normalize the IP
    console.error(`Request to http://${EZ1_address}:8050/${EZ1_endpoint}`);
    let rawData = '';

    return new Promise((resolve, reject) => {
      let req;
      let hasError = false;
      
      const options = {
        hostname: EZ1_address,
        port: 8050,
        path: `/${EZ1_endpoint}`,
        method: 'GET',
        timeout: 5000,
      };

      console.log('verbinden met opties', options);
      
      try {
        req = http.request(options, (res) => {
          console.log('response:', req);

          res.setEncoding('utf8');
          let rawData = '';
          
          res.on('data', (chunk) => { 
            rawData += chunk; 
          });

          res.on('end', () => {
            try {
              let json = JSON.parse(rawData);
              console.error('Received JSON response:', json);
              resolve({ raw: rawData, json });
            } catch (parseError) {
              console.error('JSON parse error:', parseError);
              reject(new Error('JSON parse error'));
            }
          });
        });

        req.on('timeout', () => {
          console.error('⏱️ Timeout error');
          hasError = true;
          req.destroy();
          reject(new Error('timeoutError'));
        });

        req.on('error', (err) => {
          console.error('⏱️ Connection error:', err.message);
          if (hasError) return;
          hasError = true;
          reject(new Error('connectionerror: ' + err.message));
        });

        req.end();
      } catch (err) {
        console.error('Request creation error:', err);
        reject(err);
      }
    });
  
    } 
 }


module.exports = EZ1_connector;