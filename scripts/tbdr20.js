
// Common and utility functions and constants.

var Tbdr20 = Tbdr20 || ( function() 
{
  'use strict';

  const Announcer = 'the 8-ball';
  const AbilityScores = {
    CHARISMA : 'charisma',
    CONSTITUTION : 'constitution',
    DEXTERITY : 'dexterity',
    INTELLIGENCE : 'intelligence',
    STRENGTH : 'strength',
    WISDOM : 'wisdom'
  };
  const Coins = {
    PP : 'pp',
    GP : 'gp',
    EP : 'ep',
    SP : 'sp',
    CP : 'cp'
  };
  const Events = {
    CHAT_MESSAGE : 'chat:message',
    CHANGE_CAMPAIGN_TURNORDER : 'change:campaign:turnorder'
  };
  const Messages = {
    API : 'api'
  };
  const Objects = {
    _ID : '_id',
    _ONLINE : '_online',
    _PAGEID : '_pageid',
    _TYPE : '_type',
    ATTRIBUTE : 'attribute',
    CAMPAIGN : 'campaign',
    CHARACTER : 'character',
    CHARACTERID : 'characterid',
    CONTROLLEDBY : 'controlledby',
    CURRENT : 'current',
    DISPLAY_NAME : 'displayname',
    GM_LAYER : 'gmlayer',
    GRAPHIC : 'graphic',
    LAYER : 'layer',
    MACRO : 'macro',
    MAX : 'max',
    NAME : 'name',
    PATH : 'path',
    PLAYERPAGEID : 'playerpageid',
    PLAYER : 'player',
    STATUS : 'status_',
    STATUS_MARKERS : 'statusmarkers',
    TEXT : 'text',
    TOKEN : 'token ',
    TOKEN_MARKERS : 'token_markers',
    TURN_ORDER : 'turnorder',
    TYPE : 'type'
  };
  const Verbs = {
    REPRESENTS : 'represents'
  };
  
  const Inventory = {
    PREFIX : 'repeating_inventory_',

    // Suffixes
    COUNT_SUFFIX : '_itemcount',
    COUNT_INDEX : 0,
    NAME_SUFFIX : '_itemname',
    NAME_INDEX : 1,
    WEIGHT_SUFFIX : '_itemweight',
    WEIGHT_INDEX : 2,
    EQUIPPED_SUFFIX : '_equipped',
    EQUIPPED_INDEX : 3,      // Actually determines whether the item is equipped in regards to other attributes (AC, modifiers, etc.)
    USEASARESOURCE_SUFFIX : '_useasaresource',
    USEASARESOURCE_INDEX : 4,
    HASATTACK_SUFFIX : '_hasattack',
    HASATTACK_INDEX : 5,
    PROPERTIES_SUFFIX : '_itemproperties',
    PROPERTIES_INDEX : 6,
    MODIFIERS_SUFFIX : '_itemmodifiers',
    MODIFIERS_INDEX : 7,
    CONTENT_SUFFIX : '_itemcontent',
    CONTENTS_INDEX : 8,
    ATTACKID_SUFFIX : '_itemattackid',
    ATTACKID_INDEX : 9,
    RESOURCEID_SUFFIX : '_itemresourceid',
    RESOURCEID_INDEX : 10,
    INVENTORYSUBFLAG_SUFFIX: '_inventorysubflag',
    INVENTORYSUBFLAG_INDEX: 11,

    // These have to be the string equivalent, otherwise the sheet worker will not pick up the change
    CHECKED : '1',
    UNCHECKED : '0'
  };

  /*
  cleanForDeletion : function(equipAttr, attackAttr, resourceAttr, countAttr) {
    equipAttr.setWithWorker({current: this.UNCHECKED});
    attackAttr.setWithWorker({current: this.UNCHECKED});
    resourceAttr.setWithWorker({current: this.UNCHECKED});
    countAttr.setWithWorker({current: '0'});
},
  */

  // Return attributes for the item in an object keyed by suffix
  // attributes may be undefined
  var collectInventoryItemAttributeCollection = function( character, itemId )
  {
    const attributeCollection = {};
    attributeCollection[ Inventory.COUNT_SUFFIX ] = inventoryItemPropertyAttribute( character, itemId, Inventory.COUNT_SUFFIX );
    attributeCollection[ Inventory.NAME_SUFFIX ] = inventoryItemPropertyAttribute( character, itemId, Inventory.NAME_SUFFIX );
    attributeCollection[ Inventory.WEIGHT_SUFFIX ] = inventoryItemPropertyAttribute( character, itemId, Inventory.WEIGHT_SUFFIX );
    attributeCollection[ Inventory.EQUIPPED_SUFFIX ] = inventoryItemPropertyAttribute( character, itemId, Inventory.EQUIPPED_SUFFIX );
    attributeCollection[ Inventory.USEASARESOURCE_SUFFIX ] = inventoryItemPropertyAttribute( character, itemId, Inventory.USEASARESOURCE_SUFFIX );
    attributeCollection[ Inventory.HASATTACK_SUFFIX ] = inventoryItemPropertyAttribute( character, itemId, Inventory.HASATTACK_SUFFIX );
    attributeCollection[ Inventory.PROPERTIES_SUFFIX ] = inventoryItemPropertyAttribute( character, itemId, Inventory.PROPERTIES_SUFFIX );
    attributeCollection[ Inventory.MODIFIERS_SUFFIX ] = inventoryItemPropertyAttribute( character, itemId, Inventory.MODIFIERS_SUFFIX );
    attributeCollection[ Inventory.CONTENT_SUFFIX ] = inventoryItemPropertyAttribute( character, itemId, Inventory.CONTENT_SUFFIX );
    attributeCollection[ Inventory.ATTACKID_SUFFIX ] = inventoryItemPropertyAttribute( character, itemId, Inventory.ATTACKID_SUFFIX );
    attributeCollection[ Inventory.RESOURCEID_SUFFIX ] = inventoryItemPropertyAttribute( character, itemId, Inventory.RESOURCEID_SUFFIX );
    attributeCollection[ Inventory.INVENTORYSUBFLAG_SUFFIX ] = inventoryItemPropertyAttribute( character, itemId, Inventory.INVENTORYSUBFLAG_SUFFIX );
    return attributeCollection;
  };

  // Return true if any attribute is defined
  var collectionIsNotEmpty = function( attributeCollection )
  {
    for ( var key in attributeCollection ) {
      if ( attributeCollection[ key ] !== undefined ) {
        return true;
      }
    }
    return false;
  };

  // Create new attribute objects for the character
  var copyCollectionToCharacter = function( character, attributeCollection )
  {
    for ( var key in attributeCollection ) {
      const attribute = attributeCollection[ key ];
      if ( attribute !== undefined ) {
        createObj( Objects.ATTRIBUTE, {
          characterid: character.id,
          name: attribute.get( Objects.NAME ),
          current: attribute.get( Objects.CURRENT ),
          max: attribute.get( Objects.MAX ) } );
      }
    }
  };

  // Call attribute.remove() on each defined attribute
  var removeAttributes = function( attributeCollection )
  {
    for ( var key in attributeCollection ) {
      const attribute = attributeCollection[ key ];
      if ( attribute !== undefined ) {
        attribute.remove();
      }
    }
  };

  // The character sheet cannot delete some items having particular settings. Clear these up.
  // Modifies contents of attributeCollection
  var cleanAttributeCollection = function( attributeCollection )
  {
    const equipped = attributeCollection[ Inventory.EQUIPPED_SUFFIX ];
    if ( equipped !== undefined ) {
      equipped.setWithWorker( { current: Inventory.UNCHECKED } );
    }
    const hasAttack = attributeCollection[ Inventory.HASATTACK_SUFFIX ];
    if ( hasAttack !== undefined ) {
      hasAttack.setWithWorker( { current: Inventory.UNCHECKED } );
    }
    const useAsResource = attributeCollection[ Inventory.USEASARESOURCE_SUFFIX ];
    if ( useAsResource !== undefined ) {
      useAsResource.setWithWorker( { current: Inventory.UNCHECKED } );
    }
    // This one does not make sense to use
    /*
    const count = attributeCollection[ Inventory.COUNT_SUFFIX ];
    if ( count !== undefined ) {
      count.setWithWorker( { current: Inventory.UNCHECKED } );
    }
    */
  };

  // Return an array of inventory items:
  // { id: itemId, name: name }
  var collectInventoryItems = function( character )
  {
    return findObjs( { type: Objects.ATTRIBUTE, characterid: character.id } )
      .filter(
        function( object )
        {
          const nameProperty = object.get( Objects.NAME );
          return nameProperty.indexOf( Inventory.PREFIX ) !== -1 
            && nameProperty.indexOf( Inventory.NAME_SUFFIX ) !== -1;
        } )
      .map(
        function( object )
        {
          return { id: extractInventoryItemId( object ), name: object.get( Objects.CURRENT ) };
        } );
  };

  // Pull the inventory itemId from the attribute name
  // names look like: "name":"repeating_inventory_-LvWpXnl3NAAAFNsPg12_itemname"
  // Here the itemId is -LvWpXnl3NAAAFNsPg12
  // Return undefined if no such value exists
  var extractInventoryItemId = function( attribute )
  {
    const fullName = attribute.get( Objects.NAME );
    var regex = new RegExp( Inventory.PREFIX + '(.+?)(?:' + Inventory.NAME_SUFFIX + '|' + Inventory.EQUIPPED_SUFFIX + ')' );
    return regex.exec( fullName ) ? regex.exec( fullName )[ 1 ] : undefined;
  };

  // Return the attribute object holding the specified property
  // Return undefined if property doe not exist
  // Creates the attibute if one does not already exist
  var inventoryItemPropertyAttribute = function( character, itemId, propertySuffix )
  {
    const name = Inventory.PREFIX + itemId + propertySuffix;
    const possibleAttributes = findObjs( { _type: Objects.ATTRIBUTE, characterid: character.id, name: name } );
    return possibleAttributes === 0 ? undefined : possibleAttributes[ 0 ];
  };

  // Return the player id for the first player found that is GM
  // Return undefined when none is available
  var findFirstOnlineGmPlayerId = function()
  {
    return findObjs( { _type: Objects.PLAYER, _online: true } )
      .map( entry => entry.get( Objects._ID ) )
      .find( id => playerIsGM( id ) );
  };

  // Return the first character object with the given name
  var firstCharacterWithName = function( name )
  {
    const matchingCharacters = findObjs( { _type: Objects.CHARACTER, name: name } );
    return matchingCharacters.length == 0
      ? undefined
      : matchingCharacters[ 0 ];
  };

  // Return the character object associated with the given graphic token tokenId
  // Return undefined if no character is available
  var characterObjectFromTokenId = function( tokenId )
  {
    const graphic = getObj( Objects.GRAPHIC, tokenId );
    if ( graphic === undefined ) {
      return undefined;
    }
    return getObj( Objects.CHARACTER, graphic.get( Verbs.REPRESENTS ) );
  };

  // Return the character name associated with tokenId
  // Return 'Unnamed' if name is not available
  var characterNameFromTokenId = function( tokenId )
  {
    const graphic = getObj( Objects.GRAPHIC, tokenId );
    if ( graphic === undefined ) {
      return 'Unnamed (Graphic not found)';
    }
    const character = getObj( Objects.CHARACTER, graphic.get( Verbs.REPRESENTS ) );
    if ( character === undefined ) {
      return 'Unnamed (Character not found)';
    }
    return character.get( Objects.NAME );
  };

  // Generate an input box encoded for use in an anchor tag's href
  var makeComboBox = function( prompt, options )
  {
    return '?{' + prompt + '?|' + options.join( '|' ) + '}';
  };

  // Generate a text input field encoded for use in anchor tag's href
  // Text is prefixed with a space for simpler concatenation
  var makeTextInput = function( prompt, currentValue )
  {
    return '?{' + prompt + '?|' + currentValue + '}';
  };

  // text is a string to appear on the button
  // backgroundColor sets the color of the button but not text
  // href is the action on click of the button
  // width is an optional number of pixels for the button ('px' is appended to the value)
  // padding is an optional number of pixels for the button ('px' is appended to the value)
  var makeChatButton = function( text, backgroundColor, hrefString, width, padding )
  {
    return '<a style="text-align:center; border: 1px solid black; margin: 1px; '
      + 'padding: ' + ( padding === undefined ? '2' : String( padding ) ) + 'px; background-color: '
      + backgroundColor + '; border-radius: 4px; box-shadow: 1px 1px 1px #707070;'
      + ( width === undefined ? '' : ' width: ' + width + 'px;' ) + '" href="' 
      + hrefString + '"><b>' + text + '</b></a>';
  };

  // Return a html string <td> entry enclosing content and having colspan matching columnSpan
  // When columnSpan is undefined, colspan is 1
  // style is optional
  var makeTableCell = function( content, columnSpan, style )
  {
    return '<td colspan="' + ( columnSpan === undefined ? 1 : columnSpan ) + '"'
      + ( style === undefined ? '' : ' style="' + style + '"' ) + '>' + content + '</td>';
  };

  // Assemble an array of cells from makeTableCell into a row, <tr>
  var makeTableRow = function( cells, style )
  {
    return '<tr' + ( style === undefined ? '' : ' style="' + style + '"' ) + '>' + cells.join( '' ) + '</tr>';
  };

  // Assemble a html table from an array of rows from makeTableRow
  var makeTable = function( rows, style )
  {
    return '<table style="' + style + '">' + rows.join( '' ) + '</table>';
  };

  // Helper function that constructs a div html element with a specified style
  // style is placed in quotes after style=
  var makeDiv = function( style, content )
  {
    return '<div style="' + style + '">' + content + '</div>';
  };

  // Return a div shaped like a triangle to act as a <hr>
  var makeHorizontalSpacer = function( color )
  {
    return makeDiv(
      'border: none; border-top: 3px solid transparent; border-bottom: 3px solid transparent; '
        + 'border-left: 195px solid ' + color + '; margin-bottom: 2px; margin-top: 2px;',
      '' );
  };

  // Return header text to place at the top of a menu
  var makeHeader = function( text, color )
  {
    return makeDiv(
      'color: ' + color + '; font-size: 18px; text-align: left; font-variant: small-caps; font-family: Times, serif;',
      text );
  };

  // Return sub header text to place below the header
  var makeSubHeader = function( text )
  {
    return makeDiv(
      'font-size: 11px; line-height: 13px; margin-top: -3px; font-style: italic;',
      text );
  };

  // Fill out a href string for the supplied apiCommand
  // Inputs is an array of strings to join with spaces
  // A sub-command should be placed as the first element of the inputs array
  var makeHrefApiCall = function( apiCommandWithBang, inputs )
  {
    return apiCommandWithBang + ' ' + inputs.join( ' ' );
  };

  // Split the messageStraing on spaces. The first item is the bang api command
  var extractApiTokens = function( messageString )
  {
    return messageString.split( ' ' );
  };

  // Return a menu with body contents and assigned width in pixels
  // 'px' is appended to the value of width
  var makeMenu = function( width, body )
  {
    return makeDiv(
      'width: ' + width + 'px; border: 1px solid black; background-color: #ffffff; padding: 5px;',
      body );
  };

/*
  generateUUID : function() {
    var a = 0;
    var b = [];
    return function () {
        var c = (new Date()).getTime() + 0,
        d = c === a;
        a = c;
        for (var e = new Array(8), f = 7; 0 <= f; f--) {
            e[f] = "-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz".charAt(c % 64);
            c = Math.floor(c / 64);
        }
        c = e.join("");
        if (d) {
            for (f = 11; 0 <= f && 63 === b[f]; f--) {
                b[f] = 0;
            }
            b[f]++;
        }
        else {
            for (f = 0; 12 > f; f++) {
                b[f] = Math.floor(64 * Math.random());
            }
        }
        for (f = 0; 12 > f; f++) {
            c += "-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz".charAt(b[f]);
        }
        return c;
    };
},

generateRowID : function () {
return this.generateUUID()().replace(/_/g, "Z");
}
},

*/

  // Send a chat whisper to the player
  // player is a player object
  // message is a string
  var whisperPlayer = function( player, message )
  {
    sendChat( Announcer, '/w "' + player.get( Objects.DISPLAY_NAME ) + '" ' + message );
  };

  return {
    // string
    Announcer: Announcer,
    // enum
    AbilityScores : AbilityScores,
    // enum
    Coins : Coins,
    // enum
    Events: Events,
    // enum
    Messages : Messages,
    // enum
    Objects : Objects,
    // enum
    Verbs,      
    // function( tokenId )
    characterObjectFromTokenId: characterObjectFromTokenId,
    // function( tokenId )
    characterNameFromTokenId: characterNameFromTokenId,
    // function( attributeCollection )
    cleanAttributeCollection: cleanAttributeCollection,
    // function( character )
    collectInventoryItems: collectInventoryItems,
    // function( character, itemId )
    collectInventoryItemAttributeCollection: collectInventoryItemAttributeCollection,
    // function( attributeCollection )
    collectionIsNotEmpty: collectionIsNotEmpty,
    // function( character, attributeCollection )
    copyCollectionToCharacter: copyCollectionToCharacter,
    // function( messageString )
    extractApiTokens: extractApiTokens,
    // function( name )
    firstCharacterWithName: firstCharacterWithName,
    // function( text, backgroundColor, hrefString, width )
    makeChatButton: makeChatButton,
    // function( prompt, options )
    makeComboBox: makeComboBox,
    // function( text, color )
    makeHeader: makeHeader,
    // function( color )
    makeHorizontalSpacer: makeHorizontalSpacer,
    // function( apiCommandWithBang, inputs )
    makeHrefApiCall: makeHrefApiCall,
    // function( width, body )
    makeMenu: makeMenu,
    // function( text )
    makeSubHeader: makeSubHeader,
    // function( rows, style )
    makeTable: makeTable,
    // function( content, columnSpan )
    makeTableCell: makeTableCell,
    // function( cells )
    makeTableRow: makeTableRow,
    // function( prompt, currentValue )
    makeTextInput: makeTextInput,
    // function( attributeCollection )
    removeAttributes: removeAttributes,
    // function( player, message )
    whisperPlayer: whisperPlayer
  };
} )();

on( "ready", function() { log( 'There be dragons! Utilities initialized.' ); } );
