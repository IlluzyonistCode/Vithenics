#!/bin/bash

PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
DRY_RUN=false

if [ "$1" = "--dry-run" ] || [ "$1" = "-n" ]; then
    DRY_RUN=true
fi

if [[ "$OSTYPE" == "darwin"* ]]; then
    SED_INPLACE="sed -i ''"
else
    SED_INPLACE="sed -i"
fi

DOMAIN="vithenics.corruptor.pro"
PORT="7003"
PRODUCTION_URL="https://${DOMAIN}:${PORT}"
PRODUCTION_URL_NO_PORT="https://${DOMAIN}"

echo "Preparing Vithenics for production..."
echo "API Domain: ${PRODUCTION_URL}"
echo "Frontend Domain: ${PRODUCTION_URL_NO_PORT}"
if [ "$DRY_RUN" = true ]; then
    echo "Mode: dry-run (no changes will be made)"
fi
echo ""

replace_in_file() {
    local file="$1"
    local pattern="$2"
    local replacement="$3"
    
    if grep -qE "$pattern" "$file" 2>/dev/null; then
        if [ "$DRY_RUN" = false ]; then
            $SED_INPLACE "s|${pattern}|${replacement}|g" "$file"
        fi
        return 0
    fi
    return 1
}

FILES=$(find "$PROJECT_ROOT" -type f \( -name "*.js" -o -name "*.jsx" \) \
    ! -path "*/node_modules/*" \
    ! -path "*/.git/*" \
    ! -path "*/dist/*" \
    ! -path "*/build/*" \
    ! -path "*/coverage/*" \
    2>/dev/null)

if [ -z "$FILES" ]; then
    echo "Error: No JS files found"
    exit 1
fi

CHANGED_COUNT=0

for file in $FILES; do
    if replace_in_file "$file" \
        "http://192\.168\.1\.57:5003/api" \
        "${PRODUCTION_URL}/api"; then
        CHANGED_COUNT=$((CHANGED_COUNT + 1))
    fi
    
    if replace_in_file "$file" \
        "http://localhost:5003/api" \
        "${PRODUCTION_URL}/api"; then
        CHANGED_COUNT=$((CHANGED_COUNT + 1))
    fi
    
    if replace_in_file "$file" \
        "http://127\.0\.0\.1:5003/api" \
        "${PRODUCTION_URL}/api"; then
        CHANGED_COUNT=$((CHANGED_COUNT + 1))
    fi
done

for file in $FILES; do
    if grep -qE "http://192\.168\.1\.57:5003" "$file" 2>/dev/null && ! grep -qE "http://192\.168\.1\.57:5003/api" "$file" 2>/dev/null; then
        if replace_in_file "$file" \
            "http://192\.168\.1\.57:5003" \
            "${PRODUCTION_URL}"; then
            CHANGED_COUNT=$((CHANGED_COUNT + 1))
        fi
    fi
    
    if grep -qE "http://localhost:5003" "$file" 2>/dev/null && ! grep -qE "http://localhost:5003/api" "$file" 2>/dev/null; then
        if replace_in_file "$file" \
            "http://localhost:5003" \
            "${PRODUCTION_URL}"; then
            CHANGED_COUNT=$((CHANGED_COUNT + 1))
        fi
    fi
    
    if grep -qE "http://127\.0\.0\.1:5003" "$file" 2>/dev/null && ! grep -qE "http://127\.0\.0\.1:5003/api" "$file" 2>/dev/null; then
        if replace_in_file "$file" \
            "http://127\.0\.0\.1:5003" \
            "${PRODUCTION_URL}"; then
            CHANGED_COUNT=$((CHANGED_COUNT + 1))
        fi
    fi
done

for file in $FILES; do
    if replace_in_file "$file" \
        "http://192\.168\.1\.57:5173" \
        "${PRODUCTION_URL_NO_PORT}"; then
        CHANGED_COUNT=$((CHANGED_COUNT + 1))
    fi
    
    if replace_in_file "$file" \
        "http://localhost:5173" \
        "${PRODUCTION_URL_NO_PORT}"; then
        CHANGED_COUNT=$((CHANGED_COUNT + 1))
    fi
    
    if replace_in_file "$file" \
        "http://127\.0\.0\.1:5173" \
        "${PRODUCTION_URL_NO_PORT}"; then
        CHANGED_COUNT=$((CHANGED_COUNT + 1))
    fi
done

SERVER_INDEX="$PROJECT_ROOT/server/index.js"
if [ -f "$SERVER_INDEX" ]; then
    if ! grep -q "${PRODUCTION_URL_NO_PORT}" "$SERVER_INDEX" 2>/dev/null; then
        if [ "$DRY_RUN" = false ]; then
            $SED_INPLACE "s|origin: \['http://192\.168\.1\.57:3001', 'http://localhost:3001', 'http://localhost:5003'\],|origin: ['${PRODUCTION_URL_NO_PORT}', 'http://192.168.1.57:5173', 'http://localhost:5173'],|g" "$SERVER_INDEX"
            $SED_INPLACE "s|origin: \['http://192\.168\.1\.57:5173', 'http://localhost:5173', 'http://localhost:5003'\],|origin: ['${PRODUCTION_URL_NO_PORT}', 'http://192.168.1.57:5173', 'http://localhost:5173'],|g" "$SERVER_INDEX"
            CHANGED_COUNT=$((CHANGED_COUNT + 1))
        fi
    fi
fi

echo ""
if [ "$DRY_RUN" = true ]; then
    echo "Dry-run completed. Found ${CHANGED_COUNT} potential changes."
else
    echo "Done. Updated ${CHANGED_COUNT} file(s)."
fi