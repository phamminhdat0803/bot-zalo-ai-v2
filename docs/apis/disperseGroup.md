# disperseGroup

URL: https://zca-js.tdung.com/vi/apis/disperseGroup.html

# disperseGroup

## api.disperseGroup(groupId)

### Parameters

*   groupId `string`

### Return

`Promise<DisperseGroupResponse>`

### Types

ts
```ts
export type DisperseGroupResponse = "";
```

### Examples

ts
```ts
const groupId = "0000000000000000000";

api.disperseGroup(groupId)
    .then(console.log)
    .catch(console.error);
```