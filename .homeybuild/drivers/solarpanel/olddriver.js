'use strict';

const Homey = require('homey');

module.exports = class Solarpaneldriver extends Homey.Driver {

  /**
   * onInit is called when the driver is initialized.
   */
  async onInit() {
    this.log('Solarpaneldriver has been initialized');
  }

  async onPairListDevices(session) {
    console.log("on pair list devices");
    session.setHandler("credentials_entered", async (data) => {
    this.log("Web credentials received");


    const { Username, Password } = data;
    this.homey.settings.set("User_name", Username);
    this.homey.settings.set("Pass_word", Password);

    console.log('Pairing...');
    console.log('User name:', Username);
  });   


    const Username  =  this.homey.settings.get("User_name");
    const Password = this.homey.settings.get("Pass_word");
    const id = Username + Password;
      const devices =  {
      name: 'Solar panel web access',
      data: { id: id }
    }

    return [devices];
  }

};
