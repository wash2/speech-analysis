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
    this.canvas.width = this.canvas.parentNode.clientWidth
    this.canvas.height = this.canvas.parentNode.clientHeight

    this.updateCanvas()
  }

  componentDidUpdate(prevProps) {
    this.canvas.width = this.canvas.parentNode.clientWidth
    this.canvas.height = this.canvas.parentNode.clientHeight

    this.updateCanvas()
  }

  yFromFrequency = (frequency) => {
    const {
      scale,
      maximumFrequency,
    } = this.props

    const height = this.canvas.height

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
      maximumFrequency,
    } = this.props

    const canvasWidth = this.canvas.width
    const height = this.canvas.height

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
        const y = this.yFromFrequency(frequency)

        ctx.fillStyle = isVoiced ? 'orange' : 'rgba(255, 0, 0, 75%)'
        ctx.fillRect(x, y - 1, 1, 3)

        nf++
      }

      x++
    }

    ctx.scale(width / canvasWidth, 1)

    let scaleF = 0
    while (scaleF <= maximumFrequency) {
      const lineWidth = 5
      const y = this.yFromFrequency(scaleF)

      ctx.fillStyle = 'white'

      if (scaleF % 500 === 0) {
        ctx.fillRect(canvasWidth - 2 * lineWidth, y, 2 * lineWidth, 2)

        ctx.font = '24px Montserrat'
        const metrics = ctx.measureText(scaleF)
        ctx.fillText(scaleF, canvasWidth - 2 * lineWidth - 3 - metrics.width, y + metrics.actualBoundingBoxAscent / 2)
      }
      else {
        ctx.fillRect(canvasWidth - lineWidth, y, lineWidth, 2)
      }

      scaleF += 100
    }
  }

  render() {

    return (
        <canvas
            ref={r => this.canvas = r}
        >
        </canvas>
    )

  }

}

export default AnalyserCanvas
