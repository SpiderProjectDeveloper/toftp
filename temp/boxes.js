var	_blackOutBoxDiv=null;

var	_messageBoxDiv=null;
var	_messageBoxTextDiv=null;

var	_confirmationBoxDiv=null;
var	_confirmationBoxTextDiv=null;
var _confirmationBoxOk=null;
var _confirmationBoxCancel=null;

var	_editBoxDiv=null;
var	_editBoxDetailsElem=null;
var _editBoxDateFieldCurrentlyBeingEdited=null;


function displayConfirmationBox( message, okFunction=null ) {
	_blackOutBoxDiv = document.getElementById("blackOutBox");
	_confirmationBoxDiv = document.getElementById("confirmationBox");
	_confirmationBoxTextDiv = document.getElementById("confirmationBoxText");
	_confirmationBoxOk = document.getElementById("confirmationBoxOk");
	_confirmationBoxCancel = document.getElementById("confirmationBoxCancel");

	_blackOutBoxDiv.style.display='block';	
	_blackOutBoxDiv.onclick = hideConfirmationBox;
	_confirmationBoxDiv.style.display = 'table';
	_confirmationBoxTextDiv.innerHTML = message;
	if( okFunction === null ) {
		_confirmationBoxCancel.style.visibility = 'hidden';
		_confirmationBoxOk.onclick = hideConfirmationBox;
	} else {
		_confirmationBoxCancel.style.visibility = 'visible';
		_confirmationBoxCancel.onclick = hideConfirmationBox;
		_confirmationBoxOk.onclick = function() { hideConfirmationBox(); okFunction(); };
	}
}

function hideConfirmationBox() {
	_blackOutBoxDiv.style.display='none';	
	_blackOutBoxDiv.onclick = null;
	_confirmationBoxDiv.style.display = 'none';
}

function displayMessageBox( message ) {
	_blackOutBoxDiv = document.getElementById("blackOutBox");
	_messageBoxDiv = document.getElementById("messageBox");
	_messageBoxTextDiv = document.getElementById("messageBoxText");

	_blackOutBoxDiv.style.display='block';	
	_messageBoxDiv.style.display = 'table';
	_messageBoxTextDiv.innerHTML = message;
}

function hideMessageBox() {
	_blackOutBoxDiv.style.display='none';	
	_messageBoxDiv.style.display = 'none';
}

function displayEditBox() {
	_blackOutBoxDiv.style.display='block';	
	_editBoxDiv.style.display = 'table';
}
function hideEditBox() {
	_blackOutBoxDiv.style.display='none';	
	_editBoxDiv.style.display = 'none';
	document.getElementById('editBoxMessage').innerText = '';			
	calendarCancel();
}


function createEditBoxInputs() {
	_blackOutBoxDiv = document.getElementById("blackOutBox");
	_editBoxDiv = document.getElementById('editBox');			
	_editBoxDetailsElem = document.getElementById('editBoxDetails');			

	let container = document.getElementById('editBoxInputs');
	if( !container ) {
		return;
	}
	container.style.height = '100%';
	for( let iE = 0 ; iE < _data.editables.length ; iE++ ) {
		let ref = _data.editables[iE].ref;
		let promptDiv = document.createElement('div');
		promptDiv.id = 'editBoxInputPrompt' + ref;
		promptDiv.innerText = _data.editables[iE].name; // _texts[_lang][ref];
		promptDiv.className = 'editBoxPrompt';

		let input;
		if( _data.editables[iE].type == 'text' ) {
			input = document.createElement('textarea');
			input.rows = 4;
		} else {
			input = document.createElement('input');			
			input.setAttribute('type', 'text');
		}
		input.className = 'editBoxInput';
		input.id = 'editBoxInput' + ref;
		input.onblur = function(e) { // To make sure data entered are valid...
			let v = validateEditField( input, _data.editables[iE].type );
			if( !v.ok ) {
				document.getElementById('editBoxMessage').innerText = v.message;
				input.focus();				
			}
		};

		if( _data.editables[iE].type == 'datetime' ) {
			let calendarContainer = document.createElement('div');
			calendarContainer.style.marginBottom = '4px';
			let callCalendar = document.createElement('div');
			callCalendar.style.float = 'left';
			callCalendar.style.cursor = 'pointer';
			callCalendar.appendChild( document.createTextNode('☷') );
			callCalendar.onclick = function(e) { callCalendarForEditBox(input, calendarContainer, iE); }
			container.appendChild(callCalendar);
			container.appendChild(promptDiv);
			container.appendChild(input);		
			container.appendChild(calendarContainer);
		} else {
			container.appendChild(promptDiv);
			container.appendChild(input);		
		}
	}

	_editBoxDiv.addEventListener( "keyup", onEditBoxKey );
	window.addEventListener( "keyup", onEditBoxKey );
}

