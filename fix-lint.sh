#!/bin/bash

# Fix common lint issues in frontend files
cd frontend

echo "Fixing unused imports and variables..."

# Comment out unused imports
sed -i.bak 's/import { Button } from "@\/components\/ui\/button";/\/\/ import { Button } from "@\/components\/ui\/button"; \/\/ Unused/g' $(find . -name "*.tsx" -o -name "*.ts")
sed -i.bak 's/import.*useEffect.*never used/\/\/ &/g' $(find . -name "*.tsx" -o -name "*.ts")

echo "Escaping quotes in JSX..."
# Fix quote escaping in JSX
find . -name "*.tsx" -exec sed -i.bak 's/{"}/{\&quot;}/g' {} \;

echo "Removing unused variables..."
# Comment out obviously unused variables (this is a basic approach)
find . -name "*.tsx" -exec sed -i.bak '/const.*= .*never used/s/^/\/\/ /' {} \;

echo "Done with basic fixes"