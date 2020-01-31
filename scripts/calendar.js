// Refactored Faerun Calendar based on Kirsty's Calendar (https://app.roll20.net/users/1165285/kirsty)

// API Commands:
// !fc - for the GM displays the menu in the chat window, for a player displays date, weather, moon(s) and down days

var tbdCalendar = tbdCalendar || ( function() 
{
  'use strict';
  
  const minutesPerDay = 1440;
  const redColor = '#7E2D40';

  // Create a new tbd date object
  var createDate = function() 
  {
    return {
      // Store the date in number of minutes since 1 Hammer of year 1
      value: 0,
      weather: undefined, // "It is a cool but sunny day."
      // Store the value for the first date at which a Long Rest is possible
      nextRest: 0 };
  };

  // Write contents of source date to destination date
  // source and destination are objects constructed by createDate
  var copyDate = function( source, destination )
  {
    destination.value = source.value;
    destination.weather = source.weather;
    destination.nextRest = source.nextRest;
  };

  // Return a copy of the current stored date
  var currentDate = function()
  {
    var date = createDate();
    if ( state.tbdCalendar !== undefined && state.tbdCalendar.date !== undefined ) {
      copyDate( state.tbdCalendar.date, date );
    }
    return date;
  };

  // Write the date to sandbox state
  // date is an object constructed by createDate
  var storeDate = function( date )
  {
    if ( state.tbdCalendar === undefined ) {
      state.tbdCalendar = {};
    }
    state.tbdCalendar.date = createDate();
    copyDate( date, state.tbdCalendar.date );
  };

  // Create a new tbd effect object
  // description is a user readable string
  // expiration is a date value
  var createEffect = function( description, expiration )
  {
    return {
      description: description,
      expiration: expiration };
  };

  // Write contents of source date to destination date
  // source and destination are objects constructed by createDate
  var copyEffect = function( source, destination )
  {
    destination.description = source.description;
    destination.expiration = source.expiration;
  };

  // Return a copy of the current stored effects array
  // If no effects are stored, return an empty array
  var currentEffects = function()
  {
    const effects = state.tbdCalendar !== undefined && state.tbdCalendar.effects instanceof Array
      ? state.tbdCalendar.effects
      : [];
    // Deep copy the effects array
    return effects.map( effect => createEffect( effect.description, effect.expiration ) );
  };

  // Deep copy effects array into state.tbdCalendar.effects
  var storeEffects = function( effects )
  {
    if ( state.tbdCalendar === undefined ) {
      state.tbdCalendar = {};
    }
    state.tbdCalendar.effects = effects.map( effect => createEffect( effect.description, effect.expiration ) );
  };

  // Return the duration of each Faerun month / festival for the specified year
  // year is an integer value
  var monthsAndFestivalsForYear = function( year )
  {
    return [
      { name: 'Hammer', duration: 30 },
      { name: 'Midwinter', duration: 1 }, // festival,
      { name: 'Alturiak', duration: 30 },
      { name: 'Ches', duration: 30 },
      { name: 'Tarsakh', duration: 30 },
      { name: 'Greengrass', duration: 1 }, // festival
      { name: 'Mirtul', duration: 30 },
      { name: 'Kythorn', duration: 30 },
      { name: 'Flamerule', duration: 30 },
      { name: 'Midsummer', duration: 1 }, // festival
      { name: 'Shieldmeet', duration: year % 4 == 0 ? 1 : 0 }, // festival, leap year only
      { name: 'Eleasias', duration: 30 },
      { name: 'Eleint', duration: 30 },
      { name: 'Highharvestide', duration: 1 }, // festival
      { name: 'Marpenoth', duration: 30 },
      { name: 'Uktar', duration: 30 },
      { name: 'Feast of the Moon', duration: 1 }, // festival
      { name: 'Nightal', duration: 30 } ];
  }

  // Return the year of the date and the numbered day of the year 0 - 365
  // date is an object constructed by createDate
  var yearAndDayFromDate = function( date )
  {
    const days = Math.floor( date.value / minutesPerDay );
    // 365 x 3 + 366 days every 4 years
    const daysPerFourYears = 365 * 3 + 366;
    const fourYearPeriods = Math.floor( days / daysPerFourYears );
    const carryOverYears = Math.min( Math.floor( ( days - daysPerFourYears * fourYearPeriods ) / 365 ), 3 );
    return {
      year: 4 * fourYearPeriods + carryOverYears + 1,
      day: days - daysPerFourYears * fourYearPeriods - 365 * carryOverYears,
      daysInYear: carryOverYears == 0 ? 366 : 365 };
  };

  // Return a date value in minutes since 1/1/1
  // Pass a readableDate returned and possibly modified from interpretDate
  var encodeDateValue = function( readableDate )
  {
    const sterileYear = Math.floor( readableDate.year );
    const sterileDay = Math.floor( readableDate.day );
    const sterileHours = Math.floor( readableDate.hours );
    const sterileMinutes = Math.floor( readableDate.minutes );
    // Initialize value with time for the years value. Add in days for leap years
    const elapsedYears = sterileYear - 1;
    var value = minutesPerDay * ( 365 * elapsedYears + Math.floor( elapsedYears / 4 ) );
    var notFoundMonth = true;
    monthsAndFestivalsForYear( sterileYear ).forEach(
      function( entry )
      {
        if ( notFoundMonth ) {
          if ( entry.name !== readableDate.month ) {
            value += minutesPerDay * entry.duration;
          } else {
            if ( entry.duration > 0 ) {
              // readableDay.day starts at 1 -- subtract the 1
              value += minutesPerDay * ( Math.min( Math.max( 0, sterileDay ), entry.duration ) - 1 );
            }
            notFoundMonth = false;
          }
        }
      } );
    // Accumulate time in current day
    value += Math.min( 23, Math.max( 0, sterileHours ) ) * 60 + Math.min( 59, Math.max( 0, sterileMinutes ) );
    return value;
  };

  // Return human readable values describing the date
  var interpretDate = function( date )
  {
    const yearAndDay = yearAndDayFromDate( date );
    // Track a value to be decremented in a loop over months
    var dayOffset = yearAndDay.day;
    var month = '';
    var dayOfMonth = 0;
    var festival = false;
    monthsAndFestivalsForYear( yearAndDay.year ).forEach(
      function( entry )
      {
        if ( dayOffset >= 0 ) {
          month = entry.name;
          // Start counting days at 1
          dayOfMonth = dayOffset + 1;
          festival = ( entry.duration == 1 );
        }
        dayOffset -= entry.duration;
      } );
    const timeInMinutes = Math.floor( date.value % minutesPerDay );
    return {
      year: yearAndDay.year,
      month: month,
      day: dayOfMonth,
      festival: festival,
      hours: Math.floor( timeInMinutes / 60 ),
      minutes: Math.floor( timeInMinutes % 60 ) };
  };

  var makeDiv = function( style, content )
  {
    return '<div ' + style + ' >' + content + '</div>';
  };

  // day is an integer returned as interpretDate().day 
  var daySuffix = function( day )
  {
    if ( Math.floor( day / 10 ) != 1 ) {
      // These aren't used in the teens!
      if ( day % 10 == 1 ) {
        return 'st';
      } else if ( day % 10 == 2 ) {
        return 'nd';
      } else if ( day % 10 == 3 ) {
        return 'rd';
      }
    }
    return 'th';
  };

  var humanTimeString = function( hours, minutes )
  {
    minutes = Math.floor( minutes );
    if ( minutes == 0 ) {
      return hours + ':00';
    } else if ( minutes < 10 ) {
      return hours + ':0' + minutes;
    } else {
      return hours + ':' + minutes;
    }
  };

  var humanStrings = function( date )
  {
    const piecewiseDate = interpretDate( date );
    const dateDay = piecewiseDate.festival
      ? 'Festival'
      : piecewiseDate.day + daySuffix( piecewiseDate.day );
    return {
      date: piecewiseDate.month + ' ' + dateDay + ', ' + piecewiseDate.year,
      time: humanTimeString( piecewiseDate.hours, piecewiseDate.minutes ) };
  };

  // Return the state of the moon and supporting data
  var moonState = function( date )
  {
    // Assume moon orbits Faerun 48 times over four years
    // 365 x 3 + 366 days every 4 years
    const daysPerMoonOrbit = ( 365 * 3 + 366 ) / 48;
    const rawDays = date.value / minutesPerDay;
    // orbitFraction is a value between 0 and 1
    const orbitFraction = rawDays / daysPerMoonOrbit - Math.floor( rawDays / daysPerMoonOrbit );
    const moonData = [
      { description: 'Full', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/78/Twemoji_1f315.svg/512px-Twemoji_1f315.svg.png' },
      { description: 'Waning Gibbous', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/de/Twemoji_1f316.svg/512px-Twemoji_1f316.svg.png' },
      { description: 'Waning Gibbous', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/de/Twemoji_1f316.svg/512px-Twemoji_1f316.svg.png' },
      { description: 'Waning Gibbous', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/de/Twemoji_1f316.svg/512px-Twemoji_1f316.svg.png' },
      { description: 'Last Quarter', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/67/Twemoji_1f317.svg/512px-Twemoji_1f317.svg.png' },
      { description: 'Waning Crescent', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/96/Twemoji_1f318.svg/512px-Twemoji_1f318.svg.png' },
      { description: 'Waning Crescent', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/96/Twemoji_1f318.svg/512px-Twemoji_1f318.svg.png' },
      { description: 'Waning Crescent', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/96/Twemoji_1f318.svg/512px-Twemoji_1f318.svg.png' },
      { description: 'New', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Twemoji_1f311.svg/512px-Twemoji_1f311.svg.png' },
      { description: 'Waxing Crescent', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Twemoji_1f312.svg/512px-Twemoji_1f312.svg.png' },
      { description: 'Waxing Crescent', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Twemoji_1f312.svg/512px-Twemoji_1f312.svg.png' },
      { description: 'Waxing Crescent', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Twemoji_1f312.svg/512px-Twemoji_1f312.svg.png' },
      { description: 'First Quarter', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/40/Twemoji_1f313.svg/512px-Twemoji_1f313.svg.png' },
      { description: 'Waxing Gibbous', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1c/Twemoji_1f314.svg/512px-Twemoji_1f314.svg.png' },
      { description: 'Waxing Gibbous', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1c/Twemoji_1f314.svg/512px-Twemoji_1f314.svg.png' },
      { description: 'Waxing Gibbous', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1c/Twemoji_1f314.svg/512px-Twemoji_1f314.svg.png' } ];
    const currentMoon = moonData[ Math.floor( orbitFraction * ( moonData.length - 1 ) + 0.5 ) ];
    currentMoon.daysTilFull = Math.ceil( daysPerMoonOrbit * ( 1.0 - orbitFraction ) );
    return currentMoon;
  };

  // Return an array index to use for weather predictions
  // 70% chance => 0, 15% chance => 1, 15% chance => 2
  var weatherRollIndex = function()
  {
    const roll = Math.floor( 20 * Math.random() + 1 );
    return roll < 15 ? 0 : ( roll < 18 ? 1 : 2 );
  };

  // Return the weather for the provided date
  var forecastWeather = function( date )
  {
    const yearAndDay = yearAndDayFromDate( date );
    const season = yearAndDay.day > 75 && yearAndDay.day < 350
      // Spring, Summer, or Fall
      ? ( yearAndDay.day < 166 ? 1 : ( yearAndDay.day < 257 ? 2 : 3 ) )
      // Winter
      : 0;
    const winterTemperatures = [ 'It is a cold winter day.', 'It is a bitterly cold winter day.', 'It is a warm winter day.' ];
    const springTemperatures = [ 'It is a mild spring day.', 'It is a cold spring day.', 'It is a hot spring day.' ];
    const summerTemperatures = [ 'It is a hot summer day.', 'It is a cool summer day.', 'It is a blisteringly hot summer day.' ];
    const fallTemperatures = [ 'It is a mild fall day.', 'It is a cold fall day.', 'It is a hot fall day.' ];
    const temperatures = [ winterTemperatures, springTemperatures, summerTemperatures, fallTemperatures ];
    const windLevels = [ 'The air is still, and ', 'There is a light breeze, and ', 'There is a howling wind, and ' ];
    const winterPrecipitation = [ 'the sky is overcast.', 'snow falls softly on the ground.', 'snow falls thick and fast from the sky.' ];
    const otherPrecipitation = [ 'the sky is clear.', 'a light rain falls from the sky.', 'a torrential rain begins to fall.' ];
    const precipitation = [ winterPrecipitation, otherPrecipitation, otherPrecipitation, otherPrecipitation ];
    const temperatureIndex = weatherRollIndex();
    const windIndex = weatherRollIndex();
    const precipitationIndex = weatherRollIndex();
    return temperatures[ season ][ temperatureIndex ] + ' ' + windLevels[ windIndex ] + precipitation[ season ][ precipitationIndex ];
  };

  // Return an html entry describing the moon state for a particular date
  var moonEntry = function( date )
  {
    const currentMoon = moonState( date );
    return '<table>'
      + '<tr><td>' + currentMoon.description + ' Moon </td>'
      + '<td><img src="' + currentMoon.image + '" style="width:30px;height:30px;"></td></tr>'
      + '<tr><td colspan="2">Days until full moon: '+ currentMoon.daysTilFull + '</td></tr>'
      + '</table>';
  };

  var showCalendar = function( message )
  {
    const current = currentDate();
    const divStyle = 'style="width: 189px; border: 1px solid black; background-color: #ffffff; padding: 5px;"'
    const tableStyle = 'style="text-align:center;"';
    const arrowStyle = 'style="border: none; border-top: 3px solid transparent; border-bottom: 3px solid transparent; border-left: 195px solid ' + redColor + '; margin-bottom: 2px; margin-top: 2px;"';
    const headStyle = 'style="color: ' + redColor + '; font-size: 18px; text-align: left; font-variant: small-caps; font-family: Times, serif;"';
    const subStyle = 'style="font-size: 11px; line-height: 13px; margin-top: -3px; font-style: italic;"';
    const readableStrings = humanStrings( current );

    sendChat( 
      'the 8-ball', 
      makeDiv( 
        divStyle,
        makeDiv( headStyle, 'Calendar' ) 
          + makeDiv( subStyle, startDateMessage( current ) )
          + makeDiv( arrowStyle, '' ) 
          + readableStrings.date
          + '<br>The time is: ' + readableStrings.time 
          + '<br>Next Long Rest: ' + longRestAvailability( current )
          + '<br>' + moonEntry( current )
          + '<br>' + current.weather ) );
  };

  // Return a string describing availability of once per day long rest
  var longRestAvailability = function( date )
  {
    if ( date.value >= date.nextRest ) {
      return 'Available';
    } else {
      const timeInMinutes = Math.floor( date.nextRest % minutesPerDay );
      return humanTimeString( Math.floor( timeInMinutes / 60 ), Math.floor( timeInMinutes % 60 ) );
    }
  };

  var monthComboBoxForYear = function( year )
  {
    var optionsString = 'Month?';
    monthsAndFestivalsForYear( year ).forEach(
      function( entry )
      {
        if ( entry.duration > 0 ) {
          optionsString = optionsString + '|' + entry.name;
        }
      } );
    return '?{' + optionsString + '}';
  };

  var startDateMessage = function( date )
  {
    return 'Since Hammer 1st, 1486';
  };

  var showCalendarInterface = function( message )
  {
    const current = currentDate();
    const divStyle = 'style="width: 189px; border: 1px solid black; background-color: #ffffff; padding: 5px;"'
    const tableStyle = 'style="text-align:center;"';
    const arrowStyle = 'style="border: none; border-top: 3px solid transparent; border-bottom: 3px solid transparent; border-left: 195px solid ' + redColor + '; margin-bottom: 2px; margin-top: 2px;"';
    const headStyle = 'style="color: ' + redColor + '; font-size: 18px; text-align: left; font-variant: small-caps; font-family: Times, serif;"';
    const subStyle = 'style="font-size: 11px; line-height: 13px; margin-top: -3px; font-style: italic;"';
    const anchorStyle1 = 'style="text-align:center; border: 1px solid black; margin: 1px; padding: 2px; background-color: ' + redColor + '; border-radius: 4px;  box-shadow: 1px 1px 1px #707070; width: 100px;';
    const anchorStyle2 = 'style="text-align:center; border: 1px solid black; margin: 1px; padding: 2px; background-color: ' + redColor + '; border-radius: 4px;  box-shadow: 1px 1px 1px #707070; width: 150px;';
    const readableDate = interpretDate( current );
    const timeString = humanTimeString( readableDate.hours, readableDate.minutes );
    const menu = makeDiv(
      divStyle,
      makeDiv( headStyle, 'Calendar' )
        + makeDiv( subStyle, startDateMessage( current ) )
        + makeDiv( arrowStyle, '' )
        + '<table>'
        + '<tr><td>Day: </td><td><a ' + anchorStyle1 + '" href="!fcday,?{Day?|' + readableDate.day + '}">' + readableDate.day + '</a></td></tr>'
        + '<tr><td>Month: </td><td><a ' + anchorStyle1 + '" href="!fcmonth,' + monthComboBoxForYear( readableDate.year ) + '">' + readableDate.month + '</a></td></tr>'
        + '<tr><td>Year: </td><td><a ' + anchorStyle1 + '" href="!fcyear,?{Year?|' + readableDate.year + '}">' + readableDate.year + '</a></td></tr>'
        + '<tr><td>Time: </td><td><a ' + anchorStyle1 + '" href="!fctime,?{Time?|' + timeString + '}">' + timeString + '</a></td></tr>'
        + '<tr><td>Next Long Rest: </td><td>' + longRestAvailability( current ) + '</td></tr>'
        + '</table>'
        + makeDiv( arrowStyle, '' )
        + moonEntry( current )
        + '<br>' + current.weather 
        + makeDiv( arrowStyle, '' )
        + makeDiv( tableStyle, '<a ' + anchorStyle2 + '" href="!fcrest">Long Rest Finished</a>' )
        + makeDiv( tableStyle, '<a ' + anchorStyle2 + '" href="!fcadd10minutes">Add 10 minutes</a>' )
        + makeDiv( tableStyle, '<a ' + anchorStyle2 + '" href="!fcaddhour">Add an hour</a>' )
        + makeDiv( tableStyle, '<a ' + anchorStyle2 + '" href="!fcshare">Share Calendar</a>' ) );
    sendChat( 'the 8-ball', '/w gm ' + menu );
  };

  var setDay = function( dayString )
  {
    const current = currentDate();
    const readableDate = interpretDate( current );
    readableDate.day = Number( dayString );
    current.value = encodeDateValue( readableDate );
    current.weather = forecastWeather( current );
    storeDate( current );
  };

  var setMonth = function( monthString )
  {
    const current = currentDate();
    const readableDate = interpretDate( current );
    readableDate.month = monthString;
    current.value = encodeDateValue( readableDate );
    current.weather = forecastWeather( current );
    storeDate( current );
  };

  var setRestFinish = function()
  {
    const current = currentDate();
    // Long rests require 8 hours.
    // A successive long rest can begin 16 hours after the end of the prior rest
    current.nextRest = 16 * 60 + current.value;
    storeDate( current );
  }

  var addTime = function( minutes )
  {
    const current = currentDate();
    const originalMinutesInDay = current.value % minutesPerDay;
    current.value += minutes;
    if ( originalMinutesInDay + minutes >= minutesPerDay ) {
      // Day flips to a new. Update weather
      current.weather = forecastWeather( current );
    }
    storeDate( current );
  };

  var setTime = function( timeString )
  {
    const current = currentDate();
    const readableDate = interpretDate( current );
    const timeValues = timeString.split( ':' );
    if ( timeValues.length == 2 ) {
      readableDate.hours = Number( timeValues[ 0 ] );
      readableDate.minutes = Number( timeValues[ 1 ] );
      current.value = encodeDateValue( readableDate );
      storeDate( current );
    }
  };

  var setYear = function( yearString )
  {
    const current = currentDate();
    const readableDate = interpretDate( current );
    readableDate.year = Number( yearString );
    current.value = encodeDateValue( readableDate );
    current.weather = forecastWeather( current );
    storeDate( current );
  };

  var handleChatMessage = function( message )
  {
    if ( message.type === 'api' ) {
      var tokens = message.content.split( ',' );
      var command = tokens[ 0 ];
      if ( playerIsGM( message.playerid ) ) {
        if ( command === '!fc' ) {
          showCalendarInterface( message );
        } else if ( command === '!fcshare' ) {
          showCalendar( message );
        } else if ( command === '!fcadd10minutes' ) {
          addTime( 10 );
          showCalendarInterface( message );
        } else if ( command === '!fcaddhour' ) {
          addTime( 60 );
          showCalendarInterface( message );
        } else if ( command === '!fcmonth' && tokens.length > 1 ) {
          setMonth( tokens[ 1 ] );
          showCalendarInterface( message );
        } else if ( command === '!fcday' && tokens.length > 1 ) {
          setDay( tokens[ 1 ] );
          showCalendarInterface( message );
        } else if ( command === '!fcrest' ) {
          setRestFinish();
          showCalendarInterface( message );
        } else if ( command === '!fctime' && tokens.length > 1 ) {
          setTime( tokens[ 1 ] );
          showCalendarInterface( message );
        } else if ( command === '!fcyear' && tokens.length > 1 ) {
          setYear( tokens[ 1 ] );
          showCalendarInterface( message );
        }
      } else if ( command === '!fc' ) {
        showCalendar( message );
      }
    } else {
      // ignore
    }		
  };

  var registerEventHandlers = function()
  {
    // Check for old calendar state
    if ( state.tbdCalendar !== undefined && state.tbdCalendar.date === undefined ) {
      const oldDate = state.tbdCalendar;
      state.tbdCalendar = undefined;
      state.tbdCalendar = { date: oldDate };
    }

    on( 'chat:message', handleChatMessage );
    log( 'There be dragons! Calendar initialized.' );
  };

  var runTests = function()
  {
    const current = currentDate();
    for ( var i = 0; i < 10; i++ ) {
      const readable = humanStrings( current );
      const currentMoon = moonState( current );
      log( readable.date + ' @ ' + readable.time + ', Moon: ' + currentMoon.description + ' Days til full: ' + currentMoon.daysTilFull );
      current.value += 1440;
    }
  };

  return {
    runTests: runTests,
    registerEventHandlers: registerEventHandlers };
}() );

on( 
  "ready",
  function()
  {
  	'use strict';
    tbdCalendar.registerEventHandlers();
  } );
