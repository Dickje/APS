'use strict';

const Homey = require('homey');
const MyApi = require('./api');
let pauseStartStr;
let pauseEndStr;
let pollingInterval=10;

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

    if (!this.hasCapability("today_energy")) {
    await this.addCapability("today_energy");
    await this.setCapabilityOptions("today_energy", {});
    }

    console.log('Solarpanel has been initialized');
    this.getTodaysEnergy(); //Once on init, then on the interval selected
    // Get polling settings
    pauseStartStr = this.homey.settings.get('pause_start') || "23:00";
    pauseEndStr = this.homey.settings.get('pause_start') || "05:00";
    pollingInterval = parseInt(this.homey.settings.get('poll_interval')) || "10"; 

    this.pollLoop(); // Get data and repeat
    }


  async getTodaysEnergy() {
    var sid='';
    var eid='';
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
     const ApiResult = await DeviceApi.fetchData('/user/api/v2/systems/summary/' + sid , '', 'GET', apiKey, apiSecret);
      
    //console.log(ApiResult.data.lifetime); // See https://apps.developer.homey.app/the-basics/devices/energy
    const total_energy=ApiResult.data.lifetime*1;
    const year_energy=ApiResult.data.year*1;
    const month_energy=ApiResult.data.month*1;
    const today_energy=ApiResult.data.today*1;

    await this.setCapabilityValue("total_energy",Math.round(total_energy));
    await this.setCapabilityValue("year_energy",Math.round(year_energy));
    await this.setCapabilityValue("month_energy",Math.round(100*month_energy)/100);
    await this.setCapabilityValue("today_energy",Math.round(100*today_energy)/100);

    console.log('Solarpanel data updated');

     }

  // async getCurrentEnergy() {
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
  //       '/devices/inverter/batch/energy/' + eid +'?energy_level=power&date_range=' + dateToday, 'GET', apiKey, apiSecret);

  //       console.log(ApiResult);

  // }
  
   
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
  if (isNaN(pollingInterval) || pollingInterval < 10) {
    console.error("poll_interval must be greater or equal to 10.");
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
  console.log("Paused ", isPaused);
  try {
    if (!isPaused) {
      console.log(`▶️ Polling data at ${currentTime}`),
      await this.getTodaysEnergy()
    };
  } catch (err) {
    console.warn("Polling error:", err);
  } finally {
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

function isValidTimeFormat(timeStr) {
  // Accepteert HH:MM, waarbij HH van 00 t/m 23 en MM van 00 t/m 59
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
  return timeRegex.test(timeStr);
}
