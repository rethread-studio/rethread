import React, { useEffect, useState } from 'react';
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
import { getLaureates, dummyLaureates } from './api';
import { laureateI } from './types';
import { dataToLaurates } from './utils';


function App() {
  const [laureates, setLaureates] = useState<laureateI[]>(dummyLaureates)
  const [loading, setLoading] = useState(true);
  const [characterIndex, setCharacterIndex] = useState(0);

  //load characters data
  useEffect(() => {
    getLaureates()
      .then(data => data.map(dataToLaurates))
      .then(data => { setLaureates(data); setCharacterIndex(0); })
      .catch(error => { console.log("error", error) })
      .finally(() => {
        setLoading(false);
      })
  }, [])

  library.add(fas)

  return (
    <Router>
      <div className="container h-screen bg-gray-900">
        <Switch>
          <Route path="/select">
            {loading ? <Loading /> : <SelectCharacter characters={laureates} selectHandler={setCharacterIndex} />}
          </Route>
          <Route path="/play">
            {loading ? <Loading /> : <GameController charactersList={laureates} characterIndex={characterIndex} />}
          </Route>
          <Route path="/">
            {loading ? <Loading /> : <Home />}
          </Route>
        </Switch>
      </div>
    </Router>
  );
}

export default App;
