
// Assigns 'turnorder' based on taking 10 for initiative and arranging from greatest to least

var tbdInitiative = tbdInitiative || ( function() 
{
  'use strict';
  
  const Roll20 = {};
  Roll20.AbilityScore = {
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
  var clearTurnOrder = function()
  {
    storeTurnOrder( [] );
  };

  // Return the initiative for the given character. 10 + bonuses
  // characterId is the .id property of a Roll20 'character' object
  var characterInitiative = function( characterId )
  {
    const takeTen = 10;
    // Presume that getAttrByName may return undefined
    var dexterity = getAttrByName( characterId, Roll20.AbilityScore.DEXTERITY );
    return takeTen + dexterity === undefined ? 0 : abilityScoreModifier( Number( dexterity ) );
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
    log( participants );
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

  // Delegate resolution of chat event
  var handleChatMessage = function( message )
  {
    if ( message.type === 'api' ) {
      var tokens = message.content.split( ',' );
      var command = tokens[ 0 ];
      if ( playerIsGM( message.playerid ) ) {
        if ( command === '!tbdi' ) {
          if ( message.selected === undefined || message.selected.length == 0 ) {
            sendChat( 'the 8-ball', '/w gm No actors selected for initiative' );
          } else {
            var updatedParticipants = appendUpdateAndSort( collectSelectedParticipants( message.selected ) );
            storeTurnOrder( updatedParticipants );
          }
        }
      }
    } else {
      // ignore
    }		
  };

  var registerEventHandlers = function()
  {
    on( 'chat:message', handleChatMessage );
	};

  var runTests = function()
  {
  };

  return {
    runTests: runTests,
    registerEventHandlers: registerEventHandlers };
}() );

on( "ready", function() { state.tbdInitiative = undefined; tbdInitiative.registerEventHandlers(); } );
