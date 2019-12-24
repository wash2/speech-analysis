import React from 'react'
import Grid from '@material-ui/core/Grid'
import Button from '@material-ui/core/Button'
import Typography from '@material-ui/core/Typography'
import './App.css'
import AudioCapture from './analyser/AudioCapture'
import AnalyserModule from './analyser/speech_analysis'
import Footer from './components/Footer'

class App extends React.PureComponent {

  constructor(props) {
    super(props)
    this.state = {
      isVoiced: false,
      pitch: 0,
      formants: [],
    }

    this.capture = new AudioCapture()

    AnalyserModule().then(module => {
      this.analyser = new module.Analyser()
    })
  }

  setupCapture = async () => {
    await this.capture.createSource()
    await this.capture.loadModules()

    this.capture.setDataCallback(this.nextBuffer)

    const callback = () => {
      this.capture.requestData()

      window.requestAnimationFrame(callback)
    };

    callback()
  }

  nextBuffer = (data) => {
    if (this.analyser === undefined) return

    this.analyser.update(data, 44100)

    const result = this.analyser.getFrame()

    this.setState(result)
  }

  render() {

    const {
      isVoiced,
      pitch,
      formants,
    } = this.state

    return (
        <div className="App">
          <div className="App-wrapper">
            <Grid
                container
                spacing={4}
                direction="column"
                alignItems="flex-start"
                alignContent="flex-start"
                className="App-container"
            >
              <Grid item>
                <Button onClick={this.setupCapture}>
                  Record
                </Button>
              </Grid>
              <Grid item>
                {isVoiced ? `Voiced: Fo = ${Math.round(10 * pitch) / 10} Hz` : 'Unvoiced'}
              </Grid>
              {
                formants.map(({frequency, bandwidth}, i) => (
                  <Grid item key={`formant-${i}`}>
                    {`F${Math.floor(i)+1} = ${Math.round(frequency)} Hz`}
                  </Grid>
                ))
              }
            </Grid>
          </div>
          <Footer/>
        </div>
    )
  }
}

export default App
