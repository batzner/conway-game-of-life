#!/bin/zsh

ROOTDIR=$(pwd)

# Build the site
gulp

# Move to a tmp dir and checkout gh-pages there to prevent corrupting untracked directories here
TMPDIR=$(dirname $(mktemp -u))
cd $TMPDIR
rm -rf conway-game-of-life
git clone --depth 1 --branch gh-pages git@github.com:batzner/conway-game-of-life.git conway-game-of-life
cd conway-game-of-life
rm -rf *

# Copy the files
cp -r $ROOTDIR/dist/* .
touch .nojekyll

# Publish
git add .
git commit -m "Gulped"
git push
echo "Published"

cd $ROOTDIR