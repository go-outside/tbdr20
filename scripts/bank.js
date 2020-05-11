
// Provides banking utilities

var tbdBank = tbdBank || ( function() 
{
  'use strict';
  
  const Subcommands = {
    ADD_ACCOUNT : 'addaccount',
    CASH_TRANSACTION : 'cashtransaction',
    CLEAR_ACCOUNTS : 'clearaccounts',
    DEPOSIT_MENU : 'depositmenu',
    MAKE_IT_RAIN : 'makeitrain',
    SELF_BALANCE : 'selfbalance',
    SHARED_BALANCE : 'sharedbalance',
    TRANSFER_ITEM : 'transferitem',
    WITHDRAW_MENU : 'withdrawmenu'
  };

  const TransactionKind = {
    DEPOSIT : 'Deposit',
    WITHDRAW : 'Withdraw'
  };

  const kBankColor = '#00ab5e';
  const kBankCommand = '!bank';
  const kBankCharacterName = 'Bank Ledger';

  // Delegate resolution of chat event
  var handleChatMessage = function( message )
  {
    if ( message.type != Tbdr20.Messages.API ) {
      return;
    }
    const tokens = Tbdr20.extractApiTokens( message.content );
    if ( tokens[ 0 ] != kBankCommand ) {
      return;
    }
    const player = getObj( Tbdr20.Objects.PLAYER, message.playerid );
    if ( tokens.length == 1 ) {
      Tbdr20.whisperPlayer( player, mainMenu( player ) );
    } else if ( tokens.length > 1 ) {
      const subcommand = tokens[ 1 ];
      if ( subcommand == Subcommands.SELF_BALANCE ) {
        doSelfBalance( player, message );
      } else if ( subcommand == Subcommands.SHARED_BALANCE ) {
        const character = Tbdr20.firstCharacterWithName( kBankCharacterName );
        Tbdr20.whisperPlayer( player, accountBalanceDisplay( createCharacterAccount( character ), kBankCharacterName ) );
      } else if ( subcommand == Subcommands.WITHDRAW_MENU || subcommand == Subcommands.DEPOSIT_MENU ) {
        const startTime = Date.now();
        doTransactionMenu( player, message, tokens );
        Tbdr20.whisperPlayer( player, 'Transaction menu time: ' + parseInt( Date.now() - startTime ) + ' ms' );
      } else if ( subcommand == Subcommands.CASH_TRANSACTION ) {
        doCashTransaction( player, tokens );
      } else if ( subcommand == Subcommands.TRANSFER_ITEM ) {
        const startTime = Date.now();
        doItemTransfer( player, tokens );
        Tbdr20.whisperPlayer( player, 'Transfer item time: ' + parseInt( Date.now() - startTime ) + ' ms' );
      } else if ( playerIsGM( player.id ) ) {
        if ( subcommand == Subcommands.ADD_ACCOUNT ) {
          doAddRainAccount( player, message );
          Tbdr20.whisperPlayer( player, mainMenu( player ) );
        } else if ( subcommand == Subcommands.CLEAR_ACCOUNTS ) {
          storeRainAccounts( [] );
          Tbdr20.whisperPlayer( player, mainMenu( player ) );
        } else if ( subcommand == Subcommands.MAKE_IT_RAIN ) {
          doMakeItRain( player, tokens );
          Tbdr20.whisperPlayer( player, mainMenu( player ) );
        }
      }
    }
  };

  var doSelfBalance = function( player, message )
  {
    if ( message.selected !== undefined ) {
      message.selected.forEach( 
        function( token )
        {
          const character = Tbdr20.characterObjectFromTokenId( token._id );
          if ( character === undefined ) {
            Tbdr20.whisperPlayer( player, 'Token is not associated with a character' );
          } else {
            Tbdr20.whisperPlayer( player, accountBalanceDisplay( 
              createCharacterAccount( character ), 
              character.get( Tbdr20.Objects.NAME ) ) );
          }
        } );
    } else {
      Tbdr20.whisperPlayer( player, 'Select a token for balance query.' );
    }
  };

  var doTransactionMenu = function( player, message, tokens )
  {
    const kind = tokens[ 1 ] == Subcommands.WITHDRAW_MENU ? TransactionKind.WITHDRAW : TransactionKind.DEPOSIT;
    if ( message.selected !== undefined && message.selected.length == 1 ) {
      const selectedTokenId = message.selected[ 0 ]._id;
      const destinationCharacter = kind == TransactionKind.WITHDRAW 
        ? Tbdr20.characterObjectFromTokenId( selectedTokenId )
        : Tbdr20.firstCharacterWithName( kBankCharacterName );
      const sourceCharacter = kind == TransactionKind.WITHDRAW 
        ? Tbdr20.firstCharacterWithName( kBankCharacterName )
        : Tbdr20.characterObjectFromTokenId( selectedTokenId );
      if ( sourceCharacter !== undefined && destinationCharacter !== undefined ) {
        Tbdr20.whisperPlayer( player, transactionMenu( kind, sourceCharacter, destinationCharacter ) );
      } else {
        Tbdr20.whisperPlayer( player, 'One or both transaction targets is not associated with a character.' );
      }
    } else {
      Tbdr20.whisperPlayer( player, 'Select a token for bank transaction and try again.' );
    }
  };

  var doCashTransaction = function( player, tokens )
  {
    if ( tokens.length == 9 ) {
      const sourceCharacter = getObj( Tbdr20.Objects.CHARACTER, tokens[ 2 ] );
      const destinationCharacter = getObj( Tbdr20.Objects.CHARACTER, tokens[ 3 ] );
      const transaction = createCashAccount();
      // Token sequence here is paired with cashTransactionInputs
      transaction.pp = parseInt( tokens[ 4 ] );
      transaction.gp = parseInt( tokens[ 5 ] );
      transaction.ep = parseInt( tokens[ 6 ] );
      transaction.sp = parseInt( tokens[ 7 ] );
      transaction.cp = parseInt( tokens[ 8 ] );
      const drawnSourceAccount = tellerTransact( negateAccount( transaction ), createCharacterAccount( sourceCharacter ) );
      const overdraws = overdrawnCoins( drawnSourceAccount );
      if ( overdraws.length > 0 ) {
        Tbdr20.whisperPlayer( player, 'Insufficient funds for transfer: ' + overdraws.join( ', ' ) );
      } else {
        const collectedDestinationAccount = tellerTransact( transaction, createCharacterAccount( destinationCharacter ) );
        updateCharacterFromAccount( destinationCharacter, collectedDestinationAccount );
        updateCharacterFromAccount( sourceCharacter, drawnSourceAccount );
        Tbdr20.whisperPlayer( player, 'Transaction successful. Thank you for banking with ' + Tbdr20.Announcer + '.' );
      }
    } else {
      Tbdr20.whisperPlayer( player, 'Transaction failure. Input formatted incorrectly' );
    }
  };

  // Distribute indicated cash evenly amongst rain accounts
  var doMakeItRain = function( player, tokens )
  {
    const accounts = currentRainAccounts();
    if ( tokens.length == 7 ) {
      const transaction = createCashAccount();
      // Token sequence here is paired with cashTransactionInputs
      transaction.pp = parseInt( tokens[ 2 ] );
      transaction.gp = parseInt( tokens[ 3 ] );
      transaction.ep = parseInt( tokens[ 4 ] );
      transaction.sp = parseInt( tokens[ 5 ] );
      transaction.cp = parseInt( tokens[ 6 ] );
      const rainTrackers = accounts.map(
        function( account )
        {
          const character = getObj( Tbdr20.Objects.CHARACTER, account.characterId );
          return { 
            rainAccount: account, 
            character: character,
            cashAccount: createCashAccount() };
        } ).filter( tracker => tracker.character !== undefined );
      if ( rainTrackers.length == 0 ) {
        Tbdr20.whisperPlayer( player, 'No rain valid accounts are available to accept cash' );
      } else {
        // Sort trackers so account with smallest differential occurs first
        // Remaining coins will be given to characters who have received less
        rainTrackers.sort( ( a, b ) => a.rainAccount.differential - b.rainAccount.differential );
        for ( var key in transaction ) {
          var available = transaction[ key ];
          const remainder = available % rainTrackers.length;
          const fairShare = Math.floor( available / rainTrackers.length );
          rainTrackers.forEach(
            function( tracker, trackerIndex )
            {
              tracker.cashAccount[ key ] += trackerIndex < remainder ? fairShare + 1 : fairShare;
            } );
        }
        var maximumDifferential = 0;
        // rainTrackers keeps a reference to values in accounts array. 
        // Update differentials
        // Add funds to character inventories
        rainTrackers.forEach(
          function( tracker )
          {
            const goldEquivalent = valueInGold( tracker.cashAccount );
            tracker.rainAccount.differential += goldEquivalent;
            maximumDifferential = Math.max( maximumDifferential, tracker.rainAccount.differential );
            updateCharacterFromAccount( 
              tracker.character, 
              tellerTransact( tracker.cashAccount, createCharacterAccount( tracker.character ) ) );
Tbdr20.whisperPlayer( player, tracker.character.get( Tbdr20.Objects.NAME ) + ' received ' + goldEquivalent + ' gp equivalent' );
          } );
        // Drop differentials by maximum value so at least one account hits zero
        accounts.forEach( account => account.differential -= maximumDifferential );
        storeRainAccounts( accounts );
      }
    } else {
      Tbdr20.whisperPlayer( player, 'Invalid make it rain transaction.' );
    }
  };

  var doItemTransfer = function( player, tokens )
  {
    if ( tokens.length == 5 ) {
      const sourceCharacter = getObj( Tbdr20.Objects.CHARACTER, tokens[ 2 ] );
      const destinationCharacter = getObj( Tbdr20.Objects.CHARACTER, tokens[ 3 ] );
      const itemAttributeCollection = Tbdr20.collectInventoryItemAttributeCollection( sourceCharacter, tokens[ 4 ] );
      if ( Tbdr20.collectionIsNotEmpty( itemAttributeCollection ) ) {
        Tbdr20.cleanAttributeCollection( itemAttributeCollection );
        Tbdr20.copyCollectionToCharacter( destinationCharacter, itemAttributeCollection );
        Tbdr20.removeAttributes( itemAttributeCollection );
        Tbdr20.whisperPlayer( player, 'Transfer successful. Thank you for banking with ' + Tbdr20.Announcer + '.' );
      } else {
        Tbdr20.whisperPlayer( player, 'Item transfer failure. Item does not exist' );
      }
    } else {
      Tbdr20.whisperPlayer( player, 'Item transfer failure. Input formatted incorrectly' );
    }
  };

  // Create the main menu
  var mainMenu = function( player )
  {
    const kMenuWidth = 220;
    const kButtonWidth = 200;
    return Tbdr20.makeMenu( kMenuWidth,
      Tbdr20.makeHeader( 'Bank', kBankColor ) 
        + Tbdr20.makeSubHeader( 'Main Menu' )
        + Tbdr20.makeHorizontalSpacer( kBankColor )
        + Tbdr20.makeChatButton( TransactionKind.DEPOSIT, kBankColor, Tbdr20.makeHrefApiCall( kBankCommand, [ Subcommands.DEPOSIT_MENU ] ), kButtonWidth )
        + Tbdr20.makeChatButton( TransactionKind.WITHDRAW, kBankColor, Tbdr20.makeHrefApiCall( kBankCommand, [ Subcommands.WITHDRAW_MENU ] ), kButtonWidth )
        + Tbdr20.makeChatButton( 'Personal Balance', kBankColor, Tbdr20.makeHrefApiCall( kBankCommand, [ Subcommands.SELF_BALANCE ] ), kButtonWidth )
        + Tbdr20.makeChatButton( 'Shared Balance', kBankColor, Tbdr20.makeHrefApiCall( kBankCommand, [ Subcommands.SHARED_BALANCE ] ), kButtonWidth )
        + ( playerIsGM( player.id ) ? makeItRainMenu() : '' )
      );
  };

  // kind describes the potential transaction and is an element of TransactionKind
  var transactionMenu = function( kind, sourceCharacter, destinationCharacter )
  {
    const kMenuWidth = 220;
    const kButtonWidth = 200;
    const cashInputs = cashTransactionInputs( createCharacterAccount( sourceCharacter ), kind );
    const transactCommand = Tbdr20.makeHrefApiCall( kBankCommand,
      [ Subcommands.CASH_TRANSACTION, sourceCharacter.id, destinationCharacter.id ].concat( cashInputs ) );
    const transactButton = Tbdr20.makeChatButton( kind + ' Cash', kBankColor, transactCommand, kButtonWidth );
    return Tbdr20.makeMenu( kMenuWidth,
      [ Tbdr20.makeHeader( kind, kBankColor ),
        Tbdr20.makeHorizontalSpacer( kBankColor ),
        Tbdr20.makeTable( [ Tbdr20.makeTableRow( [ Tbdr20.makeTableCell( transactButton ) ] ) ], '' ),
        Tbdr20.makeHorizontalSpacer( kBankColor ),
        inventoryTable( sourceCharacter, destinationCharacter )
      ].join( '' ) );
  };

  // Return an array of cash transaction inputs for account
  // promptPrefix might be 'Deposit' or 'Withdraw'
  var cashTransactionInputs = function( account, promptPrefix )
  {
    // Coin sequence here is paired with doCashTransaction
    return [ Tbdr20.Coins.PP, Tbdr20.Coins.GP, Tbdr20.Coins.EP, Tbdr20.Coins.SP, Tbdr20.Coins.CP ].map(
      function( coin )
      {
        return Tbdr20.makeTextInput( promptPrefix + ' ' + coin + ' (' + String( account[ coin ] ) + ' max)', 0 );
      } );
  };

  // Generate chat output to display cash balance
  // name is optional
  var accountBalanceDisplay = function( account, name )
  {
    const kMenuWidth = 220;
    const title = name === undefined ? 'Balance' : ( 'Balance for ' + name );
    return Tbdr20.makeMenu( kMenuWidth,
      [ Tbdr20.makeHeader( title, kBankColor ),
        Tbdr20.makeHorizontalSpacer( kBankColor ),
        Tbdr20.makeTable(
          [ Tbdr20.makeTableRow( [ Tbdr20.makeTableCell( String( account.cp ) + ' ' + Tbdr20.Coins.CP ) ] ),
            Tbdr20.makeTableRow( [ Tbdr20.makeTableCell( String( account.sp ) + ' ' + Tbdr20.Coins.SP ) ] ),
            Tbdr20.makeTableRow( [ Tbdr20.makeTableCell( String( account.ep ) + ' ' + Tbdr20.Coins.EP ) ] ),
            Tbdr20.makeTableRow( [ Tbdr20.makeTableCell( String( account.gp ) + ' ' + Tbdr20.Coins.GP ) ] ),
            Tbdr20.makeTableRow( [ Tbdr20.makeTableCell( String( account.pp ) + ' ' + Tbdr20.Coins.PP ) ] ) ],
          '' )
      ].join( '' ) );
  };

  var inventoryTable = function( sourceCharacter, destinationCharacter )
  {
    const kButtonWidth = 50;
    const kButtonPadding = 0;
    const inventory = Tbdr20.collectInventoryItems( sourceCharacter );
    return Tbdr20.makeTable(
      inventory.map( 
        function( item )
        {
          const transferCommand = Tbdr20.makeHrefApiCall( kBankCommand,
            [ Subcommands.TRANSFER_ITEM, sourceCharacter.id, destinationCharacter.id, item.id ] );
          const transferButton = Tbdr20.makeChatButton( 'Transfer', kBankColor, transferCommand, kButtonWidth, kButtonPadding );
          return Tbdr20.makeTableRow( [ 
            Tbdr20.makeTableCell( transferButton ),
            Tbdr20.makeTableCell( item.name, 1, 'text-align: right;' ) ] );
        } ),
      'font-size: 10px; width: 215px' );
  };

  // Create a new account object
  var createCashAccount = function()
  {
    return { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 };
  };

  // Copy the contents of source to destination
  var copyCashAccount = function( source, destination )
  {
    destination.cp = source.cp;
    destination.sp = source.sp;
    destination.ep = source.ep;
    destination.gp = source.gp;
    destination.pp = source.pp;
  };

  // Consolidate the account balance into a fractional gold piece value
  var valueInGold = function( account )
  {
    return 10 * account.pp + account.gp + 0.5 * account.ep + 0.1 * account.sp + 0.01 * account.cp;
  };

  // Return a new account representing goldValue in fewest coins
  var createOptimizedAccount = function( goldValue )
  {
    const account = createCashAccount();
    account.pp = Math.floor( goldValue / 10 );
    goldValue = goldValue - 10 * account.pp;
    account.gp = Math.floor( goldValue );
    goldValue = goldValue - account.gp;
    account.ep = Math.floor( 2 * goldValue );
    goldValue = goldValue - 0.5 * account.ep;
    account.sp = Math.floor( 10 * goldValue );
    goldValue = goldValue - 0.1 * account.sp;
    account.cp = Math.floor( 100 * goldValue );
    return account;
  };

  // Return a new account with negated balances
  var negateAccount = function( account )
  {
    const newAccount = createCashAccount();
    for ( const key in newAccount ) {
      newAccount[ key ] = -account[ key ];
    }
    return newAccount;
  };

  // Add the contents of transaction to account and return as a new account
  // transaction is of account type
  // Positive coin values in transaction imply deposit
  // Negative coin values in transaction imply withdrawal
  var tellerTransact = function( transaction, account )
  {
    const newAccount = createCashAccount();
    for ( const key in newAccount ) {
      newAccount[ key ] = account[ key ] + transaction[ key ];
    }
    return newAccount;
  };

  // Return an array of values and types with negative values
  var overdrawnCoins = function( account )
  {
    const types = [];
    for ( const key in account ) {
      const coinCount = account[ key ];
      if ( coinCount < 0 ) {
        types.push( String( coinCount ) + ' ' + key );
      }
    }
    return types;
  };

  // Create an account object holding coin values for the character
  var createCharacterAccount = function( character )
  {
    const account = createCashAccount();
    if ( character !== undefined ) {
      for ( const key in account ) {
        const maybeValue = getAttrByName( character.id, key );
        const value = maybeValue === undefined ? 0 : parseInt( maybeValue );
        account[ key ] = isNaN( value ) ? 0 : value;
      }
    }
    return account;
  };

  // Assign coin values to character object
  var updateCharacterFromAccount = function( character, account )
  {
    for ( const key in account ) {
      const possibleAttributes = findObjs( { _type: Tbdr20.Objects.ATTRIBUTE, characterid: character.id, name: key } );
      if ( possibleAttributes.length == 1 ) {
        const attribute = possibleAttributes[ 0 ];
        attribute.setWithWorker( { current: account[ key ] } );
      } else {
        createObj( Tbdr20.Objects.ATTRIBUTE, { name: key, characterid: character.id, current: account[ key ] } );
      }
    }
  };

  var makeItRainMenu = function()
  {
    const accounts = currentRainAccounts();
    const kButtonWidth = 200;
    const kTableAndTrStyle = 'width: 200px;';
    return [ 
      Tbdr20.makeHorizontalSpacer( kBankColor ),
      Tbdr20.makeHeader( 'Rain Accounts', kBankColor ),
      Tbdr20.makeHorizontalSpacer( kBankColor ),
      Tbdr20.makeTable( accounts.map(
        function( account )
        {
          const character = getObj( Tbdr20.Objects.CHARACTER, account.characterId );
          const name = character === undefined ? 'Name Unknown' : character.get( Tbdr20.Objects.NAME );
          return Tbdr20.makeTableRow( 
            [ Tbdr20.makeTableCell( name ),
              Tbdr20.makeTableCell( account.differential.toFixed( 2 ), 1, 'text-align: right;' ) ],
              kTableAndTrStyle );
        } ),
        kTableAndTrStyle ),
      Tbdr20.makeChatButton( 'Add Account', kBankColor, Tbdr20.makeHrefApiCall( kBankCommand, [ Subcommands.ADD_ACCOUNT ] ), kButtonWidth ),
      Tbdr20.makeChatButton( 'Clear Accounts', kBankColor, Tbdr20.makeHrefApiCall( kBankCommand, [ Subcommands.CLEAR_ACCOUNTS ] ), kButtonWidth ),
      Tbdr20.makeChatButton( 
        'Make it rain!', 
        kBankColor, 
        Tbdr20.makeHrefApiCall( 
          kBankCommand, 
          [ Subcommands.MAKE_IT_RAIN ].concat( cashTransactionInputs( createCashAccount(), 'Be Generous!' ) ) ), 
        kButtonWidth )
      ].join( '' );
  };

  var doAddRainAccount = function( player, message )
  {
    if ( message.selected !== undefined && message.selected.length > 0 ) {
      const accounts = currentRainAccounts();
      const accountCount = accounts.length;
      message.selected.forEach(
        function( token )
        {
          const character = Tbdr20.characterObjectFromTokenId( token._id );
          if ( character !== undefined ) {
            if ( accounts.findIndex( account => account.characterId === character.id ) == -1 ) {
              // Add the account only if it is not already registered
              accounts.push( createRainAccount( character ) );
            }
          }
        } );
      if ( accountCount != accounts.length ) {
        // Reset the differentials
        accounts.forEach( account => account.differential = 0 );
      }
      storeRainAccounts( accounts );
    } else {
      Tbdr20.whisperPlayer( player, 'Add account failure. Select a token and try again.' );
    }
  };

  // Create a new rain accout to collect funds from "Make It Rain"
  // character is a character object
  // differential is the gp value this account has received less than the maximum rain account
  // A differential value of zero implies this account has received the most funds
  var createRainAccount = function( character )
  {
    return { characterId: character.id, differential: 0 };
  };

  var copyRainAccount = function( account )
  {
    return { characterId: account.characterId, differential: account.differential };
  };

  // Return the array of rain accounts stored in tbdBank state or an empty array if there is no state
  var currentRainAccounts = function()
  {
    if ( state.tbdBank === undefined || state.tbdBank.rainAccounts === undefined ) {
      state.tbdBank = { rainAccounts: [] };
    }
    return state.tbdBank.rainAccounts.map( account => copyRainAccount( account ) );
  };

  // Write the array of rain accounts to tbdBank state
  var storeRainAccounts = function( accounts )
  {
    if ( state.tbdBank === undefined ) {
      state.tbdBank = {};
    }
    state.tbdBank.rainAccounts = accounts.map( account => copyRainAccount( account ) );
  };


  var registerEventHandlers = function()
  {
    if ( Tbdr20 === undefined ) {
      log( 'Could not initialize bank. Tbdr20 missing.' );
    } else {
      on( 'chat:message', handleChatMessage );
      log( 'There be dragons! Bank initialized.' );
    }
	};

  var runTests = function()
  {
  };

  return {
    runTests: runTests,
    registerEventHandlers: registerEventHandlers };
}() );

on( "ready", function() { tbdBank.registerEventHandlers(); } );
