'use strict';

const Homey = require('homey');
const ECU_connector = require('./ecu_connector');

let ECU_address = '';
let ECU_ID = '';
let buffer='';
let inverters='';
let peak_power=0;
let firmware='';
let pauseStartStr;
let pauseEndStr;
let pollingInterval=2;
let lastPower=0;


module.exports = class MyECU extends Homey.Device {

  /**
   * onInit is called when the device is initialized.
   */
  async onInit() {
    console.log('ECU initializing');

    // Current power
    if (!this.hasCapability("measure_power")) {
    await this.addCapability("measure_power");
    await this.setCapabilityOptions("measure_power", {});
    }
    if (!this.hasCapability("measure_temperature")) {
    await this.addCapability("measure_temperature");
    await this.setCapabilityOptions("measure_temperature", {});
    }
    // Voltage
    if (!this.hasCapability("measure_voltage")) {
    await this.addCapability("measure_voltage");
    await this.setCapabilityOptions("measure_voltage", {});
    }
    // Energy in kWh
    if (!this.hasCapability("meter_power.exported")) {
    await this.addCapability("meter_power.exported");
    await this.setCapabilityOptions("meter_power.exported", {});
    }

    // Number of inverters online
    if (!this.hasCapability("inverters_online")) {
    await this.addCapability("inverters_online");
    await this.setCapabilityOptions("inverters_online", {});
    }

    // Maximum power that day
    if (!this.hasCapability("peak_power")) {
    await this.addCapability("peak_power");
    await this.setCapabilityOptions("peak_power", {});
    }

    ECU_address = this.homey.settings.get('ECU_address');
    ECU_ID = this.homey.settings.get("ECU_ID");
  
    
    console.log('On init ECU address', ECU_address);
    console.log('On init ECU ID', ECU_ID,' of type ', (typeof(ECU_ID)));


    console.log("Getting number of inverters.");
    inverters = await this.getNumberOfInverters();
    console.log('Number of inverters:', inverters, ' of type ', (typeof(inverters))); 

    console.log("Getting firmware version.");
    firmware = await this.getFirmwareVersion();
    console.log('Firmware version:', firmware, ' of type ', (typeof(firmware)));

    // Get polling settings
    pauseStartStr = this.homey.settings.get('pause_start') || "23:00";
    pauseEndStr = this.homey.settings.get('pause_start') || "05:00";
    pollingInterval = parseInt(this.homey.settings.get('poll_interval')) || "2"; 

    await this.setSettings({
      ECU_ID: ECU_ID,
      ECU_address: ECU_address,
      ECU_firmware: firmware
    })
    .catch(error => {
      console.log("❌ Error in setSettings:", error);
    });

    console.log('ECU has been initialized');
    console.log('');
    this.pollLoop(); // Get data and repeat
  };

getEnergyData = async()=>{ 
  console.log('');
  console.log('Getting energy data');
  let totalVoltage = 0;
  let totalTemperature = 0;
  let totalRecords = 0;

    buffer = await this.getECUdata('APS1100280002', ECU_ID, ECU_address);
    console.log('Type of buffer:', typeof(buffer));
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

  // Recap
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
 }
}

async getPowerData() {
  console.log('Getting powerdata');
  buffer = await this.getECUdata('APS1100160001','', ECU_address);
  const ECU_power_changed = this.homey.flow.getTriggerCard("ECU_power_changed");

  if (buffer != null) {
    this.hexdumpall(buffer);
    const lifeEnergy = ((buffer[27] << 24) | (buffer[28] << 16) | (buffer[29] << 8) | buffer[30]) >>> 0;
    const currentPower = ((buffer[31] << 24) | (buffer[32] << 16) | (buffer[33] << 8) | buffer[34]) >>> 0;
    const todaysEnergy = (((buffer[35] << 24) | (buffer[36] << 16) | (buffer[37] << 8) | buffer[38]) >>> 0)/ 100;
    const invertersOnline = parseInt(buffer[49],10);
    console.log('lifeEnergy', lifeEnergy);
    console.log('currentPower', currentPower);
    console.log('todaysEnergy', todaysEnergy);
    console.log('Inverters online', invertersOnline);

    if (peak_power==0) {peak_power=currentPower}
   
    if (currentPower > this.getStoreValue("peak_power") && currentPower<6500){
      peak_power = currentPower;
      this.setStoreValue("peak_power", peak_power);
    };
    console.log('Peak power', peak_power);
    await this.setCapabilityValue("meter_power.exported", todaysEnergy);
    if (currentPower>6500){
        this.addToTimeline("Unrealistic power value, (", currentPower, " kW) probably an error in communication with the ECU.")}
    else { await this.setCapabilityValue("measure_power", currentPower);
          peak_power = currentPower
    };


    await this.setCapabilityValue("measure_power", currentPower);
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
    
    
      const time = await this.getTime();
      if (time === "23:59") {
        peak_power = 0;
        this.setStoreValue("peak_power", peak_power);
        console.log("Peak power reset");
        this.addToTimeline("Peak power resetted");
        await this.setCapabilityValue("peak_power", peak_power)
      }
  };
};

async onAdded() {
  this.log('ECU has been added');
}

async onSettings({ oldSettings, newSettings, changedKeys }) {
  this.log('ECU settings were changed');
  console.log('🔧 Old settings:', oldSettings);
  console.log('🆕 New settings:', newSettings);
  console.log('🔑 Changed keys:', changedKeys);

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
 }

async onRenamed(name) {
    this.log('ECU was renamed');
  }

