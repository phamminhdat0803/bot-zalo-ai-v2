# keepAlive

URL: https://zca-js.tdung.com/vi/apis/keepAlive.html

# keepAlive

## api.keepAlive()

### Parameters

### Return

`Promise<KeepAliveResponse>`

### Types

ts
```ts
export type KeepAliveResponse = { config_vesion: number };
```

### Examples

ts
```ts
api.keepAlive()
    .then(console.log)
    .catch(console.error);
```