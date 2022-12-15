# Petri-Net
This repository is intended to server as a bootstrap for a fully docker based Design Studio development with WebGME.

## Initialization
The easiest way to start using this project is to fork it in git. Alternatively, you can create your empty repository, copy the content and just rename all instances of 'WDeStuP' to your liking. Assuming you fork, you can start-up following this few simple steps:
- install [Docker-Desktop](https://www.docker.com/products/docker-desktop)
- clone the repository
- edit the '.env' file so that the BASE_DIR variable points to the main repository directory
- `docker-compose up -d`
- connect to your server at http://localhost:8888
