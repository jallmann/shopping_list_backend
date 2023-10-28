# shopping_list_backend

## Prerequisites

We us redis as a simple DB backend, so we need:
- redis-stack-server running on localhost:6973

# How to run

## Build and Run

`npm install && npm run-script build`

`npm run-script run`

Server listens on localhost:3000

Run with `DB_REINIT=true npm run-script run` to flush and initialize the db upon startup.

## What's missing

- Authentication
- Rigths management
- Proper input validation
- Tests
- Proper logging
- Smarter entity relations
- ...
