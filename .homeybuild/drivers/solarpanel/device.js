'use strict';

const { Device } = require('homey');
const { login, getData } = require('../../lib/apsystems');

class ZonnepanelenDevice extends Device {

  async onInit() {
    this.log('Zonnepanelen device gestart');
    this.startPolling();
  }

  async startPolling() {
    const pollInterval = 5 * 60 * 1000; // 5 minuten
    this.pollTimer = setInterval(() => this.updateData(), pollInterval);
    await this.updateData();
  }

  async updateData() {
    try {
      // const username = this.getSetting('username');
      // const password = this.getSetting('password');
      const username = "Juffermans";
      const password = "lM67M^pfp&V5L"

      const cookie = await login(username, password);
      const data = await getData(cookie);

      await this.setCapabilityValue('measure_power', data.currentPower);
      await this.setCapabilityValue('meter_power.daily', data.today);
      await this.setCapabilityValue('meter_power', data.lifetime);

      this.log('Gegevens bijgewerkt:', data);
    } catch (err) {
      this.error('Fout bij ophalen zonnepanelen data:', err);
    }
  }

  onDeleted() {
    if (this.pollTimer) clearInterval(this.pollTimer);
  }
}

module.exports = ZonnepanelenDevice;
