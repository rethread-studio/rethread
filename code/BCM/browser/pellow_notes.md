
Browser extension lives in BCM/browser/extension
Server lives in BCM/browser/server

# Installation

First time creating the docker image: 

1. Use nvm to get the same node version as the docker image, version 10 by `nvm install 10`
2. Remove `package-lock.json` and `node_modules/`
3. `npm i`
4. `sudo docker compose build`

# To start everything:
Open the folder `BCM/browser/extension` as an uncompressed extension in Chromium

Run
```
sudo docker compose up
```

Visit http://localhost:8873/ to see the visualisation


