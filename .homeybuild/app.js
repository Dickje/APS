'use strict';

const Homey = require('homey');

class MyApp extends Homey.App {
  /**
   * onInit is called when the app is initialized.
   */
  async onInit() {
    console.log("The app has been initialized");
    //const ECU_error = this.homey.flow.getTriggerCard("ECU_error") 
    //const ECU_power_changed = this.homey.flow.getTriggerCard("ECU_power_changed");

  }
};

module.exports = MyApp;   