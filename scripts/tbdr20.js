
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
    CAMPAIGN : 'campaign',
    CHARACTER : 'character',
    CONTROLLEDBY : 'controlledby',
    DISPLAY_NAME : 'displayname',
    GM_LAYER : 'gmlayer',
    GRAPHIC : 'graphic',
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
  const Verbs = {
    REPRESENTS : 'represents'
  };
  
  // Return the player id for the first player found that is GM
  // Return undefined when none is available
  var findFirstOnlineGmPlayerId = function()
  {
    return findObjs( { _type: Objects.PLAYER, _online: true } )
      .map( entry => entry.get( Objects._ID ) )
      .find( id => playerIsGM( id ) );
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
  var makeChatButton = function( text, backgroundColor, hrefString, width )
  {
    return '<a style="text-align:center; border: 1px solid black; margin: 1px; padding 2px; background-color: '
      + backgroundColor + '; border-radius: 4px; box-shadow: 1px 1px 1px #707070;'
      + ( width === undefined ? '' : ' width: ' + width + 'px;' ) + '" href="' 
      + hrefString + '">' + text + '</a>';
  };

  // Return a html string <td> entry enclosing content and having colspan matching columnSpan
  // When columnSpan is undefined, colspan is 1
  var makeTableCell = function( content, columnSpan )
  {
    return '<td colspan="' + ( columnSpan === undefined ? 1 : columnSpan ) + '">' + content + '</td>';
  };

  // Assemble an array of cells from makeTableCell into a row, <tr>
  var makeTableRow = function( cells )
  {
    return '<tr>' + cells.join() + '<\tr>';
  };

  // Assemble a html table from an array of rows from makeTableRow
  var makeTable = function( rows, style )
  {
    return '<table style="' + style + '">' + rows.join() + '</table>';
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
  var makeSubHeader = function( text, color )
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
  var makeMenu = function( body, width )
  {
    return makeDiv(
      'width: ' + width + 'px; border: 1px solid black; background-color: #ffffff; padding: 5px;',
      body );
  };


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
    // function( messageString )
    extractApiTokens: extractApiTokens,
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
    // function( body, width )
    makeMenu: makeMenu,
    // function( text, color )
    makeSubHeader: makeSubHeader,
    // function( rows, style )
    makeTable: makeTable,
    // function( content, columnSpan )
    makeTableCell: makeTableCell,
    // function( cells )
    makeTableRow: makeTableRow,
    // function( prompt, currentValue )
    makeTextInput: makeTextInput
  };
} )();

on( "ready", function() { log( 'There be dragons! Utilities initialized.' ); } );
