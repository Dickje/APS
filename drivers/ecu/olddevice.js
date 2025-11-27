'use strict';

const Homey = require('homey');
const { isValidTimeFormat, getTime, isPaused } = require('../../lib/apslib');
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


module.exports = class MyECU extends Homey.Device {

  /**
   * onInit is called when the device is initialized.
   */
  async onInit() {
    console.log('ECU initializing');
    
    try {
    await setCapabilities.call(this);

    const settings = this.getSettings();
    console.log('Alle settings voor ECU:', settings);
    
    ECU_address = this.homey.settings.get('ECU_address') ?? '';
    ECU_ID = this.homey.settings.get("ECU_ID") ?? '';
    this.setStoreValue("peak_power", null);
    
    console.log('On init ECU address', ECU_address);
    console.log('On init ECU ID', ECU_ID);

    // Normalize settings: trim strings and provide safe defaults when empty
    {
      const s = this.getSetting('pause_start');
      pauseStartStr = (typeof s === 'string' && s.trim() !== '') ? s.trim() : '23:00';
    }
    {
      const e = this.getSetting('pause_end');
      pauseEndStr = (typeof e === 'string' && e.trim() !== '') ? e.trim() : '05:00';
    }
    {
      const p = this.getSetting('poll_interval');
      const pi = Number.parseInt(p, 10);
      pollingInterval = Number.isInteger(pi) ? pi : 5;
    }

    await this.getFirmwareAndInverters(firmware, inverters);

    this.homey.flow.getActionCard('polling_pause_ECU').registerRunListener(async (args, state) => {
    console.log('Flowcard polling_pause_ECU triggered');
    polling_on = false;});
  
    this.homey.flow.getActionCard('polling_start_ECU').registerRunListener(async (args, state) => {
    console.log('Flowcard polling_start triggered');
    polling_on = true;});

    this.homey.flow.getTriggerCard('ECU_power_changed').registerRunListener(async (args, state) => {
    console.log('Flowcard ECU_power_changed triggered');
    polling_on = true;});

    await this.setSettings({
      ECU_ID: ECU_ID,
      ECU_address: ECU_address,
      ECU_firmware: firmware
    })


    //Checks the time every 3 minutes and calls datareset
    setInterval(() => {this.datareset(); }, 3 * 60 * 1000);
    // Get data and repeat
    this.pollLoop(); // Get data and repeat

    console.log('ECU has been initialized');
    console.log('');
    
  } catch (err) {
    console.log(`Error initializing ECU: ${err.message}`); 
  }
};


getInverterdata = async()=>{ 
  console.log('');
  console.log('Getting inverter data');
  try {
  let totalVoltage = 0;
  let totalTemperature = 0;
  let totalRecords = 0;

    buffer = await this.getECUdata(Inverter_query, ECU_ID, ECU_address);
    console.log('Type of buffer:', typeof(buffer));
    //if (buffer != null && this.checkSum(buffer)){
      if (buffer != null ){
        this.hexdumpall(buffer);
        const payload = buffer.subarray(16, 194); // The relevant data
        const blockSize = 21; //Number of bytes per inverter

        //Get data from the response
        for (let i = 0; i < payload.length; i += blockSize) {

              const baseOffset = 5; // Start of first record 
              const recordStart = baseOffset + (i + blockSize);
              const volt = parseInt(buffer[recordStart + 16], 10); // Voltage byte in record
              const temp = (buffer[recordStart + 11] << 8 | buffer[recordStart + 12]) - 100;
              const online = parseInt(buffer[recordStart + 6], 10);
        
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

  //And get power data
  await this.getPowerData();
  //And the firmware and # of inverters
  await this.getFirmwareAndInverters();
 }
  } catch (err) {
  console.log(`❌ Error in getInverterdata: ${err.message}`);       
}
};


async getPowerData() {
  console.log('Getting powerdata');
  const ECU_power_changed = this.homey.flow.getTriggerCard("ECU_power_changed");
  try {
  buffer = await this.getECUdata(ECU_query,'', ECU_address);

  if (buffer != null && this.checkSum(buffer)) {
    this.hexdumpall(buffer);

    const currentPower = ((buffer[31] << 24) | (buffer[32] << 16) | (buffer[33] << 8) | buffer[34]) >>> 0;
    const todaysEnergy = (((buffer[35] << 24) | (buffer[36] << 16) | (buffer[37] << 8) | buffer[38]) >>> 0)/ 100;
    const invertersOnline = parseInt(buffer[49],10);
    console.log('currentPower', currentPower);
    console.log('todaysEnergy', todaysEnergy);
    console.log('Inverters online', invertersOnline);

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
              this.addToTimeline(`Unrealistic power value, (${currentPower} kW) probably an error in communication with the ECU.`);}
    else { await this.setCapabilityValue("measure_power", currentPower);
    };

    //await this.setCapabilityValue("measure_power", currentPower);
    await this.setCapabilityValue("inverters_online", String(invertersOnline) + "/" + String(inverters));
    await this.setCapabilityValue("peak_power", peak_power);
    if (invertersOnline == 0) {
      this.setCapabilityValue("measure_power",null);
      this.setCapabilityValue("measure_voltage",null);
      this.setCapabilityValue("measure_temperature", null);
    };  

      if (lastPower !== currentPower) {
      console.log('Power changed from', lastPower, 'to', currentPower);
      ECU_power_changed.trigger({"new_power": currentPower });
      lastPower = currentPower
      }
    
  };
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
        //messages.push('✅ ECU_ID was successfully saved.');
        messages.push(this.homey.__("ECU_ID_saved"));
      } else {
        //messages.push('❌ ECU_ID must be exactly 12 digits.');
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
  }

  // Combine all messages into a single return value
  Promise.resolve().then(() => this.onInit()); // To prevent that setSettings is still running when callin onInit
  return messages.join('\n');

  } catch (err) {
    console.log(`❌ Error in onSettings: ${err.message}`);
  } 
};  

