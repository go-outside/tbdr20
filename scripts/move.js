// Assists players with movement

var tbdMove = tbdMove || ( function() 
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
    SPEED : 'speed',
    NPC_SPEED : 'npc_speed',
    STRENGTH : 'strength',
    WISDOM : 'wisdom'
  };
  Roll20.Events = {
    CHAT_MESSAGE : 'chat:message',
    CHANGE_CAMPAIGN_TURNORDER : 'change:campaign:turnorder',
    CHANGE_GRAPHIC : 'change:graphic',
    CHANGE_GRAPHIC_TOP : 'change:graphic:top',
    CHANGE_GRAPHIC_LEFT : 'change:graphic:left'
  };
  Roll20.Messages = {
    API : 'api'
  };
  Roll20.Objects = {
    ALL : 'all',
    CAMPAIGN : 'campaign',
    CHARACTER : 'character',
    CONTROLLEDBY : 'controlledby',
    DISPLAY_NAME : 'displayname',
    GRAPHIC : 'graphic',
    ID : 'id',
    LEFT : 'left',
    MACRO : 'macro',
    NAME : 'name',
    OBJECTS : 'objects',
    PAGE : 'page',
    PAGEID : 'pageid',
    PATH : 'path',
    PLAYER : 'player',
    SCALE_NUMBER : 'scale_number',
    SCALE_UNITS : 'scale_units',
    STATUS : 'status_',
    TEXT : 'text',
    TOP : 'top',
    TOKEN : 'token ',
    TURN_ORDER : 'turnorder'
  };
  Roll20.DistanceUnit = 70;
  Roll20.Verbs = {
    REPRESENTS : 'represents'
  };

  // Return a new mover object
  var createMover = function( graphicId, characterId, playerId )
  {
    return { 
      graphicId: graphicId, 
      characterId: characterId, 
      playerId: playerId,
      speed: characterSpeed( characterId ), 
      // An array of map circles generated from circleOnMap
      circles: [], 
      // An array of path ids for decorations placed on page
      circlePathIds: [] };
  };

  // Return the mover associated with playerId
  var findMoverByPlayer = function( playerId )
  {
    return state.tbdMove.movers.find( mover => playerId == mover.playerId );
  };

  // Helper function that constructs a div html element with a specified style
  var makeDiv = function( style, content )
  {
    return '<div ' + style + ' >' + content + '</div>';
  };

  // Show the move control menu
  // playerId is the message.playerid object in a Roll20.Events.CHAT_MESSAGE or it is a mover.playerId
  var showMoveMenu = function( playerId )
  {
    const divStyle = 'style="width: 189px; border: 1px solid black; background-color: #ffffff; padding: 5px;"'
    const tableStyle = 'style="text-align:center;"';
    const arrowStyle = 'style="border: none; border-top: 3px solid transparent; border-bottom: 3px solid transparent; border-left: 195px solid ' + blueColor + '; margin-bottom: 2px; margin-top: 2px;"';
    const headStyle = 'style="color: ' + blueColor + '; font-size: 18px; text-align: left; font-variant: small-caps; font-family: Times, serif;"';
    const subStyle = 'style="font-size: 11px; line-height: 13px; margin-top: -3px; font-style: italic;"';
    const anchorStyle1 = 'style="text-align:center; border: 1px solid black; margin: 1px; padding: 2px; background-color: ' + blueColor + '; border-radius: 4px;  box-shadow: 1px 1px 1px #707070; width: 100px;';
    const anchorStyle2 = 'style="text-align:center; border: 1px solid black; margin: 1px; padding: 2px; background-color: ' + blueColor + '; border-radius: 4px;  box-shadow: 1px 1px 1px #707070; width: 150px;';

    const mover = findMoverByPlayer( playerId );
    const remaining = mover === undefined ? '' : ( makeDiv( arrowStyle, '' ) + 'Remaining: ' + mover.circles[ mover.circles.length - 1 ].radius.toFixed( 0 ) );
    const undo = mover === undefined || mover.circles.length < 2 ? '' : makeDiv( tableStyle, '<a ' + anchorStyle2 + '" href="!move undo">Undo</a>' );
    const menu = makeDiv(
      divStyle,
      makeDiv( headStyle, 'Movement' )
        + remaining
        + makeDiv( arrowStyle, '' )
        + makeDiv( tableStyle, '<a ' + anchorStyle2 + '" href="!move start">Start</a>' )
        + undo
        + makeDiv( tableStyle, '<a ' + anchorStyle2 + '" href="!move clear">Clear</a>' ) );
    const player = getObj( Roll20.Objects.PLAYER, playerId );
    sendChat( Roll20.ANNOUNCER, '/w "' + player.get( Roll20.Objects.DISPLAY_NAME ) + '" ' + menu );
  };


  // Note that newGraphic and oldGraphicProperties are different TYPES of objects. 
  // to work with newGraphic you need to use newGraphic.get("name");
  // to work with oldGraphicProperties you can use oldGraphicProperties["name"];
  var handleGraphicChangeTopOrLeft = function( newGraphic, oldGraphicProperties )
  {
    if ( state.tbdMove.movers.length > 0 ) {
      const mover = state.tbdMove.movers.find( mover => newGraphic.get( Roll20.Objects.ID ) == mover.graphicId );
      if ( mover !== undefined ) {
        const graphic = getObj( Roll20.Objects.GRAPHIC, mover.graphicId );
        if ( graphic !== undefined ) {
          const lastCircle = mover.circles[ mover.circles.length - 1 ];
          const newCircle = circleOnMap( graphic, 0 );
          const dx = newCircle.x - lastCircle.x;
          const dy = newCircle.y - lastCircle.y;
          if ( Math.abs( dx ) > 0 || Math.abs( dy ) > 0 ) {
            const distance = Math.sqrt( dx * dx + dy * dy );
            addMovementCircle( graphic, mover, lastCircle.radius - distance );
            showMoveMenu( mover.playerId );
          }
        }
      }
    }
  };

  // Return the maximum of SPEED or NPC_SPEED or zero
  var characterSpeed = function( characterId )
  {
    const speed = parseFloat( getAttrByName( characterId, Roll20.AbilityScores.SPEED ) );
    const npcSpeed = parseFloat( getAttrByName( characterId, Roll20.AbilityScores.NPC_SPEED ) );
    // Protect against parse errors...
    return isNaN( speed )
      ? ( isNaN( npcSpeed ) ? 0 : Math.max( 0, npcSpeed ) )
      : ( isNaN( npcSpeed ) ? Math.max( 0, speed ) : Math.max( 0, Math.max( speed, npcSpeed ) ) );
  };

  // Return a canvas circle for the current map circle.
  // graphic is a Roll20 object used to obtain the page
  // Assume graphic is valid and is linked to a valid page
  var canvasCircleFrom = function( mapCircle, graphic )
  {
    const page = getObj( Roll20.Objects.PAGE, graphic.get( Roll20.Objects.PAGEID ) );
    const scale = Roll20.DistanceUnit / page.get( Roll20.Objects.SCALE_NUMBER );
    return {
      left: scale * mapCircle.x,
      top: scale * mapCircle.y,
      radius: scale * mapCircle.radius };
  };

  // Return a map circle for the provided canvas circle
  // graphic is a Roll20 object used to obtain the page
  // Assume graphic is valid and is linked to a valid page
  var mapCircleFrom = function( canvasCircle, graphic )
  {
    const page = getObj( Roll20.Objects.PAGE, graphic.get( Roll20.Objects.PAGEID ) );
    const scale = page.get( Roll20.Objects.SCALE_NUMBER ) / Roll20.DistanceUnit;
    return {
      x: scale * canvasCircle.left,
      y: scale * canvasCircle.top,
      radius: scale * canvasCircle.radius };
  };

  // Provides a position for a Roll20 graphic object
  var circleOnMap = function( graphic, mapRadius )
  {
    const page = getObj( Roll20.Objects.PAGE, graphic.get( Roll20.Objects.PAGEID ) );
    const scale = page.get( Roll20.Objects.SCALE_NUMBER ) / Roll20.DistanceUnit;
    return { 
      x: scale * parseFloat( graphic.get( Roll20.Objects.LEFT ) ), 
      y: scale * parseFloat( graphic.get( Roll20.Objects.TOP ) ),
      radius: mapRadius };
  };

  // Remove any graphical or state circlePathIds associated with mover
  var clearMoverCircleGraphics = function( mover )
  {
    mover.circlePathIds.forEach( 
      function( circlePathId )
      {
        const circleGraphic = getObj( Roll20.Objects.PATH, circlePathId );
        if ( circleGraphic !== undefined ) {
          circleGraphic.remove();
        }
      } );
    mover.circlePathIds = [];
  };

  // Remove all movers without a representative graphic on the campaign page
  var purgeAll = function()
  {
    var keepers = [];
    state.tbdMove.movers.forEach(
      function( mover )
      {
        const graphic = getObj( Roll20.Objects.GRAPHIC, mover.graphicId );
        if ( graphic === undefined ) {
          clearMoverCircleGraphics( mover );
        } else {
          keepers.push( mover );
        }
      } );
    state.tbdMove.movers = keepers;
  };

  // Clear all script state
  var clearAll = function()
  {
    if ( state.tbdMove.movers !== undefined ) {
      state.tbdMove.movers.forEach( function( mover ) { clearMoverCircleGraphics( mover ); } );
    }
    state.tbdMove.movers = [];
  };

  // Create a new circle and return its graphic id
  // circle is in canvas coordinates
  // circle is created on same pageid as graphic
  var createCircleGraphic = function( circle, graphic )
  {
    const radius = circle.radius;
    // 0, 0.22382, 0.5, 0.77614, 1
    // 1.0 - 2.0 * 0.22382
    const halfRadius = 0.55236 * radius;
    const path = [
      [ 'M', -radius, 0 ],
      [ 'C', -radius, -halfRadius, -halfRadius, -radius, 0, -radius ],
      [ 'C', halfRadius, -radius, radius, -halfRadius, radius, 0 ],
      [ 'C', radius, halfRadius, halfRadius, radius, 0, radius ],
      [ 'C', -halfRadius, radius, -radius, halfRadius, -radius, 0 ] ];
    const circleObject = createObj( 
      Roll20.Objects.PATH, 
      { pageid: graphic.get( Roll20.Objects.PAGEID ),
        left: circle.left,
        top: circle.top,
        width: 2 * radius,
        height: 2 * radius,
        layer: Roll20.Objects.OBJECTS,
        stroke_width: 2,
        path: JSON.stringify( path ) } );
    toFront( circleObject );
    return circleObject.get( Roll20.Objects.ID );
  };

  // Add a graphic to the page for the current movement circle
  // Add the graphic id and circle to mover
  var addMovementCircle = function( graphic, mover, remainingMovement )
  {
    const circle = circleOnMap( graphic, remainingMovement );
    mover.circles.push( circle );
    if ( circle.radius > 0 ) {
      mover.circlePathIds.push( createCircleGraphic( canvasCircleFrom( circle, graphic ), graphic ) );
    }
  };

  // Set the graphic position given the circle in canvas coordinates
  var setGraphicPosition = function( circle, graphic )
  {
    graphic.set( Roll20.Objects.TOP, circle.top );
    graphic.set( Roll20.Objects.LEFT, circle.left );
  };

  // Remove the most recent movement circle. Does not remove the start circle.
  // If movement circle removed, move graphic to circle center of most recent entry
  var undoMovement = function( mover )
  {
    const graphic = getObj( Roll20.Objects.GRAPHIC, mover.graphicId );
    if ( graphic !== undefined ) {
      if ( mover.circles.length > 1 ) {
        mover.circles.pop();
        if ( mover.circlePathIds.length > mover.circles.length ) {
          const circlePathId = mover.circlePathIds.pop();
          const circleGraphic = getObj( Roll20.Objects.PATH, circlePathId );
          if ( circleGraphic !== undefined ) {
            circleGraphic.remove();
          }
        }
      }
      const currentCanvasCircle = canvasCircleFrom( mover.circles[ mover.circles.length - 1 ], graphic );
      setGraphicPosition( currentCanvasCircle, graphic );
    }
  };

  // Create a new mover if graphic and player are a valid combination
  // Append onto state.tbdMove.movers
  var maybeCreateMover = function( playerId, graphicId )
  {
    // Purge any other mover from the movers list that are controlled by playerId
    const originalMovers = state.tbdMove.movers;
    state.tbdMove.movers = [];
    originalMovers.forEach(
      function( mover )
      {
        if ( mover.playerId == playerId ) {
          clearMoverCircleGraphics( mover );
        } else {
          state.tbdMove.movers.push( mover );
        }
      } );
    // Now make the new mover if possible
    const graphic = getObj( Roll20.Objects.GRAPHIC, graphicId );
    if ( graphic !== undefined ) {
      const controllers = graphic.get( Roll20.Objects.CONTROLLEDBY ).split( ',' );
      if ( playerIsGM( playerId ) 
        || controllers == Roll20.Objects.ALL 
        || controllers.find( controller => controller == playerId )
      ) {
        const maybeCharacter = getObj( Roll20.Objects.CHARACTER, graphic.get( Roll20.Verbs.REPRESENTS ) );
        if ( maybeCharacter !== undefined ) {
          const mover = createMover( graphicId, maybeCharacter.id, playerId );
          addMovementCircle( graphic, mover, mover.speed );
          state.tbdMove.movers.push( mover );
        }
      }
    }
  };

  // Delegate resolution of chat event
  var handleChatMessage = function( message )
  {
    if ( message.type === 'api' ) {
      const tokens = message.content.split( ' ' );
      const command = tokens[ 0 ];
      if ( playerIsGM( message.playerid ) ) {
        // Add clear all graphics option
      }
      if ( command === '!move' ) {
        if ( tokens.length == 1 ) {
          showMoveMenu( message.playerid );
        } else {
          const subcommand = tokens[ 1 ];
          if ( subcommand == 'clear' ) {
            clearAll();
            showMoveMenu( message.playerid );
          } else if ( subcommand == 'start' ) {
            if ( message.selected !== undefined && message.selected.length == 1 ) {
              maybeCreateMover( message.playerid, message.selected[ 0 ]._id );
              showMoveMenu( message.playerid );
            }
          } else if ( subcommand == 'undo' ) {
            const mover = findMoverByPlayer( message.playerid );
            if ( mover !== undefined || mover.circles.length > 1 ) {
              undoMovement( mover );
              showMoveMenu( message.playerid );
            }
          }
        }
      }
    }
  };

  var registerEventHandlers = function()
  {
    if ( state.tbdMove === undefined ) {
      state.tbdMove = {};
      state.tbdMove.movers = [];
    }
    clearAll();

    on( Roll20.Events.CHAT_MESSAGE, handleChatMessage );
    on( Roll20.Events.CHANGE_GRAPHIC_TOP, handleGraphicChangeTopOrLeft );
    on( Roll20.Events.CHANGE_GRAPHIC_LEFT, handleGraphicChangeTopOrLeft );
    log( 'There be dragons! Move initialized.' );
	};

  var runTests = function()
  {
  };

  return {
    runTests: runTests,
    registerEventHandlers: registerEventHandlers };
}() );

on( "ready", function() { tbdMove.registerEventHandlers(); } );
