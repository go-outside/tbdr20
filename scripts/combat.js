
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
    _ID : '_id',
    _ONLINE : '_online',
    _PAGEID : '_pageid',
    _TYPE : '_type',
    CAMPAIGN : 'campaign',
    CHARACTER : 'character',
    CONTROLLEDBY : 'controlledby',
    DISPLAY_NAME : 'displayname',
    GM_LAYER : 'gmlayer',
    GRAPHIC : 'graphic',
    INITIATIVE_MODIFIER : 'initmod',
    LAYER : 'layer',
    MACRO : 'macro',
    NAME : 'name',
    PATH : 'path',
    PLAYERPAGEID : 'playerpageid',
    PLAYER : 'player',
    STATUS : 'status_',
    STATUS_MARKERS : 'statusmarkers',
    TEXT : 'text',
    TOKEN : 'token ',
    TOKEN_MARKERS : 'token_markers',
    TURN_ORDER : 'turnorder'
  };
  Roll20.Verbs = {
    REPRESENTS : 'represents'
  };

  /// TokenMarkers will be filled on startup
  /// These objects will have members: id, name, tag, and url
  /// id is the database id
  /// name is a non-unique identifier
  /// tag is how a marker is actually referenced in the system
  /// url points to the token image
  /// Example:
  /// { "id":59, "name":"Bane", "tag":"Bane::59", "url":"https://s3.amazonaws.com/files.d20.io/images/59/yFnKXmhLTtbMtaq-Did1Yg/icon.png?1575153187" }
  const combatTokenMarkers = [];
  
  /// Clear tokenMarkers and then add all token markers in the Campaign() to the list
  var fillTokenMarkers = function()
  {
    // Clear contents from combatTokenMarkers
    combatTokenMarkers.splice( 0 );
    const tokenMarkers = JSON.parse( Campaign().get( Roll20.Objects.TOKEN_MARKERS ) );
    // Repopulate combatTokenMarkers
    tokenMarkers.forEach( marker => combatTokenMarkers.push( marker ) );
  };

  /// Return the tag entry for the named marker from combatTokenMarkers
  /// Return empty string when name does not match an entry
  var findMarkerTag = function( name )
  {
    const lowerCaseName = name.toLowerCase();
    const entry = combatTokenMarkers.find( markerObject => lowerCaseName == markerObject.name.toLowerCase() );
    if ( entry === undefined ) {
      sendChat( Roll20.ANNOUNCER, '/w gm Marker \'' + name + '\' not found in marker list' );
      return '';
    } else {
      return entry.tag;
    }
  };

  const kContractTarget = 'contracttarget';
  const kContractCaster = 'contractcaster';

  const WhenToAdvanceCondition = {
    AFTER_TURN : 'After',
    BEFORE_TURN : 'Before' 
  };
  
  const TurnToAdvanceCondition = {
    CASTER : 'Caster',
    TARGET : 'Target'
  };

  // Create a new condition with normalized object parameters
  // boolean perRound is true for conditions the are cleared at the top of a combat round
  // whenToAdvance is an element of WhenToAdvanceCondition
  // whenToAdvance specifies when the condition duration decrements. Default values is AFTER_TURN
  var createCondition = function( name, contract, recover, marker, whenToAdvance )
  {
    return { 
      name: name, 
      contract: contract, 
      recover: recover, 
      marker: marker };
  };

  const kReactionCondition = 'Reaction';
  const kDodgingCondition = 'Dodging';
  const kReadyCondition = 'Ready';
  const kHelpCondition = 'Help';

  // Note that two word condition names (first parameter) will require rework for resolution of api command
  var conditions = [];
  conditions.push( createCondition( 'Hunters-Mark', ' is marked.', ' is no longer marked.', 'target-arrows' ) );
  conditions.push( createCondition( kReactionCondition, ' takes a reaction.', ' now has a reaction.', 'lightning-helix' ) );
  conditions.push( createCondition( kDodgingCondition, ' starts dodging.', ' is no longer dodging.', 'dodging' ) );
  conditions.push( createCondition( kReadyCondition, ' readies an action.', ' is no longer ready.', 'strong' ) );
  conditions.push( createCondition( kHelpCondition, ' is helping.', ' is no longer helping.', 'all-for-one' ) );
  conditions.push( createCondition( 'Haste', ' is fast moving.', ' is back to normal speed.', 'sprint' ) );
  conditions.push( createCondition( 'Slow', ' is lethargic.', ' is normal.', 'snail' ) );
  conditions.push( createCondition( 'Mirror', ' has multiple images.', ' no longer has multiple images.', 'two-shadows' ) );
  conditions.push( createCondition( 'Blink', ' is blinks out of existance.', ' has returned.', 'teleport' ) );
  conditions.push( createCondition( 'Blur', ' image is blurred.', ' image is no longer blurred.', 'relationship-bounds' ) );
  conditions.push( createCondition( 'Weakness', ' is sapped of strength.', ' has their strength return.', 'slavery-whip' ) );
  conditions.push( createCondition( 'Burning', ' is engulfed in flames.', ' stops burning.', 'fire' ) );
  conditions.push( createCondition( 'True-seeing', ' has true sight.', ' no longer has true sight.', 'eye-of-horus' ) );
  conditions.push( createCondition( 'Bless', ' is blessed.', ' is no longer blessed.', 'angel-outfit' ) );
  conditions.push( createCondition( 'Chill', ' feels touched by Death.', ' is no longer touched by Death.', 'skeletal-hand' ) );
  conditions.push( createCondition( 'Transform', ' is transformed.', ' transforms back.', 'overdrive'));
  conditions.push( createCondition( 'Power', ' glows with power.', ' no longer glowing.', 'aura'));
  conditions.push( createCondition( 'Confused', ' is very confused.', ' is no longer confused.', 'stoned-skull' ) );
  conditions.push( createCondition( 'Faerie-Fire', ' is surrounded with fire.', ' is no longer illuminated.', 'flaming-claw' ));
  conditions.push( createCondition( 'Acid', ' begins to melt.', ' is no longer melting.', 'chemical-bolt') );
  conditions.push( createCondition( 'Rage', ' is enraged.', ' is no longer enraged.', 'fist'));
  conditions.push( createCondition( 'Agumented', ' is augmented with new skills.', ' is no longer augmented.', 'strong'));
  conditions.push( createCondition( 'Paralyzed', ' is paralyzed.', ' is no longer paralyzed.', 'back-pain' ) );
  conditions.push( createCondition( 'Petrified', ' has turned to stone.', ' is flesh again.', 'medusa-head' ) );
  conditions.push( createCondition( 'Poisoned', ' is poisoned.', ' is no longer poisoned.', 'radioactive' ) );
  conditions.push( createCondition( 'Prone', ' is prone.', ' is no longer prone.', 'falling' ) );
  conditions.push( createCondition( 'Restrained', ' is restrained.', ' is no longer restrained.', 'imprisoned' ) );
  conditions.push( createCondition( 'Stunned', ' is stunned.', ' is no longer stunned.', 'surprised' ) );
  conditions.push( createCondition( 'Unconscious', ' is unconscious.', ' is conscious.', 'skull' ) );
  conditions.push( createCondition( 'Entangled', ' is entangled.', ' is free.', 'beanstalk' ) );
  conditions.push( createCondition( 'Grappled', ' is grappled.', ' is no longer grappled.', 'monster-grasp' ) );
  conditions.push( createCondition( 'Hex', ' is cursed.', ' is no longer cursed.', 'death-zone' ) );
  conditions.push( createCondition( 'Charmed', ' has been charmed.', ' is thinking clearly again.', 'half-heart' ) );
  conditions.push( createCondition( 'Hammer', ' is attacked by the hammer of the gods.', ' is no longer under siege.', 'hammer-drop' ) );
  conditions.push( createCondition( 'Deafened', ' cannot hear.', ' can hear again.', 'broken-skull' ) );
  conditions.push( createCondition( 'Exhausted', ' is exhausted.', ' has energy again.', 'tread' ) );
  conditions.push( createCondition( 'Frightened', ' is frightened.', ' is no longer frightened.', 'screaming' ) );
  conditions.push( createCondition( 'Incapacitated', ' is incapacitated.', ' is no longer incapacitated.', 'coma' ) );
  conditions.push( createCondition( 'Invisible', ' is invisible.', ' is visible.', 'invisible' ) );
  conditions.push( createCondition( 'Blind', ' is blinded.', ' now has sight.', 'bleeding-eye' ) );
  conditions.push( createCondition( 'Absorb', ' is resistant to the energy.', ' is normal.', 'bolt-shield' ) );
  conditions.push( createCondition( 'Shadow', ' is surrounded by shadows.', ' is normal.', 'half-haze' ) );
  // Sort conditions into alphabetical order
  conditions.sort( ( a, b ) => a.name.localeCompare( b.name ) );

  // Return the condition matching name. Return undefined if not found
  var findCondition = function( conditionName )
  {
    return conditions.find( function( entry ) { return entry.name == conditionName; } );
  }
  
  // Return the player id for the first player found that is GM
  // Return undefined when none is available
  var findFirstOnlineGmPlayerId = function()
  {
    return findObjs( { _type: 'player', _online: true } )
      .map( entry => entry.get( Roll20.Objects._ID ) )
      .find( id => playerIsGM( id ) );
  };

  // Create a record of a condition to associate with a token
  // conditionId: unique identifier for tracking the condition in condition table
  // graphicId: the id of the graphic on which to associate the condition and show status marker
  // conditionName: the name of condition
  // duration: the number of rounds remaining for the condition's effect
  // conditionId: unique identifier assigned to condition to selectively delete from condition table
  // advanceTurnGraphicId: the id of graphic on which turn condition duration advancement occurs.
  // When advanceTurnGraphicId is undefined, use graphicId instead
  var createConditionRecord = function( 
    graphicId, 
    conditionName, 
    duration, 
    conditionId, 
    advanceTurnGraphicId,
    tickWhen )
  {
    return {
      conditionId: conditionId,
      graphicId: graphicId,
      // TODO: specify the marker for the turn on which condition is advanced
      // TODO: usage would require perhaps a new Apply button that set advance graphic from the current turn participant.id
      advanceTurnGraphicId: advanceTurnGraphicId,
      conditionName: conditionName,
      duration: duration,
      tickWhen: tickWhen };
  };

  /// Deep copy conditionRecord source and return the copy
  var copyConditionRecord = function( source )
  {
    return { 
      conditionId: source.conditionId,
      graphicId: source.graphicId,
      advanceTurnGraphicId: source.advanceTurnGraphicId,
      conditionName: source.conditionName,
      duration: source.duration,
      tickWhen: source.tickWhen };
  };

  /// Deep copy contents of source onto destination
  var copyCombat = function( source, destination )
  {
    destination.conditionCount = source.conditionCount;
    destination.conditionPrototype = { 
      name: source.conditionPrototype.name, 
      duration: source.conditionPrototype.duration,
      tickWhen: source.conditionPrototype.tickWhen,
      tickTurn: source.conditionPrototype.tickTurn };
    destination.round = source.round;
    destination.records = source.records.map( record => copyConditionRecord( record ) );
    destination.turn = source.turn;
  }

  /// Deep copy the combat object from state and return it
  var currentCombat = function()
  {
    if ( state.tbdCombat === undefined ) {
      return { 
        conditionCount: 0, 
        conditionPrototype: { 
          name: 'Poisoned', 
          duration: 2,
          tickWhen: WhenToAdvanceCondition.AFTER_TURN,
          tickTurn: TurnToAdvanceCondition.TARGET }, 
        records: [], 
        round: 0, 
        turn: 0 };
    } else {
      const combat = {};
      copyCombat( state.tbdCombat, combat );
      return combat;
    }
  };

  // Deep copy combat into state.tbdCombat
  var storeCombat = function( combat )
  {
    const combatCopy = {};
    copyCombat( combat, combatCopy );
    state.tbdCombat = combatCopy;
  };
  
  var storePerformance = function( performance )
  {
    const performanceCopy = {};
    copyPerformance( performance, performanceCopy );
    state.tbdCombatPerformance = performanceCopy;
  };

  var copyPerformance = function( source, destination )
  {
    destination.combatCalls = source.combatCalls;
    destination.eventsHandled = source.eventsHandled;
    destination.totalMilliseconds = source.totalMilliseconds;
    destination.maximumResolutionMilliseconds = source.maximumResolutionMilliseconds;
  };

  var clearPerformance = function()
  {
    state.tbdCombatPerformance = undefined;
  };

  var currentPerformance = function()
  {
    if ( state.tbdCombatPerformance === undefined ) {
      return {
        // Count the number of times handleChatMessage is called with !combat
        combatCalls: 0,
        // Count the number of times !combat responding to a non-handleChatMessage event
        eventsHandled: 0,
        // Count the total number of milliseconds spent handling script actions
        totalMilliseconds: 0,
        // Track the maximum time spent resolving a single action
        maximumResolutionMilliseconds: 0 };
    } else {
      const performance = {};
      copyPerformance( state.tbdCombatPerformance, performance );
      return performance;
    }
  };

  // Copy source into destination and return destination
  // source and destination are standard r20 turn order entries
  var copyParticipant = function( source, destination )
  {
    destination.id = source.id;
    destination.pr = source.pr;
    destination.custom = source.custom;
    destination.tookTurn = source.tookTurn;
    destination.concentration = source.concentration;
    destination.duration = source.duration;
    return destination;
  };

  // Return true if participant a matches participant b
  var participantsMatch = function( a, b )
  {
    return a.id == b.id
      && a.pr == b.pr
      && a.custom == b.custom
      && a.tookTurn == b.tookTurn
      && a.concentration == b.concentration
      && a.duration == b.duration;
  };

  // A compare function for participant sorting
  var participantCompare = function( a, b )
  {
    return a.tookTurn == b.tookTurn 
      ? ( a.pr == b.pr ? a.id < b.id : a.pr < b.pr )
      : a.tookTurn > b.tookTurn;
  }

  // Return a new Participant object to insert into 'turnorder'
  // tookTurn is true when the participant has taken his turn this round
  // concentration is a string when the participant is concentrating on a spell
  // concentration as a string is the concentrated spell name
  // duration is a number indicating remaining turns when not undefined
  var createParticipant = function( graphicId, initiative )
  {
    return { id: graphicId, pr: initiative, tookTurn: false, concentration: undefined, duration: undefined };
  };
  
  // Return character name if all objects defined
  // Return undefined otherwise
  var nameFromGraphicId = function( graphicId )
  {
    const graphic = getObj( Roll20.Objects.GRAPHIC, graphicId );
    // Check to see that roll object is still defined -- it may have been removed
    if ( graphic !== undefined ) {
      const maybeCharacter = getObj( Roll20.Objects.CHARACTER, graphic.get( Roll20.Verbs.REPRESENTS ) );
      if ( maybeCharacter !== undefined ) {
        return maybeCharacter.get( Roll20.Objects.NAME );
      }
    }
    return undefined;
  };

  // If turnOrder is empty, do nothing
  // Takes a graphicId used to pair to an existing participant
  // Takes a string for spell or undefined.
  // Takes a duration for a number of turns or undefined
  // If spell is a strign with length > 1, then concentration is assigned. Otherwise concentration is set undefined
  var assignParticipantConcentration = function( graphicId, spell, duration )
  {
    var turnOrder = currentTurnOrder();
    if ( turnOrder.length > 0 ) {
      const participant = turnOrder.find( participant => participant.id == graphicId );
      if ( participant === undefined ) {
        var name = nameFromGraphicId( graphicId );
        if ( name === undefined ) {
          name = 'Non-character based participant';
        }
        sendChat( Roll20.ANNOUNCER, '/w gm ' + name + ' is not in combat. Cannot track concentration.' );
      } else {
        if ( spell === undefined || spell.length === undefined || spell.length < 1 ) {
          participant.concentration = undefined;
          participant.duration = undefined;
        } else {
          participant.concentration = spell;
          participant.duration = duration;
        }
      }
      storeTurnOrder( turnOrder );
    }
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

  // Sort array using compare to order elements
  // Modifies array emplace
  // compare function takes two elements from array and returns a boolean
  // Stable sort
  var bubbleSort = function( array, compare )
  {
    var changes = 1;
    while ( changes > 0 ) {
      changes = 0;
      for ( var i = 1; i < array.length; ++i ) {
        if ( compare( array[ i - 1 ], array[ i ] ) ) {
          const temp = array[ i - 1 ];
          array[ i - 1 ] = array[ i ];
          array[ i ] = temp;
          ++changes;
        }
      }
    }
  };

  // Sort turnOrder by initiative
  // Modifies contents of turnOrder
  var sortTurnOrder = function( turnOrder )
  {
    // pr is an awful parameter name forced by the r20 system. pr is initiative
    bubbleSort( turnOrder, participantCompare );
    // Default JavaScript array sort method is not stable
    // turnOrder.sort( ( a, b ) => a.tookTurn == b.tookTurn ? ( b.pr - a.pr ) : ( a.tookTurn - b.tookTurn ) );
  };

  // Global state serialization
  // Write participants to Campaign storage
  var storeTurnOrder = function( participants )
  {
    Campaign().set( Roll20.Objects.TURN_ORDER, JSON.stringify( participants ) );
  };

  // Remove all entries from the Campaign 'turnorder'
  // If tbdMove is used, clear movers as well
  var clearAll = function()
  {
    storeTurnOrder( [] );
    // Clean up conditions
    const combat = currentCombat();
    combat.records.forEach( purgeConditionRecord );
    state.tbdCombat = undefined;
    if ( tbdMove !== undefined && tbdMove.clearAll !== undefined ) {
      tbdMove.clearAll();
    }
  };

  // Return true if the round has completely cycled
  // Check to see that every entry has tookTurn == true
  var roundComplete = function( participants )
  {
    return participants.length == 0 || participants.every( function( participant ) { return participant.tookTurn == true; } );
  };

  // Return a list of playerId's who have control over the participant
  var participantControllers = function( participant )
  {
    const graphic = getObj( Roll20.Objects.GRAPHIC, participant.id );
    if ( graphic !== undefined ) {
      const maybeCharacter = getObj( Roll20.Objects.CHARACTER, graphic.get( Roll20.Verbs.REPRESENTS ) );
      if ( maybeCharacter !== undefined ) {
        return maybeCharacter.get( Roll20.Objects.CONTROLLEDBY ).split( ',' ).filter( entry => entry.length > 0 );
      }
    }
    return [];
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
    // Presume that getAttrByName may return undefined
    // {"name":"initmod","current":"5","max":""...
    const rawInitiativeModifier = getAttrByName( characterId, Roll20.Objects.INITIATIVE_MODIFIER );
    const initiativeModifier = rawInitiativeModifier === undefined ? 10 : parseInt( rawInitiativeModifier );
    const dexterity = getAttrByName( characterId, Roll20.AbilityScores.DEXTERITY );
    const dexterityModifier = dexterity === undefined ? 0 : abilityScoreModifier( Number( dexterity ) );
    return 10 + initiativeModifier + dexterityModifier;
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

  const kEnableAlternateTokens = true;

  /// Return the token used for character movement
  /// Looks for an alternate token, 'i<name>', where '<name>' is the graphic name
  /// Return id for token i<name> if available otherwise return id for token with <name>
  var movementToken = function( graphicId )
  {
    const pageId = Campaign().get( Roll20.Objects.PLAYERPAGEID );
    const graphic = getObj( Roll20.Objects.GRAPHIC, graphicId );
    if ( graphic !== undefined ) {
      // Search for alternate tokens only if the token is on the gm layer
      if ( kEnableAlternateTokens && graphic.get( Roll20.Objects.LAYER ) == Roll20.Objects.GM_LAYER ) {
        const alternateLowerCaseName = 'i' + graphic.get( Roll20.Objects.NAME ).toLowerCase();
        const matchingAlternateTokens = filterObjs(
          function( object )
          {
            const objectName = object.get( Roll20.Objects.NAME );
            return objectName !== undefined
              && objectName.toLowerCase() == alternateLowerCaseName
              && object.get( Roll20.Objects._PAGEID ) == pageId
              && object.get( Roll20.Objects._TYPE ) == Roll20.Objects.GRAPHIC;
          } );
        if ( matchingAlternateTokens.length == 1 ) {
          return matchingAlternateTokens[ 0 ].get( Roll20.Objects._ID );
        } else if ( matchingAlternateTokens.length > 1 ) {
          sendChat( Roll20.ANNOUNCER, '/w gm Found ' + matchingAlternateTokens.length 
            + ' matching alternate tokens for \'' + alternateLowerCaseName + '\'. Providing default token for !move.' );
        }
      }
    }
    return graphicId;
  };

  // Notify chat of participant turn
  // If !move is installed, clear all movers and then initialize !move for the token with turn
  var announceTurn = function( participant )
  {
    const graphic = getObj( Roll20.Objects.GRAPHIC, participant.id );
    if ( graphic !== undefined ) {
      const tokenName = graphic === undefined ? 'Illegal Turn' : graphic.get( Roll20.Objects.NAME );
      if ( graphic.get( Roll20.Objects.LAYER ) == Roll20.Objects.GM_LAYER ) {
        sendChat( Roll20.ANNOUNCER, '/w gm ' + tokenName + ' has the initiative.' );
      } else {
        sendChat( '', '/desc ' + tokenName + ' has the initiative.' );
      }
      const character = getObj( Roll20.Objects.CHARACTER, graphic.get( Roll20.Verbs.REPRESENTS ) );
      // Trigger move menu and initialization if that module is installed
      if ( tbdMove !== undefined 
        && tbdMove.clearAll !== undefined 
        && tbdMove.startMoveForPlayer !== undefined 
        && character !== undefined
      ) {
        tbdMove.clearAll();
        const controllers = participantControllers( participant );
        if ( controllers.length == 0 ) {
          const gmId = findFirstOnlineGmPlayerId();
          if ( gmId !== undefined ) {
            tbdMove.startMoveForPlayer( gmId, movementToken( participant.id ), character.get( Roll20.Objects._ID ) );
          }
        } else if ( controllers.length > 0 ) {
          const playerId = controllers[ 0 ];
          const player = getObj( Roll20.Objects.PLAYER, playerId );
          if ( player !== undefined && player.get( Roll20.Objects._ONLINE ) ) {
            tbdMove.startMoveForPlayer( playerId, movementToken( participant.id ), character.get( Roll20.Objects._ID ) );
          } else {
            sendChat( Roll20.ANNOUNCER, '/w gm Player is not online to control movement' );
          }
        } else {
          // This branch is no longer accessible.
          // It was used for case where controllers.length > 1
          sendChat( Roll20.ANNOUNCER, '/w gm Cannot hand off !move control of \'' + tokenName + '\' because it has multiple controllers' );
        }
      } else {
        sendChat( Roll20.ANNOUNCER, '/w gm Cannot find tbdMove' );
      }
    }
  };

  // Check to see if the round has started
  // If round has started and originalCurrent turn is different than turnOrder[ 0 ], announce that turn order has changed
  // Does not modify combat. Does not modify turnOrder
  // combat is from currentCombat()
  var maybeReannounceTurn = function( originalCurrentTurnParticipant, turnOrder, combat )
  {
    if ( combat.turn > 0 ) {
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

  /// Set status or token marker for the given rollObject
  /// rollObject is the graphic token
  /// Condition is an object generated from createCondition
  /// state is true or false
  var setTokenMarker = function( rollObject, condition, state )
  {
    const statusMarkerString = rollObject.get( Roll20.Objects.STATUS_MARKERS );
    if ( statusMarkerString !== undefined ) {
      const originalMarkers = statusMarkerString.split( ',' );
      const conditionMarkerTag = findMarkerTag( condition.marker );
      if ( state == true ) {
        // Add the condition
        if ( ! originalMarkers.includes( conditionMarkerTag ) ) {
          originalMarkers.push( conditionMarkerTag );
        }
      } else {
        const index = originalMarkers.findIndex( item => item == conditionMarkerTag );
        // Remove the condition
        if ( index >= 0 ) {
          originalMarkers.splice( index, 1 );
        }
      }
      const filteredMarkers = originalMarkers.filter( marker => marker.length > 0 );
      rollObject.set( Roll20.Objects.STATUS_MARKERS, filteredMarkers.join( ',' ) );
    }
  };

  // Return the character name associated with token
  // Return undefined if no name or character exists
  var participantCharacterName = function( participant )
  {
    const graphic = getObj( Roll20.Objects.GRAPHIC, participant.id );
    if ( graphic === undefined ) {
      return undefined;
    }
    const character = getObj( Roll20.Objects.CHARACTER, graphic.get( Roll20.Verbs.REPRESENTS ) );
    if ( character === undefined ) {
      return undefined;
    }
    return character.get( Roll20.Objects.NAME );
  }

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
        setTokenMarker( rollObject, condition, false );
        if ( maybeCharacter !== undefined ) {
          sendConditionRecoveredMessage( maybeCharacter.get( Roll20.Objects.NAME ), condition );
        }
      }
    }
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
        if ( maybeCharacter === undefined ) {
          const graphicName = rollObject.get( Roll20.Objects.NAME );
          sendChat( Roll20.ANNOUNCER, '/w gm Token is not linked to a character and was omitted from combat.' );
        } else {
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
          matchingParticipant.pr = newParticipant.pr;
        }
      } );
    return currentParticipants;
  };

  // Reduce duration count for concentration
  // Progress downtick is called after turn -- so a spell cast leads to an immediate a downtick
  // Duration represents the number of full combat rounds remaining
  var progressConcentration = function( participant )
  {
    if ( participant.concentration !== undefined ) {
      if ( participant.duration === undefined ) {
        sendConcentrationDurationElapsedMessage( participant );
      } else {
        if ( participant.duration < 1 ) {
          sendConcentrationDurationElapsedMessage( participant );
          participant.concentration = undefined;
          participant.duration = undefined;
        } else {
          participant.duration -= 1;
        }
      }
    }
  }

  // Send message to chat notifying of impending spell expiration
  var sendConcentrationDurationElapsedMessage = function( participant )
  {
    const rollObject = getObj( Roll20.Objects.GRAPHIC, participant.id );
    if ( rollObject !== undefined ) {
      const maybeCharacter = getObj( Roll20.Objects.CHARACTER, rollObject.get( Roll20.Verbs.REPRESENTS ) );
      const characterName = maybeCharacter === undefined ? 'Unknown' : maybeCharacter.get( Roll20.Objects.NAME );
      sendChat( '', '/desc ' + characterName + '\'s ' + participant.concentration + ' expired.' );
    }
  }

  // Reduce duration count for condition records applying to participant
  // If a record is reduced to zero duration, send recovery message and remove from records
  // whenToAdvance is one of WhenToAdvanceCondition enum
  var progressConditionRecord = function( participant, records, whenToAdvance )
  {
    var recordIndex = 0;
    while ( recordIndex < records.length ) {
      const record = records[ recordIndex ];
      // Adjust only records matching the participant
      const advanceId = record.advanceTurnGraphicId === undefined ? record.graphicId : record.advanceTurnGraphicId;
      const condition = findCondition( record.conditionName );
      if ( condition !== undefined && participant.id == advanceId && record.tickWhen == whenToAdvance ) {
        record.duration -= 1;
        if ( record.duration <= 0 ) {
          purgeConditionRecord( record );
          // Remove the record rather than incrementing record index
          records.splice( recordIndex, 1 );
        } else {
          // Report remaining duration to GM
          // Report disabled with addition of Condition Durations table
          // sendConditionStatusMessageToGm( record );
          // Advance the loop index
          recordIndex++;
        }
      } else {
        recordIndex++;
      }
    }
  };

  // On kContractCaster condition record will advance on active participant token turn
  // On kContractTarget condition record will advance on targeted token's turn
  // turnOrder is the global turn order
  // Pass an array of selectObjects presumably from a message.selected
  // Appends generated condition records to combat.records
  // combat is from currentCombat()
  // conditionName is a string to match via findCondition
  // conditionDuration is a number
  // tickWhen is a string
  // tickTurn is a string
  var appendConditionRecords = function( 
    turnOrder, 
    selectObjects, 
    combat, 
    conditionName, 
    conditionDuration,
    tickWhen,
    tickTurn )
  {
    const participantId = turnOrder.length == 0 ? undefined : turnOrder[ 0 ].id;
    const advanceId = tickTurn == TurnToAdvanceCondition.CASTER ? participantId : undefined;
    const condition = findCondition( conditionName );
    if ( condition !== undefined ) {
      selectObjects.map( 
        function( selectObject )
        {
          // selectObjects are pure state. Call getObj to get full fledged Roll20 Objects, which have .get method
          const rollObject = getObj( selectObject._type, selectObject._id );
          if ( rollObject !== undefined ) {
            // Add the graphical status marker
            setTokenMarker( rollObject, condition, true );
            const maybeCharacter = getObj( Roll20.Objects.CHARACTER, rollObject.get( Roll20.Verbs.REPRESENTS ) );
            if ( maybeCharacter !== undefined ) {
              sendConditionContractedMessage( maybeCharacter.get( Roll20.Objects.NAME ), condition );
              const conditionId = ++combat.conditionCount;
              combat.records.push( createConditionRecord( 
                rollObject.id, 
                condition.name, 
                conditionDuration, 
                conditionId, 
                advanceId,
                tickWhen ) );
            }
          }
        } );
    }
  };

  // Remove all condition records from global state that match the given conditionId
  // Called when remove action clicked in condition table
  // Modifies combat
  // combat is from currentCombat()
  var removeConditionRecord = function( conditionId, combat )
  {
    // Update graphic and send recovery messages
    combat.records.forEach( 
      function( record )
      {
        if ( record.conditionId == conditionId ) {
          purgeConditionRecord( record );
        }
      } );
    combat.records = combat.records.filter( function( record ) { return record.conditionId != conditionId; } );
  };

  // Store condition name for the prototype condition stored in global state
  // Modifies combat
  // combat is from currentCombat()
  var setPrototypeCondition = function( conditionName, combat )
  {
    const condition = findCondition( conditionName );
    if ( condition !== undefined ) {
      combat.conditionPrototype.name = conditionName;
    }
  };

  // Store condition duration for the prototype condition stored in global state
  // Modifies combat
  // combat is from currentCombat()
  var setPrototypeDuration = function( conditionDuration, combat )
  {
    combat.conditionPrototype.duration = Math.max( 0, Math.floor( conditionDuration ) );
  };

  var setPrototypeTickTurn = function( tickTurn, combat )
  {
    combat.conditionPrototype.tickTurn = tickTurn;
  }

  var setPrototypeTickWhen = function( tickWhen, combat )
  {
    combat.conditionPrototype.tickWhen = tickWhen;
  }

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

  // Return html string to represent a condition record in the condition table
  // Contains character name, condition name, condition duration, and delete button in a table row
  var conditionTableRow = function( record )
  {
    // selectObjects are pure state. Call getObj to get full fledged Roll20 Objects, which have .get method
    const rollObject = getObj( Roll20.Objects.GRAPHIC, record.graphicId );
    if ( rollObject !== undefined ) {
      const anchorStyle = 'style="border: 1px solid black; margin: 1px; padding: 2px; background-color: ' + blueColor + '; border-radius: 4px; box-shadow: 1px 1px 1px #707070;"';
      const maybeCharacter = getObj( Roll20.Objects.CHARACTER, rollObject.get( Roll20.Verbs.REPRESENTS ) );
      const characterName = maybeCharacter === undefined ? 'Unknown' : maybeCharacter.get( Roll20.Objects.NAME );
      return '<tr><td><b>' + characterName + '</b></td><td>' + record.conditionName + '</td><td>' + String( record.duration ) + '</td>'
        + '<td><a ' + anchorStyle + ' href="!combat removecondition ' + String( record.conditionId ) + '"><b>X</b></a></td></tr>';
    }
    return '';
  };

  // Return a condition table entry for the combat menu
  var conditionTable = function( conditionRecords )
  {
    var content = '';
    conditionRecords.forEach( function( record ) { content = content + conditionTableRow( record ); } );
    return '<table style=\'margin-left:auto; margin-right:auto; font-size: 12px; width: 200px\'>' + content + '</table>';
  };

  var concentrationTable = function( turnOrder )
  {
    var content = '';
    turnOrder.forEach( 
      function( participant )
      {
        if ( participant.concentration !== undefined ) {
          const rollObject = getObj( Roll20.Objects.GRAPHIC, participant.id );
          if ( rollObject !== undefined ) {
            const maybeCharacter = getObj( Roll20.Objects.CHARACTER, rollObject.get( Roll20.Verbs.REPRESENTS ) );
            const characterName = maybeCharacter === undefined ? 'Unknown' : maybeCharacter.get( Roll20.Objects.NAME );
            content = content + '<tr><td>' + characterName + '<br><b>' + participant.concentration + '</b></td>'
              + '<td><b>' + participant.duration + '</b></td></tr>';
          }
        }
      } );
    if ( content.length > 0 ) {
      return '<table style=\'margin-left:auto; margin-right:auto; font-size: 12px; width: 200px\'>' + content + '</table>';
    } else {
      return content;
    }
  };

  // Render the primary UI to the chat window.
  // Functions in two modes:
  // 1. Setting up the turn. This is the state after using 'Clear' and before using 'Start Round'
  // 2. Combat rounds. Begins after 'Start Round' is pressed
  // The two modes offer a few different command options
  // Combat is the reported combat state presumably returned by currentCombat()
  var showCombatMenu = function( combat, turnOrder )
  {
    const divStyle = 'style="width: 220px; border: 1px solid black; background-color: #ffffff; padding: 5px;"'
    const tableStyle = 'style="text-align:center;"';
    const arrowStyle = 'style="border: none; border-top: 3px solid transparent; border-bottom: 3px solid transparent; border-left: 195px solid ' + blueColor + '; margin-bottom: 2px; margin-top: 2px;"';
    const headStyle = 'style="color: ' + blueColor + '; font-size: 18px; text-align: left; font-variant: small-caps; font-family: Times, serif;"';
    const subStyle = 'style="font-size: 11px; line-height: 13px; margin-top: -3px; font-style: italic;"';
    const anchorStyle1 = 'style="text-align:center; border: 1px solid black; margin: 1px; padding: 2px; background-color: ' + blueColor + '; border-radius: 4px;  box-shadow: 1px 1px 1px #707070; width: 100px;';
    const anchorStyle2 = 'style="text-align:center; border: 1px solid black; margin: 1px; padding: 2px; background-color: ' + blueColor + '; border-radius: 4px;  box-shadow: 1px 1px 1px #707070; width: 150px;';
    const anchorStyle3 = 'style="text-align:center; border: 1px solid black; margin: 1px; padding: 2px; background-color: ' + blueColor + '; border-radius: 4px;  box-shadow: 1px 1px 1px #707070; width: 70px;';

    const name = combat.conditionPrototype.name;
    const duration = combat.conditionPrototype.duration;
    const tickWhen = combat.conditionPrototype.tickWhen;
    const tickTurn = combat.conditionPrototype.tickTurn;
    const conditionMenu = makeDiv( headStyle, 'Conditions' )
      + '<table style=\'margin-left:auto;margin-right:auto;\'>'
      + '<tr><td>Name </td><td><a ' + anchorStyle1 + '" href="!combat setconditionname ' + conditionComboBox() + '">' + name + '</a></td></tr>'
      + '<tr><td>Duration </td><td><a ' + anchorStyle1 + '" href="!combat setconditionduration ?{Duration?|' + duration + '}">' + duration + '</a></td></tr>'
      + '<tr><td>Tick When </td><td><a ' + anchorStyle1 + '" href="!combat setconditiontickwhen '
        + '?{Tick when?|' + WhenToAdvanceCondition.AFTER_TURN + '|' 
        + WhenToAdvanceCondition.BEFORE_TURN + '}">' + tickWhen + '</a></td></tr>'
      + '<tr><td>Tick Turn </td><td><a ' + anchorStyle1 + '" href="!combat setconditiontickturn '
        + '?{Tick turn?|' + TurnToAdvanceCondition.CASTER + '|' 
        + TurnToAdvanceCondition.TARGET + '}">' + tickTurn + '</a></td></tr>'
      + '<tr><td colspan=\'2\'>' + makeDiv( tableStyle, '<a ' + anchorStyle2 + '" href="!combat contract">Apply</a>' ) + '</td></tr>'

      + '<tr><td colspan=\'2\'>' 
      + makeDiv( 
        tableStyle, 
        '<a ' + anchorStyle3 + '" href="!combat contract ' + kDodgingCondition + ' 1 ' 
          + WhenToAdvanceCondition.BEFORE_TURN + ' ' + TurnToAdvanceCondition.TARGET + '">Dodge</a>'
          + '<a ' + anchorStyle3 + '" href="!combat contract ' + kHelpCondition + ' 1 '
          + WhenToAdvanceCondition.BEFORE_TURN + ' ' + TurnToAdvanceCondition.TARGET + '">Help</a>' )
      + '</td></tr>'

      + '<tr><td colspan=\'2\'>' 
      + makeDiv( 
        tableStyle, 
        '<a ' + anchorStyle3 + '" href="!combat contract ' + kReactionCondition + ' 1 '
          + WhenToAdvanceCondition.BEFORE_TURN + ' ' + TurnToAdvanceCondition.TARGET + '">React</a>'
          + '<a ' + anchorStyle3 + '" href="!combat contract ' + kReadyCondition + ' 1 '
          + WhenToAdvanceCondition.BEFORE_TURN + ' ' + TurnToAdvanceCondition.TARGET + '">Ready</a>' )
      + '</td></tr>'

      + '</table>';
    const conditionDurations = combat.records.length == 0
      ? ''
      : makeDiv( arrowStyle, '' ) + makeDiv( headStyle, 'Condition Durations' ) + conditionTable( combat.records );
    var concentrationEntry = concentrationTable( turnOrder );
    if ( concentrationEntry.length > 0 ) {
      concentrationEntry = makeDiv( arrowStyle, '' ) + makeDiv( headStyle, 'Concentration' ) + concentrationEntry;
    }
    if ( combat.turn == 0 ) {
      const upcomingRound = String( combat.round + 1 );
      const menu = makeDiv(
        divStyle,
        makeDiv( headStyle, 'Combat' )
        + makeDiv( subStyle, 'Round ' + upcomingRound + ' Setup' )
        + makeDiv( arrowStyle, '' )
          // Show options to add combatants and start round when between rounds
          + makeDiv( tableStyle, '<a ' + anchorStyle2 + '" href="!combat add">Add Combatants</a>' )
          + makeDiv( tableStyle, '<a ' + anchorStyle2 + '" href="!combat round">Start Round ' + upcomingRound + '</a>' )
          + makeDiv( tableStyle, '<a ' + anchorStyle2 + '" href="!combat skipround">Skip Round</a>' )
          + makeDiv( arrowStyle, '' )
          + conditionMenu
          + conditionDurations
          + concentrationEntry
          + makeDiv( arrowStyle, '' )
          + makeDiv( tableStyle, '<a ' + anchorStyle2 + '" href="!combat performance">Performance</a>' )
          + makeDiv( tableStyle, '<a ' + anchorStyle2 + '" href="!combat clear">Clear</a>' ) );
      sendChat( Roll20.ANNOUNCER, '/w gm ' + menu );
    } else {
      const participantName = turnOrder.length == 0 ? undefined : participantCharacterName( turnOrder[ 0 ] );
      const round = String( combat.round );
      const menu = makeDiv(
        divStyle,
        makeDiv( headStyle, 'Combat' )
        + makeDiv( subStyle, 'Round ' + round + ( participantName === undefined ? ' Turns' : ( ', ' + participantName ) ) )
        + makeDiv( arrowStyle, '' )
          // Show option to advance turn during the round
          + makeDiv( tableStyle, '<a ' + anchorStyle2 + '" href="!combat add">Add Combatants</a>' )
          + makeDiv( tableStyle, '<a ' + anchorStyle2 + '" href="!combat advance">Advance Turn</a>' )
          + makeDiv( tableStyle, '<a ' + anchorStyle2 + '" href="!combat skipround">Skip to End of Round</a>' )
          + makeDiv( arrowStyle, '' )
          + conditionMenu
          + conditionDurations
          + concentrationEntry
          + makeDiv( arrowStyle, '' )
          + makeDiv( tableStyle, '<a ' + anchorStyle2 + '" href="!combat performance">Performance</a>' )
          + makeDiv( tableStyle, '<a ' + anchorStyle2 + '" href="!combat clear">Clear</a>' ) );
      sendChat( Roll20.ANNOUNCER, '/w gm ' + menu );
    }
  };

  // Start the next round of combat
  // turnOrder is the current participant array
  // Modifies turnOrder
  // Modifies combat
  // combat is from currentCombat()
  var startRound = function( turnOrder, combat )
  {
    // A round can only be started if not currently on a participant turn
    if ( combat.turn == 0 ) {
      turnOrder = purgeTurnOrder( turnOrder );
      // It is only useful to start a round of combat if there are participants
      if ( turnOrder.length > 0 ) {
        // Clear the turn taken state
        turnOrder.forEach( function( participant ) { participant.tookTurn = false; } );
        // Ensure the participants order is sorted
        sortTurnOrder( turnOrder );
        combat.turn++;
        combat.round++;
        sendChat( '', '/desc Start of Round ' + combat.round );
        progressConditionRecord( turnOrder[ 0 ], combat.records, WhenToAdvanceCondition.BEFORE_TURN );
        showCombatMenu( combat, turnOrder );
        announceTurn( turnOrder[ 0 ] );
        storeTurnOrder( turnOrder );
      } else {
        sendChat( Roll20.ANNOUNCER, '/w gm There are no combatants.' );
      }
    } else {
      sendChat( Roll20.ANNOUNCER, '/w gm Round has already started.' );
    }
  };

  // Supply message and cleanup the combat turn.
  // combat is from currentCombat()
  var endRound = function( combat )
  {
    sendChat( Roll20.ANNOUNCER, '/w gm Round ' + combat.round + ' is complete.' );
    // Set the turn to zero to indicate round is complete
    combat.turn = 0;
    if ( tbdMove !== undefined && tbdMove.clearAll !== undefined ) {
      tbdMove.clearAll();
    }
  };

  // Advance the turn order. Notify gm of round end.
  // Turn order cannot advance until round begins
  // turnOrder is the current participant array before cycling for the turn
  // Modifies turnOrder
  // Modifies combat
  // combat is from currentCombat()
  var advanceTurnAndNotifyOfRoundEnd = function( turnOrder, combat )
  {
    // Calling startRound advances combat.turn from zero to one
    // Start the round before advancing turns
    if ( combat.turn > 0 ) {
      if ( turnOrder[ 0 ].tookTurn == false ) {
        progressConcentration( turnOrder[ 0 ] );
        // Advance condition state only for participants who have not completed their turn yet
        progressConditionRecord( turnOrder[ 0 ], combat.records, WhenToAdvanceCondition.AFTER_TURN );
      }
      // Mark turn taken for first combatant and resort the order
      if ( turnOrder.length > 0 ) {
        turnOrder[ 0 ].tookTurn = true;
        sortTurnOrder( turnOrder );
      }
      // Purge turn order after cycling.
      // This avoids issue where turnOrder[ 0 ] could be purged and then cycling would effectively skip the following participant
      turnOrder = purgeTurnOrder( turnOrder );
      if ( roundComplete( turnOrder ) ) {
        endRound( combat );
        showCombatMenu( combat, turnOrder );
      } else {
        progressConditionRecord( turnOrder[ 0 ], combat.records, WhenToAdvanceCondition.BEFORE_TURN );
        showCombatMenu( combat, turnOrder );
        announceTurn( turnOrder[ 0 ] );
        combat.turn++;
      }
    } else {
      // Store turn order here for case where turn was advanced via initative page and needs to be reset
      sendChat( Roll20.ANNOUNCER, '/w gm Round has not started.' );
    }
  };

  var skipCombatRound = function( turnOrder, combat )
  {
    if ( combat.turn > 0 ) {
      // The combat round has already started. Advance records for only those participants who haven't taken turn
      turnOrder.forEach(
        function( participant )
        {
          if ( ! participant.tookTurn ) {
            progressConcentration( participant );
            progressConditionRecord( participant, combat.records, WhenToAdvanceCondition.BEFORE_TURN );
            progressConditionRecord( participant, combat.records, WhenToAdvanceCondition.AFTER_TURN );
            participant.tookTurn = true;
          }
        } );
      endRound( combat );
    } else {
      combat.round++;
      turnOrder.forEach(
        function( participant )
        {
          progressConcentration( participant );
          progressConditionRecord( participant, combat.records, WhenToAdvanceCondition.BEFORE_TURN );
          progressConditionRecord( participant, combat.records, WhenToAdvanceCondition.AFTER_TURN );
          participant.tookTurn = true;
        } );
      endRound( combat );
    }
  };

  var showTokenMarkers = function( playerId )
  {
    const tokenMarkers = JSON.parse( Campaign().get( Roll20.Objects.TOKEN_MARKERS ) );
    const content = tokenMarkers.reduce(
      function( accumulated, marker )
      {
        return accumulated + '<br>' + marker.tag;
      },
      '' );
    log( tokenMarkers );
    const player = getObj( Roll20.Objects.PLAYER, playerId );
    log( player );
    sendChat( Roll20.ANNOUNCER, '/w "' + player.get( Roll20.Objects.DISPLAY_NAME ) + '" ' + content );
  };

  // Delegate resolution of chat event
  var handleChatMessage = function( message )
  {
    const start = Date.now();
    if ( message.type === 'api' ) {
      const tokens = message.content.split( ' ' );
      const command = tokens[ 0 ];
      if ( command === '!combat' && playerIsGM( message.playerid ) ) {
        // Initialize performance update
        const performance = currentPerformance();
        const originalCallCount = performance.combatCalls;
        performance.combatCalls++;
        // Resolve combat command
        const combat = currentCombat();
        var turnOrder = currentTurnOrder();
        if ( tokens.length == 1 ) {
          storeTurnOrder( turnOrder );
          showCombatMenu( combat, turnOrder );
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
              showCombatMenu( combat, turnOrder );
              // If round has already started, this addition might set the current turn
              maybeReannounceTurn( originalCurrentTurn, turnOrder, combat );
              storeTurnOrder( turnOrder );
            }
          } else if ( subcommand == 'round' ) {
            startRound( turnOrder, combat );
            storeTurnOrder( turnOrder );
            storeCombat( combat );
          } else if ( subcommand == 'advance' ) {
            advanceTurnAndNotifyOfRoundEnd( turnOrder, combat );
            storeTurnOrder( turnOrder );
            storeCombat( combat );
          } else if ( subcommand == 'clear' ) {
            clearAll();
            turnOrder = currentTurnOrder();
            showInitiativePage( false );
            // combat is invalid after calling clearAll. Re-fetch currentCombat to show menu
            showCombatMenu( currentCombat(), turnOrder );
          } else if ( subcommand == 'contract' ) {
            if ( message.selected === undefined || message.selected.length == 0 ) {
              sendChat( Roll20.ANNOUNCER, '/w gm No actors selected for condition' );
            } else {
              if ( tokens.length == 6 ) {
                const conditionName = tokens[ 2 ];
                const conditionDuration = parseInt( tokens[ 3 ] );
                const conditionTickWhen = tokens[ 4 ];
                const conditionTickTurn = tokens[ 5 ];
                appendConditionRecords( 
                  turnOrder, 
                  message.selected, 
                  combat, 
                  conditionName, 
                  conditionDuration,
                  conditionTickWhen,
                  conditionTickTurn );
              } else {
                appendConditionRecords( 
                  turnOrder, 
                  message.selected, 
                  combat, 
                  combat.conditionPrototype.name,
                  combat.conditionPrototype.duration,
                  combat.conditionPrototype.tickWhen,
                  combat.conditionPrototype.tickTurn );
              }
              storeCombat( combat );
              showCombatMenu( combat, turnOrder );
            }
          } else if ( subcommand == 'performance' ) {
            const p = currentPerformance();
            const average = p.totalMilliseconds / ( p.combatCalls + p.eventsHandled );
            sendChat( Roll20.ANNOUNCER, '/w gm Average resolution: ' + average.toFixed( 1 )
              + ' ms, Maximum: ' + p.maximumResolutionMilliseconds.toFixed( 1 ) + ' ms' );
          } else if ( subcommand == 'removecondition' && tokens.length == 3 ) {
            removeConditionRecord( Number( tokens[ 2 ] ), combat );
            storeCombat( combat );
            showCombatMenu( combat, turnOrder );
          } else if ( subcommand == 'setconditionname' && tokens.length == 3 ) {
            setPrototypeCondition( tokens[ 2 ], combat );
            storeCombat( combat );
            showCombatMenu( combat, turnOrder );
          } else if ( subcommand == 'setconditionduration'  && tokens.length == 3 ) {
            setPrototypeDuration( Number( tokens[ 2 ] ), combat );
            storeCombat( combat );
            showCombatMenu( combat, turnOrder );
          } else if ( subcommand == 'setconditiontickwhen' && tokens.length == 3 ) {
            setPrototypeTickWhen( tokens[ 2 ], combat );
            storeCombat( combat );
            showCombatMenu( combat, turnOrder );
          } else if ( subcommand == 'setconditiontickturn' && tokens.length == 3 ) {
            setPrototypeTickTurn( tokens[ 2 ], combat );
            storeCombat( combat );
            showCombatMenu( combat, turnOrder );
          } else if ( subcommand == 'skipround' ) {
            skipCombatRound( turnOrder, combat );
            storeCombat( combat );
            storeTurnOrder( turnOrder );
            showCombatMenu( combat, turnOrder );
          } else if ( subcommand == 'listmarkers' ) {
            showTokenMarkers( message.playerid );
          }
        }
        // Store performance metrics
        if ( performance.combatCalls == originalCallCount + 1 ) {
          const time = Date.now() - start;
          performance.totalMilliseconds += time;
          performance.maximumResolutionMilliseconds = Math.max( performance.maximumResolutionMilliseconds, time );
        }
        storePerformance( performance );
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

  // Return true if turnOrderB matches turnOrderA if turnOrderA was advanced once
  var turnOrderAdvanced = function( turnOrderA, turnOrderB )
  {
    return turnOrderA.length == turnOrderB.length && turnOrderB.every(
      function( participant, index )
      {
        return participantsMatch( participant, turnOrderA[ ( index + 1 ) % turnOrderA.length ] );
      } );
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
    const combat = currentCombat();
    if ( newTurnOrder.length == originalTurnOrder.length ) {
      if ( turnOrderAdvanced( originalTurnOrder, newTurnOrder ) ) {
        advanceTurnAndNotifyOfRoundEnd( originalTurnOrder, combat );
        storeTurnOrder( originalTurnOrder );
        storeCombat( combat );
      } else {
        // Assume that a same number of entries implies the identity of entries remains the same.
        // Turn order cannot be modified outside of the combat panel.
        // However modification of initiative values is allowed here.
        // Re-sort to keep original order respecting initiative value change
        sortTurnOrder( newTurnOrder );
        storeTurnOrder( newTurnOrder );
        // If round has already started, this addition might set a new current turn
        maybeReannounceTurn( originalTurnOrder[ 0 ], newTurnOrder, combat );
      }
    } else {
      // Handle addition of participant via right-click, add turn from map
      const validatedTurnOrder = newTurnOrder.filter( function( participant ) { return validateParticipant( participant ); } );
      // A participant has been added or removed
      sortTurnOrder( validatedTurnOrder );
      storeTurnOrder( validatedTurnOrder );
      // If round has already started, this addition might set a new current turn
      maybeReannounceTurn( originalTurnOrder[ 0 ], validatedTurnOrder, combat );
      // If the last participant was removed, end the round
      if ( roundComplete( validatedTurnOrder ) ) {
        endRound( combat );
        storeCombat( combat );
        showCombatMenu( combat, validatedTurnOrder );
      }
    }
  };

  var registerEventHandlers = function()
  {
    // Ensure the combatTokenMarkers array is filled
    fillTokenMarkers();
    clearPerformance();
    on( Roll20.Events.CHAT_MESSAGE, handleChatMessage );
    on( 
      Roll20.Events.CHANGE_CAMPAIGN_TURNORDER, 
      function( newCampaign, oldCampaign )
      {
        const start = Date.now();
        const performance = currentPerformance();
        performance.eventsHandled++;
        handleTurnOrderChange( newCampaign, oldCampaign );
        const time = Date.now() - start;
        performance.totalMilliseconds += time;
        performance.maximumResolutionMilliseconds = Math.max( performance.maximumResolutionMilliseconds, time );
        storePerformance( performance );
      } );

    log( 'There be dragons! Combat initialized.' );
  };
  
  var reportPerformance = function( performance )
  {
    log( 'Average combat resolution time: ' 
      + String( performance.totalMilliseconds / ( performance.combatCalls + performance.eventsHandled ) ) + ' ms' );
    log( performance );
  };

  var runTests = function()
  {
  };

  return {
    assignConcentration: assignParticipantConcentration,
    runTests: runTests,
    registerEventHandlers: registerEventHandlers };
} )();

on( "ready", function() { tbdCombat.registerEventHandlers(); } );
