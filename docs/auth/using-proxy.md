# Sử dụng Proxy

URL: https://zca-js.tdung.com/vi/auth/using-proxy.html

# Sử dụng Proxy

### Đối với Bun

index.ts

ts
```ts
import { Zalo } from "zca-js";
import { HttpProxyAgent } from "http-proxy-agent";

const zalo = new Zalo({
    agent: new HttpProxyAgent("http(s)://user:pass@host:port"),
});
```

### Đối với NodeJS

Vì native fetch của NodeJS không hỗ trợ proxy nên phải thay thế nó bằng [node-fetch](https://www.npmjs.com/package/node-fetch)

index.ts

ts
```ts
import { Zalo } from "zca-js";
import { HttpProxyAgent } from "http-proxy-agent";
import nodefetch from "node-fetch";

const zalo = new Zalo({
    agent: new HttpProxyAgent("http(s)://user:pass@host:port"),
    // @ts-ignore
    polyfill: nodefetch,
});
```