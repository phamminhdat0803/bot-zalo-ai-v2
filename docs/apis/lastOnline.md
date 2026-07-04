# lastOnline

URL: https://zca-js.tdung.com/vi/apis/lastOnline.html

# lastOnline

## api.lastOnline(uid)

### Parameters

*   uid `string`

### Return

`Promise<LastOnlineResponse>`

### Types

ts
```ts
export type LastOnlineResponse = {
    settings: {
        show_online_status: boolean;
    };
    lastOnline: number;
};
```

### Examples

ts
```ts
api.lastOnline("00000000000000000")
    .then(console.log)
    .catch(console.error);
```