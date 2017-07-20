DataHub tools for core datasets

[![Issues](https://img.shields.io/badge/issue-tracker-orange.svg)](https://github.com/datahq/core-datasets-tools/issues)



## Installation

``` 
$ npm install
```

## Usage

```
node index.js [COMMAND]
```

### Clone datasets

To clone all core datasets run the following command:

`npm clone`

It will clone all core datasets into following directory: `data/${pkg_name}`

### Check datasets

To check all core datasets run the following command:

`npm check`

It will validate metadata and data according to the latest spec. 

### Push datasets

To publish all core data packages run the following command:

`npm push`
