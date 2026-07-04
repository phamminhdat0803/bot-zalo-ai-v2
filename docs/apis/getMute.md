# getMute

URL: https://zca-js.tdung.com/vi/apis/getMute.html

# getMute

## api.getMute()

### Parameters

### Return

`Promise<GetMuteResponse>`

### Types

ts
```ts
export type MuteEntriesInfo = {
    id: string;
    duration: number;
    startTime: number;
    systemTime: number;
    currentTime: number;
    muteMode: number;
};

export type GetMuteResponse = {
    chatEntries: MuteEntriesInfo[];
    groupChatEntries: MuteEntriesInfo[];
};
```

### Examples

ts
```ts
api.getMute()
    .then(console.log)
    .catch(console.error);
```