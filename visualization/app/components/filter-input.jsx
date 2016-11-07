import _ from 'lodash';
import React from 'react';
import TextField from 'material-ui/TextField';
import Checkbox from 'material-ui/Checkbox';
import AutoComplete from 'material-ui/AutoComplete';
import SelectField from 'material-ui/SelectField';
import MenuItem from 'material-ui/MenuItem';
import introducedIn from '../utils/introduced-in.js';

const condCreators = {
  name: (sigma, input) => ({
    label: `Language name contains ${input}`,
    key: input,
    match: node => node.label.includes(input)
  }),
  
  time: (sigma, input) => {
    if (input.includes('to')) {
      const [lower, upper] = input.split('to').map(_.trim).map(_.parseInt);
      return {
        label: `Language introduced in between ${lower} and ${upper}`,
        key: input,
        match: node => introducedIn(node, lower, upper), 
      };
    } else {
      return {
        label: `Language introduced in ${input}`,
        key: input,
        match: node => introducedIn(node, _.parseInt(input)),
      };
    }
  },
  
  paradigm: (sigma, input) => ({
      label: `Language is of paradigm ${input}`,
      key: input,
      match: node => node.attributes.paradigms.indexOf(input) !== -1,
  }),
  
  influenced: (sigma, input) => {
    const node = _.find(sigma.graph.nodes(), { label: input })
    if (!node) return {};
    const { id } = node;
    return {
      label: `Language influenced ${input}`,
      key: input,
      match: (node, graph) => !!graph.influenced(node.id)[id]
    };
  },
  
  influencedBy: (sigma, input) => {
    const node = _.find(sigma.graph.nodes(), { label: input })
    if (!node) return {};
    const { id } = node;
    return {
      label: `Language is influenced by ${input}`,
      key: input,
      match: (node, graph) => !!graph.influencedBy(node.id)[id]
    };
  },

  dialect: (sigma, input) => {
    const node = _.find(sigma.graph.nodes(), { label: input })
    if (!node) return {};
    const { id } = node;
    return {
      label: `Language is a dialect of ${input}`,
      key: input,
      match: (node, graph) => !!graph.parentLang(node.id)[id]
    };
  },

  parent: (sigma, input) => {
    const node = _.find(sigma.graph.nodes(), { label: input })
    if (!node) return {};
    const { id } = node;
    return {
      label: `Language is a parent language of ${input}`,
      key: input,
      match: (node, graph) => !!graph.dialects(node.id)[id]
    };
  },
};

export default class FilterInput extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      notChecked: false,
      inputType: "paradigm",
      input: "",
    };
  }
  
  updateCond(type, input) {
    let cond = condCreators[type](this.props.sigma, input);
    if (this.state.notChecked) {
      const { label, key, match } = cond;
      cond = {
        label: `NOT (${label})`,
        key: `NOT ${key}`,
        match: _.negate(match),
      };
    }
    this.props.setCondition(cond);    
  }

  updateInput(input, list) {
    if (list && list.indexOf(input) === -1) return;
    this.setState({ input: input });
    this.updateCond(this.state.inputType, input);
  }
  
  updateType(type) {
    const prevType = this.state.inputType;
    const typeChanged = prevType !== type && 
      (['time', 'paradigm'].indexOf(type) !== -1 || ['time', 'paradigm'].indexOf(prevType) !== -1);
    const nextInput = typeChanged ? "" : this.state.input;
    this.setState({ inputType: type, input: nextInput });
    this.updateCond(type, nextInput);
  }
  
  renderInput() {
    if (this.state.inputType === 'time') {
      return (
        <TextField 
          fullWidth={true}
          floatingLabelText="e.g. 1995 or 1990 to 1995"
          value={this.state.input}
          onChange={(evt) => this.updateInput(evt.target.value)}
        />
      );
    }
    
    if (this.state.inputType === 'paradigm') {
      return (
        <AutoComplete
          key="paradigm-input"
          fullWidth={true}
          floatingLabelText="e.g. Lazy evaluation"
          dataSource={this.props.paradigms}
          onUpdateInput={(str) => this.updateInput(str, this.props.paradigms)}
          onNewRequest={(str) => this.updateInput(str, this.props.paradigms)}
          searchText={this.state.input}
          filter={AutoComplete.fuzzyFilter}
        />
      );
    }

      return (
        <AutoComplete
          key="language-input"
          fullWidth={true}
          floatingLabelText="e.g. Haskell"
          dataSource={this.props.languages}
          onUpdateInput={(str) => this.updateInput(str, this.props.languages)}
          onNewRequest={(str) => this.updateInput(str, this.props.languages)}
          searchText={this.state.input}
          filter={AutoComplete.fuzzyFilter}
        />
      );
  }
  
  clearInput() {
    this.setState({ input: '' });
  }

  render() {
    return (
      <div className="row bottom-xs">
        <div className="col-xs-2">
          <div className="box">
            <Checkbox
              iconStyle={{ marginRight: 3 }} 
              style={{ marginBottom: '12px' }}
              label="NOT" 
              onCheck={(evt, checked) => this.setState({ notChecked: checked })}
            />
          </div>
        </div>
        <div className="col-xs-10">
          <SelectField
            floatingLabelText="Filter Type"
            fullWidth={true}
            value={this.state.inputType}
            onChange={(evt, idx, v) => this.updateType(v)}
          >
            <MenuItem value="paradigm" primaryText="Of Paradigm" />
            <MenuItem value="time" primaryText="Introduced In" />
            <MenuItem value="name" primaryText="Name Contains" />
            <MenuItem value="influenced" primaryText="Influenced" />
            <MenuItem value="influencedBy" primaryText="Influenced By" />
            <MenuItem value="dialect" primaryText="Dialect Of" />
            <MenuItem value="parent" primaryText="Parent Language Of" />
          </SelectField>
        </div>
        <div className="col-xs-12">
        {
          this.renderInput()
        }
        </div>
      </div>
    );
  }
};
