import _ from 'lodash';
import React from 'react';
import Sigma from 'linkurious';
import { Card, CardActions, CardTitle, CardText } from 'material-ui/Card';
import FlatButton from 'material-ui/FlatButton';
import Divider from 'material-ui/Divider';
import LinkIcon from 'material-ui/svg-icons/content/link';
import FilterInput from './filter-input.jsx';
import FilterChip from './filter-chip.jsx';

class FilterCard extends React.Component {
  constructor(props, context) {
    super(props);

    const [languages, paradigms] = context.sigma.graph.nodes()
      .reduce(([languages, paradigms], node) => ([
        languages.concat(node.label),
        _.union(paradigms, node.attributes.paradigms)
      ]), [[], []]); 

    this.filter = Sigma.plugins.filter(context.sigma);
    this.locate = Sigma.plugins.locate(context.sigma, {
      padding: {
        top: 50,
        right: 200,
        left: 50,
        bottom: 50,
      }
    });

    this.state = {
      expanded: false,
      conditions: [],
      selectedConds: [],
      languages,
      paradigms,
    };
  }

  addNewCondition = () => {
    if (_.isEmpty(this.state.curCond)) return ;
    console.log()
    this.setState({
      conditions: this.state.conditions.concat(this.state.curCond),
      curCond: {},
      expanded: true,
    });
    this.input.clearInput();
  }

  clearFilter = () => {
    this.setState({
      conditions: []
    });
  }
  
  componentWillUpdate(nextProps, nextState) {
    if (nextState.conditions === this.state.conditions) return ;

    const filter = this.filter;
    const curNodeIds = [];
    const match = (...args) => nextState.conditions.reduce((matched, f) => matched && f.match(...args), true);
    filter
      .undo()
      .nodesBy(function (n) {
        const graph = this.graph;
        if (match(n, graph)) {
          curNodeIds.push(n.id);
          return true;
        }
        return false;
      })
      .apply();
      
    if (curNodeIds.length > 0) this.locate.nodes(curNodeIds);

    if (nextState.conditions.length === 0) {
      this.setState({ expanded: false })
    }
  }
  
  deleteCond(cond) {
    this.setState({
      conditions: _.without(this.state.conditions, cond).concat(cond.children || [])
    })
  }
  
  renderChips() {
    const { conditions, selectedConds } = this.state;
    return conditions.map((c, i) => (
      <FilterChip 
        key={`${c.key}${i}`}
        filter={c}
        selected={this.state.selectedConds.indexOf(c) !== -1}
        deleteSelf={() => this.deleteCond(c)}
        selectSelf={() => this.setState({ selectedConds: _.union(selectedConds, [c]) })}
        unselectSelf={() => this.setState({ selectedConds: _.without(selectedConds, c) })}
      />
    ));
  }
  
  linkBy = (key, combiner) => () => {
    const { conditions, selectedConds } = this.state;
    
    let targetConds = selectedConds;
    if (_.some(targetConds, c => c.children) && _.every(targetConds, c => !c.children || c.key === key)) {
      targetConds = _.flatMap(targetConds, (c) => c.children || [c]);
    }

    const newCond = {
      key,
      match: combiner(targetConds.map(c => c.match)),
      children: targetConds,
    };

    this.setState({
      conditions: _.without(conditions, ...selectedConds).concat(newCond),
      selectedConds: [],
    })
  }
  
  linkByOr = this.linkBy("OR", fs => (...args) => fs.reduce((acc, f) => acc || f(...args), false))
  linkByAnd = this.linkBy("AND", fs => (...args) => fs.reduce((acc, f) => acc && f(...args), true))

  render() {
    return (
      <Card expanded={this.state.expanded} 
            onExpandChange={(s) => this.setState({ expanded: s })} 
            style={{ margin: '1rem 0' }}>
        <CardTitle
          title="Filter"
          actAsExpander={true}
          showExpandableButton={true}
          style={{ paddingBottom: 0 }}
        />
        <CardText expandable={true} style={{ paddingTop: 0 }}>
          <FilterInput 
            sigma={this.context.sigma}
            languages={this.state.languages} 
            paradigms={this.state.paradigms} 
            setCondition={(cond) => this.setState({ curCond: cond })}
            ref={(self) => this.input = self}  
          />
        </CardText>
        <CardActions expandable={true}>
          <FlatButton label="Add" onTouchTap={this.addNewCondition} />
          <FlatButton label="Cancel" onTouchTap={() => this.input.clearInput()} />
          {this.state.conditions.length && (
            <FlatButton label="Clear" secondary={true} onTouchTap={this.clearFilter} />
          )}
        </CardActions>
        {this.state.conditions.length && ([
          <CardText key="divider" expandable={true}><Divider /></CardText>,
          <CardText key="filters" expandable={true}>{this.renderChips()}</CardText>,
          <CardActions key="clear-btn" expandable={true}>
            {this.state.selectedConds.length > 1 && ([
              <FlatButton key="or" label="Link By OR" onTouchTap={this.linkByOr} icon={<LinkIcon />} />,
              <FlatButton key="and" label="Link By AND" onTouchTap={this.linkByAnd} icon={<LinkIcon />} />,
            ])}
          </CardActions>,
        ])}
      </Card>
    );
  }
}

FilterCard.contextTypes = {
  sigma: React.PropTypes.object
};

export default FilterCard;
