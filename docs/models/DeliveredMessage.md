# DeliveredMessage

URL: https://zca-js.tdung.com/vi/models/DeliveredMessage.html

# DeliveredMessage

### Model

ts
```ts
export type TDeliveredMessage = {
    msgId: string;
    seen: number;
    deliveredUids: string[];
    seenUids: string[];
    realMsgId: string;
    mSTs: number;
};

export type TGroupDeliveredMessage = TDeliveredMessage & {
    groupId: string;
};

export class UserDeliveredMessage {
    type: ThreadType.User = ThreadType.User;

    data: TDeliveredMessage;
    threadId: string;
    isSelf: false;
}

export class GroupDeliveredMessage {
    type: ThreadType.Group = ThreadType.Group;

    data: TGroupDeliveredMessage;
    threadId: string;
    isSelf: boolean;
}

export type DeliveredMessage = UserDeliveredMessage | GroupDeliveredMessage;
```

### Related

*   [ThreadType](./Enum.html)