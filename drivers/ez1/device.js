'use strict';

const Homey = require('homey');
const EZ1_connector = require('./ez1_connector');
const { isValidTimeFormat, isPaused } = require('../../lib/apslib');
const { setCapabilities } = require('../../lib/setEZ1capabilities');
const { randomInt } = require('crypto');
const { settings } = require('cluster');
const debug = false; //Enable error reporting if true

module.exports = class MyDevice extends Homey.Device {

  /**
   * onInit is called when the device is initialized.
   */
  async onInit() {
    this.minDevicePower = "0";
    this.maxDevicePower = "0";
    this.maxPower = "0";
    this.newPower = "0";
    this.status = "0";
    this.pollingInterval=5;
    
    try {
    console.log(this.getName(), ' has been initialized');
  
    await setCapabilities.call(this);
    await this.getAppsettings();
    await this.setOnOffStatus("0");
    
    this.homey.flow.getActionCard('polling_pause_EZ1').registerRunListener(async (args, state) => {
    console.log('Flowcard polling_pause_EZ1 triggered'); this.polling_on = false;});

    this.homey.flow.getActionCard('polling_start_EZ1').registerRunListener(async (args, state) => {
    console.log('Flowcard polling_start triggered'); this.polling_on = true;});

    this.homey.flow.getActionCard('max_DevicePower_EZ1').registerRunListener(async (args, state) => {
    console.log('Flowcard max_DevicePower_EZ1 triggered'); this.maxPower = String(args.set_maxPower);
        if (Number.isInteger(Number(this.maxPower)) && this.maxPower >= this.minDevicePower &&  this.maxPower <= this.maxDevicePower) {
          console.log(`Setting device power to ${this.maxPower}W`);
          await this.setDevicePower(this.maxPower);
        } else {
          throw new Error(this.homey.__("maxDevicePower_incorrect", { min: this.minDevicePower, max: this.maxDevicePower }));
        }
    });

    this.homey.flow.getConditionCard('EZ1_polling_active').registerRunListener(async() => {
      return this.polling_on;})

    this.homey.flow.getConditionCard('EZ1_status').registerRunListener(async() => {
      return await this.setCapabilityValue("EZ1_status") })

    this.homey.flow.getActionCard('EZ1_set_on_off').registerRunListener(async (args) => {
      this.status = args.state === "on" ? "0" : "1";
      console.log(`Flowcard `, this.getName(), ` set_on_off triggered, setting status to ${this.status === "0" ? "on" : "off"}`);

      await this.setOnOffStatus(this.status);
      //await this.getAppsettings();
      
    });

    await this.setSettings({
      pause_start: this.pauseStartStr,
      pause_end: this.pauseEndStr,
      poll_interval: this.pollingInterval,
      pause_by_flowcard: this.pause_by_flowcard,
      maxPower: this.maxPower
    })

    // Run once immediately on init
    console.log("Start polloop", this.getName());
    await this.pollLoop();
  } catch (err) {
    console.log(`❌ Error in onInit: ${err.message}` , this.getName());
    if (debug) throw err;
  }
  } 

  async getAppsettings() {
    try {
      this.maxDevicePower= await this.getStoreValue("maxDevicePower");
      this.minDevicePower= await this.getStoreValue("minDevicePower");
      console.log(this.getName(), ` power range: ${this.minDevicePower}W - ${this.maxDevicePower}W`,'\n');

     this.maxPower = String(await this.getSetting('set_DevicePower') || this.maxDevicePower);
     console.log(this.getName(), `maxPower from settings: ${this.maxPower}`);
     if (isNaN(this.maxPower) || this.maxPower < 0 || this.maxPower > 5000 || this.maxPower === undefined || this.maxPower === null) {
       this.maxPower = String(await this.getSetting("maxPower") || this.maxDevicePower);
     }
     if (this.maxPower === undefined || this.maxPower === null || isNaN(this.maxPower) || this.minDevicePower < 0 || this.maxDevicePower > 5000) {
      this.maxPower = String(this.maxDevicePower);

      console.log(this.getName(), `maxPower: ${this.maxPower}`);
      await this.setDevicePower(this.maxPower)
     }

    // {
    //   const s = await this.homey.settings.get('pause_start');
    //   this.pauseStartStr = (typeof s === 'string' && s.trim() !== '') ? s.trim() : '23:00';
    //   console.log(`Normalized pause_start: ${this.pauseStartStr}`);
    // }
    // {
    //   const e = await this.homey.settings.get('pause_end');
    //   this.pauseEndStr = (typeof e === 'string' && e.trim() !== '') ? e.trim() : '05:00';
    //   console.log(`Normalized pause_end: ${this.pauseEndStr}`);
    // }

    await this.getOnOffStatus();

    await this.getSettings({
      pause_start: this.pauseStartStr,
      pause_end: this.pauseEndStr,
      poll_interval: this.pollingInterval,
      pause_by_flowcard: this.pause_by_flowcard,
      maxPower: this.maxPower
    });

    console.log("Settings:",settings);

    return {
      pause_start: this.pauseStartStr,
      pause_end: this.pauseEndStr,
      poll_interval: this.pollingInterval,
      pause_by_flowcard: this.pause_by_flowcard,
      maxPower: this.maxPower
    };
   } catch (err) {
    console.log(`❌ Error in getAppsettings: ${err.message}`, this.getName());
    if (debug) throw err;
    return {};
   }
  }
   
  async getCurrentOutput() {
  try {
    console.log('Getting current output');
    let p1 = 0, e1 = 0, te1 = 0, p2 = 0, e2 = 0, te2 = 0;
    const EZ1_power_changed = this.homey.flow.getDeviceTriggerCard("EZ1_power_changed");
    const EZ1result = await this.fetchDataFromEZ1("getOutputData");
    if (EZ1result?.success) {  
        const data = EZ1result?.data;

        p1 = data.p1;
        e1 = data.e1;
        te1 = data.te1;
        p2 = data.p2;
        e2 = data.e2;
        te2 = data.te2;

    this.newPower=p1+p2;
    if (await this.getCapabilityValue("measure_power") !== this.newPower) {
      await EZ1_power_changed.trigger(this,{"new_power": this.newPower} );
    }
      await this.setCapabilityValue("measure_power", this.newPower);
      await this.setCapabilityValue("meter_power", e1+e2);
      await this.setCapabilityValue("total_energy", te1+te2);

    } else {console.log('Error getting current output data:','\n');}

    } catch (err) {console.log(`❌ Error in getCurrentOutput ${err.message}`);
     if (debug) throw err;}
  } 

  async getSettedMaxPower() {
    try {
    console.log('Getting ', this.getName() , ' set maximum power');
    const EZ1result = await this.fetchDataFromEZ1("getMaxPower");
    if (EZ1result?.success) {
       const data = EZ1result?.data;
       const maxSetDevicePower = data.maxPower;
       await this.setCapabilityValue("set_DevicePower", maxSetDevicePower);
    } else {  
      console.log('Error getting maximum output power:','\n');
    }
    } catch (err) {
      console.log(`❌ Error in getSettedMaxPower ${err.message}`);
      if (debug) throw err;
    }
  }

  async setOnOffStatus(status) {
    try {
    console.log('Setting on/off status to', status);
    const EZ1result = await this.fetchDataFromEZ1(`setOnOff?status=${status}`);
    if (EZ1result?.success) {
      const data = EZ1result?.data;
      console.log(`Successfully set on/off status to ${status}`);
    } else {  
      console.log('Error setting on/off status:','\n');
    }
    } catch (err) {
      console.log(`❌ Error in setOnOffStatus ${err.message}`);
      if (debug) throw err;
    }
  }

  async setDevicePower(maxPower=null) { //=null allows us to call this function without parameters
    console.log("Setting max power on: ", maxPower);
    try {
    maxPower = String(maxPower); // Ensure maxPower is always a string
    const maxPowerNum = Number(maxPower);
    console.log("try catch loop setDevicePower to ", maxPowerNum);
    if (isNaN(maxPowerNum) || maxPowerNum > this.minDevicePower || maxPowerNum < this.maxDevicePower) {      
    console.log('Setting ', this.getName(), ' maximum power to ', maxPower, 'maximum is ', this.maxDevicePower, 'minimum is ', this.minDevicePower);
    const EZ1result = await this.fetchDataFromEZ1("setMaxPower?p=" + maxPower);
    if (EZ1result?.success) {
      const data = EZ1result?.data;
      await this.setSettings({"set_DevicePower": maxPower }); // Store the new max power in settings 
      await this.setCapabilityValue("set_DevicePower", maxPower);
      //await this.getSettedMaxPower(); // Refresh the max_DevicePower capability to reflect the new value from the device
      console.log(`Device maximum power set to ${maxPower}W`,'\n');
    } else {  
      console.log('Error setting output power:','\n');
    }
   }
    } catch (err) {
      console.log(`❌ Error in setDevicePower ${err.message}`);
      if (debug) throw err;
    }
  }

  async getOnOffStatus() {
    try {
    console.log('Getting on/off status');
    const EZ1result = await this.fetchDataFromEZ1("getOnOff");
    if (EZ1result?.success) {
        const data = EZ1result?.data;
        const onOff = data.status === "0" ? true : false; //Becomes true when response is "0"
        await this.setCapabilityValue("EZ1_status", onOff);
    } else {  
      console.log('Error getting on/off status:','\n');
    }
    }  catch (err) {
      console.log(`❌ Error in getOnOffStatus: ${err.message}`);
      if (debug) throw err;
    }
  } 

  async getAlarmData() {
    try {
    console.log('Getting alarm data');
    const EZ1result = await this.fetchDataFromEZ1("getAlarm");
    if (EZ1result?.success) {
      const data = EZ1result?.data;
      const og = data.og === "1";
      const isce1 = data.isce1 === "1";
      const isce2 = data.isce2 === "1";
      const oe = data.oe === "1";

      await this.setCapabilityValue("alarm_offgrid", og);
      await this.setCapabilityValue("alarm_isce1", isce1);
      await this.setCapabilityValue("alarm_isce2", isce2);
      await this.setCapabilityValue("alarm_oe", oe);
    } else {
       console.log('Error getting alarm data:');
    }
    } catch (err) {
      console.log(`❌ Error in getAlarmData: ${err.message}`);
      if (debug) throw err;
    }
  }

  /**
   * onAdded is called when the user adds the device, called just after pairing.
   */
  async onAdded() {
    console.log('MyDevice has been added');
  }

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    try {
    console.log('EZ1 settings were changed');
    console.log('🔧 Old settings:', oldSettings);
    console.log('🆕 New settings:', newSettings);
    console.log('🔑 Changed keys:', changedKeys,'\n');
    
    for (const key of changedKeys) {
      let value = newSettings[key];

      if (key === 'set_DevicePower') {
        this.maxPower = value; // Blijf string
        const maxPowerNum = Number(value); // Converteer voor validatie
        if (isNaN(maxPowerNum)) {
          throw new Error(this.homey.__("Input_is_no_number"));
        }
        console.log(`Attempting to set device power to ${value}W  (min: ${this.minDevicePower}W, max: ${this.maxDevicePower}W)`);
        if (!Number.isInteger(maxPowerNum) || maxPowerNum <= this.minDevicePower || maxPowerNum >= this.maxDevicePower) {
          throw new Error(this.homey.__("maxDevicePower_incorrect", { min: this.minDevicePower, max: this.maxDevicePower }));
        }
        console.log(`Setting `, this.getName(), ` power to ${this.maxPower}W`);
      }

      if (key === 'poll_interval') {
        const pollingIntervalnum = Number(value);
        if (!Number.isInteger(pollingIntervalnum) || pollingIntervalnum <= 0 || pollingIntervalnum >= 61) {
          throw new Error(this.homey.__("Polling_interval_incorrect"));
        }
        this.pollingInterval = pollingIntervalnum;
        console.log("Polling interval changed to:", this.pollingInterval);
      }

      if (key === 'pause_start') {
        if (!isValidTimeFormat(value)) {
          throw new Error(this.homey.__("Pause_start_incorrect"));
        }
        this.pauseStartStr = value.trim();
      }
      
      if (key === 'pause_end') {
        if (!isValidTimeFormat(value)) {
          throw new Error(this.homey.__("Pause_end_incorrect"));
        }
        this.pauseEndStr = value.trim();
      }

      if (key === 'pause_by_flowcard') {
        this.pause_by_flowcard = value;
      }
    }

    //Restart polling to reflect changes
    {
      setImmediate(async () => await this.pollLoop());
    }

    return;
  } catch (err) {
    console.log(`❌ Error in onSettings: ${err.message}`);
    throw err; // Rethrow to ensure Homey shows the error message to the user
  }
  } 

  async pollLoop() {
  try {
  
    this.pause_by_flowcard = this.getSetting('pause_by_flowcard');

    let EZ1_status = await this.getCapabilityValue("EZ1_status");
    console.log(`Current polling_on: ${this.polling_on}, pause_by_flowcard: ${this.pause_by_flowcard}, EZ1_status: ${EZ1_status}`);
    if (!isPaused(this.pauseStartStr, this.pauseEndStr, this.pollingInterval, this.pause_by_flowcard, this.polling_on, this.homey, "EZ1")) {
      { console.log(`⏸️ EZ1 polling paused between ${this.pauseStartStr} and ${this.pauseEndStr}`);     } 
  
        console.log('Polling active','\n');
        await this.getCurrentOutput();
        await this.getSettedMaxPower();
        await this.getAlarmData();
        await this.getOnOffStatus();
        await this.setDevicePower(this.maxPower);

    } else {
      console.log('⏸️ Polling is currently paused.','\n');
       await this.getOnOffStatus();
    }
  } catch (err) {
    console.log(`❌ Error in pollLoop: ${err.message}`);
    if (debug) throw err;
  }
  finally {
    try {
    this.pollingInterval = parseInt(this.getSetting('poll_interval'));
    if (isNaN(this.pollingInterval) || this.pollingInterval < 1) { this.pollingInterval = 5; }
    console.log(`⏸️ Polling on EZ1 is running at an interval of ${this.pollingInterval} minutes`,'\n');
    setTimeout(() => this.pollLoop(), this.pollingInterval * 60 * 1000);
    } catch (err) {
      console.log(`❌ Error in pollLoop finally: ${err.message}`);
      if (debug) throw err;
    }
  }
  };

  async fetchDataFromEZ1(EZ1command) {
    try {
      const EZ1_connection = new EZ1_connector();
      const { json: EZ1result } = await EZ1_connection.fetchData(await this.getStoreValue("ipAddr"), EZ1command);
      const success = EZ1result?.message === "SUCCESS";
      const data = EZ1result?.data;
    if (success) {
      console.log(`Result from command ${EZ1command}:`, data, "Success: ", success,'\n');
      return { data, success };
    } else {
      console.log(`Error executing command ${EZ1command}:`, EZ1result?.message, '\n');
      return { data: null, success: false };
    } 
  }
    catch (err) { 
      console.error(`Error in fetchDataFromEZ1 for command ${EZ1command}:`, err.message);
      if (debug) throw err;
      if (err.message === 'timeoutError') {
        console.error('⏱️ Timeout: Device did not respond within 5 seconds');
        this.homey.flow.getDeviceTriggerCard("EZ1_timeout").trigger(this, {"error_message": this.homey.__("timeout_error")});
      } else if (err.message.includes('connectionerror')) {
        console.error('🔌 Socket hang up: Connection lost with ' , this.getName());
        this.homey.flow.getDeviceTriggerCard("EZ1_connection_error").trigger(this, {"error_message": this.homey.__("connection_error")});
      } else {
        console.error(`❌ Unexpected error: ${err.message}`);
        this.homey.flow.getDeviceTriggerCard("EZ1_connection_error").trigger(this, {"error_message": err.message});
      }
      return { data: null, success: false };
    } 
  }

  /**
   * onRenamed is called when the user updates the device's name.
   * This method can be used this to synchronise the name to the device.
   * @param {string} name The new name
   */
  async onRenamed(name) {
    console.log('MyDevice was renamed');
  }

  /**
   * onDeleted is called when the user deleted the device.
   */
    async onDeleted() {
        this.log('Device deleted:', this.getName());
        this.destroy();
    }

  

};