async onDeleted() {
    this.log('ECU has been deleted');
  }

async getNumberOfInverters(){
  let inverters;
  try {
  buffer =  await this.extractECUdata();
        inverters = (buffer[46] << 8) | buffer[47];
      if (isNaN(inverters)) {
        throw new Error("❗ Failed to parse inverter count from buffer.");
      }
  } catch(err){
      console.error(`❌ Error in getNumberOfInverters: ${err.message}`);
      ECU_error.trigger({ error_message: err.message });
    
      return null;  
  }
    return inverters;
}

async getFirmwareVersion() {
  let firmware;   //declare outside try-catch block
  try {
  buffer =  await this.extractECUdata();
      const sliced = buffer.subarray(61, 67); // Byte 61-67 for firmware version
      firmware = sliced.toString('utf8'); 
      if (firmware == null) {
      throw new Error("❗ Failed to get firmware from buffer.");
      }
  } catch(err){
      console.error(`❌ Error in getFirmwareVersion: ${err.message}`);
      ECU_error.trigger({ error_message: err.message });

      return 'unkown';
  }
      return firmware;
}

async extractECUdata() {
  try {
    let checkOk = false;

    buffer = await this.getECUdata('APS1100160001', '', ECU_address);
    if (!buffer) {
      throw new Error("❗ Failed to retrieve ECU data.");
    }

    this.hexdumpall(buffer);
    checkOk = this.checkSum(buffer); 

    if (checkOk) {
      if (!buffer || buffer.length < 48) { throw new Error("❗ Buffer too short to extract data.");
       }
    } 
    return buffer;

  } catch (err) {
    console.error(`❌ Error in getECUdata: ${err.message}`);
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
      //console.log(i.toString().padStart(4, '0') + '  ' + hex.padEnd(47) + '  ' + ascii);
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
    const ECU_command = command + ECU_ID + 'END';
    const ECU_connection = new ECU_connector();
    const ecudata = await ECU_connection.fetchData(ECU_address, ECU_command);
    console.log('getECUdata result:', ecudata);
    if (!ecudata || !ecudata.data) {
      console.error('❗ Geen geldige ECU data ontvangen.');
      return null;
    }
    const buffer = Buffer.from(ecudata.data);
    return buffer;
    } catch (error) {
      console.error("❗ Error in retreiving ECU-data:");
      console.log("Type return from ECU:", (typeof(buffer)));
      console.log("Buffer ", buffer);
      if (error ==='timeoutError'){return null};
      if (error ==='connectionError'){
        this.addToTimeline(this.homey.__("ECU_connection_failure "));
        return null};

    if (error.code) console.error("🔹 Errorcode:", error.code);

    if (this && this.homey && this.homey.notifications) {
      this.addToTimeline(this.homey.__("ECU_data_failure ") + error.message);
      };
     
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

    // Length of bytes (5 - 8) as ASCII
    const lengthAscii = buffer.subarray(5, 9).toString('ascii');    
    const expectedLength = parseInt(lengthAscii, 10);

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

async sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async pollLoop() {
  const currentTime = await this.getTime(); 
  const [hour, minute] = currentTime.split(':').map(Number);
  const nowMinutes = hour * 60 + minute;

  if (!isValidTimeFormat(pauseStartStr)) {
    console.error("pause_start is no valid time!")
    return;
  }
  if (!isValidTimeFormat(pauseEndStr)) {
    console.error("pause_end is no valid time!");
    return;
  }
  if (isNaN(pollingInterval) || pollingInterval < 1) {
    console.error("poll_interval must be greater or equal to 1.");
    return;
  }


  const [pauseStartHour, pauseStartMinute] = pauseStartStr.split(':').map(Number);
  const [pauseEndHour, pauseEndMinute] = pauseEndStr.split(':').map(Number);

  const pauseStart = pauseStartHour * 60 + pauseStartMinute;
  const pauseEnd = pauseEndHour * 60 + pauseEndMinute;

  const isPaused = pauseStart < pauseEnd
    ? nowMinutes >= pauseStart && nowMinutes < pauseEnd
    : nowMinutes >= pauseStart || nowMinutes < pauseEnd;

  if (isPaused) { console.log(`⏸️ Polling paused between ${pauseStartStr} and ${pauseEndStr} (${currentTime})`); } 

  try {
    if (!isPaused) {
    await Promise.all([
      await this.getEnergyData(),
      await this.getPowerData()   
    ])};
  } catch (err) {
    console.warn("Polling error:", err);
  } finally {
    console.log(`⏸️ Polling on ECU is running.`);
    setTimeout(() => this.pollLoop(), pollingInterval * 60 * 1000);
  }
}

async getTime() {
 
    const tz = await this.homey.clock.getTimezone();
    console.log(`The timezone is ${tz}`);

    // Define a function to get the time in a specific timezone
    const formatter = new Intl.DateTimeFormat([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false, // Use 24-hour format
      timeZone: tz,
    });
    const timeParts = formatter.formatToParts(new Date());
    const hour = timeParts.find(part => part.type === 'hour').value;
    const minute = timeParts.find(part => part.type === 'minute').value;

    console.log(`The time is ${hour}:${minute}`);
    return `${hour}:${minute}`;
  }

addToTimeline(message) {
    this.homey.notifications.createNotification({ 
        excerpt: `${message}`})}
}

function isValidTimeFormat(timeStr) {
  // Accepteert HH:MM, waarbij HH van 00 t/m 23 en MM van 00 t/m 59
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
  return timeRegex.test(timeStr);
}