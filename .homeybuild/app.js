'use strict';

const Homey = require('homey');

class MyApp extends Homey.App {
  /**
   * onInit is called when the app is initialized.
   */
  async onInit() {
    console.log("The app has been initialized");

  }
};

module.exports = MyApp;   