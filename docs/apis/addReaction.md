# addReaction

URL: https://zca-js.tdung.com/vi/apis/addReaction.html

# addReaction

## api.addReaction(icon, dest)

### Parameters

*   icon `Reactions` | `CustomReaction`
*   dest `AddReactionDestination`

### Return

`Promise<AddReactionResponse>`

### Types

ts
```ts
export type AddReactionResponse = {
    msgIds: number[];
};

export type CustomReaction = {
    rType: number;
    source: number;
    icon: string;
};

export type AddReactionDestination = {
    data: {
        msgId: string;
        cliMsgId: string;
    };
    threadId: string;
    type: ThreadType;
};
```

### Examples

Thả cảm xúc vào tin nhắn

ts
```ts
import { Reactions } from "zca-js";

// thả cảm xúc HAHA vào tất cả tin nhắn văn bản gửi đến có chứa ":)"
api.listener.on("message", (message) => {
    const { threadId, type } = message.data;
    const { content, msgId, cliMsgId } = message.data;

    const isTextMessage = typeof content == "string";
    const shouldReact = isTextMessage && content.includes(":)");
    
    const addReactionDestination = {
        data: { msgId, cliMsgId },
        threadId,
        type
    };
    
    // hoặc đưa cả message vào cũng được, vd: 
    // const addReactionDestination = message;
    
    if (!message.isSelf && shouldReact) {
        api
            .addReaction(Reactions.HAHA, addReactionDestination)
            .then(console.log).catch(console.error);
    }
});
```

### Related

*   [ThreadType](./../models/Enum.html)
*   [Reactions](./../models/Reaction.html)