function onEditBoxKey(event) {
	if( _editBoxDiv.style.display !== 'none' ) {
		event.preventDefault();
		if( event.keyCode == 27 ) {
			hideEditBox();
		}			
	}
}


function callCalendarForEditBox( input, container, indexInEditables ) {
	let d = parseDate( input.value );
	if( d !== null ) {
		_editBoxDateFieldCurrentlyBeingEdited = input;
		setCalendarFormat( _data.editables[indexInEditables].format );	// '1' - date and time, '0' - date only
		calendar( container, updateEditBoxWithCalendarChoice, 20, 20, d.date, _texts[_lang].monthNames );
	}
}

function updateEditBoxWithCalendarChoice(d) {
	if( d !== null ) {
		let flag;
		if( getCalendarFormat() == 0 ) { // Date only
			flag = true;
		} else {
			flag = false;
		}
		_editBoxDateFieldCurrentlyBeingEdited.value = dateIntoSpiderDateString( d, flag );
	}
}


var _editBoxOperationIndex = -1;

// Displaying data related to an operation in the edit box 
function displayEditBoxWithData( id ) {
	if( _lockDataDisabled ) {
		displayConfirmationBox(_texts[_lang].noConnectionWithServerMessage );
		return;
	} else if( !_lockDataOn ) {
		displayConfirmationBox( 
			_texts[_lang].dataNotLockedMessage, 
			function() { 
				lockData( 1, 
					function(status) { 
						lockDataSuccessFunction(status); 
						if(_lockDataOn) { 
							displayEditBoxWithData(id); 
						} 
					}, 
					lockDataErrorFunction ); 
			} );
			return;
	}

	let i = id.getAttributeNS(null, 'data-i');
	_editBoxDetailsElem.innerHTML = formatTitleTextContent(i,true);
	_editBoxOperationIndex = i;
	for( let iE = 0 ; iE < _data.editables.length ; iE++ ) { // For every editable field...
		let ref = _data.editables[iE].ref;
		let elem = document.getElementById( "editBoxInput" + ref ); // An element to input new value into
		if( elem ) {
			let valueSet = false;
			if( 'userData' in _data.operations[i] ) {
				if( ref in _data.operations[i].userData ) {
					elem.value = _data.operations[i].userData[ ref ];
					valueSet = true;
				}
			}
			if( !valueSet ) {
				elem.value = _data.operations[i][ ref ];
			}
		}
	}
	displayEditBox();
}


