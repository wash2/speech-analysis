window.AudioContext = window.AudioContext || window.webkitAudioContext

const SOURCE_MIC = 1
const SOURCE_FILE = 2

class AudioCapture {

  constructor() {
    this.context = null
    this.source = null
    this.sampleRate = 44100
  }

  createMicrophoneSource = () => {
    if (this.context === null) {
      this.context = new AudioContext({sampleRate: this.sampleRate})
    }

    return navigator.mediaDevices.getUserMedia({audio: true})
      .then(stream => {
        if (this.source !== null) {
          this.source.disconnect()
        }
        this.source = this.context.createMediaStreamSource(stream)
        this.sourceType = SOURCE_MIC
      })
      .catch(ex => {
        console.error('Error capturing audio', ex)
      })
  }

  createFileSource = async (file) => {
    if (this.context === null) {
      this.context = new AudioContext({sampleRate: this.sampleRate})
    }

    const buffer = await this.context.decodeAudioData(file)

    if (this.source !== null) {
      if (this.sourceType === SOURCE_FILE) {
        this.source.stop()
      }
      this.source.disconnect()
    }
    this.source = this.context.createBufferSource()
    this.source.buffer = buffer
    this.source.loop = false
    this.sourceType = SOURCE_FILE
  }

  stopFileSource = () => {
    this.source.stop()
    this.source.disconnect()
    this.source = null
  }

  loadModules = () => {
    return this.context.audioWorklet.addModule('static/js/speech_capture.js')
      .then(this.createWorkletNodes)
      .then(this.connectNodes)
  }

  createWorkletNodes = () => {
    this.captureNode = new AudioWorkletNode(this.context, 'audio-capture', {
      numberOfInputs: 1,
      numberOfOutputs: 0,
      channelCount: 1,
    })
  }

  connectNodes = () => {
    this.source.connect(this.captureNode)
    if (this.sourceType === SOURCE_FILE) {
      this.source.connect(this.context.destination)
      this.source.start()
    }
  }

  requestData = () => {
    this.captureNode.port.postMessage({type: 'getData'})
  }

  setDataCallback = (callback) => {
    this.captureNode.port.onmessage = ({data}) => callback(data)
  }

}

export default AudioCapture
