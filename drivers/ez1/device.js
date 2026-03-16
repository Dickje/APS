'use strict';

const Homey = require('homey');
const EZ1_connector = require('./ez1_connector');

module.exports = class MyDevice extends Homey.Device {

  /**
   * onInit is called when the device is initialized.
   */
  async onInit() {
    this.log('MyDevice has been initialized');
  }

  async getCurrentOutput() {

    this.log('Getting current output');
    const EZ1_connection = new EZ1_connector();
  
    const data = await EZ1_connection.fetchData(this.getStoreValue("ipAddr"), "getOutputData");
    if (data.message === "SUCCESS") {
      this.log('Current output data:', data);
      const p1 = data.p1;
      const e1 = data.e1;
      const te1 = data.te1;
      const p2 = data.p2;
      const e2 = data.e2;
      const te2 = data.te2;
    } else {
      this.log('Error getting current output data:', data);
    }


    await this.setCapabilityValue("measure_power", p1+p2);
    await this.setCapabilityValue("meter_power.exported", e1+e2);
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
  }

};
