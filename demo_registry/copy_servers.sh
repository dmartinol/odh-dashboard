#!/bin/bash

# Script to copy servers from one registry to another
# Usage: ./copy_servers.sh <source_registry> <destination_registry> [limit]
#
# Arguments:
#   source_registry      - Name of the source registry to fetch servers from
#   destination_registry - Name of the destination registry to publish servers to
#   limit                - Optional: Maximum number of servers to copy (default: 10)
#
# Example:
#   ./copy_servers.sh rh-catalog-mcp toolhive-system 10

set -e

# Check if required arguments are provided
if [ $# -lt 2 ]; then
  echo "Error: Missing required arguments"
  echo "Usage: $0 <source_registry> <destination_registry> [limit]"
  echo "Example: $0 rh-catalog-mcp toolhive-system 10"
  exit 1
fi

SOURCE_REGISTRY="$1"
DEST_REGISTRY="$2"
LIMIT="${3:-10}"
REGISTRY_URL="http://localhost:8888"

echo "=========================================="
echo "Copying servers between registries"
echo "=========================================="
echo "Source registry: $SOURCE_REGISTRY"
echo "Destination registry: $DEST_REGISTRY"
echo "Server limit: $LIMIT"
echo "Registry URL: $REGISTRY_URL"
echo "=========================================="
echo ""

# Step 1: Fetch servers from source registry
echo "Step 1: Fetching servers from $SOURCE_REGISTRY..."
TEMP_FILE=$(mktemp)
HTTP_CODE=$(curl -s -w "%{http_code}" -o "$TEMP_FILE" "$REGISTRY_URL/registry/$SOURCE_REGISTRY/v0.1/servers")

if [ "$HTTP_CODE" != "200" ]; then
  echo "Error: Failed to fetch servers from $SOURCE_REGISTRY (HTTP $HTTP_CODE)"
  cat "$TEMP_FILE"
  rm -f "$TEMP_FILE"
  exit 1
fi

# Check if jq is available
if ! command -v jq &> /dev/null; then
  echo "Error: jq is required but not installed. Please install jq to use this script."
  rm -f "$TEMP_FILE"
  exit 1
fi

# Extract servers array and limit to requested number
SERVERS_FILE=$(mktemp)
jq ".servers[:$LIMIT]" "$TEMP_FILE" > "$SERVERS_FILE"
SERVER_COUNT=$(jq 'length' "$SERVERS_FILE")

if [ "$SERVER_COUNT" -eq 0 ]; then
  echo "Warning: No servers found in $SOURCE_REGISTRY"
  rm -f "$TEMP_FILE" "$SERVERS_FILE"
  exit 0
fi

echo "Found $SERVER_COUNT server(s) to copy"
echo ""

# Step 2: Publish each server to destination registry
echo "Step 2: Publishing servers to $DEST_REGISTRY..."
SUCCESS_COUNT=0
FAILED_COUNT=0

for i in $(seq 0 $((SERVER_COUNT - 1))); do
  SERVER_DATA=$(jq -r ".[$i].server" "$SERVERS_FILE")
  SERVER_NAME=$(echo "$SERVER_DATA" | jq -r '.name')
  
  echo "[$((i + 1))/$SERVER_COUNT] Publishing: $SERVER_NAME"
  
  # Publish server to destination registry
  RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
    "$REGISTRY_URL/registry/$DEST_REGISTRY/v0.1/publish" \
    -H "Content-Type: application/json" \
    -d "$SERVER_DATA")
  
  HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
  RESPONSE_BODY=$(echo "$RESPONSE" | head -n-1)
  
  if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
    echo "  ✓ Successfully published"
    SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
  else
    echo "  ✗ Failed to publish (HTTP $HTTP_CODE)"
    echo "  Response: $RESPONSE_BODY"
    FAILED_COUNT=$((FAILED_COUNT + 1))
  fi
done

# Cleanup
rm -f "$TEMP_FILE" "$SERVERS_FILE"

# Summary
echo ""
echo "=========================================="
echo "Summary"
echo "=========================================="
echo "Total servers processed: $SERVER_COUNT"
echo "Successfully published: $SUCCESS_COUNT"
echo "Failed: $FAILED_COUNT"
echo "=========================================="

if [ "$FAILED_COUNT" -gt 0 ]; then
  exit 1
fi

exit 0

