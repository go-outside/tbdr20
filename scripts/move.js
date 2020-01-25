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
  Roll20.Colors = {
    BLACK : '#000000',
    WHITE : '#FFFFFF'
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
    COLOR : 'color',
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
  var createMover = function( graphicId, characterId, playerId, color )
  {
    return { 
      graphicId: graphicId, 
      characterId: characterId, 
      playerId: playerId,
      speed: characterSpeed( characterId ), 
      // An array of map circles generated from circleOnMap
      circles: [], 
      // An array of path ids for decorations placed on page
      circlePathIds: [],
      // Assigns base color for movement graphics
      color: color };
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

  // Return the remaining travel distance in text or as an input depending on state of mover
  var travelDistanceForUi = function( mover )
  {
    const anchorStyle2 = 'style="text-align:center; border: 1px solid black; margin: 1px; padding: 2px; background-color: ' 
      + blueColor + '; border-radius: 4px;  box-shadow: 1px 1px 1px #707070; width: 75px;';
    const distance = mover.circles[ mover.circles.length - 1 ].radius.toFixed( 0 );
    const centerStyle = 'style="text-align:center;"';
    if ( mover.circles.length == 1 ) {
      return makeDiv( centerStyle, 'Speed: <a ' + anchorStyle2 + '" href="!move speed ?{Speed?|' + distance + '}">' + distance + '</a>' );
    } else if ( mover.circles.length > 1 ) {
      return distance > 0 
        ? makeDiv( centerStyle, 'Remaining: ' + distance )
        : makeDiv( centerStyle, 'Total Distance: ' + ( mover.circles[ 0 ].radius - distance ) )
    } else {
      return '';
    }
  };

  // Show the move control menu
  // playerId is the message.playerid object in a Roll20.Events.CHAT_MESSAGE or it is a mover.playerId
  var showMoveMenu = function( playerId )
  {
    const divStyle = 'style="width: 189px; border: 1px solid black; background-color: #ffffff; padding: 5px;"'
    const tableStyle = 'style="text-align:center;"';
    const arrowStyle = 'style="border: none; border-top: 3px solid transparent; border-bottom: 3px solid transparent; border-left: 195px solid ' 
      + blueColor + '; margin-bottom: 2px; margin-top: 2px;"';
    const headStyle = 'style="color: ' + blueColor + '; font-size: 18px; text-align: left; font-variant: small-caps; font-family: Times, serif;"';
    const subStyle = 'style="font-size: 11px; line-height: 13px; margin-top: -3px; font-style: italic;"';
    const anchorStyle1 = 'style="text-align:center; border: 1px solid black; margin: 1px; padding: 2px; background-color: ' 
      + blueColor + '; border-radius: 4px;  box-shadow: 1px 1px 1px #707070; width: 100px;';
    const anchorStyle2 = 'style="text-align:center; border: 1px solid black; margin: 1px; padding: 2px; background-color: ' 
      + blueColor + '; border-radius: 4px;  box-shadow: 1px 1px 1px #707070; width: 150px;';

    const mover = findMoverByPlayer( playerId );
    const remaining = mover === undefined ? '' : ( makeDiv( arrowStyle, '' ) + travelDistanceForUi( mover ) );
    const undo = mover === undefined || mover.circles.length < 2 ? '' : makeDiv( tableStyle, '<a ' + anchorStyle2 + '" href="!move undo">Undo</a>' );
    const clearAll = playerIsGM( playerId ) ?  makeDiv( tableStyle, '<a ' + anchorStyle2 + '" href="!move clearall">Clear All</a>' ) : '';
    const menu = makeDiv(
      divStyle,
      makeDiv( headStyle, 'Movement' )
        + remaining
        + makeDiv( arrowStyle, '' )
        + makeDiv( tableStyle, '<a ' + anchorStyle2 + '" href="!move start">Start</a>' )
        + undo
        + makeDiv( tableStyle, '<a ' + anchorStyle2 + '" href="!move clear">Clear</a>' )
        + clearAll );
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
          addMovementCircle( graphic, mover );
          updateMoverGraphics( graphic, mover );
          showMoveMenu( mover.playerId );
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
  // pageId identifies the page scale for sizing
  var canvasCircleFrom = function( mapCircle, pageId )
  {
    const page = getObj( Roll20.Objects.PAGE, pageId );
    const scale = Roll20.DistanceUnit / page.get( Roll20.Objects.SCALE_NUMBER );
    return {
      left: scale * mapCircle.x,
      top: scale * mapCircle.y,
      radius: scale * mapCircle.radius };
  };

  // Return a map circle for the provided canvas circle
  // pageId identifies the page scale for sizing
  var mapCircleFrom = function( canvasCircle, pageId )
  {
    const page = getObj( Roll20.Objects.PAGE, pageId );
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
  var clearMoverPaths = function( mover )
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
          clearMoverPaths( mover );
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
      state.tbdMove.movers.forEach( function( mover ) { clearMoverPaths( mover ); } );
    }
    state.tbdMove.movers = [];
  };

  // Clear movers matching the supplied playerId
  var clearPlayer = function( playerId )
  {
    var keepers = [];
    state.tbdMove.movers.forEach(
      function( mover )
      {
        if ( mover.playerId == playerId ) {
          clearMoverPaths( mover );
        } else {
          keepers.push( mover );
        }
      } );
    state.tbdMove.movers = keepers;
  };

  // Return a line path connecting the center of each circle in circles
  // Return undefined if circles has size less than two
  // circles are in canvas coordinates
  // path is created on pageId
  var createCirclePathGraphic = function( circles, pageId, color )
  {
    if ( circles.length > 1 ) {
      const firstCircle = circles[ 0 ];
      const minimum = { x: 1e6, y: 1e6 };
      const maximum = { x: 0, y: 0 };
      const rawPath = circles.map( 
        function( circle ) 
        { 
          const x = circle.left;
          const y = circle.top;
          minimum.x = Math.min( x, minimum.x );
          minimum.y = Math.min( y, minimum.y );
          maximum.x = Math.max( x, maximum.x );
          maximum.y = Math.max( y, maximum.y );
          return { x: x, y: y }; 
        } );
      const path = rawPath.map(
        function( point, pointIndex )
        {
          return [ pointIndex == 0 ? 'M' : 'L', point.x - minimum.x, point.y - minimum.y ];
        } );
      const circleObject = createObj( 
        Roll20.Objects.PATH, 
        { pageid: pageId,
          left: 0.5 * ( minimum.x + maximum.x ),
          top: 0.5 * ( minimum.y + maximum.y ),
          layer: Roll20.Objects.OBJECTS,
          width: maximum.x - minimum.x,
          height: maximum.y - minimum.y,
          stroke: color,
          stroke_width: 2,
          path: JSON.stringify( path ) } );
      toFront( circleObject );
      return circleObject.get( Roll20.Objects.ID );
    } else {
      return undefined;
    }
  };
  
  // Create a new circle and return its graphic id
  // circle is in canvas coordinates
  // circle is created on pageId
  var createCircleGraphic = function( circle, pageId, color, strokeWidth )
  {
    const radius = circle.radius;
    // Magic 'half' radius here is required to create a circular shape
    const halfRadius = 0.55236 * radius;
    const path = [
      [ 'M', -radius, 0 ],
      [ 'C', -radius, -halfRadius, -halfRadius, -radius, 0, -radius ],
      [ 'C', halfRadius, -radius, radius, -halfRadius, radius, 0 ],
      [ 'C', radius, halfRadius, halfRadius, radius, 0, radius ],
      [ 'C', -halfRadius, radius, -radius, halfRadius, -radius, 0 ] ];
    const circleObject = createObj( 
      Roll20.Objects.PATH, 
      { pageid: pageId,
        left: circle.left,
        top: circle.top,
        width: 2 * radius,
        height: 2 * radius,
        layer: Roll20.Objects.OBJECTS,
        stroke: color,
        stroke_width: strokeWidth,
        path: JSON.stringify( path ) } );
    toFront( circleObject );
    return circleObject.get( Roll20.Objects.ID );
  };

  // Clear existing graphics for mover
  // graphic is the Roll20 Object indicated by mover.graphicId and is assume valid
  // Add new graphics to page to represent mover path and remaining distance
  // Modifies mover
  var updateMoverGraphics = function( graphic, mover )
  {
    clearMoverPaths( mover );
    const pageId = graphic.get( Roll20.Objects.PAGEID );
    const lastCircleIndex = mover.circles.length - 1;
    if ( mover.circles.length > 0 && mover.circles[ lastCircleIndex ].radius > 0.0 ) {
      const lastCircle = mover.circles[ lastCircleIndex ];
      const canvasLimitCircle = canvasCircleFrom( lastCircle, pageId );
      mover.circlePathIds.push( createCircleGraphic( canvasLimitCircle, pageId, mover.color, 6 ) );
      canvasLimitCircle.radius += 2;
      mover.circlePathIds.push( createCircleGraphic( canvasLimitCircle, pageId, Roll20.Colors.WHITE, 3 ) );
    }
    const routePathId = createCirclePathGraphic( 
      mover.circles.map( function( circle ) { return canvasCircleFrom( circle, pageId ); } ),
      pageId, 
      mover.color );
    if ( routePathId !== undefined ) {
      mover.circlePathIds.push( routePathId );
    }
  };

  // If graphic has moved or is initially places, add a graphic to the page for the current movement circle
  // Add the graphic id and circle to mover
  // Modifies mover
  var addMovementCircle = function( graphic, mover )
  {
    const pageId = graphic.get( Roll20.Objects.PAGEID );
    const newCircle = circleOnMap( graphic, 0 );
    if ( mover.circles.length == 0 ) {
      newCircle.radius = mover.speed;
      mover.circles.push( newCircle );
    } else {
      const lastCircle = mover.circles[ mover.circles.length - 1 ];
      const dx = newCircle.x - lastCircle.x;
      const dy = newCircle.y - lastCircle.y;
      const distance = Math.sqrt( dx * dx + dy * dy );
      if ( distance > 0.0 ) {
        newCircle.radius = lastCircle.radius - distance;
        mover.circles.push( newCircle );
      }
    }
  }

  // Set the graphic position given the circle in canvas coordinates
  var setGraphicPosition = function( circle, graphic )
  {
    graphic.set( Roll20.Objects.TOP, circle.top );
    graphic.set( Roll20.Objects.LEFT, circle.left );
  };

  // Remove the most recent movement circle. Does not remove the start circle.
  // If movement circle removed, move graphic to circle center of most recent entry
  // Modifies mover
  var undoMovement = function( mover )
  {
    const graphic = getObj( Roll20.Objects.GRAPHIC, mover.graphicId );
    if ( graphic !== undefined ) {
      if ( mover.circles.length > 1 ) {
        mover.circles.pop();
        updateMoverGraphics( graphic, mover );
      }
      if ( mover.circles.length > 0 ) {
        const currentCanvasCircle = canvasCircleFrom( 
          mover.circles[ mover.circles.length - 1 ], 
          graphic.get( Roll20.Objects.PAGEID ) );
        setGraphicPosition( currentCanvasCircle, graphic );
      }
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
          clearMoverPaths( mover );
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
          const player = getObj( Roll20.Objects.PLAYER, playerId );
          var color = player === undefined ? Roll20.Colors.BLACK : player.get( Roll20.Objects.COLOR );
          // -- begin WTF
          // For whatever reason, Roll20 html color strings from player.get() may have less than 6 number characters following the #
          // Path graphics do not support stroke attribute with these truncated values
          // Backfill with 0's
          while ( color.length < 7 ) {
            color = color + '0';
          }
          // -- end WTF
          const mover = createMover( graphicId, maybeCharacter.id, playerId, color );
          addMovementCircle( graphic, mover );
          updateMoverGraphics( graphic, mover );
          state.tbdMove.movers.push( mover );
        }
      }
    }
  };

  // If playerId controls a mover and that mover has a single move circle, assign the radius for that move circle
  var maybeSetRemainingRadius = function( playerId, radius )
  {
    const mover = findMoverByPlayer( playerId );
    if ( mover !== undefined || mover.circles.length == 1 ) {
      mover.circles[ 0 ].radius = Math.max( 0, radius );
      const graphic = getObj( Roll20.Objects.GRAPHIC, mover.graphicId );
      if ( graphic !== undefined ) {
        updateMoverGraphics( graphic, mover );
      }
    }
  };

  // Delegate resolution of chat event
  var handleChatMessage = function( message )
  {
    if ( message.type === 'api' ) {
      const tokens = message.content.split( ' ' );
      const command = tokens[ 0 ];
      if ( command === '!move' ) {
        if ( tokens.length == 1 ) {
          showMoveMenu( message.playerid );
        } else {
          const subcommand = tokens[ 1 ];
          if ( subcommand == 'clear' ) {
            clearPlayer( message.playerid );
            showMoveMenu( message.playerid );
          } else if ( subcommand == 'speed' ) {
            if ( tokens.length == 3 ) {
              maybeSetRemainingRadius( message.playerid, Number( tokens[ 2 ] ) );
              showMoveMenu( message.playerid );
            }
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
          if ( playerIsGM( message.playerid ) ) {
            if ( subcommand == 'clearall' ) {
              clearAll();
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
