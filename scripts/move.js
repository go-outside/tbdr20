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
    GMLAYER : 'gmlayer',
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

  const Terrain = {
    DIFFICULT : 'Difficult',
    NORMAL : 'Normal'
  };

  // Return a new mover object
  var createMover = function( graphicId, characterId, playerId, layer, color )
  {
    return { 
      graphicId: graphicId, 
      characterId: characterId, 
      playerId: playerId,
      speed: characterSpeed( characterId ), 
      // An array of map circles generated from circleOnMapAtGraphic
      circles: [], 
      // An array of path ids for decorations placed on page
      circlePathIds: [],
      // Assigns base color for movement graphics
      color: color,
      // Identify layer where move graphics / paths should be drawn
      layer: layer,
      // Assign modifier for movement terrain types
      terrain: Terrain.NORMAL };
  };

  // Create deep copy of source and assign to destination
  // source and destination are objects constructed by createMover
  var copyMover = function( source, destination )
  {
    destination.graphicId = source.graphicId;
    destination.characterId = source.characterId;
    destination.playerId = source.playerId;
    destination.speed = source.speed;
    destination.circles = source.circles.map( circle => copyCircle( circle ) );
    destination.circlePathIds = source.circlePathIds.map( id => id );
    destination.color = source.color;
    destination.layer = source.layer;
    destination.terrain = source.terrain;
  };

  // Return a copy of the current movers array stored in state
  // If no movers are stored, return an empty array
  var currentMovers = function()
  {
    const movers = state.tbdMove !== undefined && state.tbdMove.movers !== undefined
      ? state.tbdMove.movers
      : [];
    // Deep copy the effects array
    return movers.map( 
      function( mover )
      {
        const copy = {};
        copyMover( mover, copy );
        return copy;
      } );
  };

  // Deep copy movers array into state.tbdMove.movers
  var storeMovers = function( movers )
  {
    if ( state.tbdMove === undefined ) {
      state.tbdMove = {};
    }
    state.tbdMove.movers = movers.map( 
      function( mover )
      {
        const copy = {};
        copyMover( mover, copy );
        return copy;
      } );
  };

  // Return the distance multiplier for the given mover
  var distanceMultiplierForTerrain = function( mover )
  {
    return mover.terrain == Terrain.NORMAL ? 1 : 2;
  };

  // Return the mover associated with playerId from movers
  var findMoverByPlayer = function( playerId, movers )
  {
    return movers.find( mover => playerId == mover.playerId );
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
  var showMoveMenu = function( playerId, movers )
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

    const mover = findMoverByPlayer( playerId, movers );
    const remaining = mover === undefined ? '' : ( makeDiv( arrowStyle, '' ) + travelDistanceForUi( mover ) );
    const dash = mover === undefined ? '' : makeDiv( tableStyle, '<a ' + anchorStyle2 + '" href="!move dash">Dash</a>' );
    const terrain = mover === undefined ? '' : makeDiv( tableStyle, '<a ' + anchorStyle2 + '" href="!move terrain">' + mover.terrain + ' Terrain</a>' );
    const start = mover === undefined ? makeDiv( tableStyle, '<a ' + anchorStyle2 + '" href="!move start">Start</a>' ) : '';
    const undo = mover === undefined || mover.circles.length < 2 ? '' : makeDiv( tableStyle, '<a ' + anchorStyle2 + '" href="!move undo">Undo</a>' );
    const ping = mover === undefined ? '' : makeDiv( tableStyle, '<a ' + anchorStyle2 + '" href="!move ping">Ping</a>' );
    const clear = mover === undefined ? '' : makeDiv( tableStyle, '<a ' + anchorStyle2 + '" href="!move clear">Clear</a>' );
    const clearAll = playerIsGM( playerId ) 
      ? ( makeDiv( arrowStyle, '' ) + makeDiv( tableStyle, '<a ' + anchorStyle2 + '" href="!move clearall">Clear All</a>' ) )
      : '';
    const menu = makeDiv(
      divStyle,
      makeDiv( headStyle, 'Movement' )
        + remaining
        + terrain
        + makeDiv( arrowStyle, '' )
        + dash
        + start
        + undo
        + ping
        + clear
        + clearAll );
    const player = getObj( Roll20.Objects.PLAYER, playerId );
    sendChat( Roll20.ANNOUNCER, '/w "' + player.get( Roll20.Objects.DISPLAY_NAME ) + '" ' + menu );
  };


  // Note that newGraphic and oldGraphicProperties are different TYPES of objects. 
  // to work with newGraphic you need to use newGraphic.get("name");
  // to work with oldGraphicProperties you can use oldGraphicProperties["name"];
  var handleGraphicChangeTopOrLeft = function( newGraphic, oldGraphicProperties )
  {
    const movers = currentMovers();
    if ( movers.length > 0 ) {
      const mover = movers.find( mover => newGraphic.get( Roll20.Objects.ID ) == mover.graphicId );
      if ( mover !== undefined ) {
        const graphic = getObj( Roll20.Objects.GRAPHIC, mover.graphicId );
        if ( graphic !== undefined ) {
          addMovementCircle( graphic, mover );
          updateMoverGraphics( graphic, mover );
          showMoveMenu( mover.playerId, movers );
          storeMovers( movers );
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

  // Create a copy of source and return it
  // source is an object generated by circleOnMapAtGraphic
  var copyCircle = function( source )
  {
    return { x: source.x, y: source.y, radius: source.radius };
  };

  // Provides a position for a Roll20 graphic object
  var circleOnMapAtGraphic = function( graphic, mapRadius )
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

  // Clear all script state
  // May be called externally
  var clearAll = function()
  {
    const movers = currentMovers();
    movers.forEach( mover => clearMoverPaths( mover ) );
    storeMovers( [] );
  };

  // Return a list of movers omitting those matching playerId
  var removePlayer = function( playerId, movers )
  {
    return movers.filter(
      function( mover )
      {
        if ( mover.playerId == playerId ) {
          clearMoverPaths( mover );
          return false;
        } else {
          return true;
        }
      } );
  };

  // Return a line path connecting the center of each circle in circles
  // Return undefined if circles has size less than two
  // circles are in canvas coordinates
  // path is created on pageId
  var createTrailGraphic = function( circles, pageId, layer, color )
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
          layer: layer,
          width: maximum.x - minimum.x,
          height: maximum.y - minimum.y,
          stroke: color,
          stroke_width: 4,
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
  var createCircleGraphic = function( circle, pageId, layer, color, strokeWidth )
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
        layer: layer,
        stroke: color,
        stroke_width: strokeWidth,
        path: JSON.stringify( path ) } );
    toFront( circleObject );
    return circleObject.get( Roll20.Objects.ID );
  };

  // Ping a selected mover token and move the controller's view to the ping
  var pingMover = function( mover )
  {
    const graphic = getObj( Roll20.Objects.GRAPHIC, mover.graphicId );
    if ( graphic !== undefined ) {
      sendPing( 
        graphic.get( Roll20.Objects.LEFT ), 
        graphic.get( Roll20.Objects.TOP ), 
        graphic.get( Roll20.Objects.PAGEID ), 
        // Use the player's color for the ping? Seems to be black where it should be a different color
        mover.playerId, 
        // Move player's view to ping
        true,
        // Show the ping to only the player moving the token
        mover.playerId );
    }
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
      canvasLimitCircle.radius /= distanceMultiplierForTerrain( mover );
      mover.circlePathIds.push( createCircleGraphic( canvasLimitCircle, pageId, mover.layer, mover.color, 6 ) );
      canvasLimitCircle.radius += 2;
      mover.circlePathIds.push( createCircleGraphic( canvasLimitCircle, pageId, mover.layer, Roll20.Colors.WHITE, 3 ) );
    }
    const routePathId = createTrailGraphic( 
      mover.circles.map( function( circle ) { return canvasCircleFrom( circle, pageId ); } ),
      pageId,
      mover.layer,
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
    const newCircle = circleOnMapAtGraphic( graphic, 0 );
    if ( mover.circles.length == 0 ) {
      newCircle.radius = mover.speed;
      mover.circles.push( newCircle );
    } else {
      const lastCircle = mover.circles[ mover.circles.length - 1 ];
      if ( lastCircle.radius > 0.0 ) {
        // Allow for movement up to the radius of the last circle
        const dx = newCircle.x - lastCircle.x;
        const dy = newCircle.y - lastCircle.y;
        const distance = Math.sqrt( dx * dx + dy * dy );
        if ( distance > 0.0 ) {
          const terrainMultiplier = distanceMultiplierForTerrain( mover );
          const maximumDistance = lastCircle.radius / terrainMultiplier;
          const permittedDistance = Math.min( distance, maximumDistance );
          // Adjust newCircle to fit permittedDistance
          newCircle.radius = lastCircle.radius - terrainMultiplier * permittedDistance;
          newCircle.x = lastCircle.x + permittedDistance * dx / distance;
          newCircle.y = lastCircle.y + permittedDistance * dy / distance;
          mover.circles.push( newCircle );
        }
      } else {
        // Otherwise move token to prior legal position
        const priorLegalCanvasCircle = canvasCircleFrom( lastCircle, graphic.get( Roll20.Objects.PAGEID ) );
        setGraphicPosition( priorLegalCanvasCircle, graphic );
      }
    }
  }

  // Set the graphic position given the circle in canvas coordinates
  var setGraphicPosition = function( circle, graphic )
  {
    graphic.set( Roll20.Objects.TOP, circle.top );
    graphic.set( Roll20.Objects.LEFT, circle.left );
  };

  // Add a new circle to the list having radius of last plus mover speed
  var addDash = function( mover )
  {
    const graphic = getObj( Roll20.Objects.GRAPHIC, mover.graphicId );
    if ( graphic !== undefined ) {
      if ( mover.circles.length > 0 ) {
        const newCircle = circleOnMapAtGraphic( graphic, mover.circles[ mover.circles.length - 1 ].radius + mover.speed );
        mover.circles.push( newCircle );
        updateMoverGraphics( graphic, mover );
      }
    }
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

  // Toggle the setting for mover.terrain between Terrain.NORMAL and Terrain.DIFFICULT
  var toggleTerrainModifier = function( mover )
  {
    const graphic = getObj( Roll20.Objects.GRAPHIC, mover.graphicId );
    if ( graphic !== undefined ) {
      mover.terrain = mover.terrain == Terrain.NORMAL ? Terrain.DIFFICULT : Terrain.NORMAL;
      updateMoverGraphics( graphic, mover );
    }
  };

  // Create a new mover if graphic and player are a valid combination
  // Remove any mover from originalMovers controlled by that player
  // Return the new list of movers
  var maybeCreateMover = function( playerId, graphicId, originalMovers )
  {
    // Purge any other mover from the movers list that are controlled by playerId
    const newMovers = removePlayer( playerId, originalMovers );
    // Now make the new mover if possible
    const graphic = getObj( Roll20.Objects.GRAPHIC, graphicId );
    if ( graphic !== undefined ) {
      const maybeCharacter = getObj( Roll20.Objects.CHARACTER, graphic.get( Roll20.Verbs.REPRESENTS ) );
      if ( maybeCharacter !== undefined ) {
        const controllers = maybeCharacter.get( Roll20.Objects.CONTROLLEDBY ).split( ',' ).filter( item => item.length > 0 );
        if ( playerIsGM( playerId ) 
          || controllers == Roll20.Objects.ALL 
          || controllers.find( controller => controller == playerId )
        ) {
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
          const mover = createMover( 
            graphicId, 
            maybeCharacter.id, 
            playerId, 
            // Render graphics on the GM layer for tokens with no controllers
            controllers.length == 0 ? Roll20.Objects.GMLAYER : Roll20.Objects.OBJECTS, 
            color );
          addMovementCircle( graphic, mover );
          updateMoverGraphics( graphic, mover );
          newMovers.push( mover );
        }
      }
    }
    return newMovers;
  };

  // If mover has a single move circle, assign the radius for that move circle
  var maybeSetRemainingRadius = function( mover, radius )
  {
    if ( mover.circles.length == 1 ) {
      const graphic = getObj( Roll20.Objects.GRAPHIC, mover.graphicId );
      if ( graphic !== undefined ) {
        mover.speed = Math.max( 0, radius );
        mover.circles = [];
        addMovementCircle( graphic, mover );
        mover.circles[ 0 ].radius = mover.speed;
        updateMoverGraphics( graphic, mover );
      }
    }
  };

  /// Create a mover for the playerId / graphicId pair
  /// Present the move menu to that player
  /// Maybe be called externally
  var startMoveForPlayer = function( playerId, graphicId )
  {
    const movers = maybeCreateMover( playerId, graphicId, currentMovers() );
    showMoveMenu( playerId, movers );
    storeMovers( movers );
  };

  // Delegate resolution of chat event
  var handleChatMessage = function( message )
  {
    if ( message.type === 'api' ) {
      const tokens = message.content.split( ' ' );
      const command = tokens[ 0 ];
      if ( command === '!move' ) {
        if ( tokens.length == 1 ) {
          showMoveMenu( message.playerid, currentMovers() );
        } else {
          const subcommand = tokens[ 1 ];
          if ( subcommand == 'clear' ) {
            const movers = removePlayer( message.playerid, currentMovers() );
            showMoveMenu( message.playerid, movers );
            storeMovers( movers );
          } else if ( subcommand == 'speed' ) {
            if ( tokens.length == 3 ) {
              const movers = currentMovers();
              const mover = findMoverByPlayer( message.playerid, movers );
              if ( mover !== undefined ) {
                maybeSetRemainingRadius( mover, Number( tokens[ 2 ] ) );
                showMoveMenu( message.playerid, movers );
                storeMovers( movers );
              }
            }
          } else if ( subcommand == 'start' ) {
            if ( message.selected !== undefined && message.selected.length == 1 ) {
              startMoveForPlayer( message.playerid, message.selected[ 0 ]._id );
            }
          } else if ( subcommand == 'terrain' ) {
            const movers = currentMovers();
            const mover = findMoverByPlayer( message.playerid, movers );
            if ( mover !== undefined ) {
              toggleTerrainModifier( mover );
              showMoveMenu( message.playerid, movers );
              storeMovers( movers );
            }
          } else if ( subcommand == 'dash' ) {
            const movers = currentMovers();
            const mover = findMoverByPlayer( message.playerid, movers );
            if ( mover !== undefined || mover.circles.length >= 1 ) {
              addDash( mover );
              showMoveMenu( message.playerid, movers );
              storeMovers( movers );
            }
          } else if ( subcommand == 'undo' ) {
            const movers = currentMovers();
            const mover = findMoverByPlayer( message.playerid, movers );
            if ( mover !== undefined || mover.circles.length > 1 ) {
              undoMovement( mover );
              showMoveMenu( message.playerid, movers );
              storeMovers( movers );
            }
          } else if ( subcommand == 'ping' ) {
            const movers = currentMovers();
            const mover = findMoverByPlayer( message.playerid, movers );
            if ( mover !== undefined ) {
              pingMover( mover );
            }
          }
          if ( playerIsGM( message.playerid ) ) {
            if ( subcommand == 'clearall' ) {
              clearAll();
              showMoveMenu( message.playerid, currentMovers() );
            }
          }
        }
      }
    }
  };

  var registerEventHandlers = function()
  {
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
    clearAll: clearAll,
    // takes arguments: playerId, graphicId
    startMoveForPlayer: startMoveForPlayer,
    runTests: runTests,
    registerEventHandlers: registerEventHandlers };
} )();

on( "ready", function() { tbdMove.registerEventHandlers(); } );
