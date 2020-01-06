
## Parser setup

# Build 
```
$ docker build -t b2bparser:latest .
```

# Run
```
$ docker run -it -v /root/b2b-parser/logs:/tmp/logs --restart unless-stopped --net=host b2bparser
```
