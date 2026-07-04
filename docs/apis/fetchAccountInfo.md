# fetchAccountInfo

URL: https://zca-js.tdung.com/vi/apis/fetchAccountInfo.html

# fetchAccountInfo

## api.fetchAccountInfo()

### Parameters

### Return

`Promise<FetchAccountInfoResponse>`

### Types

ts
```ts
export type FetchAccountInfoResponse = User;
```

### Examples

ts
```ts
api.fetchAccountInfo()
    .then(console.log)
    .catch(console.error);
```

### Related

*   [User](./../models/User.html)