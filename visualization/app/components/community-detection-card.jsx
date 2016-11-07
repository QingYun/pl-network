import _ from 'lodash';
import React from 'react';
import { Card, CardActions, CardText, CardTitle } from 'material-ui/Card';
import FlatButton from 'material-ui/FlatButton';
import Snackbar from 'material-ui/Snackbar';
import discover from "../graph-manipulation/community-discovery";

class CommunityDetectionCard extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      expanded: false,
      showSnackbar: false,
    };
  }

  runDetection = () => {
    this.setState(_.assign(discover({ sigma: this.context.sigma }), {
      showSnackbar: true,
    }));
  };

  cancelHighlight = () => {
    this.state.cancelHighlight.forEach(f => f());
    this.setState({ showSnackbar: false });
  };

  render() {
    return (
      <Card expanded={this.state.expanded} 
            onExpandChange={(s) => this.setState({ expanded: s })} 
            style={{ margin: '1rem 0' }}>
        <CardTitle
          title="Community Dectection"
          actAsExpander={true}
          showExpandableButton={true}
        />
        <CardText expandable={true}>
          Looks for the nodes that are more densely connected together than to the rest of the networket.
        </CardText>
        <CardActions expandable={true}>
          <FlatButton label="Detect" onTouchTap={this.runDetection} />
          <FlatButton label="Clear" onTouchTap={this.cancelHighlight} />
        </CardActions>
        <Snackbar 
          open={this.state.showSnackbar}
          message={`${_.keys(this.state.communities).length} communities detected. Press ESC to cancel.`}
          autoHideDuration={4000}
          onRequestClose={() => this.setState({ showSnackbar: false })}
        />
      </Card>
    );
  }
}

CommunityDetectionCard.contextTypes = {
  sigma: React.PropTypes.object
};

export default CommunityDetectionCard;
