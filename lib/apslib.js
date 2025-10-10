function isValidTimeFormat(timeStr) {
  // Accepts HH:MM, where HH is 00 to 23 and MM is 00 to 59
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
  return timeRegex.test(timeStr);
}


function isPaused(pauseStartStr, pauseEndStr, pollingInterval, pause_by_flowcard, polling_on, homey) {

  console.log("Checking if polling is paused.");
  console.log(`pauseStartStr = ${pauseStartStr}, pauseEndStr = ${pauseEndStr}, pause_by_flowcard = ${pause_by_flowcard}, polling_on = ${polling_on}`);

  if (pause_by_flowcard && !polling_on) {return true};
  if (pause_by_flowcard && polling_on) {return false;}

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


  const [hour, minute] = getTime(homey).split(':').map(Number);
  const nowMinutes = hour * 60 + minute;

  const [startH, startM] = pauseStartStr.split(':').map(Number);
  const [endH, endM] = pauseEndStr.split(':').map(Number);

  const start = startH * 60 + startM;
  const end = endH * 60 + endM;

  return start < end
    ? nowMinutes >= start && nowMinutes < end
    : nowMinutes >= start || nowMinutes < end;
}


function getTime(homey) {
    const tz = homey.clock.getTimezone();
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

module.exports = { isPaused, isValidTimeFormat, getTime};