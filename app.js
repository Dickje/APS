'use strict';

const Homey = require('homey');

class MyApp extends Homey.App {
  /**
   * onInit is called when the app is initialized.
   */
  async onInit() {
    console.log("The app has been initialized");
    this.cartTriggerError = this.homey.flow.getTriggerCard("ECU_error") 

  }
};

module.exports = MyApp;   