'use strict';

const Homey = require('homey');
const MyApi = require('./api');
//const { isValidTimeFormat } = require('../../lib/apslib');
const { setCapabilities } = require('../../lib/setWebAPIcapabilities');
const { isValidTimeFormat, getTime, isPaused } = require('../../lib/apslib');
let pauseStartStr;
let pauseEndStr;
let pollingInterval=15;
let pause_by_flowcard = false;
let polling_on = true;
let measure_polling = 1;

module.exports = class MyWebApi extends Homey.Device {



  /**
   * onInit is called when the device is initialized.
   */
  async onInit() {
    try {
    console.log('Initializing solarpanel');

    await setCapabilities.call(this)

    const settings = this.getSettings();
    console.log('Alle settings voor WEB:', settings);

    
    console.log('Solarpanel has been initialized');
    // Get polling settings (normalize: trim, fallback when empty)
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
      pollingInterval = Number.isInteger(pi) ? pi : 15;
    }
    { 
      pause_by_flowcard = this.getSetting('pause_by_flowcard');
    }

    this.homey.flow.getActionCard('polling_pause_panel').registerRunListener(async (args, state) => {
    console.log('Flowcard polling_pause_panel triggered');
    polling_on = false;});

    this.homey.flow.getActionCard('polling_start_panel').registerRunListener(async (args, state) => {
    console.log('Flowcard polling_start_panel triggered');
    polling_on = true;});

    this.homey.flow.getTriggerCard('API_call_rejected').registerRunListener(async (args, state) => {
    console.log('Flowcard API_call_rejected triggered');});
    
    measure_polling = await this.getStoreValue('measure_polling');
    if (measure_polling === undefined){
      measure_polling = 1;
    }

    //Checks the time every 5 minutes and calls pollingCounterReset
    setInterval(() => {this.pollingCounterReset(); }, 5 * 60 * 1000);

    this.pollLoop(); // Get data and repeat
  }catch(error){
   console.log("Error initializing device", error);
 }

    }

  async getTodaysEnergy() {
    console.log('Get todays energy called');
    const API_error = this.homey.flow.getTriggerCard('API_call_rejected')

    try{
    var sid=''; // System ID
    var apiKey='';
    var apiSecret='';

    sid = this.homey.settings.get("sid");
    apiKey =  this.homey.settings.get("apiKey");
    apiSecret = this.homey.settings.get("apiSecret");

    const dateToday = this.epochToDate(Date.now().toString());

    console.log(dateToday);

    const DeviceApi = new MyApi;
    const ApiResult = await DeviceApi.fetchData('/user/api/v2/systems/summary/' + sid , ' ', 'GET', apiKey, apiSecret);
     
    const total_energy = ApiResult.data.lifetime*1;
    const year_energy = ApiResult.data.year*1;
    const month_energy = ApiResult.data.month*1;
    const meter_todays_energy = ApiResult.data.today*1;
    measure_polling = await this.getStoreValue('measure_polling');

    console.log('Total energy',total_energy);
    console.log('Year energy', year_energy);
    console.log('Month energy', month_energy);
    console.log('Todays energy', meter_todays_energy);
    console.log('Measure polling', measure_polling);

    this.setCapabilityValue("total_energy",Math.round(total_energy));
    this.setCapabilityValue("year_energy",Math.round(year_energy));
    this.setCapabilityValue("month_energy",Math.round(100*month_energy)/100);
    this.setCapabilityValue("meter_todays_energy",Math.round(100*meter_todays_energy)/100);
    this.setCapabilityValue("measure_polling", measure_polling);
    console.log('Solarpanel data updated');
        
  }catch(error) {
    console.log('Error fetching todays energy:', error.message);
    const errorData = JSON.parse(error.message);
    console.log(errorData.message); // "API call rejected"
    console.log(errorData.code);    // 2005
    console.log(errorData.details); // response data

    if (errorData.message === 'API call rejected' ){
     const errorMessage = this.homey.__('API call rejected');
    API_error.trigger({'API_return_code': errorData.code, 'API_return_message': errorMessage});
    }
  };
}
 
   
epochToDate(epoch) {
  try {
    let date = new Date(epoch*1); //* 1 for typeconversion string to number
    let year = date.getFullYear();
    let month = String(date.getMonth() + 1).padStart(2, '0'); // January is 0, so add 1
    let day = String(date.getDate()).padStart(2, '0'); // The last bit makes sure that the result is two digits
    return `${year}-${month}-${day}`;
  } catch (error){
    console.log('Error in epochToDate ', error);
    return
  }
}

  async onAdded() {
    this.log('Solarpanel has been added');
    //this.log('Mydevice', returndata);
     }

  async onSettings({ oldSettings, newSettings, changedKeys }) {
  console.log('Solarpanel settings where changed');
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
         await this.pollLoop(); // Restart polling with new interval
       } else {
            messages.push(this.homey.__("Polling_interval_incorrect"));
       }
    }
  }

  const [endHour, endMinute] = pauseEndStr.split(':').map(Number);
  const [startHour, startMinute] = pauseStartStr.split(':').map(Number);
  let pollingWindow = (endHour * 60 + endMinute) - (startHour * 60 + startMinute);
    if (pollingWindow < 0) {
    pollingWindow = pollingWindow + 24 * 60; 
  }
  
  console.log(pauseEndStr, pauseStartStr);
  console.log('pollingWindow (minutes): ' , pollingWindow);
  const pollingperday = pollingWindow / pollingInterval
  console.log('pollingperday: ', pollingperday);
  if (pollingperday*30 > 1000) {
    messages.push(this.homey.__("polling_too_much"));

      //this.setWarning(this.homey.__('steamerError')).catch(this.error);
      // zie: https://github.com/athombv/eu.huum/blob/d36061bd219cecd88019c4e9f507f1efc7061a67/lib/HuumDevice.js#L148
      //zie ook: https://apps-sdk-v3.developer.homey.app/Device.html#setWarning

      this.setWarning(this.homey.__('polling_too_much')); //Must be unset also

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

  try {
    pause_by_flowcard = this.getSetting('pause_by_flowcard');
    if (!isPaused( pauseStartStr, pauseEndStr, pollingInterval, pause_by_flowcard, polling_on, this.homey)) {
      console.log(`⏸️ Web polling paused between ${pauseStartStr} and ${pauseEndStr}.`);
      await Promise.all([
        console.log('Polling active, getting data from web API'),
        await this.getTodaysEnergy(),
        measure_polling = measure_polling + 1,
        await this.setStoreValue('measure_polling', measure_polling)
      ]);
    }
  } catch (err) {
    console.warn("Polling error:", err);
  } finally {
    pollingInterval = parseInt(this.getSetting('poll_interval'));
    console.log(`⏸️ Polling on web is running at an interval of ${pollingInterval} minutes`);
    setTimeout(() => this.pollLoop(), pollingInterval * 60 * 1000);
  }
} catch (err) {
    console.log(`❌ Error in pollLoop: ${err.message}`);
  }
};

async pollingCounterReset() {
    try {
      const firstDay = await this.isFirstDay();
      if (firstDay) {
        console.log("It's the first day of the month, resetting polling counter.");
        measure_polling = 0;
        await this.setStoreValue('measure_polling', measure_polling);
        await this.pollLoop();
      }
    } catch (error) {
      console.error("Error in pollingCounterReset:", error);
    }
  }

async isFirstDay() {
 
    const tz = this.homey.clock.getTimezone();
    console.log(`The timezone is ${tz}`);

    // Define a function to get the time in a specific timezone
    const formatter = new Intl.DateTimeFormat([], {
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false, // Use 24-hour format
      timeZone: tz,
    });
    const timeParts = formatter.formatToParts(new Date());
    const day = timeParts.find(part => part.type === 'day').value;
    const hour = timeParts.find(part => part.type === 'hour').value;
    const minute = timeParts.find(part => part.type === 'minute').value;

if (day === '01' && hour === '15' && minute < '15') {
  return true;
} else {
  return false;
}
  }

}