'use strict';

const Homey = require('homey');
const EZ1_connector = require('./ez1_connector');

module.exports = class EZ1driver extends Homey.Driver {

  async onInit() {

   
    this.log('EZ1driver has been initialized');

  }
 
  async onPair(session) {
    session.setHandler("keys_entered", async (data) => {
    this.log("EZ1 IP address received");

    const { EZ1_address } = data;
    this.homey.settings.set("EZ1_address", EZ1_address);

    console.log('Pairing...');
    console.log('IP address:', EZ1_address);
  });

    session.setHandler("list_devices", async () => {
    const EZ1_connection = new EZ1_connector();
    console.log("Connecting to device...");

    const EZ1_address = this.homey.settings.get("EZ1_address");
    const EZ1_command = 'getDeviceInfo';

    try {
      const data = await EZ1_connection.fetchData(EZ1_address, EZ1_command);
      const response = await data.json();

      console.log("DeviceID:", response.DeviceID);
      console.log("DeviceVersion:", response.devVer);
      console.log("SSID:", response.ssid);
      console.log("ipAddress:", response.ipAddr);
      console.log("minPower:", response.minPower);
      console.log("maxPower:", response.maxPower);
      
    
      if (response.message === "SUCCESS"){
        console.log("✅ " + response.DeviceID + "detected");
      } else {  
        console.log("❌ Error:EZ1 not detected");
      }

      const devices = {
        name: 'APsystems EZ1',
        data: { EZ1_ID },
        store: {deviceID: respinse.deviceID,
                devVer: response.devVer,
                ssid: response.ssid,
                ipAddr: response.ipAddr,
                minPower: response.minPower,
                maxPower: response.maxPower} 
      };
             
    
      this.log('Device data:', devices);
      return [devices];

    } catch (err) {
      console.log("Error in retreiving data ", err);
      return [];
    }
  });
}

}