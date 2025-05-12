#!/bin/bash

# Create assets directory if it doesn't exist
mkdir -p assets

# Generate placeholder icon files of different sizes
# Using ImageMagick's convert command to create simple colored squares

# Function to create a colored square icon of a specified size
create_icon() {
  size=$1
  convert -size ${size}x${size} xc:#4285F4 \
    -fill white -gravity center -font Arial -pointsize $((size/2)) -annotate 0 "N" \
    assets/icon${size}.png
  echo "Created icon${size}.png"
}

# Create icons of required sizes
create_icon 16
create_icon 32
create_icon 48
create_icon 128

echo "All icons generated successfully in the assets directory"

