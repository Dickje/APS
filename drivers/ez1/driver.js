'use strict';

const Homey = require('homey');
const EZ1_connector = require('./ez1_connector');

module.exports = class EZ1driver extends Homey.Driver {

  async onInit() {
    this.log('EZ1driver has been initialized');
  }

  async onPair(session) {

    // 1) IP-adres invoeren tijdens pairing
    session.setHandler('keys_entered', async data => {
      const { EZ1_address } = data || {};

      if (!EZ1_address || typeof EZ1_address !== 'string') {
        this.log('❌ No valid EZ1 IP address entered');
        throw new Error('No valid IP address entered');
      }

      this.log('✅ EZ1 IP address received:', EZ1_address);
      // Niet in app settings bewaren, maar alleen in deze pair-sessie gebruiken
      session.EZ1_address = EZ1_address;
    });

    // 2) Device-lijst teruggeven aan Homey
    session.setHandler('list_devices', async () => {
      try {
        const EZ1_address =
          session.EZ1_address ||
          this.homey.settings.get('EZ1_address'); // fallback als je het toch app-breed wilt houden

        if (!EZ1_address) {
          this.log('❌ No EZ1 IP address available for list_devices');
          return [];
        }

        this.log('🔌 Connecting to EZ1 at', EZ1_address);

        const EZ1_connection = new EZ1_connector();
        const EZ1_command = 'getDeviceInfo';

        const { json: response } = await EZ1_connection.fetchData(
          EZ1_address,
          EZ1_command
        );

        const payload = response?.data || response || {};
        const EZ1_ID =
          response?.deviceId ||
          payload.deviceId ||
          payload.DeviceID ||
          'EZ1-unknown';

        const success = (response?.message || payload?.message) === 'SUCCESS';

        this.log('📡 DeviceID:', EZ1_ID);
        this.log('   DeviceVersion:', payload.devVer);
        this.log('   SSID:', payload.ssid);
        this.log('   ipAddr:', payload.ipAddr || EZ1_address);
        this.log('   minPower:', payload.minPower);
        this.log('   maxPower:', payload.maxPower);

        if (!success) {
          this.log('❌ EZ1 did not respond with SUCCESS');
          return [];
        }

        this.log('✅ EZ1 detected:', EZ1_ID);

        const device = {
          name: 'APsystems EZ1',
          data: {
            id: EZ1_ID, // standaard key 'id' is het veiligst
          },
          store: {
            deviceID: EZ1_ID,
            devVer: payload.devVer,
            ssid: payload.ssid,
            ipAddr: payload.ipAddr || EZ1_address,
            minDevicePower: payload.minPower,
            maxDevicePower: payload.maxPower,
          },
        };

        this.log('📦 Device definition:', device, '\n');
        return [device];

      } catch (err) {
        this.log('❌ Error retrieving EZ1 device info:', err.message);
        return [];
      }
    });
  }
};
