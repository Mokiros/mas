# mas.js - Mokiros's API Server

I made this for myself.

Why `.js`? idk lol, everyone's doing it.

Example server code:

```ts
import http from 'http'
import { CustomRequest, CustomResponse, Middlepoint, Preprocessor, RegisterMiddlepoint } from 'mas.js'

const middlepoint = new Middlepoint({
	hello() {
		return 'Hello from mas.js'
	},
})

RegisterMiddlepoint(middlepoint)

const server = http.createServer({
	IncomingMessage: CustomRequest,
	ServerResponse: CustomResponse,
})

server.on('request', Preprocessor)

server.listen(process.env.PORT || 3001, () => console.log(`Server running`))
```