function saveUserDataFromEditBox() {
	// Validating all the data are entered correctly...
	for( let iE = 0 ; iE < _data.editables.length ; iE++ ) {
		let ref = _data.editables[iE].ref;
		let input = document.getElementById('editBoxInput' + ref);
		let v = validateEditField( input, _data.editables[iE].type );
		if( !v.ok ) {
			document.getElementById('editBoxMessage').innerText = v.message;
			input.focus();				
			return; // If invalid data found - nothing happens...
		}
	}

	var xmlhttp = new XMLHttpRequest();
	xmlhttp.onreadystatechange = function() {
	    if (this.readyState == 4 ) {
	    	if( this.status == 200 ) {
		        if( this.responseText == "ok" ) {
		        	let i = _editBoxOperationIndex;
		    		if( !('userData' in _data.operations[i]) ) {
						_data.operations[i].userData = {};
					}
					for( let iE = 0 ; iE < _data.editables.length ; iE++ ) { // For all editable fields in the table...
						let ref = _data.editables[iE].ref;
						let elem = document.getElementById( 'editBoxInput' + ref ); // ... retrieving the element that stores a new value.
						_data.operations[i].userData[ ref ] = elem.value; // Reading the value (possibly) changed.
						for( let col = 0 ; col < _data.table.length ; col++ ) { // Changing the value in the table...
							if( _data.table[col].ref == ref ) {
								writeNewValueFromInputElemIntoTable( elem.value, i, col, ref );								
								break;
							}
						}
					}
			        document.getElementById('ganttGroupTitle'+i).textContent = formatTitleTextContent(i); 
			        hideEditBox();
					ifSynchronizedCheck();
		        } else {
		        	document.getElementById('editBoxMessage').innerText = _texts[_lang].errorLoadingData + ": " + this.responseText;
		        }
		    }
	    }
	};

	let bEdited = false; // The following is to confirm something has been edited...
	for( let iE = 0 ; iE < _data.editables.length ; iE++ ) {
		let ref = _data.editables[iE].ref;
		let elem = document.getElementById( 'editBoxInput' + ref );
		if( elem ) {
			if( !('userData' in _data.operations[_editBoxOperationIndex]) )	{
				if( elem.value != _data.operations[_editBoxOperationIndex][ref] ) {
					bEdited = true;
					break;
				}
			} else {
				if( elem.value != _data.operations[_editBoxOperationIndex].userData[ref] ) {
					bEdited = true;
					break;
				}
			}
		}
	}		
	if( !bEdited ) {
		hideEditBox();
		return;
	} 

	let userData = createUserDataObjectToSendAfterEditingInBox(_editBoxOperationIndex);
	if( userData.length > 0 ) {
		xmlhttp.open("POST", _files.userDataSave, true);
		xmlhttp.setRequestHeader("Cache-Control", "no-cache");
		//xmlhttp.setRequestHeader('X-Requested-With', 'XMLHttpRequest');		
		//xmlhttp.setRequestHeader('Content-type', 'application/json');		
		//xmlhttp.setRequestHeader("Content-type", "plain/text" ); //"application/x-www-form-urlencoded");
		xmlhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
		xmlhttp.send( "data=" + JSON.stringify(userData) );		
		//xmlhttp.send( JSON.stringify(userData) );		
		document.getElementById('editBoxMessage').innerText = _texts[_lang].waitSaveUserDataText; // Displaying the "wait" message. 
	}
}


function validateEditField( input, type, allowedEmpty=true ) {
	let r = { ok:false, message:'ERROR!' };

	let value = input.value;

	if( allowedEmpty ) {
		let pattern = new RegExp("[^ ]");
		if( !pattern.test(value) ) {
			r.ok = true;
			r.message = 'EMPTY';
			return r;
		}
	}

	if( type === 'datetime' ) {
		let pattern = new RegExp("[^ \\:\\.\\-0-9\\\\]");
    	let illegalCharacters = pattern.test(value);
    	if( illegalCharacters ) { 
    		r.message = _texts[_lang].datetimeError;
    		return r;
    	}		
		let d = parseDate(value);
		if( d == null ) {
    		r.message = _texts[_lang].datetimeError;
			return r;
		}
	} else if( type === 'int' ) {
		let pattern = new RegExp("[^ 0-9]");
    	let illegalCharacters = pattern.test(value);
    	if( illegalCharacters ) { 
    		r.message = _texts[_lang].intError;    		
    		return r;
    	}		
    	if( isNaN( parseInt(value) ) ) {
    		r.message = _texts[_lang].intError;    		
    		return r;
    	}
	} else if( type === 'float' ) {
		let pattern = new RegExp("[^ \\.0-9]");
    	let illegalCharacters = pattern.test(value);
    	if( illegalCharacters ) { 
    		r.message = _texts[_lang].floatError;    		
    		return r;
    	}		
    	if( isNaN( parseFloat(value) ) ) {
    		r.message = _texts[_lang].floatError;    		
    		return r;
    	}
	}
	r.ok = true;
	r.message = 'Ok';
	return r;
}

var _editField = null;
var _editFieldInput = null;
var _editFieldOldValue = null;
var _editFieldOperationIndex = -1;
var _editFieldRef = null;
var _editFieldCol = null;
var _editFieldType = null;
var _editFieldChangesVolRestTo = null;
var _editFieldChangesVolDoneTo = null;
var _editFieldChangesDurRestTo = null;
var _editFieldChangesDurDoneTo = null;
var _editFieldCallCalendar = null;


