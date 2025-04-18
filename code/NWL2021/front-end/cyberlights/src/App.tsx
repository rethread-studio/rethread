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
import { getLaureates, getLaureate, socket, getEmojis } from './api';
import { IEmoji, laureateI } from './types';
import { dataToLaureates } from './utils';
import { About } from './components/about';


function App() {
  const [laureates, setLaureates] = useState<laureateI[]>([])
  const [loading, setLoading] = useState(true);
  const [laureate, setLaureate] = useState<laureateI | null>(null);
  const [state, setState] = useState<any>(null);
  const [emoji, setEmoji] = useState<IEmoji | null>(null);
  const [emojiList, setEmojiList] = useState<IEmoji[] | null>(null);
  //index
  const [characterIndex, setCharacterIndex] = useState<number>(-1);
  //discovery
  //load characters data
  socket.on("connect", () => setLaureate(null));
  socket.on("disconnect", () => setLaureate(null));
  socket.on("welcome", ({ laureateID, state }) => {
    setState(state);
    if (!laureateID) return setLaureate(null);
    getLaureate(laureateID).then(setLaureate).catch(() => setLaureate(null));
  })

  useEffect(() => {
    getEmojis().then((emojis) => {
      setEmoji(emojis[Math.random() * emojis.length | 0]);
      setEmojiList(emojis);
    }).catch(() => setEmoji(null));

    getLaureates()
      .then(data => data.map(dataToLaureates))
      .then(data => setLaureates(data))
      .catch(error => { console.error("getLaureates error", error) })
      .finally(() => {
        setLoading(false);
      })
    return () => {
      socket.off("welcome");
      socket.off("connect");
      socket.off("disconnect");
    }
  }, [])

  const handleSelect = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    setLaureate(laureates[characterIndex]);
  }

  library.add(fas)

  return (
    <Router>
      <div className="container h-screen bg-gray-900">
        <Switch>
          <Route path="/select">
            {laureate ? <Redirect to="/play" /> : loading ? <Loading /> : <SelectCharacter characters={laureates} selectHandler={handleSelect} setCharacterIndex={setCharacterIndex} />}
          </Route>
          <Route path="/play">
            {laureate == null ? <Redirect to="/select" /> : loading ? <Loading /> : <GameController laureate={laureate} selectHandler={setLaureate} iemoji={emoji} state={state} emojiList={emojiList} />}
          </Route>
          <Route path="/about">
            {loading ? <Loading /> : <About />}
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
