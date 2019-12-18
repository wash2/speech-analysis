class AudioCapture extends AudioWorkletProcessor {

  constructor() {
    super();

    this.heapInputBuffer = new HeapInputBuffer(
      CaptureModule, RENDER_QUANTUM_FRAMES,
      1, MAX_CHANNEL_COUNT
    );

    this.kernel = new CaptureModule.AudioCapture();

    this.port.onmessage = this.onMessage.bind(this);
  }

  onMessage({data}) {
    if (data.type === 'getData') {
      let array = [];
      this.kernel.readBlock(array);
      this.port.postMessage(array);
    } else {
      console.warn(`MessagePort event type ${data.type} does not exist.`, data);
    }
  }

  process(inputs, outputs) {
    const channelCount = inputs.length;
    const length = inputs[0].length;

    this.heapInputBuffer.adaptChannel(channelCount);
    for (let ch = 0; ch < channelCount; ++ch) {
      this.heapInputBuffer.getChannelData(ch).set(input[ch]);
    }

    this.kernel.process(this.heapInputBuffer.getHeapAddress(), length, channelCount);
  }

}

registerProcessor('audio-capture', AudioCapture);
