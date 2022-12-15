# Petri-Net
This repository is intended to server as a bootstrap for a fully docker based Design Studio development with WebGME.

## Initialization
The easiest way to start using this project is to fork it in git. Alternatively, you can create your empty repository, copy the content and just rename all instances of 'MIC-MINI_PROJECT' to your liking. Assuming you fork, you can start-up following this few simple steps:
- install [Docker-Desktop](https://www.docker.com/products/docker-desktop)
- clone the repository
- edit the '.env' file so that the BASE_DIR variable points to the main repository directory
- `docker-compose up -d`
- connect to your server at http://localhost:8888

## About the Project
 I tried to create petri-net design studio. As I'm javascript beginner I tried to create this project and spent lot of time on it.
 
## References
 - The seed is generated and downloaded through isis website.
 - Some code reference from: https://github.com/austinjhunt/petrinet-webgme-designstudio
 - The template file(plugin and visulizer) of this project was generate by use Webgme-CLI: https://github.com/webgme/webgme-cli
 - The framework reference from: https://github.com/kecso/StateMachineJoint
