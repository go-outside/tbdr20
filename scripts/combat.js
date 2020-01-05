
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
    TEXT : 'text',
    TOKEN : 'token ',
    TURN_ORDER : 'turnorder'
  };
  Roll20.Verbs = {
    REPRESENTS : 'represents'
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
  
  // Remove all entries from the Campaign 'turnorder'
  var clearAll = function()
  {
    storeTurnOrder( [] );
    // These two might belong in install method
    tbdCombat.completedTurns = [];
    tbdCombat.turn = 0;
    tbdCombat.round = 0;
  };

  // Cycle the turn order removing the first entry and placing it behind the last
  // Modifies sequence of participants
  var cycleTurnOrder = function( participants )
  {
    if ( participants.length < 1 ) {
      return true;
    }
    // Store the token object id for participants completing a turn
    tbdCombat.completedTurns.push( participants[ 0 ].id );
    participants.push( participants.shift() );
  };

  // Return true if the round has completely cycled
  // Check to see if the top entry is in tbdCombat.completedTurns
  var roundComplete = function( participants )
  {
    return participants.length == 0 || tbdCombat.completedTurns.includes( participants[ 0 ].id );
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
  var appendUpdateAndSort = function( participants )
  {
    var current = currentTurnOrder();
    participants.forEach(
      function( newParticipant )
      {
        var matchingParticipant = current.find( function( currentParticipant ) { return currentParticipant.id == newParticipant.id; } );
        if ( matchingParticipant === undefined ) {
          // Add new participants to the current list
          current.push( newParticipant );
        } else {
          // Update the contents for participants already in the list
          copyParticipant( newParticipant, current );
        }
      } );
    // pr is an awful parameter name forced by the r20 system. pr is initiative
    current.sort( ( a, b ) => a.pr < b.pr );
    return current;
  };

  var makeDiv = function( style, content )
  {
    return '<div ' + style + ' >' + content + '</div>';
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
    if ( tbdCombat.turn == 0 ) {
      const upcomingRound = String( tbdCombat.round + 1 );
      const menu = makeDiv(
        divStyle,
        makeDiv( headStyle, 'Combat' )
        + makeDiv( subStyle, 'Round ' + upcomingRound + ' Setup' )
        + makeDiv( arrowStyle, '' )
          // Show options to add combatants and start round when between rounds
          + makeDiv( tableStyle, '<a ' + anchorStyle2 + '" href="!combat add">Add New Combatants</a>' )
          + makeDiv( tableStyle, '<a ' + anchorStyle2 + '" href="!combat round">Start Round ' + upcomingRound + '</a>' )
          + makeDiv( arrowStyle, '' )
          + makeDiv( tableStyle, '<a ' + anchorStyle2 + '" href="!combat clear">Clear</a>' ) );
      sendChat( 'the 8-ball', '/w gm ' + menu );
    } else {
      const round = String( tbdCombat.round );
      const menu = makeDiv(
        divStyle,
        makeDiv( headStyle, 'Combat' )
        + makeDiv( subStyle, 'Round ' + round + ' Turns' )
        + makeDiv( arrowStyle, '' )
          // Show option to advance turn during the round
          + makeDiv( tableStyle, '<a ' + anchorStyle2 + '" href="!combat advance">Advance Turn</a>' )
          + makeDiv( arrowStyle, '' )
          + makeDiv( tableStyle, '<a ' + anchorStyle2 + '" href="!combat clear">Clear</a>' ) );
      sendChat( 'the 8-ball', '/w gm ' + menu );
    }
  };

  // Notify chat of participant turn
  var announceTurn = function( participant )
  {
    const tokenName = participant.custom === undefined
      ? getObj( Roll20.Objects.GRAPHIC, participant.id ).get( Roll20.Objects.NAME )
      : participant.custom;
    sendChat( '8-ball', '/desc ' + tokenName + '\'s turn. Initiative ' + participant.pr );
  };

  // Advance the turn order. Notify gm of round end.
  // Turn order cannot advance until round begins
  // turnOrder is the current participant array
  var advanceTurnAndNotifyOfRoundEnd = function( turnOrder )
  {
    if ( tbdCombat.turn > 0 ) {
      cycleTurnOrder( turnOrder );
      storeTurnOrder( turnOrder );
      if ( roundComplete( turnOrder ) ) {
        sendChat( 'the 8-ball', '/w gm Round ' + tbdCombat.round + ' is complete.' );
        tbdCombat.turn = 0;
        showCombatMenu();
      } else {
        showCombatMenu();
        announceTurn( turnOrder[ 0 ] );
        tbdCombat.turn++;
      }
    } else {
      sendChat( 'the 8-ball', '/w gm Round has not started.' );
    }
  };

  // Start the next round of combat
  // turnOrder is the current participant array
  var startRound = function( turnOrder )
  {
    if ( tbdCombat.turn == 0 ) {
      if ( turnOrder.length > 0 ) {
        tbdCombat.completedTurns = [];
        tbdCombat.turn++;
        tbdCombat.round++;
        sendChat( 'the 8-ball', 'Start of Round ' + tbdCombat.round );
        showCombatMenu();
        announceTurn( turnOrder[ 0 ] );
      } else {
        sendChat( 'the 8-ball', '/w gm There are no combatants.' );
      }
    } else {
      sendChat( 'the 8-ball', '/w gm Round has already started.' );
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
            showCombatMenu();
          } else {
            const subcommand = tokens[ 1 ];
            if ( subcommand == 'add' ) {
              // allow addition of combatants only at the top of the round
              if ( message.selected === undefined || message.selected.length == 0 ) {
                sendChat( 'the 8-ball', '/w gm No actors selected for initiative' );
              } else if( tbdCombat.turn == 0 ) {
                var updatedParticipants = appendUpdateAndSort( collectSelectedParticipants( message.selected ) );
                storeTurnOrder( updatedParticipants );
              } else {
                sendChat( 'the 8-ball', '/w gm Cannot add combatant in middle of round.' );
              }
            } else if ( subcommand == 'round' ) {
              startRound( turnOrder );
            } else if ( subcommand == 'advance' ) {
              advanceTurnAndNotifyOfRoundEnd( turnOrder );
            } else if ( subcommand == 'clear' ) {
              clearAll();
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
