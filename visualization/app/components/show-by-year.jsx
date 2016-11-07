import _ from 'lodash';
import React from 'react';
import { Card, CardActions, CardText, CardTitle } from 'material-ui/Card';
import FlatButton from 'material-ui/FlatButton';
import PlayIcon from 'material-ui/svg-icons/av/play-circle-outline';
import PauseIcon from 'material-ui/svg-icons/av/pause-circle-outline';
import StopIcon from 'material-ui/svg-icons/av/stop';
import TextField from 'material-ui/TextField';
import animate from "../graph-manipulation/animate-by-time";

class ShowByYearCard extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      expanded: false,
      playing: false,
      paused: false,
      step: 5,
      duration: 2,
      yearRange: '',
    };
  }

  animate = () => {
    this.setState(_.assign(animate({
      sigma: this.context.sigma,
      step: this.state.step,
      duration: this.state.duration * 1000,
      setYearRange: (range) => this.setState({ yearRange: range }),
      onFinish: () => this.setState({ playing: false, paused: false }),
    }), { playing: true }));
  };
  
  pause = () => {
    this.state.pause();
    this.setState({ paused: true });
  }
  
  resume = () => {
    this.state.resume();
    this.setState({ paused: false });
  }
  
  stop = () => {
    this.state.stop();
  }

  render() {
    return (
      <Card expanded={this.state.expanded} 
            onExpandChange={(s) => this.setState({ expanded: s })} 
            style={{ margin: '1rem 0' }}>
        <CardTitle
          title="Show By Year"
          subtitle={this.state.yearRange}
          actAsExpander={true}
          showExpandableButton={true}
          style={{ paddingBottom: 0 }}
        />
        <CardText expandable={true} style={{ paddingTop: 0 }}>
          <div className="row bottom-xs">
            <div className="col-xs-4">
              <div className="box" style={{ marginBottom: '14px', fontSize: '16px', textAlign: 'right' }}>
                Step: 
              </div>
            </div>
            <div className="col-xs-8">
              <TextField 
                floatingLabelText="Span of each step, in year"
                onChange={(evt) => this.setState({ step: _.parseInt(evt.target.value) || 1})} 
              />
            </div>
            <div className="col-xs-4">
              <div className="box" style={{ marginBottom: '14px', fontSize: '16px', textAlign: 'right' }}>
                Duration: 
              </div>
            </div>
            <div className="col-xs-8">
              <TextField 
                floatingLabelText="Frame length, in second"
                onChange={(evt) => this.setState({ duration: _.parseInt(evt.target.value) || 1})} 
              />
            </div>
          </div>
        </CardText>
        <CardActions expandable={true}>
          {
            this.state.playing ? (
              this.state.paused ? (
                <FlatButton label="Play" icon={<PlayIcon />} onTouchTap={this.resume} />
              ) : (
                <FlatButton label="Pause" icon={<PauseIcon />} onTouchTap={this.pause} />
              )
            ) : (
              <FlatButton label="Play" icon={<PlayIcon />} onTouchTap={this.animate} />
            )
          }
          <FlatButton label="Stop" icon={<StopIcon />} onTouchTap={this.stop} />
        </CardActions>
      </Card>
    );
  }
}

ShowByYearCard.contextTypes = {
  sigma: React.PropTypes.object
};

export default ShowByYearCard;
