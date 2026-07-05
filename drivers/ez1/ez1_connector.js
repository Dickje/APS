const http = require('http');
<<<<<<< HEAD
const { json } = require('stream/consumers');
=======
>>>>>>> 88f8906542b19ab1b5c358f8d372a1bf3b2fb925

class EZ1_connector {

  async fetchData(EZ1_address, EZ1_endpoint) {
<<<<<<< HEAD
    
    EZ1_address = EZ1_address.split('.').map(Number).join('.'); // Normalize the IP
    console.error(`Request to http://${EZ1_address}:8050/${EZ1_endpoint}`);
    let rawData = '';

    return new Promise((resolve, reject) => {
      let req;
      let hasError = false;
      
=======
    EZ1_address = EZ1_address.split('.').map(Number).join('.'); // Normalize the IP
    console.log(`Request to http://${EZ1_address}:8050/${EZ1_endpoint}`);

    // For testing purposes, return mock data instead of making an actual HTTP request

    const returnDeviceData = {
    "data":{
    "deviceId":"E07000000001",
    "devVer":"EZ11.0.0",
    "ssid":"ssidName",
    "ipAddr":"192.168.1.2",
    "minPower":"30",
    "maxPower":"800"
    },
    "message":"SUCCESS",
    "deviceId":"E07000000001"
    };

    const returnDataOutput = {
    "data":{
    "p1":10,
    "e1":20,
    "te1":300,
    "p2":15,
    "e2":25,
    "te2":500,
    },
    "message":"SUCCESS",
    "deviceId":"E07000000001"
    };
   
    //   if (EZ1_endpoint === "getDeviceInfo") {
    //    console.log('Returning mock device info data');
    //    return { raw: JSON.stringify(returnDeviceData), json: returnDeviceData };
    // } else if (EZ1_endpoint === "getOutputData") {
    //   console.log('Returning mock output data');
    //    return { raw: JSON.stringify(returnDataOutput), json: returnDataOutput };
    // }

    return new Promise((resolve, reject) => {
>>>>>>> 88f8906542b19ab1b5c358f8d372a1bf3b2fb925
      const options = {
        hostname: EZ1_address,
        port: 8050,
        path: `/${EZ1_endpoint}`,
        method: 'GET',
        timeout: 5000,
      };

<<<<<<< HEAD
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

=======
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
>>>>>>> 88f8906542b19ab1b5c358f8d372a1bf3b2fb925

module.exports = EZ1_connector;