function displayEditField( id ) {
	if( _lockDataDisabled ) {
		displayConfirmationBox(_texts[_lang].noConnectionWithServerMessage );
		return;
	} else if( !_lockDataOn ) {
		displayConfirmationBox( 
			_texts[_lang].dataNotLockedMessage, 
			function() { 
				lockData( 1, 
					function(status) { 
						lockDataSuccessFunction(status); 
						if(_lockDataOn) { 
							displayEditField(id); 
						} 
					}, 
					lockDataErrorFunction ); 
			} );
			return;
	}

	_blackOutBoxDiv.style.display='block';	

	let i = id.getAttributeNS(null, 'data-i');
	let col = id.getAttributeNS(null,'data-col');
	let ref = _data.table[col].ref;
	_editFieldType = id.getAttributeNS(null,'data-type');
	let value = null;
	if( 'userData' in _data.operations[i] ) {
		if( ref in _data.operations[i].userData ) {
			value = _data.operations[i].userData[ ref ];
		}
	}
	if( !value ) {
		value = _data.operations[i][ ref ];
	}
	if( !value ) {
		value = '';
	}
	id = document.getElementById('tableColumn'+col+'Row'+i+'Bkgr');
	let box = id.getBoundingClientRect();
	
	_editFieldChangesVolRestTo = null; // If a "VolRest" or 'DurRest' value is changed the "VolRest" field is to be changed too
	_editFieldChangesDurRestTo = null; // If a "VoRest" or 'DurRest' value is changed the "DurRest" field is to be changed too
	_editFieldChangesVolDoneTo = null; // If a "VolDone" or 'DurDone' value is changed the "VolDone" field is to be changed too
	_editFieldChangesDurDoneTo = null; // If a "VolDone" or 'DurDone' value is changed the "DurDone" field is to be changed too

	_editField = document.getElementById('editField');
	_editFieldCallCalendar = document.getElementById('editFieldCallCalendar');
	_editFieldMessage = document.getElementById('editFieldMessage');
	if( _editFieldType == 'text' ) {
		_editFieldInput = document.getElementById('editFieldTextarea');
	} else {
		_editFieldInput = document.getElementById('editFieldInput');
		if( _editFieldType == 'string' ) {
			_editFieldInput.setAttribute('type', 'text');
		} else {
			_editFieldInput.setAttribute('type', 'text');			
		}
	}
	_editFieldInput.style.display = 'block';

	_editField.style.left = parseInt(box.x) + "px";
	_editField.style.top = parseInt(box.y) + "px";
	_editField.style.width = parseInt(box.width) + "px";
	_editField.style.height = parseInt(box.height) + "px";
	_editField.style.display = 'block';
	_editFieldInput.value = value;
	_editFieldInput.style.width = '100%';

	_editFieldOldValue = value; // Saving an old value to confirm it has been changed or to restore if required.
	_editFieldOperationIndex = i;
	_editFieldRef = ref;
	_editFieldCol = col;
	_editFieldInput.focus();

	_editFieldInput.addEventListener( "keyup", onEditTableFieldKey );
	window.addEventListener( "keyup", onEditTableFieldKey );

	_blackOutBoxDiv.onclick = onEditFieldInputOk; // On click saving changes.. 

	document.getElementById('editFieldOk').onclick = onEditFieldInputOk; // Cancel button hides  edit field 
	document.getElementById('editFieldCancel').onclick = hideEditField; // Cancel button hides  edit field 
	if( _editFieldType === 'datetime')  {
		_editFieldCallCalendar.style.display = 'block';
		_editFieldCallCalendar.onclick = function(e) { callCalendarForEditField(_editFieldInput); }
		setCalendarFormat(_data.table[col].format);
	} else {
		_editFieldCallCalendar.style.display = 'none';		
	}
}

function setCalendarFormat( format ) {
	if( !( format > 0) ) { // For dates the "format" specifies if time required (1) or not (0) 
		calendarSetFormat( {'dateOnly':true} );
	} else {
		calendarSetFormat( {'dateOnly':false} );				
	}			
}

function getCalendarFormat() {
	let format = calendarGetFormat(); 
	if( 'dateOnly' in format ) { 	// Should not happen, but...
		return 1;
	}
	return (!format.dateOnly) ? 1 : 0; 	// 1 - date and time, 0 - date only
}


function callCalendarForEditField( input ) {
	if( calendarIsActive() ) {
		return;
	}
	let d = parseDate( input.value );
	if( d !== null ) {
		calendar( _editField, updateEditFieldWithCalendarChoice, 20, 20, d.date, _texts[_lang].monthNames );
	}
}


