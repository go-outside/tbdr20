
// Assigns 'turnorder' based on taking 10 for initiative and arranging from greatest to least

var tbdCombat = tbdCombat || ( function() 
{
  'use strict';
  const blueColor = '#2D407E';

  const Roll20 = {};
  Roll20.AbilityScores = {
    CHARISMA : 'charisma',
    CONSTITUTION : 'constitution',
    DEXTERITY : 'dexterity',
    INTELLIGENCE : 'intelligence',
    STRENGTH : 'strength',
    WISDOM : 'wisdom'
  };
  Roll20.Messages = {
    API : 'api'
  };
  Roll20.Objects = {
    CAMPAIGN : 'campaign',
    CHARACTER : 'character',
    GRAPHIC : 'graphic',
    MACRO : 'macro',
    NAME : 'name',
    PATH : 'path',
    PLAYER : 'player',
    STATUS : 'status_',
    TEXT : 'text',
    TOKEN : 'token ',
    TURN_ORDER : 'turnorder'
  };
  Roll20.Verbs = {
    REPRESENTS : 'represents'
  };
  Roll20.StatusMarkers = [
    'red', 
    'blue', 
    'green', 
    'brown', 
    'purple', 
    'pink', 
    'yellow', 
    'dead', 
    'skull', 
    'sleepy', 
    'half-heart', 
    'half-haze', 
    'interdiction', 
    'snail', 
    'lightning-helix', 
    'spanner', 
    'chained-heart', 
    'chemical-bolt', 
    'death-zone', 
    'drink-me',
    'edge-crack', 
    'ninja-mask', 
    'stopwatch', 
    'fishing-net', 
    'overdrive', 
    'strong', 
    'fist', 
    'padlock', 
    'three-leaves', 
    'fluffy-wing', 
    'pummeled', 
    'tread', 
    'arrowed', 
    'aura', 
    'back-pain', 
    'black-flag', 
    'bleeding-eye', 
    'bolt-shield', 
    'broken-heart', 
    'cobweb', 
    'broken-shield', 
    'flying-flag', 
    'radioactive', 
    'trophy', 
    'broken-skull', 
    'frozen-orb', 
    'rolling-bomb', 
    'white-tower', 
    'grab', 
    'screaming', 
    'grenade', 
    'sentry-gun', 
    'all-for-one', 
    'angel-outfit', 
    'archery-target' ];
  
  // Create a new condition with normalized object parameters
  var createCondition = function( name, contract, recover, marker )
  {
    return { name: name, contract: contract, recover: recover, marker: marker };
  }

  // Note that two word condition names will require rework for resolution of api command
  var conditions = [];
  conditions.push( createCondition( 'Blind', ' is blind.', ' can see again.', 'sleepy' ) );
  conditions.push( createCondition( 'Charmed', ' has been charmed.', ' is thinking clearly again.', 'half-heart' ) );
  conditions.push( createCondition( 'Deafened', ' cannot hear.', ' can hear again.', 'lightning-helix' ) );
  conditions.push( createCondition( 'Exhausted', ' is exhausted.', ' has energy again.', 'tread' ) );
  conditions.push( createCondition( 'Fatigued', ' is fatigued.', ' is no longer fatigued.', 'tread' ) );
  conditions.push( createCondition( 'Frightened', ' is frightened.', ' is no longer frightened.', 'ninja-mask' ) );
  conditions.push( createCondition( 'Grappled', ' is grappled.', ' is no longer grappled.', 'snail' ) );
  conditions.push( createCondition( 'Incapacitated', ' is incapacitated.', ' is no longer incapacitated.', 'back-pain' ) );
  conditions.push( createCondition( 'Invisible', ' is invisible.', ' is visible.', 'bleeding-eye' ) );
  conditions.push( createCondition( 'Paralyzed', ' is paralyzed.', ' is no longer paralyzed.', 'frozen-orb' ) );
  conditions.push( createCondition( 'Petrified', ' has turned to stone.', ' is flesh again.', 'archery-target' ) );
  conditions.push( createCondition( 'Poisoned', ' is poisoned.', ' is no longer poisoned.', 'radioactive' ) );
  conditions.push( createCondition( 'Prone', ' is prone.', ' is no longer prone.', 'arrowed' ) );
  conditions.push( createCondition( 'Restrained', ' is restrained.', ' is no longer restrained.', 'aura' ) );
  conditions.push( createCondition( 'Stunned', ' is stunned.', ' is no longer stunned.', 'broken-shield' ) );
  conditions.push( createCondition( 'Unconscious', ' is unconscious.', ' is conscious.', 'skull' ) );
  conditions.push( createCondition( 'Burning', ' is engulfed in flames.', ' stops burning.', 'half-haze' ) );
  conditions.push( createCondition( 'Hex', ' is cursed.', ' is no longer cursed.', 'chemical-bolt' ) );
  // Added Hunters-Mark with dash to avoid using space. api commands currently parsed at spaces
  conditions.push( createCondition( 'Hunters-Mark', ' is marked.', ' is no longer marked.', 'death-zone' ) );
  conditions.push( createCondition( 'Entangled', ' is entangled.', ' is free.', 'cobweb' ) );

  // Return the condition matching name. Return undefined if not found
  var findCondition = function( conditionName )
  {
    return conditions.find( function( entry ) { return entry.name == conditionName; } );
  }
  
  // Create a record of a condition to associate with a token
  // graphicId: the id of the graphic on which to associate the condition
  // conditionName: the name of condition
  // duration: the number of rounds remaining for the condition's effect
  var createConditionRecord = function( graphicId, conditionName, duration )
  {
    return {
      graphicId: graphicId,
      conditionName: conditionName,
      duration: duration };
  };

  // Copy source into destination and return destination
  // source and destination are standard r20 turn order entries
  var copyParticipant = function( source, destination )
  {
    destination.id = source.id;
    destination.pr = source.pr;
    destination.custom = source.custom;
    return destination;
  };

  // Global state serialization
  // Return a copied participant array from Campaign
  var currentTurnOrder = function()
  {
    var serializedTurnOrder = Campaign().get( Roll20.Objects.TURN_ORDER );
    if ( serializedTurnOrder.length == 0 ) {
      return [];
    } else {
      return JSON.parse( serializedTurnOrder );
    }
  };

  // Global state serialization
  // Write participants to Campaign storage
  var storeTurnOrder = function( participants )
  {
    Campaign().set( Roll20.Objects.TURN_ORDER, JSON.stringify( participants ) );
  };

  // Return the roll modifier due to a particular ability score
  var abilityScoreModifier = function( score )
  {
    return Math.floor( ( score - 10 ) / 2 );
  };

  var sendConditionContractedMessage = function( name, condition )
  {
    return sendChat( '', '/desc ' + name + condition.contract );
  };

  var sendConditionRecoveredMessage = function( name, condition )
  {
    return sendChat( '', '/desc ' + name + condition.recover );
  };

  // Remove status marker from graphic
  // Send recover message
  var purgeConditionRecord = function( record )
  {
    const rollObject = getObj( Roll20.Objects.GRAPHIC, record.graphicId );
    // Check to see that roll object is still defined -- it may have been removed
    if ( rollObject != undefined ) {
      const maybeCharacter = getObj( Roll20.Objects.CHARACTER, rollObject.get( Roll20.Verbs.REPRESENTS ) );
      const condition = findCondition( record.conditionName );
      if ( condition !== undefined ) {
        // Remove the graphical status marker
        rollObject.set( Roll20.Objects.STATUS + condition.marker, false );
        if ( maybeCharacter !== undefined ) {
          sendConditionRecoveredMessage( maybeCharacter.get( Roll20.Objects.NAME ), condition );
        }
      }
    }
  };

  // Remove all entries from the Campaign 'turnorder'
  var clearAll = function()
  {
    storeTurnOrder( [] );
    // These two might belong in install method
    state.tbdCombat.completedTurns = [];
    state.tbdCombat.turn = 0;
    state.tbdCombat.round = 0;
    if ( state.tbdCombat.records !== undefined ) {
      state.tbdCombat.records.forEach( function( record ) { purgeConditionRecord( record ); } );
    }
    state.tbdCombat.records = [];
  };

  // Cycle the turn order removing the first entry and placing it behind the last
  // Modifies sequence of participants
  var cycleTurnOrder = function( participants )
  {
    if ( participants.length < 1 ) {
      return true;
    }
    // Store the token object id for participants completing a turn
    state.tbdCombat.completedTurns.push( participants[ 0 ].id );
    participants.push( participants.shift() );
  };

  // Return true if the round has completely cycled
  // Check to see if the top entry is in state.tbdCombat.completedTurns
  var roundComplete = function( participants )
  {
    return participants.length == 0 || state.tbdCombat.completedTurns.includes( participants[ 0 ].id );
  };

  // Return the initiative for the given character. 10 + bonuses
  // characterId is the .id property of a Roll20 'character' object
  var characterInitiative = function( characterId )
  {
    const takeTen = 10;
    // Presume that getAttrByName may return undefined
    var dexterity = getAttrByName( characterId, Roll20.AbilityScores.DEXTERITY );
    return takeTen + ( dexterity === undefined ? 0 : abilityScoreModifier( Number( dexterity ) ) );
  };

  // Pass an array of selectObjects presumably from a message.selected
  // Return an array of participant objects with members: id, pr, custom
  var collectSelectedParticipants = function( selectObjects )
  { 
    var participants = [];
    selectObjects.map( 
      function( selectObject )
      {
        // selectObjects are pure state. Call getObj to get full fledged Roll20 Objects, which have .get method
        const rollObject = getObj( selectObject._type, selectObject._id );
        const maybeCharacter = getObj( Roll20.Objects.CHARACTER, rollObject.get( Roll20.Verbs.REPRESENTS ) );
        if ( maybeCharacter !== undefined ) {
          // It is not clear why .id works here and ._id does not
          // log( maybeCharacter ) shows "_id":"<value>"
          // Perhaps the non-underscore values must be retrieved via .get
          // This holds for rollObject and maybeCharacter
          // Not sure what pr means, but it stores the value r20 uses for turn order
          participants.push( { id: rollObject.id, pr: characterInitiative( maybeCharacter.id ) } );
        }
      } );
    return participants;
  };

  // Create a copy of the existing participants and merge passed participants into the list.
  // Override existing participants with the passed participants when id overlaps
  // Sort by initiative
  // Return the resulting array of participants
  var appendAndUpdateParticipants = function( newParticipants, currentParticipants )
  {
    newParticipants.forEach(
      function( newParticipant )
      {
        var matchingParticipant = currentParticipants.find( function( currentParticipant ) { return currentParticipant.id == newParticipant.id; } );
        if ( matchingParticipant === undefined ) {
          // Add new participants to the current list
          currentParticipants.push( newParticipant );
        } else {
          // Update the contents for participants already in the list
          copyParticipant( newParticipant, currentParticipants );
        }
      } );
    return currentParticipants;
  };

  // Sort turnOrder by initiative
  // Modifies contents of turnOrder
  var sortTurnOrder = function( turnOrder )
  {
    // pr is an awful parameter name forced by the r20 system. pr is initiative
    turnOrder.sort( ( a, b ) => a.pr < b.pr );
  };

  var makeDiv = function( style, content )
  {
    return '<div ' + style + ' >' + content + '</div>';
  };

  var conditionComboBox = function()
  {
    var optionsString = 'Condition?';
    conditions.forEach(
      function( condition )
      {
        optionsString = optionsString + '|' + condition.name;
      } );
    return '?{' + optionsString + '}';
  };

  var showCombatMenu = function()
  {
    const divStyle = 'style="width: 189px; border: 1px solid black; background-color: #ffffff; padding: 5px;"'
    const tableStyle = 'style="text-align:center;"';
    const arrowStyle = 'style="border: none; border-top: 3px solid transparent; border-bottom: 3px solid transparent; border-left: 195px solid ' + blueColor + '; margin-bottom: 2px; margin-top: 2px;"';
    const headStyle = 'style="color: ' + blueColor + '; font-size: 18px; text-align: left; font-variant: small-caps; font-family: Times, serif;"';
    const subStyle = 'style="font-size: 11px; line-height: 13px; margin-top: -3px; font-style: italic;"';
    const anchorStyle1 = 'style="text-align:center; border: 1px solid black; margin: 1px; padding: 2px; background-color: ' + blueColor + '; border-radius: 4px;  box-shadow: 1px 1px 1px #707070; width: 100px;';
    const anchorStyle2 = 'style="text-align:center; border: 1px solid black; margin: 1px; padding: 2px; background-color: ' + blueColor + '; border-radius: 4px;  box-shadow: 1px 1px 1px #707070; width: 150px;';

    const name = state.tbdCombat.conditionPrototype.name;
    const duration = state.tbdCombat.conditionPrototype.duration;
    const conditionMenu = makeDiv( headStyle, 'Conditions' )
      + '<table style=\'margin-left:auto;margin-right:auto;\'>'
      + '<tr><td>Name </td><td><a ' + anchorStyle1 + '" href="!combat setconditionname ' + conditionComboBox() + '">' + name + '</a></td></tr>'
      + '<tr><td>Duration </td><td><a ' + anchorStyle1 + '" href="!combat setconditionduration ?{Duration?|' + duration + '}">' + duration + '</a></td></tr>'
      + '<tr><td colspan=\'2\'>' + makeDiv( tableStyle, '<a ' + anchorStyle2 + '" href="!combat contract">Apply Condition</a>' ) + '</td></tr>'
      + '</table>';

    if ( state.tbdCombat.turn == 0 ) {
      const upcomingRound = String( state.tbdCombat.round + 1 );
      const menu = makeDiv(
        divStyle,
        makeDiv( headStyle, 'Combat' )
        + makeDiv( subStyle, 'Round ' + upcomingRound + ' Setup' )
        + makeDiv( arrowStyle, '' )
          // Show options to add combatants and start round when between rounds
          + makeDiv( tableStyle, '<a ' + anchorStyle2 + '" href="!combat add">Add Combatants</a>' )
          + makeDiv( tableStyle, '<a ' + anchorStyle2 + '" href="!combat round">Start Round ' + upcomingRound + '</a>' )
          + makeDiv( arrowStyle, '' )
          + conditionMenu
          + makeDiv( arrowStyle, '' )
          + makeDiv( tableStyle, '<a ' + anchorStyle2 + '" href="!combat clear">Clear</a>' ) );
      sendChat( 'the 8-ball', '/w gm ' + menu );
    } else {
      const round = String( state.tbdCombat.round );
      const menu = makeDiv(
        divStyle,
        makeDiv( headStyle, 'Combat' )
        + makeDiv( subStyle, 'Round ' + round + ' Turns' )
        + makeDiv( arrowStyle, '' )
          // Show option to advance turn during the round
          + makeDiv( tableStyle, '<a ' + anchorStyle2 + '" href="!combat advance">Advance Turn</a>' )
          + makeDiv( arrowStyle, '' )
          + conditionMenu
          + makeDiv( arrowStyle, '' )
          + makeDiv( tableStyle, '<a ' + anchorStyle2 + '" href="!combat clear">Clear</a>' ) );
      sendChat( 'the 8-ball', '/w gm ' + menu );
    }
  };

  // Notify chat of participant turn
  var announceTurn = function( participant )
  {
    var tokenName = participant.custom;
    if ( tokenName === undefined ) {
      const graphic = getObj( Roll20.Objects.GRAPHIC, participant.id );
      tokenName = graphic === undefined ? 'Illegal Turn' : graphic.get( Roll20.Objects.NAME );
    }
    sendChat( '', '/desc ' + tokenName + ' has the initiative.' );
  };

  // It appears as if Campaign.get( 'turnorder' ) does not change if one of its items is remove from play via the UI
  // The turn order window reflects the removal from page, however api data for 'turnorder' is untouched.
  // Remove any participants from turnOrder that are no longer represented on page
  // Return a new turn order with only participants still on the page
  var purgeTurnOrder = function( turnOrder )
  {
    return turnOrder.filter( function( participant ) { return getObj( Roll20.Objects.GRAPHIC, participant.id ) !== undefined; } );
  };

  // Advance the turn order. Notify gm of round end.
  // Turn order cannot advance until round begins
  // turnOrder is the current participant array
  var advanceTurnAndNotifyOfRoundEnd = function( turnOrder )
  {
    // Calling startRound advances state.tbdCombat.turn from zero to one
    // Start the round before advancing turns
    if ( state.tbdCombat.turn > 0 ) {
      progressConditionRecord( turnOrder[ 0 ], state.tbdCombat.records );
      // TODO: reduce duration in associated condition records
      cycleTurnOrder( turnOrder );
      // Purge turn order after cycling.
      // This avoids issue where turnOrder[ 0 ] would be purged and then 
      // cycleTurnOrder would skip the following participant
      turnOrder = purgeTurnOrder( turnOrder );
      storeTurnOrder( turnOrder );
      if ( roundComplete( turnOrder ) ) {
        sendChat( 'the 8-ball', '/w gm Round ' + state.tbdCombat.round + ' is complete.' );
        // Set the turn to zero to indicate round is complete
        state.tbdCombat.turn = 0;
        showCombatMenu();
      } else {
        showCombatMenu();
        announceTurn( turnOrder[ 0 ] );
        state.tbdCombat.turn++;
      }
    } else {
      sendChat( 'the 8-ball', '/w gm Round has not started.' );
    }
  };

  // Start the next round of combat
  // turnOrder is the current participant array
  var startRound = function( turnOrder )
  {
    // A round can only be started if not currently on a participant turn
    if ( state.tbdCombat.turn == 0 ) {
      turnOrder = purgeTurnOrder( turnOrder );
      // It is only useful to start a round of combat if there are participants
      if ( turnOrder.length > 0 ) {
        // Ensure the participants order is sorted
        sortTurnOrder( turnOrder );
        storeTurnOrder( turnOrder );
        state.tbdCombat.completedTurns = [];
        state.tbdCombat.turn++;
        state.tbdCombat.round++;
        sendChat( '', '/desc Start of Round ' + state.tbdCombat.round );
        showCombatMenu();
        announceTurn( turnOrder[ 0 ] );
      } else {
        sendChat( 'the 8-ball', '/w gm There are no combatants.' );
      }
    } else {
      sendChat( 'the 8-ball', '/w gm Round has already started.' );
    }
  };

  // Find character matching condition record.
  // On successful find, report condition and remaining duration to GM
  // Do nothing when find fails
  var sendConditionStatusMessageToGm = function( record )
  {
    const rollObject = getObj( Roll20.Objects.GRAPHIC, record.graphicId );
    // Check to see that roll object is still defined -- it may have been removed
    if ( rollObject != undefined ) {
      const maybeCharacter = getObj( Roll20.Objects.CHARACTER, rollObject.get( Roll20.Verbs.REPRESENTS ) );
      const condition = findCondition( record.conditionName );
      if ( condition !== undefined ) {
        // Remove the graphical status marker
        rollObject.set( Roll20.Objects.STATUS + condition.marker, false );
        if ( maybeCharacter !== undefined ) {
          sendChat( 'the 8-ball', '/w gm ' + maybeCharacter.get( Roll20.Objects.NAME ) 
            + ' has ' + record.duration + ' rounds of ' + record.conditionName + ' remaining.' );
        }
      }
    }
  };

  // Reduce duration count for condition records applying to participant
  // If a record is reduced to zero duration, send recovery message and remove from records
  var progressConditionRecord = function( participant, records )
  {
    var recordIndex = 0;
    while ( recordIndex < records.length ) {
      const record = records[ recordIndex ];
      // Adjust only records matching the participant
      if ( participant.id == record.graphicId ) {
        record.duration -= 1;
        if ( record.duration <= 0 ) {
          purgeConditionRecord( record );
          // Remove the record rather than incrementing record index
          records.splice( recordIndex, 1 );
        } else {
          // Report remaining duration to GM
          sendConditionStatusMessageToGm( record );
          // Advance the loop index
          recordIndex++;
        }
      } else {
        recordIndex++;
      }
    }
  };

  // Pass an array of selectObjects presumably from a message.selected
  // prototype is likely stored as state.tbdCombat.conditionPrototype
  // Appends generated condition records to records
  var appendConditionRecords = function( selectObjects, prototype, records )
  {
    var conditionRecords = [];
    const condition = findCondition( prototype.name );
    const duration = prototype.duration;
    if ( condition !== undefined ) {
      selectObjects.map( 
        function( selectObject )
        {
          // selectObjects are pure state. Call getObj to get full fledged Roll20 Objects, which have .get method
          const rollObject = getObj( selectObject._type, selectObject._id );
          // Add the graphical status marker
          rollObject.set( Roll20.Objects.STATUS + condition.marker, true );
          const maybeCharacter = getObj( Roll20.Objects.CHARACTER, rollObject.get( Roll20.Verbs.REPRESENTS ) );
          if ( maybeCharacter !== undefined ) {
            sendConditionContractedMessage( maybeCharacter.get( Roll20.Objects.NAME ), condition );
            records.push( createConditionRecord( rollObject.id, condition.name, duration ) );
          }
        } );
    }
  };

  var setPrototypeCondition = function( conditionName )
  {
    const condition = findCondition( conditionName );
    if ( condition !== undefined ) {
      state.tbdCombat.conditionPrototype.name = conditionName;
    }
  };

  var setPrototypeDuration = function( conditionDuration )
  {
    state.tbdCombat.conditionPrototype.duration = Math.max( 0, Math.floor( conditionDuration ) );
  };

  // Set the visibility state for the turn order window
  // pageViewable is boolean
  var showInitiativePage = function( pageViewable )
  {
    Campaign().set( { initiativepage: pageViewable } );
  };

  // Delegate resolution of chat event
  var handleChatMessage = function( message )
  {
    if ( message.type === 'api' ) {
      const tokens = message.content.split( ' ' );
      const command = tokens[ 0 ];
      if ( playerIsGM( message.playerid ) ) {
        if ( command === '!combat' ) {
          var turnOrder = currentTurnOrder();
          if ( tokens.length == 1 ) {
            showInitiativePage( true );
            storeTurnOrder( turnOrder );
            showCombatMenu();
          } else {
            const subcommand = tokens[ 1 ];
            if ( subcommand == 'add' ) {
              // allow addition of combatants only at the top of the round
              if ( message.selected === undefined || message.selected.length == 0 ) {
                sendChat( 'the 8-ball', '/w gm No actors selected for initiative' );
              } else if( state.tbdCombat.turn == 0 ) {
                showInitiativePage( true );
                // appendAndUpdateParticipants modifies contents of turnOrder
                appendAndUpdateParticipants( collectSelectedParticipants( message.selected ), turnOrder );
                sortTurnOrder( turnOrder );
                storeTurnOrder( turnOrder );
              } else {
                sendChat( 'the 8-ball', '/w gm Cannot add combatant in middle of round.' );
              }
            } else if ( subcommand == 'round' ) {
              startRound( turnOrder );
            } else if ( subcommand == 'advance' ) {
              advanceTurnAndNotifyOfRoundEnd( turnOrder );
            } else if ( subcommand == 'clear' ) {
              clearAll();
              showInitiativePage( false );
              showCombatMenu();
            } else if ( subcommand == 'contract' ) {
              if ( message.selected === undefined || message.selected.length == 0 ) {
                sendChat( 'the 8-ball', '/w gm No actors selected for condition' );
              } else {
                appendConditionRecords( message.selected, state.tbdCombat.conditionPrototype, state.tbdCombat.records );
              }
            } else if ( subcommand == 'setconditionname' && tokens.length == 3 ) {
              setPrototypeCondition( tokens[ 2 ] );
              showCombatMenu();
            } else if ( subcommand == 'setconditionduration'  && tokens.length == 3 ) {
              setPrototypeDuration( Number( tokens[ 2 ] ) );
              showCombatMenu();
            }
          }
        }
      }
    } else {
      // ignore
    }		
  };

  var registerEventHandlers = function()
  {
    clearAll();
    if ( state.tbdCombat === undefined ) {
      state.tbdCombat = {};
      // The prototype stores input parameters for condition assignment
      state.tbdCombat.conditionPrototype = {
        name: 'Poison',
        duration: 2 };
    }
    on( 'chat:message', handleChatMessage );
	};

  var runTests = function()
  {
  };

  return {
    runTests: runTests,
    registerEventHandlers: registerEventHandlers };
}() );

on( "ready", function() { tbdCombat.registerEventHandlers(); } );
