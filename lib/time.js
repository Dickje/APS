const Homey = require('homey');


function isValidTimeFormat(timeStr) {
  // Accepteert HH:MM, waarbij HH van 00 t/m 23 en MM van 00 t/m 59
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
  return timeRegex.test(timeStr);
}

function getTime() {
  const now = new Date();
  const hour = String(now.getHours()).padStart(2, '0');
  const minute = String(now.getMinutes()).padStart(2, '0');
  return `${hour}:${minute}`;
}

// function getTime() {
 
//     const tz = this.homey.clock.getTimezone();

//     // Define a function to get the time in a specific timezone
//     const formatter = new Intl.DateTimeFormat([], {
//       hour: '2-digit',
//       minute: '2-digit',
//       hour12: false, // Use 24-hour format
//       timeZone: tz,
//     });
//     const timeParts = formatter.formatToParts(new Date());
//     const hour = timeParts.find(part => part.type === 'hour').value;
//     const minute = timeParts.find(part => part.type === 'minute').value;

//     console.log(`The time is ${hour}:${minute}`);
//     return `${hour}:${minute}`;
//   }





module.exports = { isValidTimeFormat, getTime };
