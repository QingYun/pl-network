import React from 'react';
import ReactDOM from 'react-dom';
import _ from 'lodash';
import Sigma from 'linkurious';
import darkBaseTheme from 'material-ui/styles/baseThemes/darkBaseTheme';
import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';
import getMuiTheme from 'material-ui/styles/getMuiTheme';
import Graph from './components/graph.jsx';
import UI from './components/ui.jsx';
import { getGlobalStyle } from './styles/sigma-style';

import injectTapEventPlugin from 'react-tap-event-plugin';
injectTapEventPlugin();
require('./styles/main.scss');
require('imports?sigma=linkurious,this=>window!linkurious/dist/plugins.js');

// add methods to Sigma.classes, which needs to be done before creating Sigma instances
(req => req.keys().forEach(path => req(path)(Sigma)))(require.context('./sigma-methods', true, /^.*\.js$/));

const containerElm = window.document.createElement('div');
containerElm.setAttribute('id', 'container');
containerElm.setAttribute('style', `background-color: ${getGlobalStyle('backgroundColor')}`);
document.body.appendChild(containerElm);

function getDimensions() {
  const uiWidth = _.clamp(window.innerWidth - window.innerHeight, 300, 400);
  return {
    uiWidth,
    graphWidth: window.innerWidth - uiWidth,
  }
}

class App extends React.Component {
  constructor(props) {
    super(props);
    this.updateDimensions = () => {
      this.setState(getDimensions());
    };
    window.addEventListener('resize', this.updateDimensions);
    this.state = getDimensions();
  }
  
  componentWillUnmount() {
    window.removeEventListener('resize', this.updateDimensions);
  }

  render() {
    return (
      <MuiThemeProvider muiTheme={getMuiTheme(darkBaseTheme)}>
        <div style={{ width: '100%', height: '100%' }}>
          <Graph setSigma={(s) => this.setState({ sigma: s })} width={this.state.graphWidth} />
          <UI sigma={this.state.sigma} width={this.state.uiWidth} />
        </div>
      </MuiThemeProvider>
    );
  }
}

ReactDOM.render(<App />, containerElm);