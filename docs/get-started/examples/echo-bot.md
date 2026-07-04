# Bot nhại lại người dùng

URL: https://zca-js.tdung.com/vi/get-started/examples/echo-bot.html

# Bot nhại lại người dùng

### Code mẫu

index.ts

ts
```ts
import { Zalo } from "zca-js";

const zalo = new Zalo({
    selfListen: false,
});
const api = await zalo.loginQR();

const { listener } = api;

listener.on("message", (msg) => {
    if (typeof msg.data.content == "string") {
        api
            .sendMessage(msg.data.content, msg.threadId, msg.type)
            .catch(console.error);
    }
});

listener.start();
```

### Kết quả:

![bot nhại lại người dùng](/echo-bot-1.jpg)

bot nhại lại người dùng