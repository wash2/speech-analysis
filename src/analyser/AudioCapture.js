window.AudioContext = window.AudioContext || window.webkitAudioContext

class AudioCapture {

  constructor() {
    this.context = new AudioContext()

    navigator.mediaDevices.getUserMedia({audio: true})
      .then(stream => {
        if (this.stream && this.source) {
          this.source.disconnect()
        }
        this.stream = stream
        this.source = this.context.createMediaStreamSource(stream)
      })
      .catch(ex => {
        console.error('Error capturing audio', ex)
      });
  }

  loadModules() {
    return this.context.audioWorklet.addModule('static/js/speech_capture.js')
      .then(this.createWorkletNodes.bind(this))
  }

  createWorkletNodes() {
    this.captureNode = new AudioWorkletNode(this.context, 'audio-capture', {
      numberOfInputs: 1,
      numberOfOutputs: 0,
      channelCount: 1,
    })
    this.source.connect(this.captureNode)
  }

  requestData() {
    this.captureNode.port.postMessage({type: 'getData'})
  }

  setDataCallback(callback) {
    this.captureNode.port.onMessage = ({data}) => callback(data)
  }

}

export default AudioCapture
