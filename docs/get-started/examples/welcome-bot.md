# Bot chào mừng thành viên

URL: https://zca-js.tdung.com/vi/get-started/examples/welcome-bot.html

# Bot chào mừng thành viên

### Code mẫu

1.  Xây dựng phương thức xử lý hình ảnh, tham khảo thêm tại [ImageMetadataGetter](./../upgrade-to-v2.html#imagemetadatagetter)

utils.ts

ts
```ts
export async function imageMetadataGetter(filePath: string) {
    // triển khai tại đây

    return {
        width: 0,
        height: 0,
        size: 0,
    };
}
```

2.  Triển khai Bot

index.ts

ts
```ts
import { GroupEventType, ThreadType, Zalo } from "zca-js";
import path from "path";

import { imageMetadataGetter } from "./utils";

const zalo = new Zalo({ imageMetadataGetter });
const api = await zalo.loginQR();

const { listener } = api;

listener.on("group_event", (event) => {
    if (event.type == GroupEventType.JOIN && !event.isSelf) {
        const { updateMembers } = event.data;
        if (updateMembers.length == 1) {
            api.sendMessage(
                {
                    msg: `Chào mừng @${updateMembers[0].dName} đến với nhóm!`,
                    mentions: [
                        {
                            pos: 10,
                            uid: updateMembers[0].id,
                            len: updateMembers[0].dName.length + 1, // +1 vì có dấu @ ở đầu
                        },
                    ],
                    attachments: [path.resolve("./welcome.jpg")],
                },

                event.threadId,
                ThreadType.Group
            ).catch(console.error);
        } else {
            api.sendMessage(
                {
                    msg: "Chào mừng các bạn mới đến với nhóm!",
                    attachments: [path.resolve("./welcome.jpg")],
                },
                event.threadId,
                ThreadType.Group
            ).catch(console.error);
        }
    }
});

listener.start();
```

### Kết quả:

![bot chào mừng thành viên](/welcome-bot-1.jpg)

bot chào mừng thành viên