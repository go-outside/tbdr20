
// Provides banking utilities

var tbdBank = tbdBank || ( function() 
{
  'use strict';
  
  const kBankCommand = '!bank';
  const kBalanceSubCommand = 'balance';

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
    if ( tokens.length > 1 ) {
      const subcommand = tokens[ 1 ];
      if ( subcommand == kBalanceSubCommand && message.selected !== undefined ) {
        message.selected.forEach( token => chatAccountBalance( token._id ) );
      }
    }
    sendChat( Tbdr20.Announcer, 'The bank is open' );
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

  // Add the contents of transaction to account and return as a new account
  // transaction is of account type
  // Positive coin values in transaction imply deposit
  // Negative coin values in transaction imply withdrawal
  var makeTransaction = function( transaction, account )
  {
    const newAccount = createCashAccount();
    for ( const key in newAccount ) {
      newAccount[ key ] = account[ key ] + transaction[ key ];
    }
    return newAccount;
  };

  // Return an array of coin types that have negative values
  var overdrawnCoins = function( account )
  {
    const types = [];
    for ( const key in account ) {
      if ( account[ key ] < 0 ) {
        types.push( key );
      }
    }
    return types;
  };

  // Create an account object holding coin values for the character represented by tokenId
  var createCharacterAccount = function( tokenId )
  {
    const account = createCashAccount();
    const character = Tbdr20.characterObjectFromTokenId( tokenId );

    /*
    findObjs( { type: 'attribute', characterid: character.id } ).forEach(
      function( object )
      {
        log( object );
      } );
    */

    if ( character !== undefined ) {
      for ( const key in account ) {
        const maybeValue = getAttrByName( character.id, key );
        const value = maybeValue === undefined ? 0 : parseInt( maybeValue );
        account[ key ] = isNaN( value ) ? 0 : value;
      }
    }
    return account;
  };

  // Create an account from the "Bank Ledger" handout
  var createBankLedgerAccount = function()
  {

  };

  // Write the account value to the "Bank Ledger" handout
  var writeBankLedger = function( account )
  {

  };

  var chatAccountBalance = function( tokenId )
  {
    const account = createCharacterAccount( tokenId );
    sendChat( 
      Tbdr20.Announcer, 
      Tbdr20.characterNameFromTokenId( tokenId ) + ' balance:\n'
        + account.cp + ' cp\n'
        + account.sp + ' sp\n'
        + account.ep + ' gp\n'
        + account.gp + ' ep\n'
        + account.pp + ' pp' );
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
