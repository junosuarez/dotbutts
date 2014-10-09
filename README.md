# dotbutts
a dns proxy for the .butts dns registry

## disclaimer
i have no idea what dns even is

## how to run & use .butts
requires node.js
```console
$ npm install -g dotbutts
$ dotbutts
```
You might have to do this with sudo permissions.

Now you can resolve dns queries against your dns server:
```console
$ dig @localhost jden.butts
```

For more usefulness, you might want to run this in an init script
and set your default dns server to localhost.

## how does it work?
It looks for queries that end in .butts and tries to resolve them.
It falls back to Google's public 8.8.8.8 dns server.

## how to register your own .butts
see https://github.com/jden/registry.butts

## pull requests welcome!
please help improve documentation and code because this was just
a quick first effort

## license
CC-0, do what you like