function updateEditFieldWithCalendarChoice( d ) {
	if( d !== null ) {
		let flag;
		if( !(_data.table[_editFieldCol].format > 0) ) { // Date only
			flag = true;
		} else {
			flag = false;
		}
		_editFieldInput.value = dateIntoSpiderDateString( d, flag );
		onEditFieldInputOk();
	} else {
		hideEditField();
	}
}


function onEditTableFieldKey(event) {
	event.preventDefault();
	if( event.keyCode == 13 && _editFieldType != 'text' ) {
		onEditFieldInputOk();
	}
	if( event.keyCode == 27 ) {
		hideEditField();
	}	
}


function onEditFieldInputOk() {
	if( !_editFieldInput.value && !_editFieldOldValue ) { // Nothing has been changed...
		hideEditField();
		return;
	}
	if( _editFieldInput.value == _editFieldOldValue ) { // Nothing has been changed...
		hideEditField();
		return;
	}

	calendarCancel(); // If the "onEditFieldInputOk()" function is called not through a calendar event (e.g. on clicking blackOutDiv). 

	let valid = validateEditField( _editFieldInput, _editFieldType );
	if( !valid.ok ) {
		_editFieldMessage.innerText = valid.message;
		_editFieldMessage.style.display = 'block';
		return;
	}	

	var xmlhttp = new XMLHttpRequest();
	_editFieldMessage.style.display = _texts[_lang].waitSaveUserDataText;
	xmlhttp.onerror = function(e) { 
		_editFieldMessage.innerText = _texts[_lang].errorSavingData;
		_editFieldMessage.style.display = 'block';
	}

	xmlhttp.onreadystatechange = function() {
	    if (this.readyState == 4 ) {
	    	if( this.status == 200 ) {
		        if( this.responseText == "ok" ) { // The data has been successfully saved. Thus updating all corresponding data inside browser
		        	let i = _editFieldOperationIndex;
		    		if( !('userData' in _data.operations[i]) ) {
						_data.operations[i].userData = {};
					}
					let ref = _editFieldRef;
					_data.operations[i].userData[ ref ] = _editFieldInput.value; // _editFieldInput.value;
					for( let col = 0 ; col < _data.table.length ; col++ ) { // Changing the value in the table...
						if( _data.table[col].ref == ref ) {
							writeNewValueFromInputElemIntoTable( _editFieldInput.value, i, col, ref ); 
							break;						
						}
					}
			        document.getElementById('ganttGroupTitle'+i).textContent = formatTitleTextContent(i); 
					//console.log(JSON.stringify(_data.operations[i].userData));
			        hideEditField();
					ifSynchronizedCheck();
		        } else {
		        	alert("Error: " + this.responseText); // this.responseText contains the error message. 
		        }
		    }
		}
	};

	let userData = createUserDataObjectToSendAfterEditingInField( _editFieldOperationIndex, _editFieldRef );
	if( userData.length > 0 ) {
		xmlhttp.open("POST", _files.userDataSave, true);
		xmlhttp.setRequestHeader("Cache-Control", "no-cache");
		//xmlhttp.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
		//xmlhttp.setRequestHeader('Content-type', 'application/json');
		//xmlhttp.setRequestHeader("Content-type", "plain/text");
		//xmlhttp.send( JSON.stringify(userData) );		
		xmlhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
		xmlhttp.send( "data=" + JSON.stringify(userData) );		
		// Displaying the "wait" message...
		_editFieldMessage.innerText = valid.message;
		_editFieldMessage.style.display = 'block';		
	}
}


function hideEditField() {
	calendarCancel();

	_editFieldInput.removeEventListener( "keyup", onEditTableFieldKey );
	window.removeEventListener( "keyup", onEditTableFieldKey );

	_blackOutBoxDiv.style.display='none';	
	_blackOutBoxDiv.onclick = null;
	_editField.style.display='none';
	_editFieldInput.style.display='none';
	_editFieldMessage.style.display = 'none';
	document.getElementById('editFieldInput').style.display = 'none';
	document.getElementById('editFieldMessage').style.display = 'none';
} 


