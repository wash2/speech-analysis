class AudioCapture extends AudioWorkletProcessor {

  constructor() {
    super()

    this.heapInputBuffer = new HeapAudioBuffer(
      CaptureModule, RENDER_QUANTUM_FRAMES,
      2, MAX_CHANNEL_COUNT
    )

    this.kernel = new CaptureModule.AudioCapture(44100)

    this.port.onmessage = this.onMessage.bind(this)
  }

  onMessage({data}) {
    if (data.type === 'getData') {
      let array = []
      this.kernel.readBlock(array)
      this.port.postMessage(array)
    } else {
      console.warn(`MessagePort event type ${data.type} does not exist.`, data)
    }
  }

  process(inputs, outputs) {
    const input = inputs[0]

    const channelCount = input.length
    const length = input[0].length

    this.heapInputBuffer.adaptChannel(channelCount)
    for (let ch = 0; ch < channelCount; ++ch) {
      this.heapInputBuffer.getChannelData(ch).set(input[ch])
    }

    this.kernel.process(this.heapInputBuffer.getHeapAddress(), length, channelCount)

    return true
  }
}

registerProcessor('audio-capture', AudioCapture)
