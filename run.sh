#!/bin/bash

# Navigate to the correct folder
cd ~/Documents/AudioViz

# Run the first command in the background
sudo ./traktor_nowplaying --port 8001 --outfile nowplaying.txt &

# Start the python server
python3 -m http.server