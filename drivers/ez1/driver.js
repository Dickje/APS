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
      const { json: response } = await EZ1_connection.fetchData(EZ1_address, EZ1_command);
      const payload = response.data || response;
      const EZ1_ID = response.deviceId || payload.deviceId || payload.DeviceID;

      console.log("DeviceID:", EZ1_ID);
      console.log("DeviceVersion:", payload.devVer);
      console.log("SSID:", payload.ssid);
      console.log("ipAddress:", payload.ipAddr);
      console.log("minPower:", payload.minPower);
      console.log("maxPower:", payload.maxPower);
      
    
      const success = (response.message || payload.message) === "SUCCESS";
      if (success) {
        console.log("✅ " + EZ1_ID + " detected");
      } else {
        console.log("❌ Error: EZ1 not detected");
      }

      const devices = {
        name: 'APsystems EZ1',
        data: { EZ1_ID },
        store: {
          deviceID: EZ1_ID,
          devVer: payload.devVer,
          ssid: payload.ssid,
          ipAddr: payload.ipAddr,
          minPower: payload.minPower,
          maxPower: payload.maxPower,
        },
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