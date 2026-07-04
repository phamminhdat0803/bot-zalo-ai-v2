# sendBankCard

URL: https://zca-js.tdung.com/vi/apis/sendBankCard.html

# sendBankCard

## api.sendBankCard(payload, threadId\[, type\])

### Parameters

*   payload `SendBankCardPayload`
*   threadId `string`
*   type `ThreadType?`
    *   mặc định `ThreadType.User`

### Return

`Promise<SendBankCardResponse>`

### Types

ts
```ts
export type SendBankCardPayload = {
    binBank: BinBankCard;
    numAccBank: string;
    nameAccBank?: string;
};

export type SendBankCardResponse = "";
```

### Examples

ts
```ts
import { ThreadType, BinBankCard } from "zca-js";

const groupId = "000000000000000";

api
    .sendBankCard(
        {
            binBank: BinBankCard.Techcombank,
            numAccBank: "19038393966015",
            nameAccBank: "TO CHAU TRI DUNG"
        },
        groupId,
        ThreadType.Group
    )
    .then(console.log).catch(console.error);
```

### Related

*   [ThreadType, BinBankCard](./../models/Enum.html)