import React from 'react';
import {
  BrowserRouter as Router,
  Switch,
  Route,
} from "react-router-dom";

import { Loading } from './components/loading';
import { Home } from './components/home';
import { SelectCharacter } from './components/select';
import { GameController } from './components/gameController';

import { library } from '@fortawesome/fontawesome-svg-core'
import { fas } from '@fortawesome/free-solid-svg-icons'



import './App.css';

function App() {

  library.add(fas)

  return (
    <Router>
      <div className="container h-screen bg-gray-900">
        <Switch>
          <Route path="/loading">
            <Loading />
          </Route>
          <Route path="/home">
            <Home />
          </Route>
          <Route path="/select">
            <SelectCharacter />
          </Route>
          <Route path="/play">
            <GameController />
          </Route>
          <Route path="/">
            <Home />
          </Route>
        </Switch>
      </div>
    </Router>
  );
}

export default App;
