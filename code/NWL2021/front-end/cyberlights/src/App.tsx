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
import { getLaureates, getLaureate, socket } from './api';
import { laureateI } from './types';
import { dataToLaureates, getEmoji } from './utils';


function App() {
  const [laureates, setLaureates] = useState<laureateI[]>([])
  const [loading, setLoading] = useState(true);
  const [laureate, setLaureate] = useState<laureateI | null>(null);
  const [emoji, setEmoji] = useState(getEmoji());

  socket.on("connect", () => setLaureate(null));
  socket.on("disconnect", () => setLaureate(null));
  socket.on("welcome", (laureateID) => {
    if (!laureateID) return setLaureate(null);
    getLaureate(laureateID).then(setLaureate).catch(() => setLaureate(null));
  })

  //load characters data
  useEffect(() => {
    getLaureates()
      .then(data => data.map(dataToLaureates))
      .then(data => setLaureates(data))
      .catch(error => { console.error("getLaureates error", error) })
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
            {laureate ? <Redirect to="/play" /> : loading ? <Loading /> : <SelectCharacter characters={laureates} selectHandler={setLaureate} />}
          </Route>
          <Route path="/play">
            {laureate == null ? <Redirect to="/select" /> : loading ? <Loading /> : <GameController laureate={laureate} selectHandler={setLaureate} emoji={emoji} setEmoji={setEmoji} />}
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
