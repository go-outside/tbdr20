
// Assigns 'turnorder' based on taking 10 for initiative and arranging from greatest to least

var tbdCombat = tbdCombat || ( function() 
{
  'use strict';
  const blueColor = '#2D407E';

  const Roll20 = {
    ANNOUNCER : 'the 8-ball'
  };
  Roll20.AbilityScores = {
    CHARISMA : 'charisma',
    CONSTITUTION : 'constitution',
    DEXTERITY : 'dexterity',
    INTELLIGENCE : 'intelligence',
    STRENGTH : 'strength',
    WISDOM : 'wisdom'
  };
  Roll20.Events = {
    CHAT_MESSAGE : 'chat:message',
    CHANGE_CAMPAIGN_TURNORDER : 'change:campaign:turnorder'
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
  conditions.push( createCondition( 'Frightened', ' is frightened.', ' is no longer frightened.', 'screaming' ) );
  conditions.push( createCondition( 'Grappled', ' is grappled.', ' is no longer grappled.', 'snail' ) );
  conditions.push( createCondition( 'Incapacitated', ' is incapacitated.', ' is no longer incapacitated.', 'back-pain' ) );
  conditions.push( createCondition( 'Invisible', ' is invisible.', ' is visible.', 'ninja-mask' ) );
  conditions.push( createCondition( 'Paralyzed', ' is paralyzed.', ' is no longer paralyzed.', 'frozen-orb' ) );
  conditions.push( createCondition( 'Petrified', ' has turned to stone.', ' is flesh again.', 'archery-target' ) );
  conditions.push( createCondition( 'Poisoned', ' is poisoned.', ' is no longer poisoned.', 'radioactive' ) );
  conditions.push( createCondition( 'Prone', ' is prone.', ' is no longer prone.', 'arrowed' ) );
  conditions.push( createCondition( 'Restrained', ' is restrained.', ' is no longer restrained.', 'aura' ) );
  conditions.push( createCondition( 'Stunned', ' is stunned.', ' is no longer stunned.', 'broken-shield' ) );
  conditions.push( createCondition( 'Unconscious', ' is unconscious.', ' is conscious.', 'skull' ) );
  conditions.push( createCondition( 'Burning', ' is engulfed in flames.', ' stops burning.', 'half-haze' ) );
  conditions.push( createCondition( 'Hex', ' is cursed.', ' is no longer cursed.', 'chemical-bolt' ) );
  conditions.push( createCondition( 'Entangled', ' is entangled.', ' is free.', 'cobweb' ) );
  conditions.push( createCondition( 'Blind', ' is blinded.', ' now has sight.', 'bleeding-eye' ) );
  conditions.push( createCondition( 'Hunters-Mark', ' is marked.', ' is no longer marked.', 'death-zone' ) );
  conditions.push( createCondition( 'Reaction', ' takes a reaction.', ' now has a reaction.', 'lightning-helix' ) );

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
    destination.tookTurn = source.tookTurn;
    return destination;
  };

  // Return a new Participant object to insert into 'turnorder'
  var createParticipant = function( graphicId, initiative )
  {
    return { id: graphicId, pr: initiative, tookTurn: false };
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

  // It appears as if Campaign.get( 'turnorder' ) does not change if one of its items is removed from play via the UI
  // The turn order window reflects the removal from page, however api data for 'turnorder' is untouched.
  // Remove any participants from turnOrder that are no longer represented on page
  // Return a new turn order with only participants still on the page
  var purgeTurnOrder = function( turnOrder )
  {
    return turnOrder.filter( function( participant ) { return getObj( Roll20.Objects.GRAPHIC, participant.id ) !== undefined; } );
  };

  // Sort turnOrder by initiative
  // Modifies contents of turnOrder
  var sortTurnOrder = function( turnOrder )
  {
    // pr is an awful parameter name forced by the r20 system. pr is initiative
    turnOrder.sort( ( a, b ) => a.tookTurn == b.tookTurn ? ( a.pr < b.pr ) : ( a.tookTurn > b.tookTurn ) );
  };

  // Global state serialization
  // Write participants to Campaign storage
  var storeTurnOrder = function( participants )
  {
    Campaign().set( Roll20.Objects.TURN_ORDER, JSON.stringify( participants ) );
  };

  // Return true if the round has completely cycled
  // Check to see that every entry has tookTurn == true
  var roundComplete = function( participants )
  {
    return participants.length == 0 || participants.every( function( participant ) { return participant.tookTurn == true; } );
  };

  // Return the roll modifier due to a particular ability score
  var abilityScoreModifier = function( score )
  {
    return Math.floor( ( score - 10 ) / 2 );
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

  // Write a global message to the chat channel to indicate name has contracted condition
  var sendConditionContractedMessage = function( name, condition )
  {
    return sendChat( '', '/desc ' + name + condition.contract );
  };

  // Write a global message to the chat channel to indicate name has recovered from condition
  var sendConditionRecoveredMessage = function( name, condition )
  {
    return sendChat( '', '/desc ' + name + condition.recover );
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

  // Check to see if the round has started
  // If round has started and originalCurrent turn is different than turnOrder[ 0 ], announce that turn order has changed
  var maybeReannounceTurn = function( originalCurrentTurnParticipant, turnOrder )
  {
    if ( state.tbdCombat.turn > 0 ) {
      if ( originalCurrentTurnParticipant.id != turnOrder[ 0 ].id ) {
        sendChat( '', '/desc Current turn has been modified.' );
        announceTurn( turnOrder[ 0 ] );
      }
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
      if ( condition !== undefined && maybeCharacter !== undefined ) {
        sendChat( Roll20.ANNOUNCER, '/w gm ' + maybeCharacter.get( Roll20.Objects.NAME ) 
          + ' has ' + record.duration + ' rounds of ' + record.conditionName + ' remaining.' );
      }
    }
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
    state.tbdCombat.turn = 0;
    state.tbdCombat.round = 0;
    if ( state.tbdCombat.records !== undefined ) {
      state.tbdCombat.records.forEach( function( record ) { purgeConditionRecord( record ); } );
    }
    state.tbdCombat.records = [];
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
          participants.push( createParticipant( rollObject.id, characterInitiative( maybeCharacter.id ) ) );
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
          // Update initiative for participants that are already tracked
          currentParticipant.pr = newParticipant.pr;
        }
      } );
    return currentParticipants;
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

  // Store condition name for the prototype condition stored in global state
  var setPrototypeCondition = function( conditionName )
  {
    const condition = findCondition( conditionName );
    if ( condition !== undefined ) {
      state.tbdCombat.conditionPrototype.name = conditionName;
    }
  };

  // Store condition duration for the prototype condition stored in global state
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

  // Helper function that constructs a div html element with a specified style
  var makeDiv = function( style, content )
  {
    return '<div ' + style + ' >' + content + '</div>';
  };

  // Construct a roll20 api combo box
  // Insert contents into a chat message anchor tag
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

  // Render the primary UI to the chat window.
  // Functions in two modes:
  // 1. Setting up the turn. This is the state after using 'Clear' and before using 'Start Round'
  // 2. Combat rounds. Begins after 'Start Round' is pressed
  // The two modes offer a few different command options
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
      sendChat( Roll20.ANNOUNCER, '/w gm ' + menu );
    } else {
      const round = String( state.tbdCombat.round );
      const menu = makeDiv(
        divStyle,
        makeDiv( headStyle, 'Combat' )
        + makeDiv( subStyle, 'Round ' + round + ' Turns' )
        + makeDiv( arrowStyle, '' )
          // Show option to advance turn during the round
          + makeDiv( tableStyle, '<a ' + anchorStyle2 + '" href="!combat add">Add Combatants</a>' )
          + makeDiv( tableStyle, '<a ' + anchorStyle2 + '" href="!combat advance">Advance Turn</a>' )
          + makeDiv( arrowStyle, '' )
          + conditionMenu
          + makeDiv( arrowStyle, '' )
          + makeDiv( tableStyle, '<a ' + anchorStyle2 + '" href="!combat clear">Clear</a>' ) );
      sendChat( Roll20.ANNOUNCER, '/w gm ' + menu );
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
        // Clear the turn taken state
        turnOrder.forEach( function( participant ) { participant.tookTurn = false; } );
        // Ensure the participants order is sorted
        sortTurnOrder( turnOrder );
        storeTurnOrder( turnOrder );
        state.tbdCombat.turn++;
        state.tbdCombat.round++;
        sendChat( '', '/desc Start of Round ' + state.tbdCombat.round );
        showCombatMenu();
        announceTurn( turnOrder[ 0 ] );
      } else {
        sendChat( Roll20.ANNOUNCER, '/w gm There are no combatants.' );
      }
    } else {
      sendChat( Roll20.ANNOUNCER, '/w gm Round has already started.' );
    }
  };

  // Supply message and cleanup the combat turn.
  // Show the combat menu
  var endRound = function()
  {
    sendChat( Roll20.ANNOUNCER, '/w gm Round ' + state.tbdCombat.round + ' is complete.' );
    // Set the turn to zero to indicate round is complete
    state.tbdCombat.turn = 0;
    showCombatMenu();
  };

  // Advance the turn order. Notify gm of round end.
  // Turn order cannot advance until round begins
  // turnOrder is the current participant array before cycling for the turn
  var advanceTurnAndNotifyOfRoundEnd = function( turnOrder )
  {
    // Calling startRound advances state.tbdCombat.turn from zero to one
    // Start the round before advancing turns
    if ( state.tbdCombat.turn > 0 ) {
      if ( turnOrder[ 0 ].tookTurn == false ) {
        // Advance condition state only for participants who have not completed their turn yet
        // Ideally tookTurn will always be false at this point because other logic prevents advance on a stale turn
        progressConditionRecord( turnOrder[ 0 ], state.tbdCombat.records );
      }
      // Mark turn taken for first combatant and resort the order
      if ( turnOrder.length > 0 ) {
        turnOrder[ 0 ].tookTurn = true;
        sortTurnOrder( turnOrder );
      }
      // Purge turn order after cycling.
      // This avoids issue where turnOrder[ 0 ] could be purged and then cycling would effectively skip the following participant
      turnOrder = purgeTurnOrder( turnOrder );
      storeTurnOrder( turnOrder );
      if ( roundComplete( turnOrder ) ) {
        endRound();
      } else {
        showCombatMenu();
        announceTurn( turnOrder[ 0 ] );
        state.tbdCombat.turn++;
      }
    } else {
      // Store turn order here for case where turn was advanced via initative page and needs to be reset
      storeTurnOrder( turnOrder );
      sendChat( Roll20.ANNOUNCER, '/w gm Round has not started.' );
    }
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
            storeTurnOrder( turnOrder );
            showCombatMenu();
          } else {
            const subcommand = tokens[ 1 ];
            if ( subcommand == 'add' ) {
              // allow addition of combatants only at the top of the round
              if ( message.selected === undefined || message.selected.length == 0 ) {
                sendChat( Roll20.ANNOUNCER, '/w gm No actors selected for initiative' );
              } else {
                showInitiativePage( true );
                const originalCurrentTurn = turnOrder[ 0 ];
                // appendAndUpdateParticipants modifies contents of turnOrder
                appendAndUpdateParticipants( collectSelectedParticipants( message.selected ), turnOrder );
                sortTurnOrder( turnOrder );
                // If round has already started, this addition might set the current turn
                maybeReannounceTurn( originalCurrentTurn, turnOrder );
                storeTurnOrder( turnOrder );
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
                sendChat( Roll20.ANNOUNCER, '/w gm No actors selected for condition' );
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

  // Modify participat to make it a valid participant object
  // Return true if modification was possible and participant has valid state
  var validateParticipant = function( participant )
  {
    if ( participant.id === undefined ) {
      return false;
    }
    if ( participant.pr !== undefined && participant.tookTurn !== undefined ) {
      // Participant is already defined
      return true;
    }
    // Attempt to identify character and initiative
    const rollObject = getObj( Roll20.Objects.GRAPHIC, participant.id );
    if ( rollObject !== undefined ) {
      const maybeCharacter = getObj( Roll20.Objects.CHARACTER, rollObject.get( Roll20.Verbs.REPRESENTS ) );
      if ( maybeCharacter !== undefined ) {
        copyParticipant( createParticipant( rollObject.id, characterInitiative( maybeCharacter.id ) ), participant );
        return true;
      }
    }
    // Could not recover initiative value
    return false;
  };

  // The function arguents for this handler are a little bizarre.
  // There are two campaign inputs that look the same but actually have different type
  // It appears that newCampaign is a full fledged Roll20 object with a .get() method for properties
  // However oldCampaign is a plain JavaScript object without the .get() method.
  // Both newCampaign and oldCampaign appear the same when output to log
  var handleTurnOrderChange = function( newCampaign, oldCampaign )
  {
    const newTurnOrder = JSON.parse( newCampaign.get( Roll20.Objects.TURN_ORDER ) );
    const originalTurnOrder = JSON.parse( oldCampaign[ Roll20.Objects.TURN_ORDER ] );
    if ( newTurnOrder.length == originalTurnOrder.length ) {
      // Assume that a same number of entries implies the identity of entries remains the same.
      // Turn order cannot be modified outside of the combat panel.
      // However modification of initiative values is allowed here.
      // Re-sort to keep original order respecting initiative value change
      sortTurnOrder( newTurnOrder );
      storeTurnOrder( newTurnOrder );
      // If round has already started, this addition might set a new current turn
      maybeReannounceTurn( originalTurnOrder[ 0 ], newTurnOrder );
    } else {
      // Handle addition of participant via right-click, add turn from map
      const validatedTurnOrder = newTurnOrder.filter( function( participant ) { return validateParticipant( participant ); } );
      // A participant has been added or removed
      sortTurnOrder( validatedTurnOrder );
      storeTurnOrder( validatedTurnOrder );
      // If round has already started, this addition might set a new current turn
      maybeReannounceTurn( originalTurnOrder[ 0 ], validatedTurnOrder );
      // If the last participant was removed, end the round
      if ( roundComplete( validatedTurnOrder ) ) {
        endRound();
      }
    }
  };

  var registerEventHandlers = function()
  {
    // TODO: remove this line
    state.tbdCombat.completedTurns = undefined;
    clearAll();
    if ( state.tbdCombat === undefined ) {
      state.tbdCombat = {};
      // The prototype stores input parameters for condition assignment
      state.tbdCombat.conditionPrototype = {
        name: 'Poison',
        duration: 2 };
    }
    on( Roll20.Events.CHAT_MESSAGE, handleChatMessage );
    on( Roll20.Events.CHANGE_CAMPAIGN_TURNORDER, handleTurnOrderChange );

    log( 'There be dragons! Combat initialized.' );
	};

  var runTests = function()
  {
  };

  return {
    runTests: runTests,
    registerEventHandlers: registerEventHandlers };
}() );

on( "ready", function() { tbdCombat.registerEventHandlers(); } );
