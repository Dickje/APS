'use strict';

const Homey = require('homey');
const MyApi = require('./api');
const { isValidTimeFormat } = require('../../lib/apslib');
let pauseStartStr;
let pauseEndStr;
let pollingInterval=15;

module.exports = class MyDevice extends Homey.Device {



  /**
   * onInit is called when the device is initialized.
   */
  async onInit() {
    console.log('Initializing solarpanel');

    if (!this.hasCapability("total_energy")) {
    await this.addCapability("total_energy");
    await this.setCapabilityOptions("total_energy", {});
    }

    if (!this.hasCapability("year_energy")) {
    await this.addCapability("year_energy");
    await this.setCapabilityOptions("year_energy", {});
    }

    if (!this.hasCapability("month_energy")) {
    await this.addCapability("month_energy");
    await this.setCapabilityOptions("month_energy", {});
    }

    if (!this.hasCapability("meter_todays_energy")) {
    await this.addCapability("meter_todays_energy");
    await this.setCapabilityOptions("meter_todays_energy", {});
    }

    console.log('Solarpanel has been initialized');
    // Get polling settings 
    pauseStartStr = this.getSetting('pause_start') || "23:00";
    pauseEndStr = this.getSetting('pause_end') || "05:00";
    pollingInterval = parseInt(this.getSetting('poll_interval')) || "15"; 


    this.pollLoop(); // Get data and repeat
    }

  async getTodaysEnergy() {
    console.log('Get todays energy called');
    var sid=''; // System ID
    var eid=''; // ECU ID
    var apiKey='';
    var apiSecret='';

    sid = this.homey.settings.get("sid");
    eid = this.homey.settings.get("eid");
    apiKey =  this.homey.settings.get("apiKey");
    apiSecret = this.homey.settings.get("apiSecret");

    const dateToday = this.epochToDate(Date.now().toString());
    console.log(dateToday);

    var sid='';
    var eid='';
    var apiKey='';
    var apiSecret='';

    sid = this.homey.settings.get("sid");
    eid = this.homey.settings.get("eid");
    apiKey =  this.homey.settings.get("apiKey");
    apiSecret = this.homey.settings.get("apiSecret");
 
    const DeviceApi = new MyApi;
    const ApiResult = await DeviceApi.fetchData('/user/api/v2/systems/summary/' + sid , ' ', 'GET', apiKey, apiSecret);
    //DeviceApi.fetchdata()
    //.then(ApiResult => {
      try{
    console.log(ApiResult.data); // See https://apps.developer.homey.app/the-basics/devices/energy
    const total_energy=ApiResult.data.lifetime*1;
    const year_energy=ApiResult.data.year*1;
    const month_energy=ApiResult.data.month*1;
    const meter_todays_energy=ApiResult.data.today*1;

    this.setCapabilityValue("total_energy",Math.round(total_energy));
    this.setCapabilityValue("year_energy",Math.round(year_energy));
    this.setCapabilityValue("month_energy",Math.round(100*month_energy)/100);
    this.setCapabilityValue("meter_todays_energy",Math.round(100*meter_todays_energy)/100);

    console.log('Solarpanel data updated');

  }catch(error) {
    console.error('Fout bij het ophalen van data:', error);
  };
}

  async getCurrentEnergy() {
    // dit werkt nog niet
  //   console.log('Get current energy called');
  //  const dateToday = this.epochToDate(Date.now().toString());
  //  console.log(dateToday);
  //     var sid='';
  //     var eid='';
  //     var apiKey='';
  //     var apiSecret='';

  //     sid = this.homey.settings.get("sid");
  //     eid = this.homey.settings.get("eid");
  //     apiKey =  this.homey.settings.get("apiKey");
  //     apiSecret = this.homey.settings.get("apiSecret");

  //    const DeviceApi = new MyApi;
  //    const ApiResult = await DeviceApi.fetchData('/user/api/v2/systems/' + sid , 
       //'/devices/inverter/batch/energy/' + eid +'?energy_level=power&date_range=' + dateToday, 'GET', apiKey, apiSecret);
//const ApiResult = await DeviceApi.fetchData('/user/api/v2/systems/energy/' + sid, '?energy_level=hourly&date_range=2025-09-09', 'GET', apiKey, apiSecret  );

        //console.log(ApiResult);

  }
  
   
epochToDate(epoch) {
    let date = new Date(epoch*1); //* 1 for typeconversion string to number
    let year = date.getFullYear();
    let month = String(date.getMonth() + 1).padStart(2, '0'); // January is 0, so add 1
    let day = String(date.getDate()).padStart(2, '0'); // The last bit makes sure that the result is two digits
    return `${year}-${month}-${day}`;
  }

  async onAdded() {
    this.log('Solarpanel has been added');
    //this.log('Mydevice', returndata);
     }

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    this.log('Solarpanel settings where changed');

  this.log('WEB API settings were changed');
  console.log('🔧 Old settings:', oldSettings);
  console.log('🆕 New settings:', newSettings);
  console.log('🔑 Changed keys:', changedKeys);

  try {
  const messages = [];

  for (const key of changedKeys) {
    let value = newSettings[key];
    console.log('Key', key);
    console.log('Setting', value);

    if (key === 'pause_start') {
      if (isValidTimeFormat(pauseStartStr)) {
        this.homey.settings.set("pause_start", value);
            messages.push(this.homey.__("Pause_start_changed"));
      } else {
            messages.push(this.homey.__("Pause_start_incorrect"));
      }
    }

    if (key === 'pause_end') {
      if (isValidTimeFormat(pauseStartStr)) {
        this.homey.settings.set("pause_start", value);
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





    
  }

  async onRenamed(name) {
    this.log('Solarpanel was renamed');
  }

  async onDeleted() {
    this.log('Solarpanel has been deleted');
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

  if (isPaused) { console.log(`⏸️ Web polling paused between ${pauseStartStr} and ${pauseEndStr} (${currentTime})`); } 
  console.log("Paused ", isPaused);
  try {
    if (!isPaused) {
      console.log(`▶️ Web polling data at ${currentTime}`),
      await this.getTodaysEnergy();
      await this.getCurrentEnergy();
    };
  } catch (err) {
    console.warn("Web polling error:", err);
  } finally {
    pollingInterval = parseInt(this.getSetting('poll_interval'));
    console.log(`⏸️ Polling on web is running at an interval of ${pollingInterval} minutes`);
    setTimeout(() => this.pollLoop(), pollingInterval * 60 * 1000);
  }
}

async getTime() {
 
    const tz = this.homey.clock.getTimezone();
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

}