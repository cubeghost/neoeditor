import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import autobind from 'class-autobind';
import { Controlled as CodeMirror } from 'react-codemirror2';
import debounce from 'lodash/debounce';
import SassCompiler from 'sass.js/dist/sass.js';

import 'codemirror/mode/css/css';

import 'codemirror/lib/codemirror.css';
import 'codemirror/theme/monokai.css';
import 'scss/index.scss';

class App extends Component {
  constructor() {
    super();

    this.sass = new SassCompiler('sass.worker.js');

    this.state = {
      scss: '$borderColor: #3FBF3F;\n\nh2 {\n\tborder: 2px solid $borderColor;\n}',
      css: 'h2 {\n\tborder: 2px solid #3FBF3F;\n}'
    };

    autobind(this);

    this.compile = debounce(this.compile, 200);
  }

  compile(scss) {
    this.sass.compile(value, result => {
      if (result.status === 0) {
        this.setState({
          css: result.text
        });
      } else {
        console.log(result);
      }
    });
  }

  onUpdate(editor, data, value) {
    this.setState({ scss: value });
    this.compile(value);
  }

  render() {
    return (
      <div>
        <h2>compile?</h2>
        <CodeMirror
          value={this.state.scss}
          onBeforeChange={this.onUpdate}
          options={{
            mode: 'text/x-scss',
            theme: 'monokai',
            //lineNumbers: true,
            // matchBrackets: true,
          }}
        />
        <pre>{this.state.css}</pre>
      </div>
    );
  }
};

ReactDOM.render(<App />, document.getElementById('react-root'));
