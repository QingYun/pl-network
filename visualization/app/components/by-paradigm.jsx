import React from 'react';
import AutoComplete from 'material-ui/AutoComplete';
import MenuItem from 'material-ui/MenuItem';
import { byParadigm, getParadigms } from '../graph-manipulation/by-paradigm';
import { useGlobalStyle, addClass, removeClass } from '../styles/sigma-style';

class ByParadigmInput extends React.Component {
  constructor(props, context) {
    super(props);

    this.state = {
      dataSource: getParadigms({ sigma: context.sigma }),
    };
    
    console.log(this.state.dataSource)
    this.handleUpdateInput = (value) => {
      console.log(value)
      if (this.state.dataSource.indexOf(value) === -1) return;
      this.props.closeDrawer();
      setTimeout(() => {
        useGlobalStyle('dark');
        byParadigm({
          sigma: context.sigma,
          paradigm: value, 
          onParadigm: n => addClass(n, 'highlight'), 
          offParadigm: n => removeClass(n, 'highlight'),
        });
        const reset = () => {
          useGlobalStyle('default');
          context.sigma.graph.nodes().forEach(n => removeClass(n, 'highlight'));
          context.sigma.refresh({ skipIndexation: true });
          setTimeout(() => context.sigma.unbind('clickStage', reset), 0);
        }
        context.sigma.bind('clickStage', reset);
      }, 0);
    }
  } 
  
  render() {
    return <MenuItem>
      <AutoComplete
        hintText="By Paradigm"
        filter={AutoComplete.fuzzyFilter}
        fullWidth={true}
        dataSource={this.state.dataSource}
        onUpdateInput={this.handleUpdateInput}
        onNewRequest={this.handleUpdateInput}
      />
    </MenuItem>
  }
}

ByParadigmInput.contextTypes = {
  sigma: React.PropTypes.object
};

export default ByParadigmInput;