function createUserDataObjectToSendAfterEditingInBox( editedOperationIndex ) {
	let userData = []; // Creating userData object with all the data entered but not synchronized
	for( let i = 0 ; i < _data.operations.length ; i++ ) {
		if( 'userData' in _data.operations[i] || i == editedOperationIndex ) { // Data just edited comes from edit window
			let userDataOfOperation = {};
			userDataOfOperation[ _settings.webExportLineNumberColumnName ] = i;
			userDataOfOperation[ 'Level' ] = _data.operations[i]['Level'];			
			for( let iE = 0 ; iE < _data.editables.length ; iE++ ) {
				let ref = _data.editables[iE].ref;
				let value;
				if( i == editedOperationIndex ) { // Data just edited comes from edit window
					let elem = document.getElementById( 'editBoxInput' + ref );
					value = elem.value;
				} else { // Duplicating data related to an operation that has not been edited this time.
					value = _data.operations[i].userData[ ref ];
				}
				userDataOfOperation[ ref ] = value;
			}
			//console.log(JSON.stringify(userDataOfOperation));
			userData.push( { "operationCode":_data.operations[i].Code, "data":userDataOfOperation } );			
		}
	}
	return userData;
}


function createUserDataObjectToSendAfterEditingInField( editedOperationIndex, editedFieldRef ) {
	_editFieldChangesVolRestTo = null; // If one of the fields that change another ones has been edited...
	_editFieldChangesDurRestTo = null;
	_editFieldChangesVolDoneTo = null;
	_editFieldChangesDurDoneTo = null;

	let userData = []; // Creating userData object with all the data entered but not synchronized
	for( let i = 0 ; i < _data.operations.length ; i++ ) {
		if( 'userData' in _data.operations[i] || i == editedOperationIndex ) {
			let userDataOfOperation = {};
			userDataOfOperation[ _settings.webExportLineNumberColumnName ] = i;			
			userDataOfOperation[ 'Level' ] = _data.operations[i]['Level'];			
			for( let iE = 0 ; iE < _data.editables.length ; iE++ ) {
				let ref = _data.editables[iE].ref;
				let value;
				if( i == editedOperationIndex ) { // This operation has just been edited
					if( ref == editedFieldRef ) { // The value just edited
						value = _editFieldInput.value; 
					} else { // A value of the same editedOperationIndex, yet not from edit field - thus not edited...
						let valueSet = false;
						if( 'userData' in _data.operations[i] ) { // If the value is set in 'userData'...
							//console.log(`ref=${ref}`);
							if( ref in _data.operations[i].userData ) {
								value = _data.operations[i].userData[ ref ]; // ...copying.
								valueSet = true;
							}
						} 
						if( !valueSet ) { // If the value is not found in 'userData'
							value = _data.operations[i][ ref ]; // ...simply copying that passed from 'SpiderProject'.							
						}
					}
				} else { // Duplicating data related to an operation that hasn't been edited this time.
					value = _data.operations[i].userData[ ref ];
				}
				userDataOfOperation[ ref ] = value;
			}
			//console.log(JSON.stringify(userDataOfOperation)); 
			userData.push( { "operationCode":_data.operations[i].Code, "data":userDataOfOperation } );				
		}
	}
	return userData;
}


function writeNewValueFromInputElemIntoTable( inputElemValue, i, col, ref ) {
	let destElem = document.getElementById( 'tableColumn'+col+'Row'+i );

	let updated;
	if( _data.operations[i][ref] != inputElemValue ) {
		destElem.setAttributeNS( null, 'font-style', "italic" );
		destElem.setAttributeNS( null, 'font-weight', "bold" );
		updated = ''; //updated = '✎';
	} else { // If user re-entered the old value
		destElem.setAttributeNS( null, 'font-style', "normal" );										
		destElem.setAttributeNS( null, 'font-weight', "normal" );
		updated = '';
	}

	if( ref == 'Name') {
		let hrh = _data.operations[i].parents.length;
		destElem.childNodes[0].nodeValue = updated + spacesToPadNameAccordingToHierarchy(hrh) + inputElemValue;
	}
	else { // Shifting according to hierarchy if it's a name
		if( _data.table[col].type == 'float' ) {
			let valueToTrim = parseFloat(inputElemValue);
			if( !isNaN(valueToTrim) && typeof(_data.table[col].format) !== 'undefined' ) {
				inputElemValue = valueToTrim.toFixed(_data.table[col].format);
			}
		}
		destElem.childNodes[0].nodeValue = updated + inputElemValue;
	}
}