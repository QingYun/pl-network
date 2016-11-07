import React from 'react';
import Sigma from 'linkurious';
import Snackbar from 'material-ui/Snackbar';

import addSelectEffect from '../graph-manipulation/select-effect';

export default class Graph extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      snackbarMsg: '',
    };
  }

  render() {
    return (
      <div 
        ref={(self) => this.container = self}
        id="graph-container"
      >
        <Snackbar 
          open={!!this.state.snackbarMsg.length}
          message={this.state.snackbarMsg}
          autoHideDuration={4000}
          onRequestClose={() => this.setState({ snackbarMsg: '' })}
        />
      </div>
    );
  }
  
  componentDidMount() {
    const s = new Sigma({
      renderer: {
        container: this.container,
      },
      settings: {
        drawEdgeLabels: false,
        defaultLabelColor: 'rgb(255, 255, 255)',
        labelSize: 'proportional',
        labelAlignment: 'center',
        LabelHoverBGColor: 'node',
        labelHoverShadow: 'none',
        minArrowSize: 5,
        zoomMin: 0.01,
        minNodeSize: 1,
        maxNodeSize: 50,
        minEdgeSize: 1,
        maxEdgeSize: 1,
        nodeActiveLevel: 5,
        edgeActiveLevel: 5,
        nodeActiveColor: 'rgba(250, 82, 82, 1)',
        edgeActiveColor: 'rgba(250, 82, 82, 1)',
        labelActiveColor: 'default',
        defaultLabelActiveColor: 'rgba(255, 255, 255, 1)',
      },
    });

    Sigma.parsers.json('./first-screen.new.json', s, () => {
      s.keyboard = Sigma.plugins.keyboard(s, s.renderers[0]);
      addSelectEffect({
        sigma: s, 
        showSnackbar: (msg) => this.setState({ snackbarMsg: msg })
      });
      this.props.setSigma(s);
      s.refresh();
    });
  }
}
