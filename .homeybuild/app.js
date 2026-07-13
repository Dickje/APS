'use strict';

const Homey = require('homey');

class MyApp extends Homey.App {
  /**
   * onInit is called when the app is initialized.
   */
  async onInit() {
    
    this.pauseStartStr = '23:00';
    this.pauseEndStr = '05:00';
    this.pause_by_flowcard = false;
    this.polling_on = true;
    this.homey.app.pollingInterval = 5;
    this.homey.app.pause_start;
    this.homey.app.pause_end;
    this.log('MyApp has been initialized');

  }
};

module.exports = MyApp;   