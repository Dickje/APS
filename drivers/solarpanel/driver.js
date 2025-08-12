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
    const { Username, Password } = data;
    this.homey.settings.set("User_name", Username);
    this.homey.settings.set("Pass_word", Password);

    console.log('Pairing...');

  });

    session.setHandler("list_devices", async () => {
    console.log("Listing devices...");

    const Username = this.homey.settings.get("User_name");
    const Password = this.homey.settings.get("Pass_word");
    const id = Username+Password;
    console.log ("ID:",id)

    try {
      if (!Username || !Password) {
        throw new Error("Username or Password not set");
      }

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