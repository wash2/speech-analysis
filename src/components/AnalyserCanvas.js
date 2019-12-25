import React from 'react'

function mel2hz(m) {
  return 700 * (Math.exp(m / 1127) - 1)
}

function hz2mel(f) {
  return 1127 * Math.log(1 + f / 700)
}

class AnalyserCanvas extends React.PureComponent {

  constructor(props) {
    super(props)
  }

  componentDidMount() {
    this.ctx = this.canvas.getContext('2d')
    this.updateCanvas()
  }

  componentDidUpdate() {
    this.updateCanvas()
  }

  yFromFrequency = (frequency) => {
    const {
      scale,
      height,
      maximumFrequency,
    } = this.props

    if (scale === 'MEL') {
      const max = hz2mel(maximumFrequency)
      const cur = hz2mel(frequency)

      return height * (1 - cur / max)
    }
  }

  updateCanvas = () => {
    const ctx = this.ctx
    const {
      tracks,
      width: canvasWidth,
      height,
      maximumFrequency,
    } = this.props

    const width = tracks.length

    ctx.scale(canvasWidth / width, 1)

    ctx.fillStyle = 'black'
    ctx.fillRect(0, 0, width, height)

    let x = 0
    for (const frame of tracks) {
      const {
        isVoiced,
        pitch,
        formants,
      } = frame

      if (isVoiced) {
        const y = this.yFromFrequency(pitch)

        ctx.fillStyle = 'cyan'
        ctx.fillRect(x, y - 1, 1, 3)
      }

      let nf = 0;
      for (const {frequency, bandwidth} of formants) {
        const y1 = this.yFromFrequency(frequency - .8 * bandwidth / 2)
        const y2 = this.yFromFrequency(frequency + .8 * bandwidth / 2)

        ctx.fillStyle = isVoiced ? 'orange' : 'darkred'
        ctx.fillRect(x, y1, 1, y2 - y1)

        nf++
      }

      x++
    }

    let scaleF = 0
    while (scaleF <= maximumFrequency) {
      const lineWidth = 5
      const y = this.yFromFrequency(scaleF)

      ctx.fillStyle = 'white'
      ctx.fillRect(width - lineWidth, y - 1, lineWidth, 3)

      scaleF += 100
    }

    ctx.scale(width / canvasWidth, 1)
  }

  render() {

    const {
      width,
      height,
    } = this.props

    return (
        <canvas width={width} height={height} ref={r => this.canvas = r}></canvas>
    )

  }

}

export default AnalyserCanvas
