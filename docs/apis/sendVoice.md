# sendVoice

URL: https://zca-js.tdung.com/vi/apis/sendVoice.html

# sendVoice

## api.sendVoice(options, threadId\[, type\])

### Parameters

*   options `SendVoiceOptions`
    *   voiceUrl `string`
    *   ttl `number?`
        *   thời gian tồn tại danh thiếp, mặc định là 0 (vô hạn)
*   threadId `string`
*   type `ThreadType?`
    *   loại thread, mặc định là người dùng

### Return

`Promise<SendVoiceResponse>`

### Types

ts
```ts
export type SendVoiceOptions = {
    voiceUrl: string;
    ttl?: number;
};

export type SendVoiceResponse = {
    msgId: string;
};
```

### Examples

Gửi đoạn hội thoại

ts
```ts
const userId = "0000000000000001"

api.sendVoice(
    {
        voiceUrl: "https://example.com/voice.mp3"
    },
    userId
)
    .then(console.log)
    .catch(console.error);
```

### Related

*   [ThreadType](./../models/Enum.html)