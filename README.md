# Simple Serverless Licensing

> This project is still under development

A simple licensing service build with the Serverless framework.

## Tools
* Node.js
* MongoDB
* Serverless Framework

## Features
* Define plans
* Generate licenses and license keys
* Activate / Validate licenses
* Checksum

## Environment variables

| Variable  | Description                    | Default                                 |
|-----------|--------------------------------|-----------------------------------------|
| MONGO_URL | Full MongoDB connection string | `mongodb://127.0.0.1:27017/sls-licensing` |
| PORT      | The listening Port             | `3000 `                                   |
|           |                                |                                         |



## Installation
```
$ npm install -g serverless
$ git clone https://github.com/pantsel/serverless-licensing
$ cd serverless-licensing
$ npm i
$ npm start // The service will be available at http://localhost:3000
```

## API
### Plans
### Licenses
