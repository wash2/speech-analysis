import React from 'react'
import Grid from '@material-ui/core/Grid'
import AppBar from '@material-ui/core/AppBar'
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
      isSettingUp: false,
      isSetup: false,
      tracks: [
        {
          isVoiced: false,
          pitch: 0,
          formants: [],
        },
      ],
      params: {}
    }

    this.capture = new AudioCapture()

    AnalyserModule().then(module => {
      this.analyser = new module.Analyser()
    })
  }

  setupCapture = async () => {
    this.setState({isSettingUp: true})

    await this.capture.createSource()
    await this.capture.loadModules()

    this.capture.setDataCallback(this.nextBuffer)

    const callback = () => {
      this.capture.requestData()

      window.requestAnimationFrame(callback)
    };

    callback()

    this.setState({isSetup: true});
  }

  nextBuffer = (data) => {
    if (this.analyser === undefined) return

    this.analyser.update(data, 44100)

    const tracks = this.analyser.getTracks()
    const params = this.analyser.getParameters()

    this.setState({tracks, params})
  }

  setAnalyse = () => this.analyser.setParameters({isAnalysing: true})
  unsetAnalyse = () => this.analyser.setParameters({isAnalysing: false})

  render() {

    const {
      isSettingUp,
      isSetup,
      tracks,
      params: {
        frameCount,
        isAnalysing,
        fftSize,
        lpOrder,
        maxFrequency,
      },
    } = this.state

    return (
        <div className="App">
          <div className="App-wrapper">
            <AppBar>
              <Grid
                  container
              >
                <Grid item>
                  {
                    !isSetup ? (
                      <Button onClick={this.setupCapture} disabled={isSettingUp}>
                        Start
                      </Button>
                    ) : (
                      <Button onClick={isAnalysing ? this.unsetAnalyse : this.setAnalyse}>
                        {isAnalysing ? 'Pause' : 'Resume'}
                      </Button>
                    )
                  }
                </Grid>
              </Grid>
            </AppBar>
            <Grid
                container
                spacing={4}
                direction="column"
                alignItems="stretch"
                alignContent="stretch"
                className="App-container"
            >
              <Grid item>
                <AnalyserCanvas
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
