#!/bin/bash
# Extra checks run by test/run.sh: offline sanity checks of the blueprints.
python3 "$(dirname "$0")/check_blueprints.py"
