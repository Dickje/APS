// For testing purposes, return mock data instead of making an actual HTTP request
async function mockup_data(onOffStatus) {
  
    const returnDeviceData =
    {
    "data":{
    "deviceId":"E07000000001",
    "devVer":"EZ11.0.0",
    "ssid":"ssidName",
    "ipAddr":"192.168.1.2",
    "minPower":"30",
    "maxPower":"800"
    },
    "message":"SUCCESS",
    "deviceId":"E07000000001"
    };

    const returnDataOutput =
    {
    "data":{
    "p1":10,
    "e1":20,
    "te1":300,
    "p2":15,
    "e2":25,
    "te2":500,
    },
    "message":"SUCCESS",
    "deviceId":"E07000000001"
    };

    const returnPeakPower = 
    {
    "data": {
    "maxPower": "400"
    },
    "message": "SUCCESS",
    "deviceId":"E07000000001"
    }

    const returnAlarmData =
    {
    "data":{
    "og":"0",
    "isce1":"1",
    "isce2":"0",
    "oe":"1",
    },
    "message":"SUCCESS",
    "deviceId":"E07000000001"
    }

    const On_Off_data =
    {
    "data": {
    "status": "0"
    },
    "message": "SUCCESS",
    "deviceId":"E07000000001"
    }
    return { returnDeviceData, returnDataOutput, returnPeakPower, returnAlarmData, On_Off_data };


}

module.exports = { mockup_data };
