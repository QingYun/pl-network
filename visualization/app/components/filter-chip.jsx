import React from 'react';
import Chip from 'material-ui/Chip';
import { blue300 } from 'material-ui/styles/colors';
import Tooltip from 'material-ui/internal/Tooltip';

export default class FilterChip extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      showTooltip: false,
    };
  }
  
  onTap = () => {
    if (this.props.noSelection) return ;
    const { selected } = this.props;
    if (!selected) this.props.selectSelf();
              else this.props.unselectSelf();
  }
  
  onDelete = () => {
    this.props.unselectSelf();
    this.props.deleteSelf();
  }

  render() {
    const { filter } = this.props;
    return (
      <Chip 
        style={{ margin: 4, position: 'relative' }}
        backgroundColor={this.props.selected ? blue300 : null}
        onRequestDelete={this.props.noDeletion ? null : this.onDelete}
        onTouchTap={this.onTap}
        onMouseEnter={() => this.setState({ showTooltip: true })}
        onMouseLeave={() => this.setState({ showTooltip: false })}
      >
        {filter.label && (<Tooltip 
          show={this.state.showTooltip}
          label={filter.label}
          horizontalPosition="right"
          verticalPosition="top"
        />)}
        <div>{filter.key}</div> 
        {
          filter.children && filter.children.map((c, i) => (
            <FilterChip 
              key={i}
              filter={c}
              noSelection={true}
              noDeletion={true}
              selectSelf={() => {}}
              unselectSelf={() => {}}
            />
          ))
        }
      </Chip>
    );
  }
};

