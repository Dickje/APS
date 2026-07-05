const http = require('http');
const { mockup_data } = require('../../lib/mockup_data.js');
const { json } = require('stream/consumers');

class EZ1_connector {

  async fetchData(EZ1_address, EZ1_endpoint) {
    
    EZ1_address = EZ1_address.split('.').map(Number).join('.'); // Normalize the IP
    console.error(`Request to http://${EZ1_address}:8050/${EZ1_endpoint}`);
    const useMockData = false; // Set to true to use mock data for testing
    let rawData = '';
    if (useMockData) {
      console.log('Using mock data for testing');
      const { returnDeviceData, returnDataOutput, returnPeakPower, returnAlarmData, On_Off_data } = await mockup_data();
    
      if (EZ1_endpoint === "getDeviceInfo") {
       console.log('Returning mock device info data');
        return { raw: JSON.stringify(returnDeviceData), json: returnDeviceData };
      } else if (EZ1_endpoint === "getOutputData") {
        console.log('Returning mock output data');
        return { raw: JSON.stringify(returnDataOutput), json: returnDataOutput };
      } else if (EZ1_endpoint === "getMaxPower") {
        console.log('Returning mock peak power data');
        return { raw: JSON.stringify(returnPeakPower), json: returnPeakPower };
      } else if (EZ1_endpoint === "getAlarm") {
        console.log('Returning mock alarm data');
        return { raw: JSON.stringify(returnAlarmData), json: returnAlarmData };
      } else if (EZ1_endpoint === "setOnOff?status=1" || EZ1_endpoint === "setOnOff?status=0") {
        console.log('Returning mock on/off data ', EZ1_endpoint);
        return { raw: JSON.stringify(true), json: true };
      } else if (EZ1_endpoint === "getOnOff" ) {
        console.log('Returning mock on/off status data');
        return { raw: JSON.stringify(On_Off_data), json: On_Off_data };
      } else if (EZ1_endpoint.startsWith("setMaxPower")) {
        const query = EZ1_endpoint.split('?')[1];
        const params = new URLSearchParams(query);
        const peakPowerValue = params.get('p');
        console.log('Peak power value from setMaxPower:', peakPowerValue);
        return { raw: JSON.stringify({ message: "SUCCESS" }), json: { message: "SUCCESS" } };
      }
          
    }

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