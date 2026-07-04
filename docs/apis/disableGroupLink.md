# disableGroupLink

URL: https://zca-js.tdung.com/vi/apis/disableGroupLink.html

# disableGroupLink

## api.disableGroupLink(groupId)

### Parameters

*   groupId `string`

### Return

`Promise<DisableGroupLinkResponse>`

### Types

ts
```ts
export type DisableGroupLinkResponse = "";
```

### Examples

ts
```ts
api.disableGroupLink("00000000000000000")
    .then(console.log).catch(console.error);
```