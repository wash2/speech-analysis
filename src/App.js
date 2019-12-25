import React from 'react'
import Grid from '@material-ui/core/Grid'
import Button from '@material-ui/core/Button'
import Typography from '@material-ui/core/Typography'
import './App.css'
import AudioCapture from './analyser/AudioCapture'
import AnalyserModule from './analyser/speech_analysis'

import AnalyserCanvas from './components/AnalyserCanvas'
import Footer from './components/Footer'

class App extends React.PureComponent {

  constructor(props) {
    super(props)
    this.state = {
      tracks: [
        {
          isVoiced: false,
          pitch: 0,
          formants: [],
        },
      ],
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

    const tracks = this.analyser.getTracks()

    this.setState({tracks})
  }

  render() {

    const {
      tracks
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
                <AnalyserCanvas
                  width={800}
                  height={600}
                  scale={'MEL'}
                  maximumFrequency={5500}
                  tracks={tracks}
                />
              </Grid>
            </Grid>
          </div>
          <Footer/>
        </div>
    )
  }
}

export default App
