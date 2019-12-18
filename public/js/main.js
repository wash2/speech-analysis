"use strict";

window.AudioContext = window.AudioContext || window.webkitAudioContext  || window.mozAudioContext || window.msAudioContext;
navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;

if (navigator.getUserMedia === undefined) {
  window.alert('Your browser does not support recording. Please try Chrome.');
  throw new Error("no getUserMedia");
}

// Create audio context and create media stream source from microphone.

function setSource(onRecord) {
  navigator.permissions.query({name: 'microphone'}).then(result => {
    function fn(result) {
      if (result.state === 'granted'
            || result.state === 'prompt') {
        navigator.getUserMedia({audio: true, video: false}, stream => {
          window.audioContext = new window.AudioContext();
          window.audioSource = window.audioContext.createMediaStreamSource(stream);
          onRecord();
        }, e => {
          window.alert('Please enable your microphone to begin recording');
        });
      } else if (result.state === 'denied') {
        window.alert('Please enable your microphone to begin recording');
      }
    };

    result.onchange = function() {
      fn(result);
    };
    fn(result);
  });
}

// Set behaviour of record/pause button.

const recordButton = document.getElementById('record-button');
recordButton.onclick = e => {
  if (recordButton.textContent === 'pause') {
    recordButton.textContent = 'fiber_manual_record';
  } else {
    recordButton.textContent = 'pause';
    setSource(window.onRecord);
  }
};

// Connect analyser.

window.onRecord = async () => {
  const context = window.audioContext;
  const source = window.audioSource;

  const module = await AnalyserModule();

  await context.audioWorklet.addModule('speech_capture.js');

  const capture = new AudioWorkletNode(context, 'audio-capture');
  const analyser = new module.Analyser();

  capture.port.onmessage = e => {
    analyser.update(e.data(), context.sampleRate);
  };

  source.connect(capture);
};
