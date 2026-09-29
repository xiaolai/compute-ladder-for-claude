#!/bin/sh
set -e
printf '{"db": {"host": "db.example.com", "port": 5432}, "debug": true}\n' > config.json
