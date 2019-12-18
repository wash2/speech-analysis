import React from 'react'
import Grid from '@material-ui/core/Grid'
import Typography from '@material-ui/core/Typography'
import './App.css'
import AudioCapture from './analyser/AudioCapture'
import AnalyserModule from './analyser/speech_analysis'
import Footer from './components/Footer'

class App extends React.PureComponent {

  constructor(props) {
    super(props)
  }

  componentDidMount() {
    this.capture = new AudioCapture()
    this.capture.loadModules().then(() => {
      this.capture.setDataCallback(this.nextBuffer.bind(this))

      const callback = () => {
        this.capture.requestData()

        window.requestAnimationFrame(callback)
      };

      callback()
    })
  }

  nextBuffer(data) {
    if (this.analyser === undefined) return

    this.analyser.update(data)

  }

  render() {

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
                <Typography variant="body1">
                </Typography>
              </Grid>
              <Grid item>
                <p>Canvas</p>
              </Grid>
            </Grid>
          </div>
          <Footer/>
        </div>
    )
  }
}

export default App
