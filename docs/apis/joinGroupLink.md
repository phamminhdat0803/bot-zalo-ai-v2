# joinGroupLink

URL: https://zca-js.tdung.com/vi/apis/joinGroupLink.html

# joinGroupLink

## api.joinGroupLink(link)

### Parameters

*   link `string`

### Return

`Promise<JoinGroupLinkResponse>`

### Types

ts
```ts
export type JoinGroupLinkResponse = "";
```

### Examples

ts
```ts
api.joinGroupLink("https://zalo.me/g/*******")
    .then(console.log)
    .catch(console.error);
```