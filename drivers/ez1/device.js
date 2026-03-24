'use strict';

const Homey = require('homey');
const EZ1_connector = require('./ez1_connector');
const { setCapabilities } = require('../../lib/setEZ1capabilities');

module.exports = class MyDevice extends Homey.Device {

  /**
   * onInit is called when the device is initialized.
   */
  async onInit() {
    this.log('MyDevice has been initialized');

    let pollingInterval = 5; // Default to 5 minutes
    await setCapabilities.call(this);
     // Get polling interval from settings, default to 5 minutes if not set or invalid
     {
      const p = await this.homey.settings.get('poll_interval');
      const pi = Number.parseInt(p, 10);
      pollingInterval = Number.isInteger(pi) ? pi : 5;
      if (isNaN(pollingInterval) || pollingInterval < 1) { pollingInterval = 5; }
    }

    // Set up interval to run getCurrentOutput
    this.outputInterval = setInterval(() => {
      this.getCurrentOutput();
    }, pollingInterval * 60 * 1000);

    // Run it once immediately on init
    await this.getCurrentOutput();
  }

  async getCurrentOutput() {

    this.log('Getting current output');
    const EZ1_connection = new EZ1_connector();
  
      //const { json: response } = await EZ1_connection.fetchData(EZ1_address, EZ1_command);
      //const payload = response.data || response;
      //const success = (response.message || payload.message) === "SUCCESS";

    //const data = await EZ1_connection.fetchData(this.getStoreValue("ipAddr"), "getOutputData");
    //const { json: response } = await EZ1_connection.fetchData(this.getStoreValue("ipAddr"), "getOutputData");

    // const payload = response.data || response;
    // const success = (response.message || payload.message) === "SUCCESS";

    const { json: response } = await EZ1_connection.fetchData(this.getStoreValue("ipAddr"), "getOutputData");

    console.log('IP address used for getOutputData:', this.getStoreValue("ipAddr"));
    console.log('Raw response from getOutputData:', response);
    const payload = (response && response.data) || response || {};
    const success = (response?.message || payload?.message) === "SUCCESS";

    if (!response) {
      this.log('No JSON response from EZ1 with device ID', this.getStoreValue("deviceId"));
      this.log('Response:', response);
      return; // of fallback
}


    this.log('Raw response from getOutputData:', response, payload);
    // or with JSON serialization:
    // this.log('Raw response from getOutputData:', JSON.stringify(response), JSON.stringify(payload));
    this.log('Success status:', success);

    let p1 = 0, e1 = 0, te1 = 0, p2 = 0, e2 = 0, te2 = 0;
    if (success) {
      this.log('Current output data:', payload);
      p1 = payload.p1;
      e1 = payload.e1;
      te1 = payload.te1;
      p2 = payload.p2;
      e2 = payload.e2;
      te2 = payload.te2;
    } else {
      this.log('Error getting current output data:', payload);
    }


    await this.setCapabilityValue("measure_power", p1+p2);
    await this.setCapabilityValue("meter_power", e1+e2);
    await this.setCapabilityValue("total_energy", te1+te2);

  }

  /**
   * onAdded is called when the user adds the device, called just after pairing.
   */
  async onAdded() {
    this.log('MyDevice has been added');
  }

  /**
   * onSettings is called when the user updates the device's settings.
   * @param {object} event the onSettings event data
   * @param {object} event.oldSettings The old settings object
   * @param {object} event.newSettings The new settings object
   * @param {string[]} event.changedKeys An array of keys changed since the previous version
   * @returns {Promise<string|void>} return a custom message that will be displayed
   */
  async onSettings({ oldSettings, newSettings, changedKeys }) {
    this.log('MyDevice settings where changed');
  }

  /**
   * onRenamed is called when the user updates the device's name.
   * This method can be used this to synchronise the name to the device.
   * @param {string} name The new name
   */
  async onRenamed(name) {
    this.log('MyDevice was renamed');
  }

  /**
   * onDeleted is called when the user deleted the device.
   */
  async onDeleted() {
    this.log('MyDevice has been deleted');

    // Clear the interval to prevent memory leaks
    if (this.outputInterval) {
      clearInterval(this.outputInterval);
    }
  }

};
