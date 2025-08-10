'use strict';

const Homey = require('homey');

module.exports = class Solardriver extends Homey.Driver {

  async onInit() {
    this.log('Solarpaneldriver has been initialized');
  }
 
  async onPair(session) {
    session.setHandler("credentials_entered", async (data) => {
    this.log("Web credentials received");

console.log("data",data);
    //const { ECU_ID, ECU_address } = data;
    const { ECU_address } = data;
   // this.homey.settings.set("ECU_ID", ECU_ID);
    this.homey.settings.set("ECU_address", ECU_address);

    console.log('Pairing...');
\
    //console.log('ECU ID:', ECU_ID);
  });

    session.setHandler("list_devices", async () => {
    console.log("Listing devices...");

    const { Username, Password } = data;
    this.homey.settings.set("User_name", Username);
    this.homey.settings.set("Pass_word", Password);
    const id = Username+Password;


    try {
      const data = await ECU_connection.fetchData(ECU_address, ECU_command);

      const devices = {
        name: 'APsystems web access',
        data: { id  },
        store: {Username }
      };

      this.log('Device data:', devices);
      return [devices];

    } catch (err) {
      console.error("Error in retreiving data ", err);
      return [];
    }
  });
}

}