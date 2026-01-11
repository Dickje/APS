'use strict';

const Homey = require('homey');
const { isValidTimeFormat, isPaused, getTime } = require('../../lib/apslib');
const { setCapabilities } = require('../../lib/setECUcapabilities');
const ECU_connector = require('./ecu_connector');

let ECU_ID = '';
let ECU_address = '';
let buffer='';
let inverters='';
let peak_power=0;
let maxPossiblePower=20000;
let firmware='';
let pauseStartStr;
let pauseEndStr;
let pollingInterval=5;
let lastPower=0;
let peakJustReset = false; 
let ECU_query = 'APS1100160001';
let Inverter_query = 'APS1100280002';
let polling_on = true;
let pause_by_flowcard = false;
let ECUbuffer = null;
let InverterBuffer = null;  


module.exports = class MyECU extends Homey.Device {

  /**
   * onInit is called when the device is initialized.
   */
  async onInit() {
    console.log('ECU initializing');
    
    try {
    await setCapabilities.call(this);
    
    ECU_address = this.homey.settings.get('ECU_address') ?? '';
    ECU_ID = this.homey.settings.get("ECU_ID") ?? '';
    this.setStoreValue("peak_power", null);

    // Normalize settings: trim strings and provide safe defaults when empty
    {
      const s = await this.homey.settings.get('pause_start');
      pauseStartStr = (typeof s === 'string' && s.trim() !== '') ? s.trim() : '23:00';
    }
    {
      const e = await this.homey.settings.get('pause_end');
      pauseEndStr = (typeof e === 'string' && e.trim() !== '') ? e.trim() : '05:00';
    }
    {
      const p = await this.homey.settings.get('poll_interval');
      const pi = Number.parseInt(p, 10);
      pollingInterval = Number.isInteger(pi) ? pi : 5;
      if (isNaN(pollingInterval) || pollingInterval < 1) { pollingInterval = 5; }
    }
    
    
    await this.getFirmwareAndInverters(await this.getECUbuffer());

    this.homey.flow.getActionCard('polling_pause_ECU').registerRunListener(async (args, state) => {
    console.log('Flowcard polling_pause_ECU triggered');
    polling_on = false;});
  
    this.homey.flow.getActionCard('polling_start_ECU').registerRunListener(async (args, state) => {
    console.log('Flowcard polling_start triggered');
    polling_on = true;});

    await this.setSettings({
      ECU_ID: ECU_ID,
      ECU_address: ECU_address,
      ECU_firmware: firmware,
      pause_start: pauseStartStr,
      pause_end: pauseEndStr,
      poll_interval: pollingInterval,
      pause_by_flowcard: pause_by_flowcard
    })


    //Checks the time every 15 minutes and calls datareset
    setInterval(() => {this.datareset(); }, 15 * 60 * 1000);
    // Get data and repeat
    this.pollLoop(); // Get data and repeat

    const settings = this.getSettings();
    console.log('Alle settings voor ECU:', settings);

    console.log('ECU has been initialized');
    console.log('');
    
  } catch (err) {
    console.log(`Error initializing ECU: ${err.message}`); 
  }
};

getInverterBuffer = async()=>{ 
  console.log('');
  console.log('Getting inverter buffer data');
  try {
    buffer = await this.getECUdata(Inverter_query, ECU_ID, ECU_address);
    console.log('Type of buffer:', typeof(buffer));
    if (buffer != null ){
        this.hexdumpall(buffer);
        return buffer;
    } else {
      console.log('No valid buffer received from ECU.');
      return null;
    }
  } catch (err) {
    console.log(`❌ Error in getInverterBufferData: ${err.message}`);       
    return null;
  }
};

getECUbuffer = async()=>{ 
  console.log('');
  console.log('Getting ECU buffer data');
  try {
    buffer = await this.getECUdata(ECU_query,'', ECU_address);
    console.log('Type of buffer:', typeof(buffer));
    if (buffer != null ){
        this.hexdumpall(buffer);
        return buffer;
    } else {
      console.log('No valid buffer received from ECU.');
      return null;
    }
  } catch (err) {
    console.log(`❌ Error in getECUbufferData: ${err.message}`);       
    return null;
  }
};  

getInverterdata = async(buffer) => { 
  console.log('');
  console.log('Getting inverter data');
  try {
  let totalVoltage = 0;
  let totalTemperature = 0;
  let totalRecords = 0;
        const payload = buffer.subarray(16, 194); // The relevant data
        const blockSize = 21; //Number of bytes per inverter

        //Get data from the response
        for (let i = 0; i < payload.length; i += blockSize) {

              const baseOffset = 5; // Start of first record 
              const recordStart = baseOffset + (i + blockSize);
              const volt = parseInt(InverterBuffer[recordStart + 16], 10); // Voltage byte in record
              const temp = (InverterBuffer[recordStart + 11] << 8 | InverterBuffer[recordStart + 12]) - 100;
              const online = parseInt(InverterBuffer[recordStart + 6], 10);
        
          if(online == 1){ 
              totalVoltage += volt;
              totalTemperature += temp;
              totalRecords++;}
        }

  const averageVoltage = totalVoltage / totalRecords;
  const averageTemp = totalTemperature / totalRecords;
  const strVoltage = averageVoltage.toFixed(0); // Round to whole numbers
  const numVoltage = parseInt(strVoltage); // Make it a number, toFixed returns a string
  console.log('');
  console.log(`Average of voltage: ${averageVoltage.toFixed(0)}V`);
  console.log(`Average of temperature: ${averageTemp.toFixed(1)}°C`);

  //Push data to app
  this.setCapabilityValue("measure_voltage",numVoltage);
  this.setCapabilityValue("measure_temperature",averageTemp);

 
  } catch (err) {
  console.log(`❌ Error in getInverterdata: ${err.message}`);       
}
};


async getPowerData(buffer) {
  console.log('Getting powerdata');
  const ECU_power_changed = this.homey.flow.getDeviceTriggerCard("ECU_power_changed");
  try {
  
    const currentPower = ((buffer[31] << 24) | (buffer[32] << 16) | (buffer[33] << 8) | buffer[34]) >>> 0;
    const todaysEnergy = (((buffer[35] << 24) | (buffer[36] << 16) | (buffer[37] << 8) | buffer[38]) >>> 0)/ 100;
    const invertersOnline = parseInt(buffer[49],10);
    console.log('currentPower', currentPower);
    console.log('todaysEnergy', todaysEnergy);
    console.log('Inverters online', invertersOnline,'\n');

    if (!peakJustReset && currentPower > peak_power && currentPower <= maxPossiblePower){
      peak_power = currentPower;
      this.setStoreValue("peak_power", peak_power);
    }
    if (peakJustReset) {
      peakJustReset = false; 
    }
    console.log('Peak power', peak_power);

    await this.setCapabilityValue("meter_power.exported", todaysEnergy);
    if (currentPower > maxPossiblePower){
              this.addToTimeline(`Unrealistic power value, (${currentPower} kW) probably an error in communication with the ECU. ECU response: ${buffer}`);
    } else { await this.setCapabilityValue("measure_power", currentPower);
  
    };

    await this.setCapabilityValue("inverters_online", String(invertersOnline) + "/" + String(inverters));
    await this.setCapabilityValue("peak_power", peak_power);
    if (invertersOnline == 0) {
      this.setCapabilityValue("measure_power",null);
      this.setCapabilityValue("measure_voltage",null);
      this.setCapabilityValue("measure_temperature", null);
    };  

      if (lastPower !== currentPower) {
      console.log('Power changed from', lastPower, 'to', currentPower);
      await ECU_power_changed.trigger(this,{"new_power": currentPower });
      lastPower = currentPower
      }
  } catch (err) {
    console.log(`❌ Error in getPowerData: ${err.message}`);       
  }
};  

async onAdded() {
  this.log('ECU has been added');
}

async onSettings({ oldSettings, newSettings, changedKeys }) {
  this.log('ECU settings were changed');
  console.log('🔧 Old settings:', oldSettings);
  console.log('🆕 New settings:', newSettings);
  console.log('🔑 Changed keys:', changedKeys);

  try {
  const messages = [];

  for (const key of changedKeys) {
    let value = newSettings[key];
    console.log('Key', key);
    console.log('Setting', value);

    if (key === 'ECU_ID') {
      const isValidECU_ID = /^\d{12}$/.test(value);
      if (isValidECU_ID) {
        this.homey.settings.set("ECU_ID", value);
        messages.push(this.homey.__("ECU_ID_saved"));
      } else {
        messages.push(this.homey.__("ECU_ID_invalid"));
      }
    }

    if (key === 'ECU_address') {
      value = value.split('.').map(Number).join('.'); // Normalize the IP by stripping leading zeros
      const isValidIP = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/.test(value);
      if (isValidIP) {
        this.homey.settings.set("ECU_address", value);
        //messages.push('✅ IP address was successfully saved.');
        messages.push('✅ ' + this.homey.__("IP_address_saved"));
      } else {
        //messages.push('❌ Invalid IP address.');
        messages.push('❌ ' +  this.homey.__("IP_address_invalid"));        
      }
    }

    if (key === 'pause_start') {
      // Validate the new value (not the old variable)
      if (isValidTimeFormat(value)) {
        this.homey.settings.set("pause_start", value);
        pauseStartStr = value.trim();
        messages.push(this.homey.__("Pause_start_changed"));
      } else {
        messages.push(this.homey.__("Pause_start_incorrect"));
      }
    }
    
    if (key === 'pause_end') {
      if (isValidTimeFormat(value)) {
        this.homey.settings.set("pause_end", value);
        pauseEndStr = value.trim();
        messages.push(this.homey.__("Pause_end_changed"));
      } else {
        messages.push(this.homey.__("Pause_end_incorrect"));
      }
    }
    
    if (key === 'poll_interval') {
        const pollingIntervalnum = Number(pollingInterval);
        if (Number.isInteger(pollingIntervalnum) && pollingIntervalnum > 1 && pollingIntervalnum < 61) {
          this.homey.settings.set("polling_interval", value);
          pollingInterval=value;
          messages.push(this.homey.__("Polling_interval_changed"));
         if (pollingIntervalnum < 5) {messages.push(this.homey.__("polling_too_fast"));}



          await this.pollLoop(); // Restart polling with new interval
        } else {
            messages.push(this.homey.__("Polling_interval_incorrect"));
        }
    }
  }

  // Combine all messages into a single return value
  Promise.resolve().then(() => this.onInit()); // To prevent that setSettings is still running when callin onInit
  return messages.join('\n');

  } catch (err) {
    console.log(`❌ Error in onSettings: ${err.message}`);
  } 
};  

async getFirmwareAndInverters(buffer) {
  try {
      const sliced = buffer.subarray(61, 67); // Byte 61-67 for firmware version  
      firmware = sliced.toString('utf8'); 
      if (firmware == null) {
      throw new Error("❗ Failed to get firmware from buffer.");
      }
        inverters = (buffer[46] << 8) | buffer[47];
      if (isNaN(inverters)) {
        throw new Error("❗ Failed to parse inverter count from ECU buffer.");
      }

    } catch(err){
        const ECU_error = this.homey.flow.getDeviceTriggerCard("ECU_error") 
        console.error(`❌ Error getting firmware and inverter count: ${err.message}`);

        if (typeof err.message === "string") {await ECU_error.trigger(this,{ error_message: err.message });
}        return null;
    }
        console.log('Number of inverters:', inverters);
        console.log('Firmware version:', firmware,'\n');
        return { firmware, inverters };
};

async hexdumpall(buffer) {
  let lineOutput=''
  try {
    if (!Buffer.isBuffer(buffer)) {
      throw new TypeError("❗ Invalid input: expected a Buffer.");
    }
    // 📄 Clean hexdump with ASCII representation
    for (let i = 0; i < buffer.length; i += 21) {
      const block = buffer.subarray(i, i + 21);
      const hex = [...block].map(b => b.toString(16).padStart(2, '0')).join(' ');
      const ascii = [...block].map(b => {
        const char = String.fromCharCode(b);
        return b >= 32 && b <= 126 ? char : '.';
      }).join('');

      lineOutput = lineOutput +  (i.toString().padStart(4, '0') + '  ' + hex.padEnd(47) + '  ' + ascii +'\n');
    }
    console.log(lineOutput); 
    return lineOutput;
  } catch (err) {
    console.error(`❌ Error in hexdumpall: ${err.message}`);
  }
};

async getECUdata(command, ECU_ID, ECU_address) {
try {
    const ECU_command = command + ECU_ID + 'END\n';
    const ECU_connection = new ECU_connector();
    const ecudata = await ECU_connection.fetchData(ECU_address, ECU_command);
    console.log('getECUdata result:', ecudata);
    if (!ecudata || !ecudata.data) {
      console.log('❗ Geen geldige ECU data ontvangen.');
      return null;
    }
    const buffer = Buffer.from(ecudata.data);
    return buffer;
    } catch (error) {
      console.log("❗ Error in retreiving ECU-data:");
      console.log("Type return from ECU:", (typeof(buffer)));
      console.log("Buffer :", buffer);
      console.log(`Error message: ${error.message} , ${this.homey.__("ECU_connection_failure ")}`);
      const ECU_error = this.homey.flow.getDeviceTriggerCard("ECU_error") ;
      if (error.message ==='connectionError' || error.message ==='timeoutError') {
        if (typeof error.message === "string") {   
          console.log("Triggering ECU_error flow");
          await ECU_error.trigger(this,{"error_message": this.homey.__("ECU_connection_failure ") });
      }
    }
    return null;
  }
};

async pollLoop() {
  try {
  
  if (!isValidTimeFormat(pauseStartStr)) {
    console.log("pause_start is no valid time!")
    return;
  }
  if (!isValidTimeFormat(pauseEndStr)) {
    console.log("pause_end is no valid time!");
    return;
  }
  if (isNaN(pollingInterval) || pollingInterval < 1) {
    console.log("poll_interval must be greater or equal to 1.");
    return;
  }

    pause_by_flowcard = this.getSetting('pause_by_flowcard');
    if (!isPaused(pauseStartStr, pauseEndStr, pollingInterval, pause_by_flowcard,polling_on, this.homey, "ECU")) {
      { console.log(`⏸️ ECU polling paused between ${pauseStartStr} and ${pauseEndStr}`); } 
   
        console.log('Polling active, getting data from ECU'),
        InverterBuffer = await this.getInverterBuffer()
     
    if (InverterBuffer != null ){
          await this.getInverterdata(InverterBuffer)
          await this.sleep(2000);
          ECUbuffer = await this.getECUbuffer()
        }

    if (ECUbuffer != null ){
          await this.getPowerData(ECUbuffer),
          await this.getFirmwareAndInverters(ECUbuffer)
        }

    }
  } catch (err) {
    console.log(`❌ Error in pollLoop: ${err.message}`);
  }
  finally {
    pollingInterval = parseInt(this.getSetting('poll_interval'));
    if (isNaN(pollingInterval) || pollingInterval < 1) { pollingInterval = 5; }
    console.log(`⏸️ Polling on ECU is running at an interval of ${pollingInterval} minutes`);
    setTimeout(() => this.pollLoop(), pollingInterval * 60 * 1000);
  }
};

// async datareset() {
//   try {
//     const time = getTime(this.homey);
//     if (time == "00:01") { // Reset data at one minute aftermidnight
//       console.log("Data reset");
//       peak_power = null;
//       peakJustReset = true;
//     await this.setStoreValue("peak_power", peak_power);
//     await this.setCapabilityValue("peak_power", peak_power);
//     await this.setCapabilityValue("meter_power.exported", null);
//   }
// } catch (err) {   
//     console.log(`❌ Error in datareset: ${err.message}`);
//   }
// };

async datareset() {
  try {
    const time = getTime(this.homey);
    const hour = parseInt(time.split(':')[0]); 
    if (
      hour === 0) { // Reset data aftermidnight
      console.log("Data reset");
      peak_power = null;
      peakJustReset = true;
    await this.setStoreValue("peak_power", peak_power);
    await this.setCapabilityValue("peak_power", peak_power);
    await this.setCapabilityValue("meter_power.exported", null);
  }
} catch (err) {   
    console.log(`❌ Error in datareset: ${err.message}`);
  }
};




async sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
};

addToTimeline(message) {
  try {
    this.homey.notifications.createNotification({ 
        excerpt: `${message}`})} catch (err) {
    console.log(`❌ Error in addToTimeline: ${err.message}`);
  }
};

async onRenamed(name) {
    this.log('ECU was renamed');
  };

async onDeleted() {
    this.log('ECU has been deleted');
    this.destroy();
  };
}