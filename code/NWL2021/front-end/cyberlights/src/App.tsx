import React, { useEffect, useState } from 'react';
import {
  BrowserRouter as Router,
  Redirect,
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
import { getLaureates, dummyLaureates, socket } from './api';
import { laureateI } from './types';
import { dataToLaurates } from './utils';


function App() {
  const [laureates, setLaureates] = useState<laureateI[]>(dummyLaureates)
  const [loading, setLoading] = useState(true);
  const [laureate, setLaureate] = useState<laureateI | null>(null);

  socket.on("welcome", (data) => setLaureate(data))

  //load characters data
  useEffect(() => {
    getLaureates()
      .then(data => data.map(dataToLaurates))
      .then(data =>  setLaureates(data))
      .catch(error => { console.log("getLaureates error", error) })
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
            {laureate? <Redirect to="/play"/>:loading ? <Loading /> : <SelectCharacter characters={laureates} selectHandler={setLaureate} />}
          </Route>
          <Route path="/play">
            {laureate == null? <Redirect to="/select"/>:loading ? <Loading /> : <GameController laureate={laureate} selectHandler={setLaureate}/>}
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
