'use strict';

const Homey = require('homey');
const ECU_connector = require('./ecu_connector');

module.exports = class ECUdriver extends Homey.Driver {

  async onInit() {

   
    this.log('ECUdriver has been initialized');

  }
 
  async onPair(session) {
    session.setHandler("keys_entered", async (data) => {
    this.log("ECU IP address received");

    const { ECU_address } = data;
    this.homey.settings.set("ECU_address", ECU_address);

    console.log('Pairing...');
    console.log('IP address:', ECU_address);
  });

    session.setHandler("list_devices", async () => {
    const ECU_connection = new ECU_connector();
    console.log("Listing devices...");

    const ECU_address = this.homey.settings.get("ECU_address");
    const ECU_command = 'APS1100160001END';

    try {
      const data = await ECU_connection.fetchData(ECU_address, ECU_command);
      const buffer = Buffer.from(data.data)
      var Segment = buffer.subarray(55,60); // The ECU type bytes
      var decodedString = Segment.toString('utf8'); // Of 'ascii', afhankelijk van de codering
      this.homey.settings.set("ECU_ID", decodedString);

      if (decodedString.substring(0,3) === "ECU"){
        console.log("✅ " + decodedString + "detected");
      } else {  
        console.log("❌ Error: No ECU detected");
      }
      const hexSegment = buffer.slice(13,25); // The ECU ID bytes
      decodedString = hexSegment.toString('utf8'); 
      const ECU_ID = decodedString
      this.homey.settings.set("ECU_ID",ECU_ID);

      const devices = {
        name: 'APsystems ECU',
        data: { ECU_ID },
        store: { ECU_address }
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