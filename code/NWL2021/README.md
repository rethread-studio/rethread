# Getting started

## prerequisites

- docker
- node.js
- yarn (included in Node.js >= 16.10, otherwise install `corepack`)
- craco (`npm install @craco/craco --save`)
- typescript (e.g. `sudo pm2 install typescript`)

You need a .env file in the same folder as this README.md file. The .env.example can serve as a basis. When that file exists, run

``` shell
cd front-end/cyberlights/
npm run build
cd ../../
docker-compose up
```
starting from the root folder of this project.

## OSC issues

Your firewall may be blocking the UDP packets with OSC data coming out from the docker container. There's probably a better way, but a quick workaround is to temporarily disable the firewall.