async getFirmwareAndInverters() {

  //const ECU_error = this.homey.flow.getTriggerCard("ECU_error") 23-11 verplaatst naar try
  try {
  buffer =  await this.extractECUdata();
      const sliced = buffer.subarray(61, 67); // Byte 61-67 for firmware version
      
      firmware = sliced.toString('utf8'); 
      if (firmware == null) {
      throw new Error("❗ Failed to get firmware from buffer.");
      }
        inverters = (buffer[46] << 8) | buffer[47];
      if (isNaN(inverters)) {
        throw new Error("❗ Failed to parse inverter count from buffer.");
      }

    } catch(err){
        const ECU_error = this.homey.flow.getTriggerCard("ECU_error") 
        console.error(`❌ Error getting firmware and inverter count: ${err.message}`);

        if (typeof error.message === "string") {ECU_error.trigger({ error_message: err.message });
}        return null;
    }
        console.log('Number of inverters:', inverters);
        console.log('Firmware version:', firmware);
        return { firmware, inverters };
};


async extractECUdata() {
  try {
    let checkOk = false;

    buffer = await this.getECUdata(ECU_query, '', ECU_address);
    if (!buffer) {
      throw new Error("❗ Failed to retreive ECU data.");
    }

    this.hexdumpall(buffer);
    checkOk = this.checkSum(buffer); 

    if (checkOk) {
      if (!buffer || buffer.length < 48) { throw new Error("❗ Buffer too short to extract data.");
       }
    } 
    return buffer;

  } catch (err) {
    console.log(`❌ Error in getECUdata: ${err.message}`);
    return null;
  }
}

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
}

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
      const ECU_error = this.homey.flow.getTriggerCard("ECU_error") ;
      if (error.message ==='connectionError' || error.message ==='timeoutError') {
        if (typeof error.message === "string") {   
          console.log("Triggering ECU_error flow");
          ECU_error.trigger({"error_message": this.homey.__("ECU_connection_failure ") });
      }
    }
    return null;
  }
}

async checkSum(buffer) {
  try {
    if (!Buffer.isBuffer(buffer)) {
      throw new TypeError("❗ Invalid buffer object: expected a Buffer.");
    }

    if (buffer.length < 9) {
      throw new RangeError("❗ Buffer is too short to contain length information.");
    }

    const lengthAscii = buffer.subarray(5, 9).toString('ascii');    // Length of bytes (5 - 8) as ASCII
    const expectedLength = parseInt(lengthAscii, 10);  // Convert ASCII length to integer

    if (isNaN(expectedLength)) {
      throw new Error(`❗ Invalid length value in buffer: "${lengthAscii}" is not a number.`);
    }

    // Length of dump without last byte (linefeed, 0x0A)
    const lastByte = buffer[buffer.length - 1];
    const actualLength = lastByte === 0x0A ? buffer.length - 1 : buffer.length;

    if (expectedLength !== actualLength) {
      console.warn(`⛔ Length mismatch (expected: ${expectedLength}, actual: ${actualLength})`);
      return false;
    }
    // All OK
    return true;

  } catch (err) {
    console.error(`❌ Error in checkSum: ${err.message}`);

    return false;
  }
}


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
    if (!isPaused(pauseStartStr, pauseEndStr, pollingInterval, pause_by_flowcard,polling_on, this.homey)) {
      { console.log(`⏸️ ECU polling paused between ${pauseStartStr} and ${pauseEndStr}`); } 
      await Promise.all([
        console.log('Polling active, getting data from ECU'),
        await this.getInverterdata() 
           ]);
    }
  } catch (err) {
    console.log(`❌ Error in pollLoop: ${err.message}`);
  }
  finally {
    pollingInterval = parseInt(this.getSetting('poll_interval'));
    console.log(`⏸️ Polling on ECU is running at an interval of ${pollingInterval} minutes`);
    setTimeout(() => this.pollLoop(), pollingInterval * 60 * 1000);
  }
}

async datareset() {
  try {
    const time = getTime(this.homey);
    if (time == "00:00") { // Reset data at midnight
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

addToTimeline(message) {
  try {
    this.homey.notifications.createNotification({ 
        excerpt: `${message}`})} catch (err) {
    console.log(`❌ Error in addToTimeline: ${err.message}`);
  }
};

async onRenamed(name) {
    this.log('ECU was renamed');
  }

async onDeleted() {
    this.log('ECU has been deleted');
  }
}