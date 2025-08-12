'use strict';

const { Device } = require('homey');
const { login, getData } = require('../../lib/apsystems');

class ZonnepanelenDevice extends Device {

  async onInit() {
    this.log('Solarpanels intializing');
    this.startPolling();
  }

  async startPolling() {
    const pollInterval = 5 * 60 * 1000; // 5 minuten
    this.pollTimer = setInterval(() => this.updateData(), pollInterval);
    await this.updateData();
  }

  async updateData() {
      // const Username = this.homey.settings.get("User_name");
      // const Password = this.homey.settings.get("Pass_word");
      const Username = "Juffermans";
      const Password = "lM67M^pfp&V5L";


      const cookie = await login(Username, Password);
      const data = await getData(cookie);

      await this.setCapabilityValue('measure_power', data.currentPower);
      await this.setCapabilityValue('meter_power.daily', data.today);
      await this.setCapabilityValue('meter_power', data.lifetime);

//     try {

//       const Username = this.homey.settings.get("User_name");
//       const Password = this.homey.settings.get("Pass_word");
// console.log('Username:', Username);
// console.log('Password:', Password);
//       const cookie = await login(Username, Password);
//       const data = await getData(cookie);

//       await this.setCapabilityValue('measure_power', data.currentPower);
//       await this.setCapabilityValue('meter_power.daily', data.today);
//       await this.setCapabilityValue('meter_power', data.lifetime);

//       this.log('Data updated:', data);
//     } catch (err) {
//       this.error('Error in retrieving datda:', err);
//     }
  }

  onDeleted() {
    if (this.pollTimer) clearInterval(this.pollTimer);
  }
}

module.exports = ZonnepanelenDevice;
