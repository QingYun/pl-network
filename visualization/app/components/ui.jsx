import React from 'react';
import CommunityDetectionCard from "./community-detection-card.jsx";
import CircularProgress from 'material-ui/CircularProgress';
import FilterCard from './filter-card.jsx';
import ShowByYearCard from "./show-by-year.jsx";

class UI extends React.Component {
  getChildContext() {
    return {
      sigma: this.props.sigma,
    }
  }

  render() {
    if (!this.props.sigma) return (
      <CircularProgress size={this.props.width / 10} />
    );

    return (
      <div id="ui-container" style={{ width: this.props.width }}>
        <ShowByYearCard />
        <CommunityDetectionCard />
        <FilterCard />
      </div>
    );
  }
};

UI.childContextTypes = {
  sigma: React.PropTypes.object,
}

export default UI;