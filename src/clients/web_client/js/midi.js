function Midi() {
	this.midiAccess = null;
	
	if(window.navigator.requestMIDIAccess) this.connectMidiDevices();
}

Midi.prototype.connectMidiDevices = function() {
	var thisObj = this;
	
	window.navigator.requestMIDIAccess().then(successCallback, failureCallback);
	
	function successCallback(access, options) {
		thisObj.midiAccess = access;
		access.inputs.forEach(function(entry) {
			entry.onmidimessage = thisObj.onMidiMessage;
		});
	}
	
	function failureCallback() {
		console.log('Cannot access midi devices');
	}
}

Midi.prototype.onMidiMessage = function(midiPacket) {
	var thisObj = window['midi'];
	
	if(room &&
		midiPacket.data[0] >= audio.MIDI_CHANNEL_RANGE_LOW && 
      midiPacket.data[0] <= audio.MIDI_CHANNEL_RANGE_HIGH &&
      midiPacket.data[1] >= audio.MIDI_KEY_RANGE_LOW &&
      midiPacket.data[1] <= audio.MIDI_KEY_RANGE_HIGH) {
		
		var msg = {'type': 'midi', 'room': room.id, 'playerName': player.name, 'playerId': player.id, 'midi': midiPacket.data};
		
		network.sendMidi(msg);
		stage.messageHandler(msg);
	}
}

function initMidi() { 
	midi = new Midi();
}
